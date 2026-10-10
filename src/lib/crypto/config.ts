/**
 * 코인 입금 설정 (클라이언트에서도 import 가능한 상수만 export — 서버 전용 값은 cryptoEnv())
 */
export type CryptoAssetId = "USDT_TRC20" | "USDT_ERC20" | "ETH" | "BTC";
export type CryptoChainId = "BTC" | "ETH" | "TRON";

export type AssetMeta = {
  id: CryptoAssetId;
  chain: CryptoChainId;
  symbol: "USDT" | "ETH" | "BTC";
  label: string; // 화면 표기
  network: string; // 네트워크 표기
  decimals: number;
  contract?: string; // 토큰 컨트랙트 (가짜 토큰 차단용)
  confirmations: number; // 반영에 필요한 컨펌 수
  displayDecimals: number; // 송금 수량 안내 소수 자릿수
  explorerTx: string;
  explorerAddr: string;
};

export const ASSETS: Record<CryptoAssetId, AssetMeta> = {
  USDT_TRC20: {
    id: "USDT_TRC20",
    chain: "TRON",
    symbol: "USDT",
    label: "USDT",
    network: "TRC-20 (TRON)",
    decimals: 6,
    contract: "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t",
    confirmations: 20, // TronGrid only_confirmed(=solidified, 약 19블록) 기준
    displayDecimals: 2,
    explorerTx: "https://tronscan.org/#/transaction/",
    explorerAddr: "https://tronscan.org/#/address/",
  },
  USDT_ERC20: {
    id: "USDT_ERC20",
    chain: "ETH",
    symbol: "USDT",
    label: "USDT",
    network: "ERC-20 (Ethereum)",
    decimals: 6,
    contract: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    confirmations: 12,
    displayDecimals: 2,
    explorerTx: "https://etherscan.io/tx/",
    explorerAddr: "https://etherscan.io/address/",
  },
  ETH: {
    id: "ETH",
    chain: "ETH",
    symbol: "ETH",
    label: "ETH",
    network: "Ethereum",
    decimals: 18,
    confirmations: 12,
    displayDecimals: 6,
    explorerTx: "https://etherscan.io/tx/",
    explorerAddr: "https://etherscan.io/address/",
  },
  BTC: {
    id: "BTC",
    chain: "BTC",
    symbol: "BTC",
    label: "BTC",
    network: "Bitcoin",
    decimals: 8,
    confirmations: 2,
    displayDecimals: 8,
    explorerTx: "https://mempool.space/tx/",
    explorerAddr: "https://mempool.space/address/",
  },
};

export const ASSET_ORDER: CryptoAssetId[] = ["USDT_TRC20", "USDT_ERC20", "ETH", "BTC"];
export const isAssetId = (v: unknown): v is CryptoAssetId => typeof v === "string" && v in ASSETS;

/** 충전 계산기 빠른 버튼 (누를 때마다 더해짐, 1 P = 1 USD) */
export const CHARGE_PRESETS = ["10", "100", "1000", "10000"];

/** 서버 전용 환경변수 */
export function cryptoEnv() {
  const min = Number(process.env.CRYPTO_MIN_DEPOSIT_USD ?? "10");
  return {
    xpub: {
      BTC: process.env.CRYPTO_XPUB_BTC?.trim() || "",
      ETH: process.env.CRYPTO_XPUB_ETH?.trim() || "",
      TRON: process.env.CRYPTO_XPUB_TRON?.trim() || "",
    } as Record<CryptoChainId, string>,
    etherscanKey: process.env.ETHERSCAN_API_KEY?.trim() || "",
    trongridKey: process.env.TRONGRID_API_KEY?.trim() || "",
    minDepositUsd: Number.isFinite(min) && min >= 0 ? min : 10,
    watchHours: Number(process.env.CRYPTO_WATCH_HOURS ?? "24") || 24,
    // 테스트 전용: 체인/시세 응답을 JSON 파일로 대체 (Vercel 에서는 무시)
    mockFile: !process.env.VERCEL ? process.env.CRYPTO_MOCK_FILE?.trim() || "" : "",
  };
}
