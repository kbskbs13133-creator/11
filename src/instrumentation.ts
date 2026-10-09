/**
 * Next.js instrumentation hook (서버 시작 시 1회 실행)
 * Node 런타임에서만 node-cron 스케줄러를 등록한다. (Edge 번들에서 제외되도록 조건부 import)
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation-node");
  }
}
