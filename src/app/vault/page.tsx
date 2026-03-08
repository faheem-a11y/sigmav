'use client'

import { VaultOverview } from '@/components/vault/vault-overview'
import { PositionsTable } from '@/components/vault/positions-table'
import { RebalanceHistory } from '@/components/vault/rebalance-history'
import { AllocationPie } from '@/components/vault/allocation-pie'
import { VaultPerformanceChart } from '@/components/charts/vault-performance-chart'
import { PnlChart } from '@/components/charts/pnl-chart'
import { useVault } from '@/lib/hooks/use-vault'
import { Card } from '@/components/ui/card'

export default function VaultPage() {
  const { data: vault } = useVault()

  const perfData = (vault?.history || []).map((h) => ({
    timestamp: h.timestamp,
    totalValueUsd: h.totalValueUsd,
    cumulativeFunding: h.cumulativeFunding,
  }))

  const pnlData = (vault?.history || []).map((h) => ({
    timestamp: h.timestamp,
    pnl: h.totalPnl,
    funding: h.cumulativeFunding,
    borrowing: 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Vault</h2>
        <p className="text-sm mt-1" style={{ color: '#555555' }}>Delta-neutral vault performance & positions</p>
      </div>

      <VaultOverview />

      <Card title="Vault Performance" subtitle="NAV over time">
        <VaultPerformanceChart data={perfData} />
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Open Positions">
            <PositionsTable />
          </Card>
        </div>
        <AllocationPie />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="P&L History" subtitle="Cumulative profit & loss">
          <PnlChart data={pnlData} />
        </Card>
        <RebalanceHistory />
      </div>
    </div>
  )
}
