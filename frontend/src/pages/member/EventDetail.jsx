import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../../api.js'
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, CheckCircle } from 'lucide-react'
import { FacebookIcon } from '../../components/Footer.jsx'
import { shareEventOnFacebook } from '../../utils/share.js'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(false)

  const user = getUser()

  const loadEvent = async () => {
    try {
      setLoading(true)
      const data = await apiGet(`/api/events/${id}`)
      setEvent(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEvent()
  }, [id])

  const handleRsvp = async () => {
    if (!user) return
    setRsvpLoading(true)
    setMsg('')
    try {
      const res = await apiPost('/api/events/rsvp', { event_id: id })
      setMsg(res.message || 'RSVP Confirmed!')
      loadEvent()
    } catch (err) {
      setError(err.message || 'Failed to RSVP.')
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleCancelRsvp = async () => {
    if (!user) return
    setRsvpLoading(true)
    setMsg('')
    try {
      const res = await apiPost('/api/events/cancel-rsvp', { event_id: id })
      setMsg(res.message || 'RSVP Cancelled.')
      loadEvent()
    } catch (err) {
      setError(err.message || 'Failed to cancel RSVP.')
    } finally {
      setRsvpLoading(false)
    }
  }

  if (loading) return <div className="card"><p className="muted">Loading event details...</p></div>
  if (error) return <div className="card"><div className="alert">{error}</div><Link to="/events">&larr; Back to events</Link></div>
  if (!event) return null

  return (
    <div style={{ maxWidth: 720, margin: '0 auto' }}>
      <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to all events
      </Link>

      {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}

      <div className="card">
        {event.checked_in === 1 && (
          <div style={{
            background: '#15803d',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 12px',
            borderRadius: 20,
            fontSize: '0.8rem',
            fontWeight: 700,
            marginBottom: 12
          }}>
            ✓ Checked-In at Venue
          </div>
        )}

        <h1 style={{ fontSize: '2rem', marginBottom: 12 }}>{event.title}</h1>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          padding: '16px',
          background: 'rgba(47,143,91,0.06)',
          borderRadius: 12,
          margin: '16px 0 24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Calendar size={18} color="var(--navy)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Date</div>
              <div style={{ fontWeight: 600 }}>{event.event_date}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="var(--navy)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Time</div>
              <div style={{ fontWeight: 600 }}>{event.event_time}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <MapPin size={18} color="var(--navy)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Location</div>
              <div style={{ fontWeight: 600 }}>{event.location}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={18} color="var(--navy)" />
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase' }}>Capacity</div>
              <div style={{ fontWeight: 600 }}>{event.capacity ? `${event.capacity} seats` : 'Open'}</div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#334', marginBottom: 28 }}>
          {event.description}
        </div>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}>
          <div>
            {!user ? (
              <Link to="/login" className="btn" style={{ padding: '10px 24px' }}>
                Sign In to RSVP
              </Link>
            ) : event.user_rsvp === 'attending' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ color: '#1e7a46', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle size={20} /> You're registered for this event!
                </div>
                <button
                  onClick={handleCancelRsvp}
                  disabled={rsvpLoading}
                  style={{ background: '#fff', color: '#666', border: '1px solid #ccc', padding: '6px 14px', borderRadius: 8, cursor: 'pointer' }}
                >
                  {rsvpLoading ? 'Updating...' : 'Cancel RSVP'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleRsvp}
                disabled={rsvpLoading}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 24px' }}
              >
                <Ticket size={18} />
                {rsvpLoading ? 'Reserving...' : 'RSVP for Event'}
              </button>
            )}
          </div>

          {/* Facebook Share Button */}
          <button
            type="button"
            onClick={() => shareEventOnFacebook(event.id, event.title)}
            style={{
              background: '#1877F2',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '10px 18px',
              fontSize: '0.88rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 14px rgba(24, 119, 242, 0.3)',
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <FacebookIcon size={16} color="#fff" /> Share on Facebook
          </button>
        </div>
      </div>
    </div>
  )
}
