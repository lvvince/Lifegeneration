import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet } from '../../api.js'

function formatDate(value) {
  if (!value) return 'Date to be announced'
  // MySQL "YYYY-MM-DD HH:MM:SS" -> ISO para ma-parse ng lahat ng browser
  const d = new Date(String(value).replace(' ', 'T'))
  if (isNaN(d)) return value
  return d.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function Events() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/events')
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="muted">Loading events...</p>
  if (error) return <div className="alert">{error}</div>

  return (
    <>
      <h2>Upcoming Events</h2>

      {events.length === 0 && (
        <p className="muted">No upcoming events yet. Check back soon.</p>
      )}

      <div className="dash-grid">
        {events.map((e) => (
          <div className="card dash-card" key={e.id}>
            <h3>{e.title}</h3>
            <p className="event-meta">{formatDate(e.start_at)}</p>
            <p className="muted">{e.venue || 'Venue to be announced'}</p>
            <Link to={`/events/${e.id}`} className="dash-btn">View details</Link>
          </div>
        ))}
      </div>
    </>
  )
}