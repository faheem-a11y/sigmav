export type OrderSide = 'long' | 'short'
export type OrderType = 'market' | 'limit'
export type OrderStatus = 'pending' | 'submitted' | 'filled' | 'cancelled' | 'failed'

export interface OrderParams {
  market: string
  side: OrderSide
  sizeUsd: number
  leverage: number
  orderType: OrderType
  limitPrice?: number
}

export interface OrderResult {
  orderId: string
  venue: string
  market: string
  side: OrderSide
  sizeUsd: number
  entryPrice: number | null
  status: OrderStatus
  txHash?: string
  timestamp: number
  // For GMX: unsigned transaction to be signed by client
  unsignedTx?: {
    to: string
    data: string
    value: string
  }
}

export interface Position {
  venue: string
  market: string
  side: OrderSide
  sizeUsd: number
  entryPrice: number
  markPrice: number
  unrealizedPnl: number
  leverage: number
  liquidationPrice: number | null
  fundingAccrued: number
}

export interface ExchangeAdapter {
  venue: string
  getPositions(userAddress: string): Promise<Position[]>
  placeOrder(userAddress: string, params: OrderParams): Promise<OrderResult>
  closePosition(userAddress: string, market: string): Promise<OrderResult>
  getBalance(userAddress: string): Promise<number>
}
