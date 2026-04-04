import { createContext, useContext, useState, useEffect } from 'react'
import { getCurrentUser, fetchAuthSession, signOut as amplifySignOut } from 'aws-amplify/auth'

export const AuthContext = createContext({
  user: null,
  setUser: () => {},
  openLogin: () => {},
  logout: async () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}

export function useAuthInit() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    restoreSession()
  }, [])

  async function restoreSession() {
    try {
      const cognitoUser = await getCurrentUser()
      const session = await fetchAuthSession()
      const token = session.tokens?.idToken?.toString()
      if (token) localStorage.setItem('auth_token', token)
      const payload = session.tokens?.idToken?.payload
      setUser({ id: cognitoUser.userId, email: cognitoUser.signInDetails?.loginId, name: payload?.given_name || null })
    } catch {
      localStorage.removeItem('auth_token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await amplifySignOut()
    localStorage.removeItem('auth_token')
    setUser(null)
  }

  return { user, setUser, loading, logout }
}
