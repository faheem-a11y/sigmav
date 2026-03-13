import { getDb } from "./index";
import type { Row } from "@libsql/client";
import type {
  FundingRateSnapshot,
  SimulatedVenueRate,
  Opportunity,
  PaperTrade,
  VaultSnapshot,
  StrategyConfig,
  Signal,
  RebalanceEvent,
} from "../utils/types";

// ── Funding Rate Snapshots ──────────────────────────────────────────────

export async function insertFundingRateSnapshot(s: FundingRateSnapshot): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO funding_rate_snapshots
    (market_token, market_name, index_token, token_symbol,
     funding_rate_long, funding_rate_short, borrowing_rate_long, borrowing_rate_short,
     net_rate_long, net_rate_short, open_interest_long, open_interest_short, spot_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      s.marketToken, s.marketName, s.indexToken, s.tokenSymbol,
      s.fundingRateLong, s.fundingRateShort, s.borrowingRateLong, s.borrowingRateShort,
      s.netRateLong, s.netRateShort, s.openInterestLong, s.openInterestShort, s.spotPrice,
    ],
  });
}

export async function getLatestFundingRates(): Promise<FundingRateSnapshot[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT * FROM funding_rate_snapshots
     WHERE timestamp = (SELECT MAX(timestamp) FROM funding_rate_snapshots)
     ORDER BY token_symbol`
  );
  return result.rows as unknown as FundingRateSnapshot[];
}

export async function getFundingRateHistory(
  marketToken: string,
  hours: number,
): Promise<FundingRateSnapshot[]> {
  const db = await getDb();
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const result = await db.execute({
    sql: `SELECT * FROM funding_rate_snapshots WHERE market_token = ? AND timestamp > ? ORDER BY timestamp ASC`,
    args: [marketToken, since],
  });
  return result.rows as unknown as FundingRateSnapshot[];
}

export async function getFundingRateHistoryBySymbol(
  tokenSymbol: string,
  hours: number,
): Promise<FundingRateSnapshot[]> {
  const db = await getDb();
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const result = await db.execute({
    sql: `SELECT * FROM funding_rate_snapshots WHERE token_symbol = ? AND timestamp > ? ORDER BY timestamp DESC`,
    args: [tokenSymbol, since],
  });
  return result.rows as unknown as FundingRateSnapshot[];
}

// ── Simulated Venue Rates ───────────────────────────────────────────────

export async function insertSimulatedVenueRate(r: SimulatedVenueRate): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT OR IGNORE INTO simulated_venue_rates (token_symbol, venue_name, funding_rate, annualized_rate) VALUES (?, ?, ?, ?)`,
    args: [r.tokenSymbol, r.venueName, r.fundingRate, r.annualizedRate],
  });
}

export async function getVenueRateHistory(
  tokenSymbol: string,
  hours: number,
): Promise<SimulatedVenueRate[]> {
  const db = await getDb();
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const result = await db.execute({
    sql: `SELECT * FROM simulated_venue_rates WHERE token_symbol = ? AND timestamp > ? ORDER BY timestamp DESC`,
    args: [tokenSymbol, since],
  });
  return result.rows as unknown as SimulatedVenueRate[];
}

export async function getLatestVenueRates(tokenSymbol: string): Promise<SimulatedVenueRate[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM simulated_venue_rates WHERE token_symbol = ?
     AND timestamp = (SELECT MAX(timestamp) FROM simulated_venue_rates WHERE token_symbol = ?)`,
    args: [tokenSymbol, tokenSymbol],
  });
  return result.rows as unknown as SimulatedVenueRate[];
}

// ── Opportunities ───────────────────────────────────────────────────────

export async function insertOpportunity(o: Opportunity): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO opportunities (token_symbol, long_venue, short_venue, funding_spread, entry_price, estimated_apr, risk_score, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    args: [o.tokenSymbol, o.longVenue, o.shortVenue, o.fundingSpread, o.entryPrice, o.estimatedApr, o.riskScore],
  });
  return Number(result.lastInsertRowid);
}

export async function getActiveOpportunities(): Promise<Opportunity[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT * FROM opportunities WHERE status = 'active' ORDER BY estimated_apr DESC`
  );
  return result.rows as unknown as Opportunity[];
}

export async function expireOldOpportunities(maxAgeMinutes: number): Promise<number> {
  const db = await getDb();
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeMinutes * 60;
  const result = await db.execute({
    sql: `UPDATE opportunities SET status = 'expired', expired_at = unixepoch() WHERE status = 'active' AND detected_at < ?`,
    args: [cutoff],
  });
  return result.rowsAffected;
}

export async function markOpportunityTaken(id: number): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE opportunities SET status = 'taken' WHERE id = ?`,
    args: [id],
  });
}

// ── Paper Trades ────────────────────────────────────────────────────────

export async function insertPaperTrade(t: PaperTrade): Promise<number> {
  const db = await getDb();
  const result = await db.execute({
    sql: `INSERT INTO paper_trades (opportunity_id, token_symbol, direction, long_venue, short_venue, entry_price, current_price, position_size_usd, leverage) VALUES (?, ?, 'delta_neutral', ?, ?, ?, ?, ?, 1.0)`,
    args: [
      t.opportunityId || null, t.tokenSymbol,
      t.longVenue || null, t.shortVenue || null,
      t.entryPrice, t.entryPrice, t.positionSizeUsd,
    ],
  });
  return Number(result.lastInsertRowid);
}

function mapTrade(row: Row): PaperTrade {
  return {
    id: row.id as number,
    opportunityId: row.opportunity_id as number | undefined,
    tokenSymbol: row.token_symbol as string,
    direction: "delta_neutral",
    longVenue: (row.long_venue as string) || undefined,
    shortVenue: (row.short_venue as string) || undefined,
    entryPrice: row.entry_price as number,
    currentPrice: row.current_price as number | undefined,
    positionSizeUsd: row.position_size_usd as number,
    leverage: row.leverage as number,
    fundingCollected: row.funding_collected as number,
    borrowingPaid: row.borrowing_paid as number,
    unrealizedPnl: row.unrealized_pnl as number,
    realizedPnl: row.realized_pnl as number | undefined,
    status: row.status as "open" | "closed" | "liquidated",
    openedAt: row.opened_at as number,
    closedAt: row.closed_at as number | undefined,
    closeReason: row.close_reason as string | undefined,
  };
}

export async function getOpenTrades(): Promise<PaperTrade[]> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT * FROM paper_trades WHERE status = 'open' ORDER BY opened_at DESC`
  );
  return result.rows.map(mapTrade);
}

export async function getAllTrades(limit = 50): Promise<PaperTrade[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM paper_trades ORDER BY opened_at DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows.map(mapTrade);
}

export async function getTradeById(id: number): Promise<PaperTrade | undefined> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM paper_trades WHERE id = ?`,
    args: [id],
  });
  return result.rows[0] ? mapTrade(result.rows[0]) : undefined;
}

export async function updateTradeState(
  id: number,
  currentPrice: number,
  fundingCollected: number,
  borrowingPaid: number,
  unrealizedPnl: number,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE paper_trades SET current_price = ?, funding_collected = ?, borrowing_paid = ?, unrealized_pnl = ? WHERE id = ?`,
    args: [currentPrice, fundingCollected, borrowingPaid, unrealizedPnl, id],
  });
}

export async function closeTrade(
  id: number,
  reason: string,
  realizedPnl: number,
  currentPrice: number,
): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE paper_trades SET status = 'closed', closed_at = unixepoch(), close_reason = ?, realized_pnl = ?, current_price = ? WHERE id = ?`,
    args: [reason, realizedPnl, currentPrice, id],
  });
}

// ── Vault Snapshots ─────────────────────────────────────────────────────

export async function insertVaultSnapshot(s: VaultSnapshot): Promise<void> {
  if (!isFinite(s.totalValueUsd)) return;
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO vault_snapshots (total_value_usd, cash_balance, positions_value, total_pnl, cumulative_funding, num_positions, utilization_pct) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [s.totalValueUsd, s.cashBalance, s.positionsValue, s.totalPnl, s.cumulativeFunding, s.numPositions, s.utilizationPct],
  });
}

function mapVaultSnapshot(row: Row): VaultSnapshot {
  return {
    id: row.id as number,
    totalValueUsd: row.total_value_usd as number,
    cashBalance: row.cash_balance as number,
    positionsValue: row.positions_value as number,
    totalPnl: row.total_pnl as number,
    cumulativeFunding: row.cumulative_funding as number,
    numPositions: row.num_positions as number,
    utilizationPct: row.utilization_pct as number,
    timestamp: row.timestamp as number,
  };
}

export async function getVaultHistory(hours: number): Promise<VaultSnapshot[]> {
  const db = await getDb();
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  const result = await db.execute({
    sql: `SELECT * FROM vault_snapshots WHERE timestamp > ? ORDER BY timestamp ASC`,
    args: [since],
  });
  return result.rows.map(mapVaultSnapshot);
}

export async function getLatestVaultSnapshot(): Promise<VaultSnapshot | null> {
  const db = await getDb();
  const result = await db.execute(
    `SELECT * FROM vault_snapshots ORDER BY timestamp DESC LIMIT 1`
  );
  return result.rows[0] ? mapVaultSnapshot(result.rows[0]) : null;
}

// ── Strategy Config ─────────────────────────────────────────────────────

export async function getStrategyConfig(): Promise<StrategyConfig> {
  const db = await getDb();
  const result = await db.execute(`SELECT * FROM strategy_config WHERE id = 1`);
  const row = result.rows[0];
  return {
    minFundingSpread: row.min_funding_spread as number,
    maxPositionSizeUsd: row.max_position_size_usd as number,
    maxTotalPositions: row.max_total_positions as number,
    maxPortfolioAllocation: row.max_portfolio_allocation as number,
    stopLossPct: row.stop_loss_pct as number,
    takeProfitPct: row.take_profit_pct as number,
    rebalanceThreshold: row.rebalance_threshold as number,
    vaultInitialCapital: row.vault_initial_capital as number,
    updatedAt: row.updated_at as number,
  };
}

export async function updateStrategyConfig(c: StrategyConfig): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `UPDATE strategy_config SET min_funding_spread = ?, max_position_size_usd = ?, max_total_positions = ?,
    max_portfolio_allocation = ?, stop_loss_pct = ?, take_profit_pct = ?,
    rebalance_threshold = ?, vault_initial_capital = ?, updated_at = unixepoch() WHERE id = 1`,
    args: [
      c.minFundingSpread, c.maxPositionSizeUsd, c.maxTotalPositions,
      c.maxPortfolioAllocation, c.stopLossPct, c.takeProfitPct,
      c.rebalanceThreshold, c.vaultInitialCapital,
    ],
  });
}

// ── Signal Log ──────────────────────────────────────────────────────────

export async function insertSignal(s: Signal): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO signal_log (token_symbol, signal_type, action, reason, funding_spread, confidence, executed) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    args: [s.tokenSymbol, s.signalType, s.action, s.reason, s.fundingSpread || null, s.confidence || null, s.executed ? 1 : 0],
  });
}

export async function getRecentSignals(limit = 50): Promise<Signal[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM signal_log ORDER BY timestamp DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as Signal[];
}

// ── Rebalance Events ────────────────────────────────────────────────────

export async function insertRebalanceEvent(e: RebalanceEvent): Promise<void> {
  const db = await getDb();
  await db.execute({
    sql: `INSERT INTO rebalance_events (action, trade_id, token_symbol, reason, old_size_usd, new_size_usd) VALUES (?, ?, ?, ?, ?, ?)`,
    args: [e.action, e.tradeId || null, e.tokenSymbol, e.reason, e.oldSizeUsd || null, e.newSizeUsd || null],
  });
}

export async function getRebalanceHistory(limit = 50): Promise<RebalanceEvent[]> {
  const db = await getDb();
  const result = await db.execute({
    sql: `SELECT * FROM rebalance_events ORDER BY timestamp DESC LIMIT ?`,
    args: [limit],
  });
  return result.rows as unknown as RebalanceEvent[];
}
