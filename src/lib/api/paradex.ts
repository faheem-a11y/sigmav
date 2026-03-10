import { PARADEX_API_BASE } from '../utils/constants'
import type { SimulatedVenueRate } from '../utils/types'

interface ParadexMarketSummary {
  symbol: string
  funding_rate: string
  open_interest: string
  mark_price: string
}

let cache: { data: SimulatedVenueRate[]; expires: number } | null = null

function extractCoin(symbol: string): string | null {
  const match = symbol.match(/^(\w+)-USD-PERP$/)
  return match ? match[1] : null
}

export async function fetchParadexRates(): Promise<SimulatedVenueRate[]> {
  const now = Date.now()
  if (cache && cache.expires > now) {
    return cache.data
  }

  try {
    const res = await fetch(`${PARADEX_API_BASE}/v1/markets/summary?market=ALL`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) throw new Error(`Paradex API returned ${res.status}`)

    const data = (await res.json()) as { results: ParadexMarketSummary[] }
    const timestamp = Math.floor(now / 1000)

    const rates: SimulatedVenueRate[] = []
    for (const market of data.results) {
      const coin = extractCoin(market.symbol)
      if (!coin) continue

      // Paradex funding_rate is 8-hour basis; convert to hourly
      const rate8h = parseFloat(market.funding_rate) || 0
      const fundingRate = rate8h / 8

      rates.push({
        tokenSymbol: coin,
        venueName: 'Paradex',
        fundingRate,
        annualizedRate: fundingRate * 8760,
        timestamp,
      })
    }

    cache = { data: rates, expires: now + 10_000 }
    return rates
  } catch (error) {
    console.error('[Paradex] Failed to fetch rates:', error)
    return cache?.data || []
  }
}
