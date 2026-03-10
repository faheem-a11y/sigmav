'use client'

import { useState, useEffect, useCallback } from 'react'
import { Save, RotateCcw, Link2, ChevronDown, Shield, Scale, Zap } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { TableSkeleton } from '@/components/ui/skeleton'
import type { StrategyConfig as StrategyConfigType } from '@/lib/utils/types'

type ConfigValues = Omit<StrategyConfigType, 'updatedAt'>

const PRESETS: { id: string; label: string; icon: typeof Shield; description: string; values: ConfigValues }[] = [
  {
    id: 'conservative',
    label: 'Conservative',
    icon: Shield,
    description: 'Lower risk, fewer trades, tighter stops',
    values: {
      minFundingSpread: 0.02,
      maxPositionSizeUsd: 5000,
      maxTotalPositions: 3,
      maxPortfolioAllocation: 0.15,
      stopLossPct: 0.03,
      takeProfitPct: 0.03,
      rebalanceThreshold: 0.01,
      vaultInitialCapital: 1000000,
    },
  },
  {
    id: 'moderate',
    label: 'Moderate',
    icon: Scale,
    description: 'Balanced risk and reward',
    values: {
      minFundingSpread: 0.01,
      maxPositionSizeUsd: 10000,
      maxTotalPositions: 5,
      maxPortfolioAllocation: 0.25,
      stopLossPct: 0.05,
      takeProfitPct: 0.05,
      rebalanceThreshold: 0.005,
      vaultInitialCapital: 1000000,
    },
  },
  {
    id: 'aggressive',
    label: 'Aggressive',
    icon: Zap,
    description: 'More trades, larger positions, wider stops',
    values: {
      minFundingSpread: 0.005,
      maxPositionSizeUsd: 25000,
      maxTotalPositions: 10,
      maxPortfolioAllocation: 0.40,
      stopLossPct: 0.10,
      takeProfitPct: 0.10,
      rebalanceThreshold: 0.002,
      vaultInitialCapital: 1000000,
    },
  },
]

const DEFAULTS = PRESETS[1].values // Moderate

interface FieldDef {
  key: keyof ConfigValues
  label: string
  helper: string
  step: number
  isPercent?: boolean
}

const SIMPLE_FIELDS: FieldDef[] = [
  { key: 'vaultInitialCapital', label: 'Starting Capital (USD)', helper: 'Initial capital for the vault simulation', step: 10000 },
]

const TP_SL_FIELDS: FieldDef[] = [
  { key: 'stopLossPct', label: 'Stop Loss (%)', helper: 'Close position if loss exceeds this %', step: 1, isPercent: true },
  { key: 'takeProfitPct', label: 'Take Profit (%)', helper: 'Close position if profit exceeds this %', step: 1, isPercent: true },
]

const ADVANCED_FIELDS: FieldDef[] = [
  { key: 'minFundingSpread', label: 'Min Funding Spread', helper: 'Minimum annualized spread to enter a position', step: 0.001 },
  { key: 'maxPositionSizeUsd', label: 'Max Position Size (USD)', helper: 'Maximum size per individual position', step: 1000 },
  { key: 'maxTotalPositions', label: 'Max Total Positions', helper: 'Maximum number of concurrent positions', step: 1 },
  { key: 'maxPortfolioAllocation', label: 'Max Portfolio Allocation (%)', helper: 'Maximum % of vault allocated to one position', step: 1, isPercent: true },
  { key: 'rebalanceThreshold', label: 'Rebalance Threshold', helper: 'Trigger rebalance when drift exceeds this value', step: 0.005 },
]

function detectPreset(config: ConfigValues): string | null {
  for (const preset of PRESETS) {
    const match = (Object.keys(preset.values) as (keyof ConfigValues)[]).every((k) => {
      if (k === 'vaultInitialCapital') return true // capital is independent of preset
      return config[k] === preset.values[k]
    })
    if (match) return preset.id
  }
  return null
}

export function StrategyConfig() {
  const [config, setConfig] = useState<ConfigValues>(DEFAULTS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const activePreset = detectPreset(config)

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

  const selectPreset = (preset: typeof PRESETS[number]) => {
    setConfig((prev) => ({
      ...preset.values,
      vaultInitialCapital: prev.vaultInitialCapital,
    }))
  }

  const handleChange = (key: keyof ConfigValues, value: string, isPercent?: boolean) => {
    const num = parseFloat(value)
    if (!isNaN(num)) {
      const stored = isPercent ? num / 100 : num
      if (key === 'stopLossPct' || key === 'takeProfitPct') {
        setConfig((prev) => ({ ...prev, stopLossPct: stored, takeProfitPct: stored }))
      } else {
        setConfig((prev) => ({ ...prev, [key]: stored }))
      }
    }
  }

  const displayValue = (key: keyof ConfigValues, isPercent?: boolean) => {
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
    <Card title="Strategy Configuration" subtitle="Choose a risk level or customize parameters">
      {isLoading ? (
        <TableSkeleton rows={6} />
      ) : (
        <div className="space-y-5">
          {/* Risk Level Presets */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-3" style={{ color: '#a0a0a0' }}>
              Risk Level
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PRESETS.map((preset) => {
                const isActive = activePreset === preset.id
                const Icon = preset.icon
                return (
                  <button
                    key={preset.id}
                    onClick={() => selectPreset(preset)}
                    className="text-left p-4 rounded-xl transition-all duration-200 active:scale-[0.98]"
                    style={{
                      background: isActive ? 'rgba(255,59,69,0.06)' : 'rgba(255,255,255,0.02)',
                      border: isActive
                        ? '1.5px solid rgba(255,59,69,0.35)'
                        : '1px solid rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <Icon
                        className="w-4 h-4"
                        style={{ color: isActive ? 'rgba(255,90,90,0.9)' : '#666' }}
                      />
                      <span
                        className="text-sm font-semibold"
                        style={{ color: isActive ? '#FFFFFF' : '#a0a0a0' }}
                      >
                        {preset.label}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: '#888' }}>
                      {preset.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Simple Controls — always visible */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SIMPLE_FIELDS.map(renderField)}
          </div>

          {/* TP / SL — always visible, linked */}
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

          {/* Advanced Settings — collapsed by default */}
          <div>
            <button
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex items-center gap-2 w-full py-2 text-left"
              style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
            >
              <ChevronDown
                className="w-3.5 h-3.5 transition-transform duration-200"
                style={{
                  color: '#666',
                  transform: advancedOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                }}
              />
              <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: '#a0a0a0' }}>
                Advanced Settings
              </span>
              {!activePreset && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-medium"
                  style={{ background: 'rgba(255,170,0,0.1)', color: '#d4a017' }}
                >
                  Custom
                </span>
              )}
            </button>
            {advancedOpen && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3">
                {ADVANCED_FIELDS.map(renderField)}
              </div>
            )}
          </div>

          {/* Save / Reset */}
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
