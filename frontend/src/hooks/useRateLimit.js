import { useState, useEffect, useCallback } from 'react'
import api from '../api/client'
import { useAuth } from './useAuth'

const LIMIT = 10

export function useRateLimit() {
  const { user } = useAuth()
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
