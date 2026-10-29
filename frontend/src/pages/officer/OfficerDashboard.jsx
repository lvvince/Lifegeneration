// frontend/src/pages/officer/OfficerDashboard.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardCheck, HandCoins, UserCheck, ArrowRight, TrendingUp, CheckCircle2 } from 'lucide-react'
import { apiGet, apiPost, getUser } from '../../api.js'
import { fmtDate, fmtCurrency } from '../../lib/format.js'
import { useToast } from '../../components/portal/ui.jsx'

/*
  GET  /api/officer/dashboard
  POST /api/officer/registrations/review  { id, status: 'approved' | 'rejected' }
  GET  /api/reports/predictive            (para sa maliit na forecast card)
*/

const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,'
}

export default function OfficerDashboard() {
  const user = getUser()
  const toast = useToast()
  const [data, setData] = useState(null)
  const [next, setNext] = useState(null)
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
  useEffect(() => {
    load()
    apiGet('/api/reports/predictive').then((d) => setNext(d?.upcoming?.[0] || null)).catch(() => {})
  }, [])

  const review = async (r, status) => {
    if (status === 'rejected' && !window.confirm(`Reject registration of ${r.full_name}?`)) return
    setBusyId(r.id)
    try {
      await apiPost('/api/officer/registrations/review', { id: r.id, status })
      toast(status === 'approved' ? `${r.full_name} approved.` : `${r.full_name} rejected.`)
      await load()
    } catch (e) {
      toast(e.message || 'Failed to update registration', 'bad')
    } finally {
      setBusyId(null)
    }
  }

  const name = user?.full_name || user?.username || 'Officer'
  const s = data?.stats || {}
  const g = data?.donations || {}
  const pending = data?.pending || []
  const events = data?.events || []
  const trend = data?.trend || []
  const absent = data?.absent || []
  const recent = g.recent || []
  const maxPresent = Math.max(1, ...trend.map((t) => Number(t.present) || 0))
  const nPending = Number(s.pending) || 0
  const nDon = Number(s.pending_donations) || 0

  const stats = [
    ['Total members', s.members, ''],
    ['Pending sign-ups', s.pending, ''],
    ['Upcoming events', s.upcoming_events, ''],
    ['Attendance this month', s.attendance_rate, '%'],
  ]

  return (
    <>
      <div className="p-head">
        <div>
          <h1 className="p-title">{greeting()} {name}</h1>
          <p className="p-desc">Here is what needs your attention today.</p>
        </div>
      </div>

      {loading && (
        <div className="p-inline" style={{ marginBottom: 16 }}>
          <span className="p-spin" /> <span className="p-muted">Loading…</span>
        </div>
      )}

      {error && (
        <div className="p-banner warn" style={{ marginBottom: 16 }}>
          <div>
            <strong>Dashboard data is not available.</strong>
            <div>{error}</div>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* todo: ang mga kailangang gawin muna */}
          <div className="ov-todo">
            <Link to="/officer/applications" className={`ov-task${nPending ? ' is-hot' : ''}`}>
              <span className="ov-task-ico"><ClipboardCheck size={22} aria-hidden="true" /></span>
              <span><b>Review applications</b><small>{nPending ? 'Waiting for a decision' : 'All clear'}</small></span>
              <span className="ov-task-n">{nPending}</span>
            </Link>
            <Link to="/officer/donations" className={`ov-task${nDon ? ' is-hot' : ''}`}>
              <span className="ov-task-ico"><HandCoins size={22} aria-hidden="true" /></span>
              <span><b>Verify donations</b><small>{nDon ? `${fmtCurrency(g.pending_amount)} to verify` : 'Nothing pending'}</small></span>
              <span className="ov-task-n">{nDon}</span>
            </Link>
            <Link to="/officer/attendance" className="ov-task">
              <span className="ov-task-ico"><UserCheck size={22} aria-hidden="true" /></span>
              <span><b>Take attendance</b><small>Scan member QR passes</small></span>
              <ArrowRight size={20} aria-hidden="true" />
            </Link>
          </div>

          <div className="p-stats">
            {stats.map(([label, value, suffix]) => (
              <div className="p-stat" key={label}>
                <span>{label}</span>
                <strong>{value ?? 0}{suffix}</strong>
              </div>
            ))}
          </div>

          {next && (
            <Link to="/officer/insights" className="ov-fc" style={{ textDecoration: 'none', color: 'inherit' }}>
              <span>
                <b>Forecast: about {next.expected} expected at {next.title}</b>
                <small>{next.rsvps} signed up on {fmtDate(next.event_date)}. See all insights.</small>
              </span>
              <TrendingUp size={22} aria-hidden="true" />
            </Link>
          )}

          {pending.length > 0 && (
            <div className="p-panel">
              <div className="p-panel-head">
                <h2 className="p-h2">Pending registrations</h2>
                <Link to="/officer/applications" className="p-btn p-btn-quiet p-btn-sm">View all</Link>
              </div>
              <div className="p-table-wrap">
                <table className="p-table">
                  <thead>
                    <tr><th>Name</th><th>Email</th><th>Submitted</th><th></th></tr>
                  </thead>
                  <tbody>
                    {pending.map((r) => (
                      <tr key={`${r.id}-${r.email}`}>
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

          <div className="p-grid-2" style={{ marginTop: 16 }}>
            <div className="p-panel">
              <div className="p-panel-head">
                <h2 className="p-h2">Giving this month</h2>
                <Link to="/officer/donations" className="p-btn p-btn-quiet p-btn-sm">Open</Link>
              </div>
              <div className="ov-give">
                <div><small>Verified</small><strong>{fmtCurrency(g.month_total)}</strong></div>
                <div><small>Waiting</small><strong>{fmtCurrency(g.pending_amount)}</strong></div>
              </div>
              {recent.length === 0 ? (
                <div className="p-panel-body"><p className="p-muted">No gifts yet.</p></div>
              ) : (
                recent.map((d) => (
                  <div className="p-row" key={d.id}>
                    <div className="p-row-main">
                      <div className="p-row-title">{d.donor_name || 'Anonymous'} · {fmtCurrency(d.amount)}</div>
                      <div className="p-row-sub">{d.tracking_code} · {fmtDate(d.created_at)}</div>
                    </div>
                    <span className={`p-badge ${d.status === 'verified' ? 'ok' : d.status === 'rejected' ? 'bad' : 'warn'}`}>
                      {d.status === 'verified' && <CheckCircle2 size={12} aria-hidden="true" />} {d.status}
                    </span>
                  </div>
                ))
              )}
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

          <div className="p-grid-2" style={{ marginTop: 16 }}>
            <div className="p-panel">
              <div className="p-panel-head"><h2 className="p-h2">Attendance, last events</h2></div>
              <div className="p-panel-body">
                {trend.length === 0 ? (
                  <p className="p-muted">No attendance recorded yet.</p>
                ) : (
                  trend.map((t) => (
                    <div className="p-barrow" key={t.id}>
                      <span className="p-muted" title={t.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                      <div className="p-bar"><i style={{ width: `${Math.round(((Number(t.present) || 0) / maxPresent) * 100)}%` }} /></div>
                      <strong className="p-num">{t.present}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-panel">
              <div className="p-panel-head">
                <h2 className="p-h2">Upcoming events</h2>
                <Link to="/events" className="p-btn p-btn-quiet p-btn-sm">View all</Link>
              </div>
              {events.length === 0 ? (
                <div className="p-panel-body"><p className="p-muted">No upcoming events.</p></div>
              ) : (
                events.map((e) => (
                  <div className="p-row" key={e.id}>
                    <div className="p-row-main">
                      <div className="p-row-title">{e.title}</div>
                      <div className="p-row-sub">{fmtDate(e.event_date)}</div>
                    </div>
                    <span className="p-badge">{e.signups ?? 0} signed up</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </>
  )
}
