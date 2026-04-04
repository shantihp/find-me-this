import { useRef, useEffect, useState } from 'react'
import { signIn, signUp, confirmSignUp, resendSignUpCode } from 'aws-amplify/auth'
import { fetchAuthSession } from 'aws-amplify/auth'
import { useAuth } from '../hooks/useAuth'

const VIEWS = { SIGN_IN: 'sign_in', SIGN_UP: 'sign_up', CONFIRM: 'confirm' }

export default function LoginModal({ onClose, reason }) {
  const { setUser } = useAuth()
  const ref = useRef()
  const [view, setView] = useState(VIEWS.SIGN_IN)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function clearError() { setError('') }

  async function handleSignIn(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signIn({ username: email, password })
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (token) localStorage.setItem('auth_token', token)
      const payload = session.tokens?.idToken?.payload
      setUser({ id: payload?.sub, email: payload?.email })
      onClose()
    } catch (err) {
      if (err.name === 'UserNotConfirmedException') {
        await resendSignUpCode({ username: email })
        setView(VIEWS.CONFIRM)
      } else {
        setError(friendlyError(err))
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleSignUp(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await signUp({ username: email, password, options: { userAttributes: { email } } })
      setView(VIEWS.CONFIRM)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleConfirm(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await confirmSignUp({ username: email, confirmationCode: code.trim() })
      // Auto sign in after confirmation
      await signIn({ username: email, password })
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (token) localStorage.setItem('auth_token', token)
      const payload = session.tokens?.idToken?.payload
      setUser({ id: payload?.sub, email: payload?.email })
      onClose()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await resendSignUpCode({ username: email })
      setError('Code resent — check your inbox.')
    } catch (err) {
      setError(friendlyError(err))
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={ref} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-xl font-bold text-gray-900">
            {view === VIEWS.CONFIRM
              ? 'Check your email'
              : reason === 'limit'
              ? "You've used all free searches"
              : view === VIEWS.SIGN_UP
              ? 'Create your account'
              : 'Sign in to FindMeThis'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {view === VIEWS.CONFIRM
              ? `We sent a 6-digit code to ${email}`
              : reason === 'limit'
              ? 'Sign in for unlimited searches and bookmarks — it\'s free.'
              : 'Save products, bookmark searches, and get unlimited results.'}
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Sign In */}
        {view === VIEWS.SIGN_IN && (
          <form onSubmit={handleSignIn} className="space-y-3">
            <input
              type="email" placeholder="Email address" required autoFocus
              value={email} onChange={e => { setEmail(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <input
              type="password" placeholder="Password" required
              value={password} onChange={e => { setPassword(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
            <p className="text-center text-xs text-gray-400">
              No account?{' '}
              <button type="button" onClick={() => { setView(VIEWS.SIGN_UP); clearError() }} className="text-pink-600 hover:underline font-medium">
                Sign up free
              </button>
            </p>
          </form>
        )}

        {/* Sign Up */}
        {view === VIEWS.SIGN_UP && (
          <form onSubmit={handleSignUp} className="space-y-3">
            <input
              type="email" placeholder="Email address" required autoFocus
              value={email} onChange={e => { setEmail(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <input
              type="password" placeholder="Password (min 8 chars)" required minLength={8}
              value={password} onChange={e => { setPassword(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Already have an account?{' '}
              <button type="button" onClick={() => { setView(VIEWS.SIGN_IN); clearError() }} className="text-pink-600 hover:underline font-medium">
                Sign in
              </button>
            </p>
          </form>
        )}

        {/* Confirm */}
        {view === VIEWS.CONFIRM && (
          <form onSubmit={handleConfirm} className="space-y-3">
            <input
              type="text" placeholder="6-digit code" required autoFocus
              maxLength={6} inputMode="numeric"
              value={code} onChange={e => { setCode(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition"
            >
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Didn't get it?{' '}
              <button type="button" onClick={handleResend} className="text-pink-600 hover:underline font-medium">
                Resend code
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

function friendlyError(err) {
  switch (err.name) {
    case 'NotAuthorizedException':    return 'Incorrect email or password.'
    case 'UserNotFoundException':     return 'No account found with this email.'
    case 'UsernameExistsException':   return 'An account with this email already exists.'
    case 'CodeMismatchException':     return 'Incorrect code — please try again.'
    case 'ExpiredCodeException':      return 'Code expired — request a new one.'
    case 'InvalidPasswordException':  return 'Password must be at least 8 characters.'
    case 'LimitExceededException':    return 'Too many attempts — please wait a moment.'
    default: return err.message || 'Something went wrong. Please try again.'
  }
}
