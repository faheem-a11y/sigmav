# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SigmaV is a **funding rate arbitrage dashboard** for DeFi perpetuals on Avalanche. It monitors GMX V2 perpetual markets, detects funding rate arbitrage opportunities across venues, and runs a paper trading / vault simulation engine. Built with Next.js 14 (App Router), SQLite (better-sqlite3), and Tailwind CSS.

## Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

### Data Flow

The app runs a **cron loop** triggered client-side every 30s (`POST /api/cron`). Each tick:
1. Fetches live market data from GMX V2 Avalanche API (`src/lib/api/gmx.ts`)
2. Generates simulated rates for other venues (HyperLiquid, Paradex)
3. Detects arbitrage opportunities based on funding rate spreads
4. Updates open paper trades (PnL, funding collected, borrowing paid)
5. Checks exit conditions (stop-loss, take-profit, spread collapse)
6. Stores a vault snapshot

### Key Layers

- **`src/lib/api/gmx.ts`** — GMX V2 API client. Fetches markets and tickers, parses 1e30-scaled values. Has in-memory cache (10s TTL).
- **`src/lib/engine/`** — Core strategy logic:
  - `funding-analyzer.ts` — Generates simulated venue rates from GMX base rates
  - `opportunity-detector.ts` — Detects cross-venue funding spread opportunities
  - `paper-trader.ts` — Updates position state (funding accrual, PnL)
  - `vault-simulator.ts` — Computes aggregate vault state from positions
  - `risk-manager.ts` — Risk scoring and position sizing
- **`src/lib/db/`** — SQLite via better-sqlite3. Schema auto-initializes on first access. Database stored at `./data/sigmav.db` (WAL mode).
- **`src/lib/hooks/`** — SWR-based React hooks for API polling
- **`src/components/`** — UI organized by domain: `dashboard/`, `markets/`, `vault/`, `strategy/`, `charts/`, `layout/`, `ui/`

### API Routes (`src/app/api/`)

All routes are under the Next.js App Router. Key endpoints:
- `cron` — Main tick (fetches data, runs strategy, updates DB)
- `markets`, `prices`, `funding-rates` — Market data proxies
- `opportunities` — Detected arbitrage opportunities
- `paper-trade` — CRUD for paper trades
- `vault` — Vault state and history
- `strategy` — Strategy config read/update

### Database

SQLite with tables: `funding_rate_snapshots`, `simulated_venue_rates`, `opportunities`, `paper_trades`, `vault_snapshots`, `rebalance_events`, `strategy_config`, `signal_log`. Schema defined in `src/lib/db/schema.ts`.

### Styling

Dark terminal-aesthetic theme using custom `sigma-*` Tailwind color tokens (green/black palette). Uses `clsx` + `tailwind-merge` for class composition. Icons from `lucide-react`, charts from `recharts`.

## Environment Variables

Configured in `.env.local` (gitignored). Key vars:
- `NEXT_PUBLIC_GMX_API_BASE` — GMX API endpoint (default: Avalanche)
- `DATABASE_PATH` — SQLite path (default: `./data/sigmav.db`)
- `NEXT_PUBLIC_POLLING_INTERVAL` — Client polling interval in ms

## Path Aliases

`@/*` maps to `./src/*` (configured in tsconfig.json).

## GMX Rate Precision

GMX returns values scaled by 1e30. The `parseGmxRate()` function converts to hourly rate; `parseGmxOI()` converts to USD. When working with raw GMX data, always use these helpers.
