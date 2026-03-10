import { clsx } from 'clsx'
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from 'lucide-react'

interface MetricCardProps {
  label: string
  value: string
  subtitle?: string
  change?: number
  icon?: LucideIcon
  className?: string
}

export function MetricCard({ label, value, subtitle, change, icon: Icon, className }: MetricCardProps) {
  const isPositive = change !== undefined && change > 0
  const isNegative = change !== undefined && change < 0

  return (
    <div
      className={clsx('glass-card p-4 md:p-5', className)}
      style={{ cursor: 'default' }}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-medium uppercase tracking-widest mb-2.5"
            style={{ color: '#464646', letterSpacing: '0.1em' }}
          >
            {label}
          </p>
          <p className="metric-value truncate text-xl md:text-2xl">{value}</p>
          {subtitle && (
            <p className="text-[11px] font-mono mt-1" style={{ color: '#666' }}>{subtitle}</p>
          )}
          {change !== undefined && (
            <div
              className="flex items-center gap-1 mt-2 text-xs font-semibold"
              style={{ color: isPositive ? '#22c55e' : isNegative ? '#FF3B45' : '#828282' }}
            >
              {isPositive && <TrendingUp className="w-3 h-3" />}
              {isNegative && <TrendingDown className="w-3 h-3" />}
              {!isPositive && !isNegative && <Minus className="w-3 h-3" />}
              <span className="font-mono">{change > 0 ? '+' : ''}{(change * 100).toFixed(2)}%</span>
            </div>
          )}
        </div>
        {Icon && (
          <div
            className="w-9 h-9 md:w-10 md:h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'rgba(255,59,69,0.08)',
              border: '1px solid rgba(255,59,69,0.1)',
            }}
          >
            <Icon className="w-4 h-4" style={{ color: '#FF3B45' }} />
          </div>
        )}
      </div>
    </div>
  )
}
