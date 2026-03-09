'use client'

import { StrategyConfig } from '@/components/strategy/strategy-config'
import { SignalLog } from '@/components/strategy/signal-log'

export default function StrategyPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Strategy</h2>
        <p className="text-xs md:text-sm mt-1" style={{ color: '#a0a0a0' }}>Configure arbitrage parameters & view signal history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <StrategyConfig />
        <SignalLog />
      </div>
    </div>
  )
}
