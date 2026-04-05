import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const LIMIT = 10

export const RateLimitContext = createContext({
  count: 0, limit: LIMIT, remaining: LIMIT, canSearch: true, loaded: false, refresh: () => {}, decrement: () => {},
})

export function useRateLimit() {
  return useContext(RateLimitContext)
}

export function useRateLimitInit(user) {
  const [state, setState] = useState({ count: 0, limit: LIMIT, remaining: LIMIT, allowed: true, loaded: false })

  const refresh = useCallback(async () => {
    if (user) {
      setState({ count: 0, limit: LIMIT, remaining: LIMIT, allowed: true, loaded: false })
      return
    }
    try {
      const { data } = await api.get('/rate-limit/status')
      setState({ ...data, loaded: true })
    } catch {
      // fail open — don't block searches if status check fails
      setState(s => ({ ...s, loaded: true }))
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  const decrement = useCallback(() => {
    if (user) return
    setState(s => {
      const newCount = s.count + 1
      const newRemaining = Math.max(0, s.remaining - 1)
      return { ...s, count: newCount, remaining: newRemaining, allowed: newRemaining > 0 }
    })
  }, [user])

  return {
    count: state.count,
    remaining: state.remaining,
    canSearch: state.allowed,
    limit: state.limit,
    loaded: state.loaded,
    refresh,
    decrement,
  }
}
