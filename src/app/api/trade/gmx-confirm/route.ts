import { NextRequest, NextResponse } from 'next/server'
import { updateOrderStatus } from '@/lib/db/trading-queries'

export async function POST(req: NextRequest) {
  const address = req.headers.get('x-wallet-address')
  if (!address) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
  }

  const { orderId, txHash, entryPrice } = await req.json()

  if (!orderId || !txHash) {
    return NextResponse.json({ error: 'Missing orderId or txHash' }, { status: 400 })
  }

  await updateOrderStatus(orderId, 'submitted', txHash, entryPrice)

  return NextResponse.json({ success: true, orderId, txHash })
}
