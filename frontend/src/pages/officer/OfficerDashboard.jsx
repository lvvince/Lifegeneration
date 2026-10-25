// frontend/src/pages/officer/OfficerDashboard.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../../api.js'

/*
  GET  /api/officer/dashboard
  POST /api/officer/registrations/review  { id, status: 'approved' | 'rejected' }
  Lahat ng section ay optional. Lalabas lang kung may data na ibinalik ang backend.
*/

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,'
}

const parseDate = (d) => {
  const x = new Date(String(d || '').replace(' ', 'T'))
  return isNaN(x) ? null : x
}
const fmtDate = (d) => {
  const x = parseDate(d)
  return x ? x.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : d || '—'
}

const QUICK = [
  { to: '/officer/applications', title: 'Applications', desc: 'Approve or reject ministry applications' },
  { to: '/officer/attendance', title: 'Attendance', desc: 'Scan QR and record who attended' },
  { to: '/events', title: 'Events', desc: 'View upcoming events' },
  { to: '/dgroups', title: 'D-Groups', desc: 'Browse discipleship groups' },
]

export default function OfficerDashboard() {
  const user = getUser()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const load = async () => {
    try {
      setData(await apiGet('/api/officer/dashboard'))
      setError('')
    } catch (e) {
      setData(null)
      setError(e.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  const review = async (r, status) => {
    if (status === 'rejected' && !window.confirm(`Reject registration of ${r.full_name}?`)) return
    setBusyId(r.id)
    try {
      await apiPost('/api/officer/registrations/review', { id: r.id, status })
      await load()
    } catch (e) {
      setError(e.message || 'Failed to update registration')
    } finally {
      setBusyId(null)
    }
  }

  const name = user?.full_name || user?.username || 'Officer'
  const s = data?.stats || {}
  const pending = data?.pending || []
  const events = data?.events || []
  const trend = data?.trend || []
  const absent = data?.absent || []
  const announcements = data?.announcements || []
  const maxPresent = Math.max(1, ...trend.map((t) => Number(t.present) || 0))

  const stats = [
    ['Total Members', s.members, ''],
    ['Pending', s.pending, ''],
    ['Upcoming Events', s.upcoming_events, ''],
    ['Attendance This Month', s.attendance_rate, '%'],
  ]

  return (
    <>
      <div className="p-head">
        <div>
          <h1 className="p-title">{greeting()} {name}</h1>
          <p className="p-desc">Here's what needs your attention today.</p>
        </div>
        <div className="p-actions">
          <Link to="/officer/applications" className="p-btn p-btn-primary">
            Review applications{Number(s.pending) > 0 ? ` (${s.pending})` : ''}
          </Link>
          <Link to="/officer/attendance" className="p-btn p-btn-secondary">Take attendance</Link>
        </div>
      </div>

      {loading && (
        <div className="p-inline" style={{ marginBottom: 16 }}>
          <span className="p-spin" /> <span className="p-muted">Loading...</span>
        </div>
      )}

      {error && (
        <div className="p-banner warn" style={{ marginBottom: 16 }}>
          <div>
            <strong>Dashboard data is not available yet.</strong>
            <div>{error}</div>
            <div className="p-hint" style={{ color: 'inherit', opacity: 0.8 }}>
              Ang backend route na <code>/api/officer/dashboard</code> ay kailangan pang idagdag.
              Gumagana pa rin ang mga link sa ibaba.
            </div>
          </div>
        </div>
      )}

      {data && (
        <>
          <div className="p-stats">
            {stats.map(([label, value, suffix]) => (
              <div className="p-stat" key={label}>
                <span>{label}</span>
                <strong>{value ?? 0}{suffix}</strong>
              </div>
            ))}
          </div>

          {pending.length > 0 && (
            <div className="p-panel">
              <div className="p-panel-head">
                <h2 className="p-h2">Pending Registrations</h2>
                <Link to="/officer/applications" className="p-btn p-btn-quiet p-btn-sm">View all</Link>
              </div>
              <div className="p-table-wrap">
                <table className="p-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Submitted</th><th></th></tr>
                  </thead>
                  <tbody>
                    {pending.map((r) => (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 600 }}>{r.full_name}</td>
                        <td className="p-muted">{r.email}</td>
                        <td className="p-muted">{fmtDate(r.created_at)}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          <button type="button" className="p-btn p-btn-primary p-btn-sm" disabled={busyId === r.id} onClick={() => review(r, 'approved')}>Approve</button>{' '}
                          <button type="button" className="p-btn p-btn-danger p-btn-sm" disabled={busyId === r.id} onClick={() => review(r, 'rejected')}>Reject</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="p-panel">
              <div className="p-panel-head">
                <h2 className="p-h2">Upcoming Events</h2>
                <Link to="/events" className="p-btn p-btn-quiet p-btn-sm">View all</Link>
              </div>
              {events.map((e) => (
                <div className="p-row" key={e.id}>
                  <div className="p-row-main">
                    <div className="p-row-title">{e.title}</div>
                    <div className="p-row-sub">{fmtDate(e.event_date)}</div>
                  </div>
                  <span className="p-badge">{e.signups ?? 0} signed up</span>
                </div>
              ))}
            </div>
          )}

          {(trend.length > 0 || absent.length > 0) && (
            <div className="p-grid-2" style={{ marginTop: 16 }}>
              <div className="p-panel">
                <div className="p-panel-head"><h2 className="p-h2">Attendance (last events)</h2></div>
                <div className="p-panel-body">
                  {trend.length === 0 ? (
                    <p className="p-muted">No attendance recorded yet.</p>
                  ) : (
                    trend.map((t, i) => (
                      <div className="p-barrow" key={i}>
                        <span className="p-muted" title={t.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                        <div className="p-bar">
                          <i style={{ width: `${Math.round(((Number(t.present) || 0) / maxPresent) * 100)}%` }} />
                        </div>
                        <strong className="p-num">{t.present}</strong>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="p-panel">
                <div className="p-panel-head"><h2 className="p-h2">Needs follow-up</h2></div>
                {absent.length === 0 ? (
                  <div className="p-panel-body"><p className="p-muted">Nobody has missed 3 events in a row.</p></div>
                ) : (
                  absent.map((a) => (
                    <div className="p-row" key={a.member_id}>
                      <div className="p-row-main p-row-title">{a.full_name}</div>
                      <span className="p-badge warn">missed {a.missed}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {announcements.length > 0 && (
            <div className="p-panel">
              <div className="p-panel-head"><h2 className="p-h2">Recent Announcements</h2></div>
              {announcements.map((a) => (
                <div className="p-row" key={a.id}>
                  <div className="p-row-main">
                    <div className="p-row-title">{a.title}</div>
                    <div className="p-row-sub">{fmtDate(a.created_at)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <div className="p-panel">
        <div className="p-panel-head"><h2 className="p-h2">Quick Links</h2></div>
        {QUICK.map((q) => (
          <Link key={q.to} to={q.to} className="p-row" style={{ textDecoration: 'none' }}>
            <div className="p-row-main">
              <div className="p-row-title">{q.title}</div>
              <div className="p-row-sub">{q.desc}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  )
}