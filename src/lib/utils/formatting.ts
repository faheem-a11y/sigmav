export function formatUsd(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '$0.00'
  if (Math.abs(value) >= 1_000_000_000) {
    return `$${(value / 1_000_000_000).toFixed(2)}B`
  }
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`
  }
  return `$${value.toFixed(2)}`
}

export function formatPrice(value: number | undefined | null): string {
  if (value == null || isNaN(value) || value === 0) return '--'
  if (value >= 1000) return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  if (value >= 1) return `$${value.toFixed(2)}`
  return `$${value.toFixed(4)}`
}

export function formatRate(rate: number | undefined | null): string {
  if (rate == null || isNaN(rate)) return '0.0000%'
  if (Math.abs(rate) < 0.0001) {
    return `${(rate * 100).toFixed(6)}%`
  }
  return `${(rate * 100).toFixed(4)}%`
}

export function formatAnnualizedRate(rate: number | undefined | null): string {
  if (rate == null || isNaN(rate)) return '0.00%'
  return `${(rate * 100).toFixed(2)}%`
}

export function formatPnl(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return '+$0.00'
  const sign = value >= 0 ? '+' : ''
  return `${sign}$${Math.abs(value).toFixed(2)}`
}

export function formatTimestamp(unix: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = now - unix

  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`

  const date = new Date(unix * 1000)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatPercentage(value: number, decimals = 2): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function abbreviateAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`
}

export function rateToColor(rate: number): string {
  if (rate > 0.001) return 'rate-positive'
  if (rate > 0) return 'rate-positive-dim'
  if (rate < -0.001) return 'rate-negative'
  if (rate < 0) return 'rate-negative-dim'
  return 'rate-neutral'
}

export function rateToColorStyle(rate: number): string {
  if (rate > 0) return '#1fa854'   // muted emerald, -20% saturation
  if (rate < 0) return '#e0323c'   // deep rose, -20% saturation
  return '#6b6b6b'
}

export function rateToHeatmapColor(rate: number): string {
  if (rate === 0 || Math.abs(rate) < 0.000001) return '#1A1A1A'
  const intensity = Math.min(Math.abs(rate) * 5000, 1)
  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t)
  if (rate > 0) {
    // Deep forest #0D2E1E → vibrant emerald #00D46A
    return `rgb(${lerp(13, 0, intensity)}, ${lerp(46, 212, intensity)}, ${lerp(30, 106, intensity)})`
  }
  // Dark burgundy #2D1416 → brand red #FF3B45
  return `rgb(${lerp(45, 255, intensity)}, ${lerp(20, 59, intensity)}, ${lerp(22, 69, intensity)})`
}
