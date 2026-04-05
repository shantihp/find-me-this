import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import SearchCounter from './SearchCounter'

export default function Navbar({ onLoginClick, onLogoClick }) {
  const { user } = useAuth()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" onClick={onLogoClick} className="flex items-center gap-2 font-bold text-lg text-primary-700">
          <span className="text-2xl">🔍</span>
          <span>FindMeThis</span>
        </Link>

        {/* Desktop: full user section */}
        <div className="hidden sm:flex items-center gap-4">
          {!user && <SearchCounter />}
          {user ? (
            <Link to="/profile" className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-600">
              {user.avatar ? (
                <img src={user.avatar} className="w-7 h-7 rounded-full" alt="" />
              ) : (
                <div className="w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center text-xs font-bold">
                  {user.name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <span className="hidden sm:inline">{user.name}</span>
            </Link>
          ) : (
            <button
              onClick={onLoginClick}
              className="text-sm font-medium px-4 py-1.5 rounded-full bg-primary-600 text-white hover:bg-primary-700 transition"
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile: only show search counter if guest (sign in is in BottomNav) */}
        <div className="flex sm:hidden items-center">
          {!user && <SearchCounter />}
        </div>
      </div>
    </nav>
  )
}
