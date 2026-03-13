import { NextResponse } from "next/server";
import {
  getOpenTrades,
  getStrategyConfig,
  getVaultHistory,
  getAllTrades,
} from "@/lib/db/queries";
import { computeVaultState } from "@/lib/engine/vault-simulator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [config, openTrades, allTrades] = await Promise.all([
      getStrategyConfig(),
      getOpenTrades(),
      getAllTrades(100),
    ]);

    const closedPnl = allTrades
      .filter((t) => t.status === "closed" && t.realizedPnl != null)
      .reduce((sum, t) => sum + (t.realizedPnl || 0), 0);

    const vault = computeVaultState(
      config.vaultInitialCapital,
      openTrades,
      closedPnl,
    );
    const history = await getVaultHistory(72);

    return NextResponse.json({
      ...vault,
      positions: openTrades,
      history,
    });
  } catch (error) {
    console.error("[API] /api/vault error:", error);
    return NextResponse.json(
      { error: "Failed to fetch vault state" },
      { status: 500 },
    );
  }
}
