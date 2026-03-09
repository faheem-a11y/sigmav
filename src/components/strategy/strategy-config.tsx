'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, RotateCcw, Link2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import type { StrategyConfig as StrategyConfigType } from '@/lib/utils/types'

const DEFAULTS: Omit<StrategyConfigType, 'updatedAt'> = {
  minFundingSpread: 0.005,
  maxPositionSizeUsd: 50000,
  maxTotalPositions: 10,
  maxPortfolioAllocation: 0.25,
  stopLossPct: 0.05,
  takeProfitPct: 0.05,
  rebalanceThreshold: 0.02,
  vaultInitialCapital: 1000000,
}

interface FieldDef {
  key: keyof Omit<StrategyConfigType, 'updatedAt'>
  label: string
  helper: string
  step: number
  /** If true, value is stored as decimal (0–1) but displayed/edited as percentage (0–100) */
  isPercent?: boolean
}

const FIELDS: FieldDef[] = [
  { key: 'minFundingSpread', label: 'Min Funding Spread', helper: 'Minimum annualized spread to enter a position', step: 0.001 },
  { key: 'maxPositionSizeUsd', label: 'Max Position Size (USD)', helper: 'Maximum size per individual position', step: 1000 },
  { key: 'maxTotalPositions', label: 'Max Total Positions', helper: 'Maximum number of concurrent positions', step: 1 },
  { key: 'maxPortfolioAllocation', label: 'Max Portfolio Allocation (%)', helper: 'Maximum % of vault allocated to one position', step: 1, isPercent: true },
  { key: 'rebalanceThreshold', label: 'Rebalance Threshold', helper: 'Trigger rebalance when drift exceeds this value', step: 0.005 },
  { key: 'vaultInitialCapital', label: 'Vault Initial Capital', helper: 'Starting capital for the vault', step: 10000 },
]

const TP_SL_FIELDS: FieldDef[] = [
  { key: 'stopLossPct', label: 'Stop Loss (%)', helper: 'Close position if loss exceeds this %', step: 1, isPercent: true },
  { key: 'takeProfitPct', label: 'Take Profit (%)', helper: 'Close position if profit exceeds this %', step: 1, isPercent: true },
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

  const handleChange = (key: keyof Omit<StrategyConfigType, 'updatedAt'>, value: string, isPercent?: boolean) => {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      const stored = isPercent ? num / 100 : num
      // Keep stopLossPct and takeProfitPct always in sync
      if (key === 'stopLossPct' || key === 'takeProfitPct') {
        setConfig((prev) => ({ ...prev, stopLossPct: stored, takeProfitPct: stored }))
      } else {
        setConfig((prev) => ({ ...prev, [key]: stored }))
      }
    }
  }

  const displayValue = (key: keyof Omit<StrategyConfigType, 'updatedAt'>, isPercent?: boolean) => {
    const raw = config[key] as number
    return isPercent ? +(raw * 100).toFixed(4) : raw
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#FFFFFF',
    height: '44px',
  }

  const renderField = (field: FieldDef) => (
    <div key={field.key}>
      <label
        className="block text-[11px] font-semibold uppercase tracking-widest mb-1.5"
        style={{ color: '#a0a0a0' }}
      >
        {field.label}
      </label>
      <input
        type="number"
        inputMode={field.isPercent || field.step < 1 ? 'decimal' : 'numeric'}
        step={field.isPercent ? 1 : field.step}
        value={displayValue(field.key, field.isPercent)}
        onChange={(e) => handleChange(field.key, e.target.value, field.isPercent)}
        className="w-full px-3 text-sm font-mono rounded-xl transition-all duration-200 focus:outline-none"
        style={inputStyle}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(255,59,69,0.4)'
          e.target.style.boxShadow = '0 0 0 3px rgba(255,59,69,0.08)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(255,255,255,0.06)'
          e.target.style.boxShadow = 'none'
        }}
      />
      <p className="text-[11px] mt-1" style={{ color: '#888888' }}>{field.helper}</p>
    </div>
  )

  return (
    <Card title="Strategy Configuration" subtitle="Adjust strategy parameters">
      {isLoading ? (
        <TableSkeleton rows={8} />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {FIELDS.map(renderField)}
          </div>

          {/* TP / SL — always equal, linked */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#a0a0a0' }}>
                Take Profit / Stop Loss
              </p>
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{
                  background: 'rgba(255,59,69,0.08)',
                  border: '1px solid rgba(255,59,69,0.18)',
                  color: 'rgba(255,90,90,0.85)',
                }}
              >
                <Link2 className="w-2.5 h-2.5" />
                Linked — always equal
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {TP_SL_FIELDS.map(renderField)}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-4" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
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
              className="flex items-center gap-1.5 px-4 text-sm font-medium rounded-xl transition-all duration-200 active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.04)',
                color: '#a0a0a0',
                border: '1px solid rgba(255,255,255,0.06)',
                height: '44px',
              }}
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
