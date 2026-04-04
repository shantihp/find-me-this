import './amplify'
import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Profile from './pages/Profile'
import LoginModal from './components/LoginModal'
import { AuthContext, useAuthInit } from './hooks/useAuth'

export default function App() {
  const { user, setUser, loading, logout } = useAuthInit()
  const [showLogin, setShowLogin] = useState(false)
  const [loginReason, setLoginReason] = useState(null)
  const [homeKey, setHomeKey] = useState(0)

  function openLogin(reason) {
    setLoginReason(reason ?? null)
    setShowLogin(true)
  }

  if (loading) return null

  return (
    <AuthContext.Provider value={{ user, setUser, openLogin, logout }}>
      <div className="min-h-screen flex flex-col">
        <Navbar onLoginClick={() => openLogin()} onLogoClick={() => setHomeKey(k => k + 1)} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home key={homeKey} />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        {showLogin && (
          <LoginModal
            reason={loginReason}
            onClose={() => { setShowLogin(false); setLoginReason(null) }}
          />
        )}
      </div>
    </AuthContext.Provider>
  )
}
