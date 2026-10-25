// frontend/src/pages/officer/OfficerLayout.jsx
import { NavLink, Outlet, Navigate, useNavigate } from 'react-router-dom'
import { getUser, logout } from '../../api.js'

const links = [
  { to: '/officer', label: 'Dashboard', end: true },
  { to: '/officer/registrations', label: 'Registrations' },
  { to: '/officer/members', label: 'Members' },
  { to: '/officer/events', label: 'Events' },
  { to: '/officer/attendance', label: 'Attendance' },
  { to: '/officer/announcements', label: 'Announcements' },
  { to: '/officer/reports', label: 'Reports' },
]

export default function OfficerLayout() {
  const user = getUser()
  const navigate = useNavigate()

  // Officers at admins lang ang pwedeng pumasok dito
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== 'officer' && user.role !== 'admin') return <Navigate to="/" replace />

  const doLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">Life Generation</div>
        <nav>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) => (isActive ? 'active' : '')}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main">
        <header className="topbar">
          <span>Officer Portal</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <strong>{user.full_name || user.username}</strong>
            <button type="button" className="ghost" onClick={doLogout}>
              Logout
            </button>
          </div>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}