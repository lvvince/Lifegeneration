import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiPost } from '../api.js'

const EMPTY = { full_name: '', username: '', email: '', age: '', address: '', password: '', confirm: '' }

export default function Register() {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [notice, setNotice] = useState('')
  const [success, setSuccess] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
    setErrors({ ...errors, [e.target.name]: '' })
  }

  const validate = () => {
    const next = {}
    if (!form.full_name.trim()) next.full_name = 'Full name is required.'
    if (!/^[A-Za-z0-9_]{3,50}$/.test(form.username)) next.username = '3-50 letters, numbers or underscores.'
    if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address.'
    if (form.age && (Number(form.age) < 10 || Number(form.age) > 100)) next.age = 'Enter a valid age.'
    if (form.password.length < 8) next.password = 'At least 8 characters.'
    if (form.confirm !== form.password) next.confirm = 'Passwords do not match.'
    return next
  }

  const isNotImplemented = (err) =>
    err?.status === 404 ||
    err?.status === 501 ||
    /not implemented/i.test(err?.message || '')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError('')
    setNotice('')

    const found = validate()
    if (Object.keys(found).length) {
      setErrors(found)
      return
    }

    setLoading(true)
    try {
      const { confirm: _confirm, ...payload } = form
      const data = await apiPost('/api/register', payload)
      setSuccess(data)
      setForm(EMPTY)
    } catch (err) {
      if (isNotImplemented(err)) {
        setNotice('Registration will be enabled in Checking 2. The form and validation are ready.')
      } else {
        setErrors(err.fields || {})
        setServerError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="auth-wrap">
        <div className="card auth-card">
          <h2>Registration submitted</h2>
          <p>{success.message}</p>
          {success.member_code && (
            <p>Your member ID: <strong>{success.member_code}</strong></p>
          )}
          <Link to="/login">Go to login</Link>
        </div>
      </div>
    )
  }

  const field = (name, label, type = 'text') => (
    <>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} value={form[name]} onChange={handleChange} />
      {errors[name] && <small className="field-error">{errors[name]}</small>}
    </>
  )

  return (
    <div className="auth-wrap">
      <form className="card auth-card" onSubmit={handleSubmit} noValidate>
        <h2>Member Registration</h2>
        <p className="muted">Your registration will be reviewed by an officer.</p>
        {serverError && <div className="alert">{serverError}</div>}
        {notice && <div className="alert">{notice}</div>}

        {field('full_name', 'Full name')}
        {field('username', 'Username')}
        {field('email', 'Email', 'email')}
        {field('age', 'Age', 'number')}
        {field('address', 'Address')}
        {field('password', 'Password', 'password')}
        {field('confirm', 'Confirm password', 'password')}

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Submit registration'}
        </button>
        <p className="muted">Already registered? <Link to="/login">Login</Link></p>
      </form>
    </div>
  )
}