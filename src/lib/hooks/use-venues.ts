'use client'

import useSWR from 'swr'
import { useWallet } from './use-wallet'

interface VenueInfo {
  venue: string
  isActive: boolean
  createdAt: number
}

const fetcher = ([url, address]: [string, string]) =>
  fetch(url, { headers: { 'x-wallet-address': address } }).then((r) => r.json())

export function useVenues() {
  const { address } = useWallet()

  const { data, error, mutate } = useSWR<VenueInfo[]>(
    address ? ['/api/venues', address] : null,
    fetcher,
    { refreshInterval: 30000 },
  )

  const saveCredential = async (venue: string, apiKey: string, apiSecret: string) => {
    if (!address) return
    await fetch('/api/venues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
      body: JSON.stringify({ venue, apiKey, apiSecret }),
    })
    mutate()
  }

  const removeCredential = async (venue: string) => {
    if (!address) return
    await fetch('/api/venues', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'x-wallet-address': address },
      body: JSON.stringify({ venue }),
    })
    mutate()
  }

  const verifyCredential = async (venue: string, apiKey: string, apiSecret: string) => {
    const res = await fetch('/api/venues/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ venue, apiKey, apiSecret }),
    })
    return res.json()
  }

  return {
    venues: data ?? [],
    isLoading: !data && !error,
    error,
    saveCredential,
    removeCredential,
    verifyCredential,
    mutate,
  }
}
