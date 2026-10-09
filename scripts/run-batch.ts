// CLI 수동 실행: npm run batch:run [-- YYYY-MM-DD]
// 외부 crontab 에서 직접 호출하는 용도로도 사용 가능
import { runDailyBatch } from "../src/lib/batch";
import { parseDateOnly } from "../src/lib/date";
import { prisma } from "../src/lib/prisma";

const arg = process.argv[2];
runDailyBatch({ trigger: "MANUAL", targetDate: arg ? parseDateOnly(arg) : undefined })
  .then((r) => console.log(JSON.stringify(r, null, 2)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
