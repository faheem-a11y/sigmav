import { clsx } from 'clsx'

export type BadgeVariant = 'green' | 'red' | 'amber' | 'neutral' | 'blue'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
  /**
   * When true, renders a pulsing dot before the label.
   * Use only for live/streaming status — keep Long/Short static.
   */
  pulse?: boolean
}

/**
 * Color token per variant.
 * `color`  — the text/dot color
 * `rgb`    — the raw R,G,B triplet used to build all rgba() values
 *            so the border and background are always tonally matched.
 */
const variantConfig: Record<BadgeVariant, { color: string; rgb: string }> = {
  green:   { color: '#34d399', rgb: '52,211,153'   }, // emerald-400  — Live / Long
  red:     { color: '#fb7185', rgb: '251,113,133'  }, // rose-400     — Short / negative
  amber:   { color: '#fbbf24', rgb: '251,191,36'   }, // amber-400    — warning / rebalance
  neutral: { color: '#9ca3af', rgb: '156,163,175'  }, // gray-400     — closed / neutral
  blue:    { color: '#60a5fa', rgb: '96,165,250'   }, // blue-400     — info
}

function buildStyle(rgb: string): React.CSSProperties {
  return {
    /*
     * Glassmorphism pill — same construction as the navbar "Live" pill but
     * generalised. A top-to-bottom gradient gives depth on dark surfaces
     * without looking muddy (top layer slightly more opaque = subtle "rim").
     */
    background: `linear-gradient(180deg, rgba(${rgb}, 0.13) 0%, rgba(${rgb}, 0.07) 100%)`,
    borderTop: `1px solid rgba(${rgb}, 0.30)`,
    borderRight: `1px solid rgba(${rgb}, 0.20)`,
    borderBottom: `1px solid rgba(${rgb}, 0.18)`,
    borderLeft: `1px solid rgba(${rgb}, 0.20)`,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    /* Faint inner top highlight — adds perceived depth */
    boxShadow: `inset 0 1px 0 rgba(${rgb}, 0.10)`,
  }
}

export function Badge({ children, variant = 'neutral', className, pulse }: BadgeProps) {
  const { color, rgb } = variantConfig[variant]

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
        'text-[11px] font-medium tracking-wide',
        className
      )}
      style={{ ...buildStyle(rgb), color }}
    >
      {pulse && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
          style={{
            background: color,
            boxShadow: `0 0 5px rgba(${rgb}, 0.75)`,
          }}
        />
      )}
      {children}
    </span>
  )
}
