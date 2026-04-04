const PLATFORMS = ['Myntra', 'Amazon', 'Flipkart', 'Ajio', 'Nykaa', 'Meesho']

export default function FilterSidebar({ filters, onChange, total }) {
  const { platforms, minPrice, maxPrice, sortBy } = filters

  function togglePlatform(p) {
    const next = platforms.includes(p) ? platforms.filter(x => x !== p) : [...platforms, p]
    onChange({ ...filters, platforms: next })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Platforms</h3>
        <div className="space-y-1.5">
          {PLATFORMS.map(p => (
            <label key={p} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={platforms.length === 0 || platforms.includes(p)}
                onChange={() => togglePlatform(p)}
                className="rounded text-primary-600"
              />
              <span className="text-sm text-gray-700">{p}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Price range</h3>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            value={minPrice || ''}
            onChange={e => onChange({ ...filters, minPrice: e.target.value ? +e.target.value : null })}
            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
          />
          <span className="text-gray-400">–</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice || ''}
            onChange={e => onChange({ ...filters, maxPrice: e.target.value ? +e.target.value : null })}
            className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">Sort by</h3>
        <select
          value={sortBy}
          onChange={e => onChange({ ...filters, sortBy: e.target.value })}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
        >
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
          <option value="discount">Best Discount</option>
          <option value="relevance">Relevance</option>
        </select>
      </div>

      <p className="text-xs text-gray-400">{total} result{total !== 1 ? 's' : ''} found</p>
    </div>
  )
}
