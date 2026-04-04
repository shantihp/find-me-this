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
      const { data: item } = await api.post('/identify', { image: imageBase64 })
      setIdentified(item)
      setStatus('searching')

      const { data: products } = await api.post('/search', {
        search_query: item.search_query,
        category: item.category,
      })
      setResults(products)
      setStatus('done')

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

  async function runText(prompt) {
    setStatus('searching')
    setIdentified(null)
    setResults([])
    setError(null)

    try {
      const { data } = await api.post('/search/text', { prompt })
      setIdentified({ search_query: data.search_query, category: data.category })
      setResults(data.products)
      setStatus('done')

      api.post('/history', {
        detected_query: data.search_query,
        category: data.category,
        result_count: data.products.length,
      }).catch(() => {})

      return { item: data, products: data.products }
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

  return { run, runText, reset, status, identified, results, error }
}
