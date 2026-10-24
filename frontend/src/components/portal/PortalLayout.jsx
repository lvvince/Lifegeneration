import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, ClipboardList, CalendarDays, UserCheck, FileText, Network,
  HeartHandshake, MessageSquare, Megaphone, Menu, Search, Bell, Sun, Moon, LogOut, User, ChevronRight,
} from 'lucide-react'
import { getUser, logout } from '../../api.js'
import { useTheme } from '../../useTheme.js'
import { initials, resolveImageUrl } from '../../lib/format.js'
import { on } from '../../lib/bus.js'
import { ToastProvider, ConfirmDialog, useToast } from './ui.jsx'
import AnnouncementPopup from './AnnouncementPopup.jsx'
import MemberShell from './MemberShell.jsx'
import { Sheet, useFeed, NotificationsPanel, SearchPanel, ProfileMenu } from './panels.jsx'
import '../../styles/portal.css'
import '../../styles/portal2.css'
import '../../styles/pages.css'
import '../../styles/member.css'
import '../../styles/favor.css' // admin skin
import '../../styles/sky.css' // member skin (.lgx lang) — laging huli para ito ang masunod

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
  { to: '/prayer', label: 'Prayer wall', short: 'Prayer', icon: MessageSquare },
]

const MEMBER_NAV = [
  { to: '/dashboard', label: 'Overview', short: 'Home', icon: LayoutDashboard, end: true },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/dgroups', label: 'D-Groups', icon: Network },
  { to: '/ministries', label: 'Ministries', icon: HeartHandshake },
  { to: '/prayer', label: 'Prayer wall', short: 'Prayer', icon: MessageSquare },
]

// Bawal i-copy ang text sa portal (maliban sa inputs)
const blockCopy = (e) => {
  if (!e.target.closest?.('input, textarea, [contenteditable="true"]')) e.preventDefault()
}

function Logo({ className }) {
  const [bad, setBad] = useState(false)
  return bad ? (
    <span className={className}>LG</span>
  ) : (
    <img className={className} src="/logo.png" alt="" draggable="false" onError={() => setBad(true)} />
  )
}

function Avatar({ user, name }) {
  const src = user?.avatar || user?.member?.avatar
  return (
    <span className="mp-avatar" aria-hidden="true">
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
  const isAdmin = user?.role === 'admin'
  const feed = useFeed(!isAdmin)
  const [panel, setPanel] = useState(null) // 'search' | 'bell' | 'user' | 'more'
  const [confirmOut, setConfirmOut] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const nav = isAdmin ? ADMIN_NAV : MEMBER_NAV
  const dock = isAdmin ? nav.slice(0, 4) : nav
  const more = isAdmin ? nav.slice(4) : []
  const name = user?.full_name || user?.username || 'Member'
  const role = isAdmin ? 'Admin' : user?.role === 'moderator' ? 'Moderator' : 'Member'
  const current = [...nav].reverse().find((n) => pathname === n.to || pathname.startsWith(n.to + '/'))
  const crumb = pathname.startsWith('/dashboard/profile') ? 'My profile' : current?.label || 'Life Generation'
  const close = () => setPanel(null)

  /* ---- mga event ---- */
  useEffect(() => {
    setPanel(null)
    window.scrollTo({ top: 0 })
  }, [pathname])

  useEffect(() => {
    const onKey = (e) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable
      if (e.key === 'Escape') setPanel(null)
      else if ((e.key === '/' && !typing) || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k')) {
        e.preventDefault()
        setPanel('search')
      }
    }
    const onScroll = () => setScrolled(window.scrollY > 6)
    const onOffline = () => toast('You are offline. Some actions will not work.', 'bad')
    const onOnline = () => toast('You are back online.')
    onScroll()
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('offline', onOffline)
    window.addEventListener('online', onOnline)
    const off = on('portal:open', setPanel) // emit('portal:open', 'search') kahit saang page
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('offline', onOffline)
      window.removeEventListener('online', onOnline)
      off()
    }
  }, [toast])

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const avatar = <Avatar user={user} name={name} />

  return (
    <>
      {/* ===== sidebar (laptop/desktop) ===== */}
      <aside className="mp-side" aria-label="Main navigation">
        <Link to={isAdmin ? '/admin' : '/dashboard'} className="mp-brand">
          <Logo className="mp-logo" />
          <span>
            Life <b>Generation</b>
          </span>
        </Link>
        <nav className="mp-links">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `mp-link${isActive ? ' is-active' : ''}`}>
              <Icon size={20} strokeWidth={1.9} />
              {label}
            </NavLink>
          ))}
        </nav>
        <button type="button" className="mp-me-btn" onClick={() => setPanel('user')} aria-label="Account menu">
          {avatar}
          <span>
            <b>{name}</b>
            <small>{role}</small>
          </span>
          <ChevronRight size={17} />
        </button>
      </aside>

      <div className="mp-body">
        {/* ===== top bar ===== */}
        <header className={`mp-top${scrolled ? ' is-scrolled' : ''}`}>
          <Link to={isAdmin ? '/admin' : '/dashboard'} className="mp-brand-m" aria-label="Home">
            <Logo className="mp-logo" />
          </Link>
          <div className="mp-title">
            <small>Life Generation</small>
            <b>{crumb}</b>
          </div>

          <button type="button" className="mp-search" onClick={() => setPanel('search')} aria-label="Search">
            <Search size={18} />
            <span>Search…</span>
            <kbd>/</kbd>
          </button>

          <button type="button" className="mp-ib" onClick={() => setPanel(panel === 'bell' ? null : 'bell')} aria-label={`Notifications${feed.unread ? `, ${feed.unread} unread` : ''}`}>
            <Bell size={20} strokeWidth={1.9} />
            {feed.unread > 0 && <i className="mp-badge">{feed.unread > 9 ? '9+' : feed.unread}</i>}
          </button>

          <button type="button" className="mp-ib mp-ib-avatar" onClick={() => setPanel(panel === 'user' ? null : 'user')} aria-label="Account menu">
            {avatar}
          </button>
        </header>

        <main className="mp-main">
          <div className="mp-page" key={pathname}>
            {children}
          </div>
        </main>
      </div>

      <AnnouncementPopup />

      {/* ===== bottom nav (phone/tablet) ===== */}
      <nav className="mp-dock" aria-label="Main navigation">
        {dock.map(({ to, label, short, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) => `mp-dock-item${isActive ? ' is-active' : ''}`}>
            <span className="mp-dock-ico">
              <Icon size={21} strokeWidth={1.9} />
            </span>
            <span>{short || label}</span>
          </NavLink>
        ))}
        {more.length > 0 && (
          <button type="button" className={`mp-dock-item${panel === 'more' ? ' is-active' : ''}`} onClick={() => setPanel(panel === 'more' ? null : 'more')}>
            <span className="mp-dock-ico">
              <Menu size={21} strokeWidth={1.9} />
            </span>
            <span>More</span>
          </button>
        )}
      </nav>

      {/* ===== sheets ===== */}
      {panel === 'bell' && (
        <Sheet label="Notifications" kind="pop" onClose={close}>
          <NotificationsPanel feed={feed} onClose={close} />
        </Sheet>
      )}
      {panel === 'search' && (
        <Sheet label="Search" kind="search" onClose={close}>
          <SearchPanel nav={nav} user={user} onClose={close} />
        </Sheet>
      )}
      {panel === 'user' && (
        <Sheet label="Account" kind="pop" onClose={close}>
          <ProfileMenu
            avatar={avatar}
            name={name}
            role={role}
            email={user?.email}
            theme={theme}
            onToggleTheme={toggle}
            onSignOut={() => (close(), setConfirmOut(true))}
            onClose={close}
          />
        </Sheet>
      )}
      {panel === 'more' && (
        <Sheet label="More" kind="more" onClose={close}>
          <div className="mp-grid">
            {more.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to} className="mp-tile" onClick={close}>
                <span className="mp-note-ico">
                  <Icon size={21} strokeWidth={1.8} />
                </span>
                {label}
              </Link>
            ))}
            <Link to="/dashboard/profile" className="mp-tile" onClick={close}>
              <span className="mp-note-ico">
                <User size={21} strokeWidth={1.8} />
              </span>
              My profile
            </Link>
            <button type="button" className="mp-tile" onClick={toggle}>
              <span className="mp-note-ico">{theme === 'dark' ? <Sun size={21} /> : <Moon size={21} />}</span>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
            <button type="button" className="mp-tile" onClick={() => (close(), setConfirmOut(true))}>
              <span className="mp-note-ico">
                <LogOut size={21} />
              </span>
              Sign out
            </button>
          </div>
        </Sheet>
      )}

      {confirmOut && (
        <ConfirmDialog title="Sign out?" message="You will be returned to the login page." confirmLabel="Sign out" onConfirm={signOut} onCancel={() => setConfirmOut(false)} />
      )}
    </>
  )
}

function AdminLayout({ children }) {
  return (
    <div
      className="portal px mp"
      onCopy={blockCopy}
      onCut={blockCopy}
      onContextMenu={(e) => e.target.closest?.('input, textarea') || e.target.tagName !== 'IMG' || e.preventDefault()}
      onDragStart={(e) => e.target.tagName === 'IMG' && e.preventDefault()}
    >
      <ToastProvider>
        <Shell>{children}</Shell>
      </ToastProvider>
    </div>
  )
}

/* Member -> bagong layout (icon rail + sidebar). Admin -> dating layout, walang nagbago. */
export default function PortalLayout({ children }) {
  const isAdmin = getUser()?.role === 'admin'
  return isAdmin ? <AdminLayout>{children}</AdminLayout> : <MemberShell>{children}</MemberShell>
}
