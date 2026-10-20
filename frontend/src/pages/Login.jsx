import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost } from '../api.js'

const LOGIN_PATH = '/api/login'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identity: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.identity.trim() || !form.password) {
      setError('Username/email and password are required.')
      return
    }

    setLoading(true)
    try {
      const data = await apiPost(LOGIN_PATH, {
        identity: form.identity.trim(),
        password: form.password,
      })

      const user = data.user || data.data || data
      localStorage.setItem('lgy_user', JSON.stringify(user))

      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h2>Login</h2>
        {error && <div className="alert">{error}</div>}

        <label htmlFor="identity">Username or email</label>
        <input
          id="identity"
          name="identity"
          value={form.identity}
          onChange={handleChange}
          autoComplete="username"
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
        />

        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
        <p className="muted">
          No account yet? <Link to="/register">Register</Link>
        </p>
      </form>
    </div>
  )
}