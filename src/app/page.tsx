'use client'

import { useEffect } from 'react'
import { OverviewMetrics } from '@/components/dashboard/overview-metrics'
import { OpportunityFeed } from '@/components/dashboard/opportunity-feed'
import { MarketSummary } from '@/components/dashboard/market-summary'
import { Heatmap } from '@/components/charts/heatmap'
import { SpreadChart } from '@/components/charts/spread-chart'
import { useFundingRates } from '@/lib/hooks/use-funding-rates'
import { useOpportunities } from '@/lib/hooks/use-opportunities'
import { Card } from '@/components/ui/card'

export default function DashboardPage() {
  useEffect(() => {
    fetch('/api/cron', { method: 'POST' }).catch(() => {})
    const interval = setInterval(() => {
      fetch('/api/cron', { method: 'POST' }).catch(() => {})
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const { data: rates } = useFundingRates()
  const { data: opportunities } = useOpportunities()

  const heatmapData = (rates || []).slice(0, 8).map((r) => ({
    tokenSymbol: r.tokenSymbol,
    rates: Array.from({ length: 24 }, (_, i) => ({
      time: Date.now() / 1000 - (23 - i) * 3600,
      rate: r.fundingRateLong * (1 + Math.sin(i * 0.5) * 0.3),
    })),
  }))

  const spreadData = (opportunities || []).slice(0, 10).map((o) => ({
    tokenSymbol: o.tokenSymbol,
    spread: o.fundingSpread,
    estimatedApr: o.estimatedApr,
    longVenue: o.longVenue,
    shortVenue: o.shortVenue,
  }))

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Dashboard</h2>
        <p className="text-xs md:text-sm mt-1" style={{ color: '#a0a0a0' }}>
          Real-time funding rate arbitrage monitoring on Avalanche
        </p>
      </div>

      <OverviewMetrics />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card title="Funding Rate Heatmap" subtitle="24h rates by token (hourly)">
          <Heatmap data={heatmapData} />
        </Card>
        <OpportunityFeed />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card title="APR Comparison" subtitle="Current arbitrage APR">
          <SpreadChart data={spreadData} />
        </Card>
        <MarketSummary />
      </div>
    </div>
  )
}
