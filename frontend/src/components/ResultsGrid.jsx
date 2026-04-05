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
      if (filters.sortBy === 'price_asc') return a.price - b.price
      if (filters.sortBy === 'price_desc') return b.price - a.price
      if (filters.sortBy === 'discount') return (b.discount_percent || 0) - (a.discount_percent || 0)
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
          className="text-sm font-medium text-primary-600 border border-primary-300 rounded-full px-3 py-1"
        >
          Filters & Sort
        </button>
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <>
          <div
            className="fixed inset-0 z-20 bg-black/25 lg:hidden"
            onClick={() => setShowFilters(false)}
          />
          <div className="fixed top-0 left-0 h-full w-60 bg-white z-30 shadow-xl p-5 overflow-y-auto lg:hidden">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-gray-800">Filters & Sort</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >✕</button>
            </div>
            <FilterSidebar filters={filters} onChange={setFilters} total={filtered.length} />
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
