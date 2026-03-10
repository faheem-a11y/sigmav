import { GMX_API_BASE, STABLECOIN_ADDRESSES } from '../utils/constants'
import type { MarketData } from '../utils/types'

interface GmxMarketInfo {
  name: string
  marketToken: string
  indexToken: string
  longToken: string
  shortToken: string
  isListed: boolean
  openInterestLong: string
  openInterestShort: string
  availableLiquidityLong: string
  availableLiquidityShort: string
  fundingRateLong: string
  fundingRateShort: string
  borrowingRateLong: string
  borrowingRateShort: string
  netRateLong: string
  netRateShort: string
}

interface GmxTicker {
  tokenAddress: string
  tokenSymbol: string
  minPrice: string
  maxPrice: string
  updatedAt: number
}

let marketsCache: { data: GmxMarketInfo[]; expires: number } | null = null
let tickersCache: { data: GmxTicker[]; expires: number } | null = null

export async function fetchMarketsInfo(): Promise<GmxMarketInfo[]> {
  const now = Date.now()
  if (marketsCache && marketsCache.expires > now) {
    return marketsCache.data
  }

  try {
    const res = await fetch(`${GMX_API_BASE}/markets/info`, {
      next: { revalidate: 10 },
    })
    if (!res.ok) throw new Error(`GMX markets API returned ${res.status}`)
    const data = await res.json()
    const markets = (data.markets || data || []) as GmxMarketInfo[]
    marketsCache = { data: markets, expires: now + 10000 }
    return markets
  } catch (error) {
    console.error('[GMX] Failed to fetch markets:', error)
    return marketsCache?.data || []
  }
}

export async function fetchTickers(): Promise<GmxTicker[]> {
  const now = Date.now()
  if (tickersCache && tickersCache.expires > now) {
    return tickersCache.data
  }

  try {
    const res = await fetch(`${GMX_API_BASE}/prices/tickers`, {
      next: { revalidate: 10 },
    })
    if (!res.ok) throw new Error(`GMX tickers API returned ${res.status}`)
    const data = await res.json()
    const tickers = (Array.isArray(data) ? data : data.tickers || []) as GmxTicker[]
    tickersCache = { data: tickers, expires: now + 10000 }
    return tickers
  } catch (error) {
    console.error('[GMX] Failed to fetch tickers:', error)
    return tickersCache?.data || []
  }
}

// GMX returns values scaled by 1e30 (30 decimal fixed-point)
// Rates: rawRate / 1e30 = annualized decimal rate (e.g., 0.05 = 5% APR)
// OI/liquidity: rawValue / 1e30 = USD value
//
// Rate unit convention across all venues (after parsing):
//   fundingRate = HOURLY rate as a decimal (e.g., 0.0000057 = 0.00057%/hr)
//   annualizedRate = fundingRate * 8760
//
// GMX: raw/1e30 is annualized → divide by 8760 for hourly
// HyperLiquid: API returns hourly rate directly
// Paradex: API returns 8-hour rate → divide by 8 for hourly
const PRECISION = 1e30

export function parseGmxRate(rateStr: string | undefined): number {
  if (!rateStr) return 0
  const raw = parseFloat(rateStr) || 0
  // raw/1e30 = annualized rate; convert to hourly
  return (raw / PRECISION) / 8760
}

export function parseGmxAnnualizedRate(rateStr: string | undefined): number {
  if (!rateStr) return 0
  return (parseFloat(rateStr) || 0) / PRECISION
}

export function parseGmxOI(oiStr: string | undefined): number {
  if (!oiStr) return 0
  return (parseFloat(oiStr) || 0) / PRECISION
}

export function extractTokenSymbol(marketName: string): string {
  const match = marketName.match(/^(\w+)\//)
  return match ? match[1] : marketName
}

export function isPerpetualsMarket(market: GmxMarketInfo): boolean {
  if (!market.isListed) return false
  return !STABLECOIN_ADDRESSES.has(market.indexToken.toLowerCase())
}

export async function getEnrichedMarkets(): Promise<MarketData[]> {
  const [markets, tickers] = await Promise.all([
    fetchMarketsInfo(),
    fetchTickers(),
  ])

  // Build price map by symbol (easier than by address)
  // GMX prices are raw bigint strings; scale = 10^(30 - tokenDecimals)
  const TOKEN_DECIMALS: Record<string, number> = {
    BTC: 8, WBTC: 8, 'BTC.b': 8,
    ETH: 18, 'WETH.e': 18,
    AVAX: 18, WAVAX: 18,
    SOL: 9,
    LINK: 18,
    DOGE: 8,
    LTC: 8,
    XRP: 6,
    UNI: 18,
    AAVE: 18,
    GMX: 18,
    TRUMP: 6,
    MELANIA: 6,
    PUMP: 18,
    WLFI: 18,
    XAUt0: 6,
    'DAI.e': 18,
    USDC: 6, 'USDC.e': 6,
    USDT: 6, 'USDT.e': 6,
  }
  const priceBySymbol = new Map<string, number>()
  const priceByAddress = new Map<string, number>()
  for (const ticker of tickers) {
    const mid = (parseFloat(ticker.minPrice) + parseFloat(ticker.maxPrice)) / 2
    if (mid > 0) {
      const decimals = TOKEN_DECIMALS[ticker.tokenSymbol] ?? 18
      const price = mid / Math.pow(10, 30 - decimals)
      priceBySymbol.set(ticker.tokenSymbol, price)
      priceByAddress.set(ticker.tokenAddress?.toLowerCase(), price)
    }
  }

  return markets
    .filter(isPerpetualsMarket)
    .map((m) => {
      const tokenSymbol = extractTokenSymbol(m.name)
      const spotPrice = priceByAddress.get(m.indexToken?.toLowerCase()) || priceBySymbol.get(tokenSymbol) || 0

      return {
        marketToken: m.marketToken,
        marketName: m.name,
        indexToken: m.indexToken,
        tokenSymbol,
        isListed: m.isListed,
        openInterestLong: parseGmxOI(m.openInterestLong),
        openInterestShort: parseGmxOI(m.openInterestShort),
        fundingRateLong: parseGmxRate(m.fundingRateLong),
        fundingRateShort: parseGmxRate(m.fundingRateShort),
        borrowingRateLong: parseGmxRate(m.borrowingRateLong),
        borrowingRateShort: parseGmxRate(m.borrowingRateShort),
        netRateLong: parseGmxRate(m.netRateLong),
        netRateShort: parseGmxRate(m.netRateShort),
        spotPrice,
        availableLiquidityLong: parseGmxOI(m.availableLiquidityLong),
        availableLiquidityShort: parseGmxOI(m.availableLiquidityShort),
      }
    })
    .filter((m) => m.spotPrice > 0 || m.openInterestLong > 0 || m.openInterestShort > 0)
    // Filter out low-liquidity markets where rates are unreliable/untradeable
    .filter((m) => (m.openInterestLong + m.openInterestShort) >= 10_000)
    // GMX has multiple markets per token (different collateral pools).
    // Deduplicate by tokenSymbol — keep the market with highest total OI.
    .reduce<MarketData[]>((acc, market) => {
      const existing = acc.find((m) => m.tokenSymbol === market.tokenSymbol)
      if (!existing) {
        acc.push(market)
      } else {
        const existingOI = existing.openInterestLong + existing.openInterestShort
        const newOI = market.openInterestLong + market.openInterestShort
        if (newOI > existingOI) {
          acc[acc.indexOf(existing)] = market
        }
      }
      return acc
    }, [])
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${GMX_API_BASE}/prices/tickers`, {
      next: { revalidate: 30 },
    })
    return res.ok
  } catch {
    return false
  }
}
