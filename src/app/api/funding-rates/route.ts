import { NextResponse } from 'next/server'
import { getEnrichedMarkets } from '@/lib/api/gmx'
import { fetchAllVenueRates, getVenueComparison } from '@/lib/engine/funding-analyzer'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [markets, venueRates] = await Promise.all([
      getEnrichedMarkets(),
      fetchAllVenueRates(),
    ])

    // Build a set of tokens available on both HyperLiquid and Paradex
    const hlTokens = new Set(venueRates.filter((r) => r.venueName === 'HyperLiquid').map((r) => r.tokenSymbol))
    const pdxTokens = new Set(venueRates.filter((r) => r.venueName === 'Paradex').map((r) => r.tokenSymbol))

    const ratesWithComparisons = markets
      .filter((market) => hlTokens.has(market.tokenSymbol) && pdxTokens.has(market.tokenSymbol))
      .map((market) => {
        const ratesForToken = venueRates.filter(
          (r) => r.tokenSymbol === market.tokenSymbol
        )
        const comparison = getVenueComparison(market, ratesForToken)

        return {
          ...market,
          venueComparison: comparison,
        }
      })

    return NextResponse.json(ratesWithComparisons, {
      headers: { 'Cache-Control': 's-maxage=5, stale-while-revalidate=30' },
    })
  } catch (error) {
    console.error('[API] /api/funding-rates error:', error)
    return NextResponse.json({ error: 'Failed to fetch funding rates' }, { status: 500 })
  }
}
