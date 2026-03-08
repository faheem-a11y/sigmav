'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { formatRate } from '@/lib/utils/formatting'

const VENUE_COLORS = ['#FF3B45', '#f59e0b', '#60a5fa', '#a78bfa', '#34d399']

interface FundingRatePoint {
  timestamp: number
  rate: number
  venue: string
}

interface FundingRateChartProps {
  data: FundingRatePoint[]
  title: string
}

function formatTime(unix: number) {
  const d = new Date(unix * 1000)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

export function FundingRateChart({ data, title }: FundingRateChartProps) {
  const venues = [...new Set(data.map((d) => d.venue))]

  const grouped = new Map<number, Record<string, number | undefined>>()
  for (const point of data) {
    if (!grouped.has(point.timestamp)) {
      grouped.set(point.timestamp, { timestamp: point.timestamp })
    }
    grouped.get(point.timestamp)![point.venue] = point.rate
  }
  const chartData = Array.from(grouped.values()).sort(
    (a, b) => (a.timestamp as number) - (b.timestamp as number)
  )

  return (
    <div>
      {title && (
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: '#FFFFFF' }}
        >
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />

          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTime}
            tick={{ fill: '#666666', fontSize: 10, fontFamily: 'sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatRate(v)}
            tick={{ fill: '#666666', fontSize: 10, fontFamily: 'sans-serif' }}
            axisLine={false}
            tickLine={false}
            width={72}
          />

          <ReferenceLine
            y={0}
            stroke="rgba(255,255,255,0.06)"
            strokeDasharray="4 4"
          />

          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1, strokeDasharray: '4 3' }}
            content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null
              return (
                <div
                  style={{
                    background: 'rgba(8, 8, 8, 0.88)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    padding: '10px 14px',
                    minWidth: 140,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.55)',
                  }}
                >
                  <p
                    style={{
                      color: '#555555',
                      fontSize: 10,
                      marginBottom: 8,
                      fontFamily: 'sans-serif',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {formatTime(Number(label))}
                  </p>
                  {payload.map((p, i) => (
                    <p
                      key={i}
                      style={{
                        color: p.color,
                        fontFamily: 'monospace',
                        fontSize: 12,
                        fontWeight: 500,
                        marginTop: i > 0 ? 4 : 0,
                      }}
                    >
                      {p.name}:{' '}
                      <span style={{ color: '#FFFFFF' }}>
                        {formatRate(Number(p.value))}
                      </span>
                    </p>
                  ))}
                </div>
              )
            }}
          />

          <Legend
            wrapperStyle={{ fontSize: 10, color: '#555555', paddingTop: 8 }}
          />

          {venues.map((venue, i) => (
            <Line
              key={venue}
              type="monotone"
              dataKey={venue}
              stroke={VENUE_COLORS[i % VENUE_COLORS.length]}
              strokeWidth={1.5}
              dot={false}
              connectNulls
              activeDot={{
                r: 5,
                stroke: 'rgba(255,255,255,0.8)',
                strokeWidth: 2,
              }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
