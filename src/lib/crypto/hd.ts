/**
 * HD 지갑 주소 파생 (watch-only)
 * - 서버에는 계정 단위 확장 공개키(xpub)만 둔다. 개인키/시드는 서버에 절대 저장하지 않는다.
 * - 경로 규칙 (표준):
 *     BTC  : m/84'/0'/0'   → 0/i  (Native SegWit, bc1q...)
 *     ETH  : m/44'/60'/0'  → 0/i  (ETH · USDT-ERC20 공용, MetaMask 와 동일)
 *     TRON : m/44'/195'/0' → 0/i  (USDT-TRC20, TronLink 와 동일)
 * - i = 0 은 회사 메인(회수) 주소로 예약, 회원은 1번부터 사용.
 */
import { HDKey } from "@scure/bip32";
import { bech32, bech32m, createBase58check } from "@scure/base";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";

export type Chain = "BTC" | "ETH" | "TRON";

const b58c = createBase58check(sha256);

// 확장 공개키 버전 바이트 (xpub / ypub / zpub 모두 허용 → xpub 로 정규화)
const XPUB_VERSION = 0x0488b21e;
const ALT_PUB_VERSIONS = new Set([0x049d7cb2 /* ypub */, 0x04b24746 /* zpub */]);
const PRIV_VERSIONS = new Set([0x0488ade4 /* xprv */, 0x049d7878 /* yprv */, 0x04b2430c /* zprv */]);

function normalizeXpub(input: string): string {
  const raw = b58c.decode(input.trim());
  const view = new DataView(raw.buffer, raw.byteOffset, raw.byteLength);
  const version = view.getUint32(0);
  if (PRIV_VERSIONS.has(version)) throw new Error("개인키(xprv)는 사용할 수 없습니다. 공개키(xpub)만 입력하세요.");
  if (version === XPUB_VERSION) return input.trim();
  if (!ALT_PUB_VERSIONS.has(version)) throw new Error("지원하지 않는 확장 공개키 형식입니다.");
  const out = raw.slice();
  new DataView(out.buffer).setUint32(0, XPUB_VERSION);
  return b58c.encode(out);
}

const keyCache = new Map<string, HDKey>();
function accountKey(xpub: string): HDKey {
  let k = keyCache.get(xpub);
  if (!k) {
    k = HDKey.fromExtendedKey(normalizeXpub(xpub));
    if (k.privateKey) throw new Error("개인키가 포함된 키는 사용할 수 없습니다.");
    keyCache.set(xpub, k);
  }
  return k;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");

/** 압축 공개키 → 비압축(65B) 에서 앞 0x04 제거한 64B */
function uncompressed64(pub: Uint8Array) {
  return secp256k1.Point.fromBytes(pub).toBytes(false).slice(1);
}

/** EIP-55 체크섬 주소 */
export function toChecksumAddress(addr20hex: string) {
  const lower = addr20hex.toLowerCase().replace(/^0x/, "");
  const h = hex(keccak_256(new TextEncoder().encode(lower)));
  let out = "0x";
  for (let i = 0; i < lower.length; i++) out += parseInt(h[i], 16) >= 8 ? lower[i].toUpperCase() : lower[i];
  return out;
}

export function pubkeyToAddress(chain: Chain, pub: Uint8Array): string {
  if (chain === "BTC") {
    const h160 = ripemd160(sha256(pub));
    return bech32.encode("bc", [0, ...bech32.toWords(h160)]);
  }
  const h = keccak_256(uncompressed64(pub)).slice(-20);
  if (chain === "ETH") return toChecksumAddress(hex(h));
  const payload = new Uint8Array(21);
  payload[0] = 0x41;
  payload.set(h, 1);
  return b58c.encode(payload);
}

/** 계정 xpub 에서 0/index 주소 파생 */
export function deriveAddress(chain: Chain, xpub: string, index: number): string {
  if (!Number.isInteger(index) || index < 0 || index >= 0x80000000) throw new Error("잘못된 주소 인덱스입니다.");
  const child = accountKey(xpub).deriveChild(0).deriveChild(index);
  if (!child.publicKey) throw new Error("공개키 파생 실패");
  return pubkeyToAddress(chain, child.publicKey);
}

/** xpub 형식 검사 (관리자 설정 화면용) */
export function validateXpub(xpub: string | undefined | null): string | null {
  if (!xpub) return "미설정";
  try {
    accountKey(xpub);
    return null;
  } catch (e) {
    return (e as Error).message || "형식 오류";
  }
}

/* ───────── 출금 주소 형식 검사 ───────── */

export function isValidBtcAddress(a: string) {
  try {
    if (/^(bc1)/i.test(a)) {
      const lower = a.toLowerCase();
      if (a !== lower && a !== a.toUpperCase()) return false;
      const isTaproot = lower.startsWith("bc1p");
      const dec = (isTaproot ? bech32m : bech32).decode(lower as `${string}1${string}`);
      return dec.prefix === "bc";
    }
    if (/^[13]/.test(a)) {
      const raw = b58c.decode(a);
      return raw.length === 21 && (raw[0] === 0x00 || raw[0] === 0x05);
    }
    return false;
  } catch {
    return false;
  }
}

export function isValidEthAddress(a: string) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return false;
  const body = a.slice(2);
  if (body === body.toLowerCase() || body === body.toUpperCase()) return true; // 체크섬 없는 형식 허용
  return toChecksumAddress(body) === a;
}

export function isValidTronAddress(a: string) {
  try {
    if (!/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return false;
    const raw = b58c.decode(a);
    return raw.length === 21 && raw[0] === 0x41;
  } catch {
    return false;
  }
}
