import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../../api.js'
import { Calendar, Clock, MapPin, Users, CheckCircle, Ticket } from 'lucide-react'

export default function Events() {
  const [events, setEvents] = useState([])
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState(null)

  const user = getUser()

  const loadEvents = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/events')
      setEvents(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvents()
  }, [])

  const handleRsvp = async (id) => {
    if (!user) return
    setProcessingId(id)
    setMsg('')
    try {
      const res = await apiPost('/api/events/rsvp', { event_id: id })
      setMsg(res.message || 'RSVP confirmed!')
      loadEvents()
    } catch (err) {
      setError(err.message || 'Failed to RSVP.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleCancelRsvp = async (id) => {
    if (!user) return
    setProcessingId(id)
    setMsg('')
    try {
      const res = await apiPost('/api/events/cancel-rsvp', { event_id: id })
      setMsg(res.message || 'RSVP cancelled.')
      loadEvents()
    } catch (err) {
      setError(err.message || 'Failed to cancel RSVP.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: 8 }}>Church Gatherings & Events</h1>
        <p className="muted" style={{ maxWidth: 620, margin: '0 auto', fontSize: '1.05rem' }}>
          Be part of the movement! Join our Sunday encounter services, youth nights, worship summits, and leadership gatherings.
        </p>
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Loading upcoming events...</p>
        </div>
      ) : events.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">No upcoming events scheduled right now. Check back soon!</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 20 }}>
          {events.map((e) => (
            <div key={e.id} className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: e.user_rsvp === 'attending' ? '2px solid #2f8f5b' : '1px solid var(--border)',
              position: 'relative'
            }}>
              <div>
                {e.checked_in === 1 ? (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: '#15803d',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20
                  }}>
                    ✓ Checked-In
                  </div>
                ) : e.user_rsvp === 'attending' ? (
                  <div style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    background: '#e3f5ea',
                    color: '#1e7a46',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '4px 10px',
                    borderRadius: 20
                  }}>
                    ✓ Attending
                  </div>
                ) : null}

                <h3 style={{ fontSize: '1.25rem', color: 'var(--navy)', marginBottom: 8, paddingRight: e.user_rsvp ? 80 : 0 }}>
                  {e.title}
                </h3>

                <p style={{ fontSize: '0.92rem', color: '#445', marginBottom: 16 }}>
                  {e.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.86rem', color: 'var(--muted)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} color="var(--navy)" />
                    <span>{e.event_date}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={15} color="var(--navy)" />
                    <span>{e.event_time}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} color="var(--navy)" />
                    <span>{e.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={15} color="var(--navy)" />
                    <span>{e.attendee_count} attending {e.capacity ? `/ ${e.capacity} capacity` : ''}</span>
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                {!user ? (
                  <Link to="/login" className="btn" style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
                    Sign In to RSVP
                  </Link>
                ) : e.user_rsvp === 'attending' ? (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleCancelRsvp(e.id)}
                      disabled={processingId === e.id}
                      style={{
                        flex: 1,
                        background: '#fff',
                        color: '#666',
                        border: '1px solid #ccc',
                        padding: '8px 12px'
                      }}
                    >
                      {processingId === e.id ? 'Cancelling...' : 'Cancel RSVP'}
                    </button>
                    <Link to={`/events/${e.id}`} className="btn" style={{ padding: '8px 14px' }}>
                      Details
                    </Link>
                  </div>
                ) : (
                  <button
                    onClick={() => handleRsvp(e.id)}
                    disabled={processingId === e.id}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <Ticket size={16} />
                    {processingId === e.id ? 'Reserving...' : 'RSVP for Event'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}