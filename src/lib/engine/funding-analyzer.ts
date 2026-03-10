import type { SimulatedVenueRate, MarketData } from '../utils/types'
import { fetchHyperLiquidRates } from '../api/hyperliquid'
import { fetchParadexRates } from '../api/paradex'

export async function fetchAllVenueRates(): Promise<SimulatedVenueRate[]> {
  const [hlResult, pdxResult] = await Promise.allSettled([
    fetchHyperLiquidRates(),
    fetchParadexRates(),
  ])

  const rates: SimulatedVenueRate[] = []

  if (hlResult.status === 'fulfilled') {
    rates.push(...hlResult.value)
  } else {
    console.error('[VenueRates] HyperLiquid fetch failed:', hlResult.reason)
  }

  if (pdxResult.status === 'fulfilled') {
    rates.push(...pdxResult.value)
  } else {
    console.error('[VenueRates] Paradex fetch failed:', pdxResult.reason)
  }

  return rates
}

export function calculateSpread(
  rateA: number,
  rateB: number
): { spread: number; direction: 'long_a_short_b' | 'long_b_short_a' } {
  const spread = Math.abs(rateA - rateB)
  return {
    spread,
    direction: rateA < rateB ? 'long_a_short_b' : 'long_b_short_a',
  }
}

export function calculateAnnualizedSpread(hourlySpread: number): number {
  return hourlySpread * 8760
}

export function getVenueComparison(
  market: MarketData,
  venueRates: SimulatedVenueRate[]
) {
  const gmxHourlyRate = market.fundingRateLong

  const venues = [
    {
      name: 'GMX',
      fundingRate: gmxHourlyRate,
      annualizedRate: gmxHourlyRate * 8760,
      isSimulated: false,
    },
    ...venueRates.map((r) => ({
      name: r.venueName,
      fundingRate: r.fundingRate,
      annualizedRate: r.annualizedRate,
      isSimulated: false,
    })),
  ]

  let maxSpread = 0
  let bestLong = ''
  let bestShort = ''

  for (let i = 0; i < venues.length; i++) {
    for (let j = i + 1; j < venues.length; j++) {
      // Skip the HyperLiquid–Paradex cross pair; one leg must always be GMX
      const names = new Set([venues[i].name, venues[j].name])
      if (names.has('HyperLiquid') && names.has('Paradex')) continue

      const spread = Math.abs(venues[i].annualizedRate - venues[j].annualizedRate)
      if (spread > maxSpread) {
        maxSpread = spread
        if (venues[i].annualizedRate < venues[j].annualizedRate) {
          bestLong = venues[i].name
          bestShort = venues[j].name
        } else {
          bestLong = venues[j].name
          bestShort = venues[i].name
        }
      }
    }
  }

  return {
    tokenSymbol: market.tokenSymbol,
    venues,
    maxSpread,
    bestLong,
    bestShort,
  }
}
