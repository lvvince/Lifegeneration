import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { X, Inbox, Sparkles, Users, Network, CalendarDays, HeartHandshake, ClipboardList, HandCoins, QrCode, Megaphone, TrendingUp } from 'lucide-react'

/* ---------- Page header ---------- */
const PAGE_INFO = {
  overview: { icon: Sparkles, kicker: 'Dashboard', detail: 'A live snapshot of members, events, giving and prayer activity. Start with the items that need your attention, then jump into any area from the shortcuts below.', points: ['Live totals', 'Upcoming events', 'Pending reviews'] },
  members: { icon: Users, kicker: 'Directory', detail: 'Every account in Life Generation lives here. Search by name, email or member ID, move someone between member, officer and admin, or turn an account on or off without losing their history.', points: ['Search and filter', 'Role changes', 'CSV export'] },
  'd-groups': { icon: Network, kicker: 'Discipleship', detail: 'Create and look after the small groups where members grow together. Review join requests, assign leaders, set meeting schedules and see who belongs to each group.', points: ['Join requests', 'Group leaders', 'Meeting schedules'] },
  events: { icon: CalendarDays, kicker: 'Gatherings', detail: 'Plan youth nights, worship services and special days. Set a date and capacity, add a banner photo, then watch the sign-ups come in and export the attendee list when you need it.', points: ['Capacity and RSVPs', 'Banner photos', 'Attendee lists'] },
  'volunteer teams': { icon: HeartHandshake, kicker: 'Serve', detail: 'Build the ministry teams that run every event. Open or close slots, review volunteer applications and keep each team\u2019s roster up to date in one place.', points: ['Team slots', 'Applications', 'Volunteer rosters'] },
  applications: { icon: ClipboardList, kicker: 'Review queue', detail: 'Members who want to serve appear here as soon as they apply. Approve to add them to the ministry, or decline with a record, and every decision stays on file.', points: ['Pending first', 'One-tap decisions', 'Full history'] },
  donations: { icon: HandCoins, kicker: 'Giving', detail: 'Check each GCash, Maya or bank receipt against the amount and reference number, then mark it verified or rejected. Totals update the moment you decide.', points: ['Receipt review', 'Verified totals', 'Donor records'] },
  'check-in': { icon: QrCode, kicker: 'Attendance', detail: 'Scan a member\u2019s QR pass or type their ID to record attendance in seconds. Walk-ins are welcome, and the running count follows the event you pick.', points: ['QR scanning', 'Manual ID entry', 'Walk-ins'] },
  announcements: { icon: Megaphone, kicker: 'Broadcast', detail: 'Announcements pop up at the top of every member\u2019s portal. Pin the important ones, set an expiry and hide them once they are no longer needed.', points: ['Pin to top', 'Expiry dates', 'Show or hide'] },
  reports: { icon: TrendingUp, kicker: 'Insights', detail: 'Membership growth, event attendance, giving and forecasts in one view. Export any table as CSV, or print the whole report as a PDF for meetings.', points: ['Growth trends', 'CSV export', 'Printable PDF'] },
  insights: { icon: TrendingUp, kicker: 'Insights', detail: 'See where attendance, membership and giving are heading, and which members may need a check-in. Print the summary when you need to share it.', points: ['Trends', 'Care list', 'Printable PDF'] },
}

export function PageHeader({ title, desc, actions, kicker, icon, detail, points }) {
  const info = PAGE_INFO[String(title).toLowerCase()] || {}
  const Icon = icon || info.icon || Sparkles
  const list = points || info.points
  const body = detail || info.detail
  return (
    <header className="rh">
      <div className="rh-main">
        <p className="rh-kicker"><Icon size={14} aria-hidden="true" /> {kicker || info.kicker || 'Admin'}</p>
        <h1 className="rh-title">{title}</h1>
        {desc && <p className="rh-desc">{desc}</p>}
        {body && <p className="rh-detail">{body}</p>}
        {list && list.length > 0 && (
          <ul className="rh-points" aria-label="Highlights">
            {list.map((t) => <li key={t}>{t}</li>)}
          </ul>
        )}
      </div>
      {actions && <div className="rh-actions">{actions}</div>}
      <Icon className="rh-mark" size={240} strokeWidth={0.5} aria-hidden="true" />
    </header>
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
