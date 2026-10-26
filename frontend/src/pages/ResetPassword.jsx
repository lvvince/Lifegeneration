import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { Lock, ArrowRight, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import { apiPost } from '../api.js'
import AuthShell from '../components/auth/AuthShell.jsx'
import AuthInput from '../components/auth/AuthInput.jsx'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [form, setForm] = useState({ password: '', confirm: '' })
  const [error, setError] = useState(token ? '' : 'This reset link is invalid. Request a new one.')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)

  const change = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await apiPost('/api/auth/reset-password', { token, password: form.password })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err.message || 'Could not reset your password. Please request a new link.')
      setLoading(false)
    }
  }

  const BackToLogin = ({ label = 'Back to login' }) => (
    <Link to="/login" className="au-back">
      <ArrowLeft size={16} /> {label}
    </Link>
  )

  return (
    <AuthShell title="New password" sub="Changed your mind?" switchLead="Back to login" switchLabel="Log in" switchTo="/login">
      {error && (
        <div className="au-alert" role="alert" key={error}>
          <AlertCircle size={17} /> <span>{error}</span>
        </div>
      )}

      {done ? (
        <>
          <div className="au-success" role="status">
            <CheckCircle size={17} /> <span>Password updated! Taking you to the login page…</span>
          </div>
          <BackToLogin label="Go to login now" />
        </>
      ) : token ? (
        <form onSubmit={submit} noValidate className="au-form">
          <AuthInput icon={Lock} label="New password" name="password" type="password" value={form.password} onChange={change} autoComplete="new-password" autoFocus />
          <AuthInput icon={Lock} label="Confirm new password" name="confirm" type="password" value={form.confirm} onChange={change} autoComplete="new-password" />
          <button type="submit" className="au-btn" disabled={loading}>
            {loading ? <span className="au-spin" /> : <>Update password <ArrowRight size={18} /></>}
          </button>
          <BackToLogin />
        </form>
      ) : (
        <div className="au-back-row">
          <Link to="/forgot-password" className="au-back">Request a new link</Link>
          <BackToLogin />
        </div>
      )}
    </AuthShell>
  )
}