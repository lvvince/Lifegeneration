import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../api.js'
import { ArrowLeft, Ticket, CheckCircle2, Search, UserCheck } from 'lucide-react'

export default function AdminCheckIn() {
  const [events, setEvents] = useState([])
  const [selectedEventId, setSelectedEventId] = useState('')
  const [memberInput, setMemberInput] = useState('')
  const [attendees, setAttendees] = useState([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [successResult, setSuccessResult] = useState(null)

  // Load events
  useEffect(() => {
    apiGet('/api/events').then((evs) => {
      if (Array.isArray(evs) && evs.length > 0) {
        setEvents(evs)
        setSelectedEventId(String(evs[0].id))
      }
    })
  }, [])

  // Load attendees whenever selected event changes
  const loadAttendees = async (eventId) => {
    if (!eventId) return
    try {
      setLoading(true)
      const data = await apiGet(`/api/events/${eventId}/attendees`)
      setAttendees(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedEventId) {
      loadAttendees(selectedEventId)
    }
  }, [selectedEventId])

  const handleCheckIn = async (e) => {
    e.preventDefault()
    if (!memberInput.trim() || !selectedEventId) return

    setSubmitting(true)
    setError('')
    setSuccessResult(null)

    try {
      const res = await apiPost('/api/events/check-in', {
        event_id: selectedEventId,
        member_id: memberInput.trim()
      })

      setSuccessResult(res)
      setMemberInput('')
      loadAttendees(selectedEventId)
    } catch (err) {
      setError(err.message || 'Check-in failed. Please verify Member ID.')
    } finally {
      setSubmitting(false)
    }
  }

  const selectedEvent = events.find((e) => String(e.id) === String(selectedEventId))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to Admin
        </Link>
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Event Check-In Terminal</h1>
      <p className="muted" style={{ marginBottom: 24 }}>
        Scan or enter a member's unique Member ID (e.g. <code>LG-2026-ADMIN</code>) to immediately log their presence.
      </p>

      {/* Check-In Controls Card */}
      <div className="card" style={{ padding: 24, marginBottom: 24, borderTop: '4px solid var(--navy)' }}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="event-select">Select Church Gathering / Event</label>
          <select
            id="event-select"
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--border)' }}
          >
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} &bull; {e.event_date} ({e.event_time})
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleCheckIn} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <label htmlFor="member-code">Scan / Enter Member ID, Email, or Username</label>
            <input
              id="member-code"
              placeholder="e.g. LG-2026-ADMIN or danielle"
              value={memberInput}
              onChange={(e) => setMemberInput(e.target.value)}
              style={{ width: '100%', fontFamily: 'monospace', fontWeight: 600 }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button
              type="submit"
              disabled={submitting || !memberInput.trim()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '11px 22px'
              }}
            >
              <UserCheck size={18} />
              {submitting ? 'Checking In...' : 'Confirm Check-In'}
            </button>
          </div>
        </form>

        {error && <div className="alert" style={{ marginTop: 16 }}>{error}</div>}

        {successResult && (
          <div style={{
            marginTop: 16,
            padding: 16,
            background: '#e3f5ea',
            borderRadius: 12,
            border: '1px solid #c2ebcf',
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <CheckCircle2 size={32} color="#15803d" />
            <div>
              <div style={{ fontWeight: 800, color: '#166534', fontSize: '1.1rem' }}>
                {successResult.message}
              </div>
              {successResult.member && (
                <div style={{ fontSize: '0.85rem', color: '#14532d', marginTop: 2 }}>
                  Member ID: <strong>{successResult.member.member_id}</strong> &bull; {successResult.member.email}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Real-time Attendees List */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0 }}>
            Attendance Roster for {selectedEvent?.title || 'Selected Event'}
          </h3>
          <span style={{
            background: 'rgba(47,143,91,0.1)',
            color: 'var(--navy)',
            padding: '4px 10px',
            borderRadius: 14,
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {attendees.filter(a => a.checked_in == 1).length} / {attendees.length} Checked In
          </span>
        </div>

        {loading ? (
          <p className="muted">Loading attendees...</p>
        ) : attendees.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>No RSVPs or check-ins recorded for this event yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'rgba(47,143,91,0.06)', borderBottom: '1px solid var(--border)' }}>
                  <th style={{ padding: '10px 14px' }}>Member ID</th>
                  <th style={{ padding: '10px 14px' }}>Name</th>
                  <th style={{ padding: '10px 14px' }}>Email</th>
                  <th style={{ padding: '10px 14px' }}>Check-In Status</th>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace', fontWeight: 700 }}>
                      {a.member_id}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                      {a.member_name}
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--muted)' }}>
                      {a.email}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {a.checked_in == 1 ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: 12, fontSize: '0.78rem', fontWeight: 700 }}>
                          ✓ Present
                        </span>
                      ) : (
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '3px 8px', borderRadius: 12, fontSize: '0.78rem' }}>
                          RSVP Pending Arrival
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {a.checked_in_at ? new Date(a.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
