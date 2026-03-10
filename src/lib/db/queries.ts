import { getDb } from "./index";
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

function db() {
  return getDb();
}

export function insertFundingRateSnapshot(s: FundingRateSnapshot): void {
  db()
    .prepare(
      `
    INSERT OR IGNORE INTO funding_rate_snapshots
    (market_token, market_name, index_token, token_symbol,
     funding_rate_long, funding_rate_short, borrowing_rate_long, borrowing_rate_short,
     net_rate_long, net_rate_short, open_interest_long, open_interest_short, spot_price)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      s.marketToken,
      s.marketName,
      s.indexToken,
      s.tokenSymbol,
      s.fundingRateLong,
      s.fundingRateShort,
      s.borrowingRateLong,
      s.borrowingRateShort,
      s.netRateLong,
      s.netRateShort,
      s.openInterestLong,
      s.openInterestShort,
      s.spotPrice,
    );
}

export function getLatestFundingRates(): FundingRateSnapshot[] {
  return db()
    .prepare(
      `
    SELECT * FROM funding_rate_snapshots
    WHERE timestamp = (SELECT MAX(timestamp) FROM funding_rate_snapshots)
    ORDER BY token_symbol
  `,
    )
    .all() as FundingRateSnapshot[];
}

export function getFundingRateHistory(
  marketToken: string,
  hours: number,
): FundingRateSnapshot[] {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return db()
    .prepare(
      `
    SELECT * FROM funding_rate_snapshots WHERE market_token = ? AND timestamp > ? ORDER BY timestamp ASC
  `,
    )
    .all(marketToken, since) as FundingRateSnapshot[];
}

export function insertSimulatedVenueRate(r: SimulatedVenueRate): void {
  db()
    .prepare(
      `
    INSERT OR IGNORE INTO simulated_venue_rates (token_symbol, venue_name, funding_rate, annualized_rate)
    VALUES (?, ?, ?, ?)
  `,
    )
    .run(r.tokenSymbol, r.venueName, r.fundingRate, r.annualizedRate);
}

export function getVenueRateHistory(
  tokenSymbol: string,
  hours: number,
): SimulatedVenueRate[] {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return db()
    .prepare(
      `
    SELECT * FROM simulated_venue_rates
    WHERE token_symbol = ? AND timestamp > ?
    ORDER BY timestamp DESC
  `,
    )
    .all(tokenSymbol, since) as SimulatedVenueRate[];
}

export function getFundingRateHistoryBySymbol(
  tokenSymbol: string,
  hours: number,
): FundingRateSnapshot[] {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return db()
    .prepare(
      `
    SELECT * FROM funding_rate_snapshots
    WHERE token_symbol = ? AND timestamp > ?
    ORDER BY timestamp DESC
  `,
    )
    .all(tokenSymbol, since) as FundingRateSnapshot[];
}

export function getLatestVenueRates(tokenSymbol: string): SimulatedVenueRate[] {
  return db()
    .prepare(
      `
    SELECT * FROM simulated_venue_rates WHERE token_symbol = ?
    AND timestamp = (SELECT MAX(timestamp) FROM simulated_venue_rates WHERE token_symbol = ?)
  `,
    )
    .all(tokenSymbol, tokenSymbol) as SimulatedVenueRate[];
}

export function insertOpportunity(o: Opportunity): number {
  const result = db()
    .prepare(
      `
    INSERT INTO opportunities (token_symbol, long_venue, short_venue, funding_spread, entry_price, estimated_apr, risk_score, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
  `,
    )
    .run(
      o.tokenSymbol,
      o.longVenue,
      o.shortVenue,
      o.fundingSpread,
      o.entryPrice,
      o.estimatedApr,
      o.riskScore,
    );
  return Number(result.lastInsertRowid);
}

export function getActiveOpportunities(): Opportunity[] {
  return db()
    .prepare(
      `SELECT * FROM opportunities WHERE status = 'active' ORDER BY estimated_apr DESC`,
    )
    .all() as Opportunity[];
}

export function expireOldOpportunities(maxAgeMinutes: number): number {
  const cutoff = Math.floor(Date.now() / 1000) - maxAgeMinutes * 60;
  return db()
    .prepare(
      `UPDATE opportunities SET status = 'expired', expired_at = unixepoch() WHERE status = 'active' AND detected_at < ?`,
    )
    .run(cutoff).changes;
}

export function markOpportunityTaken(id: number): void {
  db()
    .prepare(`UPDATE opportunities SET status = 'taken' WHERE id = ?`)
    .run(id);
}

export function insertPaperTrade(t: PaperTrade): number {
  const result = db()
    .prepare(
      `
    INSERT INTO paper_trades (opportunity_id, token_symbol, direction, long_venue, short_venue, entry_price, current_price, position_size_usd, leverage)
    VALUES (?, ?, 'delta_neutral', ?, ?, ?, ?, ?, 1.0)
  `,
    )
    .run(
      t.opportunityId || null,
      t.tokenSymbol,
      t.longVenue || null,
      t.shortVenue || null,
      t.entryPrice,
      t.entryPrice,
      t.positionSizeUsd,
    );
  return Number(result.lastInsertRowid);
}

function mapTrade(row: Record<string, unknown>): PaperTrade {
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

export function getOpenTrades(): PaperTrade[] {
  return (
    db()
      .prepare(
        `SELECT * FROM paper_trades WHERE status = 'open' ORDER BY opened_at DESC`,
      )
      .all() as Record<string, unknown>[]
  ).map(mapTrade);
}

export function getAllTrades(limit = 50): PaperTrade[] {
  return (
    db()
      .prepare(`SELECT * FROM paper_trades ORDER BY opened_at DESC LIMIT ?`)
      .all(limit) as Record<string, unknown>[]
  ).map(mapTrade);
}

export function getTradeById(id: number): PaperTrade | undefined {
  const row = db()
    .prepare(`SELECT * FROM paper_trades WHERE id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? mapTrade(row) : undefined;
}

export function updateTradeState(
  id: number,
  currentPrice: number,
  fundingCollected: number,
  borrowingPaid: number,
  unrealizedPnl: number,
): void {
  db()
    .prepare(
      `UPDATE paper_trades SET current_price = ?, funding_collected = ?, borrowing_paid = ?, unrealized_pnl = ? WHERE id = ?`,
    )
    .run(currentPrice, fundingCollected, borrowingPaid, unrealizedPnl, id);
}

export function closeTrade(
  id: number,
  reason: string,
  realizedPnl: number,
  currentPrice: number,
): void {
  db()
    .prepare(
      `UPDATE paper_trades SET status = 'closed', closed_at = unixepoch(), close_reason = ?, realized_pnl = ?, current_price = ? WHERE id = ?`,
    )
    .run(reason, realizedPnl, currentPrice, id);
}

export function insertVaultSnapshot(s: VaultSnapshot): void {
  if (!isFinite(s.totalValueUsd)) return;
  db()
    .prepare(
      `
    INSERT INTO vault_snapshots (total_value_usd, cash_balance, positions_value, total_pnl, cumulative_funding, num_positions, utilization_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `,
    )
    .run(
      s.totalValueUsd,
      s.cashBalance,
      s.positionsValue,
      s.totalPnl,
      s.cumulativeFunding,
      s.numPositions,
      s.utilizationPct,
    );
}

function mapVaultSnapshot(row: Record<string, unknown>): VaultSnapshot {
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

export function getVaultHistory(hours: number): VaultSnapshot[] {
  const since = Math.floor(Date.now() / 1000) - hours * 3600;
  return (
    db()
      .prepare(
        `SELECT * FROM vault_snapshots WHERE timestamp > ? ORDER BY timestamp ASC`,
      )
      .all(since) as Record<string, unknown>[]
  ).map(mapVaultSnapshot);
}

export function getLatestVaultSnapshot(): VaultSnapshot | null {
  const row = db()
    .prepare(`SELECT * FROM vault_snapshots ORDER BY timestamp DESC LIMIT 1`)
    .get() as Record<string, unknown> | undefined;
  return row ? mapVaultSnapshot(row) : null;
}

export function getStrategyConfig(): StrategyConfig {
  const row = db()
    .prepare(`SELECT * FROM strategy_config WHERE id = 1`)
    .get() as Record<string, unknown>;
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

export function updateStrategyConfig(c: StrategyConfig): void {
  db()
    .prepare(
      `
    UPDATE strategy_config SET min_funding_spread = ?, max_position_size_usd = ?, max_total_positions = ?,
    max_portfolio_allocation = ?, stop_loss_pct = ?, take_profit_pct = ?,
    rebalance_threshold = ?, vault_initial_capital = ?, updated_at = unixepoch() WHERE id = 1
  `,
    )
    .run(
      c.minFundingSpread,
      c.maxPositionSizeUsd,
      c.maxTotalPositions,
      c.maxPortfolioAllocation,
      c.stopLossPct,
      c.takeProfitPct,
      c.rebalanceThreshold,
      c.vaultInitialCapital,
    );
}

export function insertSignal(s: Signal): void {
  db()
    .prepare(
      `INSERT INTO signal_log (token_symbol, signal_type, action, reason, funding_spread, confidence, executed) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      s.tokenSymbol,
      s.signalType,
      s.action,
      s.reason,
      s.fundingSpread || null,
      s.confidence || null,
      s.executed ? 1 : 0,
    );
}

export function getRecentSignals(limit = 50): Signal[] {
  return db()
    .prepare(`SELECT * FROM signal_log ORDER BY timestamp DESC LIMIT ?`)
    .all(limit) as Signal[];
}

export function insertRebalanceEvent(e: RebalanceEvent): void {
  db()
    .prepare(
      `INSERT INTO rebalance_events (action, trade_id, token_symbol, reason, old_size_usd, new_size_usd) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(
      e.action,
      e.tradeId || null,
      e.tokenSymbol,
      e.reason,
      e.oldSizeUsd || null,
      e.newSizeUsd || null,
    );
}

export function getRebalanceHistory(limit = 50): RebalanceEvent[] {
  return db()
    .prepare(`SELECT * FROM rebalance_events ORDER BY timestamp DESC LIMIT ?`)
    .all(limit) as RebalanceEvent[];
}
