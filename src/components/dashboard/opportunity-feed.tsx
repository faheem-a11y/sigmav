"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useOpportunities } from "@/lib/hooks/use-opportunities";
import { formatAnnualizedRate, formatPercentage } from "@/lib/utils/formatting";

const BRAND_RED = "#e0323c";
const BRAND_GREEN = "#1fa854";
const LABEL_COLOR = "#3a3a3a";

export function OpportunityFeed() {
  const { data: opportunities, isLoading } = useOpportunities();
  const [takingId, setTakingId] = useState<number | null>(null);

  const handleTakePosition = async (
    opp: NonNullable<typeof opportunities>[number],
  ) => {
    setTakingId(opp.id ?? -1);
    try {
      const res = await fetch("/api/paper-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opp.id,
          tokenSymbol: opp.tokenSymbol,
          entryPrice: opp.entryPrice,
          longVenue: opp.longVenue,
          shortVenue: opp.shortVenue,
          estimatedApr: opp.estimatedApr,
          riskScore: opp.riskScore,
          positionSizeUsd: 10000,
          leverage: 1,
        }),
      });
      if (!res.ok) throw new Error("Failed to take position");
      await mutate("/api/vault");
      await mutate("/api/opportunities");
    } catch (err) {
      console.error("Take position failed:", err);
    } finally {
      setTakingId(null);
    }
  };

  return (
    <Card title="Opportunities" subtitle="Live funding rate arbitrage signals">
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : !opportunities?.length ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)" }}
          />
          <p className="text-sm" style={{ color: "#555555" }}>
            No opportunities detected
          </p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {opportunities.map((opp) => (
            <div
              key={opp.id ?? opp.tokenSymbol}
              className="opp-card p-4 rounded-xl transition-all duration-200 active:scale-[0.99]"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p
                    className="font-bold tracking-tight"
                    style={{ fontSize: "14px", color: "#FFFFFF", marginBottom: "2px" }}
                  >
                    {opp.tokenSymbol}
                  </p>
                  <p
                    style={{
                      fontSize: "10px",
                      color: "rgba(255,255,255,0.2)",
                      letterSpacing: "0.02em",
                      lineHeight: 1,
                    }}
                  >
                    {opp.longVenue} → {opp.shortVenue}
                  </p>
                </div>

                <div className="flex flex-col items-end" style={{ gap: "2px" }}>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 600,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.1em",
                      color: LABEL_COLOR,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    Risk
                  </span>
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                      color: BRAND_RED,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {opp.riskScore}
                  </span>
                </div>
              </div>

              {/* Metrics + CTA */}
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-5">
                  <div>
                    <p
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.1em",
                        color: LABEL_COLOR,
                        marginBottom: "3px",
                      }}
                    >
                      Spread
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: BRAND_RED,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {formatAnnualizedRate(opp.fundingSpread)}
                    </p>
                  </div>

                  <div>
                    <p
                      style={{
                        fontSize: "9px",
                        fontWeight: 600,
                        textTransform: "uppercase" as const,
                        letterSpacing: "0.1em",
                        color: LABEL_COLOR,
                        marginBottom: "3px",
                      }}
                    >
                      APR
                    </p>
                    <p
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        color: BRAND_GREEN,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {formatPercentage(opp.estimatedApr / 100)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleTakePosition(opp)}
                  disabled={!opp.canTakePosition || takingId === (opp.id ?? -1)}
                  className="opp-take-btn whitespace-nowrap transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "8px 14px",
                    minHeight: "36px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.55)",
                    cursor: opp.canTakePosition ? "pointer" : "not-allowed",
                    letterSpacing: "0.01em",
                  }}
                >
                  {takingId === (opp.id ?? -1) ? "Opening…" : "Take Position"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
