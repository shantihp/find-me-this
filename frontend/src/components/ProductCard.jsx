import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import api from '../api/client'

const PLATFORM_STYLES = {
  myntra:   { bg: 'bg-[#FF3F6C]',   label: 'Myntra' },
  amazon:   { bg: 'bg-[#FF9900]',   label: 'Amazon' },
  flipkart: { bg: 'bg-[#2874F0]',   label: 'Flipkart' },
  ajio:     { bg: 'bg-[#222222]',   label: 'Ajio' },
  nykaa:    { bg: 'bg-[#FC2779]',   label: 'Nykaa' },
  meesho:   { bg: 'bg-[#9B2DEE]',   label: 'Meesho' },
}

function formatPrice(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)
}

export default function ProductCard({ product, onBookmark }) {
  const { user, openLogin } = useAuth()
  const [bookmarked, setBookmarked] = useState(product.bookmarked || false)
  const [saving, setSaving] = useState(false)

  const platform = PLATFORM_STYLES[product.platform?.toLowerCase()] || { bg: 'bg-gray-600', label: product.platform }

  async function handleBookmark() {
    if (!user) { openLogin(); return }
    setSaving(true)
    try {
      if (bookmarked) {
        await api.delete(`/bookmarks/${product.bookmark_id}`)
        setBookmarked(false)
      } else {
        await api.post('/bookmarks', product)
        setBookmarked(true)
      }
      onBookmark?.()
    } catch { /* silent */ } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow group">
      {/* Image */}
      <div className="relative aspect-[3/4] bg-gray-100 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.product_name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.target.src = 'https://placehold.co/300x400?text=No+Image' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl text-gray-300">🛍️</div>
        )}

        {/* Platform badge */}
        <span className={`absolute top-2 left-2 ${platform.bg} text-white text-[10px] font-bold px-2 py-0.5 rounded-full`}>
          {platform.label}
        </span>

        {/* Bookmark button */}
        <button
          onClick={handleBookmark}
          disabled={saving}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center shadow transition
            ${bookmarked ? 'bg-red-500 text-white' : 'bg-white/80 hover:bg-white text-gray-600'}`}
        >
          {bookmarked ? '♥' : '♡'}
        </button>

        {/* Discount badge */}
        {product.discount_percent > 0 && (
          <span className="absolute bottom-2 left-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {product.discount_percent}% OFF
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <p className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug mb-2">
          {product.product_name}
        </p>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-base font-bold text-gray-900">{formatPrice(product.price)}</span>
          {product.original_price > product.price && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(product.original_price)}</span>
          )}
        </div>

        {product.rating && (
          <p className="text-xs text-gray-500 mb-2">⭐ {product.rating}</p>
        )}

        <a
          href={product.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className={`block w-full text-center text-sm font-medium py-1.5 rounded-lg text-white transition ${platform.bg} hover:opacity-90`}
        >
          View on {platform.label}
        </a>
      </div>
    </div>
  )
}
