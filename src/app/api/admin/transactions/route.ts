import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { transactionDTO } from "@/lib/serializers";
import { s2 } from "@/lib/money";
import type { Prisma, TransactionStatus, TransactionType } from "@prisma/client";

export const dynamic = "force-dynamic";

export const GET = handler(async (req: Request) => {
  await requireAdminApi();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") as TransactionStatus | null;
  const type = url.searchParams.get("type") as TransactionType | null;
  const where: Prisma.PointTransactionWhereInput = {};
  if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) where.status = status;
  if (type && ["CHARGE", "WITHDRAW", "ADMIN_CHARGE", "CRYPTO_DEPOSIT"].includes(type)) where.type = type;

  const list = await prisma.pointTransaction.findMany({
    where,
    include: { user: { select: { id: true, name: true, email: true, pointBalance: true } }, processedBy: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }],
    take: 300,
  });
  return ok({
    transactions: list.map((t) => ({
      ...transactionDTO(t),
      user: { id: t.user.id, name: t.user.name, email: t.user.email, balance: s2(t.user.pointBalance) },
      processedBy: t.processedBy?.name ?? null,
    })),
  });
});
