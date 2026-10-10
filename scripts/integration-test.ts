/**
 * 전체 기능 통합 테스트 (HTTP 레벨, 실제 서버 대상)
 *   1) 서버 실행:  npm run build && npm start   (또는 npm run dev)
 *   2) 실행:      BASE_URL=http://localhost:3000 npm run test:e2e
 *
 * ⚠️ 미래 날짜 기준 배치를 실행하므로 테스트 후에는 `npm run db:reset` 으로 초기화하는 것을 권장합니다.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import { writeFileSync } from "node:fs";
import { deriveAddress } from "../src/lib/crypto/hd";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const prisma = new PrismaClient();
const D = (v: string | number) => new Prisma.Decimal(v);

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean, extra?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}`, extra !== undefined ? JSON.stringify(extra) : "");
  }
}
const section = (t: string) => console.log(`\n▶ ${t}`);

/** 쿠키를 유지하는 간단한 HTTP 클라이언트 */
class Client {
  cookies = new Map<string, string>();
  private cookieHeader() {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
  }
  private store(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair] = c.split(";");
      const idx = pair.indexOf("=");
      this.cookies.set(pair.slice(0, idx), pair.slice(idx + 1));
    }
  }
  async raw(path: string, init: RequestInit = {}) {
    const res = await fetch(BASE + path, {
      ...init,
      redirect: "manual",
      headers: { ...(init.headers ?? {}), cookie: this.cookieHeader() },
    });
    this.store(res);
    return res;
  }
  async json<T = any>(path: string, method = "GET", body?: unknown): Promise<{ status: number; data: T }> {
    const res = await this.raw(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  }
  async login(email: string, password: string) {
    const csrf = await (await this.raw("/api/auth/csrf")).json();
    const res = await this.raw("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, json: "true" }),
    });
    return [...this.cookies.keys()].some((k) => k.includes("session-token")) && res.status < 400;
  }
}

function kstDate(offsetDays = 0) {
  const k = new Date(Date.now() + 9 * 3600 * 1000);
  const base = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
  return new Date(base + offsetDays * 86400000).toISOString().slice(0, 10);
}

async function main() {
  const stamp = Date.now();
  const anon = new Client();
  const admin = new Client();
  const user = new Client();
  const email = `tester${stamp}@example.com`;
  const password = "password123";

  // ───────────────────────────────────────────────
  section("1. 인증 / 미들웨어 권한 분리");
  check("비로그인 /api/me → 401", (await anon.json("/api/me")).status === 401);
  const r1 = await anon.raw("/dashboard");
  check("비로그인 /dashboard → /login 리다이렉트", r1.status === 307 && (r1.headers.get("location") ?? "").includes("/login"));
  check("비로그인 /admin/users → /login 리다이렉트", (await anon.raw("/admin/users")).status === 307);
  check("비로그인 /api/admin/products → 401", (await anon.json("/api/admin/products")).status === 401);

  const su = await anon.json("/api/signup", "POST", { name: "테스터", email, password });
  check("회원가입 성공 (201)", su.status === 201, su);
  check("중복 이메일 가입 → 409", (await anon.json("/api/signup", "POST", { name: "x", email, password })).status === 409);
  check("짧은 비밀번호 → 400", (await anon.json("/api/signup", "POST", { name: "x", email: `a${stamp}@b.com`, password: "123" })).status === 400);

  check("유저 로그인", await user.login(email, password));
  check("관리자 로그인", await admin.login("admin@example.com", "admin1234!"));
  check("잘못된 비밀번호 로그인 실패", !(await new Client().login(email, "wrong-password")));

  check("USER → /api/admin/products 403", (await user.json("/api/admin/products")).status === 403);
  const r2 = await user.raw("/admin/users");
  check("USER → /admin/users 는 /home 으로 리다이렉트", r2.status === 307 && (r2.headers.get("location") ?? "").includes("/home"));
  check("ADMIN → /api/deposits 403 (유저 전용)", (await admin.json("/api/deposits", "POST", {})).status === 403);
  check("로그인 상태에서 /login → 홈 리다이렉트", (await user.raw("/login")).status === 307);

  const me0 = await user.json("/api/me");
  check("/api/me 조회 (잔액 0, VIP1)", me0.status === 200 && me0.data.balance === "0.00" && me0.data.vip.level === 1, me0.data);
  const userId: string = me0.data.id;

  // ───────────────────────────────────────────────
  section("2. 관리자 상품 CRUD + 최대 10개 제한");
  const list0 = await admin.json("/api/admin/products");
  const initialCount = list0.data.products.length;
  check("상품 목록 조회", list0.status === 200 && initialCount >= 2, initialCount);
  const stable = list0.data.products.find((p: any) => p.name === "안정형 포인트 예치");
  const boost = list0.data.products.find((p: any) => p.name === "단기 부스트 예치");
  check("seed 샘플 상품 2개 존재", !!stable && !!boost);

  check(
    "중복 기간 입력 → 400",
    (await admin.json("/api/admin/products", "POST", { name: "중복", description: "", isActive: true, rates: [{ termDays: 30, rate: "1" }, { termDays: 30, rate: "2" }] })).status === 400
  );
  check("이율 0개 → 400", (await admin.json("/api/admin/products", "POST", { name: "빈", description: "", isActive: true, rates: [] })).status === 400);

  // 9개까지 채운 뒤 동시에 3개 등록 → 1개만 성공해야 함
  const created: string[] = [];
  for (let i = initialCount; i < 9; i++) {
    const r = await admin.json("/api/admin/products", "POST", { name: `테스트상품${i}`, description: "테스트", isActive: false, rates: [{ termDays: 10, rate: "1" }] });
    if (r.status === 201) created.push(r.data.product.id);
  }
  const concurrent = await Promise.all(
    [1, 2, 3].map((n) => admin.json("/api/admin/products", "POST", { name: `동시${n}`, description: "", isActive: false, rates: [{ termDays: 10, rate: "1" }] }))
  );
  const okCount = concurrent.filter((r) => r.status === 201).length;
  concurrent.filter((r) => r.status === 201).forEach((r) => created.push(r.data.product.id));
  check("동시 등록 시에도 10개 초과 불가 (1건만 성공)", okCount === 1, concurrent.map((r) => r.status));
  check("총 상품 수 = 10", (await prisma.product.count()) === 10);
  const over = await admin.json("/api/admin/products", "POST", { name: "11번째", description: "", isActive: true, rates: [{ termDays: 10, rate: "1" }] });
  check("11번째 상품 등록 → 400", over.status === 400, over.data);

  // 수정: 설명/이율 변경
  const upd = await admin.json(`/api/admin/products/${created[0]}`, "PUT", {
    name: "수정된 상품", description: "설명 수정", isActive: false, sortOrder: 9, rates: [{ termDays: 30, rate: "4.5" }, { termDays: 90, rate: "9.25" }],
  });
  check("상품 수정 (이율 교체)", upd.status === 200 && upd.data.product.rates.length === 2 && upd.data.product.rates[1].rate === "9.25", upd.data);
  for (const id of created) await admin.json(`/api/admin/products/${id}`, "DELETE");
  check("테스트 상품 삭제 후 원래 개수 복원", (await prisma.product.count()) === initialCount);

  // ───────────────────────────────────────────────
  section("3. VIP 등급");
  const vipPut = await admin.json("/api/admin/vip-levels", "PUT", {
    levels: [
      { level: 1, name: "브론즈", bonusRate: "0" },
      { level: 2, name: "실버", bonusRate: "0.5" },
      { level: 3, name: "골드", bonusRate: "1" },
      { level: 4, name: "플래티넘", bonusRate: "1.5" },
      { level: 5, name: "다이아몬드", bonusRate: "2" },
    ],
  });
  check("VIP 등급별 추가이율 저장", vipPut.status === 200 && vipPut.data.levels.length === 5);
  check("VIP 6 설정 → 400", (await admin.json(`/api/admin/users/${userId}/vip`, "PATCH", { vipLevel: 6 })).status === 400);
  const vipSet = await admin.json(`/api/admin/users/${userId}/vip`, "PATCH", { vipLevel: 3 });
  check("유저 VIP 3 으로 변경", vipSet.status === 200 && vipSet.data.user.vipLevel === 3);
  check("/api/me VIP 3 (+1%) 반영", (await user.json("/api/me")).data.vip.bonusRate === "1");

  // ───────────────────────────────────────────────
  section("4. 포인트: 관리자 직접 충전 / 충전·환전 신청 + 승인·거절");
  const W = { cryptoAsset: "USDT_TRC20", cryptoAddress: "TUEZSdKsoDHQMeZwihtdoBiN46zxhGWYdH" }; // 환전 받을 주소
  const ch = await admin.json(`/api/admin/users/${userId}/charge`, "POST", { amount: "1000000", memo: "테스트 지급" });
  check("관리자 직접 충전 1,000,000", ch.status === 200 && ch.data.user.pointBalance === "1000000.00", ch.data);
  check("음수/잘못된 금액 → 400", (await admin.json(`/api/admin/users/${userId}/charge`, "POST", { amount: "-5" })).status === 400);
  check("소수 3자리 금액 → 400", (await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "1.234", ...W })).status === 400);
  const manualCharge = await user.json("/api/transactions", "POST", { type: "CHARGE", amount: "50000", memo: "홍길동 입금" });
  check("회원 수동 충전 신청 차단 (코인 입금으로만 충전)", manualCharge.status === 400, manualCharge.data);

  // 기존(업데이트 이전)에 접수된 충전 신청은 관리자 승인 흐름이 그대로 동작해야 함
  const legacy = await prisma.pointTransaction.create({ data: { userId, type: "CHARGE", amount: "50000", status: "PENDING", memo: "기존 충전 신청" } });
  const creq = { data: { transaction: { id: legacy.id } } };
  check("신청만으로는 잔액 변화 없음", (await user.json("/api/me")).data.balance === "1000000.00");
  const appr = await admin.json(`/api/admin/transactions/${creq.data.transaction.id}`, "POST", { action: "approve" });
  check("관리자 승인 → APPROVED", appr.status === 200 && appr.data.transaction.status === "APPROVED");
  check("승인 후 잔액 1,050,000", (await user.json("/api/me")).data.balance === "1050000.00");
  const dbl = await Promise.all([1, 2].map(() => admin.json(`/api/admin/transactions/${creq.data.transaction.id}`, "POST", { action: "approve" })));
  check("중복 승인 → 409 (이중 반영 없음)", dbl.every((r) => r.status === 409) && (await user.json("/api/me")).data.balance === "1050000.00");

  const wbig = await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "2000000", ...W });
  check("잔액 초과 환전 신청 → 400", wbig.status === 400);
  check("환전: 받을 주소 없음 → 400", (await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "100", cryptoAsset: "USDT_TRC20" })).status === 400);
  check("환전: 네트워크와 다른 주소 형식 → 400", (await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "100", cryptoAsset: "USDT_TRC20", cryptoAddress: "0x9858EfFD232B4033E47d90003D41EC34EcaEda94" })).status === 400);
  check("환전: 잘못된 BTC 주소 → 400", (await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "100", cryptoAsset: "BTC", cryptoAddress: "bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyx" })).status === 400);
  const wreq = await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "50000", memo: "국민 123-456", ...W });
  check("환전 신청 → PENDING (받을 코인·주소 저장)", wreq.status === 201 && wreq.data.transaction.cryptoAsset === "USDT_TRC20" && wreq.data.transaction.cryptoAddress === W.cryptoAddress, wreq.data);
  const meW = await user.json("/api/me");
  check("처리중 환전액만큼 사용가능 포인트 감소", meW.data.available === "1000000.00" && meW.data.balance === "1050000.00", meW.data);
  check("거절 사유 없이 거절 → 400", (await admin.json(`/api/admin/transactions/${wreq.data.transaction.id}`, "POST", { action: "reject", reason: "" })).status === 400);
  const rej = await admin.json(`/api/admin/transactions/${wreq.data.transaction.id}`, "POST", { action: "reject", reason: "계좌 정보 불일치" });
  check("환전 거절 → REJECTED + 사유", rej.status === 200 && rej.data.transaction.status === "REJECTED" && rej.data.transaction.rejectReason === "계좌 정보 불일치");
  const txList = await user.json("/api/transactions");
  check("유저 신청 내역(폴링 API)에 상태 반영", txList.data.transactions.some((t: any) => t.status === "REJECTED") && txList.data.available === "1050000.00");

  const w2 = await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "50000", ...W });
  const appW = await admin.json(`/api/admin/transactions/${w2.data.transaction.id}`, "POST", { action: "approve" });
  check("환전 승인 → 잔액 차감 (1,000,000)", appW.status === 200 && (await user.json("/api/me")).data.balance === "1000000.00");

  // ───────────────────────────────────────────────
  section("5. 예치 (VIP 이율 스냅샷, 잔액 검증, 동시성)");
  check("잔액 초과 예치 → 400", (await user.json("/api/deposits", "POST", { productId: stable.id, termDays: 30, amount: "1000000.01" })).status === 400);
  check("제공하지 않는 기간 → 400", (await user.json("/api/deposits", "POST", { productId: stable.id, termDays: 31, amount: "100" })).status === 400);

  const depA = await user.json("/api/deposits", "POST", { productId: stable.id, termDays: 30, amount: "950000" });
  check("예치 A 생성 (안정형 30일, 5% + VIP 1% = 6%)", depA.status === 201 && depA.data.deposit.totalRate === "6" && depA.data.deposit.vipBonusRate === "1", depA.data);
  check("예치 A 예상이자 57,000", depA.data.deposit?.expectedInterest === "57000.00");
  check("예치 A 만기일 = 오늘+30", depA.data.deposit?.endDate.slice(0, 10) === kstDate(30));
  check("예치 후 잔액 50,000", (await user.json("/api/me")).data.balance === "50000.00");

  // VIP 변경해도 기존 예치 이율 불변
  await admin.json(`/api/admin/users/${userId}/vip`, "PATCH", { vipLevel: 5 });
  const depAdb = await prisma.deposit.findUniqueOrThrow({ where: { id: depA.data.deposit.id } });
  check("VIP 변경 후에도 기존 예치 이율 스냅샷 유지", depAdb.totalRate.eq(6));
  await admin.json(`/api/admin/users/${userId}/vip`, "PATCH", { vipLevel: 3 });

  // 동시 예치 3건 × 20,000 (잔액 50,000) → 2건만 성공
  const par = await Promise.all([1, 2, 3].map(() => user.json("/api/deposits", "POST", { productId: boost.id, termDays: 7, amount: "20000" })));
  const parOk = par.filter((r) => r.status === 201);
  check("동시 예치 시 잔액 초과분 차단 (2건만 성공)", parOk.length === 2, par.map((r) => r.status));
  check("잔액 10,000 (음수 불가)", (await user.json("/api/me")).data.balance === "10000.00");
  check("단기 7일 예치 이율 1.5% + 1% = 2.5%, 예상이자 500", parOk.every((r) => r.data.deposit.totalRate === "2.5" && r.data.deposit.expectedInterest === "500.00"));

  // 처리중 환전이 있으면 그만큼 예치 불가
  const w3 = await user.json("/api/transactions", "POST", { type: "WITHDRAW", amount: "10000", ...W });
  check("처리중 환전액은 예치에 사용 불가", (await user.json("/api/deposits", "POST", { productId: boost.id, termDays: 7, amount: "1" })).status === 400);
  await admin.json(`/api/admin/transactions/${w3.data.transaction.id}`, "POST", { action: "reject", reason: "테스트" });

  // 비활성 상품 예치 불가
  await prisma.product.update({ where: { id: boost.id }, data: { isActive: false } });
  check("비활성 상품 예치 → 400", (await user.json("/api/deposits", "POST", { productId: boost.id, termDays: 7, amount: "1" })).status === 400);
  await prisma.product.update({ where: { id: boost.id }, data: { isActive: true } });

  // ───────────────────────────────────────────────
  section("6. 일일 이자 배치 + 만기 자동 해제");
  const depIds = [depA.data.deposit.id, ...parOk.map((r) => r.data.deposit.id)];
  // 테스트 대상 외 다른 ACTIVE 예치가 있으면 결과 수치가 달라지므로 내 예치건 기준으로 검증
  check("cron 엔드포인트: 시크릿 없이 → 401", (await anon.json("/api/cron/daily-interest")).status === 401);
  const cron = await fetch(`${BASE}/api/cron/daily-interest`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
  check("cron 엔드포인트: Bearer CRON_SECRET → 200", cron.status === 200, await cron.clone().json().catch(() => null));
  check("USER 가 수동 배치 실행 → 403", (await user.json("/api/admin/batch", "POST", {})).status === 403);

  const logsOf = () => prisma.interestLog.count({ where: { depositId: { in: depIds } } });
  check("예치 당일 배치 → 이자 0건 (다음날부터 지급)", (await logsOf()) === 0);

  const b1 = await admin.json("/api/admin/batch", "POST", { targetDate: kstDate(1) });
  check("D+1 배치 실행", b1.status === 200 && b1.data.status === "SUCCESS", b1.data);
  check("D+1: 예치 3건 각 1일분 이자 지급", (await logsOf()) === 3);
  const a1 = await prisma.deposit.findUniqueOrThrow({ where: { id: depA.data.deposit.id } });
  check("예치 A 일일 이자 = 950000 × 6% / 30 = 1,900", a1.accruedInterest.eq(1900), a1.accruedInterest.toString());
  const b1again = await admin.json("/api/admin/batch", "POST", { targetDate: kstDate(1) });
  check("같은 날 재실행 → 중복 지급 없음", b1again.data.interestCount === 0 && (await logsOf()) === 3);

  // 동시 배치 실행 2회 (D+10) → 누락분 9일 보정 지급, 중복 없음
  const [c1, c2] = await Promise.all([1, 2].map(() => admin.json("/api/admin/batch", "POST", { targetDate: kstDate(10) })));
  check("동시 배치 2회 실행 성공", c1.status === 200 && c2.status === 200);
  check("D+10: A 10일분, 7일 예치 각 7일분 (총 24건, 중복 없음)", (await logsOf()) === 10 + 7 + 7, await logsOf());
  const dupCheck = await prisma.interestLog.groupBy({ by: ["depositId", "interestDate"], where: { depositId: { in: depIds } }, _count: true, having: { depositId: { _count: { gt: 1 } } } });
  check("(예치건, 날짜) 중복 로그 없음", dupCheck.length === 0);

  for (const r of parOk) {
    const d = await prisma.deposit.findUniqueOrThrow({ where: { id: r.data.deposit.id } });
    check(`7일 예치 만기 완료: 누적이자 정확히 500.00 (마지막날 잔여분 보정)`, d.status === "COMPLETED" && d.accruedInterest.eq(500), { s: d.status, a: d.accruedInterest.toString() });
  }
  const lastLog = await prisma.interestLog.findFirst({ where: { depositId: parOk[0].data.deposit.id }, orderBy: { dayIndex: "desc" } });
  check("7일 예치: 일 71.42 × 6 + 마지막날 71.48", lastLog?.amount.eq("71.48") === true, lastLog?.amount.toString());

  // 10,000 + 7일 예치 2건 원금(40,000) + 이자(1,000) + A 10일 이자(19,000)
  check("D+10 유저 잔액 = 70,000", (await user.json("/api/me")).data.balance === "70000.00", (await user.json("/api/me")).data);

  const b30 = await admin.json("/api/admin/batch", "POST", { targetDate: kstDate(35) });
  check("D+35 배치 (만기 지남)", b30.status === 200);
  const aEnd = await prisma.deposit.findUniqueOrThrow({ where: { id: depA.data.deposit.id } });
  check("예치 A 만기 완료 + 누적이자 정확히 57,000", aEnd.status === "COMPLETED" && aEnd.accruedInterest.eq(57000), aEnd);
  check("예치 A 이자 로그 30건 (만기일까지만)", (await prisma.interestLog.count({ where: { depositId: aEnd.id } })) === 30);
  check("예치 A 마지막 지급일 = 만기일", aEnd.lastInterestDate?.getTime() === aEnd.endDate.getTime());
  check("최종 잔액 = 1,000,000 + 57,000 + 1,000 = 1,058,000", (await user.json("/api/me")).data.balance === "1058000.00");
  const logSum = await prisma.interestLog.aggregate({ where: { userId }, _sum: { amount: true } });
  check("InterestLog 합계 = 58,000", logSum._sum.amount?.eq(58000) === true);
  const lastBal = await prisma.interestLog.findFirst({ where: { depositId: aEnd.id }, orderBy: { dayIndex: "desc" } });
  check("InterestLog.balanceAfter 기록", lastBal !== null && lastBal.balanceAfter.gt(0));

  // ───────────────────────────────────────────────
  section("7. 관리자 예치 강제 해지 / 상품 삭제 보호");
  const depC = await user.json("/api/deposits", "POST", { productId: stable.id, termDays: 90, amount: "8000" });
  check("예치 C 생성", depC.status === 201);
  const cancel = await admin.json(`/api/admin/deposits/${depC.data.deposit.id}/cancel`, "POST");
  check("강제 해지 → 원금 반환", cancel.status === 200 && (await user.json("/api/me")).data.balance === "1058000.00");
  check("해지 건 재해지 → 409", (await admin.json(`/api/admin/deposits/${depC.data.deposit.id}/cancel`, "POST")).status === 409);
  check("예치 내역 있는 상품 삭제 → 400", (await admin.json(`/api/admin/products/${stable.id}`, "DELETE")).status === 400);
  const logsApi = await user.json(`/api/deposits/${aEnd.id}/logs`);
  check("유저 이자 로그 API 30건", logsApi.status === 200 && logsApi.data.logs.length === 30);
  check("타인 예치 로그 접근 차단", (await new Client().json(`/api/deposits/${aEnd.id}/logs`)).status === 401);

  // ───────────────────────────────────────────────
  section("8. 페이지 렌더링");
  for (const p of ["/home", "/dashboard", "/products", "/wallet", "/my-deposits"]) {
    const res = await user.raw(p);
    check(`USER ${p} → 200`, res.status === 200, res.status);
  }
  for (const p of ["/admin", "/admin/users", "/admin/vip-levels", "/admin/products", "/admin/transactions", "/admin/deposits", "/admin/crypto"]) {
    const res = await admin.raw(p);
    check(`ADMIN ${p} → 200`, res.status === 200, res.status);
  }
  const adminOnUser = await admin.raw("/dashboard");
  check("ADMIN → /dashboard 는 /admin 으로 리다이렉트", adminOnUser.status === 307 && (adminOnUser.headers.get("location") ?? "").includes("/admin"));
  const yieldPage = await user.raw("/yield");
  check("USER /yield → 200", yieldPage.status === 200, yieldPage.status);
  const strategyAsUser = await user.raw("/strategy");
  check("USER /strategy → /yield 리다이렉트", strategyAsUser.status === 307 && (strategyAsUser.headers.get("location") ?? "").includes("/yield"));

  section("9. 다국어 (EN 기본 / KO 토글)");
  const enPage = await fetch(`${BASE}/strategy`, { redirect: "manual" });
  const enHtml = await enPage.text();
  check("기본 언어 = 영어 (<html lang=en>)", enPage.status === 200 && enHtml.includes('<html lang="en"'), enPage.status);
  check("영어 문구 + 브랜드 D.C Asset 표시", enHtml.includes("Log in") && enHtml.includes("D.C Asset"));
  check("위험 고지(Risk Framework) 섹션 제거", !enHtml.includes('id="risk"') && !enHtml.includes("Risk Framework"));
  const koPage = await fetch(`${BASE}/strategy`, { redirect: "manual", headers: { cookie: "lang=ko" } });
  const koHtml = await koPage.text();
  check("lang=ko 쿠키 → 한국어 표시", koHtml.includes('<html lang="ko"') && koHtml.includes("로그인"));

  // ───────────────────────────────────────────────
  section("10. 코인 입금 (HD 지갑 주소 · 컨펌 · 자동 충전 · 중복 방지)");
  const MOCK = process.env.CRYPTO_MOCK_FILE || "/tmp/mock-chain.json";
  type MockT = { asset: string; txHash: string; from: string; amount: string; confirmations: number };
  const writeMock = (transfers: Record<string, MockT[]>, extra: Record<string, unknown> = {}) =>
    writeFileSync(MOCK, JSON.stringify({ prices: { BTC: "60000", ETH: "3000" }, transfers, ...extra }));
  writeMock({});
  check("비로그인 /api/crypto → 401", (await anon.json("/api/crypto")).status === 401);
  check("관리자 API 회원 접근 → 403", (await user.json("/api/admin/crypto")).status === 403);

  const cu = new Client();
  const cEmail = `crypto${stamp}@example.com`;
  await anon.json("/api/signup", "POST", { name: "코인테스터", email: cEmail, password });
  await cu.login(cEmail, password);
  const cs = await cu.json("/api/crypto");
  if (!cs.data.configured) {
    console.log("  ⚠️  서버가 CRYPTO_XPUB_* / CRYPTO_MOCK_FILE 없이 실행되어 코인 입금 테스트를 건너뜁니다.");
  } else {
    const cUser = await prisma.user.findUniqueOrThrow({ where: { email: cEmail }, include: { cryptoWallet: true } });
    const wid = cUser.cryptoWallet!.id;
    const addr = Object.fromEntries(cs.data.assets.map((a: any) => [a.id, a.address]));
    check("입금 주소 4종 발급 (USDT-TRC20 / USDT-ERC20 / ETH / BTC)", cs.data.assets.length === 4);
    check("HD 인덱스 ≥ 1 (0번은 회사 메인 주소)", wid >= 1);
    check("ETH·USDT-ERC20 같은 주소 + xpub 파생값과 일치",
      addr.ETH === addr.USDT_ERC20 && addr.ETH === deriveAddress("ETH", process.env.CRYPTO_XPUB_ETH!, wid) && addr.BTC === deriveAddress("BTC", process.env.CRYPTO_XPUB_BTC!, wid) && addr.USDT_TRC20 === deriveAddress("TRON", process.env.CRYPTO_XPUB_TRON!, wid));
    check("충전 화면 열면 자동 감시 대상(watchUntil) 등록", !!cUser.cryptoWallet!.watchUntil && cUser.cryptoWallet!.watchUntil > new Date());
    const cs2 = await cu.json("/api/crypto");
    check("재요청해도 같은 주소 유지", cs2.data.assets.every((a: any) => addr[a.id] === a.address));
    check("시세 제공 (BTC/ETH)", cs.data.prices?.BTC === "60000" && cs.data.prices?.ETH === "3000");

    const bal = async () => (await cu.json("/api/me")).data.balance as string;
    const resetScan = () => prisma.cryptoWallet.update({ where: { id: wid }, data: { lastScannedAt: null } });
    const t = (asset: string, txHash: string, amount: string, confirmations: number): MockT => ({ asset, txHash: `${txHash}-${stamp}`, from: "sender", amount, confirmations });
    const H = (h: string) => `${h}-${stamp}`;

    writeMock({
      [addr.BTC]: [t("BTC", "btc-tx-1", "0.002", 2)],
      [addr.ETH]: [t("ETH", "eth-tx-1", "0.01", 3)],
      [addr.USDT_TRC20]: [t("USDT_TRC20", "trc-tx-1", "125.5", 1), t("USDT_TRC20", "trc-dust", "3", 20)],
    });
    await resetScan();
    const s1 = await cu.json("/api/crypto/scan", "POST");
    const st = (h: string) => s1.data.deposits.find((d: any) => d.txHash === H(h))?.status;
    check("BTC 2컨펌 → 즉시 충전 (0.002 × $60,000 = 120 P)", st("btc-tx-1") === "CREDITED" && (await bal()) === "120.00", s1.data);
    check("ETH 3/12컨펌 · USDT 미확정 → 대기(PENDING)", st("eth-tx-1") === "PENDING" && st("trc-tx-1") === "PENDING");
    check("최소 입금액($10) 미만 → BELOW_MIN (자동 충전 안 함)", st("trc-dust") === "BELOW_MIN");
    const s1b = await cu.json("/api/crypto/scan", "POST");
    check("15초 이내 재스캔 요청은 체인 조회 생략 (무료 API 보호)", s1b.data.scanned === false);
    const wl = await cu.json("/api/transactions");
    check("지갑 API: 확인 중 코인 입금 표시", wl.data.cryptoPending.length === 3);

    writeMock({
      [addr.BTC]: [t("BTC", "btc-tx-1", "0.002", 3)],
      [addr.ETH]: [t("ETH", "eth-tx-1", "0.01", 12)],
      [addr.USDT_TRC20]: [t("USDT_TRC20", "trc-tx-1", "125.5", 20), t("USDT_TRC20", "trc-dust", "3", 20)],
    });
    check("cron 인증 없음 → 401", (await fetch(`${BASE}/api/cron/crypto-scan`)).status === 401);
    await resetScan();
    const cron = await fetch(`${BASE}/api/cron/crypto-scan`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } });
    const cronJ = await cron.json();
    check("외부 cron(1분) 호출 → 컨펌 완료분 자동 충전", cron.status === 200 && cronJ.credited === 2, cronJ);
    check("잔액 = 120 + 125.5 + 30 = 275.5", (await bal()) === "275.50");

    await resetScan();
    await Promise.all([cu.json("/api/crypto/scan", "POST"), fetch(`${BASE}/api/cron/crypto-scan`, { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } }), cu.json("/api/crypto/scan", "POST")]);
    const txs = await prisma.pointTransaction.count({ where: { userId: cUser.id, type: "CRYPTO_DEPOSIT" } });
    check("동시 재스캔해도 중복 충전 없음 (충전 3건, 잔액 그대로)", txs === 3 && (await bal()) === "275.50");
    check("입금 기록 중복 없음 (4건)", (await prisma.cryptoDeposit.count({ where: { userId: cUser.id } })) === 4);
    const ctx = (await cu.json("/api/transactions")).data.transactions.find((x: any) => x.type === "CRYPTO_DEPOSIT" && x.memo?.includes("BTC"));
    check("포인트 내역에 코인 입금(수량·시세) 기록", !!ctx && ctx.status === "APPROVED" && ctx.memo.includes("0.002 BTC") && ctx.memo.includes("$60000"), ctx);

    // 시세 조회 실패 시 반영 보류 → 복구 후 반영
    writeMock({ [addr.BTC]: [t("BTC", "btc-tx-1", "0.002", 3), t("BTC", "btc-tx-2", "0.001", 5)] }, { fail: { PRICE: true } });
    await resetScan();
    await cu.json("/api/crypto/scan", "POST");
    check("시세 실패 시 충전 보류 (PENDING 유지)", (await prisma.cryptoDeposit.findFirst({ where: { txHash: H("btc-tx-2") } }))?.status === "PENDING");
    writeMock({ [addr.BTC]: [t("BTC", "btc-tx-1", "0.002", 3), t("BTC", "btc-tx-2", "0.001", 6)] });
    await resetScan();
    await cu.json("/api/crypto/scan", "POST");
    check("시세 복구 후 자동 충전 (+60 P)", (await bal()) === "335.50");

    // 체인 API 장애는 다른 체인 처리에 영향 없음
    writeMock({ [addr.ETH]: [t("ETH", "eth-tx-1", "0.01", 12), t("USDT_ERC20", "erc-tx-1", "50", 12)] }, { fail: { BTC: true, TRON: true } });
    await resetScan();
    await cu.json("/api/crypto/scan", "POST");
    check("BTC/TRON API 장애 중에도 USDT-ERC20 충전 (+50 P)", (await bal()) === "385.50");

    // 관리자 화면
    const ad = await admin.json("/api/admin/crypto");
    check("관리자 설정 상태: 3개 체인 정상 + 회사 메인 주소(인덱스 0)", ad.status === 200 && ad.data.config.chains.every((c: any) => c.ok) && ad.data.config.chains.find((c: any) => c.chain === "ETH").mainAddress === "0x9858EfFD232B4033E47d90003D41EC34EcaEda94", ad.data.config);
    check("관리자 입금 목록 + 통계", ad.data.deposits.filter((d: any) => d.userEmail === cEmail).length === 6 && ad.data.stats.find((s: any) => s.asset === "BTC").creditedCount >= 2);
    const dust = ad.data.deposits.find((d: any) => d.txHash === H("trc-dust"));
    const cr1 = await admin.json(`/api/admin/crypto/${dust.id}/credit`, "POST");
    check("최소 금액 미만 건 관리자 수동 반영 (+3 P)", cr1.status === 200 && (await bal()) === "388.50", cr1.data);
    check("수동 반영 중복 → 409", (await admin.json(`/api/admin/crypto/${dust.id}/credit`, "POST")).status === 409);
    const credited = ad.data.deposits.find((d: any) => d.txHash === H("btc-tx-1"));
    check("이미 충전된 건 수동 반영 불가 → 409", (await admin.json(`/api/admin/crypto/${credited.id}/credit`, "POST")).status === 409);
    const scanAll = await admin.json("/api/admin/crypto/scan?all=1", "POST");
    check("관리자 전체 지갑 스캔 → 추가 충전 없음", scanAll.status === 200 && (await bal()) === "388.50", scanAll.data);
    check("코인 입금 회원 /wallet 렌더링", (await cu.raw("/wallet")).status === 200);
    writeMock({});
  }

  console.log(`\n결과: ✅ ${passed} 통과 / ❌ ${failed} 실패`);
  if (failed > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
