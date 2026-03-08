'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import type { StrategyConfig as StrategyConfigType } from '@/lib/utils/types'

const DEFAULTS: Omit<StrategyConfigType, 'updatedAt'> = {
  minFundingSpread: 0.005,
  maxPositionSizeUsd: 50000,
  maxTotalPositions: 10,
  maxPortfolioAllocation: 0.25,
  stopLossPct: 0.05,
  takeProfitPct: 0.15,
  rebalanceThreshold: 0.02,
  vaultInitialCapital: 1000000,
}

interface FieldDef {
  key: keyof Omit<StrategyConfigType, 'updatedAt'>
  label: string
  helper: string
  step: number
}

const FIELDS: FieldDef[] = [
  { key: 'minFundingSpread', label: 'Min Funding Spread', helper: 'Minimum annualized spread to enter a position', step: 0.001 },
  { key: 'maxPositionSizeUsd', label: 'Max Position Size (USD)', helper: 'Maximum size per individual position', step: 1000 },
  { key: 'maxTotalPositions', label: 'Max Total Positions', helper: 'Maximum number of concurrent positions', step: 1 },
  { key: 'maxPortfolioAllocation', label: 'Max Portfolio Allocation', helper: 'Maximum fraction of vault allocated to one position', step: 0.01 },
  { key: 'stopLossPct', label: 'Stop Loss %', helper: 'Close position if loss exceeds this percentage', step: 0.01 },
  { key: 'takeProfitPct', label: 'Take Profit %', helper: 'Close position if profit exceeds this percentage', step: 0.01 },
  { key: 'rebalanceThreshold', label: 'Rebalance Threshold', helper: 'Trigger rebalance when drift exceeds this value', step: 0.005 },
  { key: 'vaultInitialCapital', label: 'Vault Initial Capital', helper: 'Starting capital for the paper vault', step: 10000 },
]

export function StrategyConfig() {
  const [config, setConfig] = useState<Omit<StrategyConfigType, 'updatedAt'>>(DEFAULTS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/strategy')
      if (res.ok) {
        const data: StrategyConfigType = await res.json()
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { updatedAt, ...rest } = data
        setConfig(rest)
      }
    } catch {
      // Use defaults on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setIsSaving(true)
    setSaved(false)
    try {
      const res = await fetch('/api/strategy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) throw new Error('Save failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      console.error('Save config failed:', err)
    } finally {
      setIsSaving(false)
    }
  }

  const handleReset = () => {
    setConfig(DEFAULTS)
  }

  const handleChange = (key: keyof Omit<StrategyConfigType, 'updatedAt'>, value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      setConfig((prev) => ({ ...prev, [key]: num }))
    }
  }

  return (
    <Card title="Strategy Configuration" subtitle="Adjust strategy parameters">
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map((field) => (
              <div key={field.key}>
                <label className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#555555' }}>
                  {field.label}
                </label>
                <input
                  type="number"
                  step={field.step}
                  value={config[field.key]}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono rounded-xl transition-all duration-200 focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: '#FFFFFF',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(255,59,69,0.4)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(255,59,69,0.08)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.06)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
                <p className="text-[11px] mt-1" style={{ color: '#555555' }}>{field.helper}</p>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex items-center gap-1.5 disabled:opacity-40"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Config'}
            </button>
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#828282',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Defaults
            </button>
          </div>
        </div>
      )}
    </Card>
  )
}
