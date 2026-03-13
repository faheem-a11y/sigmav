'use client'

import { Activity, Clock, Menu, LogOut, ChevronDown, Wallet, Copy, Check, Globe } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useWallet, truncateAddress } from '@/lib/hooks/use-wallet'
import { useWallets } from '@privy-io/react-auth'
import { Badge } from '@/components/ui/badge'

interface ChainInfo {
  id: number
  name: string
  hexId: string
  color: string
  letter: string
}

const CHAINS: ChainInfo[] = [
  { id: 43114, name: 'Avalanche', hexId: '0xa86a', color: '#E84142', letter: 'A' },
  { id: 1, name: 'Ethereum', hexId: '0x1', color: '#627EEA', letter: 'E' },
  { id: 42161, name: 'Arbitrum', hexId: '0xa4b1', color: '#12AAFF', letter: 'Ar' },
]

const balanceFetcher = ([url, addr]: [string, string]) =>
  fetch(url, { headers: { 'x-wallet-address': addr } }).then((r) => r.json())

export function Header() {
  const [time, setTime] = useState('')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [walletOpen, setWalletOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chainMenuOpen, setChainMenuOpen] = useState(false)
  const [activeChain, setActiveChain] = useState(CHAINS[0])
  const { address, disconnectWallet } = useWallet()
  const { wallets } = useWallets()
  const router = useRouter()
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { data: balanceData } = useSWR(
    address ? ['/api/positions', address] : null,
    balanceFetcher,
    { refreshInterval: 30000 },
  )

  const usdcBalance = balanceData?.balance ?? null

  useEffect(() => {
    const update = () => {
      setTime(new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }))
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setWalletOpen(false)
        setChainMenuOpen(false)
      }
    }
    if (walletOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [walletOpen])

  const handleDisconnect = () => {
    setWalletOpen(false)
    disconnectWallet()
    router.push('/onboarding')
  }

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    }
  }

  const handleSwitchChain = async (chain: ChainInfo) => {
    const wallet = wallets?.[0]
    if (wallet) {
      try {
        await wallet.switchChain(chain.id)
        setActiveChain(chain)
      } catch (err) {
        console.error('Failed to switch chain:', err)
      }
    }
    setChainMenuOpen(false)
  }

  return (
    <header className="h-14 flex items-center justify-between px-6 relative z-50" style={{
      background: 'rgba(18,18,18,0.8)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      boxShadow: '0 1px 0 rgba(255,255,255,0.03)',
    }}>
      <div className="flex items-center gap-4">
        <button
          className="md:hidden transition-colors duration-200"
          style={{ color: '#828282' }}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Activity className="w-4 h-4" style={{ color: '#22c55e' }} />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22c55e' }} />
          </div>
          <span className="text-sm font-medium" style={{ color: '#828282' }}>GMX v2</span>
          <Badge variant="green" pulse>Live</Badge>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {address && (
          <div className="relative" ref={dropdownRef}>
            {/* Wallet button */}
            <button
              onClick={() => { setWalletOpen(!walletOpen); setChainMenuOpen(false) }}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all duration-150 active:scale-[0.98]"
              style={{
                background: walletOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${walletOpen ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.06)'}`,
                cursor: 'pointer',
              }}
            >
              {/* Chain icon */}
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${activeChain.color}20` }}
              >
                <span className="text-[7px] font-bold" style={{ color: activeChain.color }}>
                  {activeChain.letter}
                </span>
              </div>
              <span className="hidden sm:inline text-xs font-mono" style={{ color: '#828282' }}>{truncateAddress(address)}</span>
              <ChevronDown
                className="w-3 h-3 transition-transform duration-200"
                style={{ color: '#555', transform: walletOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              />
            </button>

            {/* Dropdown */}
            {walletOpen && (
              <div
                className="absolute right-0 top-full mt-2 w-72 rounded-xl overflow-hidden z-50"
                style={{
                  background: 'rgba(20,20,20,0.98)',
                  backdropFilter: 'blur(24px)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                }}
              >
                {/* Chain selector */}
                <div className="px-4 pt-4 pb-3">
                  <button
                    onClick={() => setChainMenuOpen(!chainMenuOpen)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors hover:bg-white/[0.03]"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center"
                        style={{ background: `${activeChain.color}18` }}
                      >
                        <span className="text-[9px] font-bold" style={{ color: activeChain.color }}>
                          {activeChain.letter}
                        </span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold" style={{ color: '#EDEDED' }}>{activeChain.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: '#555' }}>Chain ID: {activeChain.id}</p>
                      </div>
                    </div>
                    <Globe className="w-3.5 h-3.5" style={{ color: '#555' }} />
                  </button>

                  {/* Chain picker */}
                  {chainMenuOpen && (
                    <div className="mt-2 rounded-lg overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.05)' }}>
                      {CHAINS.map((chain) => (
                        <button
                          key={chain.id}
                          onClick={() => handleSwitchChain(chain)}
                          className="w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                          style={{
                            background: chain.id === activeChain.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                          }}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex items-center justify-center"
                            style={{ background: `${chain.color}18` }}
                          >
                            <span className="text-[7px] font-bold" style={{ color: chain.color }}>
                              {chain.letter}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium" style={{ color: chain.id === activeChain.id ? '#EDEDED' : '#888' }}>
                            {chain.name}
                          </span>
                          {chain.id === activeChain.id && (
                            <span className="ml-auto w-1.5 h-1.5 rounded-full" style={{ background: '#22c55e' }} />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Address + Balance */}
                <div className="px-4 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <div
                    className="flex items-center justify-between px-3 py-2 rounded-lg mt-3 mb-3"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <span className="text-[11px] font-mono" style={{ color: '#828282' }}>
                      {truncateAddress(address)}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1 rounded transition-colors hover:bg-white/5 active:scale-95"
                      title="Copy address"
                    >
                      {copied ? (
                        <Check className="w-3 h-3" style={{ color: '#22c55e' }} />
                      ) : (
                        <Copy className="w-3 h-3" style={{ color: '#555' }} />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="w-3.5 h-3.5" style={{ color: '#555' }} />
                      <span className="text-[10px] uppercase tracking-wider" style={{ color: '#555' }}>USDC</span>
                    </div>
                    <span className="text-sm font-mono font-semibold" style={{ color: '#EDEDED' }}>
                      {usdcBalance !== null
                        ? `$${Number(usdcBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : '--'}
                    </span>
                  </div>
                </div>

                {/* Disconnect */}
                <button
                  onClick={handleDisconnect}
                  className="w-full flex items-center justify-center gap-2 py-3.5 transition-colors hover:bg-white/[0.03] active:scale-[0.99]"
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                    color: '#FF3B45',
                  }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Disconnect Wallet</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <Clock className="w-3.5 h-3.5" style={{ color: '#a0a0a0' }} />
          <span className="text-xs font-mono tabular-nums" style={{ color: '#828282' }}>{time} UTC</span>
        </div>
      </div>
    </header>
  )
}
