'use client'

import useSWR from 'swr'
import { useWallet } from './use-wallet'

const fetcher = ([url, address]: [string, string]) =>
  fetch(url, { headers: { 'x-wallet-address': address } }).then((r) => r.json())

export function usePositions() {
  const { address } = useWallet()
  const { data, error, mutate } = useSWR(
    address ? ['/api/positions', address] : null,
    fetcher,
    { refreshInterval: 10000 },
  )
  return {
    positions: data ?? [],
    isLoading: !data && !error,
    error,
    mutate,
  }
}

export function useOrders() {
  const { address } = useWallet()
  const { data, error, mutate } = useSWR(
    address ? ['/api/trade', address] : null,
    fetcher,
    { refreshInterval: 10000 },
  )
  return {
    orders: data ?? [],
    isLoading: !data && !error,
    error,
    mutate,
  }
}

interface PlaceOrderParams {
  venue: string
  market: string
  side: 'long' | 'short'
  sizeUsd: number
  leverage: number
  orderType: 'market' | 'limit'
  limitPrice?: number
}

interface TradeResult {
  orderId: string
  venue: string
  market: string
  side: string
  sizeUsd: number
  entryPrice: number | null
  status: string
  txHash?: string
  dbOrderId?: number
  unsignedTx?: {
    to: string
    data: string
    value: string
  }
  error?: string
}

/**
 * Place an order on a venue. For GMX, this returns an unsignedTx that must
 * be signed client-side via the wallet provider. Use `executePairedTrade`
 * for the full flow including wallet signing.
 */
export async function placeOrder(
  address: string,
  params: PlaceOrderParams,
): Promise<TradeResult> {
  const res = await fetch('/api/trade', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': address,
    },
    body: JSON.stringify(params),
  })
  return res.json()
}

/**
 * Execute a paired funding arbitrage trade: long on one venue, short on another.
 * Handles GMX unsigned tx signing via the wallet provider.
 */
export async function executePairedTrade(
  address: string,
  longVenue: string,
  shortVenue: string,
  tokenSymbol: string,
  sizeUsd: number,
  leverage: number,
  walletProvider?: { request: (args: { method: string; params: unknown[] }) => Promise<string> },
): Promise<{ longResult: TradeResult; shortResult: TradeResult }> {
  // Place both orders in parallel
  const [longResult, shortResult] = await Promise.all([
    placeOrder(address, {
      venue: longVenue,
      market: tokenSymbol,
      side: 'long',
      sizeUsd,
      leverage,
      orderType: 'market',
    }),
    placeOrder(address, {
      venue: shortVenue,
      market: tokenSymbol,
      side: 'short',
      sizeUsd,
      leverage,
      orderType: 'market',
    }),
  ])

  // Handle GMX unsigned transactions that need wallet signing
  if (walletProvider) {
    const signAndConfirm = async (result: TradeResult): Promise<TradeResult> => {
      if (result.unsignedTx && result.status === 'pending') {
        try {
          const txHash = await walletProvider.request({
            method: 'eth_sendTransaction',
            params: [{
              from: address,
              to: result.unsignedTx.to,
              data: result.unsignedTx.data,
              value: '0x' + BigInt(result.unsignedTx.value).toString(16),
            }],
          })

          // Confirm the order on the server
          const confirmRes = await fetch('/api/trade/gmx-confirm', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-wallet-address': address,
            },
            body: JSON.stringify({
              orderId: result.dbOrderId,
              txHash,
            }),
          })
          const confirmed = await confirmRes.json()
          return { ...result, status: confirmed.status || 'submitted', txHash }
        } catch (err) {
          console.error('Wallet signing failed:', err)
          return { ...result, status: 'failed' }
        }
      }
      return result
    }

    const [signedLong, signedShort] = await Promise.all([
      signAndConfirm(longResult),
      signAndConfirm(shortResult),
    ])

    return { longResult: signedLong, shortResult: signedShort }
  }

  return { longResult, shortResult }
}

export async function confirmGmxOrder(
  address: string,
  orderId: number,
  txHash: string,
  entryPrice?: number,
) {
  const res = await fetch('/api/trade/gmx-confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-wallet-address': address,
    },
    body: JSON.stringify({ orderId, txHash, entryPrice }),
  })
  return res.json()
}
