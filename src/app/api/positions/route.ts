import { NextRequest, NextResponse } from 'next/server'
import { getAdapter, getAvailableVenues } from '@/lib/exchanges'
import { getUserPositions, upsertPosition } from '@/lib/db/trading-queries'

export async function GET(req: NextRequest) {
  const address = req.headers.get('x-wallet-address')
  if (!address) {
    return NextResponse.json({ error: 'Missing wallet address' }, { status: 401 })
  }

  // Fetch positions from all connected venues
  const venues = getAvailableVenues()
  const allPositions = await Promise.all(
    venues.map(async (venue) => {
      const adapter = getAdapter(venue)
      if (!adapter) return []
      try {
        const positions = await adapter.getPositions(address)
        // Sync to DB
        for (const pos of positions) {
          await upsertPosition({
            userAddress: address,
            venue: pos.venue,
            market: pos.market,
            side: pos.side,
            sizeUsd: pos.sizeUsd,
            entryPrice: pos.entryPrice,
            markPrice: pos.markPrice,
            unrealizedPnl: pos.unrealizedPnl,
            leverage: pos.leverage,
            liquidationPrice: pos.liquidationPrice,
            fundingAccrued: pos.fundingAccrued,
            status: 'open',
          })
        }
        return positions
      } catch {
        return []
      }
    }),
  )

  // Also get cached positions from DB
  const dbPositions = await getUserPositions(address)

  // Merge: prefer live data, fall back to DB
  const livePositions = allPositions.flat()
  const mergedMap = new Map<string, typeof dbPositions[0] | typeof livePositions[0]>()

  for (const p of dbPositions) {
    mergedMap.set(`${p.venue}:${p.market}`, p)
  }
  for (const p of livePositions) {
    mergedMap.set(`${p.venue}:${p.market}`, p as unknown as typeof dbPositions[0])
  }

  return NextResponse.json(Array.from(mergedMap.values()))
}
