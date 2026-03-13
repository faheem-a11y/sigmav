import { NextResponse } from 'next/server'
import { getOpenTrades, getStrategyConfig, insertRebalanceEvent, closeTrade, insertSignal } from '@/lib/db/queries'
import { computeVaultState, checkRebalanceNeeded } from '@/lib/engine/vault-simulator'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const [config, openTrades] = await Promise.all([
      getStrategyConfig(),
      getOpenTrades(),
    ])
    const vault = computeVaultState(config.vaultInitialCapital, openTrades, 0)
    const rebalanceActions = checkRebalanceNeeded(openTrades, vault.totalValueUsd, config)

    for (const action of rebalanceActions) {
      await insertRebalanceEvent(action)

      if (action.action === 'close' && action.tradeId) {
        const trade = openTrades.find((t) => t.id === action.tradeId)
        if (trade) {
          const realizedPnl = trade.fundingCollected - trade.borrowingPaid
          await closeTrade(action.tradeId, action.reason, realizedPnl, trade.currentPrice || trade.entryPrice)

          await insertSignal({
            tokenSymbol: action.tokenSymbol,
            signalType: 'exit',
            action: 'close',
            reason: action.reason,
            executed: true,
            timestamp: Math.floor(Date.now() / 1000),
          })
        }
      }
    }

    return NextResponse.json({
      actionsCount: rebalanceActions.length,
      actions: rebalanceActions,
    })
  } catch (error) {
    console.error('[API] /api/vault/rebalance error:', error)
    return NextResponse.json({ error: 'Failed to rebalance' }, { status: 500 })
  }
}
