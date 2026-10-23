import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, ClipboardList, CalendarDays, UserCheck, FileText, Network,
  HeartHandshake, MessageSquare, Megaphone, Menu, Search, Bell, Sun, Moon, LogOut, User, X,
} from 'lucide-react'
import { getUser, logout } from '../../api.js'
import { useTheme } from '../../useTheme.js'
import { initials, resolveImageUrl } from '../../lib/format.js'
import { ToastProvider, ConfirmDialog, useToast } from './ui.jsx'
import { useAnnouncements, AnnouncementList } from './announcements.jsx'
import AnnouncementBanner from '../AnnouncementBanner.jsx'
import '../../styles/portal.css'
import '../../styles/portal2.css'

const ADMIN_NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/members', label: 'Members', icon: Users },
  { to: '/admin/applications', label: 'Applications', icon: ClipboardList },
  { to: '/admin/events', label: 'Events', icon: CalendarDays },
  { to: '/admin/check-in', label: 'Check-in', icon: UserCheck },
  { to: '/admin/reports', label: 'Reports', icon: FileText },
  { to: '/admin/dgroups', label: 'D-Groups', icon: Network },
  { to: '/admin/ministries', label: 'Ministries', icon: HeartHandshake },
  { to: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { to: '/prayer', label: 'Prayer wall', icon: MessageSquare },
]

const MEMBER_NAV = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/dgroups', label: 'D-Groups', icon: Network },
  { to: '/ministries', label: 'Ministries', icon: HeartHandshake },
  { to: '/prayer', label: 'Prayer wall', icon: MessageSquare },
]

// Hindi pwedeng i-copy ang text (maliban sa mga input)
const blockCopy = (e) => {
  if (!e.target.closest?.('input, textarea, [contenteditable="true"]')) e.preventDefault()
}

function Avatar({ user, name }) {
  const src = user?.avatar || user?.member?.avatar
  return (
    <span className="px-avatar" aria-hidden="true">
      {src ? <img src={resolveImageUrl(src)} alt="" draggable="false" /> : initials(name)}
    </span>
  )
}

function Shell({ children }) {
  const user = getUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const toast = useToast()
  const ann = useAnnouncements()
  const [panel, setPanel] = useState(null) // 'bell' | 'user' | 'more' | 'search'
  const [confirmOut, setConfirmOut] = useState(false)
  const [q, setQ] = useState('')
  const [sel, setSel] = useState(0)

  const nav = user?.role === 'admin' ? ADMIN_NAV : MEMBER_NAV
  const name = user?.full_name || user?.username || 'Member'
  const role = user?.role === 'admin' ? 'Admin' : user?.role === 'moderator' ? 'Moderator' : 'Member'
  const current = [...nav].reverse().find((n) => pathname === n.to || pathname.startsWith(n.to + '/'))
  const crumb = pathname.startsWith('/dashboard/profile') ? 'My profile' : current?.label || 'Life Generation'

  /* ---- mga event ng browser ---- */
  useEffect(() => setPanel(null), [pathname])

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if (e.key === 'Escape') setPanel(null)
      else if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setPanel('search')
      }
    }
    const onOffline = () => toast('You are offline. Some actions will not work.', 'bad')
    const onOnline = () => toast('You are back online.')
    window.addEventListener('keydown', onKey)
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
    }
  }, [toast])

  /* ---- search ---- */
  const results = useMemo(() => {
    const term = q.trim().toLowerCase()
    const pages = nav.map((n) => ({ key: n.to, label: n.label, hint: 'Page', icon: n.icon, to: n.to }))
    const extra = user ? [{ key: 'profile', label: 'My profile', hint: 'Page', icon: User, to: '/dashboard/profile' }] : []
    const news = ann.items.map((a) => ({ key: `a${a.id}`, label: a.title, hint: 'Announcement', icon: Megaphone, to: a.link_url?.startsWith('/') ? a.link_url : pathname }))
    return [...pages, ...extra, ...news].filter((r) => !term || r.label.toLowerCase().includes(term)).slice(0, 8)
  }, [q, nav, ann.items, user, pathname])

  const go = (r) => {
    setPanel(null)
    setQ('')
    navigate(r.to)
  }
  const onSearchKey = (e) => {
    if (e.key === 'ArrowDown') (e.preventDefault(), setSel((s) => Math.min(s + 1, results.length - 1)))
    if (e.key === 'ArrowUp') (e.preventDefault(), setSel((s) => Math.max(s - 1, 0)))
    if (e.key === 'Enter' && results[sel]) go(results[sel])
  }

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const dockItems = nav.slice(0, 4)
  const openBell = () => {
    setPanel(panel === 'bell' ? null : 'bell')
    if (panel !== 'bell') setTimeout(ann.markAllSeen, 1200)
  }

  return (
    <>
      {/* ===== rail (desktop) ===== */}
      <aside className="px-rail" aria-label="Main navigation">
        <Link to={user?.role === 'admin' ? '/admin' : '/dashboard'} className="px-logo" aria-label="Life Generation">
          <img src="/logo.png" alt="" draggable="false" />
        </Link>
        <div className="px-nav">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} data-tip={label} aria-label={label} className={({ isActive }) => `px-ico${isActive ? ' is-active' : ''}`}>
              <Icon size={20} strokeWidth={1.7} />
            </NavLink>
          ))}
        </div>
        <button type="button" className="px-ico" data-tip={theme === 'dark' ? 'Light mode' : 'Dark mode'} aria-label="Toggle theme" onClick={toggle}>
          {theme === 'dark' ? <Sun size={20} strokeWidth={1.7} /> : <Moon size={20} strokeWidth={1.7} />}
        </button>
      </aside>

      <div className="px-body">
        {/* ===== top bar ===== */}
        <header className="px-top">
          <Link to="/" className="px-mobile-brand" aria-label="Home">
            <img src="/logo.png" alt="" draggable="false" />
          </Link>
          <div className="px-crumb">
            <small>Life Generation</small>
            <b>{crumb}</b>
          </div>

          <button type="button" className="px-searchbtn" onClick={() => setPanel('search')} aria-label="Search">
            <Search size={17} />
            <span>Search pages…</span>
            <kbd>/</kbd>
          </button>

          <div className="px-anchor">
            <button type="button" className="px-neo-btn" onClick={openBell} aria-label={`Announcements${ann.unread ? `, ${ann.unread} new` : ''}`}>
              <Bell size={19} strokeWidth={1.8} />
              {ann.unread > 0 && <i className="px-badge">{ann.unread > 9 ? '9+' : ann.unread}</i>}
            </button>
            {panel === 'bell' && (
              <div className="px-pop" role="dialog" aria-label="Announcements">
                <div className="px-pop-head">
                  <b>Announcements</b>
                  <button type="button" className="p-btn p-btn-quiet p-btn-sm" onClick={ann.markAllSeen}>Mark all read</button>
                </div>
                <div className="px-pop-body">
                  {ann.items.length === 0 ? <p className="px-empty">No announcements yet.</p> : <AnnouncementList items={ann.items} seen={ann.seen} limit={6} />}
                </div>
              </div>
            )}
          </div>

          <div className="px-anchor">
            <button type="button" className="px-avatar-btn" onClick={() => setPanel(panel === 'user' ? null : 'user')} aria-label="Account menu">
              <Avatar user={user} name={name} />
            </button>
            {panel === 'user' && (
              <div className="px-pop px-pop-sm" role="menu">
                <div className="px-user">
                  <Avatar user={user} name={name} />
                  <div>
                    <b>{name}</b>
                    <small>{role}</small>
                  </div>
                </div>
                <Link to="/dashboard/profile" className="px-menu-item" role="menuitem"><User size={17} /> My profile</Link>
                <button type="button" className="px-menu-item" role="menuitem" onClick={toggle}>
                  {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />} {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button type="button" className="px-menu-item is-danger" role="menuitem" onClick={() => (setPanel(null), setConfirmOut(true))}>
                  <LogOut size={17} /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        {(panel === 'bell' || panel === 'user') && <div className="px-scrim" onClick={() => setPanel(null)} />}

        <main className="px-main p-main">
          <AnnouncementBanner />
          <div className="px-page" key={pathname}>{children}</div>
        </main>
      </div>

      {/* ===== dock (phone) ===== */}
      <div className="px-dock" role="navigation" aria-label="Main navigation">
        {dockItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `px-dock-item${isActive ? ' is-active' : ''}`}>
            <Icon size={21} strokeWidth={1.8} />
            <span>{label}</span>
          </NavLink>
        ))}
        <button type="button" className={`px-dock-item${panel === 'more' ? ' is-active' : ''}`} onClick={() => setPanel(panel === 'more' ? null : 'more')}>
          <Menu size={21} strokeWidth={1.8} />
          <span>More</span>
        </button>
      </div>

      {panel === 'more' && (
        <>
          <div className="px-scrim px-scrim-dark" onClick={() => setPanel(null)} />
          <div className="px-sheet" role="dialog" aria-label="More">
            <div className="px-sheet-grid">
              {nav.slice(4).concat(user ? [{ to: '/dashboard/profile', label: 'My profile', icon: User }] : []).map(({ to, label, icon: Icon }) => (
                <Link key={to} to={to} className="px-sheet-item">
                  <span className="neo-tile"><Icon size={20} strokeWidth={1.7} /></span>
                  {label}
                </Link>
              ))}
              <button type="button" className="px-sheet-item" onClick={toggle}>
                <span className="neo-tile">{theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}</span>
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
              <button type="button" className="px-sheet-item" onClick={() => (setPanel(null), setConfirmOut(true))}>
                <span className="neo-tile"><LogOut size={20} /></span>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ===== search ===== */}
      {panel === 'search' && (
        <div className="p-overlay px-search-wrap" onMouseDown={(e) => e.target === e.currentTarget && setPanel(null)}>
          <div className="px-search" role="dialog" aria-label="Search">
            <div className="px-search-input">
              <Search size={18} />
              <input autoFocus value={q} onChange={(e) => (setQ(e.target.value), setSel(0))} onKeyDown={onSearchKey} placeholder="Search pages and announcements" />
              <button type="button" className="p-btn p-btn-quiet p-btn-icon" onClick={() => setPanel(null)} aria-label="Close"><X size={17} /></button>
            </div>
            <div className="px-results">
              {results.length === 0 && <p className="px-empty">Nothing found.</p>}
              {results.map((r, i) => (
                <button type="button" key={r.key} className={`px-result${i === sel ? ' is-sel' : ''}`} onMouseEnter={() => setSel(i)} onClick={() => go(r)}>
                  <span className="neo-tile"><r.icon size={17} /></span>
                  <span>{r.label}</span>
                  <small>{r.hint}</small>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {confirmOut && (
        <ConfirmDialog title="Sign out?" message="You will be returned to the login page." confirmLabel="Sign out" onConfirm={signOut} onCancel={() => setConfirmOut(false)} />
      )}
    </>
  )
}

export default function PortalLayout({ children }) {
  return (
    <div className="portal px" onCopy={blockCopy} onCut={blockCopy} onDragStart={(e) => e.target.tagName === 'IMG' && e.preventDefault()}>
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </div>
  )
}
