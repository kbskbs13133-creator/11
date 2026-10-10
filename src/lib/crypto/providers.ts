/**
 * 블록체인 입금 조회 (무료 공개 API)
 *  - BTC        : mempool.space
 *  - ETH/ERC-20 : Etherscan API V2 (무료 키: 초당 3회 / 하루 10만 회)
 *  - TRC-20     : TronGrid
 *  - 시세       : Binance 공개 시세 (data-api.binance.vision → api.binance.com 순서로 시도)
 * 테스트 시 CRYPTO_MOCK_FILE 로 응답을 대체할 수 있다.
 */
import { readFileSync } from "node:fs";
import { ASSETS, cryptoEnv, type CryptoAssetId, type CryptoChainId } from "./config";

export type Transfer = {
  asset: CryptoAssetId;
  txHash: string;
  uniqueKey: string;
  from: string | null;
  amount: string; // 코인 단위 10진 문자열
  confirmations: number;
  blockTime: Date | null;
};

type MockFile = {
  prices?: Partial<Record<"BTC" | "ETH", string>>;
  transfers?: Record<string, Array<Omit<Transfer, "blockTime" | "uniqueKey"> & { uniqueKey?: string }>>;
  fail?: Partial<Record<CryptoChainId | "PRICE", boolean>>;
};

function readMock(): MockFile | null {
  const f = cryptoEnv().mockFile;
  if (!f) return null;
  try {
    return JSON.parse(readFileSync(f, "utf8")) as MockFile;
  } catch {
    return {};
  }
}

/** 정수 최소단위 문자열 → 10진 문자열 (BigInt, 부동소수점 오차 없음) */
export function fromUnits(raw: string, decimals: number): string {
  const neg = raw.startsWith("-");
  const digits = (neg ? raw.slice(1) : raw).replace(/^0+/, "") || "0";
  const padded = digits.padStart(decimals + 1, "0");
  const int = padded.slice(0, padded.length - decimals);
  const frac = padded.slice(padded.length - decimals).replace(/0+$/, "");
  return (neg ? "-" : "") + int + (frac ? "." + frac : "");
}

async function getJson(url: string, init?: RequestInit, timeoutMs = 8000): Promise<unknown> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store", headers: { accept: "application/json", ...(init?.headers ?? {}) } });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${new URL(url).host}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ───────── 시세 ───────── */

let priceCache: { at: number; v: { BTC: string; ETH: string } } | null = null;

/** USD 시세 (BTCUSDT / ETHUSDT, USDT = 1 USD 로 간주). 20초 캐시 */
export async function getUsdPrices(): Promise<{ BTC: string; ETH: string; USDT: string }> {
  const mock = readMock();
  if (mock) {
    if (mock.fail?.PRICE) throw new Error("시세 조회 실패 (mock)");
    return { BTC: mock.prices?.BTC ?? "60000", ETH: mock.prices?.ETH ?? "3000", USDT: "1" };
  }
  if (priceCache && Date.now() - priceCache.at < 20_000) return { ...priceCache.v, USDT: "1" };
  const q = "/api/v3/ticker/price?symbols=" + encodeURIComponent('["BTCUSDT","ETHUSDT"]');
  let lastErr: unknown;
  for (const host of ["https://data-api.binance.vision", "https://api.binance.com", "https://api1.binance.com"]) {
    try {
      const arr = (await getJson(host + q, undefined, 5000)) as { symbol: string; price: string }[];
      const m = Object.fromEntries(arr.map((x) => [x.symbol, x.price]));
      if (!(Number(m.BTCUSDT) > 0 && Number(m.ETHUSDT) > 0)) throw new Error("시세 응답 오류");
      priceCache = { at: Date.now(), v: { BTC: m.BTCUSDT, ETH: m.ETHUSDT } };
      return { ...priceCache.v, USDT: "1" };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error("바이낸스 시세 조회 실패: " + (lastErr as Error)?.message);
}

/* ───────── BTC (mempool.space) ───────── */

type MempoolTx = {
  txid: string;
  vin: { prevout?: { scriptpubkey_address?: string } | null }[];
  vout: { scriptpubkey_address?: string; value: number }[];
  status: { confirmed: boolean; block_height?: number; block_time?: number };
};

let btcTip: { at: number; h: number } | null = null;
async function btcTipHeight() {
  if (btcTip && Date.now() - btcTip.at < 30_000) return btcTip.h;
  const h = Number(await (await fetch("https://mempool.space/api/blocks/tip/height", { cache: "no-store" })).text());
  if (!Number.isFinite(h)) throw new Error("BTC 블록 높이 조회 실패");
  btcTip = { at: Date.now(), h };
  return h;
}

async function btcTransfers(address: string): Promise<Transfer[]> {
  const [txs, tip] = await Promise.all([getJson(`https://mempool.space/api/address/${address}/txs`) as Promise<MempoolTx[]>, btcTipHeight()]);
  const out: Transfer[] = [];
  for (const tx of txs) {
    // 이 주소에서 출금된 거래(회수 등)는 입금으로 보지 않음
    if (tx.vin.some((i) => i.prevout?.scriptpubkey_address === address)) continue;
    const sats = tx.vout.filter((o) => o.scriptpubkey_address === address).reduce((s, o) => s + BigInt(o.value), 0n);
    if (sats <= 0n) continue;
    const conf = tx.status.confirmed && tx.status.block_height ? tip - tx.status.block_height + 1 : 0;
    out.push({
      asset: "BTC",
      txHash: tx.txid,
      uniqueKey: `BTC:${tx.txid}:${address}`,
      from: tx.vin[0]?.prevout?.scriptpubkey_address ?? null,
      amount: fromUnits(sats.toString(), 8),
      confirmations: Math.max(0, conf),
      blockTime: tx.status.block_time ? new Date(tx.status.block_time * 1000) : null,
    });
  }
  return out;
}

/* ───────── ETH / USDT-ERC20 (Etherscan V2) ───────── */

// 프로세스 내 Etherscan 호출 간격 제한 (무료: 초당 3회)
let ethQueue: Promise<unknown> = Promise.resolve();
function etherscan(params: Record<string, string>): Promise<unknown> {
  const key = cryptoEnv().etherscanKey;
  const run = async () => {
    const url = "https://api.etherscan.io/v2/api?" + new URLSearchParams({ chainid: "1", ...params, ...(key ? { apikey: key } : {}) });
    for (let attempt = 0; attempt < 3; attempt++) {
      const j = (await getJson(url)) as { status?: string; message?: string; result: unknown };
      if (params.module === "proxy") return j.result;
      if (j.status === "1") return j.result;
      if (typeof j.message === "string" && j.message.startsWith("No transactions")) return [];
      const msg = String(typeof j.result === "string" ? j.result : j.message);
      if (/rate limit/i.test(msg)) {
        await sleep(1100 * (attempt + 1));
        continue;
      }
      throw new Error("Etherscan: " + msg);
    }
    throw new Error("Etherscan: rate limit");
  };
  const p = ethQueue.then(run, run);
  ethQueue = p.then(
    () => sleep(key ? 350 : 5100),
    () => sleep(key ? 350 : 5100)
  );
  return p;
}

let ethBlock: { at: number; n: number } | null = null;
async function ethBlockNumber() {
  if (ethBlock && Date.now() - ethBlock.at < 12_000) return ethBlock.n;
  const hex = (await etherscan({ module: "proxy", action: "eth_blockNumber" })) as string;
  const n = parseInt(hex, 16);
  if (!Number.isFinite(n)) throw new Error("ETH 블록 번호 조회 실패");
  ethBlock = { at: Date.now(), n };
  return n;
}

type EsTx = { hash: string; from: string; to: string; value: string; confirmations?: string; isError?: string; timeStamp: string; blockNumber: string; traceId?: string; logIndex?: string; contractAddress?: string };
const page = { page: "1", offset: "50", sort: "desc", startblock: "0", endblock: "99999999" };

async function ethTransfers(address: string): Promise<Transfer[]> {
  const a = address.toLowerCase();
  const usdt = ASSETS.USDT_ERC20;
  const native = (await etherscan({ module: "account", action: "txlist", address, ...page })) as EsTx[];
  const internal = (await etherscan({ module: "account", action: "txlistinternal", address, ...page })) as EsTx[];
  const tokens = (await etherscan({ module: "account", action: "tokentx", contractaddress: usdt.contract!, address, ...page })) as EsTx[];
  const needBlock = internal.some((t) => t.to?.toLowerCase() === a);
  const head = needBlock ? await ethBlockNumber() : 0;
  const out: Transfer[] = [];
  const time = (t: EsTx) => (t.timeStamp ? new Date(Number(t.timeStamp) * 1000) : null);

  for (const t of native) {
    if (t.to?.toLowerCase() !== a || t.isError !== "0" || BigInt(t.value || "0") <= 0n) continue;
    out.push({ asset: "ETH", txHash: t.hash, uniqueKey: `ETH:${t.hash}:native`, from: t.from, amount: fromUnits(t.value, 18), confirmations: Number(t.confirmations ?? 0), blockTime: time(t) });
  }
  for (const t of internal) {
    if (t.to?.toLowerCase() !== a || t.isError !== "0" || BigInt(t.value || "0") <= 0n) continue;
    out.push({
      asset: "ETH",
      txHash: t.hash,
      uniqueKey: `ETH:${t.hash}:internal:${t.traceId ?? t.value}`,
      from: t.from,
      amount: fromUnits(t.value, 18),
      confirmations: Math.max(0, head - Number(t.blockNumber) + 1),
      blockTime: time(t),
    });
  }
  for (const t of tokens) {
    if (t.to?.toLowerCase() !== a || t.contractAddress?.toLowerCase() !== usdt.contract!.toLowerCase()) continue;
    if (BigInt(t.value || "0") <= 0n) continue;
    out.push({
      asset: "USDT_ERC20",
      txHash: t.hash,
      uniqueKey: `USDT_ERC20:${t.hash}:${t.logIndex ?? t.value}`,
      from: t.from,
      amount: fromUnits(t.value, usdt.decimals),
      confirmations: Number(t.confirmations ?? 0),
      blockTime: time(t),
    });
  }
  return out;
}

/* ───────── USDT-TRC20 (TronGrid) ───────── */

type TgTx = { transaction_id: string; token_info?: { address?: string; decimals?: number }; block_timestamp?: number; from: string; to: string; type?: string; value: string };

async function tronTransfers(address: string): Promise<Transfer[]> {
  const usdt = ASSETS.USDT_TRC20;
  const key = cryptoEnv().trongridKey;
  const headers = key ? { "TRON-PRO-API-KEY": key } : undefined;
  const base = `https://api.trongrid.io/v1/accounts/${address}/transactions/trc20?only_to=true&limit=50&contract_address=${usdt.contract}`;
  const [confirmed, unconfirmed] = await Promise.all([
    getJson(base + "&only_confirmed=true", { headers }) as Promise<{ data?: TgTx[] }>,
    (getJson(base + "&only_unconfirmed=true", { headers }) as Promise<{ data?: TgTx[] }>).catch(() => ({ data: [] as TgTx[] })),
  ]);
  const out: Transfer[] = [];
  const add = (t: TgTx, conf: number) => {
    if (t.to !== address || t.token_info?.address !== usdt.contract || (t.type && t.type !== "Transfer")) return;
    if (BigInt(t.value || "0") <= 0n) return;
    out.push({
      asset: "USDT_TRC20",
      txHash: t.transaction_id,
      uniqueKey: `USDT_TRC20:${t.transaction_id}:${address}`,
      from: t.from,
      amount: fromUnits(t.value, usdt.decimals),
      confirmations: conf,
      blockTime: t.block_timestamp ? new Date(t.block_timestamp) : null,
    });
  };
  const seen = new Set<string>();
  for (const t of confirmed.data ?? []) {
    seen.add(t.transaction_id);
    add(t, usdt.confirmations);
  }
  for (const t of unconfirmed.data ?? []) if (!seen.has(t.transaction_id)) add(t, 1);
  return out;
}

/** 체인별 입금 목록 조회 */
export async function fetchTransfers(chain: CryptoChainId, address: string): Promise<Transfer[]> {
  const mock = readMock();
  if (mock) {
    if (mock.fail?.[chain]) throw new Error(`${chain} 조회 실패 (mock)`);
    return (mock.transfers?.[address] ?? []).map((t) => ({ ...t, uniqueKey: t.uniqueKey ?? `${t.asset}:${t.txHash}:${address}`, blockTime: null }));
  }
  if (chain === "BTC") return btcTransfers(address);
  if (chain === "ETH") return ethTransfers(address);
  return tronTransfers(address);
}
