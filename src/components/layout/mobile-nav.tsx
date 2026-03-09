'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, BarChart3, Vault, Settings2, MoreHorizontal, LogOut, X, Zap } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet, truncateAddress } from '@/lib/hooks/use-wallet'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/markets', label: 'Markets', icon: BarChart3 },
  { href: '/vault', label: 'Vault', icon: Vault },
  { href: '/strategy', label: 'Strategy', icon: Settings2 },
]

export function MobileNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { address, connectedDexes, activePairs, disconnectWallet } = useWallet()
  const [moreOpen, setMoreOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const handleDisconnect = () => {
    setConfirmOpen(false)
    setMoreOpen(false)
    disconnectWallet()
    router.push('/onboarding')
  }

  return (
    <>
      {/* Backdrop for More sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden bottom-sheet-overlay"
            onClick={() => { setMoreOpen(false); setConfirmOpen(false) }}
          />
        )}
      </AnimatePresence>

      {/* More / Profile Bottom Sheet */}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="more-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 420, damping: 42, mass: 0.8 }}
            className="md:hidden bottom-sheet"
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-9 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.1)' }} />
            </div>

            {/* Sheet header */}
            <div className="flex items-center justify-between px-5 py-3 mb-1">
              <span className="text-sm font-semibold" style={{ color: '#EDEDED' }}>Account</span>
              <button
                onClick={() => { setMoreOpen(false); setConfirmOpen(false) }}
                className="w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-transform"
                style={{ background: 'rgba(255,255,255,0.06)', color: '#555' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Wallet info card */}
            {address && (
              <div className="mx-4 mb-3 px-4 py-3 rounded-xl" style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
              }}>
                <p className="text-[9px] font-semibold uppercase tracking-[0.12em] mb-2" style={{ color: '#444' }}>
                  Connected Wallet
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 animate-pulse"
                    style={{ background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.6)' }}
                  />
                  <span className="text-sm font-mono" style={{ color: '#EDEDED' }}>
                    {truncateAddress(address)}
                  </span>
                </div>
                <p className="text-[10px]" style={{ color: '#444' }}>Avalanche C-Chain</p>
              </div>
            )}

            {/* Connected DEXes */}
            {connectedDexes.length > 0 && (
              <div className="mx-4 mb-3 px-4 py-3 rounded-xl" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap className="w-3 h-3" style={{ color: 'rgba(255,100,90,0.7)' }} />
                  <p className="text-[9px] font-semibold uppercase tracking-[0.1em]" style={{ color: '#444' }}>
                    Active DEXes
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {['GMX v2', ...connectedDexes].map((dex) => (
                    <span
                      key={dex}
                      className="text-[11px] px-2 py-0.5 rounded-md font-mono"
                      style={{
                        background: 'rgba(34,197,94,0.08)',
                        color: '#22c55e',
                        border: '1px solid rgba(34,197,94,0.15)',
                      }}
                    >
                      {dex}
                    </span>
                  ))}
                </div>
                {activePairs.length > 0 && (
                  <div className="mt-2 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                    <p className="text-[9px] uppercase tracking-[0.08em] mb-1" style={{ color: '#333' }}>Active Pairs</p>
                    {activePairs.map((pair) => (
                      <p key={pair} className="text-[10px] font-mono" style={{ color: 'rgba(255,100,90,0.7)' }}>
                        {pair}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Disconnect — with inline confirm */}
            <div className="px-4">
              <AnimatePresence mode="wait">
                {!confirmOpen ? (
                  <motion.button
                    key="disconnect-btn"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setConfirmOpen(true)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl active:scale-[0.98] transition-transform"
                    style={{
                      background: 'rgba(255,59,69,0.07)',
                      border: '1px solid rgba(255,59,69,0.14)',
                      color: '#FF3B45',
                    }}
                  >
                    <LogOut className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Disconnect & Reset</span>
                  </motion.button>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid rgba(255,59,69,0.2)' }}
                  >
                    <div className="px-4 py-3" style={{ background: 'rgba(255,59,69,0.07)' }}>
                      <p className="text-sm font-semibold mb-0.5" style={{ color: '#EDEDED' }}>
                        Disconnect wallet?
                      </p>
                      <p className="text-xs" style={{ color: '#666' }}>
                        This will clear all connected DEXes and pairs.
                      </p>
                    </div>
                    <div className="flex">
                      <button
                        onClick={() => setConfirmOpen(false)}
                        className="flex-1 py-3 text-sm font-medium active:scale-[0.98] transition-transform"
                        style={{
                          background: 'rgba(255,255,255,0.03)',
                          borderRight: '1px solid rgba(255,255,255,0.05)',
                          color: '#828282',
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDisconnect}
                        className="flex-1 py-3 text-sm font-semibold active:scale-[0.98] transition-transform"
                        style={{ background: 'rgba(255,59,69,0.12)', color: '#FF3B45' }}
                      >
                        Confirm
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(14,14,14,0.97)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex items-stretch">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[52px] active:scale-95 transition-transform duration-100 select-none"
                style={{ color: isActive ? '#FF3B45' : '#555555' }}
              >
                <item.icon className="w-5 h-5" strokeWidth={isActive ? 2 : 1.5} />
                <span className="text-[10px] font-medium tracking-tight leading-none">{item.label}</span>
                {isActive && (
                  <span
                    className="absolute bottom-0 w-6 h-0.5 rounded-full"
                    style={{ background: '#FF3B45', boxShadow: '0 0 8px rgba(255,59,69,0.6)' }}
                  />
                )}
              </Link>
            )
          })}

          {/* More / Profile */}
          <button
            onClick={() => setMoreOpen(true)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[52px] active:scale-95 transition-transform duration-100 select-none"
            style={{ color: moreOpen ? '#FF3B45' : '#555555' }}
          >
            <MoreHorizontal className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] font-medium tracking-tight leading-none">More</span>
          </button>
        </div>
      </nav>
    </>
  )
}
