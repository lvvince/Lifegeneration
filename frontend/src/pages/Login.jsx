import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { apiPost, setUser, saveTokens } from "../api.js"
import { User, Lock, LogIn, AlertCircle } from "lucide-react"
import AuthField from "../components/AuthField.jsx"
import { useAuthModal } from "../context/AuthModal.jsx"
import "../styles/auth.css"

export default function Login() {
  const navigate = useNavigate()
  const { openRegister } = useAuthModal()
  const [form, setForm] = useState({ identity: "", password: "" })
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError("")
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.identity.trim() || !form.password) {
      setError("Enter your username or email and password.")
      return
    }
    setLoading(true)
    try {
      const data = await apiPost("/api/auth/login", {
        identity: form.identity.trim(),
        password: form.password,
      })
      const user = data.user || data.data || data
      setUser(user)
      if (data.tokens) saveTokens(data.tokens)
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true })
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-stage auth-scope">
      <div className="auth-card">
        {/* Photo + wavy edge */}
        <div className="auth-photo" aria-hidden="true">
          <div className="auth-photo-brand">
            <img src="/logo.png" alt="" />
            <span>Life Generation</span>
          </div>
          <svg className="auth-wave" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M62,0 C4,20 4,46 46,62 C88,78 92,92 76,100 L100,100 L100,0 Z" />
          </svg>
        </div>

        {/* Form */}
        <div className="auth-panel">
          <div className="auth-mobile-brand">
            <img src="/logo.png" alt="" />
            <span>Life Generation</span>
          </div>

          <h1 className="auth-title">Welcome</h1>
          <p className="auth-sub">Log in to your account to continue</p>

          {error && (
            <div className="auth-error" role="alert">
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <AuthField icon={User} tint="#f97316" name="identity" placeholder="Username or email"
              value={form.identity} onChange={handleChange} autoComplete="username" autoFocus />
            <AuthField icon={Lock} tint="#3b82f6" name="password" type="password" placeholder="Password"
              value={form.password} onChange={handleChange} autoComplete="current-password" />

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? <><span className="auth-spin" /> Logging in…</> : <><LogIn size={17} /> Log in</>}
            </button>
          </form>

          <p className="auth-switch">
            Don’t have an account?{" "}
            <button type="button" className="auth-link" onClick={openRegister}>Sign up!</button>
          </p>
        </div>
      </div>
    </div>
  )
}
