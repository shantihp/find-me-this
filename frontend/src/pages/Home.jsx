import { useState, useRef } from 'react'
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
  const { run, runText, reset, status, identified, results, error } = useSearch()
  const { canSearch, remaining, refresh, decrement } = useRateLimit()
  const { user } = useAuth()
  const [showLogin, setShowLogin] = useState(false)
  const [loginReason, setLoginReason] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [savedSearch, setSavedSearch] = useState(false)
  const [mode, setMode] = useState('image') // 'image' | 'text'
  const [prompt, setPrompt] = useState('')
  const textareaRef = useRef()

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

  function openLimitModal() {
    setLoginReason('limit')
    setShowLogin(true)
  }

  async function handleImage(base64, previewUrl) {
    if (!user && !canSearch) { openLimitModal(); return }
    setImagePreview(previewUrl)
    setSavedSearch(false)
    const result = await run(base64)
    if (!user) {
      if (result?.limitReached) {
        refresh()
        openLimitModal()
      } else if (!result?.error) {
        decrement()
      }
    }
  }

  async function handleTextSearch(e) {
    e.preventDefault()
    if (!prompt.trim()) return
    if (!user && !canSearch) { openLimitModal(); return }
    setImagePreview(null)
    setSavedSearch(false)
    const result = await runText(prompt.trim())
    if (!user) {
      if (result?.limitReached) {
        refresh()
        openLimitModal()
      } else if (!result?.error) {
        decrement()
      }
    }
  }

  function handleReset() {
    reset()
    setPrompt('')
  }

  function switchMode(m) {
    setMode(m)
    reset()
    setPrompt('')
    setImagePreview(null)
  }

  const isLoading = status === 'identifying' || status === 'searching'
  const showInput = status === 'idle' || isLoading

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-10">
      {/* Hero */}
      {status === 'idle' && (
        <div className="text-center mb-6 sm:mb-8">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-2 sm:mb-3 tracking-tight">
            Find <span className="text-primary-600">any item</span> across India's top shops
          </h1>
          <p className="text-gray-500 text-base sm:text-lg max-w-xl mx-auto">
            Upload a photo or describe what you're looking for — we'll find it on Myntra, Amazon, Flipkart, Ajio, Nykaa, and Meesho.
          </p>
          {!user && remaining <= 3 && remaining > 0 && (
            <p className="text-amber-600 text-sm mt-3 font-medium">
              {remaining} free search{remaining !== 1 ? 'es' : ''} remaining today.{' '}
              <button onClick={() => setShowLogin(true)} className="underline">Sign in for unlimited</button>
            </p>
          )}
        </div>
      )}

      {/* Mode toggle */}
      {showInput && (
        <div className="flex justify-center mb-5 sm:mb-6">
          <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
            <button
              onClick={() => switchMode('image')}
              className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition ${mode === 'image' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="sm:hidden">📷 Image</span>
              <span className="hidden sm:inline">📷 Search by image</span>
            </button>
            <button
              onClick={() => switchMode('text')}
              className={`px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition ${mode === 'text' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <span className="sm:hidden">✏️ Describe</span>
              <span className="hidden sm:inline">✏️ Describe what you want</span>
            </button>
          </div>
        </div>
      )}

      {/* Image upload */}
      {mode === 'image' && showInput && (
        <UploadZone onImage={handleImage} disabled={isLoading || (!user && !canSearch)} />
      )}

      {/* Text search */}
      {mode === 'text' && showInput && (
        <form onSubmit={handleTextSearch} className="max-w-2xl mx-auto">
          <div className="relative">
            <textarea
              ref={textareaRef}
              rows={3}
              placeholder={'Describe what you\'re looking for…\ne.g. "pink short dress for a tall slim girl" or "matte red lipstick long lasting"'}
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSearch(e) } }}
              disabled={isLoading}
              className="w-full border border-gray-300 rounded-2xl px-5 py-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-400 disabled:opacity-50 pr-24"
            />
            <button
              type="submit"
              disabled={isLoading || !prompt.trim()}
              className="absolute bottom-3 right-3 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl px-4 py-2 transition"
            >
              Search
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-2 text-center">Be as descriptive as you like — style, color, occasion, fit, budget</p>
        </form>
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
                  Found: <span className="text-primary-600 font-medium">{identified.sub_type || identified.search_query}</span>
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
          <button onClick={handleReset} className="mt-3 text-sm text-primary-600 hover:underline">Try again</button>
        </div>
      )}

      {/* Results */}
      {status === 'done' && results.length > 0 && (
        <div className="mt-8 sm:mt-10">
          {/* Results header — stacks on mobile */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-5 sm:mb-6">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Results for "{identified?.search_query}"
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {results.length} products · {new Set(results.map(r => r.platform)).size} platforms
              </p>
            </div>
            <div className="flex items-center gap-3 sm:shrink-0">
              <button
                onClick={saveSearch}
                className={`text-sm flex items-center gap-1.5 border rounded-full px-3 py-1.5 transition ${savedSearch ? 'text-amber-500 border-amber-300 bg-amber-50' : 'text-gray-500 border-gray-200 hover:border-amber-300 hover:text-amber-500'}`}
              >
                {savedSearch ? '★ Saved' : '☆ Save search'}
              </button>
              <button onClick={handleReset} className="text-sm text-primary-600 hover:underline">New search</button>
            </div>
          </div>

          {imagePreview && (
            <div className="flex items-center gap-3 mb-5 p-3 bg-white border border-gray-200 rounded-xl w-fit">
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
          <p className="text-sm mt-1">Try rephrasing your description or uploading an image instead</p>
          <button onClick={handleReset} className="mt-4 text-sm text-primary-600 hover:underline">Try again</button>
        </div>
      )}

      {showLogin && <LoginModal onClose={() => { setShowLogin(false); setLoginReason(null) }} reason={loginReason} />}
    </div>
  )
}
