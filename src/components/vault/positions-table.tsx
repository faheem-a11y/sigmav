'use client'

import { useState } from 'react'
import { mutate } from 'swr'
import { Badge } from '@/components/ui/badge'
import { DataTable, type Column } from '@/components/ui/data-table'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useVault } from '@/lib/hooks/use-vault'
import { formatUsd, formatPnl } from '@/lib/utils/formatting'
import type { PaperTrade } from '@/lib/utils/types'

interface PositionLeg {
  tradeId: number | undefined
  tokenSymbol: string
  leg: 'Long' | 'Short'
  venue: string
  entryPrice: number
  currentPrice: number
  positionSizeUsd: number
  fundingCollected: number
  borrowingPaid: number
  unrealizedPnl: number
  openedAt: number
}

function durationStr(openedAt: number): string {
  const secs = Math.floor(Date.now() / 1000) - openedAt
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

function expandToLegs(trades: PaperTrade[]): (PositionLeg & Record<string, unknown>)[] {
  const rows: (PositionLeg & Record<string, unknown>)[] = []
  for (const trade of trades) {
    const half = trade.positionSizeUsd / 2
    rows.push({
      tradeId: trade.id,
      tokenSymbol: trade.tokenSymbol,
      leg: 'Long',
      venue: trade.longVenue || 'GMX',
      entryPrice: trade.entryPrice,
      currentPrice: trade.currentPrice ?? trade.entryPrice,
      positionSizeUsd: half,
      fundingCollected: trade.fundingCollected / 2,
      borrowingPaid: trade.borrowingPaid / 2,
      unrealizedPnl: trade.unrealizedPnl / 2,
      openedAt: trade.openedAt,
    })
    rows.push({
      tradeId: trade.id,
      tokenSymbol: trade.tokenSymbol,
      leg: 'Short',
      venue: trade.shortVenue || 'GMX',
      entryPrice: trade.entryPrice,
      currentPrice: trade.currentPrice ?? trade.entryPrice,
      positionSizeUsd: half,
      fundingCollected: trade.fundingCollected / 2,
      borrowingPaid: trade.borrowingPaid / 2,
      unrealizedPnl: trade.unrealizedPnl / 2,
      openedAt: trade.openedAt,
    })
  }
  return rows
}

export function PositionsTable() {
  const { data: vault, isLoading } = useVault()
  const [closingId, setClosingId] = useState<number | null>(null)

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

  const columns: Column<PositionLeg & Record<string, unknown>>[] = [
    {
      key: 'tokenSymbol',
      label: 'Token',
      sortable: true,
      render: (row) => (
        <span className="font-semibold" style={{ color: '#FFFFFF' }}>{row.tokenSymbol}</span>
      ),
    },
    {
      key: 'leg',
      label: 'Side',
      render: (row) => (
        <Badge variant={row.leg === 'Long' ? 'green' : 'red'}>
          {row.leg}
        </Badge>
      ),
    },
    {
      key: 'venue',
      label: 'Venue',
      render: (row) => (
        <span className="text-xs" style={{ color: '#828282' }}>{row.venue}</span>
      ),
    },
    {
      key: 'positionSizeUsd',
      label: 'Size',
      sortable: true,
      align: 'right',
      render: (row) => formatUsd(row.positionSizeUsd),
    },
    {
      key: 'fundingCollected',
      label: 'Funding',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span style={{ color: '#22c55e' }}>{formatPnl(row.fundingCollected)}</span>
      ),
    },
    {
      key: 'unrealizedPnl',
      label: 'Net PnL',
      sortable: true,
      align: 'right',
      render: (row) => (
        <span style={{ color: row.unrealizedPnl >= 0 ? '#22c55e' : '#FF3B45' }}>
          {formatPnl(row.unrealizedPnl)}
        </span>
      ),
    },
    {
      key: 'openedAt',
      label: 'Duration',
      sortable: true,
      render: (row) => (
        <span style={{ color: '#828282' }}>{durationStr(row.openedAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: '',
      align: 'right',
      render: (row) => row.leg === 'Long' ? (
        <button
          onClick={(e) => {
            e.stopPropagation()
            if (row.tradeId != null) handleClose(row.tradeId)
          }}
          disabled={closingId === row.tradeId}
          className="px-2 py-1 text-xs font-medium rounded-lg transition-colors duration-200 disabled:opacity-40"
          style={{ background: 'rgba(255,59,69,0.1)', color: '#FF3B45', border: '1px solid rgba(255,59,69,0.15)' }}
        >
          {closingId === row.tradeId ? 'Closing...' : 'Close'}
        </button>
      ) : null,
    },
  ]

  const openPositions = (vault?.positions ?? []).filter((p) => p.status === 'open')
  const legs = expandToLegs(openPositions)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold" style={{ color: '#FFFFFF' }}>Open Positions</h3>
          <p className="text-xs" style={{ color: '#555555' }}>{openPositions.length} active</p>
        </div>
      </div>
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : (
        <DataTable
          columns={columns}
          data={legs}
          emptyMessage="No open positions"
        />
      )}
    </div>
  )
}
