import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const D = (v: string | number) => new Prisma.Decimal(v);

async function main() {
  // 1) VIP 등급 1~5 기본값
  const vipDefaults = [
    { level: 1, name: "브론즈", bonusRate: "0" },
    { level: 2, name: "실버", bonusRate: "0.5" },
    { level: 3, name: "골드", bonusRate: "1" },
    { level: 4, name: "플래티넘", bonusRate: "1.5" },
    { level: 5, name: "다이아몬드", bonusRate: "2" },
  ];
  for (const v of vipDefaults) {
    await prisma.vipLevel.upsert({
      where: { level: v.level },
      update: {},
      create: { level: v.level, name: v.name, bonusRate: D(v.bonusRate) },
    });
  }

  // 2) 관리자 계정
  const isDeployed = !!process.env.VERCEL || process.env.NODE_ENV === "production";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL ?? "admin@example.com").trim().toLowerCase();
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? (isDeployed ? "" : "admin1234!");
  // 실서버에서는 공개된 기본 비밀번호(admin1234!) 사용을 막는다
  if (isDeployed && (adminPassword.length < 8 || adminPassword === "admin1234!")) {
    throw new Error(
      "❌ 환경변수 SEED_ADMIN_PASSWORD 를 8자 이상(기본값 admin1234! 제외)으로 설정해주세요. (Vercel → Settings → Environment Variables)"
    );
  }
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "관리자",
      role: "ADMIN",
      passwordHash: await bcrypt.hash(adminPassword, 10),
      vipLevel: 1,
    },
  });

  // 3) 샘플 상품 2개 (이미 상품이 있으면 건너뜀)
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    await prisma.product.create({
      data: {
        name: "안정형 포인트 예치",
        description:
          "원금 보장형 기본 예치 상품입니다.\n매일 자정 일할 계산된 이자가 자동 지급되며, 만기일에 원금이 자동 반환됩니다.",
        isActive: true,
        sortOrder: 1,
        rates: {
          create: [
            { termDays: 30, rate: D("5") },
            { termDays: 90, rate: D("8") },
            { termDays: 180, rate: D("12") },
            { termDays: 365, rate: D("18") },
          ],
        },
      },
    });
    await prisma.product.create({
      data: {
        name: "단기 부스트 예치",
        description: "짧은 기간 동안 높은 수익률을 제공하는 단기 상품입니다.\n이벤트 기간 한정으로 운영될 수 있습니다.",
        isActive: true,
        sortOrder: 2,
        rates: {
          create: [
            { termDays: 7, rate: D("1.5") },
            { termDays: 14, rate: D("3.2") },
            { termDays: 30, rate: D("7") },
          ],
        },
      },
    });
  }

  console.log("✅ Seed 완료");
  console.log(`   관리자: ${adminEmail}${isDeployed ? "" : ` / ${adminPassword}`}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
