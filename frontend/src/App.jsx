import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext'
import Login from './Login'
import Register from './Register'
import Chatbot from './Chatbot'
import './App.css'

function Dashboard() {
  const { user, logout } = useAuth()
  const [tab, setTab] = useState('chatbot')

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-logo">✝ Life Generation Youth</div>
        <nav>
          <button className={tab === 'chatbot' ? 'active' : ''} onClick={() => setTab('chatbot')}>Chatbot</button>
        </nav>
        <div className="app-user">
          <span>👤 {user.username}</span>
          <button className="logout-btn" onClick={logout}>Logout</button>
        </div>
      </header>

      <main className="app-main">
        {tab === 'chatbot' && <Chatbot />}
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
