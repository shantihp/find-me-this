import { useEffect, useRef, useState } from 'react'
import ReCAPTCHA from 'react-google-recaptcha'
import api from '../api/client'

export default function ContactModal({ onClose }) {
  const recaptchaRef = useRef()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [captchaToken, setCaptchaToken] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!captchaToken) { setError('Please complete the CAPTCHA first.'); return }
    setLoading(true); setError('')
    try {
      await api.post('/contact', {
        name:          form.name.trim(),
        email:         form.email.trim(),
        subject:       form.subject.trim(),
        message:       form.message.trim(),
        captcha_token: captchaToken,
      })
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong — please try again.')
      recaptchaRef.current?.reset()
      setCaptchaToken(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 relative max-h-[90dvh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl w-8 h-8 flex items-center justify-center"
        >✕</button>

        {success ? (
          <div className="text-center py-6">
            <p className="text-5xl mb-4">✅</p>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Message sent!</h2>
            <p className="text-sm text-gray-500">Thanks for reaching out. We'll get back to you soon.</p>
            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-semibold transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="text-center mb-5">
              <p className="text-4xl mb-2">✉️</p>
              <h2 className="text-xl font-bold text-gray-900">Contact us</h2>
              <p className="text-sm text-gray-500 mt-1">We'll get back to you as soon as possible.</p>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-sm bg-red-50 text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                  <input
                    type="text" required autoFocus
                    placeholder="Your name"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Your email</label>
                  <input
                    type="email" required
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={e => set('email', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
                <input
                  type="text" required
                  placeholder="What's this about?"
                  value={form.subject}
                  onChange={e => set('subject', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Message</label>
                <textarea
                  required rows={4}
                  placeholder="Write your message here…"
                  value={form.message}
                  onChange={e => set('message', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
                />
              </div>

              {/* reCAPTCHA */}
              <div className="flex justify-center pt-1">
                <ReCAPTCHA
                  ref={recaptchaRef}
                  sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'}
                  onChange={token => { setCaptchaToken(token); setError('') }}
                  onExpired={() => setCaptchaToken(null)}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !captchaToken}
                className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-semibold transition"
              >
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
