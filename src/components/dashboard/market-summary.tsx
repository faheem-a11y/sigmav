'use client'

import { Card } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useFundingRates } from '@/lib/hooks/use-funding-rates'
import { formatRate, formatUsd } from '@/lib/utils/formatting'

export function MarketSummary() {
  const { data: rates, isLoading } = useFundingRates()

  const top5 = rates
    ? [...rates]
        .sort(
          (a, b) =>
            Math.abs(b.fundingRateLong) - Math.abs(a.fundingRateLong)
        )
        .slice(0, 5)
    : []

  return (
    <Card title="Market Summary" subtitle="Top 5 by funding rate">
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : !top5.length ? (
        <p className="text-sm text-center py-6" style={{ color: '#a0a0a0' }}>
          No market data
        </p>
      ) : (
        <div className="space-y-4">
          {top5.map((m) => {
            const totalOI = m.openInterestLong + m.openInterestShort
            const longPct = totalOI > 0 ? (m.openInterestLong / totalOI) * 100 : 50

            return (
              <div key={m.marketToken} className="flex items-center gap-3">
                <span className="text-sm font-bold w-14 shrink-0" style={{ color: '#FFFFFF' }}>
                  {m.tokenSymbol}
                </span>
                <span className="text-xs font-mono w-20 text-right shrink-0 font-semibold" style={{ color: '#FFFFFF' }}>
                  {formatRate(m.fundingRateLong)}
                </span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${longPct}%`,
                      background: 'linear-gradient(90deg, var(--brand) 0%, rgba(255,59,69,0.5) 100%)',
                    }}
                  />
                </div>
                <span className="text-xs font-mono w-16 text-right shrink-0" style={{ color: '#FFFFFF' }}>
                  {formatUsd(totalOI)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
