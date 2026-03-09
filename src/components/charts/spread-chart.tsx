'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { formatRate, formatAnnualizedRate } from '@/lib/utils/formatting'

interface SpreadPoint {
  tokenSymbol: string
  spread: number
  estimatedApr: number
  longVenue?: string
  shortVenue?: string
}

interface SpreadChartProps {
  data: SpreadPoint[]
}

const BRAND_RED   = '#FF3B45'
const BRAND_GREEN = '#22c55e'

export function SpreadChart({ data }: SpreadChartProps) {
  const sorted = [...data].sort((a, b) => b.spread - a.spread)

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, sorted.length * 36 + 40)}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 16, bottom: 4, left: 0 }}
      >
        <CartesianGrid
          horizontal={false}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="4 4"
        />

        <XAxis
          type="number"
          domain={[0, 1]}
          tickFormatter={(v: number) => formatRate(v)}
          tick={{ fill: '#666666', fontSize: 10, fontFamily: 'sans-serif' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="tokenSymbol"
          tick={{ fill: '#CCCCCC', fontSize: 11, fontWeight: 600, fontFamily: 'sans-serif' }}
          axisLine={false}
          tickLine={false}
          width={48}
        />

        <ReferenceLine
          x={0.0001}
          stroke="rgba(245,158,11,0.3)"
          strokeDasharray="4 2"
          label={{
            value: 'Min',
            fill: 'rgba(245,158,11,0.45)',
            fontSize: 10,
            position: 'top',
          }}
        />

        <Tooltip
          cursor={{ fill: 'rgba(255,255,255,0.02)' }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null
            const item = payload[0].payload as SpreadPoint
            const isPositive = item.spread > 0
            return (
              <div
                style={{
                  background: 'rgba(8, 8, 8, 0.88)',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  padding: '10px 14px',
                  minWidth: 148,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                }}
              >
                <p
                  style={{
                    fontWeight: 700,
                    marginBottom: 4,
                    color: '#FFFFFF',
                    fontSize: 13,
                    fontFamily: 'sans-serif',
                  }}
                >
                  {item.tokenSymbol}
                </p>
                {item.longVenue && item.shortVenue && (
                  <p style={{ color: '#666666', fontSize: 10, marginBottom: 8, fontFamily: 'monospace' }}>
                    {item.longVenue} → {item.shortVenue}
                  </p>
                )}
                <p style={{ color: '#444444', fontSize: 11, marginBottom: 4 }}>
                  Spread{' '}
                  <span
                    style={{
                      color: isPositive ? BRAND_RED : '#a0a0a0',
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {formatRate(item.spread)}
                  </span>
                </p>
                <p style={{ color: '#444444', fontSize: 11 }}>
                  Est. APR{' '}
                  <span
                    style={{
                      color: BRAND_GREEN,
                      fontFamily: 'monospace',
                      fontWeight: 600,
                    }}
                  >
                    {formatAnnualizedRate(item.estimatedApr)}
                  </span>
                </p>
              </div>
            )
          }}
        />

        <Bar dataKey="spread" radius={[0, 6, 6, 0]} barSize={16}>
          {sorted.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.spread > 0 ? BRAND_RED : `${BRAND_RED}40`}
              fillOpacity={entry.spread > 0 ? 0.85 : 0.35}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
