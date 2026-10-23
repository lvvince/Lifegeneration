import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Network, HeartHandshake, Megaphone, ArrowRight, Hash } from 'lucide-react'
import { apiGet, getUser, setUser } from '../../api.js'
import { initials, isUpcoming, parseDate, resolveImageUrl } from '../../lib/format.js'
import { Badge, Empty, Loading } from '../../components/portal/ui.jsx'
import { useAnnouncements, AnnouncementList } from '../../components/portal/announcements.jsx'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const keyOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`

function Calendar({ events }) {
  const now = new Date()
  const [cursor, setCursor] = useState(new Date(now.getFullYear(), now.getMonth(), 1))
  const [picked, setPicked] = useState(keyOf(now.getFullYear(), now.getMonth(), now.getDate()))
  const y = cursor.getFullYear()
  const m = cursor.getMonth()

  const byDay = useMemo(() => {
    const map = {}
    events.forEach((e) => {
      const k = String(e.event_date).slice(0, 10)
      ;(map[k] = map[k] || []).push(e)
    })
    return map
  }, [events])

  const lead = new Date(y, m, 1).getDay()
  const days = new Date(y, m + 1, 0).getDate()
  const todayKey = keyOf(now.getFullYear(), now.getMonth(), now.getDate())
  const move = (n) => setCursor(new Date(y, m + n, 1))

  return (
    <div className="cal">
      <div className="cal-head">
        <b>{cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</b>
        <span className="p-inline">
          <button type="button" className="p-btn p-btn-quiet p-btn-icon" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft size={18} /></button>
          <button type="button" className="p-btn p-btn-quiet p-btn-icon" onClick={() => move(1)} aria-label="Next month"><ChevronRight size={18} /></button>
        </span>
      </div>
      <div className="cal-grid">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        {Array.from({ length: lead }).map((_, i) => <button key={`b${i}`} className="cal-day" disabled aria-hidden="true" />)}
        {Array.from({ length: days }).map((_, i) => {
          const k = keyOf(y, m, i + 1)
          return (
            <button
              type="button"
              key={k}
              onClick={() => setPicked(k)}
              className={`cal-day${byDay[k] ? ' has-ev' : ''}${k === todayKey ? ' is-today' : ''}${k === picked ? ' is-picked' : ''}`}
              aria-label={`${i + 1}${byDay[k] ? `, ${byDay[k].length} event` : ''}`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="cal-list">
        {byDay[picked] ? byDay[picked].map((e) => <Link key={e.id} to={`/events/${e.id}`}>{e.title}</Link>) : 'No events on this day.'}
      </div>
    </div>
  )
}

export default function Overview() {
  const [user, setU] = useState(getUser())
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const ann = useAnnouncements()
  const heroRef = useRef(null)

  useEffect(() => {
    Promise.all([apiGet('/api/auth/me').catch(() => null), apiGet('/api/events').catch(() => [])])
      .then(([me, ev]) => {
        if (me?.user) (setU(me.user), setUser(me.user))
        if (Array.isArray(ev)) setEvents(ev)
      })
      .finally(() => setLoading(false))
  }, [])

  // parallax ng banner habang nag-i-scroll
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let queued = false
    const frame = () => {
      queued = false
      heroRef.current?.style.setProperty('--py', `${Math.min(window.scrollY * 0.25, 90)}px`)
    }
    const onScroll = () => {
      if (!queued) (queued = true, requestAnimationFrame(frame))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const member = user?.member || {}
  const name = user?.full_name || user?.username || 'Member'
  const first = name.split(' ')[0]
  const memberId = user?.member_id || member.member_id
  const avatar = user?.avatar || member.avatar
  const upcoming = events.filter((e) => isUpcoming(e.event_date)).sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))).slice(0, 4)

  return (
    <>
      <section className="ov-hero" ref={heroRef}>
        <div className="ov-hero-bg" aria-hidden="true" />
        <h1>Welcome, {first}!</h1>
        <p>Here is what is happening in Life Generation Calapan.</p>
        <div className="ov-chips">
          {memberId && <span className="ov-chip"><Hash size={14} /> {memberId}</span>}
          {user?.membership_tier && <span className="ov-chip">{user.membership_tier}</span>}
          {ann.unread > 0 && <span className="ov-chip"><Megaphone size={14} /> {ann.unread} new {ann.unread === 1 ? 'announcement' : 'announcements'}</span>}
        </div>
      </section>

      <div className="ov-grid">
        <section className="p-panel ov-7">
          <div className="p-panel-head">
            <h2 className="p-h2">Announcements</h2>
            {ann.unread > 0 && <button type="button" className="p-btn p-btn-quiet p-btn-sm" onClick={ann.markAllSeen}>Mark all read</button>}
          </div>
          <div style={{ padding: '6px 10px 10px' }}>
            {ann.loading ? <Loading rows={3} /> : ann.items.length === 0 ? (
              <Empty icon={Megaphone} title="No announcements" desc="News from the officers will show up here." />
            ) : (
              <AnnouncementList items={ann.items} seen={ann.seen} limit={4} />
            )}
          </div>
        </section>

        <section className="p-panel ov-5">
          <div className="ov-profile">
            <span className="px-avatar">{avatar ? <img src={resolveImageUrl(avatar)} alt="" draggable="false" /> : initials(name)}</span>
            <b>{name}</b>
            <span className="p-mono">{memberId || 'ID pending'}</span>
            <Badge tone="ok">{user?.membership_tier || 'Standard Member'}</Badge>
            <Link to="/dashboard/profile" className="p-btn p-btn-primary">View my profile <ArrowRight size={16} /></Link>
          </div>
        </section>

        <section className="p-panel ov-7">
          <div className="p-panel-head">
            <h2 className="p-h2">Upcoming events</h2>
            <Link to="/events" style={{ fontSize: 13 }}>View all</Link>
          </div>
          {loading ? <Loading rows={3} /> : upcoming.length === 0 ? (
            <Empty icon={CalendarDays} title="No upcoming events" desc="Check back soon." />
          ) : (
            upcoming.map((e) => {
              const d = parseDate(e.event_date)
              return (
                <Link to={`/events/${e.id}`} className="ov-row" key={e.id}>
                  <span className="ov-date"><span><b>{d?.getDate()}</b><small>{d ? MONTHS[d.getMonth()] : ''}</small></span></span>
                  <span className="p-row-main">
                    <span className="p-row-title" style={{ display: 'block' }}>{e.title}</span>
                    <span className="p-row-sub" style={{ display: 'block' }}>{[e.event_time, e.location].filter(Boolean).join(' · ')}</span>
                  </span>
                  {e.user_rsvp === 'attending' ? <Badge tone="ok">Going</Badge> : <ArrowRight size={18} className="p-muted" />}
                </Link>
              )
            })
          )}
        </section>

        <section className="p-panel ov-5">
          <div className="p-panel-head"><h2 className="p-h2">Calendar</h2></div>
          <Calendar events={events} />
        </section>

        {[
          { icon: Network, title: 'My D-Group', value: member.dgroup_name, empty: 'You have not joined a group yet.', to: '/dgroups', cta: member.dgroup_name ? 'View groups' : 'Find a group' },
          { icon: HeartHandshake, title: 'My ministry', value: member.ministry_name, empty: 'You are not on a ministry team yet.', to: '/ministries', cta: member.ministry_name ? 'View ministries' : 'Apply to serve' },
        ].map(({ icon: Icon, title, value, empty, to, cta }) => (
          <section className="p-panel ov-6" key={title}>
            <div className="ov-row">
              <span className="neo-tile"><Icon size={20} strokeWidth={1.7} /></span>
              <span className="p-row-main">
                <span className="p-row-sub" style={{ display: 'block' }}>{title}</span>
                <span className="p-row-title" style={{ display: 'block' }}>{value || empty}</span>
              </span>
              <Link to={to} className="p-btn p-btn-secondary p-btn-sm">{cta}</Link>
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
