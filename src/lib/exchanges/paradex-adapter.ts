import type { ExchangeAdapter, OrderParams, OrderResult, Position } from './types'
import { getCredential } from '../db/venue-credentials'
import { PARADEX_API_BASE } from '../utils/constants'

export class ParadexAdapter implements ExchangeAdapter {
  venue = 'Paradex'

  private async getAuthHeaders(userAddress: string): Promise<Record<string, string> | null> {
    const creds = await getCredential(userAddress, 'Paradex')
    if (!creds) return null
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${creds.apiKey}`,
    }
  }

  async getPositions(userAddress: string): Promise<Position[]> {
    const headers = await this.getAuthHeaders(userAddress)
    if (!headers) return []

    try {
      const res = await fetch(`${PARADEX_API_BASE}/v1/positions`, { headers })
      if (!res.ok) return []
      const data = await res.json()

      if (!data.results) return []

      return data.results
        .filter((p: { size: string }) => Number(p.size) !== 0)
        .map((p: Record<string, string | number>) => {
          const size = Number(p.size || 0)
          return {
            venue: 'Paradex',
            market: String(p.market || '').replace('-USD-PERP', ''),
            side: size > 0 ? 'long' as const : 'short' as const,
            sizeUsd: Math.abs(size) * Number(p.avg_entry_price || 0),
            entryPrice: Number(p.avg_entry_price || 0),
            markPrice: Number(p.mark_price || p.avg_entry_price || 0),
            unrealizedPnl: Number(p.unrealized_pnl || 0),
            leverage: Number(p.leverage || 1),
            liquidationPrice: p.liquidation_price ? Number(p.liquidation_price) : null,
            fundingAccrued: Number(p.realized_funding || 0),
          }
        })
    } catch {
      return []
    }
  }

  async placeOrder(userAddress: string, params: OrderParams): Promise<OrderResult> {
    const headers = await this.getAuthHeaders(userAddress)
    if (!headers) {
      return {
        orderId: '',
        venue: 'Paradex',
        market: params.market,
        side: params.side,
        sizeUsd: params.sizeUsd,
        entryPrice: null,
        status: 'failed',
        timestamp: Math.floor(Date.now() / 1000),
      }
    }

    try {
      const marketSymbol = `${params.market}-USD-PERP`
      const isBuy = params.side === 'long'

      const orderBody: Record<string, unknown> = {
        market: marketSymbol,
        side: isBuy ? 'BUY' : 'SELL',
        type: params.orderType === 'market' ? 'MARKET' : 'LIMIT',
        size: (params.sizeUsd / (params.limitPrice || 1)).toFixed(4),
      }

      if (params.orderType === 'limit' && params.limitPrice) {
        orderBody.price = params.limitPrice.toFixed(2)
      }

      const res = await fetch(`${PARADEX_API_BASE}/v1/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify(orderBody),
      })

      const result = await res.json()

      return {
        orderId: result.id?.toString() || `pdx-${Date.now()}`,
        venue: 'Paradex',
        market: params.market,
        side: params.side,
        sizeUsd: params.sizeUsd,
        entryPrice: params.limitPrice || null,
        status: res.ok ? 'submitted' : 'failed',
        timestamp: Math.floor(Date.now() / 1000),
      }
    } catch {
      return {
        orderId: '',
        venue: 'Paradex',
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
    const positions = await this.getPositions(userAddress)
    const pos = positions.find((p) => p.market === market)

    if (!pos) {
      return {
        orderId: '',
        venue: 'Paradex',
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
    const headers = await this.getAuthHeaders(userAddress)
    if (!headers) return 0

    try {
      const res = await fetch(`${PARADEX_API_BASE}/v1/account`, { headers })
      if (!res.ok) return 0
      const data = await res.json()
      return Number(data.equity || 0)
    } catch {
      return 0
    }
  }
}
