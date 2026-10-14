import { createContext, useContext, useState } from 'react'
import { login as apiLogin, logout as apiLogout, register as apiRegister } from './api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(() => JSON.parse(localStorage.getItem('lgy_user') || 'null'))
  const [token, setToken] = useState(() => localStorage.getItem('lgy_token') || null)

  async function register(username, email, password) {
    const { ok, data } = await apiRegister(username, email, password)
    if (!ok) throw new Error(data.message || 'Registration failed')
    return data
  }

  async function login(email, password) {
    const { ok, data } = await apiLogin(email, password)
    if (!ok) throw new Error(data.message || 'Login failed')

    setUser(data.user)
    setToken(data.access_token)
    localStorage.setItem('lgy_user',  JSON.stringify(data.user))
    localStorage.setItem('lgy_token', data.access_token)
    localStorage.setItem('lgy_refresh', data.refresh_token)
    return data
  }

  async function logout() {
    const refresh = localStorage.getItem('lgy_refresh')
    if (refresh) await apiLogout(refresh)
    setUser(null)
    setToken(null)
    localStorage.removeItem('lgy_user')
    localStorage.removeItem('lgy_token')
    localStorage.removeItem('lgy_refresh')
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
