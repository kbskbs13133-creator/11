// 사용법: (이 폴더에서) npm i @scure/bip39 @scure/bip32 @scure/base @noble/hashes @noble/curves esbuild && node build.mjs
// 결과: ../wallet-setup.html (단일 파일, 외부 요청 없음)
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
const r = await build({ entryPoints: [new URL("./app.mjs", import.meta.url).pathname], bundle: true, minify: true, format: "iife", write: false, target: "es2020" });
const js = r.outputFiles[0].text.replace(/<\/script/gi, "<\\/script");
const html = readFileSync(new URL("./template.html", import.meta.url), "utf8").replace("/*__BUNDLE__*/", () => js);
writeFileSync(new URL("../wallet-setup.html", import.meta.url), html);
console.log("wallet-setup.html", html.length, "bytes");
