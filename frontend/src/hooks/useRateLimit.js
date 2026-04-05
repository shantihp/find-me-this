import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../api/client'

const LIMIT = 10

export const RateLimitContext = createContext({
  count: 0, limit: LIMIT, remaining: LIMIT, canSearch: true, refresh: () => {},
})

export function useRateLimit() {
  return useContext(RateLimitContext)
}

export function useRateLimitInit(user) {
  const [state, setState] = useState({ count: 0, limit: LIMIT, remaining: LIMIT, allowed: true })

  const refresh = useCallback(async () => {
    if (user) {
      setState({ count: 0, limit: LIMIT, remaining: LIMIT, allowed: true })
      return
    }
    try {
      const { data } = await api.get('/rate-limit/status')
      setState(data)
    } catch {
      // fail open — don't block searches if status check fails
    }
  }, [user])

  useEffect(() => { refresh() }, [refresh])

  return {
    count: state.count,
    remaining: state.remaining,
    canSearch: state.allowed,
    limit: state.limit,
    refresh,
  }
}
