import { createContext, useContext } from 'react'

export const AuthContext = createContext({
  user: null,
  setUser: () => {},
  openLogin: () => {},
})

export function useAuth() {
  return useContext(AuthContext)
}
