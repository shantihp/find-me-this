import { useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function LoginModal({ onClose, reason }) {
  const { setUser } = useAuth()
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  // Mock login for UI development — replace with Amplify Auth calls
  function mockLogin(name) {
    const user = { id: 'mock-1', name, email: `${name.toLowerCase()}@example.com`, avatar: null }
    setUser(user)
    localStorage.setItem('auth_user', JSON.stringify(user))
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={ref} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>

        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-xl font-bold text-gray-900">
            {reason === 'limit' ? "You've used all free searches" : 'Sign in to FindMeThis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {reason === 'limit'
              ? 'Sign in for unlimited searches, bookmarks, and favourites — it\'s free.'
              : 'Save products, bookmark searches, and get unlimited results.'}
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => mockLogin('Demo User')}
            className="w-full flex items-center justify-center gap-3 border border-gray-300 rounded-xl py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>

          <div className="relative flex items-center">
            <div className="flex-1 border-t border-gray-200" />
            <span className="px-3 text-xs text-gray-400">or</span>
            <div className="flex-1 border-t border-gray-200" />
          </div>

          <input type="email" placeholder="Email address" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="password" placeholder="Password" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />

          <button
            onClick={() => mockLogin('User')}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white rounded-xl py-2.5 text-sm font-semibold transition"
          >
            Sign in
          </button>

          <p className="text-center text-xs text-gray-400">
            No account? <button className="text-primary-600 hover:underline">Sign up free</button>
          </p>
        </div>
      </div>
    </div>
  )
}
