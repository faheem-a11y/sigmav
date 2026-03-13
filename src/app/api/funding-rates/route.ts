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

    // Tokens on GMX + at least one other venue
    const externalTokens = new Set(venueRates.map((r) => r.tokenSymbol))

    const ratesWithComparisons = markets
      .filter((market) => externalTokens.has(market.tokenSymbol))
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
