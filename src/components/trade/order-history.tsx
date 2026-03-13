'use client'

import { useOrders } from '@/lib/hooks/use-trade'
import { formatDistanceToNow } from 'date-fns'

export function OrderHistory() {
  const { orders, isLoading } = useOrders()

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <h3 className="text-sm font-semibold" style={{ color: '#EDEDED' }}>Order History</h3>
      </div>

      {isLoading ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs" style={{ color: '#555' }}>Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-xs" style={{ color: '#444' }}>No orders yet</p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {orders.slice(0, 20).map((order: Record<string, unknown>, i: number) => {
            const status = (order.status as string) || ''
            const side = (order.side as string) || ''
            const market = (order.market as string) || ''
            const venue = (order.venue as string) || ''
            const sizeUsd = Number(order.sizeUsd || order.size_usd || 0)
            const createdAt = Number(order.createdAt || order.created_at || 0)

            const statusColors: Record<string, string> = {
              filled: '#22c55e',
              pending: '#f59e0b',
              submitted: '#3b82f6',
              cancelled: '#666',
              failed: '#ef4444',
            }

            return (
              <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                    style={{
                      background: side === 'long' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: side === 'long' ? '#22c55e' : '#ef4444',
                    }}
                  >
                    {side}
                  </span>
                  <div>
                    <span className="text-xs font-medium" style={{ color: '#EDEDED' }}>{market}</span>
                    <span className="text-[10px] ml-2" style={{ color: '#555' }}>
                      ${sizeUsd.toLocaleString()} · {venue}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className="text-[10px] font-mono uppercase"
                    style={{ color: statusColors[status] || '#666' }}
                  >
                    {status}
                  </span>
                  {createdAt > 0 && (
                    <p className="text-[9px] font-mono mt-0.5" style={{ color: '#444' }}>
                      {formatDistanceToNow(createdAt * 1000, { addSuffix: true })}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
