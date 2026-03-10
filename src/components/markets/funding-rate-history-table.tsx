'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatRate, formatAnnualizedRate } from '@/lib/utils/formatting'

interface HistoryRow {
  timestamp: number
  spread: number
  venues: Record<string, number>
}

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const PERIODS = [
  { label: '6h', hours: 6 },
  { label: '24h', hours: 24 },
  { label: '7d', hours: 168 },
] as const

interface FundingRateHistoryTableProps {
  tokenSymbol: string
}

export function FundingRateHistoryTable({ tokenSymbol }: FundingRateHistoryTableProps) {
  const [period, setPeriod] = useState<(typeof PERIODS)[number]>(PERIODS[1])
  const { data, isLoading } = useSWR<HistoryRow[]>(
    `/api/funding-rates/history?token=${encodeURIComponent(tokenSymbol)}&hours=${period.hours}`,
    fetcher,
    { refreshInterval: 30000 }
  )

  const rows = data ?? []
  const venueNames = rows.length > 0
    ? Object.keys(rows[0].venues).filter((v) => v !== 'GMX Long' && v !== 'GMX Short')
    : []

  const formatTime = (unix: number) => {
    const d = new Date(unix * 1000)
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    })
  }

  const rateColor = (rate: number) => {
    if (rate > 0) return '#22c55e'
    if (rate < 0) return '#FF3B45'
    return '#666'
  }

  return (
    <Card
      title="Funding Rates History"
      subtitle={`${tokenSymbol} · Historical rate snapshots (UTC)`}
      headerRight={
        <div className="flex items-center gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.label}
              onClick={() => setPeriod(p)}
              className="px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all duration-150"
              style={{
                background: period.label === p.label ? 'rgba(255,59,69,0.12)' : 'transparent',
                color: period.label === p.label ? '#FF3B45' : '#666',
                border: period.label === p.label ? '1px solid rgba(255,59,69,0.2)' : '1px solid transparent',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      }
    >
      {isLoading ? (
        <TableSkeleton rows={10} />
      ) : rows.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-sm" style={{ color: '#a0a0a0' }}>
          No historical data yet. Data accumulates as the cron runs.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                <th className="text-left py-2 px-2 font-semibold" style={{ color: '#a0a0a0' }}>#</th>
                <th className="text-left py-2 px-2 font-semibold" style={{ color: '#a0a0a0' }}>Date</th>
                <th className="text-right py-2 px-2 font-semibold" style={{ color: '#a0a0a0' }}>Spread</th>
                <th className="text-right py-2 px-2 font-semibold" style={{ color: '#a0a0a0' }}>GMX Long</th>
                <th className="text-right py-2 px-2 font-semibold" style={{ color: '#a0a0a0' }}>GMX Short</th>
                {venueNames.map((v) => (
                  <th key={v} className="text-right py-2 px-2 font-semibold" style={{ color: '#a0a0a0' }}>
                    {v}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr
                  key={row.timestamp}
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  className="hover:bg-white/[0.02] transition-colors"
                >
                  <td className="py-2 px-2 font-mono" style={{ color: '#555' }}>{i + 1}</td>
                  <td className="py-2 px-2 font-mono whitespace-nowrap" style={{ color: '#c0c0c0' }}>
                    {formatTime(row.timestamp)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-semibold" style={{ color: '#22c55e' }}>
                    +{formatAnnualizedRate(row.spread)}
                  </td>
                  <td className="py-2 px-2 text-right font-mono" style={{ color: rateColor(row.venues['GMX Long'] ?? 0) }}>
                    {formatRate(row.venues['GMX Long'])}
                  </td>
                  <td className="py-2 px-2 text-right font-mono" style={{ color: rateColor(row.venues['GMX Short'] ?? 0) }}>
                    {formatRate(row.venues['GMX Short'])}
                  </td>
                  {venueNames.map((v) => (
                    <td key={v} className="py-2 px-2 text-right font-mono" style={{ color: rateColor(row.venues[v] ?? 0) }}>
                      {row.venues[v] != null ? formatRate(row.venues[v]) : '--'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}
