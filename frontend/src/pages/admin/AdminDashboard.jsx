import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api.js'
import { Users, Calendar, HeartHandshake, ShieldCheck, Clock, CheckCircle2, MessageSquare, Ticket } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/admin/stats')
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Members', value: stats?.members, icon: Users, color: '#2f8f5b' },
    { label: 'Upcoming Events', value: stats?.events, icon: Calendar, color: '#2563eb' },
    { label: 'Active D-Groups', value: stats?.dgroups, icon: ShieldCheck, color: '#7c3aed' },
    { label: 'Ministries', value: stats?.ministries, icon: HeartHandshake, color: '#db2777' },
    { label: 'Pending Applications', value: stats?.pending_applications, icon: Clock, color: '#d97706' },
    { label: 'Active Prayers', value: stats?.active_prayers, icon: MessageSquare, color: '#059669' },
    { label: 'Checked-In Attendees', value: stats?.checked_in_attendees, icon: Ticket, color: '#0d9488' },
  ]

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: 6 }}>Administration Portal</h1>
        <p className="muted" style={{ margin: 0 }}>
          Central management hub for Life Generation Community. Monitor engagement, approve applications, and track attendance.
        </p>
      </div>

      {error && <div className="alert">{error}</div>}

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {statCards.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${s.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--muted)', fontWeight: 600 }}>{s.label}</span>
                <Icon size={20} color={s.color} />
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--navy)' }}>
                {loading ? '...' : (s.value ?? 0)}
              </div>
            </div>
          )
        })}
      </div>

      {/* Admin Action Modules */}
      <h2 style={{ fontSize: '1.4rem', marginBottom: 16 }}>Operational Management</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Members Management */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Users size={22} color="var(--navy)" />
              <h3 style={{ margin: 0 }}>Member Directory</h3>
            </div>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16 }}>
              View full member roster, toggle active/inactive status, update permissions and roles (user, moderator, admin).
            </p>
          </div>
          <Link to="/admin/members" className="btn" style={{ textAlign: 'center' }}>
            Open Member Directory
          </Link>
        </div>

        {/* Volunteer Applications */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <HeartHandshake size={22} color="var(--navy)" />
              <h3 style={{ margin: 0 }}>Volunteer Applications</h3>
            </div>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16 }}>
              Review ministry volunteer applications. Approving an applicant automatically connects them to the ministry.
            </p>
          </div>
          <Link to="/admin/applications" className="btn" style={{ textAlign: 'center' }}>
            Review Applications ({stats?.pending_applications ?? 0})
          </Link>
        </div>

        {/* Event Check-In Scanner */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Ticket size={22} color="var(--navy)" />
              <h3 style={{ margin: 0 }}>Event Check-In Terminal</h3>
            </div>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 16 }}>
              Rapid check-in kiosk: input or scan Member ID (e.g. LG-2026-XXXXX) to log real-time event attendance.
            </p>
          </div>
          <Link to="/admin/check-in" className="btn" style={{ textAlign: 'center' }}>
            Open Check-In Terminal
          </Link>
        </div>
      </div>
    </div>
  )
}