import { NextRequest, NextResponse } from 'next/server'
import {
  getOpenTrades,
  getAllTrades,
  getStrategyConfig,
  insertPaperTrade,
  insertSignal,
} from '@/lib/db/queries'
import { openDeltaNeutralPosition } from '@/lib/engine/paper-trader'
import { checkRiskLimits, calculateOptimalSize } from '@/lib/engine/risk-manager'
import { computeVaultState } from '@/lib/engine/vault-simulator'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const trades = await getAllTrades(100)
    return NextResponse.json(trades)
  } catch (error) {
    console.error('[API] GET /api/paper-trade error:', error)
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokenSymbol, entryPrice, longVenue, shortVenue, estimatedApr, riskScore } = body

    if (!tokenSymbol || !entryPrice) {
      return NextResponse.json({ error: 'tokenSymbol and entryPrice required' }, { status: 400 })
    }

    const [config, openTrades, allTrades] = await Promise.all([
      getStrategyConfig(),
      getOpenTrades(),
      getAllTrades(200),
    ])

    const closedPnl = allTrades
      .filter((t) => t.status === 'closed' && t.realizedPnl != null)
      .reduce((sum, t) => sum + (t.realizedPnl || 0), 0)

    const vault = computeVaultState(config.vaultInitialCapital, openTrades, closedPnl)

    const positionSize = calculateOptimalSize(vault, estimatedApr || 0.05, riskScore || 50, config)

    const riskCheck = checkRiskLimits(vault, positionSize, openTrades, config)
    if (!riskCheck.allowed) {
      return NextResponse.json({ error: riskCheck.reason }, { status: 400 })
    }

    const opportunity = {
      id: undefined,
      tokenSymbol,
      longVenue: longVenue || 'GMX',
      shortVenue: shortVenue || 'GMX',
      fundingSpread: 0,
      entryPrice,
      estimatedApr: estimatedApr || 0,
      riskScore: riskScore || 50,
      status: 'taken' as const,
      detectedAt: Math.floor(Date.now() / 1000),
    }

    const trade = openDeltaNeutralPosition(opportunity, entryPrice, positionSize)
    const tradeId = await insertPaperTrade(trade)

    await insertSignal({
      tokenSymbol,
      signalType: 'entry',
      action: 'open_delta_neutral',
      reason: `Spread: ${longVenue} vs ${shortVenue}, APR: ${((estimatedApr || 0) * 100).toFixed(2)}%`,
      fundingSpread: estimatedApr,
      confidence: riskScore ? 1 - riskScore / 100 : 0.5,
      executed: true,
      timestamp: Math.floor(Date.now() / 1000),
    })

    return NextResponse.json({ id: tradeId, ...trade })
  } catch (error) {
    console.error('[API] POST /api/paper-trade error:', error)
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 })
  }
}
