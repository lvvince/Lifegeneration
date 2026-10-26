import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { User, Mail, Lock, ShieldCheck, MapPin, CalendarDays, ArrowRight, ArrowLeft, AlertCircle, Hash, Users } from 'lucide-react'
import { apiPost, setUser, saveTokens, getUser } from '../api.js'
import { useGoogleButton } from '../lib/useGoogleButton.js'
import AuthShell from '../components/auth/AuthShell.jsx'
import AuthInput from '../components/auth/AuthInput.jsx'

const EMPTY = { full_name: '', email: '', age: '', gender: '', address: '', password: '', confirm: '' }
const STEP1 = ['full_name', 'email', 'age', 'gender', 'address']
const MIN_PASSWORD = 6 // dapat pareho sa ResetPassword.jsx at PasswordReset.php

function strength(pw) {
  let n = 0
  if (pw.length >= 6) n++
  if (pw.length >= 9) n++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) n++
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) n++
  return pw ? Math.max(1, n) : 0
}
const LEVELS = ['', 'Weak', 'Okay', 'Good', 'Strong']

/* Dalawang hakbang para kasya sa isang screen (walang scroll): 1) tungkol sa iyo  2) password */
export default function Register() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [caps, setCaps] = useState(false)
  const gRef = useRef(null)
  const level = useMemo(() => strength(form.password), [form.password])

  const enter = (data) => {
    const user = data.user || data.data || data
    setUser(user)
    if (data.tokens) saveTokens(data.tokens)
    navigate(user.role === 'admin' ? '/admin' : '/dashboard', { replace: true })
  }

  useGoogleButton(gRef, {
    text: 'signup_with',
    onCredential: async (credential) => {
      setLoading(true)
      setServerError('')
      try {
        enter(await apiPost('/api/auth/google', { credential }))
      } catch (err) {
        setServerError(err.message || 'Google sign-up failed. Please try again.')
        setLoading(false)
      }
    },
  })

  const change = (e) => {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
    setErrors((er) => ({ ...er, [name]: '' }))
    setServerError('')
  }

  const validate = (only) => {
    const found = {}
    if (!form.full_name.trim()) found.full_name = 'Full name is required.'
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) found.email = 'Enter a valid email.'
    if (form.age && (Number(form.age) < 5 || Number(form.age) > 120)) found.age = 'Enter a valid age.'
    if (form.password.length < MIN_PASSWORD) found.password = `At least ${MIN_PASSWORD} characters.`
    if (form.confirm !== form.password) found.confirm = 'Passwords do not match.'
    return only ? Object.fromEntries(Object.entries(found).filter(([k]) => only.includes(k))) : found
  }

  const goNext = (e) => {
    e.preventDefault()
    const found = validate(STEP1)
    if (Object.keys(found).length) return setErrors(found)
    setStep(2)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (loading) return
    const found = validate()
    if (Object.keys(found).length) {
      setErrors(found)
      if (STEP1.some((k) => found[k])) setStep(1)
      return
    }
    setLoading(true)
    setServerError('')
    try {
      const { confirm: _c, age, ...rest } = form
      const payload = {
        ...rest,
        full_name: rest.full_name.trim(),
        email: rest.email.trim().toLowerCase(),
        address: rest.address.trim(),
        ...(age !== '' ? { age: Number(age) } : {}),
      }
      const data = await apiPost('/api/auth/register', payload)
      if (data.tokens && data.user) {
        setUser(data.user)
        saveTokens(data.tokens)
      }
      setSuccess(data)
    } catch (err) {
      const fields = err.fields || {}
      setErrors(fields)
      setServerError(err.message || 'Something went wrong. Please try again.')
      if (STEP1.some((k) => fields[k])) setStep(1)
    } finally {
      setLoading(false)
    }
  }

  const memberId = success && (success.user?.member_id || success.user?.member?.member_id || success.member_id)

  if (success) {
    const loggedIn = Boolean(getUser())
    return (
      <AuthShell title="You’re in" sub="Your account is ready." switchLabel="Log in" switchTo="/login">
        <div className="au-done">
          <svg viewBox="0 0 64 64" className="au-check" aria-hidden="true">
            <circle cx="32" cy="32" r="28" />
            <path d="M19 33 l9 9 l18 -20" />
          </svg>
          {memberId && (
            <div className="au-mid">
              <small>
                <Hash size={13} /> Member ID
              </small>
              <b>{memberId}</b>
            </div>
          )}
          <button type="button" className="au-btn" onClick={() => navigate(loggedIn ? '/dashboard' : '/login')}>
            {loggedIn ? 'Go to dashboard' : 'Log in'} <ArrowRight size={18} />
          </button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell title="Create account" sub="Already a member?" switchLead="Log in" switchLabel="Log in" switchTo="/login" steps={[step, 2]}>
      {serverError && (
        <div className="au-alert" role="alert" key={serverError}>
          <AlertCircle size={17} /> <span>{serverError}</span>
        </div>
      )}

      {step === 1 ? (
        <>
          <form onSubmit={goNext} noValidate className="au-form au-step" key="s1">
            <AuthInput icon={User} label="Full name" name="full_name" value={form.full_name} onChange={change} error={errors.full_name} autoComplete="name" autoFocus />
            <AuthInput icon={Mail} label="Email" name="email" type="email" value={form.email} onChange={change} error={errors.email} autoComplete="email" />
            <div className="au-row">
              <AuthInput icon={CalendarDays} label="Age" name="age" type="number" inputMode="numeric" value={form.age} onChange={change} error={errors.age} />
              <AuthInput icon={Users} label="Gender" name="gender" type="select" value={form.gender} onChange={change} error={errors.gender}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </AuthInput>
            </div>
            <AuthInput icon={MapPin} label="Location" name="address" value={form.address} onChange={change} error={errors.address} autoComplete="address-level2" />
            <button type="submit" className="au-btn">
              Continue <ArrowRight size={18} />
            </button>
          </form>
          <div className="au-or"><span>or</span></div>
          <div className="au-google"><div ref={gRef} /></div>
        </>
      ) : (
        <form onSubmit={submit} noValidate className="au-form au-step" key="s2">
          <AuthInput icon={Lock} label="Password" name="password" type="password" value={form.password} onChange={change} error={errors.password} autoComplete="new-password" autoFocus onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') || false)} hint={caps ? 'Caps Lock is on' : undefined} />
          <div className={`au-meter l${level}`} aria-hidden={!form.password}>
            <i /><i /><i /><i />
            <span>{LEVELS[level]}</span>
          </div>
          <AuthInput icon={ShieldCheck} label="Confirm password" name="confirm" type="password" value={form.confirm} onChange={change} error={errors.confirm} autoComplete="new-password" />
          <div className="au-btns">
            <button type="button" className="au-btn is-ghost" onClick={() => setStep(1)} aria-label="Back">
              <ArrowLeft size={18} />
            </button>
            <button type="submit" className="au-btn" disabled={loading}>
              {loading ? <span className="au-spin" /> : <>Create account <ArrowRight size={18} /></>}
            </button>
          </div>
        </form>
      )}
    </AuthShell>
  )
}