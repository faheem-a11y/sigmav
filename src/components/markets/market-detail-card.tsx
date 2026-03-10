'use client'

import { TrendingUp, TrendingDown, ExternalLink, Clock } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { FundingRateWithComparison } from '@/lib/hooks/use-funding-rates'
import { formatRate, formatUsd, formatAnnualizedRate, formatPrice } from '@/lib/utils/formatting'
import { getVenueTradeUrl } from '@/lib/utils/constants'
import { usePayoutCountdown } from '@/lib/hooks/use-countdown'

const BRAND_GREEN = '#1fa854'
const BRAND_RED = '#e0323c'

function VenueCountdown({ venue, align = 'left' }: { venue: string; align?: 'left' | 'right' }) {
  const { formatted, isImminent } = usePayoutCountdown(venue)
  const isContinuous = venue === 'GMX'
  return (
    <div className={align === 'right' ? 'text-right' : ''}>
      <p className="text-[10px]" style={{ color: '#666' }}>
        <Clock className="w-3 h-3 inline-block mr-0.5 -mt-0.5" style={{ color: '#555' }} />
        Countdown
      </p>
      <p
        className="font-mono text-sm font-bold"
        style={{
          color: isContinuous ? '#555' : isImminent ? '#FF3B45' : '#c0c0c0',
          animation: isImminent ? 'pulse 1s ease-in-out infinite' : undefined,
        }}
      >
        {formatted}
      </p>
    </div>
  )
}

interface MarketDetailCardProps {
  market: FundingRateWithComparison | null
}

function venueRate(market: FundingRateWithComparison, venueName: string): number | null {
  const venue = market.venueComparison.venues.find((v) => v.name === venueName)
  if (venue) return venue.fundingRate
  // GMX rates are on the market object directly
  if (venueName === 'GMX') return market.fundingRateLong
  return null
}

export function MarketDetailCard({ market }: MarketDetailCardProps) {
  if (!market) {
    return (
      <Card className="flex items-center justify-center min-h-[240px]">
        <p className="text-sm" style={{ color: '#a0a0a0' }}>Select a market to view details</p>
      </Card>
    )
  }

  const { bestLong, bestShort, maxSpread } = market.venueComparison
  const totalOI = market.openInterestLong + market.openInterestShort
  const longPct = totalOI > 0 ? (market.openInterestLong / totalOI) * 100 : 50

  const longRate = bestLong ? venueRate(market, bestLong) : null
  const shortRate = bestShort ? venueRate(market, bestShort) : null
  // For GMX short side
  const shortRateValue = bestShort === 'GMX' ? market.fundingRateShort : shortRate

  const rateColor = (rate: number) => rate >= 0 ? '#22c55e' : '#FF3B45'

  return (
    <Card>
      <div className="space-y-5">
        {/* Header */}
        <div className="text-center">
          <h3 className="text-xl font-bold" style={{ color: '#FFFFFF' }}>
            {market.tokenSymbol}
          </h3>
          <div className="flex items-center justify-center gap-2 mt-1.5">
            <span
              className="text-[11px] px-3 py-1 rounded-full font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#a0a0a0',
              }}
            >
              {bestLong} (LONG) → {bestShort} (SHORT)
            </span>
            <Badge variant="green" pulse>Live</Badge>
          </div>
          <p className="text-xs mt-1.5 font-mono" style={{ color: '#666' }}>
            {market.marketName} · {formatPrice(market.spotPrice)}
          </p>
        </div>

        {/* Long / Profit / Short panels */}
        <div className="grid grid-cols-3 gap-2">
          {/* LONG panel */}
          <div
            className="rounded-lg p-3"
            style={{
              background: 'rgba(31,168,84,0.04)',
              border: '1px solid rgba(31,168,84,0.15)',
            }}
          >
            <div className="flex items-center gap-1 mb-3">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: BRAND_GREEN }} />
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BRAND_GREEN }}>
                Long
              </span>
            </div>
            <p className="text-xs font-semibold mb-1" style={{ color: '#FFFFFF' }}>
              {bestLong || '--'}
            </p>
            <div className="space-y-2 mt-3">
              <div>
                <p className="text-[10px]" style={{ color: '#666' }}>Funding Rate</p>
                <p className="font-mono text-sm font-bold" style={{ color: BRAND_GREEN }}>
                  {longRate !== null ? formatRate(longRate) : '--'}
                </p>
              </div>
              <VenueCountdown venue={bestLong || 'GMX'} />
            </div>
            {bestLong && (
              <a
                href={getVenueTradeUrl(bestLong, market.tokenSymbol)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-3 text-[10px] font-medium transition-opacity hover:opacity-80"
                style={{ color: BRAND_GREEN }}
              >
                <ExternalLink className="w-3 h-3" />
                Open on {bestLong}
              </a>
            )}
          </div>

          {/* Center profit */}
          <div className="flex flex-col items-center justify-center text-center">
            <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: '#666' }}>
              Expected Profit
            </p>
            <p
              className="text-2xl font-bold font-mono"
              style={{ color: maxSpread > 0 ? BRAND_GREEN : '#666' }}
            >
              +{formatAnnualizedRate(maxSpread)}
            </p>
            <p className="text-[10px] mt-0.5" style={{ color: '#555' }}>
              annualized
            </p>
          </div>

          {/* SHORT panel */}
          <div
            className="rounded-lg p-3"
            style={{
              background: 'rgba(224,50,60,0.04)',
              border: '1px solid rgba(224,50,60,0.15)',
            }}
          >
            <div className="flex items-center gap-1 mb-3 justify-end">
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: BRAND_RED }}>
                Short
              </span>
              <TrendingDown className="w-3.5 h-3.5" style={{ color: BRAND_RED }} />
            </div>
            <p className="text-xs font-semibold mb-1 text-right" style={{ color: '#FFFFFF' }}>
              {bestShort || '--'}
            </p>
            <div className="space-y-2 mt-3">
              <div className="text-right">
                <p className="text-[10px]" style={{ color: '#666' }}>Funding Rate</p>
                <p className="font-mono text-sm font-bold" style={{ color: BRAND_RED }}>
                  {shortRateValue !== null ? formatRate(shortRateValue) : '--'}
                </p>
              </div>
              <VenueCountdown venue={bestShort || 'GMX'} align="right" />
            </div>
            {bestShort && (
              <a
                href={getVenueTradeUrl(bestShort, market.tokenSymbol)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 mt-3 text-[10px] font-medium transition-opacity hover:opacity-80 justify-end"
                style={{ color: BRAND_RED }}
              >
                Open on {bestShort}
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>

        {/* All Venue Rates */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
          <h4 className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#a0a0a0' }}>
            All Venue Rates
          </h4>
          <div className="space-y-2">
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
            {market.venueComparison.venues
              .filter((v) => v.name !== 'GMX')
              .map((v) => (
              <div key={v.name} className="flex items-center justify-between text-sm">
                <span style={{ color: '#c0c0c0' }}>{v.name}</span>
                <span className="font-mono font-semibold" style={{ color: rateColor(v.fundingRate) }}>
                  {formatRate(v.fundingRate)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Open Interest */}
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
