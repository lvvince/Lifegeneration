import { useEffect, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, ClipboardList, CalendarDays, UserCheck, FileText,
  Network, HeartHandshake, MessageSquare, Menu, X, Sun, Moon, LogOut,
} from 'lucide-react'
import { getUser, logout } from '../../api.js'
import { useTheme } from '../../useTheme.js'
import { initials, resolveImageUrl } from '../../lib/format.js'
import { ToastProvider, ConfirmDialog } from './ui.jsx'
import '../../styles/portal.css'

const ADMIN_NAV = [
  {
    label: 'Manage',
    items: [
      { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
      { to: '/admin/members', label: 'Members', icon: Users },
      { to: '/admin/applications', label: 'Applications', icon: ClipboardList },
      { to: '/admin/events', label: 'Events', icon: CalendarDays },
      { to: '/admin/check-in', label: 'Check-in', icon: UserCheck },
      { to: '/admin/reports', label: 'Reports', icon: FileText },
    ],
  },
  {
    label: 'Community',
    items: [
      { to: '/dgroups', label: 'D-Groups', icon: Network },
      { to: '/ministries', label: 'Ministries', icon: HeartHandshake },
      { to: '/prayer', label: 'Prayer wall', icon: MessageSquare },
    ],
  },
]

const MEMBER_NAV = [
  {
    items: [
      { to: '/dashboard', label: 'My profile', icon: LayoutDashboard, end: true },
      { to: '/events', label: 'Events', icon: CalendarDays },
      { to: '/dgroups', label: 'D-Groups', icon: Network },
      { to: '/ministries', label: 'Ministries', icon: HeartHandshake },
      { to: '/prayer', label: 'Prayer wall', icon: MessageSquare },
    ],
  },
]

function Brand() {
  return (
    <div className="p-brand">
      <img src="/logo.png" alt="" />
      <div>
        <b>Life Generation</b>
        <small>Calapan</small>
      </div>
    </div>
  )
}

export default function PortalLayout({ children }) {
  const user = getUser()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)

  const nav = user?.role === 'admin' ? ADMIN_NAV : MEMBER_NAV
  const displayName = user?.full_name || user?.username || 'Member'
  const roleLabel = user?.role === 'admin' ? 'Admin' : user?.role === 'moderator' ? 'Moderator' : 'Member'

  useEffect(() => setOpen(false), [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const signOut = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="portal">
      <ToastProvider>
        <header className="p-top">
          <button
            type="button"
            className="p-btn p-btn-quiet p-btn-icon"
            onClick={() => setOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
          <Brand />
          <button
            type="button"
            className="p-btn p-btn-quiet p-btn-icon"
            onClick={toggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </header>

        <div className={`p-scrim${open ? ' is-open' : ''}`} onClick={() => setOpen(false)} />

        <aside className={`p-side${open ? ' is-open' : ''}`} aria-label="Main navigation">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <Brand />
            {open && (
              <button
                type="button"
                className="p-btn p-btn-quiet p-btn-icon"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {nav.map((group, i) => (
            <div className="p-group" key={i}>
              {group.label && <div className="p-group-label">{group.label}</div>}
              {group.items.map(({ to, label, icon: Icon, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) => `p-link${isActive ? ' is-active' : ''}`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}

          <div className="p-side-foot">
            <div className="p-user">
              <div className="p-avatar" aria-hidden="true" style={{ overflow: 'hidden' }}>
                {user?.avatar || user?.member?.avatar ? (
                  <img
                    src={resolveImageUrl(user.avatar || user.member.avatar)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  initials(displayName)
                )}
              </div>
              <div>
                <b>{displayName}</b>
                <small>{roleLabel}</small>
              </div>
            </div>
            <button type="button" className="p-btn p-btn-quiet p-btn-block" onClick={toggle}>
              {theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button type="button" className="p-btn p-btn-quiet p-btn-block" onClick={() => setConfirmOut(true)}>
              <LogOut size={18} strokeWidth={1.75} />
              Sign out
            </button>
          </div>
        </aside>

        <main className="p-main">
          <div className="p-wrap">{children}</div>
        </main>

        {confirmOut && (
          <ConfirmDialog
            title="Sign out?"
            message="You will be returned to the login page."
            confirmLabel="Sign out"
            onConfirm={signOut}
            onCancel={() => setConfirmOut(false)}
          />
        )}
      </ToastProvider>
    </div>
  )
}
