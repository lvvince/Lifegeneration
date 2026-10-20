import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api.js'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    apiGet('/api/stats').then(setStats).catch((e) => setError(e.message))
  }, [])

  const items = [
    { label: 'Members', value: stats?.members },
    { label: 'Pending approval', value: stats?.pending },
    { label: 'Events', value: stats?.events },
  ]

  return (
    <>
      <h2>Admin Dashboard</h2>
      {error && <div className="alert">{error}</div>}

      <div className="dash-grid">
        {items.map((s) => (
          <div className="card dash-card stat-card" key={s.label}>
            <p className="muted">{s.label}</p>
            <div className="stat-value">
              {error ? '-' : s.value ?? '...'}
            </div>
          </div>
        ))}
      </div>

      <h3 className="dash-section">Manage</h3>
      <div className="dash-grid">
        <div className="card dash-card">
          <h3>Members</h3>
          <p className="muted">View the roster, approve or reject registrations.</p>
          <Link to="/admin/members" className="dash-btn">Manage members</Link>
        </div>
      </div>
    </>
  )
}