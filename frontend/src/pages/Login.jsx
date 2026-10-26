import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react'
import { apiPost, setUser, saveTokens } from '../api.js'
import { useGoogleButton } from '../lib/useGoogleButton.js'
import AuthShell from '../components/auth/AuthShell.jsx'
import AuthInput from '../components/auth/AuthInput.jsx'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identity: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [caps, setCaps] = useState(false)
  const gRef = useRef(null)

  const finish = (data) => {
    const user = data.user || data.data || data
    setUser(user)
    if (data.tokens) saveTokens(data.tokens)
    navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
  }

  useGoogleButton(gRef, {
    text: 'continue_with',
    onCredential: async (credential) => {
      setLoading(true)
      setError('')
      try {
        finish(await apiPost('/api/auth/google', { credential }))
      } catch (err) {
        setError(err.message || 'Google sign-in failed. Please try again.')
        setLoading(false)
      }
    },
  })

  const change = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.identity.trim() || !form.password) {
      setError('Enter your username or email and password.')
      return
    }
    setLoading(true)
    try {
      finish(await apiPost('/api/auth/login', { identity: form.identity.trim(), password: form.password }))
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Welcome back" sub="New here?" switchLead="Create an account" switchLabel="Join" switchTo="/register">
      {error && (
        <div className="au-alert" role="alert" key={error}>
          <AlertCircle size={17} /> <span>{error}</span>
        </div>
      )}
      <form onSubmit={submit} noValidate className="au-form">
        <AuthInput icon={User} label="Username or email" name="identity" value={form.identity} onChange={change} autoComplete="username" autoFocus />
        <AuthInput
          icon={Lock}
          label="Password"
          name="password"
          type="password"
          value={form.password}
          onChange={change}
          autoComplete="current-password"
          onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') || false)}
          hint={caps ? 'Caps Lock is on' : undefined}
        />
        <div className="au-forgot-row">
          <Link to="/forgot-password" className="au-forgot">Forgot password?</Link>
        </div>
        <button type="submit" className="au-btn" disabled={loading}>
          {loading ? <span className="au-spin" /> : <>Log in <ArrowRight size={18} /></>}
        </button>
      </form>

      <div className="au-or"><span>or</span></div>
      <div className="au-google"><div ref={gRef} /></div>
    </AuthShell>
  )
}