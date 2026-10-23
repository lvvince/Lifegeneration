import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Megaphone, ArrowRight } from 'lucide-react'
import { apiGet } from '../../api.js'
import { emit, on } from '../../lib/bus.js'

const KEY = 'lg-ann-seen'
const readSeen = () => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

// Kumukuha ng announcements, nagbibilang ng hindi pa nababasa, at nakikinig sa ibang component
export function useAnnouncements() {
  const [items, setItems] = useState([])
  const [seen, setSeen] = useState(readSeen)
  const [loading, setLoading] = useState(true)

  const load = useCallback(
    () =>
      apiGet('/api/announcements')
        .then((d) => Array.isArray(d) && setItems([...d].sort((a, b) => Number(b.is_pinned) - Number(a.is_pinned))))
        .catch(() => {})
        .finally(() => setLoading(false)),
    []
  )

  useEffect(() => {
    load()
    const off = on('announcements:seen', setSeen)
    const onVisible = () => document.visibilityState === 'visible' && load()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      off()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  const markAllSeen = () => {
    const ids = items.map((a) => a.id)
    try {
      localStorage.setItem(KEY, JSON.stringify(ids))
    } catch {}
    emit('announcements:seen', ids)
  }

  return { items, seen, loading, unread: items.filter((a) => !seen.includes(a.id)).length, markAllSeen }
}

export function AnnouncementList({ items, seen = [], limit }) {
  const list = limit ? items.slice(0, limit) : items
  return list.map((a) => {
    const isNew = !seen.includes(a.id)
    const external = a.link_url?.startsWith('http')
    return (
      <div className={`an-item${isNew ? ' is-new' : ''}`} key={a.id}>
        <span className="neo-tile">
          <Megaphone size={18} strokeWidth={1.8} />
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
