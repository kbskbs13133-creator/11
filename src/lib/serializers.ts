import type { Product, ProductRate, Deposit, PointTransaction, VipLevel, CryptoDeposit } from "@prisma/client";
import { s2, sPlain, sRate } from "./money";

export type ProductDTO = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  isActive: boolean;
  sortOrder: number;
  rates: { id: string; termDays: number; rate: string }[];
  activeDepositCount?: number;
};

export function productDTO(p: Product & { rates: ProductRate[]; _count?: { deposits: number } }): ProductDTO {
  return {
    id: p.id,
    name: p.name,
    nameEn: p.nameEn,
    description: p.description,
    descriptionEn: p.descriptionEn,
    isActive: p.isActive,
    sortOrder: p.sortOrder,
    rates: [...p.rates].sort((a, b) => a.termDays - b.termDays).map((r) => ({ id: r.id, termDays: r.termDays, rate: sRate(r.rate) })),
    activeDepositCount: p._count?.deposits,
  };
}

export type DepositDTO = ReturnType<typeof depositDTO>;
export function depositDTO(d: Deposit) {
  return {
    id: d.id,
    productId: d.productId,
    productName: d.productName,
    productNameEn: d.productNameEn,
    principal: s2(d.principal)!,
    termDays: d.termDays,
    baseRate: sRate(d.baseRate),
    vipLevel: d.vipLevel,
    vipBonusRate: sRate(d.vipBonusRate),
    totalRate: sRate(d.totalRate),
    expectedInterest: s2(d.expectedInterest)!,
    accruedInterest: s2(d.accruedInterest)!,
    startDate: d.startDate.toISOString(),
    endDate: d.endDate.toISOString(),
    lastInterestDate: d.lastInterestDate?.toISOString() ?? null,
    status: d.status,
    createdAt: d.createdAt.toISOString(),
    completedAt: d.completedAt?.toISOString() ?? null,
    cancelledAt: d.cancelledAt?.toISOString() ?? null,
  };
}

export type TransactionDTO = ReturnType<typeof transactionDTO>;
export function transactionDTO(t: PointTransaction) {
  return {
    id: t.id,
    type: t.type,
    amount: s2(t.amount)!,
    status: t.status,
    memo: t.memo,
    rejectReason: t.rejectReason,
    processedAt: t.processedAt?.toISOString() ?? null,
    balanceAfter: s2(t.balanceAfter),
    cryptoAsset: t.cryptoAsset,
    cryptoAddress: t.cryptoAddress,
    createdAt: t.createdAt.toISOString(),
  };
}

export type CryptoDepositDTO = ReturnType<typeof cryptoDepositDTO>;
export function cryptoDepositDTO(d: CryptoDeposit) {
  return {
    id: d.id,
    asset: d.asset,
    txHash: d.txHash,
    fromAddress: d.fromAddress,
    amount: sPlain(d.amount),
    confirmations: d.confirmations,
    status: d.status,
    priceUsd: d.priceUsd ? d.priceUsd.toDecimalPlaces(2).toFixed(2) : null,
    points: s2(d.points),
    detectedAt: d.detectedAt.toISOString(),
    creditedAt: d.creditedAt?.toISOString() ?? null,
  };
}

export type VipLevelDTO = { level: number; name: string; nameEn: string; bonusRate: string };
export const vipDTO = (v: VipLevel): VipLevelDTO => ({ level: v.level, name: v.name, nameEn: v.nameEn, bonusRate: sRate(v.bonusRate) });
