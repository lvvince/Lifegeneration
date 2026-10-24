import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CalendarDays, Megaphone, Moon, Search, Sun, User, LogOut, X, BellOff, Clock } from 'lucide-react'
import { catOf, useAnnouncements } from './announcements.jsx'
import { getEvents, peekEvents } from '../../lib/events-cache.js'
import { on } from '../../lib/bus.js'
import { fmtDate, parseDate } from '../../lib/format.js'

/* ---------- Sheet: bottom sheet sa phone, popover/palette sa desktop ---------- */
export function Sheet({ label, kind = 'pop', onClose, children }) {
  const [dy, setDy] = useState(0)
  const start = useRef(null)

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  const down = (e) => {
    start.current = e.clientY
    e.currentTarget.setPointerCapture?.(e.pointerId)
  }
  const move = (e) => start.current !== null && setDy(Math.max(0, e.clientY - start.current))
  const up = () => {
    if (start.current === null) return
    start.current = null
    if (dy > 90) onClose()
    else setDy(0)
  }

  return (
    <div className={`mp-layer is-${kind}`} onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={`mp-sheet mp-sheet--${kind}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        style={dy ? { transform: `translateY(${dy}px)`, transition: 'none' } : undefined}
      >
        <div className="mp-grab" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          <i />
        </div>
        {children}
      </div>
    </div>
  )
}

/* ---------- Feed: announcements + paalala sa events na sinalihan ---------- */
export function useFeed(enabled = true) {
  const ann = useAnnouncements()
  const [events, setEvents] = useState(peekEvents)

  useEffect(() => {
    if (!enabled) return undefined
    getEvents().then(setEvents)
    return on('events:loaded', setEvents)
  }, [enabled])

  const items = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const reminders = enabled
      ? events
          .filter((e) => e.user_rsvp === 'attending')
          .map((e) => ({ e, days: Math.round(((parseDate(e.event_date) || 0) - today) / 864e5) }))
          .filter(({ days }) => days >= 0 && days <= 3)
          .map(({ e, days }) => ({
            id: `ev-${e.id}`,
            kind: 'event',
            category: 'event',
            title: days === 0 ? `Today: ${e.title}` : days === 1 ? `Tomorrow: ${e.title}` : `In ${days} days: ${e.title}`,
            content: [e.event_time, e.location].filter(Boolean).join(' · ') || 'You are going to this event.',
            to: `/events/${e.id}`,
          }))
      : []
    const news = ann.items.map((a) => ({
      id: a.id,
      kind: 'announcement',
      category: a.category,
      badge: a.badge_text,
      title: a.title,
      content: a.content,
      at: a.created_at,
      to: a.link_url?.startsWith('/') ? a.link_url : null,
      href: a.link_url?.startsWith('http') ? a.link_url : null,
    }))
    return [...reminders, ...news]
  }, [events, ann.items, enabled])

  return {
    items,
    seen: ann.seen,
    unread: items.filter((i) => !ann.seen.includes(i.id)).length,
    markSeen: ann.markSeen,
    markAllSeen: () => ann.markSeen(items.map((i) => i.id)),
  }
}

function ago(dt) {
  if (!dt) return ''
  const x = new Date(String(dt).replace(' ', 'T'))
  if (isNaN(x)) return ''
  const s = (Date.now() - x) / 1000
  if (s < 60) return 'Just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`
  return x.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
}

/* ---------- Notifications ---------- */
export function NotificationsPanel({ feed, onClose }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState('all')
  const [open, setOpen] = useState(null)
  const shown = feed.items.filter((i) => tab === 'all' || !feed.seen.includes(i.id))

  const pick = (i) => {
    feed.markSeen([i.id])
    if (i.to) {
      onClose()
      navigate(i.to)
    } else if (i.href) window.open(i.href, '_blank', 'noopener,noreferrer')
    else setOpen(open === i.id ? null : i.id)
  }

  return (
    <>
      <div className="mp-ph">
        <h2>Notifications</h2>
        <button type="button" className="mp-text-btn" onClick={feed.markAllSeen} disabled={!feed.unread}>
          Mark all read
        </button>
        <button type="button" className="mp-ib mp-ib-sm" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="mp-chips">
        {[
          ['all', 'All'],
          ['unread', `Unread${feed.unread ? ` (${feed.unread})` : ''}`],
        ].map(([k, l]) => (
          <button key={k} type="button" className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      <div className="mp-scroll">
        {shown.length === 0 ? (
          <div className="mp-empty">
            <BellOff size={26} strokeWidth={1.6} />
            <b>{tab === 'unread' ? 'You are all caught up' : 'Nothing here yet'}</b>
            <span>New announcements and event reminders will show up here.</span>
          </div>
        ) : (
          shown.map((i) => {
            const Icon = i.kind === 'event' ? CalendarDays : catOf(i.category).icon
            const isNew = !feed.seen.includes(i.id)
            return (
              <button type="button" key={i.id} className={`mp-note${isNew ? ' is-new' : ''}${open === i.id ? ' is-open' : ''}`} onClick={() => pick(i)}>
                <span className="mp-note-ico">
                  <Icon size={19} strokeWidth={1.8} />
                </span>
                <span className="mp-note-body">
                  <b>{i.title}</b>
                  <span>{i.content}</span>
                  <small>
                    {i.kind === 'event' ? 'Event reminder' : i.badge || catOf(i.category).label}
                    {i.at ? ` · ${ago(i.at)}` : ''}
                  </small>
                </span>
                {isNew && <i className="mp-dot" aria-label="Unread" />}
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

/* ---------- Search ---------- */
const RKEY = 'lg-recent-search'
const readRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RKEY) || '[]')
  } catch {
    return []
  }
}

export function SearchPanel({ nav, user, onClose }) {
  const navigate = useNavigate()
  const ann = useAnnouncements()
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)
  const [sel, setSel] = useState(0)
  const [events, setEvents] = useState(peekEvents)
  const [recent, setRecent] = useState(readRecent)

  useEffect(() => {
    getEvents().then(setEvents)
  }, [])

  const groups = useMemo(() => {
    const t = dq.trim().toLowerCase()
    const hit = (...s) => !t || s.some((v) => String(v || '').toLowerCase().includes(t))
    const pages = [
      ...nav.map((n) => ({ key: n.to, label: n.label, sub: 'Page', icon: n.icon, to: n.to })),
      ...(user ? [{ key: 'profile', label: 'My profile', sub: 'Page', icon: User, to: '/dashboard/profile' }] : []),
    ].filter((r) => hit(r.label))
    const evs = t
      ? events
          .filter((e) => hit(e.title, e.location, e.description))
          .slice(0, 5)
          .map((e) => ({ key: `e${e.id}`, label: e.title, sub: [fmtDate(e.event_date), e.location].filter(Boolean).join(' · '), icon: CalendarDays, to: `/events/${e.id}` }))
      : []
    const news = t
      ? ann.items
          .filter((a) => hit(a.title, a.content))
          .slice(0, 4)
          .map((a) => ({ key: `a${a.id}`, label: a.title, sub: 'Announcement', icon: Megaphone, to: a.link_url?.startsWith('/') ? a.link_url : '/dashboard' }))
      : []
    return [['Pages', pages], ['Events', evs], ['Announcements', news]].filter(([, r]) => r.length)
  }, [dq, nav, user, events, ann.items])

  const flat = groups.flatMap(([, r]) => r)

  const go = (r) => {
    const term = q.trim()
    if (term) {
      const next = [term, ...recent.filter((x) => x !== term)].slice(0, 5)
      setRecent(next)
      try {
        localStorage.setItem(RKEY, JSON.stringify(next))
      } catch {}
    }
    onClose()
    navigate(r.to)
  }

  const onKey = (e) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(s + 1, flat.length - 1)))
    else if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)))
    else if (e.key === 'Enter' && flat[sel]) go(flat[sel])
  }

  let n = -1
  return (
    <>
      <div className="mp-sin">
        <Search size={19} />
        <input
          autoFocus
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={q}
          onChange={(e) => (setQ(e.target.value), setSel(0))}
          onKeyDown={onKey}
          placeholder="Search pages, events, announcements"
          aria-label="Search"
        />
        <button type="button" className="mp-text-btn" onClick={onClose}>
          Cancel
        </button>
      </div>
      <div className="mp-scroll">
        {!q.trim() && recent.length > 0 && (
          <div className="mp-recent">
            <span className="mp-grp">Recent</span>
            <div className="mp-chips mp-chips-wrap">
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => setQ(r)}>
                  <Clock size={13} /> {r}
                </button>
              ))}
            </div>
          </div>
        )}
        {flat.length === 0 && (
          <div className="mp-empty">
            <Search size={26} strokeWidth={1.6} />
            <b>Nothing found</b>
            <span>Try another word.</span>
          </div>
        )}
        {groups.map(([title, rows]) => (
          <div key={title}>
            <span className="mp-grp">{title}</span>
            {rows.map((r) => {
              n += 1
              const idx = n
              return (
                <button type="button" key={r.key} className={`mp-res${idx === sel ? ' is-sel' : ''}`} onMouseEnter={() => setSel(idx)} onClick={() => go(r)}>
                  <span className="mp-note-ico">
                    <r.icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="mp-note-body">
                    <b>{r.label}</b>
                    <small>{r.sub}</small>
                  </span>
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- Profile menu ---------- */
export function ProfileMenu({ avatar, name, role, email, theme, onToggleTheme, onSignOut, onClose }) {
  return (
    <>
      <div className="mp-ph">
        <h2>Account</h2>
        <button type="button" className="mp-ib mp-ib-sm" onClick={onClose} aria-label="Close">
          <X size={18} />
        </button>
      </div>
      <div className="mp-scroll">
        <div className="mp-me">
          {avatar}
          <div>
            <b>{name}</b>
            <small>{email || role}</small>
          </div>
        </div>
        <Link to="/dashboard/profile" className="mp-mi" onClick={onClose}>
          <User size={19} /> My profile
        </Link>
        <button type="button" className="mp-mi" onClick={onToggleTheme}>
          {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button type="button" className="mp-mi is-danger" onClick={onSignOut}>
          <LogOut size={19} /> Sign out
        </button>
      </div>
    </>
  )
}

