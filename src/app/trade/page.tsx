'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { MarketSelector } from '@/components/trade/market-selector'
import { OrderForm } from '@/components/trade/order-form'
import { PositionsPanel } from '@/components/trade/positions-panel'
import { OrderHistory } from '@/components/trade/order-history'
import { usePositions, useOrders } from '@/lib/hooks/use-trade'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface FundingRateData {
  tokenSymbol: string
  marketName: string
  spotPrice: number
  fundingRateLong: number
  fundingRateShort: number
}

export default function TradePage() {
  const [selectedMarket, setSelectedMarket] = useState('ETH')
  const { mutate: mutatePositions } = usePositions()
  const { mutate: mutateOrders } = useOrders()

  const { data: fundingRates } = useSWR<FundingRateData[]>('/api/funding-rates', fetcher, {
    refreshInterval: 30000,
  })

  const markets = (fundingRates ?? []).map((fr) => ({
    symbol: fr.tokenSymbol,
    name: `${fr.tokenSymbol}/USD`,
    price: fr.spotPrice || 0,
    change24h: (fr.fundingRateLong || 0) * 100,
  }))

  const currentMarket = markets.find((m) => m.symbol === selectedMarket)
  const currentPrice = currentMarket?.price || 0

  const handleOrderPlaced = () => {
    mutatePositions()
    mutateOrders()
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold" style={{ color: '#EDEDED' }}>Trade</h1>
          <p className="text-xs" style={{ color: '#555' }}>Execute perpetual trades across venues</p>
        </div>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Market info + Order form */}
        <div className="lg:col-span-4 space-y-4">
          <MarketSelector
            markets={markets}
            selected={selectedMarket}
            onSelect={setSelectedMarket}
          />

          {/* Market stats */}
          {currentMarket && (
            <div
              className="rounded-xl p-4 grid grid-cols-2 gap-3"
              style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#555' }}>Price</p>
                <p className="text-lg font-bold font-mono" style={{ color: '#EDEDED' }}>
                  ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono uppercase tracking-wider" style={{ color: '#555' }}>24h Funding</p>
                <p className="text-lg font-bold font-mono" style={{ color: currentMarket.change24h >= 0 ? '#22c55e' : '#ef4444' }}>
                  {currentMarket.change24h >= 0 ? '+' : ''}{currentMarket.change24h.toFixed(4)}%
                </p>
              </div>
            </div>
          )}

          <OrderForm
            selectedMarket={selectedMarket}
            marketPrice={currentPrice}
            onOrderPlaced={handleOrderPlaced}
          />
        </div>

        {/* Right: Positions + Order history */}
        <div className="lg:col-span-8 space-y-4">
          <PositionsPanel />
          <OrderHistory />
        </div>
      </div>
    </div>
  )
}
