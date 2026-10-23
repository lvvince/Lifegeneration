import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Calendar, Clock, MapPin, Users, Ticket, Check, ImageOff } from 'lucide-react'
import { apiGet, apiPost, getUser } from '../../api.js'
import { isUpcoming, parseDate, resolveImageUrl } from '../../lib/format.js'
import { shareEventOnFacebook } from '../../utils/share.js'
import { FacebookIcon } from '../../components/home/SocialIcons.jsx'
import AddToCalendarButton from '../../components/AddToCalendarButton.jsx'
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
    <div className="pg-root">
      <section className="pg-hero">
        <span className="pg-chip"><Calendar size={13} /> Gatherings</span>
        <h1>Events and gatherings</h1>
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
                <Link to={`/events/${e.id}`} className="pg-media" aria-label={`Open ${e.title}`}>
                  {e.banner_image ? (
                    <img src={resolveImageUrl(e.banner_image)} alt="" loading="lazy" />
                  ) : (
                    <span className="pg-media-empty"><ImageOff size={28} strokeWidth={1.4} /></span>
                  )}
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
                    {e.location && <span><MapPin size={15} /> {e.location}</span>}
                    <span><Users size={15} /> {e.attendee_count} going{e.capacity ? ` of ${e.capacity}` : ''}</span>
                  </div>
                  {e.capacity ? <div className="pg-bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div> : null}

                  <div className="pg-actions">
                    {!user ? (
                      <Link to="/login" className="pg-btn">Sign in to RSVP</Link>
                    ) : going(e) ? (
                      <>
                        <button type="button" className="pg-btn-ghost" disabled={busy} onClick={() => act('/api/events/cancel-rsvp', e.id, 'RSVP cancelled.')}>
                          {busy ? 'Please wait…' : 'Cancel RSVP'}
                        </button>
                        <Link to={`/events/${e.id}`} className="pg-btn">Details</Link>
                      </>
                    ) : (
                      <button type="button" className="pg-btn" disabled={busy || full || !isUpcoming(e.event_date)} onClick={() => act('/api/events/rsvp', e.id, 'RSVP confirmed!')}>
                        <Ticket size={16} /> {busy ? 'Reserving…' : full ? 'Event is full' : 'RSVP'}
                      </button>
                    )}
                    <AddToCalendarButton event={e} variant="small" label="Calendar" />
                    <button type="button" className="pg-btn-ghost" onClick={() => shareEventOnFacebook(e.id, e.title)} aria-label="Share on Facebook">
                      <FacebookIcon size={16} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
