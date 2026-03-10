'use client'

import { useState, useEffect, useRef } from 'react'
import { mutate } from 'swr'
import { TrendingUp, TrendingDown, X } from 'lucide-react'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useVault } from '@/lib/hooks/use-vault'
import { formatUsd, formatPnl } from '@/lib/utils/formatting'

function durationStr(openedAt: number): string {
  const secs = Math.floor(Date.now() / 1000) - openedAt
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

interface PositionsTableProps {
  highlightToken?: string
}

export function PositionsTable({ highlightToken }: PositionsTableProps) {
  const { data: vault, isLoading } = useVault()
  const [closingId, setClosingId] = useState<number | null>(null)
  const [highlightActive, setHighlightActive] = useState(false)
  const highlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!highlightToken) return
    setHighlightActive(true)
    const scrollTimer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 200)
    const clearTimer = setTimeout(() => setHighlightActive(false), 2200)
    return () => {
      clearTimeout(scrollTimer)
      clearTimeout(clearTimer)
    }
  }, [highlightToken])

  const handleClose = async (id: number) => {
    setClosingId(id)
    try {
      const res = await fetch(`/api/paper-trade/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to close position')
      await mutate('/api/vault')
    } catch (err) {
      console.error('Close position failed:', err)
    } finally {
      setClosingId(null)
    }
  }

  const openPositions = (vault?.positions ?? []).filter((p) => p.status === 'open')

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Open Positions</h3>
          <p className="text-xs" style={{ color: '#a0a0a0' }}>{openPositions.length} active</p>
        </div>
      </div>
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : openPositions.length === 0 ? (
        <div className="flex items-center justify-center py-10 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-sm" style={{ color: '#a0a0a0' }}>No open positions</p>
        </div>
      ) : (
        <div className="space-y-3">
          {openPositions.map((trade) => {
            const isHighlighted = highlightActive && trade.tokenSymbol === highlightToken
            const half = trade.positionSizeUsd / 2
            const netPnl = trade.unrealizedPnl
            const netFunding = trade.fundingCollected

            return (
              <div
                key={trade.id}
                ref={trade.tokenSymbol === highlightToken ? highlightRef : undefined}
                className="rounded-xl p-4 transition-all duration-300"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: `1px solid ${isHighlighted ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.05)'}`,
                  boxShadow: isHighlighted ? '0 0 20px rgba(34,197,94,0.15)' : 'none',
                }}
              >
                {/* Header: Token + Duration + Close */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm" style={{ color: '#FFFFFF' }}>
                      {trade.tokenSymbol}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: '#666' }}>
                      {durationStr(trade.openedAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => trade.id != null && handleClose(trade.id)}
                    disabled={closingId === trade.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-medium rounded-lg transition-all duration-200 disabled:opacity-40 active:scale-95"
                    style={{ background: 'rgba(255,59,69,0.08)', color: '#FF3B45', border: '1px solid rgba(255,59,69,0.12)' }}
                  >
                    {closingId === trade.id ? (
                      'Closing...'
                    ) : (
                      <>
                        <X className="w-3 h-3" />
                        Close
                      </>
                    )}
                  </button>
                </div>

                {/* Two legs side by side */}
                <div className="grid grid-cols-2 gap-2">
                  {/* Long Leg */}
                  <div className="rounded-lg p-3" style={{ background: 'rgba(34,197,94,0.04)', border: '1px solid rgba(34,197,94,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingUp className="w-3 h-3" style={{ color: '#22c55e' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#22c55e' }}>
                        Long
                      </span>
                    </div>
                    <p className="text-[11px] font-medium mb-1" style={{ color: '#c0c0c0' }}>
                      {trade.longVenue || 'GMX'}
                    </p>
                    <p className="text-xs font-mono" style={{ color: '#888' }}>
                      {formatUsd(half)}
                    </p>
                  </div>

                  {/* Short Leg */}
                  <div className="rounded-lg p-3" style={{ background: 'rgba(255,59,69,0.04)', border: '1px solid rgba(255,59,69,0.08)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                      <TrendingDown className="w-3 h-3" style={{ color: '#FF3B45' }} />
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#FF3B45' }}>
                        Short
                      </span>
                    </div>
                    <p className="text-[11px] font-medium mb-1" style={{ color: '#c0c0c0' }}>
                      {trade.shortVenue || 'GMX'}
                    </p>
                    <p className="text-xs font-mono" style={{ color: '#888' }}>
                      {formatUsd(half)}
                    </p>
                  </div>
                </div>

                {/* Summary metrics */}
                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#666' }}>Funding</p>
                      <p className="text-xs font-mono font-semibold" style={{ color: '#22c55e' }}>
                        {formatPnl(netFunding)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#666' }}>Borrowing</p>
                      <p className="text-xs font-mono font-semibold" style={{ color: '#FF3B45' }}>
                        {formatPnl(-trade.borrowingPaid)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: '#666' }}>Net PnL</p>
                    <p className="text-sm font-mono font-bold" style={{ color: netPnl >= 0 ? '#22c55e' : '#FF3B45' }}>
                      {formatPnl(netPnl)}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
