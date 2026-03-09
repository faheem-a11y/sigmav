'use client'

import { useState } from 'react'
import { mutate } from 'swr'
import { RefreshCw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatTimestamp } from '@/lib/utils/formatting'
import type { RebalanceEvent } from '@/lib/utils/types'

export function RebalanceHistory() {
  const [events, setEvents] = useState<RebalanceEvent[]>([])
  const [isTriggering, setIsTriggering] = useState(false)

  const handleRebalance = async () => {
    setIsTriggering(true)
    try {
      const res = await fetch('/api/vault/rebalance', { method: 'POST' })
      if (!res.ok) throw new Error('Rebalance failed')
      const data = await res.json()
      const newEvents = Array.isArray(data.events) ? data.events : data.event ? [data.event] : []
      setEvents((prev) => [...newEvents, ...prev])
      await mutate('/api/vault')
    } catch (err) {
      console.error('Rebalance failed:', err)
    } finally {
      setIsTriggering(false)
    }
  }

  const actionVariant = (action: string) => {
    if (action === 'open') return 'green' as const
    if (action === 'close') return 'red' as const
    return 'amber' as const
  }

  return (
    <Card
      title="Rebalance"
      subtitle="Portfolio rebalancing actions"
      headerRight={
        <button
          onClick={handleRebalance}
          disabled={isTriggering}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
          style={{ fontSize: '12px', padding: '6px 12px' }}
        >
          <RefreshCw className={`w-3 h-3 ${isTriggering ? 'animate-spin' : ''}`} />
          {isTriggering ? 'Running...' : 'Trigger'}
        </button>
      }
    >
      {!events.length ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center mb-1"
            style={{ background: 'rgba(255,255,255,0.04)' }}
          >
            <RefreshCw className="w-4 h-4" style={{ color: '#333' }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: '#a0a0a0' }}>
            Coming Soon
          </p>
          <p className="text-xs" style={{ color: '#555555' }}>
            Automated rebalancing is under development
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
          {events.map((evt, i) => (
            <div
              key={evt.id ?? i}
              className="flex items-start gap-3 p-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}
            >
              <Badge variant={actionVariant(evt.action)}>{evt.action}</Badge>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium" style={{ color: '#FFFFFF' }}>{evt.tokenSymbol}</p>
                <p className="text-xs mt-0.5" style={{ color: '#a0a0a0' }}>{evt.reason}</p>
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: '#a0a0a0' }}>
                {formatTimestamp(evt.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
