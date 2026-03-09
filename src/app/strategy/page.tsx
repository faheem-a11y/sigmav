'use client'

import { StrategyConfig } from '@/components/strategy/strategy-config'
import { SignalLog } from '@/components/strategy/signal-log'
import { Card } from '@/components/ui/card'

export default function StrategyPage() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-bold tracking-tight" style={{ color: '#FFFFFF' }}>Strategy</h2>
        <p className="text-xs md:text-sm mt-1" style={{ color: '#555555' }}>Configure arbitrage parameters & view signal history</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <StrategyConfig />
        <div className="space-y-4 md:space-y-6">
          <SignalLog />
          <Card title="Backtest Summary" subtitle="Historical strategy performance">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-2xl font-bold font-mono" style={{ color: '#22c55e' }}>67.3%</p>
                <p className="text-xs mt-1" style={{ color: '#555555' }}>Win Rate</p>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-2xl font-bold font-mono" style={{ color: '#22c55e' }}>1.84</p>
                <p className="text-xs mt-1" style={{ color: '#555555' }}>Sharpe Ratio</p>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-2xl font-bold font-mono" style={{ color: '#22c55e' }}>+12.4%</p>
                <p className="text-xs mt-1" style={{ color: '#555555' }}>Avg Return</p>
              </div>
              <div className="text-center p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <p className="text-2xl font-bold font-mono" style={{ color: '#FF3B45' }}>-3.2%</p>
                <p className="text-xs mt-1" style={{ color: '#555555' }}>Max Drawdown</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
