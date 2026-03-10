import type { MarketData, Opportunity, PaperTrade, SimulatedVenueRate, StrategyConfig } from '../utils/types'
import { getVenueComparison } from './funding-analyzer'

interface OpportunityCandidate {
  tokenSymbol: string
  longVenue: string
  shortVenue: string
  fundingSpread: number
  estimatedApr: number
  riskScore: number
  entryPrice: number
  confidence: number
}

export function detectOpportunities(
  markets: MarketData[],
  config: StrategyConfig,
  venueRates: SimulatedVenueRate[]
): OpportunityCandidate[] {
  const candidates: OpportunityCandidate[] = []

  for (const market of markets) {
    if (!market.spotPrice || market.spotPrice <= 0) continue

    const ratesForToken = venueRates.filter(r => r.tokenSymbol === market.tokenSymbol)
    const comparison = getVenueComparison(market, ratesForToken)

    if (comparison.maxSpread < config.minFundingSpread) continue

    const oiTotal = market.openInterestLong + market.openInterestShort
    const oiImbalance = oiTotal > 0
      ? Math.abs(market.openInterestLong - market.openInterestShort) / oiTotal
      : 0.5

    const totalLiquidity = market.availableLiquidityLong + market.availableLiquidityShort
    const liquidityScore = totalLiquidity > 0
      ? Math.min(100, (config.maxPositionSizeUsd / totalLiquidity) * 1000)
      : 100

    const rateVolatility = Math.abs(market.fundingRateLong - market.fundingRateShort) /
      (Math.abs(market.fundingRateLong) + 0.0001)
    const volatilityScore = Math.min(100, rateVolatility * 100)

    const riskScore = 0.4 * volatilityScore + 0.3 * liquidityScore + 0.3 * (oiImbalance * 100)

    const estimatedCosts = 0.002
    const estimatedApr = comparison.maxSpread - estimatedCosts

    if (estimatedApr <= 0) continue

    const confidence = Math.max(0, Math.min(1,
      (1 - riskScore / 100) * 0.5 +
      (comparison.maxSpread / 0.1) * 0.3 +
      (1 - liquidityScore / 100) * 0.2
    ))

    candidates.push({
      tokenSymbol: market.tokenSymbol,
      longVenue: comparison.bestLong,
      shortVenue: comparison.bestShort,
      fundingSpread: comparison.maxSpread,
      estimatedApr,
      riskScore: Math.round(riskScore),
      entryPrice: market.spotPrice,
      confidence,
    })
  }

  return candidates.sort((a, b) => b.estimatedApr - a.estimatedApr)
}

export function shouldEnterPosition(
  opportunity: OpportunityCandidate,
  currentPositions: PaperTrade[],
  config: StrategyConfig
): { enter: boolean; reason: string } {
  const existingForToken = currentPositions.find(
    (p) => p.tokenSymbol === opportunity.tokenSymbol && p.status === 'open'
  )
  if (existingForToken) {
    return { enter: false, reason: `Already have open position for ${opportunity.tokenSymbol}` }
  }

  const openCount = currentPositions.filter((p) => p.status === 'open').length
  if (openCount >= config.maxTotalPositions) {
    return { enter: false, reason: `Max positions reached (${config.maxTotalPositions})` }
  }

  if (opportunity.riskScore > 95) {
    return { enter: false, reason: `Risk score too high (${opportunity.riskScore})` }
  }

  if (opportunity.confidence < 0.3) {
    return { enter: false, reason: `Confidence too low (${(opportunity.confidence * 100).toFixed(0)}%)` }
  }

  return { enter: true, reason: 'All entry criteria met' }
}

export function shouldExitPosition(
  trade: PaperTrade,
  currentRate: MarketData,
  config: StrategyConfig
): { exit: boolean; reason: string } {
  if (!trade.currentPrice || !trade.entryPrice) {
    return { exit: false, reason: 'Missing price data' }
  }

  const pnlPct = trade.unrealizedPnl / trade.positionSizeUsd
  if (pnlPct <= -config.stopLossPct) {
    return { exit: true, reason: `Stop loss triggered (${(pnlPct * 100).toFixed(2)}%)` }
  }

  if (pnlPct >= config.takeProfitPct) {
    return { exit: true, reason: `Take profit triggered (${(pnlPct * 100).toFixed(2)}%)` }
  }

  const currentSpread = Math.abs(currentRate.fundingRateLong * 8760)
  if (currentSpread < config.minFundingSpread * 0.3) {
    return { exit: true, reason: 'Funding spread collapsed' }
  }

  return { exit: false, reason: 'Position healthy' }
}

export function opportunityToRecord(candidate: OpportunityCandidate): Opportunity {
  return {
    tokenSymbol: candidate.tokenSymbol,
    longVenue: candidate.longVenue,
    shortVenue: candidate.shortVenue,
    fundingSpread: candidate.fundingSpread,
    entryPrice: candidate.entryPrice,
    estimatedApr: candidate.estimatedApr,
    riskScore: candidate.riskScore,
    status: 'active',
    detectedAt: Math.floor(Date.now() / 1000),
  }
}
