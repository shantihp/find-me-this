import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function BottomNav({ onContactClick }) {
  const { user, openLogin } = useAuth()
  const { pathname } = useLocation()

  // Don't show on public share pages
  if (pathname.startsWith('/s/')) return null

  const isHome    = pathname === '/'
  const isProfile = pathname === '/profile'

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm border-t border-gray-200 sm:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-14">
        {/* Search / Home */}
        <Link
          to="/"
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${isHome ? 'text-primary-600' : 'text-gray-400'}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={isHome ? 2.5 : 2} viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
          <span className="text-[10px] font-medium">Search</span>
        </Link>

        {/* Contact */}
        <button
          onClick={onContactClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M4 4h16v16H4z" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m2 7 10 7 10-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-[10px] font-medium">Contact</span>
        </button>

        {/* Profile / Sign in */}
        {user ? (
          <Link
            to="/profile"
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${isProfile ? 'text-primary-600' : 'text-gray-400'}`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${isProfile ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
              {user.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        ) : (
          <button
            onClick={openLogin}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 text-gray-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            <span className="text-[10px] font-medium">Sign in</span>
          </button>
        )}
      </div>
    </nav>
  )
}
