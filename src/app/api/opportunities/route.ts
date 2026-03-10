import { NextResponse } from "next/server";
import { getEnrichedMarkets } from "@/lib/api/gmx";
import { fetchAllVenueRates } from "@/lib/engine/funding-analyzer";
import { detectOpportunities } from "@/lib/engine/opportunity-detector";
import { getStrategyConfig, getOpenTrades } from "@/lib/db/queries";
import { shouldEnterPosition } from "@/lib/engine/opportunity-detector";
import type { OpportunityWithAction } from "@/lib/utils/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [markets, venueRates, config, openTrades] = await Promise.all([
      getEnrichedMarkets(),
      fetchAllVenueRates(),
      Promise.resolve(getStrategyConfig()),
      Promise.resolve(getOpenTrades()),
    ]);

    // Only consider tokens available on all 3 DEXs
    const hlTokens = new Set(venueRates.filter((r) => r.venueName === 'HyperLiquid').map((r) => r.tokenSymbol));
    const pdxTokens = new Set(venueRates.filter((r) => r.venueName === 'Paradex').map((r) => r.tokenSymbol));
    const filteredMarkets = markets.filter((m) => hlTokens.has(m.tokenSymbol) && pdxTokens.has(m.tokenSymbol));

    const candidates = detectOpportunities(filteredMarkets, config, venueRates);

    const opportunities: OpportunityWithAction[] = candidates.map((c) => {
      const { enter, reason } = shouldEnterPosition(c, openTrades, config);
      return {
        tokenSymbol: c.tokenSymbol,
        longVenue: c.longVenue,
        shortVenue: c.shortVenue,
        fundingSpread: c.fundingSpread,
        entryPrice: c.entryPrice,
        estimatedApr: c.estimatedApr,
        riskScore: c.riskScore,
        status: "active" as const,
        detectedAt: Math.floor(Date.now() / 1000),
        canTakePosition: enter,
        reason: enter ? undefined : reason,
      };
    });

    return NextResponse.json(opportunities);
  } catch (error) {
    console.error("[API] /api/opportunities error:", error);
    return NextResponse.json(
      { error: "Failed to detect opportunities" },
      { status: 500 },
    );
  }
}
