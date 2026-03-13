import { NextRequest, NextResponse } from "next/server";
import { getStrategyConfig, updateStrategyConfig } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await getStrategyConfig();
    return NextResponse.json(config);
  } catch (error) {
    console.error("[API] GET /api/strategy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch strategy config" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const config = await getStrategyConfig();
    const updated = {
      ...config,
      ...body,
      updatedAt: Math.floor(Date.now() / 1000),
    };

    if (updated.minFundingSpread < 0 || updated.minFundingSpread > 1) {
      return NextResponse.json(
        { error: "minFundingSpread must be 0-1" },
        { status: 400 },
      );
    }
    if (updated.maxPositionSizeUsd < 100) {
      return NextResponse.json(
        { error: "maxPositionSizeUsd must be >= 100" },
        { status: 400 },
      );
    }
    if (updated.maxTotalPositions < 1 || updated.maxTotalPositions > 50) {
      return NextResponse.json(
        { error: "maxTotalPositions must be 1-50" },
        { status: 400 },
      );
    }

    await updateStrategyConfig(updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error("[API] PUT /api/strategy error:", error);
    return NextResponse.json(
      { error: "Failed to update strategy config" },
      { status: 500 },
    );
  }
}
