'use client'

import { useState, useMemo } from 'react'
import {
  ComposedChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { formatUsd } from '@/lib/utils/formatting'

interface VaultPoint {
  timestamp: number
  totalValueUsd: number
  cumulativeFunding: number
}

interface VaultPerformanceChartProps {
  data: VaultPoint[]
}

const TIME_RANGES = [
  { label: '1D', hours: 24 },
  { label: '1W', hours: 168 },
  { label: '1M', hours: 720 },
  { label: 'Full', hours: Infinity },
]

function formatDate(unix: number) {
  const d = new Date(unix * 1000)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const INITIAL_CAPITAL = 100_000

export function VaultPerformanceChart({ data }: VaultPerformanceChartProps) {
  const [range, setRange] = useState('Full')

  const sorted = useMemo(() => {
    const s = [...data].sort((a, b) => a.timestamp - b.timestamp)
    const sel = TIME_RANGES.find((r) => r.label === range)!
    if (!isFinite(sel.hours)) return s
    const cutoff = Date.now() / 1000 - sel.hours * 3600
    return s.filter((d) => d.timestamp >= cutoff)
  }, [data, range])

  return (
    <div>
      {/* Time range pill toggles */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 4,
          marginBottom: 14,
        }}
      >
        {TIME_RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            style={{
              fontSize: 11,
              fontWeight: range === r.label ? 600 : 400,
              padding: '4px 12px',
              borderRadius: 20,
              border: range === r.label ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
              cursor: 'pointer',
              background: range === r.label ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: range === r.label ? '#FFFFFF' : '#555555',
              transition: 'all 0.15s ease',
              letterSpacing: '0.02em',
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={sorted} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
          <defs>
            <linearGradient id="navGradientV" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF3B45" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#FF3B45" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid
            vertical={false}
            stroke="rgba(255,255,255,0.05)"
            strokeDasharray="4 4"
          />

          <XAxis
            dataKey="timestamp"
            tickFormatter={formatDate}
            tick={{ fill: '#666666', fontSize: 10, fontFamily: 'sans-serif' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={(v: number) => formatUsd(v)}
            tick={{ fill: '#666666', fontSize: 10, fontFamily: 'sans-serif' }}
            axisLine={false}
            tickLine={false}
            width={72}
            domain={['auto', 'auto']}
          />

          <ReferenceLine
            y={INITIAL_CAPITAL}
            stroke="rgba(245,158,11,0.3)"
            strokeDasharray="4 2"
            label={{
              value: 'Initial',
              fill: 'rgba(245,158,11,0.45)',
              fontSize: 10,
              position: 'right',
            }}
          />

          <Tooltip
            cursor={{ stroke: 'rgba(255,255,255,0.12)', strokeWidth: 1, strokeDasharray: '4 3' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const item = payload[0].payload as VaultPoint
              const pnl = item.totalValueUsd - INITIAL_CAPITAL
              const pct = (pnl / INITIAL_CAPITAL) * 100
              const isUp = pct >= 0
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
                      color: '#555555',
                      fontSize: 10,
                      marginBottom: 6,
                      fontFamily: 'sans-serif',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {formatDate(item.timestamp)}
                  </p>
                  <p
                    style={{
                      color: '#FFFFFF',
                      fontSize: 16,
                      fontWeight: 700,
                      fontFamily: 'monospace',
                      letterSpacing: '-0.01em',
                      marginBottom: 4,
                    }}
                  >
                    {formatUsd(item.totalValueUsd)}
                  </p>
                  <p
                    style={{
                      color: isUp ? '#22c55e' : '#FF3B45',
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {isUp ? '↑' : '↓'} {Math.abs(pct).toFixed(2)}%
                  </p>
                </div>
              )
            }}
          />

          <Area
            type="monotone"
            dataKey="totalValueUsd"
            stroke="#FF3B45"
            strokeWidth={1.5}
            fill="url(#navGradientV)"
            isAnimationActive={false}
            dot={false}
            activeDot={{
              r: 5,
              fill: '#FF3B45',
              stroke: 'rgba(255,255,255,0.85)',
              strokeWidth: 2,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
