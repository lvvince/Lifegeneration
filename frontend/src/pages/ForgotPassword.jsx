import { useState } from 'react'
import { Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import { apiPost } from '../api.js'
import AuthShell from '../components/auth/AuthShell.jsx'
import AuthInput from '../components/auth/AuthInput.jsx'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    const value = email.trim()
    if (!/^\S+@\S+\.\S+$/.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await apiPost('/api/auth/forgot-password', { email: value })
      setSent(res.message || 'If an account exists for that email, a reset link has been sent.')
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell title="Forgot password?" sub="Remembered it?" switchLead="Back to login" switchLabel="Log in" switchTo="/login">
      {error && (
        <div className="au-alert" role="alert" key={error}>
          <AlertCircle size={17} /> <span>{error}</span>
        </div>
      )}

      {sent ? (
        <div className="au-success" role="status">
          <CheckCircle size={17} /> <span>{sent} Check your inbox (and spam folder). The link expires in 1 hour.</span>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="au-form">
          <p className="au-help">Enter the email you signed up with and we'll send you a link to set a new password.</p>
          <AuthInput icon={Mail} label="Email" name="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} autoComplete="email" autoFocus />
          <button type="submit" className="au-btn" disabled={loading}>
            {loading ? <span className="au-spin" /> : <>Send reset link <ArrowRight size={18} /></>}
          </button>
        </form>
      )}
    </AuthShell>
  )
}