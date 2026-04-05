import { useState, useMemo } from 'react'
import ProductCard from './ProductCard'
import FilterSidebar from './FilterSidebar'

const DEFAULT_FILTERS = { platforms: [], minPrice: null, maxPrice: null, sortBy: 'price_asc' }

export default function ResultsGrid({ products }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const filtered = useMemo(() => {
    let out = [...products]
    if (filters.platforms.length > 0) {
      out = out.filter(p => filters.platforms.includes(
        p.platform.charAt(0).toUpperCase() + p.platform.slice(1).toLowerCase()
      ))
    }
    if (filters.minPrice != null) out = out.filter(p => p.price >= filters.minPrice)
    if (filters.maxPrice != null) out = out.filter(p => p.price <= filters.maxPrice)
    out.sort((a, b) => {
      if (filters.sortBy === 'price_asc')  return a.price - b.price
      if (filters.sortBy === 'price_desc') return b.price - a.price
      if (filters.sortBy === 'discount')   return (b.discount_percent || 0) - (a.discount_percent || 0)
      return 0
    })
    return out
  }, [products, filters])

  return (
    <div>
      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <p className="text-sm text-gray-600">{filtered.length} results</p>
        <button
          onClick={() => setShowFilters(true)}
          className="flex items-center gap-1.5 text-sm font-medium text-primary-600 border border-primary-300 rounded-full px-3 py-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" />
          </svg>
          Filters & Sort
        </button>
      </div>

      {/* Mobile filter bottom sheet */}
      {showFilters && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20 bg-black/30 lg:hidden"
            onClick={() => setShowFilters(false)}
          />
          {/* Sheet */}
          <div
            className="fixed bottom-0 inset-x-0 z-30 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Filters & Sort</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center"
              >✕</button>
            </div>
            {/* Content */}
            <div className="px-5 py-4">
              <FilterSidebar filters={filters} onChange={setFilters} total={filtered.length} />
              <button
                onClick={() => setShowFilters(false)}
                className="w-full mt-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 text-sm font-semibold transition"
              >
                Show {filtered.length} result{filtered.length !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="w-44 shrink-0 hidden lg:block">
          <FilterSidebar filters={filters} onChange={setFilters} total={filtered.length} />
        </aside>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex-1 text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🤷</p>
            <p className="font-medium">No results match your filters</p>
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-sm text-primary-600 mt-2">Reset filters</button>
          </div>
        ) : (
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((p, i) => (
              <ProductCard key={`${p.platform}-${i}`} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
