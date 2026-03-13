import type { ExchangeAdapter, OrderParams, OrderResult, Position } from './types'
import { getCredential } from '../db/venue-credentials'
import { HYPERLIQUID_API_BASE } from '../utils/constants'

export class HyperLiquidAdapter implements ExchangeAdapter {
  venue = 'HyperLiquid'

  async getPositions(userAddress: string): Promise<Position[]> {
    try {
      const res = await fetch(`${HYPERLIQUID_API_BASE}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: userAddress,
        }),
      })
      if (!res.ok) return []
      const data = await res.json()

      if (!data.assetPositions) return []

      return data.assetPositions
        .filter((ap: { position: { szi: string } }) => Number(ap.position.szi) !== 0)
        .map((ap: { position: Record<string, unknown> }) => {
          const p = ap.position
          const size = Number(p.szi)
          const lev = typeof p.leverage === 'object' && p.leverage
            ? Number((p.leverage as Record<string, unknown>).value || 1)
            : Number(p.leverage || 1)
          const cumFunding = typeof p.cumFunding === 'object' && p.cumFunding
            ? Number((p.cumFunding as Record<string, unknown>).allTime || 0)
            : 0
          return {
            venue: 'HyperLiquid',
            market: String(p.coin || ''),
            side: size > 0 ? 'long' as const : 'short' as const,
            sizeUsd: Math.abs(size) * Number(p.entryPx || 0),
            entryPrice: Number(p.entryPx || 0),
            markPrice: Number(p.entryPx || 0),
            unrealizedPnl: Number(p.unrealizedPnl || 0),
            leverage: lev,
            liquidationPrice: p.liquidationPx ? Number(p.liquidationPx) : null,
            fundingAccrued: cumFunding,
          }
        })
    } catch {
      return []
    }
  }

  async placeOrder(userAddress: string, params: OrderParams): Promise<OrderResult> {
    const creds = await getCredential(userAddress, 'HyperLiquid')
    if (!creds) {
      return {
        orderId: '',
        venue: 'HyperLiquid',
        market: params.market,
        side: params.side,
        sizeUsd: params.sizeUsd,
        entryPrice: null,
        status: 'failed',
        timestamp: Math.floor(Date.now() / 1000),
      }
    }

    try {
      // Get current mid price for sizing
      const metaRes = await fetch(`${HYPERLIQUID_API_BASE}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'allMids' }),
      })
      const mids = await metaRes.json()
      const midPrice = Number(mids[params.market] || 0)
      if (!midPrice) throw new Error('Cannot get price for ' + params.market)

      const size = params.sizeUsd / midPrice
      const isBuy = params.side === 'long'

      // Place order via exchange endpoint
      const orderPayload = {
        type: 'order',
        orders: [{
          a: 0, // asset index — simplified, would need meta lookup
          b: isBuy,
          p: params.orderType === 'limit' && params.limitPrice
            ? params.limitPrice.toString()
            : midPrice.toString(),
          s: size.toFixed(4),
          r: false, // reduce only
          t: { limit: { tif: 'Ioc' } },
        }],
        grouping: 'na',
      }

      const res = await fetch(`${HYPERLIQUID_API_BASE}/exchange`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: orderPayload,
          nonce: Date.now(),
          signature: 'placeholder', // Would need proper signing with API secret
        }),
      })

      const result = await res.json()

      return {
        orderId: result?.response?.data?.statuses?.[0]?.resting?.oid?.toString() || `hl-${Date.now()}`,
        venue: 'HyperLiquid',
        market: params.market,
        side: params.side,
        sizeUsd: params.sizeUsd,
        entryPrice: midPrice,
        status: res.ok ? 'filled' : 'failed',
        timestamp: Math.floor(Date.now() / 1000),
      }
    } catch {
      return {
        orderId: '',
        venue: 'HyperLiquid',
        market: params.market,
        side: params.side,
        sizeUsd: params.sizeUsd,
        entryPrice: null,
        status: 'failed',
        timestamp: Math.floor(Date.now() / 1000),
      }
    }
  }

  async closePosition(userAddress: string, market: string): Promise<OrderResult> {
    // Get current position to determine close side and size
    const positions = await this.getPositions(userAddress)
    const pos = positions.find((p) => p.market === market)

    if (!pos) {
      return {
        orderId: '',
        venue: 'HyperLiquid',
        market,
        side: 'long',
        sizeUsd: 0,
        entryPrice: null,
        status: 'failed',
        timestamp: Math.floor(Date.now() / 1000),
      }
    }

    return this.placeOrder(userAddress, {
      market,
      side: pos.side === 'long' ? 'short' : 'long',
      sizeUsd: pos.sizeUsd,
      leverage: pos.leverage,
      orderType: 'market',
    })
  }

  async getBalance(userAddress: string): Promise<number> {
    try {
      const res = await fetch(`${HYPERLIQUID_API_BASE}/info`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'clearinghouseState',
          user: userAddress,
        }),
      })
      if (!res.ok) return 0
      const data = await res.json()
      return Number(data.marginSummary?.accountValue || 0)
    } catch {
      return 0
    }
  }
}
