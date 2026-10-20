import { Link } from 'react-router-dom'
import { getUser } from '../../api.js'

const cards = [
  { title: 'My Profile', text: 'View and update your member information.', to: '/dashboard/profile', action: 'Open profile' },
  { title: 'Upcoming Events', text: 'See events you can join.', to: '/events', action: 'Browse events' },
  { title: 'My Attendance', text: 'Your attendance history will appear here.', to: '/dashboard/attendance', action: 'View attendance' },
]

export default function Dashboard() {
  const user = getUser()
  const name = user?.full_name || user?.username || 'Member'

  return (
    <div className="container">
      <h1>Welcome, {name}</h1>
      <p className="muted">Member dashboard yung ibang information ay sa next checking pa!.</p>

      <div className="dash-grid">
        {cards.map((c) => (
          <div className="card dash-card" key={c.title}>
            <h3>{c.title}</h3>
            <p className="muted">{c.text}</p>
            <Link to={c.to} className="dash-btn">{c.action}</Link>
          </div>
        ))}
      </div>
    </div>
  )
}