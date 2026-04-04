import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import api from '../api/client'

const TABS = ['Bookmarks', 'Favourites', 'History']

function formatPrice(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function Profile() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('Bookmarks')
  const [data, setData] = useState({ bookmarks: [], favourites: [], history: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/'); return }
    loadData()
  }, [user])

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

  function logout() {
    setUser(null)
    localStorage.removeItem('auth_user')
    localStorage.removeItem('auth_token')
    navigate('/')
  }

  if (!user) return null

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary-600 text-white flex items-center justify-center text-2xl font-bold shadow">
            {user.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-red-500 hover:text-red-600 border border-red-200 hover:border-red-300 rounded-full px-4 py-1.5 transition"
        >
          Sign out
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Bookmarks', value: data.bookmarks.length, emoji: '🔖' },
          { label: 'Favourites', value: data.favourites.length, emoji: '⭐' },
          { label: 'Searches', value: data.history.length, emoji: '🔍' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl mb-1">{s.emoji}</p>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
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
                        className="block mt-2 text-xs text-center bg-primary-600 text-white rounded-lg py-1.5 hover:bg-primary-700 transition">
                        View product
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* Favourites */}
          {tab === 'Favourites' && (
            data.favourites.length === 0 ? (
              <Empty emoji="⭐" text="No favourites yet" sub="Save a search by clicking ⭐ on the results page" />
            ) : (
              <div className="space-y-3">
                {data.favourites.map((f, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-xl">🔍</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{f.detected_query}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">{f.category} · {new Date(f.saved_at).toLocaleDateString('en-IN')}</p>
                    </div>
                    <button className="text-sm text-primary-600 hover:underline">Re-run</button>
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
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">📸</div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{h.detected_query}</p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {h.category} · {h.result_count} results · {new Date(h.searched_at).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )
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
