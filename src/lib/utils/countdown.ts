/**
 * Funding payout countdown utilities.
 *
 * GMX:         Continuous (no discrete payout)
 * HyperLiquid: Every hour on the hour (XX:00:00 UTC)
 * Paradex:     Every 8 hours (00:00, 08:00, 16:00 UTC)
 */

const PARADEX_PAYOUT_HOURS = [0, 8, 16] as const

export function getSecondsUntilPayout(venue: string): number | null {
  if (venue === 'GMX') return null

  const now = new Date()

  if (venue === 'HyperLiquid') {
    const next = new Date(now)
    next.setUTCMinutes(0, 0, 0)
    next.setUTCHours(now.getUTCHours() + 1)
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
  }

  if (venue === 'Paradex') {
    const currentHour = now.getUTCHours()
    const nextPayoutHour = PARADEX_PAYOUT_HOURS.find((h) => h > currentHour)
      ?? PARADEX_PAYOUT_HOURS[0] + 24 // wrap to next day's 00:00

    const next = new Date(now)
    next.setUTCHours(nextPayoutHour % 24, 0, 0, 0)
    if (nextPayoutHour >= 24) {
      next.setUTCDate(next.getUTCDate() + 1)
    }
    return Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
  }

  return null
}

export function formatCountdown(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const pad = (n: number) => String(n).padStart(2, '0')

  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`
  return `${pad(m)}:${pad(s)}`
}

export function getNearestCountdown(venueA: string, venueB: string): { venue: string; seconds: number } | null {
  const a = getSecondsUntilPayout(venueA)
  const b = getSecondsUntilPayout(venueB)

  if (a === null && b === null) return null
  if (a === null) return { venue: venueB, seconds: b! }
  if (b === null) return { venue: venueA, seconds: a }
  return a <= b ? { venue: venueA, seconds: a } : { venue: venueB, seconds: b }
}
