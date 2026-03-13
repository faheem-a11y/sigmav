import { NextRequest, NextResponse } from 'next/server'
import { getActiveVenues, saveCredential, deleteCredential } from '@/lib/db/venue-credentials'

export async function GET(req: NextRequest) {
  const address = req.headers.get('x-wallet-address')
  if (!address) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
  }

  const venues = await getActiveVenues(address)
  // GMX is always available (wallet-based, no API keys needed)
  const result = [
    { venue: 'GMX', isActive: true, createdAt: 0 },
    ...venues,
  ]
  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const address = req.headers.get('x-wallet-address')
  if (!address) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
  }

  const body = await req.json()
  const { venue, apiKey, apiSecret } = body

  if (!venue || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Missing venue, apiKey, or apiSecret' }, { status: 400 })
  }

  await saveCredential(address, venue, apiKey, apiSecret)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const address = req.headers.get('x-wallet-address')
  if (!address) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
  }

  const { venue } = await req.json()
  if (!venue) {
    return NextResponse.json({ error: 'Missing venue' }, { status: 400 })
  }

  await deleteCredential(address, venue)
  return NextResponse.json({ success: true })
}
