import type { Client } from '@libsql/client'

export async function initializeSchema(db: Client): Promise<void> {
  // Turso/LibSQL executeMultiple doesn't support multiple statements well,
  // so we execute each CREATE statement individually
  const statements = [
    `CREATE TABLE IF NOT EXISTS funding_rate_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      market_token TEXT NOT NULL,
      market_name TEXT NOT NULL,
      index_token TEXT NOT NULL,
      token_symbol TEXT NOT NULL,
      funding_rate_long REAL NOT NULL,
      funding_rate_short REAL NOT NULL,
      borrowing_rate_long REAL NOT NULL,
      borrowing_rate_short REAL NOT NULL,
      net_rate_long REAL NOT NULL,
      net_rate_short REAL NOT NULL,
      open_interest_long REAL NOT NULL,
      open_interest_short REAL NOT NULL,
      spot_price REAL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(market_token, timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_frs_market_time
      ON funding_rate_snapshots(market_token, timestamp DESC)`,
    `CREATE INDEX IF NOT EXISTS idx_frs_symbol_time
      ON funding_rate_snapshots(token_symbol, timestamp DESC)`,

    `CREATE TABLE IF NOT EXISTS simulated_venue_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_symbol TEXT NOT NULL,
      venue_name TEXT NOT NULL,
      funding_rate REAL NOT NULL,
      annualized_rate REAL NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(token_symbol, venue_name, timestamp)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_svr_symbol_time
      ON simulated_venue_rates(token_symbol, timestamp DESC)`,

    `CREATE TABLE IF NOT EXISTS opportunities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_symbol TEXT NOT NULL,
      long_venue TEXT NOT NULL,
      short_venue TEXT NOT NULL,
      funding_spread REAL NOT NULL,
      entry_price REAL NOT NULL,
      estimated_apr REAL NOT NULL,
      risk_score REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      detected_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expired_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_opp_status_time
      ON opportunities(status, detected_at DESC)`,

    `CREATE TABLE IF NOT EXISTS paper_trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_id INTEGER REFERENCES opportunities(id),
      token_symbol TEXT NOT NULL,
      direction TEXT NOT NULL DEFAULT 'delta_neutral',
      long_venue TEXT,
      short_venue TEXT,
      entry_price REAL NOT NULL,
      current_price REAL,
      position_size_usd REAL NOT NULL,
      leverage REAL NOT NULL DEFAULT 1.0,
      funding_collected REAL NOT NULL DEFAULT 0,
      borrowing_paid REAL NOT NULL DEFAULT 0,
      unrealized_pnl REAL NOT NULL DEFAULT 0,
      realized_pnl REAL,
      status TEXT NOT NULL DEFAULT 'open',
      opened_at INTEGER NOT NULL DEFAULT (unixepoch()),
      closed_at INTEGER,
      close_reason TEXT
    )`,
    `CREATE INDEX IF NOT EXISTS idx_pt_status
      ON paper_trades(status, opened_at DESC)`,

    `CREATE TABLE IF NOT EXISTS vault_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_value_usd REAL NOT NULL,
      cash_balance REAL NOT NULL,
      positions_value REAL NOT NULL,
      total_pnl REAL NOT NULL,
      cumulative_funding REAL NOT NULL,
      num_positions INTEGER NOT NULL,
      utilization_pct REAL NOT NULL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_vs_time
      ON vault_snapshots(timestamp DESC)`,

    `CREATE TABLE IF NOT EXISTS rebalance_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      trade_id INTEGER REFERENCES paper_trades(id),
      token_symbol TEXT NOT NULL,
      reason TEXT NOT NULL,
      old_size_usd REAL,
      new_size_usd REAL,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    )`,

    `CREATE TABLE IF NOT EXISTS strategy_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      min_funding_spread REAL NOT NULL DEFAULT 0.01,
      max_position_size_usd REAL NOT NULL DEFAULT 10000,
      max_total_positions INTEGER NOT NULL DEFAULT 5,
      max_portfolio_allocation REAL NOT NULL DEFAULT 0.25,
      stop_loss_pct REAL NOT NULL DEFAULT 0.05,
      take_profit_pct REAL NOT NULL DEFAULT 0.10,
      rebalance_threshold REAL NOT NULL DEFAULT 0.005,
      vault_initial_capital REAL NOT NULL DEFAULT 100000,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `INSERT OR IGNORE INTO strategy_config (id) VALUES (1)`,

    `CREATE TABLE IF NOT EXISTS signal_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token_symbol TEXT NOT NULL,
      signal_type TEXT NOT NULL,
      action TEXT NOT NULL,
      reason TEXT NOT NULL,
      funding_spread REAL,
      confidence REAL,
      executed INTEGER NOT NULL DEFAULT 0,
      timestamp INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sl_time
      ON signal_log(timestamp DESC)`,

    // Phase 2: Venue credentials
    `CREATE TABLE IF NOT EXISTS venue_credentials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address TEXT NOT NULL,
      venue TEXT NOT NULL,
      encrypted_api_key TEXT,
      encrypted_api_secret TEXT,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      UNIQUE(user_address, venue)
    )`,

    // Phase 3: Live orders
    `CREATE TABLE IF NOT EXISTS live_orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address TEXT NOT NULL,
      venue TEXT NOT NULL,
      market TEXT NOT NULL,
      side TEXT NOT NULL,
      size_usd REAL NOT NULL,
      leverage REAL NOT NULL DEFAULT 1.0,
      entry_price REAL,
      venue_order_id TEXT,
      tx_hash TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      filled_at INTEGER
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lo_user_status
      ON live_orders(user_address, status)`,

    // Phase 3: Live positions
    `CREATE TABLE IF NOT EXISTS live_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address TEXT NOT NULL,
      venue TEXT NOT NULL,
      market TEXT NOT NULL,
      side TEXT NOT NULL,
      size_usd REAL NOT NULL,
      entry_price REAL NOT NULL,
      mark_price REAL,
      unrealized_pnl REAL NOT NULL DEFAULT 0,
      leverage REAL NOT NULL DEFAULT 1.0,
      liquidation_price REAL,
      funding_accrued REAL NOT NULL DEFAULT 0,
      last_synced INTEGER NOT NULL DEFAULT (unixepoch()),
      status TEXT NOT NULL DEFAULT 'open',
      UNIQUE(user_address, venue, market)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_lp_user_status
      ON live_positions(user_address, status)`,
  ]

  for (const sql of statements) {
    await db.execute(sql)
  }

  // Migration: add venue columns to paper_trades if missing
  try { await db.execute(`ALTER TABLE paper_trades ADD COLUMN long_venue TEXT`) } catch { /* already exists */ }
  try { await db.execute(`ALTER TABLE paper_trades ADD COLUMN short_venue TEXT`) } catch { /* already exists */ }
}
