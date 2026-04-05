import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

export default function FolderView() {
  const { folderId } = useParams()
  const [data, setData]       = useState(null)
  const [error, setError]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null) // numeric index into data.photos

  useEffect(() => {
    api.get(`/samples/folder/${folderId}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.status === 404 ? 'not_found' : 'error'))
      .finally(() => setLoading(false))
  }, [folderId])

  // Keyboard nav for lightbox
  useEffect(() => {
    if (lightbox === null) return
    function onKey(e) {
      if (e.key === 'Escape')     setLightbox(null)
      if (e.key === 'ArrowRight') setLightbox(i => (i + 1 < data.photos.length ? i + 1 : i))
      if (e.key === 'ArrowLeft')  setLightbox(i => (i > 0 ? i - 1 : i))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox, data])

  function formatDate(dateStr) {
    if (!dateStr) return 'Shared photos'
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)
    const todayStr = new Date().toISOString().split('T')[0]
    const yestStr  = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    if (dateStr === todayStr) return "Today's photos"
    if (dateStr === yestStr)  return "Yesterday's photos"
    return date.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">Loading…</div>
  )

  if (error === 'not_found') return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <p className="text-5xl mb-4">🗑️</p>
      <p className="text-lg font-semibold text-gray-700">Folder not found or expired</p>
      <p className="text-sm text-gray-400 mt-1">Shared folders are automatically deleted after 5 days.</p>
      <Link to="/" className="mt-6 text-sm text-primary-600 hover:underline">Back to FindMeThis</Link>
    </div>
  )

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh] text-gray-400 text-sm">
      Something went wrong. <Link to="/" className="ml-2 text-primary-600 hover:underline">Go home</Link>
    </div>
  )

  const daysLeft = Math.max(0, Math.ceil((data.expires_at - Date.now() / 1000) / 86400))

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{formatDate(data.date_str)}</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {data.photos.length} photo{data.photos.length !== 1 ? 's' : ''}
            {daysLeft > 0 ? ` · expires in ${daysLeft}d` : ' · expiring soon'}
          </p>
        </div>
        <Link to="/" className="text-sm font-bold text-primary-600 hover:text-primary-700 shrink-0 mt-1">
          FindMeThis
        </Link>
      </div>

      {data.photos.length === 0 ? (
        <p className="text-center text-gray-400 py-16 text-sm">No photos in this folder.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {data.photos.map((photo, i) => (
            <button
              key={photo.sample_id}
              onClick={() => setLightbox(i)}
              className="aspect-square rounded-xl overflow-hidden bg-gray-100 hover:opacity-90 active:scale-95 transition"
            >
              <img
                src={photo.view_url}
                alt={photo.file_name}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Image */}
          <img
            src={data.photos[lightbox].view_url}
            alt={data.photos[lightbox].file_name}
            className="max-w-full max-h-full object-contain px-12"
            onClick={e => e.stopPropagation()}
          />

          {/* Close */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl w-10 h-10 flex items-center justify-center"
            onClick={() => setLightbox(null)}
          >✕</button>

          {/* Counter */}
          <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-xs">
            {lightbox + 1} / {data.photos.length}
          </p>

          {/* Prev */}
          {lightbox > 0 && (
            <button
              className="absolute left-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-10 h-16 flex items-center justify-center"
              onClick={e => { e.stopPropagation(); setLightbox(l => l - 1) }}
            >‹</button>
          )}

          {/* Next */}
          {lightbox < data.photos.length - 1 && (
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-4xl w-10 h-16 flex items-center justify-center"
              onClick={e => { e.stopPropagation(); setLightbox(l => l + 1) }}
            >›</button>
          )}
        </div>
      )}
    </div>
  )
}
