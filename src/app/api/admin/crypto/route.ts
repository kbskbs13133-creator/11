import { prisma } from "@/lib/prisma";
import { handler, ok } from "@/lib/api";
import { requireAdminApi } from "@/lib/session";
import { cryptoDepositDTO } from "@/lib/serializers";
import { cryptoAdminConfig, cryptoAdminStats } from "@/lib/crypto/admin";

export const dynamic = "force-dynamic";

/** 코인 입금 내역 (status: ALL | PENDING | CREDITED | BELOW_MIN, q: 회원/주소/TX 검색) */
export const GET = handler(async (req: Request) => {
  await requireAdminApi();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "ALL";
  const q = url.searchParams.get("q")?.trim() ?? "";
  const where = {
    ...(["PENDING", "CREDITED", "BELOW_MIN"].includes(status) ? { status: status as "PENDING" | "CREDITED" | "BELOW_MIN" } : {}),
    ...(q
      ? {
          OR: [
            { txHash: { contains: q, mode: "insensitive" as const } },
            { fromAddress: { contains: q, mode: "insensitive" as const } },
            { address: { address: { contains: q, mode: "insensitive" as const } } },
            { user: { email: { contains: q, mode: "insensitive" as const } } },
            { user: { name: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };
  const [rows, config, stats] = await Promise.all([
    prisma.cryptoDeposit.findMany({ where, orderBy: { detectedAt: "desc" }, take: 200, include: { user: { select: { name: true, email: true } }, address: { select: { address: true } } } }),
    cryptoAdminConfig(),
    cryptoAdminStats(),
  ]);
  return ok({
    config,
    stats,
    deposits: rows.map((d) => ({ ...cryptoDepositDTO(d), userName: d.user.name, userEmail: d.user.email, toAddress: d.address.address })),
  });
});
