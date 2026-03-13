'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

interface MarketOption {
  symbol: string
  name: string
  price: number
  change24h: number
}

interface MarketSelectorProps {
  markets: MarketOption[]
  selected: string
  onSelect: (symbol: string) => void
}

export function MarketSelector({ markets, selected, onSelect }: MarketSelectorProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = markets.find((m) => m.symbol === selected)
  const filtered = markets.filter((m) =>
    m.symbol.toLowerCase().includes(search.toLowerCase()) ||
    m.name.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-3 rounded-xl w-full"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <div className="text-left flex-1">
          <p className="text-sm font-bold" style={{ color: '#EDEDED' }}>
            {current?.symbol ?? selected}/USD
          </p>
          <p className="text-xs font-mono" style={{ color: '#666' }}>
            ${current?.price?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}
          </p>
        </div>
        {current && (
          <span
            className="text-xs font-mono"
            style={{ color: current.change24h >= 0 ? '#22c55e' : '#ef4444' }}
          >
            {current.change24h >= 0 ? '+' : ''}{current.change24h.toFixed(2)}%
          </span>
        )}
        <ChevronDown className="w-4 h-4" style={{ color: '#666' }} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 right-0 mt-1 rounded-xl overflow-hidden z-50"
          style={{
            background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          }}
        >
          <div className="p-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
              <Search className="w-3.5 h-3.5" style={{ color: '#555' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search markets..."
                className="bg-transparent text-sm outline-none flex-1"
                style={{ color: '#EDEDED' }}
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((m) => (
              <button
                key={m.symbol}
                onClick={() => { onSelect(m.symbol); setOpen(false); setSearch('') }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/5 transition-colors"
              >
                <div className="text-left">
                  <span className="text-sm font-medium" style={{ color: '#EDEDED' }}>{m.symbol}/USD</span>
                  <span className="text-xs ml-2" style={{ color: '#555' }}>{m.name}</span>
                </div>
                <span className="text-xs font-mono" style={{ color: '#888' }}>
                  ${m.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
