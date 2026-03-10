export const GMX_API_BASE = process.env.NEXT_PUBLIC_GMX_API_BASE || 'https://avalanche-api.gmxinfra.io'

export const POLLING_INTERVAL = Number(process.env.NEXT_PUBLIC_POLLING_INTERVAL) || 30000

export const HYPERLIQUID_API_BASE = 'https://api.hyperliquid.xyz'
export const PARADEX_API_BASE = 'https://api.prod.paradex.trade'

export const VENUES = ['GMX', 'HyperLiquid', 'Paradex'] as const

export const CHAINLINK_FEEDS: Record<string, `0x${string}`> = {
  'BTC/USD': '0x2779D32d5166BAaa2B2b658333bA7e6Ec0C65743',
  'ETH/USD': '0x976B3D034E162d8bD72D6b9C989d545b839003b0',
  'AVAX/USD': '0x0A77230d17318075983913bC2145DB16C7366156',
}

export const STABLECOIN_ADDRESSES = new Set([
  '0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e', // USDC
  '0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7', // USDT
  '0xd586e7f844cea2f87f50152665bcbc2c279d8d70', // DAI.e
])

export const TOKEN_COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  AVAX: 'avalanche-2',
  SOL: 'solana',
  LINK: 'chainlink',
  XRP: 'ripple',
  DOGE: 'dogecoin',
  LTC: 'litecoin',
  AAVE: 'aave',
  UNI: 'uniswap',
}

export const DEFAULT_RISK_PARAMS = {
  maxRiskScore: 70,
  minConfidence: 0.3,
  spreadPersistenceMinutes: 10,
}

/** Deep-link to the perpetuals trading page for each supported venue */
export const DEX_TRADE_URLS: Record<string, string> = {
  'GMX':         'https://app.gmx.io/#/trade',
  'GMX v2':      'https://app.gmx.io/#/trade',
  'HyperLiquid': 'https://app.hyperliquid.xyz/trade',
  'Paradex':     'https://app.paradex.trade/perpetuals',
}

/** Build a token-specific deep link for a venue */
export function getVenueTradeUrl(venue: string, tokenSymbol: string): string {
  switch (venue) {
    case 'GMX':
    case 'GMX v2':
      return `https://app.gmx.io/#/trade/?market=${tokenSymbol}-USD`
    case 'HyperLiquid':
      return `https://app.hyperliquid.xyz/trade/${tokenSymbol}`
    case 'Paradex':
      return `https://app.paradex.trade/perpetuals/${tokenSymbol}-USD-PERP`
    default:
      return DEX_TRADE_URLS[venue] || '#'
  }
}
