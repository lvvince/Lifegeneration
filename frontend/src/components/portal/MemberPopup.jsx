import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ArrowRight } from 'lucide-react'
import { catOf, useAnnouncements } from './announcements.jsx'
import { on } from '../../lib/bus.js'

const POP_KEY = 'lg-ann-popped' // pareho ng lumang popup, kaya hindi umuulit kahit magpalit ng layout
const AUTO_MS = 9000
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

/* Announcement na bumababa mula sa taas ng portal.
   - Isang beses lang bawat announcement; may "+n more" kapag marami
   - Auto-close ~9s (humihinto kapag hover/hawak o nakatago ang tab)
   - Swipe pataas o Esc para i-dismiss. Urgent = hindi nagsasara hangga't walang X
   - Nakikinig sa 'announcements:seen' (mark all read) at 'announcements:new' (live) */
export default function MemberPopup() {
  const { items } = useAnnouncements()
  const [popped, setPopped] = useState(readPopped)
  const [paused, setPaused] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [side, setSide] = useState(false) // bukas ang sidebar
  const [dragY, setDragY] = useState(0)
  const drag = useRef(null)
  const timer = useRef(null)

  const queue = useMemo(() => items.filter((a) => !popped.includes(a.id)), [items, popped])
  const cur = queue[0]
  const urgent = cur?.category === 'urgent'

  const close = useCallback(() => {
    if (!cur) return
    setLeaving(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setPopped((p) => {
        const next = [...new Set([...p, cur.id])]
        savePopped(next)
        return next
      })
      setLeaving(false)
      setDragY(0)
      setPaused(false)
    }, 280)
  }, [cur])

  // auto-close timer: pause-able, naka-reset kada bagong announcement
  const left = useRef(AUTO_MS)
  const startedAt = useRef(0)
  useEffect(() => {
    left.current = AUTO_MS
  }, [cur?.id])
  useEffect(() => {
    if (!cur || urgent || leaving) return undefined
    if (paused || side) return undefined
    startedAt.current = Date.now()
    const t = setTimeout(close, left.current)
    return () => {
      clearTimeout(t)
      left.current = Math.max(1200, left.current - (Date.now() - startedAt.current))
    }
  }, [cur, urgent, paused, side, leaving, close])

  useEffect(() => on('portal:panel', setSide), [])

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
    const onKey = (e) => e.key === 'Escape' && cur && !document.querySelector('.sk-drawer.is-open') && close()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('keydown', onKey)
      clearTimeout(timer.current)
    }
  }, [cur, close])

  if (!cur) return null

  const Icon = catOf(cur.category).icon
  const cat = catOf(cur.category)
  const external = cur.link_url?.startsWith('http')
  const linkText = cur.link_text || 'Learn more'

  const down = (e) => {
    if (e.target.closest('a,button')) return
    drag.current = e.clientY
    setPaused(true)
  }
  const move = (e) => drag.current !== null && setDragY(Math.min(0, e.clientY - drag.current))
  const up = () => {
    if (drag.current === null) return
    drag.current = null
    if (dragY < -44) close()
    else {
      setDragY(0)
      setPaused(false)
    }
  }

  return (
    <div
      key={cur.id}
      className={`sk-pop-wrap${side ? ' is-hidden' : ''}${leaving ? ' is-leaving' : ''}${dragY ? ' is-dragging' : ''}`}
      style={dragY ? { transform: `translate3d(0, ${dragY}px, 0)`, opacity: 1 + dragY / 160 } : undefined}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onPointerEnter={(e) => e.pointerType === 'mouse' && setPaused(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && drag.current === null && setPaused(false)}
    >
      <div className={`sk-pop is-${cur.category || 'general'}`} role="alert">
        <span className="sk-pop-ico">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <div className="sk-pop-body">
          <div className="sk-pop-meta">
            <b>{cur.badge_text || cat.label}</b>
            {queue.length > 1 && <small>+{queue.length - 1} more</small>}
          </div>
          <strong>{cur.title}</strong>
          <p>{cur.content}</p>
          {cur.link_url &&
            (external ? (
              <a className="sk-pop-link" href={cur.link_url} target="_blank" rel="noopener noreferrer" onClick={close}>
                {linkText} <ArrowRight size={15} />
              </a>
            ) : (
              <Link className="sk-pop-link" to={cur.link_url} onClick={close}>
                {linkText} <ArrowRight size={15} />
              </Link>
            ))}
        </div>
        <button type="button" className="sk-pop-x" onClick={close} aria-label="Dismiss announcement">
          <X size={18} />
        </button>
        {!urgent && <i className="sk-pop-bar" style={{ animationDuration: `${AUTO_MS}ms`, animationPlayState: paused || side ? 'paused' : 'running' }}  />}
      </div>
    </div>
  )
}
