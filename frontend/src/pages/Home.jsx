import { useState } from 'react'
import UploadZone from '../components/UploadZone'
import ResultsGrid from '../components/ResultsGrid'
import LoginModal from '../components/LoginModal'
import { useSearch } from '../hooks/useSearch'
import { useRateLimit } from '../hooks/useRateLimit'
import { useAuth } from '../hooks/useAuth'
import api from '../api/client'

const STATUS_MSG = {
  identifying: { emoji: '🧠', text: 'Analyzing your image...' },
  searching:   { emoji: '🔍', text: 'Searching across platforms...' },
}

export default function Home() {
  const { run, reset, status, identified, results, error } = useSearch()
  const { canSearch, increment, remaining } = useRateLimit()
  const { user, openLogin } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [imagePreview, setImagePreview] = useState(null)
  const [savedSearch, setSavedSearch] = useState(false)

  async function saveSearch() {
    if (!user) { setShowLogin(true); return }
    try {
      await api.post('/favourites', {
        detected_query: identified.search_query,
        category: identified.category,
      })
      setSavedSearch(true)
    } catch { /* silent */ }
  }

  async function handleImage(base64, previewUrl) {
    if (!user && !canSearch) {
      setShowLogin(true)
      return
    }
    setImagePreview(previewUrl)
    setSavedSearch(false)
    if (!user) increment()
    const result = await run(base64)
    if (result?.limitReached) setShowLogin(true)
  }

  const isLoading = status === 'identifying' || status === 'searching'

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      {/* Hero */}
      {status === 'idle' && (
        <div className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-3 tracking-tight">
            Find <span className="text-primary-600">any item</span> across India's top shops
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Upload a photo of a dress, kurta, lipstick — anything. We'll find it for you on Myntra, Amazon, Flipkart, Ajio, Nykaa, and Meesho.
          </p>
          {!user && remaining <= 3 && remaining > 0 && (
            <p className="text-amber-600 text-sm mt-4 font-medium">
              {remaining} free search{remaining !== 1 ? 'es' : ''} remaining today.{' '}
              <button onClick={() => setShowLogin(true)} className="underline">Sign in for unlimited</button>
            </p>
          )}
        </div>
      )}

      {/* Upload zone */}
      {(status === 'idle' || isLoading) && (
        <UploadZone onImage={handleImage} disabled={isLoading || (!user && !canSearch)} />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="text-center mt-8">
          <div className="inline-flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
            <span className="text-2xl animate-bounce">{STATUS_MSG[status].emoji}</span>
            <div className="text-left">
              <p className="font-semibold text-gray-800">{STATUS_MSG[status].text}</p>
              {identified && (
                <p className="text-sm text-gray-500 mt-0.5">
                  Found: <span className="text-primary-600 font-medium">{identified.sub_type}</span>
                  {identified.attributes && ` · ${identified.attributes}`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="text-center mt-8">
          <p className="text-red-500 font-medium">{error}</p>
          <button onClick={reset} className="mt-3 text-sm text-primary-600 hover:underline">Try again</button>
        </div>
      )}

      {/* Results */}
      {status === 'done' && results.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Results for "{identified?.search_query}"
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {results.length} products found across {new Set(results.map(r => r.platform)).size} platforms
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={saveSearch}
                title={savedSearch ? 'Search saved' : 'Save this search'}
                className={`text-sm flex items-center gap-1.5 border rounded-full px-3 py-1.5 transition ${savedSearch ? 'text-amber-500 border-amber-300 bg-amber-50' : 'text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-500'}`}
              >
                {savedSearch ? '★ Saved' : '☆ Save search'}
              </button>
              <button onClick={reset} className="text-sm text-primary-600 hover:underline">New search</button>
            </div>
          </div>

          {imagePreview && (
            <div className="flex items-center gap-3 mb-6 p-3 bg-white border border-gray-200 rounded-xl w-fit">
              <img src={imagePreview} alt="Searched item" className="w-12 h-12 object-cover rounded-lg" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">Detected</p>
                <p className="text-sm font-semibold text-gray-800 capitalize">{identified?.sub_type}</p>
                <p className="text-xs text-gray-400">{identified?.attributes}</p>
              </div>
            </div>
          )}

          <ResultsGrid products={results} />
        </div>
      )}

      {status === 'done' && results.length === 0 && (
        <div className="text-center mt-12 text-gray-500">
          <p className="text-4xl mb-3">😕</p>
          <p className="font-medium text-gray-700">No results found</p>
          <p className="text-sm mt-1">Try a clearer photo or a different angle</p>
          <button onClick={reset} className="mt-4 text-sm text-primary-600 hover:underline">Try again</button>
        </div>
      )}

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} reason={!canSearch ? 'limit' : undefined} />}
    </div>
  )
}
