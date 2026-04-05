import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/client'

const TABS = ['Bookmarks', 'Saved Searches', 'History', 'Samples']

function formatPrice(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

function formatDayLabel(dateStr) {
  if (!dateStr) return 'Older uploads'
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const todayStr = new Date().toISOString().split('T')[0]
  const yestStr  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
  if (dateStr === todayStr) return 'Today'
  if (dateStr === yestStr)  return 'Yesterday'
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Profile() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Bookmarks')
  const [data, setData] = useState({ bookmarks: [], favourites: [], history: [] })
  const [loading, setLoading] = useState(true)

  // Samples state
  const [samples, setSamples]             = useState([])
  const [samplesLoaded, setSamplesLoaded] = useState(false)
  const [samplesLoading, setSamplesLoading] = useState(false)
  const [uploading, setUploading]         = useState(false)
  const [copiedId, setCopiedId]           = useState(null)      // individual photo link
  const [copiedFolder, setCopiedFolder]   = useState(null)      // folder link
  const fileInputRef = useRef()

  useEffect(() => {
    if (!user) { navigate('/'); return }
    loadData()
  }, [user])

  useEffect(() => {
    if (tab === 'Samples' && !samplesLoaded) loadSamples()
  }, [tab])

  async function loadData() {
    setLoading(true)
    try {
      const [bm, fav, hist] = await Promise.allSettled([
        api.get('/bookmarks'),
        api.get('/favourites'),
        api.get('/history'),
      ])
      setData({
        bookmarks:  bm.status  === 'fulfilled' ? bm.value.data  : [],
        favourites: fav.status === 'fulfilled' ? fav.value.data : [],
        history:    hist.status === 'fulfilled' ? hist.value.data : [],
      })
    } catch { /* silent */ } finally {
      setLoading(false)
    }
  }

  async function loadSamples() {
    setSamplesLoading(true)
    try {
      const r = await api.get('/samples')
      setSamples(r.data)
      setSamplesLoaded(true)
    } catch { /* silent */ } finally {
      setSamplesLoading(false)
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setUploading(true)
    try {
      const base64 = await fileToBase64(file)
      await api.post('/samples', {
        image:     base64,
        file_name: file.name,
        mime_type: file.type || 'image/jpeg',
      })
      await loadSamples()
    } catch { /* silent */ } finally {
      setUploading(false)
    }
  }

  async function handleDelete(sampleId) {
    try {
      await api.delete(`/samples/${sampleId}`)
      setSamples(prev => prev.filter(s => s.sample_id !== sampleId))
    } catch { /* silent */ }
  }

  function copyPhotoLink(sampleId) {
    navigator.clipboard.writeText(`${window.location.origin}/s/${sampleId}`)
    setCopiedId(sampleId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  function copyFolderLink(folderId) {
    navigator.clipboard.writeText(`${window.location.origin}/s/folder/${folderId}`)
    setCopiedFolder(folderId)
    setTimeout(() => setCopiedFolder(null), 2000)
  }

  async function handleLogout() {
    await logout()
    navigate('/')
  }

  // Group samples by date_str, newest first
  const samplesByDay = samples.reduce((acc, s) => {
    const key = s.date_str || '__unknown__'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})
  const sortedDays = Object.keys(samplesByDay).sort().reverse()

  const displayName = user?.name || (user?.email ? user.email.split('@')[0] : 'User')
  const avatarLetter = displayName[0].toUpperCase()

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary-600 text-white flex items-center justify-center text-xl sm:text-2xl font-bold shadow">
            {avatarLetter}
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900">{displayName}</h1>
            <p className="text-xs sm:text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-full px-3 sm:px-4 py-1.5 transition"
        >
          Sign out
        </button>
      </div>

      {/* Stats — clickable, navigate to tab */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[
          { label: 'Bookmarks',     value: data.bookmarks.length,  emoji: '🔖', tab: 'Bookmarks'     },
          { label: 'Saved Searches',value: data.favourites.length, emoji: '⭐', tab: 'Saved Searches' },
          { label: 'Searches',      value: data.history.length,    emoji: '🔍', tab: 'History'        },
        ].map(s => (
          <button
            key={s.label}
            onClick={() => setTab(s.tab)}
            className={`bg-white rounded-xl border p-3 sm:p-4 text-center transition hover:border-primary-300 hover:shadow-sm ${tab === s.tab ? 'border-primary-400 shadow-sm' : 'border-gray-200'}`}
          >
            <p className="text-xl sm:text-2xl mb-1">{s.emoji}</p>
            <p className="text-xl sm:text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-[10px] sm:text-xs text-gray-500 leading-tight mt-0.5">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div className="mb-5 sm:mb-6 overflow-x-auto">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-max min-w-full sm:w-fit">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading && tab !== 'Samples' ? (
        <div className="text-center py-16 text-gray-400">Loading...</div>
      ) : (
        <>
          {/* Bookmarks */}
          {tab === 'Bookmarks' && (
            data.bookmarks.length === 0 ? (
              <Empty emoji="🔖" text="No bookmarks yet" sub="Hit the ♡ on any product to save it here" />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {data.bookmarks.map((b, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {b.image_url && <img src={b.image_url} alt={b.product_name} className="w-full h-40 object-cover" />}
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-800 line-clamp-2">{b.product_name}</p>
                      <p className="text-sm font-bold text-gray-900 mt-1">{formatPrice(b.price)}</p>
                      <a href={b.product_url} target="_blank" rel="noopener noreferrer"
                        className="block mt-2 text-xs text-center bg-primary-600 text-white rounded-lg py-2 hover:bg-primary-700 transition">
                        View product
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Saved Searches */}
          {tab === 'Saved Searches' && (
            data.favourites.length === 0 ? (
              <Empty emoji="⭐" text="No saved searches yet" sub='After a search, click "☆ Save search" to save it here' />
            ) : (
              <div className="space-y-3">
                {data.favourites.map((f, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl shrink-0">🔍</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{f.detected_query}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{f.category} · {new Date(f.saved_at * 1000).toLocaleDateString('en-IN')}</p>
                    </div>
                    <button
                      className="text-sm text-primary-600 hover:underline shrink-0"
                      onClick={() => navigate(`/?q=${encodeURIComponent(f.detected_query)}`)}
                    >Re-run</button>
                  </div>
                ))}
              </div>
            )
          )}

          {/* History */}
          {tab === 'History' && (
            data.history.length === 0 ? (
              <Empty emoji="🕐" text="No search history" sub="Your recent searches will appear here" />
            ) : (
              <div className="space-y-3">
                {data.history.map((h, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg shrink-0">📸</div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{h.detected_query}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {h.category} · {h.result_count} results · {new Date(h.searched_at * 1000).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Samples */}
          {tab === 'Samples' && (
            <div>
              {/* Upload area */}
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-5 mb-6 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-primary-400 hover:bg-primary-50 transition"
                onClick={() => !uploading && fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  capture="environment"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                {uploading ? (
                  <p className="text-sm text-gray-500 py-2">Uploading…</p>
                ) : (
                  <>
                    <p className="text-2xl">📷</p>
                    <p className="text-sm font-medium text-gray-700">Tap to upload a photo</p>
                    <p className="text-xs text-gray-400">Auto-deleted after 5 days · JPEG, PNG, WEBP</p>
                  </>
                )}
              </div>

              {samplesLoading ? (
                <div className="text-center py-12 text-gray-400 text-sm">Loading…</div>
              ) : samples.length === 0 ? (
                <Empty emoji="🖼️" text="No samples yet" sub="Upload a photo above — share with anyone via a link" />
              ) : (
                <div className="space-y-8">
                  {sortedDays.map(dateStr => {
                    const daySamples = samplesByDay[dateStr]
                    const folderId   = daySamples[0]?.folder_id
                    return (
                      <div key={dateStr}>
                        {/* Day header */}
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-sm font-semibold text-gray-700">{formatDayLabel(dateStr)}</h3>
                          {folderId && (
                            <button
                              onClick={() => copyFolderLink(folderId)}
                              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition ${copiedFolder === folderId ? 'bg-green-50 border-green-300 text-green-600' : 'border-gray-200 text-gray-500 hover:border-primary-300 hover:text-primary-600'}`}
                            >
                              {copiedFolder === folderId ? '✓ Copied!' : '📁 Copy folder link'}
                            </button>
                          )}
                        </div>

                        {/* Photo grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {daySamples.map(s => {
                            const daysLeft = Math.max(0, Math.ceil((s.expires_at - Date.now() / 1000) / 86400))
                            return (
                              <div key={s.sample_id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                                {/* Image */}
                                <div className="relative">
                                  <img
                                    src={s.view_url}
                                    alt={s.file_name}
                                    className="w-full aspect-square object-cover"
                                  />
                                  <span className="absolute top-1.5 left-1.5 bg-black/50 text-white text-[10px] font-medium rounded-full px-1.5 py-0.5">
                                    {daysLeft}d left
                                  </span>
                                </div>
                                {/* Always-visible action bar */}
                                <div className="flex items-center gap-1 px-2 py-1.5">
                                  <p className="flex-1 text-xs text-gray-500 truncate">{s.file_name}</p>
                                  <button
                                    onClick={() => copyPhotoLink(s.sample_id)}
                                    title="Copy photo link"
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition text-sm ${copiedId === s.sample_id ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100 text-gray-400 hover:text-gray-600'}`}
                                  >
                                    {copiedId === s.sample_id ? '✓' : '🔗'}
                                  </button>
                                  <button
                                    onClick={() => handleDelete(s.sample_id)}
                                    title="Delete"
                                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-50 text-gray-400 hover:text-red-500 transition text-sm"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function Empty({ emoji, text, sub }) {
  return (
    <div className="text-center py-16 text-gray-400">
      <p className="text-4xl mb-3">{emoji}</p>
      <p className="font-medium text-gray-600">{text}</p>
      <p className="text-sm mt-1">{sub}</p>
    </div>
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
