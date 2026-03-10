'use client'

import { Banknote, PiggyBank, ArrowDownUp, Gauge } from 'lucide-react'
import { MetricCard } from '@/components/ui/metric-card'
import { MetricSkeleton } from '@/components/ui/skeleton'
import { useVault } from '@/lib/hooks/use-vault'
import { formatUsd, formatPercentage } from '@/lib/utils/formatting'

export function VaultOverview() {
  const { data: vault, isLoading } = useVault()

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <MetricSkeleton key={i} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Balance"
        value={formatUsd(vault?.cashBalance ?? 0)}
        icon={PiggyBank}
      />
      <MetricCard
        label="Volume"
        value={formatUsd(vault?.totalValueUsd ?? 0)}
        icon={Banknote}
      />
      <MetricCard
        label="Cumulative Funding"
        value={formatUsd(vault?.cumulativeFunding ?? 0)}
        icon={ArrowDownUp}
      />
      <MetricCard
        label="Utilization"
        value={formatPercentage(vault?.utilizationPct ?? 0)}
        subtitle={`${formatUsd(vault?.positionsValue ?? 0)} of ${formatUsd(vault?.totalValueUsd ?? 0)}`}
        icon={Gauge}
      />
    </div>
  )
}
