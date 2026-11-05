import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, CalendarPlus, Clock, MapPin, Users, Ticket, Check } from 'lucide-react'
import { apiGet, apiPost, getUser } from '../../api.js'
import { isUpcoming, parseDate, resolveImageUrl } from '../../lib/format.js'
import ShareEventModal from '../../components/ShareEventModal.jsx'
import { addToGoogleCalendar } from '../../utils/calendar.js'
import { getGoogleMapsDirectionsUrl } from '../../utils/maps.js'
import { useToast } from '../../components/portal/ui.jsx'
import '../../styles/pages.css'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export default function Events() {
  const user = getUser()
  const toast = useToast()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busyId, setBusyId] = useState(null)
  const [tab, setTab] = useState('upcoming')
  const [shareEvent, setShareEvent] = useState(null)

  const load = () =>
    apiGet('/api/events')
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  async function act(path, id, okMsg) {
    setBusyId(id)
    setError('')
    try {
      const res = await apiPost(path, { event_id: id })
      toast(res.message || okMsg)
      await load()
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setBusyId(null)
    }
  }

  const going = (e) => e.user_rsvp === 'attending'
  const counts = {
    upcoming: events.filter((e) => isUpcoming(e.event_date)).length,
    going: events.filter(going).length,
    past: events.filter((e) => !isUpcoming(e.event_date)).length,
  }
  const shown = events.filter((e) => (tab === 'going' ? going(e) : tab === 'past' ? !isUpcoming(e.event_date) : isUpcoming(e.event_date)))
  const tabs = [['upcoming', 'Upcoming'], ...(user ? [['going', 'Going']] : []), ['past', 'Past']]

  return (
    <>
      <div className="pg-root">
        <section className="pg-hero">
          <span className="pg-chip"><Calendar size={13} /> Gatherings</span>
          <h1>events and <em className="hl">gatherings</em></h1>
          <p>Youth nights, worship, and special days. Sign up so we can save you a spot.</p>
        </section>

        {error && <div className="pg-alert">{error}</div>}

        <div className="pg-tabs" role="tablist">
          {tabs.map(([key, label]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} className={tab === key ? 'is-on' : ''} onClick={() => setTab(key)}>
              {label}<small>{counts[key]}</small>
            </button>
          ))}
        </div>

        {loading ? (
          <div className="pg-grid">
            {[0, 1, 2].map((i) => <div key={i} className="dg-skel-card" style={{ height: 360 }}><div className="dg-skel-img" style={{ height: '45%' }} /></div>)}
          </div>
        ) : shown.length === 0 ? (
          <div className="pg-empty">
            <Calendar size={30} strokeWidth={1.5} />
            <b>{tab === 'going' ? 'You have not signed up for any event yet' : tab === 'past' ? 'No past events' : 'No upcoming events'}</b>
            <span>{tab === 'upcoming' ? 'Check back soon.' : ''}</span>
          </div>
        ) : (
          <div className="pg-grid">
            {shown.map((e, i) => {
              const d = parseDate(e.event_date)
              const pct = e.capacity ? Math.min(100, Math.round((e.attendee_count / e.capacity) * 100)) : 0
              const full = e.capacity && e.attendee_count >= e.capacity
              const busy = busyId === e.id
              return (
                <article className="pg-card" key={e.id} style={{ '--i': i }}>
                  <Link to={`/events/${e.id}`} className={`pg-media${e.banner_image ? '' : ' is-plain'}`} aria-label={`Open ${e.title}`}>
                    {e.banner_image && <img src={resolveImageUrl(e.banner_image)} alt="" loading="lazy" />}
                    <span className="pg-date"><span><b>{d?.getDate()}</b><small>{d ? MONTHS[d.getMonth()] : ''}</small></span></span>
                    {e.checked_in === 1 ? (
                      <span className="pg-pill"><Check size={13} /> Checked in</span>
                    ) : going(e) ? (
                      <span className="pg-pill"><Check size={13} /> Going</span>
                    ) : null}
                  </Link>

                  <div className="pg-body">
                    <h3 className="pg-title">{e.title}</h3>
                    {e.description && <p className="pg-desc">{e.description}</p>}
                    <div className="pg-meta">
                      {e.event_time && <span><Clock size={15} /> {e.event_time}</span>}
                      {e.location && (
                        <a
                          href={getGoogleMapsDirectionsUrl(e.location, e.map_url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pg-loc-badge"
                          title="Open location in Google Maps"
                          onClick={(ev) => ev.stopPropagation()}
                        >
                          <MapPin size={15} /> <span>{e.location}</span>
                        </a>
                      )}
                      <span><Users size={15} /> {e.attendee_count} going{e.capacity ? ` of ${e.capacity}` : ''}</span>
                    </div>
                    {e.capacity ? <div className="pg-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div> : null}

                    <div className="pg-actions">
                      {!user ? (
                        <Link to="/login" className="pg-btn pg-main">Sign in to RSVP</Link>
                      ) : going(e) ? (
                        <Link to={`/events/${e.id}`} className="pg-btn pg-main">View details</Link>
                      ) : (
                        <button type="button" className="pg-btn pg-main" disabled={busy || full || !isUpcoming(e.event_date)} onClick={() => act('/api/events/rsvp', e.id, 'RSVP confirmed!')}>
                          <Ticket size={16} /> {busy ? 'Reserving…' : full ? 'Event is full' : 'RSVP'}
                        </button>
                      )}
                      <button type="button" className="pg-icon-btn" onClick={() => addToGoogleCalendar(e)} aria-label="Add to Google Calendar" title="Add to calendar">
                        <CalendarPlus size={18} />
                      </button>
                      <button type="button" className="pg-icon-btn" onClick={() => setShareEvent(e)} aria-label="Share event" title="Share event">
                        <svg width="17" height="17" viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/></svg>
                      </button>
                      {user && going(e) && (
                        <button type="button" className="pg-textbtn" disabled={busy} onClick={() => act('/api/events/cancel-rsvp', e.id, 'RSVP cancelled.')}>
                          {busy ? 'Please wait…' : 'Cancel my RSVP'}
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      {shareEvent && (
        <ShareEventModal event={shareEvent} onClose={() => setShareEvent(null)} />
      )}
    </>
  )
}
