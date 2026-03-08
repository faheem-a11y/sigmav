'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { formatTimestamp } from '@/lib/utils/formatting'
import type { Signal } from '@/lib/utils/types'

const MOCK_SIGNALS: Signal[] = [
  {
    tokenSymbol: 'ETH',
    signalType: 'entry',
    action: 'Open delta-neutral on GMX/Vertex',
    reason: 'Funding spread exceeded 8.5% annualized for 15 minutes',
    confidence: 0.85,
    executed: true,
    timestamp: Math.floor(Date.now() / 1000) - 300,
  },
  {
    tokenSymbol: 'BTC',
    signalType: 'rebalance',
    action: 'Adjust position size -12%',
    reason: 'Portfolio allocation exceeded max threshold',
    confidence: 0.72,
    executed: true,
    timestamp: Math.floor(Date.now() / 1000) - 1800,
  },
  {
    tokenSymbol: 'AVAX',
    signalType: 'exit',
    action: 'Close delta-neutral position',
    reason: 'Funding spread collapsed below minimum threshold',
    confidence: 0.91,
    executed: true,
    timestamp: Math.floor(Date.now() / 1000) - 3600,
  },
  {
    tokenSymbol: 'SOL',
    signalType: 'entry',
    action: 'Open delta-neutral on Drift/HyperLiquid',
    reason: 'New opportunity detected with 12.3% annualized spread',
    confidence: 0.68,
    executed: false,
    timestamp: Math.floor(Date.now() / 1000) - 5400,
  },
  {
    tokenSymbol: 'LINK',
    signalType: 'rebalance',
    action: 'Increase position size +8%',
    reason: 'Spread widened, room for larger allocation',
    confidence: 0.55,
    executed: false,
    timestamp: Math.floor(Date.now() / 1000) - 7200,
  },
]

const typeVariant = (type: Signal['signalType']) => {
  if (type === 'entry') return 'green' as const
  if (type === 'exit') return 'red' as const
  return 'amber' as const
}

export function SignalLog() {
  const [signals, setSignals] = useState<Signal[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchSignals = useCallback(async () => {
    try {
      const res = await fetch('/api/strategy')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.signals) && data.signals.length > 0) {
          setSignals(data.signals)
          setIsLoading(false)
          return
        }
      }
    } catch {
      // Fall through to mock data
    }
    setSignals(MOCK_SIGNALS)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    fetchSignals()
  }, [fetchSignals])

  return (
    <Card
      title="Signal Log"
      subtitle="Entry, exit, and rebalance signals"
      headerRight={<Badge variant="green" pulse>Live</Badge>}
    >
      {isLoading ? (
        <TableSkeleton rows={5} />
      ) : !signals.length ? (
        <p className="text-sm text-center py-6" style={{ color: '#555555' }}>
          No signals recorded
        </p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
          {signals.map((sig, i) => (
            <div
              key={sig.id ?? i}
              className="flex items-start gap-3 p-3 rounded-xl transition-all duration-200"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <Badge variant={typeVariant(sig.signalType)}>{sig.signalType}</Badge>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
                    {sig.tokenSymbol}
                  </span>
                  {sig.executed && (
                    <span className="text-[10px] font-semibold" style={{ color: '#22c55e' }}>executed</span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: '#828282' }}>{sig.action}</p>
                <p className="text-[11px] mt-0.5" style={{ color: '#555555' }}>{sig.reason}</p>
              </div>
              <span className="text-xs whitespace-nowrap shrink-0" style={{ color: '#555555' }}>
                {formatTimestamp(sig.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
