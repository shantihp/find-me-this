import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import api from '../api/client'

export default function SampleView() {
  const { sampleId } = useParams()
  const [data, setData]     = useState(null)
  const [error, setError]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/samples/view/${sampleId}`)
      .then(r => setData(r.data))
      .catch(e => setError(e.response?.status === 404 ? 'not_found' : 'error'))
      .finally(() => setLoading(false))
  }, [sampleId])

  const expiresIn = data
    ? Math.max(0, Math.ceil((data.expires_at - Date.now() / 1000) / 86400))
    : null

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <Link to="/" className="mb-8 text-xl font-bold text-primary-600 hover:text-primary-700 transition">
        FindMeThis
      </Link>

      {loading && (
        <div className="text-gray-400 text-sm">Loading…</div>
      )}

      {error === 'not_found' && (
        <div className="text-center">
          <p className="text-5xl mb-4">🗑️</p>
          <p className="text-lg font-semibold text-gray-700">Photo not found or expired</p>
          <p className="text-sm text-gray-400 mt-1">Sample photos are automatically deleted after 5 days.</p>
        </div>
      )}

      {error === 'error' && (
        <div className="text-center text-gray-500 text-sm">Something went wrong. Please try again.</div>
      )}

      {data && (
        <div className="bg-white rounded-2xl shadow-md overflow-hidden max-w-lg w-full">
          <img
            src={data.view_url}
            alt={data.file_name}
            className="w-full object-contain max-h-[70vh]"
          />
          <div className="px-5 py-3 flex items-center justify-between border-t border-gray-100">
            <p className="text-sm text-gray-500 truncate max-w-[60%]">{data.file_name}</p>
            {expiresIn > 0 ? (
              <p className="text-xs text-gray-400">Expires in {expiresIn} day{expiresIn !== 1 ? 's' : ''}</p>
            ) : (
              <p className="text-xs text-red-400">Expires soon</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
