import { useSyncExternalStore } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, ArrowRight, AlertCircle, CalendarDays, HeartHandshake } from 'lucide-react'
import { apiGet } from '../../api.js'
import { emit, on } from '../../lib/bus.js'

export const CATS = {
  urgent: { label: 'Urgent', icon: AlertCircle },
  event: { label: 'Event', icon: CalendarDays },
  ministry: { label: 'Ministry', icon: HeartHandshake },
  general: { label: 'General', icon: Megaphone },
}
export const catOf = (c) => CATS[c] || CATS.general

/* ---------------------------------------------------------------
   Shared store: iisang fetch para sa buong portal.
   Events na ginagamit (lib/bus.js):
     announcements:changed  -> (galing admin) mag-refresh agad
     announcements:new      -> may bagong announcement na dumating
     announcements:seen     -> may na-mark as read
   --------------------------------------------------------------- */
const KEY = 'lg-ann-seen'
const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

let state = { items: [], seen: readSeen(), loading: true }
const subs = new Set()
const setState = (patch) => {
  state = { ...state, ...patch }
  subs.forEach((f) => f())
}
let inflight = null
const weight = (a) => Number(a.is_pinned) * 2 + (a.category === 'urgent' ? 1 : 0)

export function refreshAnnouncements() {
  if (inflight) return inflight
  inflight = apiGet('/api/announcements')
    .then((d) => {
      if (!Array.isArray(d)) return setState({ loading: false })
      const items = [...d].sort((a, b) => weight(b) - weight(a))
      const known = new Set(state.items.map((a) => a.id))
      const fresh = state.items.length ? items.filter((a) => !known.has(a.id)) : []
      setState({ items, loading: false })
      if (fresh.length) emit('announcements:new', fresh)
    })
    .catch(() => setState({ loading: false }))
    .finally(() => {
      inflight = null
    })
  return inflight
}

export function markSeen(ids) {
  const seen = [...new Set([...state.seen, ...ids])]
  try {
    localStorage.setItem(KEY, JSON.stringify(seen))
  } catch {}
  setState({ seen })
  emit('announcements:seen', seen)
}

function start() {
  refreshAnnouncements()
  const visible = () => document.visibilityState === 'visible' && refreshAnnouncements()
  const timer = setInterval(visible, 60000)
  const onStorage = (e) => e.key === KEY && setState({ seen: readSeen() }) // sync sa ibang tab
  document.addEventListener('visibilitychange', visible)
  window.addEventListener('online', visible)
  window.addEventListener('storage', onStorage)
  const off = on('announcements:changed', () => refreshAnnouncements())
  return () => {
    clearInterval(timer)
    document.removeEventListener('visibilitychange', visible)
    window.removeEventListener('online', visible)
    window.removeEventListener('storage', onStorage)
    off()
  }
}

let stop = null
function subscribe(fn) {
  subs.add(fn)
  if (subs.size === 1) stop = start()
  return () => {
    subs.delete(fn)
    if (!subs.size) {
      stop?.()
      stop = null
    }
  }
}

export function useAnnouncements() {
  const s = useSyncExternalStore(subscribe, () => state, () => state)
  return {
    ...s,
    unread: s.items.filter((a) => !s.seen.includes(a.id)).length,
    markAllSeen: () => markSeen(s.items.map((a) => a.id)),
    markSeen,
    refresh: refreshAnnouncements,
  }
}

export function AnnouncementList({ items, seen = [], limit }) {
  const list = limit ? items.slice(0, limit) : items
  return list.map((a) => {
    const isNew = !seen.includes(a.id)
    const external = a.link_url?.startsWith('http')
    const Icon = catOf(a.category).icon
    return (
      <div className={`an-item${isNew ? ' is-new' : ''}`} key={a.id}>
        <span className="neo-tile">
          <Icon size={18} strokeWidth={1.8} />
        </span>
        <div className="an-body">
          <div className="an-meta">
            {(a.badge_text || a.category) && <span className="p-badge">{a.badge_text || a.category}</span>}
            {Number(a.is_pinned) === 1 && <span className="p-badge warn">Pinned</span>}
          </div>
          <strong>{a.title}</strong>
          <p>{a.content}</p>
          {a.link_url &&
            (external ? (
              <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="an-link">
                {a.link_text || 'Learn more'} <ArrowRight size={14} />
              </a>
            ) : (
              <Link to={a.link_url} className="an-link">
                {a.link_text || 'Learn more'} <ArrowRight size={14} />
              </Link>
            ))}
        </div>
        {isNew && <i className="an-dot" aria-label="New" />}
      </div>
    )
  })
}
