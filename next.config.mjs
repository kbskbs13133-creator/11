/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // src/instrumentation.ts 에서 node-cron 스케줄러를 등록하기 위해 필요 (Next 14)
    instrumentationHook: true,
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs", "node-cron"],
  },
};
export default nextConfig;
