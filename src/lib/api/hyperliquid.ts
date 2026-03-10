import { HYPERLIQUID_API_BASE } from '../utils/constants'
import type { SimulatedVenueRate } from '../utils/types'

interface HyperLiquidMeta {
  universe: { name: string; isDelisted?: boolean }[]
}

interface HyperLiquidAssetCtx {
  funding: string
  openInterest: string
  oraclePx: string
}

let cache: { data: SimulatedVenueRate[]; expires: number } | null = null

export async function fetchHyperLiquidRates(): Promise<SimulatedVenueRate[]> {
  const now = Date.now()
  if (cache && cache.expires > now) {
    return cache.data
  }

  try {
    const res = await fetch(`${HYPERLIQUID_API_BASE}/info`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'metaAndAssetCtxs' }),
    })
    if (!res.ok) throw new Error(`HyperLiquid API returned ${res.status}`)

    const [meta, assetCtxs] = (await res.json()) as [HyperLiquidMeta, HyperLiquidAssetCtx[]]
    const timestamp = Math.floor(now / 1000)

    const rates: SimulatedVenueRate[] = []
    for (let i = 0; i < meta.universe.length && i < assetCtxs.length; i++) {
      const coin = meta.universe[i]
      if (coin.isDelisted) continue

      const ctx = assetCtxs[i]
      // HyperLiquid funding rate is per-hour (settled every hour)
      const fundingRate = parseFloat(ctx.funding) || 0

      rates.push({
        tokenSymbol: coin.name,
        venueName: 'HyperLiquid',
        fundingRate,
        annualizedRate: fundingRate * 8760,
        timestamp,
      })
    }

    cache = { data: rates, expires: now + 10_000 }
    return rates
  } catch (error) {
    console.error('[HyperLiquid] Failed to fetch rates:', error)
    return cache?.data || []
  }
}
