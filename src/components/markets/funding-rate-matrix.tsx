'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { mutate } from 'swr'
import { ExternalLink, TrendingUp, TrendingDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { DataTable, type Column } from '@/components/ui/data-table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useFundingRates, type FundingRateWithComparison } from '@/lib/hooks/use-funding-rates'
import { formatRate, formatAnnualizedRate, formatPrice, formatPercentage } from '@/lib/utils/formatting'
import { getVenueTradeUrl } from '@/lib/utils/constants'
import { useNearestPayoutCountdown } from '@/lib/hooks/use-countdown'

type Row = FundingRateWithComparison & Record<string, unknown>

const BRAND_GREEN = '#1fa854'
const BRAND_RED = '#e0323c'

const TIMEFRAMES = [
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
  { label: '30d', hours: 720 },
] as const

interface FundingRateMatrixProps {
  onRowClick?: (market: FundingRateWithComparison) => void
}

function venueRate(row: FundingRateWithComparison, venueName: string) {
  const venue = row.venueComparison.venues.find((v) => v.name === venueName)
  if (!venue) return null
  return venue.fundingRate
}

function CountdownCell({ longVenue, shortVenue }: { longVenue: string; shortVenue: string }) {
  const { formatted, isImminent, venue } = useNearestPayoutCountdown(longVenue, shortVenue)
  const isContinuous = venue === null
  return (
    <div className="flex flex-col gap-0.5 items-end">
      <span
        className="font-mono text-xs font-semibold"
        style={{
          color: isContinuous ? '#555' : isImminent ? '#FF3B45' : '#c0c0c0',
          animation: isImminent ? 'pulse 1s ease-in-out infinite' : undefined,
        }}
      >
        {formatted}
      </span>
      {!isContinuous && venue && (
        <span className="text-[10px]" style={{ color: '#555' }}>
          {venue}
        </span>
      )}
    </div>
  )
}

function openDexTabs(longVenue: string, shortVenue: string, tokenSymbol: string) {
  const urls = [
    getVenueTradeUrl(longVenue, tokenSymbol),
    getVenueTradeUrl(shortVenue, tokenSymbol),
  ]
  urls.forEach((url) => window.open(url, '_blank', 'noopener,noreferrer'))
}

export function FundingRateMatrix({ onRowClick }: FundingRateMatrixProps) {
  const { data: rates, isLoading } = useFundingRates()
  const [takingToken, setTakingToken] = useState<string | null>(null)
  const [timeframe, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>(TIMEFRAMES[0])
  const router = useRouter()

  const handleTakePosition = async (row: Row) => {
    const { bestLong, bestShort, maxSpread } = row.venueComparison
    if (!bestLong || !bestShort || maxSpread <= 0) return

    openDexTabs(bestLong, bestShort, row.tokenSymbol)

    setTakingToken(row.tokenSymbol)
    try {
      const res = await fetch('/api/paper-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenSymbol: row.tokenSymbol,
          entryPrice: row.spotPrice,
          longVenue: bestLong,
          shortVenue: bestShort,
          estimatedApr: maxSpread - 0.002,
          riskScore: 50,
          positionSizeUsd: 10000,
          leverage: 1,
        }),
      })
      if (!res.ok) throw new Error('Failed to take position')
      await mutate('/api/vault')
      await mutate('/api/opportunities')
    } catch (err) {
      console.error('Take position failed:', err)
    } finally {
      setTakingToken(null)
      router.push(`/vault?highlight=${encodeURIComponent(row.tokenSymbol)}`)
    }
  }

  const columns: Column<Row>[] = [
    {
      key: 'tokenSymbol',
      label: 'Token / Markets',
      tooltip: 'Token with the recommended long and short venues for the best funding rate arbitrage.',
      sortable: true,
      render: (row) => {
        const { bestLong, bestShort } = row.venueComparison
        return (
          <div className="flex flex-col gap-0.5">
            <span className="font-bold text-sm" style={{ color: '#FFFFFF' }}>
              {row.tokenSymbol}
            </span>
            {bestLong && bestShort && (
              <span className="flex items-center gap-1" style={{ fontSize: '10px', lineHeight: 1.2 }}>
                <TrendingUp className="w-3 h-3 shrink-0" style={{ color: BRAND_GREEN }} />
                <span style={{ color: BRAND_GREEN }}>{bestLong}</span>
                <span style={{ color: 'rgba(255,255,255,0.2)', margin: '0 1px' }}>·</span>
                <TrendingDown className="w-3 h-3 shrink-0" style={{ color: BRAND_RED }} />
                <span style={{ color: BRAND_RED }}>{bestShort}</span>
              </span>
            )}
          </div>
        )
      },
    },
    {
      key: 'fundingRates',
      label: 'Funding Rates',
      tooltip: 'Hourly funding rates at the long and short venues. Green = long venue, red = short venue.',
      sortable: false,
      align: 'right',
      render: (row) => {
        const { bestLong, bestShort } = row.venueComparison
        const longRate = bestLong ? venueRate(row, bestLong) ?? (bestLong === 'GMX' ? row.fundingRateLong : null) : null
        const shortRate = bestShort ? venueRate(row, bestShort) ?? (bestShort === 'GMX' ? row.fundingRateShort : null) : null
        return (
          <div className="flex flex-col gap-0.5 font-mono text-xs">
            <span style={{ color: BRAND_GREEN }}>
              {longRate !== null ? formatRate(longRate) : '--'}
            </span>
            <span style={{ color: BRAND_RED }}>
              {shortRate !== null ? formatRate(shortRate) : '--'}
            </span>
          </div>
        )
      },
    },
    {
      key: 'countdown',
      label: 'Next Payout',
      tooltip: 'Countdown to the next funding rate payout. HyperLiquid pays every hour, Paradex every 8 hours. GMX accrues continuously.',
      sortable: false,
      mobileHidden: true,
      align: 'right',
      render: (row) => {
        const { bestLong, bestShort } = row.venueComparison
        return <CountdownCell longVenue={bestLong || 'GMX'} shortVenue={bestShort || 'GMX'} />
      },
    },
    {
      key: 'spotPrice',
      label: 'Price',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono text-xs" style={{ color: '#c0c0c0' }}>
          {formatPrice(row.spotPrice)}
        </span>
      ),
    },
    {
      key: 'maxSpread',
      label: 'Max Spread',
      tooltip: 'Annualized rate difference between the best venue pair. Bigger spread = more profit potential. Formula: |Rate_A − Rate_B| × 8,760 (hours/year).',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span className="font-mono font-bold" style={{ color: '#FF3B45' }}>
          {formatAnnualizedRate(row.venueComparison.maxSpread)}
        </span>
      ),
    },
    {
      key: 'profitPct',
      label: `% Profit (${timeframe.label})`,
      tooltip: `Projected profit % over ${timeframe.label} based on current annualized spread.`,
      sortable: true,
      align: 'right',
      render: (row) => {
        const profitPct = (row.venueComparison.maxSpread * timeframe.hours) / 8760
        return (
          <span className="font-mono font-semibold" style={{ color: BRAND_GREEN }}>
            +{formatPercentage(profitPct)}
          </span>
        )
      },
    },
    {
      key: 'action',
      label: '',
      mobileHidden: true,
      align: 'right',
      render: (row) => {
        const { bestLong, bestShort, maxSpread } = row.venueComparison
        const disabled = !bestLong || !bestShort || maxSpread <= 0 || takingToken === row.tokenSymbol
        return (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleTakePosition(row)
            }}
            disabled={disabled}
            className="flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
            style={{
              fontSize: '11px',
              fontWeight: 500,
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.18)',
              color: '#22c55e',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
            title={bestLong && bestShort ? `Long ${bestLong} · Short ${bestShort}` : 'No spread available'}
          >
            {takingToken === row.tokenSymbol ? (
              <>
                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Opening...
              </>
            ) : (
              <>
                <ExternalLink className="w-3 h-3 shrink-0" />
                Take Position
              </>
            )}
          </button>
        )
      },
    },
  ]

  return (
    <Card
      title="Funding Rate Arbitrage"
      subtitle="Live cross-venue signals · Click a row for details"
      headerRight={
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.label}
              onClick={() => setTimeframe(tf)}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all duration-150"
              style={{
                background: timeframe.label === tf.label ? 'rgba(255,59,69,0.12)' : 'transparent',
                color: timeframe.label === tf.label ? '#FF3B45' : '#666',
                border: timeframe.label === tf.label ? '1px solid rgba(255,59,69,0.2)' : '1px solid transparent',
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <DataTable
          columns={columns}
          data={(rates ?? []) as Row[]}
          onRowClick={onRowClick as ((row: Row) => void) | undefined}
          emptyMessage="No funding rate data"
          mobilePrimary={['tokenSymbol', 'maxSpread']}
        />
      )}
    </Card>
  )
}
