import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function Login({ onGoRegister }) {
  const { login } = useAuth()
  const [email, setEmail]     = useState('')
  const [password, setPass]   = useState('')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <h2>Welcome Back 🙏</h2>
      <p className="auth-sub">Life Generation Youth</p>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPass(e.target.value)}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>

      <p className="auth-switch">
        No account?{' '}
        <button className="link-btn" onClick={onGoRegister}>Register here</button>
      </p>
    </div>
  )
}
