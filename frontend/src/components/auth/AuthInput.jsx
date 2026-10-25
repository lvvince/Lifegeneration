import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

/* Dark field na may icon at lumulutang na label. Pwede ring password (may show/hide) o select dropdown. */
export default function AuthInput({
  icon: Icon,
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  autoComplete,
  autoFocus,
  inputMode,
  onKeyUp,
  hint,
  children,
}) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'
  const isSelect = type === 'select'

  return (
    <div className={`au-f${error ? ' has-err' : ''}`}>
      <label className="au-field">
        {Icon && <Icon size={18} strokeWidth={1.8} className="au-field-ico" />}
        {isSelect ? (
          <select
            name={name}
            value={value}
            onChange={onChange}
            autoFocus={autoFocus}
            aria-invalid={!!error}
          >
            {children}
          </select>
        ) : (
          <input
            name={name}
            type={isPw && show ? 'text' : type}
            placeholder=" "
            value={value}
            onChange={onChange}
            onKeyUp={onKeyUp}
            autoComplete={autoComplete}
            autoFocus={autoFocus}
            inputMode={inputMode}
            aria-invalid={!!error}
          />
        )}
        <span className="au-field-label">{label}</span>
        {isPw && (
          <button
            type="button"
            className="au-eye"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            tabIndex={-1}
          >
            {show ? <EyeOff size={18} strokeWidth={1.8} /> : <Eye size={18} strokeWidth={1.8} />}
          </button>
        )}
      </label>
      {error ? (
        <span className="au-err" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="au-hint">{hint}</span>
      ) : null}
    </div>
  )
}
