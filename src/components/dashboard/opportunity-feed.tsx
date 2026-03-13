"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mutate } from "swr";
import { Zap, Info, TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { TableSkeleton } from "@/components/ui/skeleton";
import { useOpportunities } from "@/lib/hooks/use-opportunities";
import { formatAnnualizedRate, formatPercentage } from "@/lib/utils/formatting";
import { useWallet } from "@/lib/hooks/use-wallet";
import { useWallets } from "@privy-io/react-auth";
import { executePairedTrade } from "@/lib/hooks/use-trade";

const BRAND_RED   = "#e0323c";
const BRAND_GREEN = "#1fa854";
const LABEL_COLOR = "#7a7a7a";

export function OpportunityFeed() {
  const { data: opportunities, isLoading } = useOpportunities();
  const [takingId, setTakingId] = useState<number | null>(null);
  const router = useRouter();
  const { address } = useWallet();
  const { wallets } = useWallets();

  const handleOpenTrade = async (
    opp: NonNullable<typeof opportunities>[number],
  ) => {
    if (!address) return;
    setTakingId(opp.id ?? -1);

    try {
      // Get wallet provider for signing GMX transactions
      const wallet = wallets?.[0];
      const provider = wallet ? await wallet.getEthereumProvider() : undefined;

      const { longResult, shortResult } = await executePairedTrade(
        address,
        opp.longVenue,
        opp.shortVenue,
        opp.tokenSymbol,
        10000,
        1,
        provider,
      );

      if (longResult.status === 'failed' && shortResult.status === 'failed') {
        throw new Error('Both orders failed');
      }

      // Also record paper trade for tracking
      await fetch("/api/paper-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId:  opp.id,
          tokenSymbol:    opp.tokenSymbol,
          entryPrice:     opp.entryPrice,
          longVenue:      opp.longVenue,
          shortVenue:     opp.shortVenue,
          estimatedApr:   opp.estimatedApr,
          riskScore:      opp.riskScore,
          positionSizeUsd: 10000,
          leverage: 1,
        }),
      });

      await mutate("/api/vault");
      await mutate("/api/opportunities");
    } catch (err) {
      console.error("Take position failed:", err);
    } finally {
      setTakingId(null);
      router.push(`/vault?highlight=${encodeURIComponent(opp.tokenSymbol)}`);
    }
  };

  return (
    <Card
      title={
        <span className="flex items-center gap-1.5">
          Opportunities
          <Info
            className="w-3.5 h-3.5 shrink-0"
            style={{ color: '#555555' }}
          />
        </span>
      }
      subtitle="Live funding rate arbitrage signals"
    >
      {isLoading ? (
        <TableSkeleton rows={4} />
      ) : !opportunities?.length ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.04)" }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} style={{ color: '#333' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: "#a0a0a0" }}>
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
                  <span className="flex items-center gap-1" style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", letterSpacing: "0.02em", lineHeight: 1 }}>
                    <TrendingUp className="w-3 h-3 shrink-0" style={{ color: BRAND_GREEN }} />
                    <span style={{ color: BRAND_GREEN }}>{opp.longVenue}</span>
                    <span style={{ color: 'rgba(255,255,255,0.25)', margin: '0 1px' }}>·</span>
                    <TrendingDown className="w-3 h-3 shrink-0" style={{ color: BRAND_RED }} />
                    <span style={{ color: BRAND_RED }}>{opp.shortVenue}</span>
                  </span>
                </div>

                <div className="flex flex-col items-end" style={{ gap: "2px" }}>
                  <span style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: LABEL_COLOR, fontFamily: "'JetBrains Mono', monospace" }}>
                    Risk
                  </span>
                  <span style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "-0.01em", color: BRAND_RED, fontFamily: "'JetBrains Mono', monospace" }}>
                    {opp.riskScore}
                  </span>
                </div>
              </div>

              {/* Metrics + CTA */}
              <div className="flex items-end justify-between gap-3">
                <div className="flex items-end gap-5">
                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: LABEL_COLOR, marginBottom: "3px" }}>
                      Spread
                    </p>
                    <p style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: BRAND_RED, letterSpacing: "-0.01em" }}>
                      {formatAnnualizedRate(opp.fundingSpread)}
                    </p>
                  </div>

                  <div>
                    <p style={{ fontSize: "9px", fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.1em", color: LABEL_COLOR, marginBottom: "3px" }}>
                      APR
                    </p>
                    <p style={{ fontSize: "13px", fontWeight: 600, fontFamily: "'JetBrains Mono', monospace", color: BRAND_GREEN, letterSpacing: "-0.01em" }}>
                      {formatPercentage(opp.estimatedApr / 100)}
                    </p>
                  </div>
                </div>

                {/* Open Trade button — opens DEX tabs, records trade, navigates to Vault */}
                <button
                  onClick={() => handleOpenTrade(opp)}
                  disabled={takingId === (opp.id ?? -1)}
                  className="opp-take-btn group relative flex items-center gap-1.5 whitespace-nowrap transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    fontSize: "11px",
                    fontWeight: 500,
                    padding: "8px 14px",
                    minHeight: "36px",
                    borderRadius: "10px",
                    background: "rgba(34,197,94,0.08)",
                    border: "1px solid rgba(34,197,94,0.18)",
                    color: "#22c55e",
                    cursor: "pointer",
                    letterSpacing: "0.01em",
                  }}
                  title={`Long ${opp.longVenue} · Short ${opp.shortVenue}`}
                >
                  {takingId === (opp.id ?? -1) ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Executing…
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3 shrink-0" />
                      Execute Trade
                    </>
                  )}
                </button>
              </div>

              {opp.reason && (
                <p className="text-[10px] mt-2 leading-relaxed" style={{ color: '#888888' }}>
                  {opp.reason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
