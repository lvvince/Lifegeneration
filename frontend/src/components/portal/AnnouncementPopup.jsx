import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { catOf, useAnnouncements } from './announcements.jsx'
import { on } from '../../lib/bus.js'

const POP_KEY = 'lg-ann-popped' // mga announcement na lumabas na bilang popup
const readPopped = () => {
  try {
    return JSON.parse(localStorage.getItem(POP_KEY) || '[]')
  } catch {
    return []
  }
}
const savePopped = (list) => {
  try {
    localStorage.setItem(POP_KEY, JSON.stringify(list))
  } catch {}
}

/* Presentational card: ginagamit ng popup at ng live preview sa admin. */
export function AnnouncementCard({ a, more = 0, preview = false, paused = false, onClose, onNavigate, onBarEnd }) {
  const cat = catOf(a.category)
  const Icon = cat.icon
  const external = a.link_url?.startsWith('http')
  const linkText = a.link_text || 'Learn more'
  return (
    <div className={`mp-pop is-${a.category || 'general'}${preview ? ' is-preview' : ''}`} role={preview ? undefined : 'alert'}>
      <span className="mp-pop-ico">
        <Icon size={20} strokeWidth={1.9} />
      </span>
      <div className="mp-pop-body">
        <div className="mp-pop-meta">
          <b>{a.badge_text || cat.label}</b>
          {more > 0 && <small>+{more} more</small>}
        </div>
        <strong>{a.title || 'Announcement title'}</strong>
        <p>{a.content || 'Your message will show up here.'}</p>
        {a.link_url &&
          (preview ? (
            <span className="mp-pop-link">
              {linkText} <ArrowRight size={15} />
            </span>
          ) : external ? (
            <a className="mp-pop-link" href={a.link_url} target="_blank" rel="noopener noreferrer" onClick={onNavigate}>
              {linkText} <ArrowRight size={15} />
            </a>
          ) : (
            <Link className="mp-pop-link" to={a.link_url} onClick={onNavigate}>
              {linkText} <ArrowRight size={15} />
            </Link>
          ))}
      </div>
      {onClose && (
        <button type="button" className="mp-pop-x" onClick={onClose} aria-label="Dismiss announcement">
          <X size={18} />
        </button>
      )}
      {!preview && a.category !== 'urgent' && (
        <i className="mp-pop-bar" style={{ animationPlayState: paused ? 'paused' : 'running' }} onAnimationEnd={onBarEnd} />
      )}
    </div>
  )
}

/* Pop-up sa taas ng portal. Lalabas isang beses bawat announcement.
   - Auto-close pagkatapos ng ~9s (pause kapag hawak/hover o nakatago ang tab)
   - Swipe pataas para i-dismiss
   - Urgent: hindi nagsasara hangga't hindi pinipindot ang X
   - Nakikinig sa 'announcements:seen' kaya nawawala agad kapag na-mark all read sa bell */
export default function AnnouncementPopup() {
  const { items } = useAnnouncements()
  const { pathname } = useLocation()
  const [popped, setPopped] = useState(readPopped)
  const [paused, setPaused] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [dragY, setDragY] = useState(0)
  const drag = useRef(null)

  const queue = useMemo(() => items.filter((a) => !popped.includes(a.id)), [items, popped])
  const cur = queue[0]
  const hidden = pathname.startsWith('/admin')

  const close = useCallback(() => {
    if (!cur || leaving) return
    setLeaving(true)
    setTimeout(() => {
      const next = [...new Set([...popped, cur.id])]
      savePopped(next)
      setPopped(next)
      setLeaving(false)
      setDragY(0)
      setPaused(false)
    }, 220)
  }, [cur, leaving, popped])

  useEffect(
    () =>
      on('announcements:seen', (ids) =>
        setPopped((p) => {
          const next = [...new Set([...p, ...ids])]
          savePopped(next)
          return next
        })
      ),
    []
  )

  useEffect(() => {
    const onVis = () => setPaused(document.visibilityState !== 'visible')
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  if (hidden || !cur) return null

  const release = (e) => {
    if (!drag.current) return
    const dy = dragY
    drag.current = null
    if (dy < -48 && e.type === 'pointerup') close()
    else {
      setDragY(0)
      setPaused(false)
    }
  }

  return (
    <div
      key={cur.id}
      className={`mp-pop-wrap${leaving ? ' is-leaving' : ''}${dragY ? ' is-dragging' : ''}`}
      style={dragY ? { transform: `translateY(${dragY}px)` } : undefined}
      onPointerDown={(e) => {
        drag.current = { y: e.clientY }
        setPaused(true)
      }}
      onPointerMove={(e) => drag.current && setDragY(Math.min(0, e.clientY - drag.current.y))}
      onPointerUp={release}
      onPointerCancel={release}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && !drag.current && setPaused(false)}
    >
      <AnnouncementCard a={cur} more={queue.length - 1} paused={paused} onClose={close} onNavigate={close} onBarEnd={close} />
    </div>
  )
}
