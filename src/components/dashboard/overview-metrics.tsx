'use client'

import { Wallet, BarChart3, TrendingUp } from 'lucide-react'
import { MetricCard } from '@/components/ui/metric-card'
import { MetricSkeleton } from '@/components/ui/skeleton'
import { useVault } from '@/lib/hooks/use-vault'
import { formatUsd, formatPnl } from '@/lib/utils/formatting'

export function OverviewMetrics() {
  const { data: vault, isLoading: vaultLoading } = useVault()

  if (vaultLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
    )
  }

  const pnlChange = vault && vault.totalValueUsd > 0
    ? vault.totalPnl / vault.totalValueUsd
    : 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <MetricCard
        label="Total Value"
        value={formatUsd(vault?.totalValueUsd ?? 0)}
        icon={Wallet}
      />
      <MetricCard
        label="Active Positions"
        value={String(vault?.numPositions ?? 0)}
        icon={BarChart3}
      />
      <MetricCard
        label="24h P&L"
        value={formatPnl(vault?.totalPnl ?? 0)}
        change={pnlChange}
        icon={TrendingUp}
      />
      {/* BestSpread card removed — no longer displayed */}
    </div>
  )
}
