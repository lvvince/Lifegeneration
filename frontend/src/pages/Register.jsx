import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiPost, setUser, saveTokens } from '../api.js'
import { UserPlus, AlertCircle, CheckCircle, Eye, EyeOff, Zap, ArrowRight } from 'lucide-react'

const EMPTY = { full_name: '', username: '', email: '', age: '', address: '', password: '', confirm: '' }

const pageStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .reg-page-wrap {
    min-height: calc(100vh - 62px);
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
  .reg-panel-left {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    padding: 48px;
    min-height: 500px;
  }
  .reg-panel-left-img {
    position: absolute;
    inset: 0;
    background-image: url('/hero-bg.jpg');
    background-size: cover;
    background-position: center;
    z-index: 0;
  }
  .reg-panel-left-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, rgba(249,115,22,0.55) 0%, rgba(59,130,246,0.45) 100%);
    z-index: 1;
  }
  .reg-panel-left-content {
    position: relative;
    z-index: 2;
  }
  .reg-panel-right {
    background: var(--bg);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 28px;
    overflow-y: auto;
  }
  .reg-form-box {
    width: 100%;
    max-width: 460px;
    padding: 8px 0;
  }
  .reg-field {
    margin-bottom: 14px;
  }
  .reg-field label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text-muted);
    margin-bottom: 5px;
    margin-top: 0;
  }
  .reg-field input {
    width: 100%;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 10px;
    padding: 11px 13px;
    font-size: 0.92rem;
    color: var(--input-color);
    font-family: 'Inter', sans-serif;
    transition: border-color 0.2s, box-shadow 0.2s;
    position: relative;
    z-index: 5;
    box-sizing: border-box;
  }
  .reg-field input::placeholder { color: var(--text-dim); }
  .reg-field input:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 3px rgba(249,115,22,0.18);
  }
  .reg-field .field-err {
    display: block;
    margin-top: 4px;
    font-size: 0.76rem;
    color: #f87171;
  }
  .reg-pw-wrap { position: relative; }
  .reg-pw-wrap input { padding-right: 42px; }
  .reg-pw-toggle {
    position: absolute;
    right: 11px;
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
  .reg-two-col {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0 12px;
  }
  .reg-err-box {
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
  .reg-submit-btn {
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
    margin-top: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.2s, transform 0.15s;
    box-shadow: 0 4px 20px rgba(249,115,22,0.28);
  }
  .reg-submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .reg-submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .reg-spin {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    display: inline-block;
  }
  @media (max-width: 768px) {
    .reg-page-wrap { grid-template-columns: 1fr; }
    .reg-panel-left { display: none; }
    .reg-panel-right {
      min-height: calc(100vh - 62px);
      background: linear-gradient(160deg, #0a0a0f 0%, #180d05 50%, #05111a 100%);
    }
    .reg-two-col { grid-template-columns: 1fr; }
  }
`

function FormField({ id, name, label, type = 'text', placeholder = '', value, onChange, error, showToggle = false, isShowingPw = false, onTogglePw }) {
  return (
    <div className="reg-field">
      <label htmlFor={id}>{label}</label>
      {type === 'password' ? (
        <div className="reg-pw-wrap">
          <input
            id={id}
            name={name}
            type={isShowingPw ? 'text' : 'password'}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            autoComplete="new-password"
          />
          {showToggle && (
            <button
              type="button"
              className="reg-pw-toggle"
              onClick={onTogglePw}
              tabIndex={-1}
            >
              {isShowingPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={name}
        />
      )}
      {error && <span className="field-err">{error}</span>}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
    setServerError('')
  }

  const validate = () => {
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Full name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email.'
    if (form.age && (Number(form.age) < 5 || Number(form.age) > 120)) next.age = 'Enter a valid age.'
    if (form.password.length < 6) next.password = 'Min. 6 characters.'
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.'
    return next
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    const found = validate()
    if (Object.keys(found).length) { setErrors(found); return }
    setLoading(true)
    try {
      const { confirm: _c, ...payload } = form
      const data = await apiPost('/api/auth/register', payload)
      if (data.tokens && data.user) { setUser(data.user); saveTokens(data.tokens) }
      setSuccess(data)
      setForm(EMPTY)
    } catch (err) {
      setErrors(err.fields || {})
      setServerError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  /* SUCCESS */
  if (success) {
    const memberId = success.user?.member_id || success.user?.member?.member_id || success.member_id
    return (
      <>
        <style>{pageStyles}</style>
        <div className="reg-page-wrap">
          <div className="reg-panel-left">
            <div className="reg-panel-left-img" />
            <div className="reg-panel-left-overlay" />
            <div className="reg-panel-left-content">
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.2rem', color: '#fff', lineHeight: 1.1, marginBottom: 12 }}>
                Welcome<br />to the<br />Family.
              </div>
              <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.98rem', lineHeight: 1.65, margin: 0 }}>
                You are now part of the Life Generation community. Your journey starts today.
              </p>
            </div>
          </div>
          <div className="reg-panel-right">
            <div className="reg-form-box" style={{ textAlign: 'center' }}>
              <div style={{
                width: 60, height: 60, borderRadius: '50%',
                background: 'rgba(74,222,128,0.1)', border: '1.5px solid rgba(74,222,128,0.3)',
                display: 'grid', placeItems: 'center', margin: '0 auto 18px'
              }}>
                <CheckCircle size={28} color="#4ade80" />
              </div>
              <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', marginBottom: 8 }}>
                Registration Successful!
              </h1>
              <p style={{ color: '#94a3b8', marginBottom: 20 }}>
                {success.message || 'Welcome to Life Generation Community!'}
              </p>
              {memberId && (
                <div style={{
                  background: 'rgba(74,222,128,0.07)',
                  border: '1px solid rgba(74,222,128,0.2)',
                  borderRadius: 14, padding: '18px 20px', marginBottom: 20
                }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4ade80', marginBottom: 6 }}>
                    Your Official Member ID
                  </div>
                  <div style={{
                    fontFamily: "'Bebas Neue', monospace", fontSize: '2.2rem', letterSpacing: '0.08em',
                    background: 'linear-gradient(135deg, #f97316, #3b82f6)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
                  }}>
                    {memberId}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0, marginTop: 4 }}>
                    Keep this ID for event check-ins and D-Group verification.
                  </p>
                </div>
              )}
              <Link to="/dashboard" style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'linear-gradient(135deg, #f97316, #3b82f6)',
                color: '#fff', padding: '12px 26px', borderRadius: 12,
                fontWeight: 700, fontSize: '0.95rem', textDecoration: 'none'
              }}>
                Go to My Dashboard <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  /* FORM */
  return (
    <>
      <style>{pageStyles}</style>
      <div className="reg-page-wrap">
        {/* LEFT */}
        <div className="reg-panel-left">
          <div className="reg-panel-left-img" />
          <div className="reg-panel-left-overlay" />
          <div className="reg-panel-left-content">
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              padding: '6px 16px', borderRadius: 999, fontSize: '0.78rem', fontWeight: 600,
              color: '#fff', letterSpacing: '0.08em', textTransform: 'uppercase',
              marginBottom: 16, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}>
              <img src="/logo.png" alt="Life Generation" style={{ width: 22, height: 22, objectFit: 'contain' }} /> Life Generation
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '3.2rem', color: '#fff', lineHeight: 1.1, marginBottom: 12 }}>
              Join the<br />Movement.
            </div>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.95rem', lineHeight: 1.65, margin: 0 }}>
              Become an official member and get your unique Member ID for events, D-Groups, and more.
            </p>
          </div>
        </div>

        {/* RIGHT */}
        <div className="reg-panel-right">
          <div className="reg-form-box">
            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 26 }}>
              <img
                src="/logo.png"
                alt="Life Generation"
                style={{ width: 44, height: 44, objectFit: 'contain', flexShrink: 0 }}
              />
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>Life Generation</div>
                <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Create Your Account
                </div>
              </div>
            </div>

            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
              Join Life Generation
            </h1>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 22 }}>
              Fill in your details to become an official member.
            </p>

            {serverError && (
              <div className="reg-err-box">
                <AlertCircle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="reg-two-col">
                <FormField
                  id="reg-full_name"
                  name="full_name"
                  label="Full Name *"
                  placeholder="John Doe"
                  value={form.full_name}
                  onChange={handleChange}
                  error={errors.full_name}
                />
                <FormField
                  id="reg-username"
                  name="username"
                  label="Username"
                  placeholder="Auto-generated"
                  value={form.username}
                  onChange={handleChange}
                  error={errors.username}
                />
              </div>

              <FormField
                id="reg-email"
                name="email"
                label="Email Address *"
                type="email"
                placeholder="john@email.com"
                value={form.email}
                onChange={handleChange}
                error={errors.email}
              />

              <div className="reg-two-col">
                <FormField
                  id="reg-age"
                  name="age"
                  label="Age"
                  type="number"
                  placeholder="e.g. 21"
                  value={form.age}
                  onChange={handleChange}
                  error={errors.age}
                />
                <FormField
                  id="reg-address"
                  name="address"
                  label="Location"
                  placeholder="City, Province"
                  value={form.address}
                  onChange={handleChange}
                  error={errors.address}
                />
              </div>

              <FormField
                id="reg-password"
                name="password"
                label="Password (min 6 chars) *"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                error={errors.password}
                showToggle
                isShowingPw={showPw}
                onTogglePw={() => setShowPw(v => !v)}
              />

              <FormField
                id="reg-confirm"
                name="confirm"
                label="Confirm Password *"
                type="password"
                placeholder="••••••••"
                value={form.confirm}
                onChange={handleChange}
                error={errors.confirm}
                showToggle
                isShowingPw={showConfirm}
                onTogglePw={() => setShowConfirm(v => !v)}
              />

              <button type="submit" className="reg-submit-btn" disabled={loading}>
                {loading
                  ? <><span className="reg-spin" /> Creating Account...</>
                  : <><UserPlus size={16} /> Complete Registration</>
                }
              </button>
            </form>

            <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.87rem', color: '#64748b' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ color: '#f97316', fontWeight: 600 }}>Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}