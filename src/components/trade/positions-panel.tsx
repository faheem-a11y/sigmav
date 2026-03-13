'use client'

import { usePositions } from '@/lib/hooks/use-trade'

export function PositionsPanel() {
  const { positions, isLoading } = usePositions()

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: '#EDEDED' }}>Positions</h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md" style={{
            background: 'rgba(255,255,255,0.05)',
            color: '#888',
          }}>
            {positions.length} open
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs" style={{ color: '#555' }}>Loading positions...</p>
        </div>
      ) : positions.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs" style={{ color: '#444' }}>No open positions</p>
          <p className="text-[10px] mt-1" style={{ color: '#333' }}>Place a trade to get started</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {positions.map((pos: Record<string, unknown>, i: number) => {
            const pnl = Number(pos.unrealizedPnl || pos.unrealized_pnl || 0)
            const side = (pos.side as string) || ''
            const market = (pos.market as string) || ''
            const venue = (pos.venue as string) || ''
            const sizeUsd = Number(pos.sizeUsd || pos.size_usd || 0)
            const entryPrice = Number(pos.entryPrice || pos.entry_price || 0)
            const leverage = Number(pos.leverage || 1)

            return (
              <div key={i} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: side === 'long' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                      color: side === 'long' ? '#22c55e' : '#ef4444',
                      border: `1px solid ${side === 'long' ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    }}
                  >
                    {side === 'long' ? 'L' : 'S'}
                  </div>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#EDEDED' }}>
                      {market}
                      <span className="text-[10px] font-mono ml-2" style={{ color: '#555' }}>{leverage}x</span>
                    </p>
                    <p className="text-[10px] font-mono" style={{ color: '#555' }}>
                      {venue} · ${sizeUsd.toLocaleString()} · Entry ${entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-mono font-bold"
                    style={{ color: pnl >= 0 ? '#22c55e' : '#ef4444' }}
                  >
                    {pnl >= 0 ? '+' : ''}{pnl.toFixed(2)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
