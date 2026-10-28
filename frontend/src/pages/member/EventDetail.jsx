import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../../api.js'
import { Calendar, Clock, MapPin, Users, Ticket, ArrowLeft, CheckCircle, Navigation, Copy, Check, ExternalLink } from 'lucide-react'
import { FacebookIcon } from '../../components/Footer.jsx'
import { shareEventOnFacebook } from '../../utils/share.js'
import { resolveImageUrl } from '../../lib/format.js'
import AddToCalendarButton from '../../components/AddToCalendarButton.jsx'
import { getGoogleMapEmbedUrl, getGoogleMapsDirectionsUrl, isOnlineOnly } from '../../utils/maps.js'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(true)
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [copied, setCopied] = useState(false)

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

  const handleCopyLocation = () => {
    if (!event?.location) return
    navigator.clipboard.writeText(event.location)
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

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

  const embedUrl = getGoogleMapEmbedUrl(event.location, event.map_url)
  const directionsUrl = getGoogleMapsDirectionsUrl(event.location, event.map_url)
  const online = isOnlineOnly(event.location)

  return (
    <div style={{ maxWidth: 740, margin: '0 auto', paddingBottom: 40 }}>
      <Link to="/events" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <ArrowLeft size={16} /> Back to all events
      </Link>

      {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}

      <div className="card">
        {event.banner_image && (
          <div style={{ width: '100%', maxHeight: 320, borderRadius: 14, overflow: 'hidden', marginBottom: 20, border: '1px solid var(--border)' }}>
            <img src={resolveImageUrl(event.banner_image)} alt={event.title} style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }} />
          </div>
        )}
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
            <CheckCircle size={14} /> Checked in at venue
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

        <div style={{ fontSize: '1.05rem', lineHeight: 1.7, color: '#334', marginBottom: 24, whiteSpace: 'pre-wrap' }}>
          {event.description}
        </div>

        {/* Venue & Google Maps Integration Section */}
        {event.location && (
          <div style={{
            margin: '28px 0',
            border: '1px solid var(--border)',
            borderRadius: 16,
            background: 'var(--surface, #ffffff)',
            overflow: 'hidden',
            boxShadow: '0 4px 18px rgba(0,0,0,0.03)'
          }}>
            {/* Header bar */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
              background: 'rgba(249, 115, 22, 0.04)'
            }}>
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: '1.08rem',
                  fontWeight: 700,
                  color: 'var(--text-1, #0f172a)'
                }}>
                  <MapPin size={19} color="#f97316" />
                  <span>Venue & Location</span>
                </div>
                <div style={{ fontSize: '0.92rem', color: 'var(--muted, #64748b)', marginTop: 4, fontWeight: 500 }}>
                  {event.location}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleCopyLocation}
                  style={{
                    background: '#fff',
                    color: '#475569',
                    border: '1px solid var(--border, #cbd5e1)',
                    borderRadius: 8,
                    padding: '8px 14px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.2s',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                  }}
                  title="Copy venue address"
                >
                  {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                  {copied ? 'Copied!' : 'Copy Address'}
                </button>

                {!online && (
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      background: '#ea580c',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '8px 16px',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 7,
                      boxShadow: '0 2px 10px rgba(234, 88, 12, 0.25)',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#c2410c')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#ea580c')}
                  >
                    <Navigation size={14} /> Get Directions in Google Maps
                  </a>
                )}
              </div>
            </div>

            {/* Google Maps Embed iframe */}
            {embedUrl && !online ? (
              <div>
                <div style={{ position: 'relative', width: '100%', height: 320, background: '#f1f5f9' }}>
                  <iframe
                    title={`Google Map for ${event.title}`}
                    src={embedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0, display: 'block' }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div style={{
                  padding: '9px 16px',
                  background: 'rgba(0,0,0,0.02)',
                  borderTop: '1px solid var(--border)',
                  fontSize: '0.78rem',
                  color: 'var(--muted, #64748b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 8
                }}>
                  <span>Interactive Google Map view for Life Generation attendees</span>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#ea580c',
                      textDecoration: 'none',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    Open full map <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ) : online ? (
              <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--muted, #64748b)' }}>
                <p style={{ margin: 0, fontWeight: 500, fontSize: '0.92rem' }}>
                  This is a virtual / online gathering. The meeting link will be shared with all registered members.
                </p>
              </div>
            ) : null}
          </div>
        )}


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

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Google Calendar Button */}
            <AddToCalendarButton event={event} label="Add to Google Calendar" />

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
    </div>
  )
}
