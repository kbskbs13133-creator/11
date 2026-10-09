import { formatAmount, formatRate, termLabel } from "@/lib/format";
import { centsToString, dailyInterestCents, expectedInterestCents, rate4ToString, toRate4 } from "@/lib/clientMath";

type Rate = { termDays: number; rate: string };

/**
 * 상품의 기간별 이율/이자 테이블
 * - exampleAmount 기준 만기 총이자, 일일 이자 예시를 함께 표시
 * - vipBonus 가 주어지면 VIP 추가이율이 적용된 총이율도 표시
 */
export default function RateTable({
  rates,
  vipBonus,
  exampleAmount = 1_000_000,
}: {
  rates: Rate[];
  vipBonus?: string;
  exampleAmount?: number;
}) {
  const showVip = vipBonus !== undefined && Number(vipBonus) > 0;
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full whitespace-nowrap text-sm">
        <thead className="bg-slate-50 text-xs text-slate-500">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">기간</th>
            <th className="px-3 py-2 text-right font-semibold">기간 이율</th>
            {showVip && <th className="px-3 py-2 text-right font-semibold">내 적용 이율</th>}
            <th className="px-3 py-2 text-right font-semibold">{formatAmount(String(exampleAmount))} 예치 시 만기 이자</th>
            <th className="px-3 py-2 text-right font-semibold">일 이자</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rates.map((r) => {
            const total4 = toRate4(r.rate) + (showVip ? toRate4(vipBonus!) : 0n);
            const total = rate4ToString(total4);
            const interest = expectedInterestCents(BigInt(exampleAmount) * 100n, total4);
            const daily = dailyInterestCents(interest, r.termDays);
            return (
              <tr key={r.termDays}>
                <td className="px-3 py-2 font-medium">
                  {termLabel(r.termDays)} <span className="text-xs text-slate-400">({r.termDays}일)</span>
                </td>
                <td className="px-3 py-2 text-right">{formatRate(r.rate)}</td>
                {showVip && (
                  <td className="px-3 py-2 text-right font-semibold text-brand-600">
                    {formatRate(total)}
                    <span className="ml-1 text-[11px] font-normal text-slate-400">(+{formatRate(vipBonus!)})</span>
                  </td>
                )}
                <td className="px-3 py-2 text-right font-semibold text-emerald-600">+{formatAmount(centsToString(interest))}</td>
                <td className="px-3 py-2 text-right text-slate-600">{formatAmount(centsToString(daily))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
