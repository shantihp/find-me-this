import { useState } from 'react'
import api from '../api/client'

export function useSearch() {
  const [status, setStatus] = useState('idle') // idle | identifying | searching | done | error
  const [identified, setIdentified] = useState(null)
  const [results, setResults] = useState([])
  const [error, setError] = useState(null)

  async function run(imageBase64) {
    setStatus('identifying')
    setIdentified(null)
    setResults([])
    setError(null)

    try {
      // Step 1: identify the item
      const { data: item } = await api.post('/identify', { image: imageBase64 })
      setIdentified(item)
      setStatus('searching')

      // Step 2: search all platforms
      const { data: products } = await api.post('/search', {
        search_query: item.search_query,
        category: item.category,
      })
      setResults(products)
      setStatus('done')

      // Record history (fire-and-forget, silent if unauthenticated)
      api.post('/history', {
        detected_query: item.search_query,
        category: item.category,
        result_count: products.length,
      }).catch(() => {})

      return { item, products }
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
    setResults([])
    setError(null)
  }

  return { run, reset, status, identified, results, error }
}
