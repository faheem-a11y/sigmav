import type { ExchangeAdapter } from './types'
import { GmxAdapter } from './gmx-adapter'
import { HyperLiquidAdapter } from './hyperliquid-adapter'
import { ParadexAdapter } from './paradex-adapter'

const adapters: Record<string, ExchangeAdapter> = {
  GMX: new GmxAdapter(),
  HyperLiquid: new HyperLiquidAdapter(),
  Paradex: new ParadexAdapter(),
}

export function getAdapter(venue: string): ExchangeAdapter | null {
  return adapters[venue] || null
}

export function getAvailableVenues(): string[] {
  return Object.keys(adapters)
}

export function registerAdapter(venue: string, adapter: ExchangeAdapter) {
  adapters[venue] = adapter
}
