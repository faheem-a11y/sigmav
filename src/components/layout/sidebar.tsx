"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BarChart3,
  Vault,
  Settings2,
  Zap,
  Wallet,
} from "lucide-react";
import { clsx } from "clsx";
import useSWR from "swr";
import { useWallet, truncateAddress } from "@/lib/hooks/use-wallet";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/vault", label: "Vault", icon: Vault },
  { href: "/strategy", label: "Strategy", icon: Settings2 },
];

const ALL_DEXES = ["HyperLiquid", "Paradex"] as const;

/* ── Sidebar shell ─────────────────────────────────────────────────────── */
const sidebarStyle: React.CSSProperties = {
  background: "linear-gradient(180deg, #181818 0%, #141414 100%)",
  boxShadow:
    "8px 0 32px rgba(0,0,0,0.55), inset -1px 0 0 rgba(255,255,255,0.03)",
};

const balanceFetcher = ([url, addr]: [string, string]) =>
  fetch(url, { headers: { "x-wallet-address": addr } }).then((r) => r.json());

export function Sidebar() {
  const pathname = usePathname();
  const { address, connectedDexes, toggleDex } = useWallet();

  const { data: balanceData } = useSWR(
    address ? ["/api/positions", address] : null,
    balanceFetcher,
    { refreshInterval: 30000 },
  );

  // Try to get USDC balance from positions API response
  const usdcBalance = balanceData?.balance ?? null;

  return (
    <aside
      className="hidden md:flex flex-col w-[220px] shrink-0"
      style={sidebarStyle}
    >
      {/* ── Brand / Logo ─────────────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 shrink-0 flex items-center justify-center transition-all duration-300 group-hover:scale-105">
            <Image
              src="/main-logo.png"
              alt="SigmaV"
              width={34}
              height={34}
              style={{
                filter: "drop-shadow(0 0 6px rgba(255,59,69,0.5))",
                transition: "filter 0.3s ease",
              }}
              className="group-hover:[filter:drop-shadow(0_0_10px_rgba(255,59,69,0.75))]"
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
        {/* Connected DEXes — bento card with toggles */}
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
              Venues
            </p>
          </div>

          {/* DEX toggles */}
          <div className="space-y-1.5">
            {/* GMX — always on, no toggle */}
            <DexToggleRow label="GMX v2" active locked />
            {ALL_DEXES.map((dex) => (
              <DexToggleRow
                key={dex}
                label={dex}
                active={connectedDexes.includes(dex)}
                onToggle={() => toggleDex(dex)}
              />
            ))}
          </div>

        </div>

        {/* Network / Wallet — bento card */}
        <div className="sidebar-bento px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-3.5 h-3.5 shrink-0" style={{ color: "#555" }} />
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em]" style={{ color: "#555" }}>
              Wallet
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{
                  background: "#22c55e",
                  boxShadow:
                    "0 0 8px rgba(0,255,128,0.4), 0 0 4px rgba(0,255,128,0.6)",
                }}
              />
              <span className="text-[11px] truncate" style={{ color: "#555" }}>
                Avalanche
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
          {usdcBalance !== null && (
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-[10px]" style={{ color: "#444" }}>
                USDC Balance
              </span>
              <span className="text-[11px] font-mono font-semibold" style={{ color: "#c0c0c0" }}>
                ${Number(usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ── Sub-component: DEX toggle row ──────────────────────────────────────── */
function DexToggleRow({
  label,
  active,
  locked,
  onToggle,
}: {
  label: string;
  active: boolean;
  locked?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{
            background: active ? "#22c55e" : "#333",
            boxShadow: active
              ? "0 0 8px rgba(0,255,128,0.4), 0 0 4px rgba(0,255,128,0.55)"
              : "none",
          }}
        />
        <span className="text-[12px] leading-none" style={{ color: active ? "#666" : "#444" }}>
          {label}
        </span>
      </div>
      {locked ? (
        <span className="text-[9px] font-mono uppercase" style={{ color: "#333" }}>
          Primary
        </span>
      ) : (
        <button
          onClick={onToggle}
          className="relative w-7 h-3.5 rounded-full transition-all duration-200"
          style={{
            background: active ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.06)",
            border: `1px solid ${active ? "rgba(34,197,94,0.3)" : "rgba(255,255,255,0.08)"}`,
          }}
        >
          <span
            className="absolute top-0.5 w-2 h-2 rounded-full transition-all duration-200"
            style={{
              background: active ? "#22c55e" : "#444",
              left: active ? "13px" : "2px",
              boxShadow: active ? "0 0 4px rgba(34,197,94,0.5)" : "none",
            }}
          />
        </button>
      )}
    </div>
  );
}

