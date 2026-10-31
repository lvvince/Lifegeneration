import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Users, ClipboardList, CalendarDays, UserCheck, HandCoins, TrendingUp, MessageSquare, ArrowUpRight,
  CheckCircle2, AlertTriangle, Megaphone,
} from 'lucide-react'
import { apiGet, apiPost, getUser } from '../../api.js'
import { fmtDate, fmtCurrency } from '../../lib/format.js'
import { PageHeader, Empty, Loading, useToast } from '../../components/portal/ui.jsx'
import '../../styles/officer-overview.css'

/*
  GET  /api/officer/dashboard
  POST /api/officer/registrations/review  { id, status: 'approved' | 'rejected' }
  GET  /api/reports/predictive            (next-event forecast)
  Same layout language as the admin overview (ao-* classes), so both portals feel like one product.
*/
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
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

  const s = data?.stats || {}
  const g = data?.donations || {}
  const pending = data?.pending || []
  const events = (data?.events || []).slice(0, 4)
  const trend = data?.trend || []
  const absent = data?.absent || []
  const recent = g.recent || []
  const maxPresent = Math.max(1, ...trend.map((t) => Number(t.present) || 0))
  const nPending = Number(s.pending) || 0
  const nDon = Number(s.pending_donations) || 0
  const name = (user?.full_name || user?.username || 'Officer').split(' ')[0]
  const day = (d) => fmtDate(d, { day: 'numeric' })
  const mon = (d) => fmtDate(d, { month: 'short' })

  const tiles = [
    { label: 'Members', value: s.members, to: '/officer/members', Icon: Users },
    { label: 'Pending sign-ups', value: s.pending, to: '/officer/applications', Icon: ClipboardList },
    { label: 'Upcoming events', value: s.upcoming_events, to: '/events', Icon: CalendarDays },
    { label: 'Attendance', value: `${s.attendance_rate ?? 0}%`, to: '/officer/attendance', Icon: UserCheck },
    { label: 'Gifts to verify', value: s.pending_donations, to: '/officer/donations', Icon: HandCoins },
    { label: 'Given this month', value: `₱${Number(g.month_total || 0).toLocaleString('en-PH', { maximumFractionDigits: 0 })}`, to: '/officer/donations', Icon: TrendingUp, money: true },
  ]

  return (
    <div className="ao">
      <PageHeader
        title="Overview"
        desc={`${greeting()}, ${name}. Here is what needs your attention today.`}
        actions={<Link to="/officer/attendance" className="p-btn p-btn-primary"><UserCheck size={16} /> Take attendance</Link>}
      />

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="ao-tiles">
        {tiles.map(({ label, value, to, Icon, money }, i) => (
          <Link to={to} className="ao-tile" key={label} style={{ '--i': i }}>
            <span className="ao-ico"><Icon size={18} /></span>
            <b style={money ? { fontSize: 'clamp(1.2rem, 2.2vw, 1.7rem)' } : undefined}>{loading ? '–' : value ?? 0}</b>
            <small>{label}</small>
            <ArrowUpRight size={16} className="ao-go" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="ao-cols">
        <section className="ao-card">
          <div className="ao-head">
            <h2>Next events</h2>
            <Link to="/events">View all</Link>
          </div>
          {loading ? (
            <Loading rows={3} />
          ) : events.length === 0 ? (
            <Empty icon={CalendarDays} title="No upcoming events" desc="Events created by admins show up here." />
          ) : (
            <ul className="ao-events">
              {events.map((e) => (
                <li key={e.id}>
                  <Link to="/events" className="ao-ev">
                    <span className="ao-date"><b>{day(e.event_date)}</b><small>{mon(e.event_date)}</small></span>
                    <span className="ao-ev-main">
                      <strong>{e.title}</strong>
                      <em>{fmtDate(e.event_date)}</em>
                    </span>
                    <span className="ao-count"><b>{e.signups ?? 0}</b><small>signed up</small></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {next && (
            <Link to="/officer/insights" className="ao-todo" style={{ marginTop: 10 }}>
              <span className="ao-ico"><TrendingUp size={18} /></span>
              <span className="ao-todo-main">
                <strong>About {next.expected} expected at {next.title}</strong>
                <em>{next.rsvps} signed up for {fmtDate(next.event_date)}. See all insights.</em>
              </span>
              <ArrowUpRight size={16} className="ao-go" />
            </Link>
          )}
        </section>

        <section className="ao-card">
          <div className="ao-head"><h2>Needs your attention</h2></div>
          <Link to="/officer/applications" className={`ao-todo${nPending ? ' is-hot' : ''}`}>
            <span className="ao-ico"><ClipboardList size={18} /></span>
            <span className="ao-todo-main">
              <strong>Applications</strong>
              <em>{nPending === 0 ? 'All caught up.' : `${nPending} waiting for a decision`}</em>
            </span>
            {nPending > 0 ? <span className="ao-pill">{nPending}</span> : <ArrowUpRight size={16} className="ao-go" />}
          </Link>
          <Link to="/officer/donations" className={`ao-todo${nDon ? ' is-hot' : ''}`}>
            <span className="ao-ico"><HandCoins size={18} /></span>
            <span className="ao-todo-main">
              <strong>Verify donations</strong>
              <em>{nDon === 0 ? 'Nothing pending.' : `${fmtCurrency(g.pending_amount)} to verify`}</em>
            </span>
            {nDon > 0 ? <span className="ao-pill">{nDon}</span> : <ArrowUpRight size={16} className="ao-go" />}
          </Link>
          <Link to="/officer/insights" className={`ao-todo${absent.length ? ' is-hot' : ''}`}>
            <span className="ao-ico"><AlertTriangle size={18} /></span>
            <span className="ao-todo-main">
              <strong>Needs follow-up</strong>
              <em>{absent.length === 0 ? 'Nobody has missed 3 events in a row.' : absent.slice(0, 2).map((a) => a.full_name).join(', ') + (absent.length > 2 ? ` and ${absent.length - 2} more` : '')}</em>
            </span>
            {absent.length > 0 ? <span className="ao-pill">{absent.length}</span> : <ArrowUpRight size={16} className="ao-go" />}
          </Link>
          <div className="ao-quick">
            <Link to="/chat"><MessageSquare size={18} /><span>Chat</span></Link>
            <Link to="/officer/attendance"><UserCheck size={18} /><span>Check-in</span></Link>
            <Link to="/officer/insights"><TrendingUp size={18} /><span>Insights</span></Link>
            <Link to="/chat"><Megaphone size={18} /><span>Announce</span></Link>
          </div>
          <p className="ao-note">Announcements are posted in Fellowship Chat, in the announcements room.</p>
        </section>
      </div>

      {pending.length > 0 && (
        <section className="ao-card" style={{ marginTop: 16 }}>
          <div className="ao-head">
            <h2>Pending registrations</h2>
            <Link to="/officer/applications">View all</Link>
          </div>
          <div className="p-table-wrap" style={{ border: 0 }}>
            <table className="p-table">
              <thead><tr><th>Name</th><th>Email</th><th>Submitted</th><th></th></tr></thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={`${r.id}-${r.email}`}>
                    <td style={{ fontWeight: 700 }}>{r.full_name}</td>
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
        </section>
      )}

      <div className="ao-cols" style={{ marginTop: 16 }}>
        <section className="ao-card">
          <div className="ao-head"><h2>Attendance, last events</h2></div>
          {trend.length === 0 ? (
            <p className="ao-note">No attendance recorded yet.</p>
          ) : (
            <div className="p-panel-body">
              {trend.map((t) => (
                <div className="p-barrow" key={t.id}>
                  <span className="p-muted" title={t.title} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</span>
                  <div className="p-bar"><i style={{ width: `${Math.round(((Number(t.present) || 0) / maxPresent) * 100)}%` }} /></div>
                  <strong className="p-num">{t.present}</strong>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="ao-card">
          <div className="ao-head">
            <h2>Recent giving</h2>
            <Link to="/officer/donations">Open</Link>
          </div>
          {recent.length === 0 ? (
            <p className="ao-note">No gifts yet.</p>
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
        </section>
      </div>
    </div>
  )
}
