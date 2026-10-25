import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Users, ClipboardList, UserCheck, CalendarDays } from 'lucide-react'
import { apiGet, getUser } from '../../api.js'
import '../../styles/officer.css'

const LINKS = [
  { to: '/officer', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/officer/members', label: 'Members', icon: Users },
  { to: '/officer/applications', label: 'Applications', icon: ClipboardList },
  { to: '/officer/attendance', label: 'Attendance', icon: UserCheck },
  { to: '/events', label: 'Events', icon: CalendarDays },
]

export default function OfficerSideLayout() {
  const user = getUser()
  const [stats, setStats] = useState(null)
  const name = user?.full_name || user?.username || 'Officer'

  useEffect(() => {
    let alive = true
    apiGet('/api/officer/dashboard')
      .then((d) => alive && setStats(d?.stats || null))
      .catch(() => {})
    return () => { alive = false }
  }, [])

  return (
    <div className="of-wrap">
      <aside className="of-side" aria-label="Officer dashboard">
        <div className="of-user">
          <span className="of-avatar">{name.trim().charAt(0).toUpperCase()}</span>
          <div>
            <b>{name}</b>
            <small>Officer</small>
          </div>
        </div>

        <nav className="of-nav">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `of-link${isActive ? ' is-active' : ''}`}>
              <Icon size={18} strokeWidth={1.9} />
              <span>{label}</span>
              {to === '/officer/applications' && Number(stats?.pending) > 0 && (
                <i className="of-badge">{stats.pending}</i>
              )}
            </NavLink>
          ))}
        </nav>

        {stats && (
          <div className="of-stats">
            <div><strong>{stats.members ?? 0}</strong><span>Members</span></div>
            <div><strong>{stats.pending ?? 0}</strong><span>Pending</span></div>
            <div><strong>{stats.upcoming_events ?? 0}</strong><span>Events</span></div>
            <div><strong>{stats.attendance_rate ?? 0}%</strong><span>Attendance</span></div>
          </div>
        )}
      </aside>

      <section className="of-content">
        <Outlet />
      </section>
    </div>
  )
}