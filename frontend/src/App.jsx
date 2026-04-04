import { Routes, Route } from 'react-router-dom'
import { useState } from 'react'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Profile from './pages/Profile'
import LoginModal from './components/LoginModal'
import { AuthContext } from './hooks/useAuth'

export default function App() {
  const [user, setUser] = useState(null)
  const [showLogin, setShowLogin] = useState(false)

  return (
    <AuthContext.Provider value={{ user, setUser, openLogin: () => setShowLogin(true) }}>
      <div className="min-h-screen flex flex-col">
        <Navbar onLoginClick={() => setShowLogin(true)} />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>
        {showLogin && <LoginModal onClose={() => setShowLogin(false)} />}
      </div>
    </AuthContext.Provider>
  )
}
