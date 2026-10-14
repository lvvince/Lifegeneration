import { useState } from 'react'
import { useAuth } from './AuthContext'

export default function Register({ onGoLogin }) {
  const { register } = useAuth()
  const [form, setForm]       = useState({ username: '', email: '', password: '' })
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  function change(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      await register(form.username, form.email, form.password)
      setSuccess('Account created! You can now log in.')
      setTimeout(onGoLogin, 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-card">
      <h2>Join Us ✝️</h2>
      <p className="auth-sub">Life Generation Youth</p>

      {error   && <div className="auth-error">{error}</div>}
      {success && <div className="auth-success">{success}</div>}

      <form onSubmit={handleSubmit}>
        <input
          name="username"
          placeholder="Username"
          value={form.username}
          onChange={change}
          required
          minLength={3}
        />
        <input
          name="email"
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={change}
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Password (min 6 chars)"
          value={form.password}
          onChange={change}
          required
          minLength={6}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Register'}
        </button>
      </form>

      <p className="auth-switch">
        Already have an account?{' '}
        <button className="link-btn" onClick={onGoLogin}>Login here</button>
      </p>
    </div>
  )
}
