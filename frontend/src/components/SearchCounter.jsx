import { useRateLimit } from '../hooks/useRateLimit'

export default function SearchCounter() {
  const { count, limit, remaining } = useRateLimit()
  if (count === 0) return null

  const pct = (count / limit) * 100
  const color = remaining <= 2 ? 'text-red-500' : remaining <= 5 ? 'text-amber-500' : 'text-gray-500'

  return (
    <div className={`text-xs font-medium ${color} flex items-center gap-1.5`}>
      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${remaining <= 2 ? 'bg-red-500' : remaining <= 5 ? 'bg-amber-500' : 'bg-primary-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span>{remaining}/{limit} left</span>
    </div>
  )
}
