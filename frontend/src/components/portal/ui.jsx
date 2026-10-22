import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X, Inbox } from 'lucide-react'

/* ---------- Page header ---------- */
export function PageHeader({ title, desc, actions }) {
  return (
    <div className="p-head">
      <div>
        <h1 className="p-title">{title}</h1>
        {desc && <p className="p-desc">{desc}</p>}
      </div>
      {actions && <div className="p-actions">{actions}</div>}
    </div>
  )
}

/* ---------- Stats strip ---------- */
export function Stats({ items, loading }) {
  return (
    <div className="p-stats">
      {items.map((s) => (
        <div className="p-stat" key={s.label}>
          <span>{s.label}</span>
          <strong>{loading ? '–' : s.value ?? 0}</strong>
        </div>
      ))}
    </div>
  )
}

export function Badge({ tone, children }) {
  return <span className={`p-badge ${tone || ''}`}>{children}</span>
}

export function Empty({ icon: Icon = Inbox, title, desc, action }) {
  return (
    <div className="p-empty">
      <div className="p-empty-icon">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <strong>{title}</strong>
      {desc && <p>{desc}</p>}
      {action}
    </div>
  )
}

export function Loading({ rows = 4 }) {
  return (
    <div style={{ padding: 16, display: 'grid', gap: 14 }} aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-skel" style={{ width: `${90 - i * 12}%` }} />
      ))}
    </div>
  )
}

export function Field({ label, hint, children, htmlFor }) {
  return (
    <div className="p-field">
      <label className="p-label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {hint && <span className="p-hint">{hint}</span>}
    </div>
  )
}

export function Tabs({ tabs, value, onChange }) {
  return (
    <div className="p-tabs" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          role="tab"
          aria-selected={value === t.value}
          className={`p-tab${value === t.value ? ' is-active' : ''}`}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count !== undefined && <span className="p-tab-n">{t.count}</span>}
        </button>
      ))}
    </div>
  )
}

export function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="p-switch"
      onClick={onChange}
    />
  )
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, footer }) {
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && closeRef.current()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <div className="p-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="p-modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="p-modal-head">
          <h2>{title}</h2>
          <button type="button" className="p-btn p-btn-quiet p-btn-icon" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, busy, onConfirm, onCancel }) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      footer={
        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={`p-btn ${danger ? 'p-btn-danger-solid' : 'p-btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="p-modal-body">
        <p className="p-text">{message}</p>
      </div>
    </Modal>
  )
}

/* ---------- Toasts ---------- */
const ToastCtx = createContext(() => {})

export function ToastProvider({ children }) {
  const [items, setItems] = useState([])
  const idRef = useRef(0)

  const toast = useCallback((message, tone = 'ok') => {
    const id = ++idRef.current
    setItems((list) => [...list, { id, message, tone }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), 4000)
  }, [])

  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="p-toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`p-toast ${t.tone === 'bad' ? 'bad' : ''}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  )
}

export function useToast() {
  return useContext(ToastCtx)
}
