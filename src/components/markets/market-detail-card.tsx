'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FundingRateWithComparison } from '@/lib/hooks/use-funding-rates'
import { formatRate, formatUsd, formatAnnualizedRate } from '@/lib/utils/formatting'

interface MarketDetailCardProps {
  market: FundingRateWithComparison | null
}

export function MarketDetailCard({ market }: MarketDetailCardProps) {
  if (!market) {
    return (
      <Card className="flex items-center justify-center min-h-[240px]">
        <p className="text-sm" style={{ color: '#a0a0a0' }}>Select a market to view details</p>
      </Card>
    )
  }

  const totalOI = market.openInterestLong + market.openInterestShort
  const longPct = totalOI > 0 ? (market.openInterestLong / totalOI) * 100 : 50

  const rateColor = (rate: number) => rate >= 0 ? '#22c55e' : '#FF3B45'

  return (
    <Card
      title={market.tokenSymbol}
      subtitle={market.marketName}
      headerRight={
        <Badge variant="green" pulse>
          Live
        </Badge>
      }
    >
      <div className="space-y-5">
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#a0a0a0' }}>
            Venue Rates
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#c0c0c0' }}>GMX Long</span>
              <span className="font-mono font-semibold" style={{ color: rateColor(market.fundingRateLong) }}>
                {formatRate(market.fundingRateLong)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#c0c0c0' }}>GMX Short</span>
              <span className="font-mono font-semibold" style={{ color: rateColor(market.fundingRateShort) }}>
                {formatRate(market.fundingRateShort)}
              </span>
            </div>
            {market.venueComparison.venues.map((v) => (
              <div key={v.name} className="flex items-center justify-between text-sm">
                <span style={{ color: '#c0c0c0' }}>
                  {v.name}
                  {v.isSimulated && (
                    <span className="text-[10px] ml-1" style={{ color: '#a0a0a0' }}>(sim)</span>
                  )}
                </span>
                <span className="font-mono font-semibold" style={{ color: rateColor(v.fundingRate) }}>
                  {formatRate(v.fundingRate)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#a0a0a0' }}>
            Spread
          </h4>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#c0c0c0' }}>Max APR (Ann.)</span>
              <span className="font-mono font-bold" style={{ color: '#FF3B45' }}>
                {formatAnnualizedRate(market.venueComparison.maxSpread)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span style={{ color: '#c0c0c0' }}>Best Pair</span>
              <span className="font-mono text-xs" style={{ color: '#FFFFFF' }}>
                {market.venueComparison.bestLong}
                <span style={{ color: '#555555', margin: '0 4px' }}>→</span>
                {market.venueComparison.bestShort}
              </span>
            </div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#a0a0a0' }}>
            Open Interest
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono" style={{ color: '#22c55e' }}>L {formatUsd(market.openInterestLong)}</span>
              <span className="font-mono" style={{ color: '#FF3B45' }}>S {formatUsd(market.openInterestShort)}</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${longPct}%`,
                  background: 'linear-gradient(90deg, #22c55e 0%, rgba(34,197,94,0.6) 100%)',
                }}
              />
            </div>
            <p className="text-xs text-center" style={{ color: '#a0a0a0' }}>
              Total: {formatUsd(totalOI)}
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}
