import { getDb } from './index'
import type { Row, InValue } from '@libsql/client'

export interface LiveOrder {
  id: number
  userAddress: string
  venue: string
  market: string
  side: string
  sizeUsd: number
  leverage: number
  entryPrice: number | null
  venueOrderId: string | null
  txHash: string | null
  status: string
  createdAt: number
  filledAt: number | null
}

export interface LivePosition {
  id: number
  userAddress: string
  venue: string
  market: string
  side: string
  sizeUsd: number
  entryPrice: number
  markPrice: number | null
  unrealizedPnl: number
  leverage: number
  liquidationPrice: number | null
  fundingAccrued: number
  lastSynced: number
  status: string
}

function mapOrder(row: Row): LiveOrder {
  return {
    id: row.id as number,
    userAddress: row.user_address as string,
    venue: row.venue as string,
    market: row.market as string,
    side: row.side as string,
    sizeUsd: row.size_usd as number,
    leverage: row.leverage as number,
    entryPrice: row.entry_price as number | null,
    venueOrderId: row.venue_order_id as string | null,
    txHash: row.tx_hash as string | null,
    status: row.status as string,
    createdAt: row.created_at as number,
    filledAt: row.filled_at as number | null,
  }
}

function mapPosition(row: Row): LivePosition {
  return {
    id: row.id as number,
    userAddress: row.user_address as string,
    venue: row.venue as string,
    market: row.market as string,
    side: row.side as string,
    sizeUsd: row.size_usd as number,
    entryPrice: row.entry_price as number,
    markPrice: row.mark_price as number | null,
    unrealizedPnl: row.unrealized_pnl as number,
    leverage: row.leverage as number,
    liquidationPrice: row.liquidation_price as number | null,
    fundingAccrued: row.funding_accrued as number,
    lastSynced: row.last_synced as number,
    status: row.status as string,
  }
}

// Orders
export async function insertOrder(order: Omit<LiveOrder, 'id' | 'createdAt' | 'filledAt'>): Promise<number> {
  const db = await getDb()
  const result = await db.execute({
    sql: `INSERT INTO live_orders (user_address, venue, market, side, size_usd, leverage, entry_price, venue_order_id, tx_hash, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [order.userAddress, order.venue, order.market, order.side, order.sizeUsd, order.leverage, order.entryPrice, order.venueOrderId, order.txHash, order.status],
  })
  return Number(result.lastInsertRowid)
}

export async function updateOrderStatus(id: number, status: string, txHash?: string, entryPrice?: number): Promise<void> {
  const db = await getDb()
  const updates: string[] = ['status = ?']
  const args: InValue[] = [status]
  if (txHash) { updates.push('tx_hash = ?'); args.push(txHash) }
  if (entryPrice) { updates.push('entry_price = ?'); args.push(entryPrice) }
  if (status === 'filled') { updates.push('filled_at = unixepoch()') }
  args.push(id)
  await db.execute({
    sql: `UPDATE live_orders SET ${updates.join(', ')} WHERE id = ?`,
    args,
  })
}

export async function getUserOrders(userAddress: string, limit = 50): Promise<LiveOrder[]> {
  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT * FROM live_orders WHERE user_address = ? ORDER BY created_at DESC LIMIT ?`,
    args: [userAddress, limit],
  })
  return result.rows.map(mapOrder)
}

// Positions
export async function upsertPosition(pos: Omit<LivePosition, 'id' | 'lastSynced'>): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `INSERT INTO live_positions (user_address, venue, market, side, size_usd, entry_price, mark_price, unrealized_pnl, leverage, liquidation_price, funding_accrued, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_address, venue, market) DO UPDATE SET
        size_usd = excluded.size_usd,
        mark_price = excluded.mark_price,
        unrealized_pnl = excluded.unrealized_pnl,
        leverage = excluded.leverage,
        liquidation_price = excluded.liquidation_price,
        funding_accrued = excluded.funding_accrued,
        last_synced = unixepoch(),
        status = excluded.status`,
    args: [pos.userAddress, pos.venue, pos.market, pos.side, pos.sizeUsd, pos.entryPrice, pos.markPrice, pos.unrealizedPnl, pos.leverage, pos.liquidationPrice, pos.fundingAccrued, pos.status],
  })
}

export async function getUserPositions(userAddress: string): Promise<LivePosition[]> {
  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT * FROM live_positions WHERE user_address = ? AND status = 'open' ORDER BY last_synced DESC`,
    args: [userAddress],
  })
  return result.rows.map(mapPosition)
}

export async function closeUserPosition(userAddress: string, venue: string, market: string): Promise<void> {
  const db = await getDb()
  await db.execute({
    sql: `UPDATE live_positions SET status = 'closed' WHERE user_address = ? AND venue = ? AND market = ?`,
    args: [userAddress, venue, market],
  })
}
