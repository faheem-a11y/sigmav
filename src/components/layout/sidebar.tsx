"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Vault,
  Settings2,
  TrendingUp,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import { useWallet, truncateAddress } from "@/lib/hooks/use-wallet";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/strategy", label: "Strategy", icon: Settings2 },
];

/* ── Sidebar shell ─────────────────────────────────────────────────────── */
const sidebarStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #181818 0%, #141414 100%)",
  /* Right-edge glow to separate from content without a hard line */
  boxShadow:
    "8px 0 32px rgba(0,0,0,0.55), inset -1px 0 0 rgba(255,255,255,0.03)",
};

/* ── Logo icon ─────────────────────────────────────────────────────────── */
const logoIconStyle: React.CSSProperties = {
  background:
    "radial-gradient(circle at 40% 30%, rgba(255,80,70,0.22) 0%, rgba(180,30,30,0.10) 60%, transparent 100%)",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.08), 0 0 18px rgba(255,59,69,0.12)",
};

export function Sidebar() {
  const pathname = usePathname();
  const { address, connectedDexes, activePairs } = useWallet();

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0"
      style={sidebarStyle}
    >
      {/* ── Brand / Logo ─────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-105"
            style={logoIconStyle}
          >
            <TrendingUp
              className="w-4 h-4"
              strokeWidth={1.75}
              style={{
                color: "rgba(255,100,90,0.95)",
                filter: "drop-shadow(0 0 4px rgba(255,59,69,0.55))",
              }}
            />
          </div>
          <div className="min-w-0">
            <p
              className="text-[13px] font-semibold tracking-tight leading-tight"
              style={{ color: "#EDEDED" }}
            >
              SigmaV
            </p>
            <p
              className="text-[11px] leading-tight mt-0.5 truncate"
              style={{ color: "#555" }}
            >
              Funding Arbitrage
            </p>
          </div>
        </Link>
      </div>

      {/* ── Section label ────────────────────────────────────────────── */}
      <p
        className="px-5 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "#444" }}
      >
        Menu
      </p>

      {/* ── Navigation ───────────────────────────────────────────────── */}
      <nav className="flex-1 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "relative flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13px] font-medium select-none",
                isActive ? "nav-active" : "nav-idle",
              )}
              style={{
                color: isActive ? "#EDEDED" : "#666",
                transition: "background 0.3s ease, color 0.3s ease",
              }}
            >
              {/* Icon */}
              <item.icon
                className="w-4 h-4 shrink-0"
                strokeWidth={1.5}
                style={
                  isActive
                    ? { color: "rgba(255,100,90,0.95)" }
                    : { color: "#555" }
                }
              />

              <span className="leading-none">{item.label}</span>

              {/* Active status dot — ember glow */}
              {isActive && (
                <span
                  className="absolute right-3 w-1 h-1 rounded-full"
                  style={{
                    background: "rgba(255,100,90,0.9)",
                    boxShadow:
                      "0 0 5px rgba(255,59,69,0.8), 0 0 10px rgba(255,59,69,0.4)",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom section ───────────────────────────────────────────── */}
      <div className="px-2.5 pb-4 space-y-2">
        {/* Connected DEXes — bento card */}
        {connectedDexes.length > 0 && (
          <div className="sidebar-bento px-4 py-3.5">
            {/* Card header */}
            <div className="flex items-center gap-1.5 mb-3">
              <Zap
                className="w-3 h-3 shrink-0"
                strokeWidth={2}
                style={{ color: "rgba(255,100,90,0.7)" }}
              />
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.1em]"
                style={{ color: "#555" }}
              >
                Connected DEXes
              </p>
            </div>

            {/* DEX rows */}
            <div className="space-y-2">
              {/* GMX always present */}
              <DexRow label="GMX v2" />
              {connectedDexes.map((dex) => (
                <DexRow key={dex} label={dex} />
              ))}
            </div>

            {/* Active pairs */}
            {activePairs.length > 0 && (
              <div
                className="mt-3 pt-3"
                style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
              >
                <p
                  className="text-[10px] mb-1.5 uppercase tracking-[0.08em]"
                  style={{ color: "#3a3a3a" }}
                >
                  Active Pairs
                </p>
                {activePairs.map((pair) => (
                  <p
                    key={pair}
                    className="text-[10px] font-mono leading-relaxed"
                    style={{ color: "rgba(255,100,90,0.7)" }}
                  >
                    {pair}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Network / Wallet — bento card */}
        <div className="sidebar-bento px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              {/* Live status dot */}
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{
                  background: "#22c55e",
                  boxShadow:
                    "0 0 8px rgba(0,255,128,0.4), 0 0 4px rgba(0,255,128,0.6)",
                }}
              />
              <span className="text-[11px] truncate" style={{ color: "#555" }}>
                Avalanche C-Chain
              </span>
            </div>

            {address && (
              <span
                className="text-[10px] font-mono shrink-0 ml-1"
                style={{ color: "#3a3a3a" }}
              >
                {truncateAddress(address)}
              </span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* ── Sub-component: single DEX row ──────────────────────────────────────── */
function DexRow({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{
          background: "#22c55e",
          boxShadow:
            "0 0 8px rgba(0,255,128,0.4), 0 0 4px rgba(0,255,128,0.55)",
        }}
      />
      <span className="text-[12px] leading-none" style={{ color: "#666" }}>
        {label}
      </span>
    </div>
  );
}
