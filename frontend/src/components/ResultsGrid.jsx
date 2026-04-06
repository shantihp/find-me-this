import { useState, useMemo } from 'react'
import ProductCard from './ProductCard'
import FilterSidebar from './FilterSidebar'

const DEFAULT_FILTERS = { platforms: [], minPrice: null, maxPrice: null, sortBy: 'price_asc' }

function SectionHeading({ title, subtitle, count }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <span className="text-xs text-gray-400 shrink-0 ml-3">{count} result{count !== 1 ? 's' : ''}</span>
    </div>
  )
}

function ProductGrid({ products }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
      {products.map((p, i) => (
        <ProductCard key={`${p.platform}-${i}`} product={p} />
      ))}
    </div>
  )
}

function applyFilters(list, filters) {
  let out = [...list]
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
}

export default function ResultsGrid({ direct = [], googleShopping = [] }) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [showFilters, setShowFilters] = useState(false)

  const filteredDirect  = useMemo(() => applyFilters(direct, filters), [direct, filters])
  const filteredGoogle  = useMemo(() => applyFilters(googleShopping, filters), [googleShopping, filters])
  const totalCount      = filteredDirect.length + filteredGoogle.length

  return (
    <div>
      {/* Mobile filter toggle */}
      <div className="flex items-center justify-between mb-4 lg:hidden">
        <p className="text-sm text-gray-600">{totalCount} results</p>
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
          <div
            className="fixed inset-0 z-20 bg-black/30 lg:hidden"
            onClick={() => setShowFilters(false)}
          />
          <div
            className="fixed bottom-0 inset-x-0 z-30 bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto lg:hidden"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-800">Filters & Sort</h2>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center"
              >✕</button>
            </div>
            <div className="px-5 py-4">
              <FilterSidebar filters={filters} onChange={setFilters} total={totalCount} />
              <button
                onClick={() => setShowFilters(false)}
                className="w-full mt-5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-3 text-sm font-semibold transition"
              >
                Show {totalCount} result{totalCount !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </>
      )}

      <div className="flex gap-6">
        {/* Desktop sidebar */}
        <aside className="w-44 shrink-0 hidden lg:block">
          <FilterSidebar filters={filters} onChange={setFilters} total={totalCount} />
        </aside>

        {/* Results */}
        {totalCount === 0 ? (
          <div className="flex-1 text-center py-16 text-gray-400">
            <p className="text-4xl mb-3">🤷</p>
            <p className="font-medium">No results match your filters</p>
            <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-sm text-primary-600 mt-2">Reset filters</button>
          </div>
        ) : (
          <div className="flex-1 space-y-10">
            {filteredDirect.length > 0 && (
              <section>
                <SectionHeading
                  title="Direct Results"
                  subtitle="Linked straight to the retailer"
                  count={filteredDirect.length}
                />
                <ProductGrid products={filteredDirect} />
              </section>
            )}

            {filteredGoogle.length > 0 && (
              <section>
                {filteredDirect.length > 0 && (
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span className="text-xs text-gray-400 font-medium whitespace-nowrap">via Google Shopping</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                )}
                <SectionHeading
                  title="More Results"
                  subtitle="Sourced via Google Shopping"
                  count={filteredGoogle.length}
                />
                <ProductGrid products={filteredGoogle} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
