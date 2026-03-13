'use client'

import { useState } from 'react'
import { useWallet } from '@/lib/hooks/use-wallet'
import { placeOrder } from '@/lib/hooks/use-trade'

interface OrderFormProps {
  selectedMarket: string
  marketPrice: number
  onOrderPlaced: () => void
}

export function OrderForm({ selectedMarket, marketPrice, onOrderPlaced }: OrderFormProps) {
  const { address } = useWallet()
  const [venue, setVenue] = useState('GMX')
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [sizeUsd, setSizeUsd] = useState('')
  const [leverage, setLeverage] = useState(2)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [limitPrice, setLimitPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const venues = ['GMX']

  const handleSubmit = async () => {
    if (!address || !sizeUsd) return
    setLoading(true)
    setError(null)

    try {
      const result = await placeOrder(address, {
        venue,
        market: selectedMarket,
        side,
        sizeUsd: Number(sizeUsd),
        leverage,
        orderType,
        limitPrice: orderType === 'limit' ? Number(limitPrice) : undefined,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.unsignedTx) {
        // For GMX: need to sign the transaction via wallet
        // This will be handled by Privy's sendTransaction
        setError('Transaction ready — sign in your wallet to confirm')
        onOrderPlaced()
      } else {
        onOrderPlaced()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Order failed')
    } finally {
      setLoading(false)
    }
  }

  const collateral = sizeUsd ? (Number(sizeUsd) / leverage).toFixed(2) : '0.00'

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Venue tabs */}
      <div className="flex gap-1 mb-4">
        {venues.map((v) => (
          <button
            key={v}
            onClick={() => setVenue(v)}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-colors"
            style={{
              background: venue === v ? 'rgba(255,59,59,0.15)' : 'rgba(255,255,255,0.04)',
              color: venue === v ? '#FF5050' : '#666',
              border: `1px solid ${venue === v ? 'rgba(255,59,59,0.3)' : 'rgba(255,255,255,0.06)'}`,
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Long/Short toggle */}
      <div className="flex gap-1 mb-4">
        <button
          onClick={() => setSide('long')}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
          style={{
            background: side === 'long' ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)',
            color: side === 'long' ? '#22c55e' : '#666',
            border: `1px solid ${side === 'long' ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          Long
        </button>
        <button
          onClick={() => setSide('short')}
          className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
          style={{
            background: side === 'short' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
            color: side === 'short' ? '#ef4444' : '#666',
            border: `1px solid ${side === 'short' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.06)'}`,
          }}
        >
          Short
        </button>
      </div>

      {/* Order type */}
      <div className="flex gap-1 mb-4">
        {(['market', 'limit'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className="flex-1 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: orderType === t ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: orderType === t ? '#EDEDED' : '#555',
            }}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Size input */}
      <div className="mb-3">
        <label className="text-[10px] font-mono uppercase tracking-wider mb-1.5 block" style={{ color: '#555' }}>
          Size (USD)
        </label>
        <input
          type="number"
          value={sizeUsd}
          onChange={(e) => setSizeUsd(e.target.value)}
          placeholder="0.00"
          className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
          style={{
            background: 'rgba(0,0,0,0.4)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#EDEDED',
          }}
        />
      </div>

      {/* Limit price (if limit order) */}
      {orderType === 'limit' && (
        <div className="mb-3">
          <label className="text-[10px] font-mono uppercase tracking-wider mb-1.5 block" style={{ color: '#555' }}>
            Limit Price
          </label>
          <input
            type="number"
            value={limitPrice}
            onChange={(e) => setLimitPrice(e.target.value)}
            placeholder={marketPrice.toFixed(2)}
            className="w-full px-3 py-2.5 rounded-lg text-sm font-mono outline-none"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: '#EDEDED',
            }}
          />
        </div>
      )}

      {/* Leverage slider */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#555' }}>
            Leverage
          </label>
          <span className="text-xs font-bold" style={{ color: '#FF5050' }}>{leverage}x</span>
        </div>
        <input
          type="range"
          min="1"
          max="50"
          step="1"
          value={leverage}
          onChange={(e) => setLeverage(Number(e.target.value))}
          className="w-full accent-red-500"
        />
        <div className="flex justify-between mt-1">
          {[1, 5, 10, 25, 50].map((l) => (
            <button
              key={l}
              onClick={() => setLeverage(l)}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{
                background: leverage === l ? 'rgba(255,59,59,0.15)' : 'transparent',
                color: leverage === l ? '#FF5050' : '#444',
              }}
            >
              {l}x
            </button>
          ))}
        </div>
      </div>

      {/* Order summary */}
      <div
        className="rounded-lg px-3 py-2.5 mb-4 space-y-1.5"
        style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}
      >
        <div className="flex justify-between">
          <span className="text-[11px]" style={{ color: '#555' }}>Collateral</span>
          <span className="text-[11px] font-mono" style={{ color: '#888' }}>${collateral}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[11px]" style={{ color: '#555' }}>Market Price</span>
          <span className="text-[11px] font-mono" style={{ color: '#888' }}>
            ${marketPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[11px]" style={{ color: '#555' }}>Venue</span>
          <span className="text-[11px] font-mono" style={{ color: '#888' }}>{venue}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs mb-3 px-1" style={{ color: '#ef4444' }}>{error}</p>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={loading || !sizeUsd || !address}
        className="w-full py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-40"
        style={{
          background: side === 'long'
            ? 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)'
            : 'linear-gradient(180deg, #ef4444 0%, #dc2626 100%)',
          color: '#fff',
          border: `1px solid ${side === 'long' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)'}`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12)',
        }}
      >
        {loading ? 'Placing Order...' : `${side === 'long' ? 'Long' : 'Short'} ${selectedMarket}`}
      </button>
    </div>
  )
}
