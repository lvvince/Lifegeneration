import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, XCircle, Clock, Ban, Flame, CalendarCheck, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api.js'
import { fmtDate, fmtDateTime } from '../../lib/format.js'
import '../../styles/insights.css'

const ST = {
  attended: { label: 'Attended', icon: CheckCircle2 },
  missed: { label: 'Missed', icon: XCircle },
  upcoming: { label: 'Upcoming', icon: Clock },
  cancelled: { label: 'Cancelled', icon: Ban },
}
const FILTERS = [
  ['all', 'All'],
  ['attended', 'Attended'],
  ['missed', 'Missed'],
]
const PAGE = 6

/* Kasaysayan ng events na dinaluhan ng member.
   endpoint: '/api/me/attendance' (sarili) o '/api/members/{user_id}/attendance' (staff). */
export default function AttendanceHistory({ endpoint, linkEvents = true }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [shown, setShown] = useState(PAGE)

  useEffect(() => {
    let alive = true
    setData(null)
    setError('')
    apiGet(endpoint)
      .then((d) => alive && setData(d))
      .catch((e) => alive && setError(e.message || 'Could not load attendance.'))
    return () => { alive = false }
  }, [endpoint])

  const rows = useMemo(() => {
    const list = data?.history || []
    return filter === 'all' ? list : list.filter((r) => r.status === filter)
  }, [data, filter])

  if (error) return <p className="ah-msg is-bad">{error}</p>
  if (!data) return <div className="ah-skel" aria-busy="true" aria-label="Loading attendance" />

  const s = data.summary
  return (
    <div className="ah">
      <dl className="ah-sum">
        <div><dt>Attended</dt><dd>{s.attended}</dd></div>
        <div><dt>Missed</dt><dd>{s.missed}</dd></div>
        <div><dt>Show-up rate</dt><dd>{s.rate}%</dd></div>
        <div><dt>Streak</dt><dd><Flame size={16} strokeWidth={2} aria-hidden="true" /> {s.streak}</dd></div>
      </dl>

      <div className="ah-filters" role="group" aria-label="Filter history">
        {FILTERS.map(([v, l]) => (
          <button key={v} type="button" className={`ah-chip${filter === v ? ' is-on' : ''}`} aria-pressed={filter === v} onClick={() => { setFilter(v); setShown(PAGE) }}>
            {l}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="ah-msg">
          <CalendarCheck size={18} aria-hidden="true" />
          {data.history.length === 0 ? 'No events yet. Attended events will be listed here after check-in.' : 'Nothing matches this filter.'}
        </p>
      ) : (
        <ol className="ah-list">
          {rows.slice(0, shown).map((r) => {
            const st = ST[r.status] || ST.upcoming
            const Icon = st.icon
            const Title = linkEvents ? Link : 'span'
            return (
              <li key={r.event_id} className={`ah-item is-${r.status}`}>
                <span className="ah-ico"><Icon size={18} strokeWidth={2} aria-hidden="true" /></span>
                <div className="ah-main">
                  <Title {...(linkEvents ? { to: `/events/${r.event_id}` } : {})} className="ah-title">{r.title}</Title>
                  <small>
                    {fmtDate(r.event_date)}
                    {r.location && <> <MapPin size={12} aria-hidden="true" /> {r.location}</>}
                  </small>
                  {r.status === 'attended' && r.checked_in_at && <small>Checked in {fmtDateTime(r.checked_in_at)}</small>}
                </div>
                <span className="ah-st">{st.label}</span>
              </li>
            )
          })}
        </ol>
      )}

      {rows.length > shown && (
        <button type="button" className="ah-more" onClick={() => setShown((n) => n + PAGE)}>
          Show more ({rows.length - shown})
        </button>
      )}
    </div>
  )
}
