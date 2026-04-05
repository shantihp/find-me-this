import './amplify'
import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './components/Navbar'
import BottomNav from './components/BottomNav'
import Footer from './components/Footer'
import Home from './pages/Home'
import Profile from './pages/Profile'
import SampleView from './pages/SampleView'
import FolderView from './pages/FolderView'
import LoginModal from './components/LoginModal'
import ContactModal from './components/ContactModal'
import { AuthContext, useAuthInit } from './hooks/useAuth'

export default function App() {
  const { user, setUser, loading, logout } = useAuthInit()
  const [showLogin, setShowLogin] = useState(false)
  const [loginReason, setLoginReason] = useState(null)
  const [showContact, setShowContact] = useState(false)
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
        {/* pb-16 sm:pb-0 reserves space for the mobile bottom nav */}
        <main className="flex-1 pb-16 sm:pb-0">
          <Routes>
            <Route path="/" element={<Home key={homeKey} />} />
            <Route path="/profile" element={<Profile />} />
            {/* /s/folder/:id must come before /s/:id so "folder" isn't treated as a sampleId */}
            <Route path="/s/folder/:folderId" element={<FolderView />} />
            <Route path="/s/:sampleId" element={<SampleView />} />
          </Routes>
        </main>
        <Footer onContactClick={() => setShowContact(true)} />
        <BottomNav onContactClick={() => setShowContact(true)} />
        {showLogin && (
          <LoginModal
            reason={loginReason}
            onClose={() => { setShowLogin(false); setLoginReason(null) }}
          />
        )}
        {showContact && (
          <ContactModal onClose={() => setShowContact(false)} />
        )}
      </div>
    </AuthContext.Provider>
  )
}
