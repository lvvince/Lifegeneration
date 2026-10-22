import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus, UserCheck, FileText } from 'lucide-react'
import { apiGet } from '../../api.js'
import { fmtDate, isUpcoming } from '../../lib/format.js'
import { PageHeader, Stats, Empty, Loading } from '../../components/portal/ui.jsx'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

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

  return (
    <>
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

      <Stats
        loading={loading}
        items={[
          { label: 'Active members', value: stats?.members },
          { label: 'Upcoming events', value: stats?.events },
          { label: 'D-Groups', value: stats?.dgroups },
          { label: 'Ministries', value: stats?.ministries },
          { label: 'Active prayers', value: stats?.active_prayers },
          { label: 'Total check-ins', value: stats?.checked_in_attendees },
        ]}
      />

      <div className="p-grid-2">
        <section className="p-panel">
          <div className="p-panel-head">
            <h2 className="p-h2">Next events</h2>
            <Link to="/admin/events" style={{ fontSize: 13 }}>View all</Link>
          </div>
          {loading ? (
            <Loading rows={3} />
          ) : nextEvents.length === 0 ? (
            <Empty
              icon={CalendarDays}
              title="No upcoming events"
              desc="Create an event so members can sign up."
            />
          ) : (
            nextEvents.map((e) => (
              <div className="p-row" key={e.id}>
                <div className="p-row-main">
                  <div className="p-row-title">{e.title}</div>
                  <div className="p-row-sub">
                    {fmtDate(e.event_date)}
                    {e.event_time ? ` · ${e.event_time}` : ''}
                  </div>
                </div>
                <div className="p-num p-muted" style={{ fontSize: 13 }}>
                  {e.attendee_count}
                  {e.capacity ? ` / ${e.capacity}` : ''} signed up
                </div>
              </div>
            ))
          )}
        </section>

        <section className="p-panel">
          <div className="p-panel-head">
            <h2 className="p-h2">Needs your attention</h2>
          </div>
          <div className="p-row">
            <div className="p-row-main">
              <div className="p-row-title">Ministry applications</div>
              <div className="p-row-sub">
                {pending === 0 ? 'Nothing waiting for review.' : `${pending} waiting for review.`}
              </div>
            </div>
            <Link to="/admin/applications" className="p-btn p-btn-secondary p-btn-sm">
              Review
            </Link>
          </div>
          <div className="p-row">
            <div className="p-row-main">
              <div className="p-row-title">Check-in</div>
              <div className="p-row-sub">Log attendance on the day of an event.</div>
            </div>
            <Link to="/admin/check-in" className="p-btn p-btn-secondary p-btn-sm">
              <UserCheck size={14} /> Open
            </Link>
          </div>
          <div className="p-row">
            <div className="p-row-main">
              <div className="p-row-title">Reports</div>
              <div className="p-row-sub">Attendance and member numbers, with CSV export.</div>
            </div>
            <Link to="/admin/reports" className="p-btn p-btn-secondary p-btn-sm">
              <FileText size={14} /> Open
            </Link>
          </div>
        </section>
      </div>
    </>
  )
}
