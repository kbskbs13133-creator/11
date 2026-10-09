// 데모용 일반 회원 생성: npm run db:demo
// user@example.com / user1234!  (VIP 2, 1,000,000P 지급 + 처리중 충전 신청 1건)
import { PrismaClient, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirstOrThrow({ where: { role: "ADMIN" } });
  const exists = await prisma.user.findUnique({ where: { email: "user@example.com" } });
  if (exists) return console.log("이미 데모 회원이 존재합니다.");

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: "user@example.com",
        name: "데모회원",
        passwordHash: await bcrypt.hash("user1234!", 10),
        vipLevel: 2,
        pointBalance: new Prisma.Decimal("1000000"),
      },
    });
    await tx.pointTransaction.create({
      data: {
        userId: user.id, type: "ADMIN_CHARGE", amount: new Prisma.Decimal("1000000"), status: "APPROVED",
        memo: "가입 축하 포인트", processedById: admin.id, processedAt: new Date(), balanceAfter: new Prisma.Decimal("1000000"),
      },
    });
    await tx.pointTransaction.create({
      data: { userId: user.id, type: "CHARGE", amount: new Prisma.Decimal("50000"), status: "PENDING", memo: "데모회원 입금" },
    });
  });
  console.log("✅ 데모 회원 생성: user@example.com / user1234!");
}

main().finally(() => prisma.$disconnect());
