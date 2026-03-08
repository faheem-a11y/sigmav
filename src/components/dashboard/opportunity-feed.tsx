"use client";

import { useState } from "react";
import { mutate } from "swr";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useOpportunities } from "@/lib/hooks/use-opportunities";
import { formatAnnualizedRate, formatPercentage } from "@/lib/utils/formatting";

// Brand palette constants used across the card
const BRAND_RED = "#e0323c"; // desaturated brand red  — Spread & Risk
const BRAND_GREEN = "#1fa854"; // desaturated brand green — APR
const LABEL_COLOR = "#3a3a3a"; // deep charcoal for all-caps metadata labels

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
          >
            <span className="text-lg">🔍</span>
          </div>
          <p className="text-sm" style={{ color: "#555555" }}>
            No opportunities detected
          </p>
        </div>
      ) : (
        <div className="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {opportunities.map((opp) => (
            <div
              key={opp.id ?? opp.tokenSymbol}
              className="p-4 rounded-xl transition-all duration-300"
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.05)",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,59,69,0.03)";
                el.style.borderColor = "rgba(255,59,69,0.09)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget;
                el.style.background = "rgba(255,255,255,0.02)";
                el.style.borderColor = "rgba(255,255,255,0.05)";
              }}
            >
              {/* ── Header row: [Title + Route] left · [RISK label + value] right ── */}
              <div className="flex items-start justify-between mb-3">
                {/* Left: asset title and route tightly grouped as one unit */}
                <div>
                  <p
                    className="font-bold tracking-tight"
                    style={{
                      fontSize: "14px",
                      color: "#FFFFFF",
                      marginBottom: "2px",
                    }}
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

                {/* Right: plain-text risk — no pill, no background */}
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

              {/* ── Metrics row: [Spread · APR] left · [Take Position] right ── */}
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-5">
                  {/* Spread */}
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

                  {/* APR */}
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

                {/* Muted ghost button — doesn't compete with brand metric colors */}
                <button
                  onClick={() => handleTakePosition(opp)}
                  disabled={!opp.canTakePosition || takingId === (opp.id ?? -1)}
                  className="whitespace-nowrap transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "5px 13px",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.55)",
                    cursor: opp.canTakePosition ? "pointer" : "not-allowed",
                    letterSpacing: "0.01em",
                  }}
                  onMouseEnter={(e) => {
                    if (!opp.canTakePosition) return;
                    const btn = e.currentTarget;
                    btn.style.background = "rgba(255,255,255,0.09)";
                    btn.style.borderColor = "rgba(255,255,255,0.16)";
                    btn.style.color = "rgba(255,255,255,0.8)";
                  }}
                  onMouseLeave={(e) => {
                    const btn = e.currentTarget;
                    btn.style.background = "rgba(255,255,255,0.05)";
                    btn.style.borderColor = "rgba(255,255,255,0.1)";
                    btn.style.color = "rgba(255,255,255,0.55)";
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
