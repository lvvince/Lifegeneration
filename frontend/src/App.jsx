import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './Login'
import Register from './Register'
import './App.css'

function Dashboard() {
  const { user, logout } = useAuth()

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">✝ Life Generation Youth</div>
        <div className="app-user">
          <span>👤 {user.username}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        <div className="welcome-card">
          <div className="welcome-icon">✨</div>
          <h2>Welcome, {user.username}!</h2>
          <p className="welcome-subtitle">You are successfully logged in to Life Generation Youth.</p>

          <div className="profile-details">
            <div className="detail-item">
              <span className="detail-label">Username</span>
              <span className="detail-value">{user.username}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Role</span>
              <span className="detail-badge">{user.role || 'Member'}</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function AuthGate() {
  const { user } = useAuth()
  const [page, setPage] = useState('login')

  if (user) return <Dashboard />

  return (
    <div className="auth-wrap">
      {page === 'login'
        ? <Login    onGoRegister={() => setPage('register')} />
        : <Register onGoLogin={()    => setPage('login')}    />
      }
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  )
}
