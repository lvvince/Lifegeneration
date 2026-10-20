import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost, setUser, saveTokens } from '../api.js'
import { LogIn, AlertCircle, Eye, EyeOff, Zap } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ identity: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.identity.trim() || !form.password) {
      setError('Username / email and password are required.')
      return
    }
    setLoading(true)
    try {
      const data = await apiPost('/api/auth/login', {
        identity: form.identity.trim(),
        password: form.password,
      })
      const user = data.user || data.data || data
      setUser(user)
      if (data.tokens) saveTokens(data.tokens)
      navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .auth-page-wrap {
          min-height: calc(100vh - 62px);
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .auth-panel-left {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 48px;
          min-height: 500px;
        }
        .auth-panel-left-img {
          position: absolute;
          inset: 0;
          background-image: url('/hero-bg.jpg');
          background-size: cover;
          background-position: center;
          z-index: 0;
        }
        .auth-panel-left-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(249,115,22,0.55) 0%, rgba(59,130,246,0.45) 100%);
          z-index: 1;
        }
        .auth-panel-left-content {
          position: relative;
          z-index: 2;
        }
        .auth-panel-right {
          background: #0a0a0f;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px 28px;
          overflow-y: auto;
        }
        .auth-form-box {
          width: 100%;
          max-width: 400px;
        }
        .auth-input-wrap {
          margin-bottom: 16px;
        }
        .auth-input-wrap label {
          display: block;
          font-size: 0.82rem;
          font-weight: 600;
          color: #cbd5e1;
          margin-bottom: 6px;
          margin-top: 0;
        }
        .auth-input-wrap input {
          width: 100%;
          background: #1c1c27;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 0.95rem;
          color: #f1f5f9;
          font-family: 'Inter', sans-serif;
          transition: border-color 0.2s, box-shadow 0.2s;
          position: relative;
          z-index: 5;
        }
        .auth-input-wrap input::placeholder { color: #475569; }
        .auth-input-wrap input:focus {
          outline: none;
          border-color: #f97316;
          box-shadow: 0 0 0 3px rgba(249,115,22,0.18);
        }
        .pw-wrap {
          position: relative;
        }
        .pw-wrap input {
          padding-right: 44px;
        }
        .pw-toggle {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          width: auto;
          margin: 0;
          color: #475569;
          display: flex;
          align-items: center;
          z-index: 10;
        }
        .auth-err {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          background: rgba(248,113,113,0.08);
          border: 1px solid rgba(248,113,113,0.22);
          border-radius: 10px;
          color: #f87171;
          padding: 11px 14px;
          font-size: 0.87rem;
          margin-bottom: 16px;
        }
        .auth-btn-submit {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          font-size: 0.95rem;
          font-weight: 700;
          font-family: 'Inter', sans-serif;
          background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%);
          color: #fff;
          margin-top: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          box-shadow: 0 4px 20px rgba(249,115,22,0.28);
        }
        .auth-btn-submit:hover:not(:disabled) {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .auth-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .spin-icon {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @media (max-width: 768px) {
          .auth-page-wrap { grid-template-columns: 1fr; }
          .auth-panel-left { display: none; }
          .auth-panel-right {
            min-height: calc(100vh - 62px);
            background: linear-gradient(160deg, #0a0a0f 0%, #180d05 50%, #05111a 100%);
          }
        }
      `}</style>

      <div className="auth-page-wrap">
        {/* LEFT */}
        <div className="auth-panel-left">
          <div className="auth-panel-left-img" />
          <div className="auth-panel-left-overlay" />
          <div className="auth-panel-left-content">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.25)',
              padding: '6px 16px', borderRadius: 999,
              fontSize: '0.78rem', fontWeight: 600, color: '#fff',
              letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 16, backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}>
              <Zap size={12} /> Life Generation
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.5rem', color: '#fff', lineHeight: 1.1, marginBottom: 12 }}>
              Welcome<br />Back.
            </div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.98rem', lineHeight: 1.65, margin: 0 }}>
              Continue your journey with the Life Generation community. Your next step starts here.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="auth-panel-right">
          <div className="auth-form-box">
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 30 }}>
              <img
                src="/logo.png"
                alt="Life Generation"
                style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Life Generation</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Youth &amp; Church Community
                </div>
              </div>
            </div>

            <h1 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#fff', marginBottom: 6 }}>Sign In</h1>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: 24 }}>
              Enter your credentials to access your account.
            </p>

            {error && (
              <div className="auth-err">
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="auth-input-wrap">
                <label htmlFor="identity">Username or Email</label>
                <input
                  id="identity"
                  name="identity"
                  value={form.identity}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  autoComplete="username"
                  autoFocus
                />
              </div>

              <div className="auth-input-wrap">
                <label htmlFor="password">Password</label>
                <div className="pw-wrap">
                  <input
                    id="password"
                    name="password"
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" className="auth-btn-submit" disabled={loading}>
                {loading
                  ? <><span className="spin-icon" /> Signing in...</>
                  : <><LogIn size={16} /> Sign In</>
                }
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 22, fontSize: '0.87rem', color: '#64748b' }}>
              No account yet?{' '}
              <Link to="/register" style={{ color: '#f97316', fontWeight: 600 }}>
                Create one here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}