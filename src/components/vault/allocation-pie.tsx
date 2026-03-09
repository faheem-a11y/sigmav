'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card } from '@/components/ui/card'
import { ChartSkeleton } from '@/components/ui/skeleton'
import { useVault } from '@/lib/hooks/use-vault'
import { formatUsd } from '@/lib/utils/formatting'

const PIE_COLORS = [
  '#FF3B45',
  '#f59e0b',
  '#60a5fa',
  '#a78bfa',
  '#34d399',
  '#fb923c',
  '#e879f9',
  '#22d3ee',
]

interface AllocationEntry {
  name: string
  value: number
}

export function AllocationPie() {
  const { data: vault, isLoading } = useVault()

  const positions = vault?.positions?.filter((p) => p.status === 'open') ?? []

  const allocationMap = new Map<string, number>()
  for (const pos of positions) {
    const current = allocationMap.get(pos.tokenSymbol) ?? 0
    allocationMap.set(pos.tokenSymbol, current + pos.positionSizeUsd)
  }

  if (vault && vault.cashBalance > 0) {
    allocationMap.set('Cash', vault.cashBalance)
  }

  const data: AllocationEntry[] = Array.from(allocationMap.entries()).map(
    ([name, value]) => ({ name, value })
  )

  return (
    <Card title="Allocation" subtitle="Portfolio breakdown by token">
      {isLoading ? (
        <ChartSkeleton />
      ) : !data.length ? (
        <div className="flex items-center justify-center h-64 text-sm" style={{ color: '#a0a0a0' }}>
          No allocations to display
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={3}
              dataKey="value"
              nameKey="name"
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const item = payload[0]
                return (
                  <div style={{
                    background: 'linear-gradient(180deg, #1E1E1E 0%, #161616 100%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontSize: 12,
                    color: '#FFFFFF',
                    boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
                  }}>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>{item.name}</p>
                    <p style={{ color: String(item.color), fontFamily: 'monospace' }}>
                      {formatUsd(Number(item.value))}
                    </p>
                  </div>
                )
              }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              formatter={(value: string) => (
                <span style={{ fontSize: 11, color: '#828282' }}>{value}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}
