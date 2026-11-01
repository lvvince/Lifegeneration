import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CalendarDays, Users, Megaphone, X, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react'
import { apiGet } from '../api.js'
import '../styles/annpop.css'

const CAT = {
  urgent: { icon: AlertCircle, label: 'Urgent' },
  event: { icon: CalendarDays, label: 'Event' },
  ministry: { icon: Users, label: 'Ministry' },
  general: { icon: Megaphone, label: 'Announcement' },
}
const KEY = 'dismissed_announcements'

/* Floating clay card (bottom of the screen) instead of a full-width bar:
   it never pushes the hero down, can be swiped away on phones, and pages through multiple posts. */
export default function AnnouncementBanner() {
  const [list, setList] = useState([])
  const [i, setI] = useState(0)
  const [more, setMore] = useState(false)
  const gone = false
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(KEY) || '[]') } catch { return [] }
  })
  const drag = useRef(null)
  const [dx, setDx] = useState(0)

  useEffect(() => {
    let alive = true
    apiGet('/api/announcements').then((d) => alive && Array.isArray(d) && setList(d)).catch(() => {})
    return () => { alive = false }
  }, [])

  const active = list.filter((a) => !dismissed.includes(a.id))
  if (!active.length || gone) return null
  const cur = active[Math.min(i, active.length - 1)]
  const cat = CAT[cur.category] || CAT.general
  const Icon = cat.icon
  const long = (cur.content || '').length > 110

  const dismiss = () => {
    const next = [...dismissed, cur.id]
    setDismissed(next)
    setMore(false)
    setDx(0)
    setI(0)
    try { sessionStorage.setItem(KEY, JSON.stringify(next)) } catch { /* ignore */ }
  }
  const step = (d) => { setI((n) => (n + d + active.length) % active.length); setMore(false) }

  const onUp = () => {
    const d = dx
    drag.current = null
    if (Math.abs(d) > 90) dismiss()
    else setDx(0)
  }

  const external = cur.link_url?.startsWith('http')
  const linkProps = { className: 'ap-link', children: <>{cur.link_text || 'Learn more'} <ArrowRight size={15} aria-hidden="true" /></> }

  return (
    <aside
      key={cur.id}
      className={`ap is-${cur.category || 'general'}${dx ? ' is-drag' : ''}`}
      role="alert"
      style={dx ? { transform: `translateX(${dx}px)`, opacity: 1 - Math.min(0.6, Math.abs(dx) / 260) } : undefined}
      onPointerDown={(e) => { if (e.target.closest('button,a')) return; drag.current = e.clientX }}
      onPointerMove={(e) => drag.current != null && setDx(e.clientX - drag.current)}
      onPointerUp={onUp}
      onPointerCancel={onUp}
    >
      <span className="ap-ico"><Icon size={20} aria-hidden="true" /></span>
      <div className="ap-body">
        <div className="ap-meta">
          <b>{cur.badge_text || cat.label}</b>
          {active.length > 1 && <small>{Math.min(i, active.length - 1) + 1} / {active.length}</small>}
        </div>
        <strong>{cur.title}</strong>
        {cur.content && <p className={more ? 'is-open' : ''}>{cur.content}</p>}
        <div className="ap-acts">
          {long && <button type="button" className="ap-more" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'Show less' : 'Read more'}</button>}
          {cur.link_url && (external
            ? <a href={cur.link_url} target="_blank" rel="noopener noreferrer" {...linkProps} />
            : <Link to={cur.link_url} {...linkProps} />)}
        </div>
      </div>
      <div className="ap-side">
        <button type="button" className="ap-x" onClick={dismiss} aria-label="Dismiss announcement"><X size={16} /></button>
        {active.length > 1 && (
          <div className="ap-pg">
            <button type="button" onClick={() => step(-1)} aria-label="Previous announcement"><ChevronLeft size={16} /></button>
            <button type="button" onClick={() => step(1)} aria-label="Next announcement"><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </aside>
  )
}
