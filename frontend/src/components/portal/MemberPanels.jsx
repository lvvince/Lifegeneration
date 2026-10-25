import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Search, X, BellOff, Bell, CalendarDays, Megaphone, Moon, Sun, User, LogOut, ArrowRight, Clock, QrCode, Hash, MessageCircle, ChevronRight, Camera } from 'lucide-react'
import { catOf, useAnnouncements } from './announcements.jsx'
import { getEvents, peekEvents } from '../../lib/events-cache.js'
import { on } from '../../lib/bus.js'
import { fmtDate, isUpcoming, parseDate } from '../../lib/format.js'
import { FAQS } from '../../data/faqs.js'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

/* Hawak ang laman ng sidebar. Bawat icon sa kaliwa ay may sariling panel dito. */
export function Head({ title, sub, onClose, extra }) {
  return (
    <header className="sk-dh">
      <div>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {extra}
      <button type="button" className="sk-iconbtn" onClick={onClose} aria-label="Close sidebar">
        <X size={19} strokeWidth={1.9} />
      </button>
    </header>
  )
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
      <Head
        title="Notifications"
        sub={feed.unread ? `${feed.unread} unread` : 'You are all caught up'}
        onClose={onClose}
      />
      <div className="sk-dtools">
        <div className="sk-chips">
          {[
            ['all', 'All'],
            ['unread', 'Unread'],
          ].map(([k, l]) => (
            <button key={k} type="button" className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
              {l}
            </button>
          ))}
        </div>
        <button type="button" className="sk-textbtn" onClick={feed.markAllSeen} disabled={!feed.unread}>
          Mark all read
        </button>
      </div>
      <div className="sk-dscroll">
        {shown.length === 0 ? (
          <div className="sk-dempty">
            <BellOff size={26} strokeWidth={1.5} />
            <b>{tab === 'unread' ? 'Nothing new' : 'Nothing here yet'}</b>
            <span>New announcements and event reminders will show up here.</span>
          </div>
        ) : (
          shown.map((i, n) => {
            const Icon = i.kind === 'event' ? CalendarDays : catOf(i.category).icon
            const isNew = !feed.seen.includes(i.id)
            return (
              <button
                type="button"
                key={i.id}
                className={`sk-note${isNew ? ' is-new' : ''}${open === i.id ? ' is-open' : ''}`}
                style={{ '--n': Math.min(n, 8) }}
                onClick={() => pick(i)}
              >
                <span className="sk-tile">
                  <Icon size={18} strokeWidth={1.8} />
                </span>
                <span className="sk-note-body">
                  <b>{i.title}</b>
                  <span>{i.content}</span>
                  <small>
                    {i.kind === 'event' ? 'Event reminder' : i.badge || catOf(i.category).label}
                    {i.at ? ` · ${ago(i.at)}` : ''}
                  </small>
                </span>
                {isNew && <i className="sk-dot" aria-label="Unread" />}
              </button>
            )
          })
        )}
      </div>
    </>
  )
}

/* ---------- Search ---------- */
const RKEY = 'sk-recent-search'
const readRecent = () => {
  try {
    return JSON.parse(localStorage.getItem(RKEY) || '[]')
  } catch {
    return []
  }
}

export function SearchPanel({ nav, onClose }) {
  const navigate = useNavigate()
  const ann = useAnnouncements()
  const [q, setQ] = useState('')
  const dq = useDeferredValue(q)
  const [sel, setSel] = useState(0)
  const [events, setEvents] = useState(peekEvents)
  const [recent, setRecent] = useState(readRecent)

  useEffect(() => {
    getEvents().then(setEvents)
    return on('events:loaded', setEvents)
  }, [])

  const groups = useMemo(() => {
    const t = dq.trim().toLowerCase()
    const hit = (...s) => !t || s.some((v) => String(v || '').toLowerCase().includes(t))
    const pages = [
      ...nav.map((n) => ({ key: n.to, label: n.label, sub: 'Page', icon: n.icon, to: n.to })),
      { key: 'profile', label: 'My profile', sub: 'Page', icon: User, to: '/dashboard/profile' },
      { key: 'pass', label: 'Digital pass', sub: 'Profile', icon: QrCode, to: '/dashboard/profile' },
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
          .map((a) => ({ key: `a${a.id}`, label: a.title, sub: 'Announcement', icon: Megaphone, to: a.link_url?.startsWith('/') ? a.link_url : '/dashboard#updates' }))
      : []
    const faq = t
      ? FAQS.filter((f) => hit(f.q, f.a.join(' ')))
          .slice(0, 4)
          .map((f) => ({ key: `f${f.id}`, label: f.q, sub: 'FAQ', icon: MessageCircle, to: `/dashboard#faq-${f.id}` }))
      : []
    return [['Pages', pages], ['Events', evs], ['Announcements', news], ['FAQ', faq]].filter(([, r]) => r.length)
  }, [dq, nav, events, ann.items])

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
      <Head title="Search" sub="Pages, events, announcements and FAQ" onClose={onClose} />
      <div className="sk-search">
        <Search size={19} strokeWidth={1.8} />
        <input
          autoFocus
          type="search"
          inputMode="search"
          enterKeyHint="search"
          autoComplete="off"
          value={q}
          onChange={(e) => (setQ(e.target.value), setSel(0))}
          onKeyDown={onKey}
          placeholder="What are you looking for?"
          aria-label="Search"
        />
        {q && (
          <button type="button" className="sk-iconbtn is-sm" onClick={() => setQ('')} aria-label="Clear">
            <X size={16} />
          </button>
        )}
      </div>
      <div className="sk-dscroll">
        {!q.trim() && recent.length > 0 && (
          <div className="sk-recent">
            <span className="sk-grp">Recent</span>
            <div className="sk-chips is-wrap">
              {recent.map((r) => (
                <button key={r} type="button" onClick={() => setQ(r)}>
                  <Clock size={13} /> {r}
                </button>
              ))}
            </div>
          </div>
        )}
        {flat.length === 0 && (
          <div className="sk-dempty">
            <Search size={26} strokeWidth={1.5} />
            <b>Nothing found</b>
            <span>Try another word.</span>
          </div>
        )}
        {groups.map(([title, rows]) => (
          <div key={title}>
            <span className="sk-grp">{title}</span>
            {rows.map((r) => {
              n += 1
              const idx = n
              return (
                <button type="button" key={r.key} className={`sk-res${idx === sel ? ' is-sel' : ''}`} onMouseEnter={() => setSel(idx)} onClick={() => go(r)}>
                  <span className="sk-tile">
                    <r.icon size={18} strokeWidth={1.8} />
                  </span>
                  <span className="sk-note-body">
                    <b>{r.label}</b>
                    <small>{r.sub}</small>
                  </span>
                  <ChevronRight size={16} className="sk-res-go" />
                </button>
              )
            })}
          </div>
        ))}
      </div>
    </>
  )
}

/* ---------- Profile / account ---------- */
export function ProfilePanel({ avatar, name, role, email, memberId, tier, theme, onToggleTheme, onSignOut, onClose }) {
  return (
    <>
      <Head title="Account" onClose={onClose} />
      <div className="sk-dscroll">
        <div className="sk-me">
          <span className="sk-me-av">{avatar}</span>
          <b>{name}</b>
          <small>{email || role}</small>
          <div className="sk-me-tags">
            {memberId && (
              <span>
                <Hash size={13} /> {memberId}
              </span>
            )}
            <span>{tier || role}</span>
          </div>
        </div>

        <div className="sk-list">
          <Link to="/dashboard/profile" className="sk-row" onClick={onClose}>
            <span className="sk-tile">
              <User size={18} strokeWidth={1.8} />
            </span>
            <span className="sk-note-body">
              <b>My profile</b>
              <small>Photo, details and my events</small>
            </span>
            <ChevronRight size={16} className="sk-res-go" />
          </Link>
          <Link to="/dashboard/profile" className="sk-row" onClick={onClose}>
            <span className="sk-tile">
              <QrCode size={18} strokeWidth={1.8} />
            </span>
            <span className="sk-note-body">
              <b>Digital pass</b>
              <small>Your QR for event check-in</small>
            </span>
            <ChevronRight size={16} className="sk-res-go" />
          </Link>
          <button type="button" className="sk-row" onClick={onToggleTheme}>
            <span className="sk-tile">{theme === 'dark' ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}</span>
            <span className="sk-note-body">
              <b>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</b>
              <small>Switch the look of the portal</small>
            </span>
          </button>
          <button type="button" className="sk-row is-danger" onClick={onSignOut}>
            <span className="sk-tile">
              <LogOut size={18} strokeWidth={1.8} />
            </span>
            <span className="sk-note-body">
              <b>Sign out</b>
              <small>See you again soon</small>
            </span>
          </button>
        </div>
      </div>
    </>
  )
}

/* ---------- Page icons (Overview, Events, D-Groups, Ministries, Prayer wall) ---------- */
export function SectionPanel({ item, nav = [], user, onClose, onOpenFaq }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [events, setEvents] = useState(peekEvents)
  const member = user?.member || {}
  const Icon = item.icon

  useEffect(() => {
    if (item.id !== 'events' && item.id !== 'home') return undefined
    getEvents().then(setEvents)
    return on('events:loaded', setEvents)
  }, [item.id])

  const upcoming = useMemo(
    () =>
      events
        .filter((e) => isUpcoming(e.event_date))
        .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
        .slice(0, 3),
    [events]
  )

  const open = () => {
    onClose()
    navigate(item.to)
  }

  const mine =
    item.id === 'dgroups'
      ? { label: 'My D-Group', value: member.dgroup_name, empty: 'You have not joined a group yet.', cta: member.dgroup_name ? 'View groups' : 'Find a group' }
      : item.id === 'ministries'
        ? { label: 'My ministry', value: member.ministry_name, empty: 'You are not on a team yet.', cta: member.ministry_name ? 'View ministries' : 'Apply to serve' }
        : null

  return (
    <>
      <Head title={item.label} sub={item.blurb} onClose={onClose} />
      <div className="sk-dscroll">
        {mine && (
          <div className="sk-mine">
            <span className="sk-tile is-lg">
              <Icon size={22} strokeWidth={1.7} />
            </span>
            <small>{mine.label}</small>
            <b>{mine.value || mine.empty}</b>
          </div>
        )}

        {item.admin && (
          <>
            {(item.items ? [{ label: item.label, list: item.items }] : nav.map((g) => ({ label: g.items ? g.label : 'Dashboard', list: g.items || [g] }))).map((g) => (
              <div key={g.label}>
                <span className="sk-grp">{item.items ? 'Pages' : g.label}</span>
                {g.list.map((n) => {
                  const on = pathname === n.to || pathname.startsWith(`${n.to}/`)
                  return (
                    <Link to={n.to} className={`sk-row${on ? ' is-on' : ''}`} key={n.id} onClick={onClose}>
                      <span className="sk-tile">
                        <n.icon size={18} strokeWidth={1.8} />
                      </span>
                      <span className="sk-note-body">
                        <b>{n.label}</b>
                        <small>{n.blurb}</small>
                      </span>
                      <ChevronRight size={16} className="sk-res-go" />
                    </Link>
                  )
                })}
              </div>
            ))}
          </>
        )}

        {item.id === 'events' && (
          <>
            <span className="sk-grp">Coming up</span>
            {upcoming.length === 0 ? (
              <div className="sk-dempty is-tight">
                <CalendarDays size={24} strokeWidth={1.5} />
                <b>No upcoming events</b>
                <span>Check back soon.</span>
              </div>
            ) : (
              upcoming.map((e) => {
                const d = parseDate(e.event_date)
                return (
                  <Link to={`/events/${e.id}`} className="sk-row" key={e.id} onClick={onClose}>
                    <span className="sk-date">
                      <b>{d?.getDate()}</b>
                      <small>{d ? MONTHS[d.getMonth()] : ''}</small>
                    </span>
                    <span className="sk-note-body">
                      <b>{e.title}</b>
                      <small>{[e.event_time, e.location].filter(Boolean).join(' · ') || 'Details inside'}</small>
                    </span>
                    <ChevronRight size={16} className="sk-res-go" />
                  </Link>
                )
              })
            )}
          </>
        )}

        {item.id === 'home' && (
          <>
            <span className="sk-grp">Shortcuts</span>
            <button
              type="button"
              className="sk-row"
              onClick={() => {
                onClose()
                navigate('/dashboard#updates')
              }}
            >
              <span className="sk-tile">
                <Megaphone size={18} strokeWidth={1.8} />
              </span>
              <span className="sk-note-body">
                <b>Announcements</b>
                <small>Latest news from the officers</small>
              </span>
              <ChevronRight size={16} className="sk-res-go" />
            </button>
            <button type="button" className="sk-row" onClick={onOpenFaq}>
              <span className="sk-tile">
                <MessageCircle size={18} strokeWidth={1.8} />
              </span>
              <span className="sk-note-body">
                <b>Frequently asked questions</b>
                <small>Quick answers about Life Gen</small>
              </span>
              <ChevronRight size={16} className="sk-res-go" />
            </button>
            <Link to="/dashboard/profile" className="sk-row" onClick={onClose}>
              <span className="sk-tile">
                <Camera size={18} strokeWidth={1.8} />
              </span>
              <span className="sk-note-body">
                <b>My profile</b>
                <small>Photo, details and digital pass</small>
              </span>
              <ChevronRight size={16} className="sk-res-go" />
            </Link>
          </>
        )}

        {item.id === 'prayer' && (
          <div className="sk-mine">
            <span className="sk-tile is-lg">
              <Icon size={22} strokeWidth={1.7} />
            </span>
            <small>You are not alone</small>
            <b>Share a request, or pray for someone today.</b>
          </div>
        )}
      </div>
      <footer className="sk-df">
        <button type="button" className="sk-btn" onClick={open}>
          {mine?.cta || `Open ${item.label}`} <ArrowRight size={17} />
        </button>
      </footer>
    </>
  )
}

/* ---------- Menu (phone): lahat ng nasa rail, nasa isang listahan ---------- */
export function MenuPanel({ nav, activeIdx: _a, avatar, name, role, memberId, unread, theme, onToggleTheme, onGo, onSignOut, onClose }) {
  const { pathname } = useLocation()
  return (
    <>
      <Head title="Menu" sub="Life Generation Calapan" onClose={onClose} />
      <div className="sk-dscroll">
        <button type="button" className="sk-me-card" onClick={() => onGo('user')}>
          <span className="sk-me-av">{avatar}</span>
          <span className="sk-note-body">
            <b>{name}</b>
            <small>{[role, memberId].filter(Boolean).join(' · ')}</small>
          </span>
          <ChevronRight size={18} className="sk-res-go" />
        </button>

        {(nav.some((n) => n.items) ? nav.map((g) => ({ label: g.items ? g.label : 'Dashboard', list: g.items || [g] })) : [{ label: 'Pages', list: nav }]).map((g) => (
          <div key={g.label}>
            <span className="sk-grp">{g.label}</span>
            <div className="sk-list">
              {g.list.map((n) => {
                const on = n.end ? pathname === n.to || pathname === `${n.to}/overview` : pathname === n.to || pathname.startsWith(`${n.to}/`)
                return (
                  <Link to={n.to} key={n.id} className={`sk-row${on ? ' is-on' : ''}`} onClick={onClose}>
                    <span className="sk-tile">
                      <n.icon size={19} strokeWidth={1.8} />
                    </span>
                    <span className="sk-note-body">
                      <b>{n.label}</b>
                    </span>
                    <ChevronRight size={16} className="sk-res-go" />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}

        <span className="sk-grp">Tools</span>
        <div className="sk-list">
          <button type="button" className="sk-row" onClick={() => onGo('search')}>
            <span className="sk-tile">
              <Search size={19} strokeWidth={1.8} />
            </span>
            <span className="sk-note-body">
              <b>Search</b>
            </span>
            <ChevronRight size={16} className="sk-res-go" />
          </button>
          <button type="button" className="sk-row" onClick={() => onGo('bell')}>
            <span className="sk-tile">
              <Bell size={19} strokeWidth={1.8} />
            </span>
            <span className="sk-note-body">
              <b>Notifications</b>
            </span>
            {unread > 0 && <span className="sk-count">{unread}</span>}
            <ChevronRight size={16} className="sk-res-go" />
          </button>
          <button type="button" className="sk-row" onClick={onToggleTheme}>
            <span className="sk-tile">{theme === 'dark' ? <Sun size={19} strokeWidth={1.8} /> : <Moon size={19} strokeWidth={1.8} />}</span>
            <span className="sk-note-body">
              <b>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</b>
            </span>
          </button>
          <button type="button" className="sk-row is-danger" onClick={onSignOut}>
            <span className="sk-tile">
              <LogOut size={19} strokeWidth={1.8} />
            </span>
            <span className="sk-note-body">
              <b>Sign out</b>
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
