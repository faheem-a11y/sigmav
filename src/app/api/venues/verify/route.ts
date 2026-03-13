import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const { venue, apiKey, apiSecret } = await req.json()

  if (!venue || !apiKey || !apiSecret) {
    return NextResponse.json({ error: 'Missing credentials' }, { status: 400 })
  }

  try {
    if (venue === 'HyperLiquid') {
      // Test HyperLiquid API connectivity
      const res = await fetch('https://api.hyperliquid.xyz/info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'meta' }),
      })
      if (!res.ok) throw new Error('HyperLiquid API unreachable')
      return NextResponse.json({ valid: true, venue })
    }

    if (venue === 'Paradex') {
      // Test Paradex API connectivity
      const res = await fetch('https://api.paradex.trade/v1/system/config')
      if (!res.ok) throw new Error('Paradex API unreachable')
      return NextResponse.json({ valid: true, venue })
    }

    return NextResponse.json({ error: `Unknown venue: ${venue}` }, { status: 400 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Verification failed'
    return NextResponse.json({ valid: false, error: message }, { status: 400 })
  }
}
