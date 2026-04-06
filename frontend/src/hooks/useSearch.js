import { useState } from 'react'
import api from '../api/client'

const EMPTY_RESULTS = { direct: [], google_shopping: [] }

export function useSearch() {
  const [status, setStatus] = useState('idle') // idle | identifying | searching | done | error
  const [identified, setIdentified] = useState(null)
  const [results, setResults] = useState(EMPTY_RESULTS)
  const [error, setError] = useState(null)

  async function run(imageBase64) {
    setStatus('identifying')
    setIdentified(null)
    setResults(EMPTY_RESULTS)
    setError(null)

    try {
      const { data: item } = await api.post('/identify', { image: imageBase64 })
      setIdentified(item)
      setStatus('searching')

      const { data } = await api.post('/search', {
        search_query: item.search_query,
        category: item.category,
      })
      // Handle both old (flat list) and new (split object) API response formats
      const res = Array.isArray(data)
        ? { direct: [], google_shopping: data }
        : { direct: data.direct || [], google_shopping: data.google_shopping || [] }
      setResults(res)
      setStatus('done')

      api.post('/history', {
        detected_query: item.search_query,
        category: item.category,
        result_count: res.direct.length + res.google_shopping.length,
      }).catch(() => {})

      return { item, products: [...res.direct, ...res.google_shopping] }
    } catch (err) {
      if (err.response?.status === 429) {
        setStatus('idle')
        return { limitReached: true }
      }
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
      setStatus('error')
      return { error: true }
    }
  }

  async function runText(prompt) {
    setStatus('searching')
    setIdentified(null)
    setResults(EMPTY_RESULTS)
    setError(null)

    try {
      const { data } = await api.post('/search/text', { prompt })
      setIdentified({ search_query: data.search_query, category: data.category })
      // Handle both old (products key) and new (direct/google_shopping keys) response
      const res = data.products
        ? { direct: [], google_shopping: Array.isArray(data.products) ? data.products : [] }
        : { direct: data.direct || [], google_shopping: data.google_shopping || [] }
      setResults(res)
      setStatus('done')

      api.post('/history', {
        detected_query: data.search_query,
        category: data.category,
        result_count: res.direct.length + res.google_shopping.length,
      }).catch(() => {})

      return { item: data, products: [...res.direct, ...res.google_shopping] }
    } catch (err) {
      if (err.response?.status === 429) {
        setStatus('idle')
        return { limitReached: true }
      }
      setError(err.response?.data?.detail || 'Something went wrong. Please try again.')
      setStatus('error')
      return { error: true }
    }
  }

  function reset() {
    setStatus('idle')
    setIdentified(null)
    setResults(EMPTY_RESULTS)
    setError(null)
  }

  return { run, runText, reset, status, identified, results, error }
}
