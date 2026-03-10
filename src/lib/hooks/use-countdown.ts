'use client'

import { useState, useEffect } from 'react'
import { getSecondsUntilPayout, formatCountdown, getNearestCountdown } from '@/lib/utils/countdown'

interface CountdownState {
  formatted: string
  seconds: number
  isImminent: boolean
}

const CONTINUOUS: CountdownState = { formatted: 'Continuous', seconds: -1, isImminent: false }

export function usePayoutCountdown(venue: string): CountdownState {
  const [state, setState] = useState<CountdownState>(() => {
    const secs = getSecondsUntilPayout(venue)
    if (secs === null) return CONTINUOUS
    return { formatted: formatCountdown(secs), seconds: secs, isImminent: secs < 60 }
  })

  useEffect(() => {
    if (venue === 'GMX') {
      setState(CONTINUOUS)
      return
    }

    const tick = () => {
      const secs = getSecondsUntilPayout(venue)
      if (secs === null) return
      setState({ formatted: formatCountdown(secs), seconds: secs, isImminent: secs < 60 })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [venue])

  return state
}

interface NearestCountdownState extends CountdownState {
  venue: string | null
}

const CONTINUOUS_NEAREST: NearestCountdownState = { ...CONTINUOUS, venue: null }

export function useNearestPayoutCountdown(venueA: string, venueB: string): NearestCountdownState {
  const [state, setState] = useState<NearestCountdownState>(() => {
    const nearest = getNearestCountdown(venueA, venueB)
    if (!nearest) return CONTINUOUS_NEAREST
    return {
      formatted: formatCountdown(nearest.seconds),
      seconds: nearest.seconds,
      isImminent: nearest.seconds < 60,
      venue: nearest.venue,
    }
  })

  useEffect(() => {
    const bothGmx = venueA === 'GMX' && venueB === 'GMX'
    if (bothGmx) {
      setState(CONTINUOUS_NEAREST)
      return
    }

    const tick = () => {
      const nearest = getNearestCountdown(venueA, venueB)
      if (!nearest) return
      setState({
        formatted: formatCountdown(nearest.seconds),
        seconds: nearest.seconds,
        isImminent: nearest.seconds < 60,
        venue: nearest.venue,
      })
    }

    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [venueA, venueB])

  return state
}
