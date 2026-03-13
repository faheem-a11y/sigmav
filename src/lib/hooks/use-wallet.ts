'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePrivy, useWallets } from '@privy-io/react-auth'

const PREFS_KEY = 'sigmav_prefs'

interface WalletPrefs {
  connectedDexes: string[]
  activePairs: string[]
}

const DEFAULT_PREFS: WalletPrefs = {
  connectedDexes: [],
  activePairs: [],
}

function loadPrefs(): WalletPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return DEFAULT_PREFS
    return JSON.parse(raw) as WalletPrefs
  } catch {
    return DEFAULT_PREFS
  }
}

function savePrefs(prefs: WalletPrefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function useWallet() {
  const { ready, authenticated, login, logout } = usePrivy()
  const { wallets } = useWallets()
  const [prefs, setPrefs] = useState<WalletPrefs>(DEFAULT_PREFS)
  const [hydrated, setHydrated] = useState(false)

  const address = wallets?.[0]?.address ?? null

  useEffect(() => {
    setPrefs(loadPrefs())
    setHydrated(true)
  }, [])

  const connectWallet = useCallback(() => {
    login()
    return address ?? ''
  }, [login, address])

  const disconnectWallet = useCallback(() => {
    localStorage.removeItem(PREFS_KEY)
    setPrefs(DEFAULT_PREFS)
    logout()
  }, [logout])

  const toggleDex = useCallback((dex: string) => {
    setPrefs((prev) => {
      const has = prev.connectedDexes.includes(dex)
      const connectedDexes = has
        ? prev.connectedDexes.filter((d) => d !== dex)
        : [...prev.connectedDexes, dex]
      const activePairs = has
        ? prev.activePairs.filter((p) => !p.includes(dex))
        : prev.activePairs
      const next = { connectedDexes, activePairs }
      savePrefs(next)
      return next
    })
  }, [])

  const togglePair = useCallback((pair: string) => {
    setPrefs((prev) => {
      const has = prev.activePairs.includes(pair)
      const activePairs = has
        ? prev.activePairs.filter((p) => p !== pair)
        : [...prev.activePairs, pair]
      const next = { ...prev, activePairs }
      savePrefs(next)
      return next
    })
  }, [])

  const update = useCallback((partial: Partial<WalletPrefs & { address?: string }>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...partial }
      savePrefs(next)
      return next
    })
  }, [])

  return {
    address,
    connectedDexes: prefs.connectedDexes,
    activePairs: prefs.activePairs,
    hydrated: hydrated && ready,
    isConnected: authenticated && !!address,
    connectWallet,
    disconnectWallet,
    toggleDex,
    togglePair,
    update,
  }
}

export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}
