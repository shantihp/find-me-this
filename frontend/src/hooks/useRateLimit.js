import { useState, useCallback } from 'react'

const LIMIT = 10
const KEY = 'fto_rate_limit'

function getTodayKey() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { date: getTodayKey(), count: 0 }
    const state = JSON.parse(raw)
    // Reset if it's a new day
    if (state.date !== getTodayKey()) return { date: getTodayKey(), count: 0 }
    return state
  } catch {
    return { date: getTodayKey(), count: 0 }
  }
}

export function useRateLimit() {
  const [state, setState] = useState(loadState)

  const increment = useCallback(() => {
    setState((prev) => {
      const next = { date: getTodayKey(), count: prev.count + 1 }
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const canSearch = state.count < LIMIT
  const remaining = Math.max(0, LIMIT - state.count)

  return { count: state.count, remaining, canSearch, limit: LIMIT, increment }
}
