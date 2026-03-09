import type { SimulatedVenueRate, MarketData } from '../utils/types'

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function gaussianRandom(seed: number, mean: number, stdDev: number): number {
  const u1 = seededRandom(seed)
  const u2 = seededRandom(seed + 1)
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 0.0001))) * Math.cos(2 * Math.PI * u2)
  return mean + stdDev * z
}

export function generateSimulatedVenueRates(
  gmxRate: number,
  tokenSymbol: string,
  timestamp: number
): SimulatedVenueRate[] {
  const baseSeed = hashString(tokenSymbol) + Math.floor(timestamp / 300)

  const venues: { name: string; meanOffset: number; stdDev: number }[] = [
    { name: 'HyperLiquid', meanOffset: -0.01, stdDev: 0.18 },
    { name: 'Paradex', meanOffset: 0.015, stdDev: 0.16 },
  ]

  return venues.map((venue, i) => {
    const offset = gaussianRandom(baseSeed + i * 7, venue.meanOffset, venue.stdDev)
    const simulatedRate = gmxRate * (1 + offset)
    const annualized = simulatedRate * 8760

    return {
      tokenSymbol,
      venueName: venue.name,
      fundingRate: simulatedRate,
      annualizedRate: annualized,
      timestamp,
    }
  })
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return Math.abs(hash)
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
  simulatedRates: SimulatedVenueRate[]
) {
  const gmxHourlyRate = market.fundingRateLong

  const venues = [
    {
      name: 'GMX',
      fundingRate: gmxHourlyRate,
      annualizedRate: gmxHourlyRate * 8760,
      isSimulated: false,
    },
    ...simulatedRates.map((r) => ({
      name: r.venueName,
      fundingRate: r.fundingRate,
      annualizedRate: r.annualizedRate,
      isSimulated: true,
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
