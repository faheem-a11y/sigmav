'use client'

import { useState, useRef, useCallback } from 'react'
import { FundingRateMatrix } from '@/components/markets/funding-rate-matrix'
import { MarketDetailCard } from '@/components/markets/market-detail-card'
import { FundingRateChart } from '@/components/charts/funding-rate-chart'
import { type FundingRateWithComparison } from '@/lib/hooks/use-funding-rates'
import { Card } from '@/components/ui/card'

export default function MarketsPage() {
  const [selected, setSelected] = useState<FundingRateWithComparison | null>(null)
  const detailRef = useRef<HTMLDivElement>(null)

  const handleRowClick = useCallback((row: FundingRateWithComparison) => {
    setSelected(row)
    setTimeout(() => {
      detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [])

  const chartData = selected
    ? selected.venueComparison.venues.flatMap((v) =>
        Array.from({ length: 24 }, (_, i) => ({
          timestamp: Date.now() / 1000 - (23 - i) * 3600,
          rate: v.fundingRate * (1 + Math.sin(i * 0.3 + v.name.length) * 0.2),
          venue: v.name,
        }))
      )
    : []

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Markets</h2>
        <p className="text-xs md:text-sm mt-1" style={{ color: '#a0a0a0' }}>Funding rate comparison across venues</p>
      </div>

      <FundingRateMatrix onRowClick={(row) => handleRowClick(row as FundingRateWithComparison)} />

      <div ref={detailRef} className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <MarketDetailCard market={selected} />
        <Card title={selected ? `${selected.tokenSymbol} Rate History` : 'Rate History'} subtitle="24h simulated history">
          {selected ? (
            <FundingRateChart data={chartData} title={`${selected.tokenSymbol} Funding Rates`} />
          ) : (
            <div className="h-64 flex items-center justify-center text-sm" style={{ color: '#a0a0a0' }}>
              Select a market to view rate history
            </div>
          )}
        </Card>
      </div>

      {selected && (
        <Card title="Funding Rates History" subtitle="Coming Soon">
          <div className="h-32 flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium" style={{ color: '#a0a0a0' }}>
              Historical funding rate data is coming soon.
            </p>
            <p className="text-xs" style={{ color: '#555' }}>
              Tabular view of historical spreads and per-venue rates over time.
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}
