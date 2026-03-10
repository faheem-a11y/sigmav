import { NextRequest, NextResponse } from 'next/server'
import { getFundingRateHistory, getFundingRateHistoryBySymbol, getVenueRateHistory } from '@/lib/db/queries'

export const dynamic = 'force-dynamic'

interface HistoryRow {
  timestamp: number
  spread: number
  venues: Record<string, number>
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const market = searchParams.get('market')
    const token = searchParams.get('token')
    const hours = parseInt(searchParams.get('hours') || '24')

    // Legacy mode: return raw snapshots by market_token
    if (market && !token) {
      const history = getFundingRateHistory(market, hours)
      return NextResponse.json(history)
    }

    if (!token) {
      return NextResponse.json({ error: 'token or market parameter required' }, { status: 400 })
    }

    // New mode: return combined history with spread + per-venue rates
    const gmxSnapshots = getFundingRateHistoryBySymbol(token, hours)
    const venueRates = getVenueRateHistory(token, hours)

    // Group venue rates by timestamp
    const venueByTime = new Map<number, Record<string, number>>()
    for (const vr of venueRates) {
      if (!venueByTime.has(vr.timestamp)) {
        venueByTime.set(vr.timestamp, {})
      }
      venueByTime.get(vr.timestamp)![vr.venueName] = vr.fundingRate
    }

    // Build rows aligned to GMX snapshot timestamps
    const rows: HistoryRow[] = gmxSnapshots.map((snap) => {
      const venueRatesAtTime = venueByTime.get(snap.timestamp) || {}
      const allRates: Record<string, number> = {
        'GMX Long': snap.fundingRateLong,
        'GMX Short': snap.fundingRateShort,
        ...venueRatesAtTime,
      }

      // Compute max spread across all venue pairs
      const rateValues = Object.values(allRates)
      const maxRate = Math.max(...rateValues)
      const minRate = Math.min(...rateValues)
      const spread = Math.abs(maxRate - minRate) * 8760

      return {
        timestamp: snap.timestamp,
        spread,
        venues: allRates,
      }
    })

    return NextResponse.json(rows)
  } catch (error) {
    console.error('[API] /api/funding-rates/history error:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
