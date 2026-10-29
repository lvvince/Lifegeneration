import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus, UserCheck, FileText, Mail, Users, Network, HeartHandshake, MessageCircleHeart, ClipboardList, Megaphone, ArrowUpRight, HandCoins, MessageSquare } from 'lucide-react'
import { apiGet, apiPost, getUser } from '../../api.js'
import { fmtDate, fmtCurrency, isUpcoming } from '../../lib/format.js'
import { PageHeader, Empty, Loading, useToast } from '../../components/portal/ui.jsx'

export default function AdminDashboard() {
  const toast = useToast()
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    Promise.all([apiGet('/api/admin/stats'), apiGet('/api/events')])
      .then(([s, e]) => {
        setStats(s)
        setEvents(Array.isArray(e) ? e : [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const nextEvents = events.filter((e) => isUpcoming(e.event_date)).slice(0, 4)
  const pending = stats?.pending_applications ?? 0

  async function handleTestEmail() {
    const user = getUser()
    const targetEmail = prompt('Enter recipient email for Gmail SMTP test:', user?.email || 'admin@lifegeneration.org')
    if (!targetEmail || !targetEmail.trim()) return

    setSendingTest(true)
    try {
      const res = await apiPost('/api/admin/test-email', { email: targetEmail.trim() })
      if (!res.success) {
        toast(res.message || 'SMTP delivery failed. Check your Gmail credentials.', 'bad')
      } else if (res.simulated) {
        toast('Logged in simulation mode! Check runtime/logs/email.log', 'ok')
      } else {
        toast('Test email sent successfully via Gmail SMTP!', 'ok')
      }
    } catch (e) {
      toast(e.message || 'SMTP test failed', 'bad')
    } finally {
      setSendingTest(false)
    }
  }

  const tiles = [
    { label: 'Active members', value: stats?.members, to: '/admin/members', Icon: Users },
    { label: 'Upcoming events', value: stats?.events, to: '/admin/events', Icon: CalendarDays },
    { label: 'D-Groups', value: stats?.dgroups, to: '/admin/dgroups', Icon: Network },
    { label: 'Ministries', value: stats?.ministries, to: '/admin/ministries', Icon: HeartHandshake },
    { label: 'Active prayers', value: stats?.active_prayers, to: '/prayer', Icon: MessageCircleHeart },
    { label: 'Check-ins', value: stats?.checked_in_attendees, to: '/admin/check-in', Icon: UserCheck },
    { label: 'Donations', value: stats?.donations_total ? fmtCurrency(stats.donations_total) : '₱0', to: '/admin/donations', Icon: HandCoins },
  ]
  const day = (d) => fmtDate(d, { day: 'numeric' })
  const mon = (d) => fmtDate(d, { month: 'short' })

  return (
    <div className="ao">
      <PageHeader
        title="Overview"
        desc="What is happening in Life Generation Calapan right now."
        actions={
          <Link to="/admin/events?new=1" className="p-btn p-btn-primary">
            <Plus size={16} /> New event
          </Link>
        }
      />

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="ao-tiles">
        {tiles.map(({ label, value, to, Icon }, i) => (
          <Link to={to} className="ao-tile" key={label} style={{ '--i': i }}>
            <span className="ao-ico"><Icon size={18} /></span>
            <b>{loading ? '–' : value ?? 0}</b>
            <small>{label}</small>
            <ArrowUpRight size={16} className="ao-go" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="ao-cols">
        <section className="ao-card">
          <div className="ao-head">
            <h2>Next events</h2>
            <Link to="/admin/events">View all</Link>
          </div>
          {loading ? (
            <Loading rows={3} />
          ) : nextEvents.length === 0 ? (
            <Empty icon={CalendarDays} title="No upcoming events" desc="Create an event so members can sign up." />
          ) : (
            <ul className="ao-events">
              {nextEvents.map((e) => {
                const n = Number(e.attendee_count) || 0
                const cap = Number(e.capacity) || 0
                const pct = cap ? Math.min(100, Math.round((n / cap) * 100)) : 0
                return (
                  <li key={e.id}>
                    <Link to={`/admin/events`} className="ao-ev">
                      <span className="ao-date"><b>{day(e.event_date)}</b><small>{mon(e.event_date)}</small></span>
                      <span className="ao-ev-main">
                        <strong>{e.title}</strong>
                        <em>{e.event_time || 'Time to be set'}</em>
                        {cap > 0 && <i className="ao-bar" aria-hidden="true"><u style={{ width: `${pct}%` }} /></i>}
                      </span>
                      <span className="ao-count">
                        <b>{n}</b>
                        <small>{cap ? `of ${cap}` : 'signed up'}</small>
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="ao-card">
          <div className="ao-head">
            <h2>Needs your attention</h2>
          </div>
          <Link to="/admin/applications" className={`ao-todo${pending ? ' is-hot' : ''}`}>
            <span className="ao-ico"><ClipboardList size={18} /></span>
            <span className="ao-todo-main">
              <strong>Ministry applications</strong>
              <em>{pending === 0 ? 'All caught up.' : `${pending} waiting for review`}</em>
            </span>
            {pending > 0 ? <span className="ao-pill">{pending}</span> : <ArrowUpRight size={16} className="ao-go" />}
          </Link>
          <div className="ao-quick">
            <Link to="/chat"><MessageSquare size={18} /><span>Chat</span></Link>
            <Link to="/admin/check-in"><UserCheck size={18} /><span>Check-in</span></Link>
            <Link to="/admin/reports"><FileText size={18} /><span>Reports</span></Link>
            <Link to="/admin/announcements"><Megaphone size={18} /><span>Announce</span></Link>
            <button type="button" onClick={handleTestEmail} disabled={sendingTest}>
              <Mail size={18} /><span>{sendingTest ? 'Sending…' : 'Test email'}</span>
            </button>
          </div>
          <p className="ao-note">Test email sends a sample RSVP / D-Group acceptance message through Gmail SMTP.</p>
        </section>
      </div>
    </div>
  )
}
