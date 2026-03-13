import { NextRequest, NextResponse } from 'next/server'
import { getAdapter } from '@/lib/exchanges'
import { insertOrder, getUserOrders } from '@/lib/db/trading-queries'

export async function POST(req: NextRequest) {
  const address = req.headers.get('x-wallet-address')
  if (!address) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
  }

  const body = await req.json()
  const { venue, market, side, sizeUsd, leverage, orderType, limitPrice } = body

  if (!venue || !market || !side || !sizeUsd) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const adapter = getAdapter(venue)
  if (!adapter) {
    return NextResponse.json({ error: `Unsupported venue: ${venue}` }, { status: 400 })
  }

  const result = await adapter.placeOrder(address, {
    market,
    side,
    sizeUsd,
    leverage: leverage || 1,
    orderType: orderType || 'market',
    limitPrice,
  })

  // Store order in DB
  const orderId = await insertOrder({
    userAddress: address,
    venue,
    market,
    side,
    sizeUsd,
    leverage: leverage || 1,
    entryPrice: result.entryPrice,
    venueOrderId: result.orderId,
    txHash: result.txHash || null,
    status: result.status,
  })

  return NextResponse.json({ ...result, dbOrderId: orderId })
}

export async function GET(req: NextRequest) {
  const address = req.headers.get('x-wallet-address')
  if (!address) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
  }

  const orders = await getUserOrders(address)
  return NextResponse.json(orders)
}
