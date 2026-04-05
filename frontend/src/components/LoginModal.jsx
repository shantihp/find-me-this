import { useRef, useEffect, useState } from 'react'
import { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword } from 'aws-amplify/auth'
import { fetchAuthSession } from 'aws-amplify/auth'
import { useAuth } from '../hooks/useAuth'

const VIEWS = { SIGN_IN: 'sign_in', SIGN_UP: 'sign_up', CONFIRM: 'confirm', FORGOT: 'forgot', RESET: 'reset' }

export default function LoginModal({ onClose, reason }) {
  const { setUser } = useAuth()
  const ref = useRef()
  const [view, setView] = useState(VIEWS.SIGN_IN)
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [password, setPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
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
      setUser({ id: payload?.sub, email: payload?.email, name: payload?.given_name || null })
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
      await signUp({ username: email, password, options: { userAttributes: { email, given_name: firstName.trim() } } })
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
      await signIn({ username: email, password })
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (token) localStorage.setItem('auth_token', token)
      const payload = session.tokens?.idToken?.payload
      setUser({ id: payload?.sub, email: payload?.email, name: payload?.given_name || null })
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

  async function handleForgot(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await resetPassword({ username: email })
      setCode(''); setNewPassword('')
      setView(VIEWS.RESET)
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  async function handleReset(e) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      await confirmResetPassword({ username: email, confirmationCode: code.trim(), newPassword })
      // Auto sign in with new password
      await signIn({ username: email, password: newPassword })
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (token) localStorage.setItem('auth_token', token)
      const payload = session.tokens?.idToken?.payload
      setUser({ id: payload?.sub, email: payload?.email, name: payload?.given_name || null })
      onClose()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }

  const HEADERS = {
    [VIEWS.SIGN_IN]:  { title: reason === 'limit' ? "You've used all free searches" : 'Sign in to FindThisForMe',
                        sub: reason === 'limit' ? "Sign in for unlimited searches and bookmarks — it's free." : 'Save products, bookmark searches, and get unlimited results.' },
    [VIEWS.SIGN_UP]:  { title: 'Create your account', sub: 'Save products, bookmark searches, and get unlimited results.' },
    [VIEWS.CONFIRM]:  { title: 'Check your email', sub: `We sent a 6-digit code to ${email}` },
    [VIEWS.FORGOT]:   { title: 'Reset your password', sub: "Enter your email and we'll send you a reset code." },
    [VIEWS.RESET]:    { title: 'Set a new password', sub: `Enter the code we sent to ${email} and choose a new password.` },
  }

  const { title, sub } = HEADERS[view]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div ref={ref} className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative max-h-[90dvh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl">✕</button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{sub}</p>
        </div>

        {/* Error / info */}
        {error && (
          <div className={`mb-4 px-3 py-2 rounded-lg text-sm ${error.includes('resent') || error.includes('sent') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
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
            <div className="text-right -mt-1">
              <button type="button" onClick={() => { setView(VIEWS.FORGOT); clearError() }} className="text-xs text-pink-600 hover:underline">
                Forgot password?
              </button>
            </div>
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
              type="text" placeholder="First name" required autoFocus
              value={firstName} onChange={e => { setFirstName(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <input
              type="email" placeholder="Email address" required
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

        {/* Confirm email */}
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

        {/* Forgot password — enter email */}
        {view === VIEWS.FORGOT && (
          <form onSubmit={handleForgot} className="space-y-3">
            <input
              type="email" placeholder="Email address" required autoFocus
              value={email} onChange={e => { setEmail(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition"
            >
              {loading ? 'Sending…' : 'Send reset code'}
            </button>
            <p className="text-center text-xs text-gray-400">
              <button type="button" onClick={() => { setView(VIEWS.SIGN_IN); clearError() }} className="text-pink-600 hover:underline font-medium">
                Back to sign in
              </button>
            </p>
          </form>
        )}

        {/* Reset password — enter code + new password */}
        {view === VIEWS.RESET && (
          <form onSubmit={handleReset} className="space-y-3">
            <input
              type="text" placeholder="6-digit code" required autoFocus
              maxLength={6} inputMode="numeric"
              value={code} onChange={e => { setCode(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-center tracking-widest text-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <input
              type="password" placeholder="New password (min 8 chars)" required minLength={8}
              value={newPassword} onChange={e => { setNewPassword(e.target.value); clearError() }}
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              type="submit" disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-700 disabled:opacity-60 text-white rounded-xl py-2.5 text-sm font-semibold transition"
            >
              {loading ? 'Resetting…' : 'Reset & sign in'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Didn't get it?{' '}
              <button type="button" onClick={() => { setView(VIEWS.FORGOT); clearError() }} className="text-pink-600 hover:underline font-medium">
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
