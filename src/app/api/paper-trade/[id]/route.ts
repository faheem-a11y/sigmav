import { NextRequest, NextResponse } from 'next/server'
import { getTradeById, closeTrade, insertSignal } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid trade ID' }, { status: 400 })
    }

    const trade = await getTradeById(id)
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 })
    }
    if (trade.status !== 'open') {
      return NextResponse.json({ error: 'Trade is already closed' }, { status: 400 })
    }

    const realizedPnl = trade.fundingCollected - trade.borrowingPaid
    await closeTrade(id, 'manual', realizedPnl, trade.currentPrice || trade.entryPrice)

    await insertSignal({
      tokenSymbol: trade.tokenSymbol,
      signalType: 'exit',
      action: 'close',
      reason: 'Manual close by user',
      executed: true,
      timestamp: Math.floor(Date.now() / 1000),
    })

    return NextResponse.json({ id, realizedPnl, status: 'closed' })
  } catch (error) {
    console.error('[API] DELETE /api/paper-trade/[id] error:', error)
    return NextResponse.json({ error: 'Failed to close trade' }, { status: 500 })
  }
}
