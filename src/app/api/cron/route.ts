import { NextResponse } from "next/server";
import { getEnrichedMarkets } from "@/lib/api/gmx";
import { fetchAllVenueRates } from "@/lib/engine/funding-analyzer";
import {
  detectOpportunities,
  shouldExitPosition,
} from "@/lib/engine/opportunity-detector";
import { updatePositionState } from "@/lib/engine/paper-trader";
import {
  insertFundingRateSnapshot,
  insertSimulatedVenueRate,
  insertOpportunity,
  getOpenTrades,
  getStrategyConfig,
  updateTradeState,
  closeTrade,
  insertVaultSnapshot,
  expireOldOpportunities,
  insertSignal,
  getAllTrades,
} from "@/lib/db/queries";
import { computeVaultState } from "@/lib/engine/vault-simulator";
import { opportunityToRecord } from "@/lib/engine/opportunity-detector";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const [markets, venueRates] = await Promise.all([
      getEnrichedMarkets(),
      fetchAllVenueRates(),
    ]);
    const now = Math.floor(Date.now() / 1000);
    const config = await getStrategyConfig();

    let snapshotsStored = 0;
    let opportunitiesDetected = 0;
    let tradesUpdated = 0;
    let tradesExited = 0;

    // 1. Store funding rate snapshots
    for (const market of markets) {
      await insertFundingRateSnapshot({
        marketToken: market.marketToken,
        marketName: market.marketName,
        indexToken: market.indexToken,
        tokenSymbol: market.tokenSymbol,
        fundingRateLong: market.fundingRateLong,
        fundingRateShort: market.fundingRateShort,
        borrowingRateLong: market.borrowingRateLong,
        borrowingRateShort: market.borrowingRateShort,
        netRateLong: market.netRateLong,
        netRateShort: market.netRateShort,
        openInterestLong: market.openInterestLong,
        openInterestShort: market.openInterestShort,
        spotPrice: market.spotPrice,
        timestamp: now,
      });
      snapshotsStored++;

      // Store venue rates from HyperLiquid & Paradex
      const ratesForToken = venueRates.filter(
        (r) => r.tokenSymbol === market.tokenSymbol,
      );
      for (const rate of ratesForToken) {
        await insertSimulatedVenueRate(rate);
      }
    }

    // 2. Detect and store opportunities (tokens on GMX + at least one other venue)
    const externalTokens = new Set(venueRates.map((r) => r.tokenSymbol));
    const crossVenueMarkets = markets.filter((m) => externalTokens.has(m.tokenSymbol));
    const candidates = detectOpportunities(crossVenueMarkets, config, venueRates);
    for (const candidate of candidates.slice(0, 10)) {
      const record = opportunityToRecord(candidate);
      await insertOpportunity(record);
      opportunitiesDetected++;
    }

    // 3. Expire old opportunities
    await expireOldOpportunities(30);

    // 4. Update open trades
    const openTrades = await getOpenTrades();
    for (const trade of openTrades) {
      const market = markets.find((m) => m.tokenSymbol === trade.tokenSymbol);
      if (!market) continue;

      const elapsedHours = (now - trade.openedAt) / 3600;
      const lastUpdateHours = trade.currentPrice ? 0.00833 : elapsedHours; // ~30 seconds

      const updated = updatePositionState(
        trade,
        market.spotPrice,
        market.fundingRateLong,
        market.borrowingRateLong,
        lastUpdateHours,
      );

      await updateTradeState(
        trade.id!,
        updated.currentPrice!,
        updated.fundingCollected,
        updated.borrowingPaid,
        updated.unrealizedPnl,
      );
      tradesUpdated++;

      // Check exit conditions
      const exitCheck = shouldExitPosition(updated, market, config);
      if (exitCheck.exit) {
        const realizedPnl = updated.fundingCollected - updated.borrowingPaid;
        await closeTrade(trade.id!, exitCheck.reason, realizedPnl, market.spotPrice);
        tradesExited++;

        await insertSignal({
          tokenSymbol: trade.tokenSymbol,
          signalType: "exit",
          action: "close",
          reason: exitCheck.reason,
          executed: true,
          timestamp: now,
        });
      }
    }

    // 5. Store vault snapshot
    const updatedOpenTrades = await getOpenTrades();
    const allTrades = await getAllTrades(200);
    const closedPnl = allTrades
      .filter((t) => t.status === "closed" && t.realizedPnl != null)
      .reduce((sum, t) => sum + (t.realizedPnl || 0), 0);

    const vaultState = computeVaultState(
      config.vaultInitialCapital,
      updatedOpenTrades,
      closedPnl,
    );
    await insertVaultSnapshot(vaultState);

    return NextResponse.json({
      success: true,
      timestamp: now,
      snapshotsStored,
      opportunitiesDetected,
      tradesUpdated,
      tradesExited,
      marketsCount: markets.length,
    });
  } catch (error) {
    console.error("[API] /api/cron error:", error);
    return NextResponse.json({ error: "Cron tick failed" }, { status: 500 });
  }
}
