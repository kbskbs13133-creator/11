# 포인트 예치 기반 이자 지급 플랫폼

> 🚀 **실서버 배포(GitHub + Vercel + Neon) 방법은 [DEPLOY.md](./DEPLOY.md)** 를 참고하세요.

Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL · Tailwind CSS · NextAuth.js · node-cron / Vercel Cron

## 빠른 시작

```bash
npm install
cp .env.example .env          # DATABASE_URL(+_UNPOOLED), NEXTAUTH_SECRET, CRON_SECRET 설정
npx prisma migrate dev        # 마이그레이션 + seed 자동 실행
npm run db:demo               # (선택) 데모 회원 생성
npm run dev                   # http://localhost:3000
```

| 계정 | 이메일 | 비밀번호 |
|---|---|---|
| 관리자 | admin@example.com | admin1234! |
| 데모 회원 (`db:demo`) | user@example.com | user1234! |

## 스크립트

| 명령 | 설명 |
|---|---|
| `npm run db:seed` | 관리자 1명, 샘플 상품 2개, VIP 1~5 기본값 |
| `npm run db:reset` | DB 초기화 + seed |
| `npm run batch:run [-- YYYY-MM-DD]` | CLI 로 일일 배치 실행 |
| `npm run test:e2e` | 통합 테스트 94개 (서버 실행 중일 때. 끝나면 `db:reset` 권장) |

## 핵심 규칙

- **금액**은 `Decimal(18,2)`, **이율**은 `Decimal(9,4)`. 서버는 `Prisma.Decimal`, 클라이언트 미리보기는 BigInt 로 계산 (부동소수점 미사용)
- **총이율** = 상품 기본이율 + VIP 추가이율. 예치 시점에 스냅샷 저장 (나중에 VIP·상품 이율이 바뀌어도 기존 예치는 영향 없음)
- **일일 이자** = `floor2(원금 × 총이율/100 / 기간일수)`. **마지막 날**에는 내림으로 생긴 잔여분을 더해, 누적 이자 합계가 만기 총이자와 정확히 같아짐
- **날짜**는 KST 기준. 예치일 D → D+1 ~ D+기간 동안 매일 지급, D+기간(만기일)에 원금 반환 + `COMPLETED`
- **사용 가능 포인트** = 보유 포인트 − 처리중(PENDING) 환전 신청액. 예치와 환전 신청은 이 금액 안에서만 가능
- 환전은 **승인 시점**에 차감, 충전은 **승인 시점**에 적립. 관리자 직접 충전은 즉시 반영 (`ADMIN_CHARGE` 로 기록)

## 정합성 / 동시성

- 잔액 변경은 모두 `prisma.$transaction` 안에서 처리하고, 유저 행을 `SELECT … FOR UPDATE` 로 잠금
- 승인·거절은 `updateMany where status = PENDING` 조건부 갱신이라 같은 건을 두 번 처리할 수 없음
- 상품 10개 제한은 `pg_advisory_xact_lock` 으로 동시 등록 시에도 지켜짐
- 배치:
  - 예치건마다 별도 트랜잭션으로 처리하고, `lastInterestDate` 를 조건으로 낙관적 잠금
  - `InterestLog(depositId, interestDate)` 유니크 제약으로 같은 날 이자를 두 번 지급할 수 없음
  - 배치가 며칠 빠져도 다음 실행 때 빠진 날짜를 하루 단위로 보정 지급

## 배치 실행 방식 (3가지)

1. **Vercel Cron**: `vercel.json` 설정 `0 15 * * *` (UTC) = 매일 00:00 KST → `GET /api/cron/daily-interest` 호출 (`Authorization: Bearer $CRON_SECRET`)
2. **node-cron**: 자체 서버(`next start`)에서 `ENABLE_NODE_CRON=true` 이면 `src/instrumentation-node.ts` 가 매일 00:00 Asia/Seoul 에 실행
3. **수동 실행**: `/admin` 개요 화면의 "배치 수동 실행" 버튼. 기준일을 지정하면 그 날짜로 시뮬레이션 가능 (테스트 전용)

※ Vercel 에서는 node-cron 이 자동으로 비활성화됩니다 (`VERCEL` 환경변수 감지).

## 권한

`src/middleware.ts` 에서 1차로 막고, 각 API 핸들러가 `requireAdminApi` / `requireUserApi` 로 한 번 더 검증합니다.

- `/admin/**`, `/api/admin/**` → ADMIN 만 접근 (USER 는 403 또는 `/dashboard` 로 이동)
- `/dashboard`, `/products`, `/wallet`, `/my-deposits`, `/api/deposits|transactions|me` → USER 만 접근
- 회원가입으로는 항상 USER 계정만 생성됨
