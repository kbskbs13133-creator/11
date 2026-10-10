-- 코인 입금(USDT-TRC20 / USDT-ERC20 / ETH / BTC) 자체 HD 지갑 지원
-- 회원별 입금 주소(CryptoWallet/CryptoAddress), 입금 감지·반영 기록(CryptoDeposit), 환전 받을 주소 컬럼
-- CreateEnum
CREATE TYPE "CryptoChain" AS ENUM ('BTC', 'ETH', 'TRON');

-- CreateEnum
CREATE TYPE "CryptoAsset" AS ENUM ('BTC', 'ETH', 'USDT_ERC20', 'USDT_TRC20');

-- CreateEnum
CREATE TYPE "CryptoDepositStatus" AS ENUM ('PENDING', 'CREDITED', 'BELOW_MIN');

-- AlterEnum
ALTER TYPE "TransactionType" ADD VALUE 'CRYPTO_DEPOSIT';

-- AlterTable
ALTER TABLE "PointTransaction" ADD COLUMN     "cryptoAddress" TEXT,
ADD COLUMN     "cryptoAsset" "CryptoAsset";

-- CreateTable
CREATE TABLE "CryptoWallet" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "watchUntil" TIMESTAMP(3),
    "lastScannedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoWallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoAddress" (
    "id" TEXT NOT NULL,
    "walletId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "chain" "CryptoChain" NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CryptoAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CryptoDeposit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "asset" "CryptoAsset" NOT NULL,
    "txHash" TEXT NOT NULL,
    "uniqueKey" TEXT NOT NULL,
    "fromAddress" TEXT,
    "amount" DECIMAL(36,18) NOT NULL,
    "confirmations" INTEGER NOT NULL DEFAULT 0,
    "status" "CryptoDepositStatus" NOT NULL DEFAULT 'PENDING',
    "priceUsd" DECIMAL(24,8),
    "points" DECIMAL(18,2),
    "transactionId" TEXT,
    "blockTime" TIMESTAMP(3),
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creditedAt" TIMESTAMP(3),

    CONSTRAINT "CryptoDeposit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CryptoWallet_userId_key" ON "CryptoWallet"("userId");

-- CreateIndex
CREATE INDEX "CryptoWallet_watchUntil_idx" ON "CryptoWallet"("watchUntil");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoAddress_address_key" ON "CryptoAddress"("address");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoAddress_walletId_chain_key" ON "CryptoAddress"("walletId", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_uniqueKey_key" ON "CryptoDeposit"("uniqueKey");

-- CreateIndex
CREATE UNIQUE INDEX "CryptoDeposit_transactionId_key" ON "CryptoDeposit"("transactionId");

-- CreateIndex
CREATE INDEX "CryptoDeposit_status_detectedAt_idx" ON "CryptoDeposit"("status", "detectedAt");

-- CreateIndex
CREATE INDEX "CryptoDeposit_userId_detectedAt_idx" ON "CryptoDeposit"("userId", "detectedAt");

-- AddForeignKey
ALTER TABLE "CryptoWallet" ADD CONSTRAINT "CryptoWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoAddress" ADD CONSTRAINT "CryptoAddress_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "CryptoWallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit" ADD CONSTRAINT "CryptoDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit" ADD CONSTRAINT "CryptoDeposit_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "CryptoAddress"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CryptoDeposit" ADD CONSTRAINT "CryptoDeposit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "PointTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
