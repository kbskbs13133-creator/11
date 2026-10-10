// D.C Asset 오프라인 지갑 설정 도구 (소스) — build.mjs 로 단일 HTML 파일에 번들됨
import { generateMnemonic, validateMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { HDKey } from "@scure/bip32";
import { bech32, createBase58check } from "@scure/base";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { ripemd160 } from "@noble/hashes/legacy.js";

const b58c = createBase58check(sha256);
const hex = (b) => Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
const PATHS = { BTC: "m/84'/0'/0'", ETH: "m/44'/60'/0'", TRON: "m/44'/195'/0'" };

function checksum(addrHex) {
  const h = hex(keccak_256(new TextEncoder().encode(addrHex)));
  let o = "0x";
  for (let i = 0; i < addrHex.length; i++) o += parseInt(h[i], 16) >= 8 ? addrHex[i].toUpperCase() : addrHex[i];
  return o;
}
function addr(chain, pub) {
  if (chain === "BTC") return bech32.encode("bc", [0, ...bech32.toWords(ripemd160(sha256(pub)))]);
  const h = keccak_256(secp256k1.Point.fromBytes(pub).toBytes(false).slice(1)).slice(-20);
  if (chain === "ETH") return checksum(hex(h));
  const p = new Uint8Array(21);
  p[0] = 0x41;
  p.set(h, 1);
  return b58c.encode(p);
}

const $ = (id) => document.getElementById(id);
const norm = (s) => s.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");

function render(mnemonic, passphrase) {
  const seed = mnemonicToSeedSync(mnemonic, passphrase);
  const root = HDKey.fromMasterSeed(seed);
  const out = {};
  for (const [chain, path] of Object.entries(PATHS)) {
    const acct = root.derive(path);
    const addrs = [0, 1, 2].map((i) => addr(chain, acct.deriveChild(0).deriveChild(i).publicKey));
    out[chain] = { xpub: acct.publicExtendedKey, addrs };
  }
  seed.fill(0);

  $("words").innerHTML = mnemonic
    .split(" ")
    .map((w, i) => `<li><span>${i + 1}</span>${w}</li>`)
    .join("");
  const env = `CRYPTO_XPUB_BTC=${out.BTC.xpub}\nCRYPTO_XPUB_ETH=${out.ETH.xpub}\nCRYPTO_XPUB_TRON=${out.TRON.xpub}`;
  $("env").textContent = env;
  const label = { BTC: "BTC (bc1…)", ETH: "ETH · USDT-ERC20 (0x…)", TRON: "USDT-TRC20 (T…)" };
  $("addrs").innerHTML = Object.entries(out)
    .map(
      ([c, v]) =>
        `<div class="addr"><b>${label[c]}</b><small>${PATHS[c]}/0/i</small>` +
        v.addrs.map((a, i) => `<div><span>${i === 0 ? "#0 회사 메인" : "#" + i + " 회원"}</span><code>${a}</code></div>`).join("") +
        `</div>`
    )
    .join("");
  $("result").hidden = false;
  $("result").scrollIntoView({ behavior: "smooth" });
}

function showError(msg) {
  $("err").textContent = msg;
  $("err").hidden = !msg;
}

function onlineBanner() {
  $("online").hidden = !navigator.onLine;
}

window.addEventListener("online", onlineBanner);
window.addEventListener("offline", onlineBanner);
onlineBanner();

$("gen").addEventListener("click", () => {
  showError("");
  const m = generateMnemonic(wordlist, 256);
  $("mn").value = m;
  render(m, $("pp").value);
});
$("use").addEventListener("click", () => {
  showError("");
  const m = norm($("mn").value);
  if (!validateMnemonic(m, wordlist)) return showError("올바른 BIP-39 복구 단어가 아닙니다. (12/24단어, 철자·순서 확인)");
  $("mn").value = m;
  render(m, $("pp").value);
});
$("copy").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("env").textContent);
    $("copy").textContent = "복사됨 ✓";
    setTimeout(() => ($("copy").textContent = "환경변수 복사"), 1500);
  } catch {
    const r = document.createRange();
    r.selectNodeContents($("env"));
    getSelection().removeAllRanges();
    getSelection().addRange(r);
  }
});
$("wipe").addEventListener("click", () => {
  $("mn").value = "";
  $("pp").value = "";
  $("words").innerHTML = "";
  $("env").textContent = "";
  $("addrs").innerHTML = "";
  $("result").hidden = true;
  showError("");
});
