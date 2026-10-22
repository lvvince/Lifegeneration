import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { useNavigate } from "react-router-dom"
import { apiPost, setUser, saveTokens } from "../api.js"
import { User, Mail, Lock, ShieldCheck, MapPin, CalendarDays, X, UserPlus, AlertCircle, CheckCircle, ArrowRight } from "lucide-react"
import AuthField from "./AuthField.jsx"
import GlassIcon from "./GlassIcon.jsx"
import "../styles/auth.css"

const EMPTY = { full_name: "", email: "", age: "", address: "", password: "", confirm: "" }

export default function RegisterModal({ onClose }) {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const googleBtnRef = useRef(null)

  // Esc to close + lock page scroll while open
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose() }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  const handleGoogleSuccess = async (response) => {
    if (!response.credential) return
    setLoading(true)
    setServerError("")
    try {
      const data = await apiPost("/api/auth/google", { credential: response.credential })
      const user = data.user || data.data || data
      setUser(user)
      if (data.tokens) saveTokens(data.tokens)
      onClose()
      navigate(user.role === "admin" ? "/admin" : "/dashboard", { replace: true })
    } catch (err) {
      setServerError(err.message || "Google sign-up failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "464887399568-1fpv2kl0l9r37gb5mtpg2553k8dg0j9j.apps.googleusercontent.com"

    const renderGoogle = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: handleGoogleSuccess,
          })
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: "filled_blue",
            size: "large",
            shape: "pill",
            text: "signup_with",
            locale: "en",
            width: 280,
          })
        } catch (e) {
          console.error("Google init error:", e)
        }
      }
    }

    if (window.google?.accounts?.id) {
      renderGoogle()
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval)
          renderGoogle()
        }
      }, 250)
      return () => clearInterval(interval)
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(f => ({ ...f, [name]: value }))
    setErrors(er => ({ ...er, [name]: "" }))
    setServerError("")
  }

  const validate = () => {
    const next = {}
    if (!form.full_name.trim()) next.full_name = "Full name is required."
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email."
    if (form.age && (Number(form.age) < 5 || Number(form.age) > 120)) next.age = "Enter a valid age."
    if (form.password.length < 6) next.password = "At least 6 characters."
    if (form.confirm !== form.password) next.confirm = "Passwords do not match."
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const found = validate()
    if (Object.keys(found).length) { setErrors(found); return }
    setLoading(true)
    try {
      const { confirm: _c, ...payload } = form
      payload.full_name = payload.full_name.trim()
      payload.email = payload.email.trim()
      const data = await apiPost("/api/auth/register", payload)
      if (data.tokens && data.user) { setUser(data.user); saveTokens(data.tokens) }
      setSuccess(data)
    } catch (err) {
      setErrors(err.fields || {})
      setServerError(err.message || "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const memberId = success && (success.user?.member_id || success.user?.member?.member_id || success.member_id)

  const goDashboard = () => { onClose(); navigate("/dashboard") }

  return createPortal(
    <div className="auth-overlay auth-scope" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Create account">
        {success ? (
          <div className="auth-success">
            <GlassIcon icon={CheckCircle} tint="#22c55e" size={64} />
            <h2>You're in!</h2>
            <p>Your account has been created.</p>
            {memberId && (
              <div className="auth-memberid">
                <small>Member ID</small>
                <strong>{memberId}</strong>
              </div>
            )}
            <button type="button" className="auth-submit block" onClick={goDashboard} style={{ marginTop: 0 }}>
              Go to dashboard <ArrowRight size={17} />
            </button>
          </div>
        ) : (
          <>
            <div className="auth-modal-head">
              <div>
                <h2>Create account</h2>
                <p>Join Life Generation</p>
              </div>
              <button type="button" className="auth-close" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {serverError && (
              <div className="auth-error">
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <AuthField icon={User} tint="#f97316" name="full_name" placeholder="Full name"
                value={form.full_name} onChange={handleChange} error={errors.full_name}
                autoComplete="name" autoFocus />
              <AuthField icon={Mail} tint="#3b82f6" name="email" type="email" placeholder="Email"
                value={form.email} onChange={handleChange} error={errors.email} autoComplete="email" />

              <div className="auth-grid">
                <AuthField icon={CalendarDays} tint="#a855f7" name="age" type="number" inputMode="numeric"
                  placeholder="Age (optional)" value={form.age} onChange={handleChange} error={errors.age} />
                <AuthField icon={MapPin} tint="#22c55e" name="address" placeholder="Location (optional)"
                  value={form.address} onChange={handleChange} error={errors.address} autoComplete="address-level2" />
              </div>

              <AuthField icon={Lock} tint="#f97316" name="password" type="password" placeholder="Password (min. 6)"
                value={form.password} onChange={handleChange} error={errors.password} autoComplete="new-password" />
              <AuthField icon={ShieldCheck} tint="#3b82f6" name="confirm" type="password" placeholder="Confirm password"
                value={form.confirm} onChange={handleChange} error={errors.confirm} autoComplete="new-password" />

              <button type="submit" className="auth-submit block" disabled={loading}>
                {loading ? <><span className="auth-spin" /> Creating...</> : <><UserPlus size={17} /> Create account</>}
              </button>
            </form>

            {/* Google Sign-in Divider */}
            <div className="auth-divider">
              <span>or sign up with</span>
            </div>

            {/* Google Sign-in Button */}
            <div className="auth-google-wrapper">
              <div ref={googleBtnRef} id="googleRegisterBtnContainer" />
            </div>

            <p className="auth-switch">
              Already have an account?{" "}
              <button type="button" className="auth-link" onClick={onClose}>Log in</button>
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  )
}
