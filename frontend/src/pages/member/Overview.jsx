import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  CalendarDays, ChevronLeft, ChevronRight, ArrowRight, Hash, Megaphone, MapPin, Clock, Users, HeartHandshake, Sparkles, Check, ArrowUpRight,
} from 'lucide-react'
import { apiGet, getUser, setUser } from '../../api.js'
import { initials, isUpcoming, parseDate, resolveImageUrl } from '../../lib/format.js'
import { getEvents, peekEvents } from '../../lib/events-cache.js'
import { on } from '../../lib/bus.js'
import { catOf, useAnnouncements } from '../../components/portal/announcements.jsx'
import MediaSlot from '../../components/portal/MediaSlot.jsx'
import Faq from '../../components/portal/Faq.jsx'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const keyOf = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
const still = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* bilang na umaakyat nang smooth (nag-uumpisa sa huling halaga, hindi sa 0) */
function useCountUp(target) {
  const [v, setV] = useState(0)
  const from = useRef(0)
  useEffect(() => {
    if (still()) {
      from.current = target
      setV(target)
      return undefined
    }
    const t0 = performance.now()
    const a = from.current
    let raf
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 800)
      const val = Math.round(a + (target - a) * (1 - Math.pow(1 - p, 3)))
      from.current = val
      setV(val)
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target])
  return v
}

/* ---------- kalendaryo ---------- */
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
    <div className="sk-cal">
      <div className="sk-cal-head">
        <b>{cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}</b>
        <span>
          <button type="button" className="sk-iconbtn is-sm" onClick={() => move(-1)} aria-label="Previous month">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="sk-iconbtn is-sm" onClick={() => move(1)} aria-label="Next month">
            <ChevronRight size={18} />
          </button>
        </span>
      </div>
      <div className="sk-cal-grid" key={`${y}-${m}`}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <span key={i} className="sk-cal-dow">{d}</span>
        ))}
        {Array.from({ length: lead }).map((_, i) => (
          <i key={`b${i}`} />
        ))}
        {Array.from({ length: days }).map((_, i) => {
          const k = keyOf(y, m, i + 1)
          return (
            <button
              type="button"
              key={k}
              onClick={() => setPicked(k)}
              className={`sk-cal-day${byDay[k] ? ' has-ev' : ''}${k === todayKey ? ' is-today' : ''}${k === picked ? ' is-picked' : ''}`}
              aria-label={`${i + 1}${byDay[k] ? `, ${byDay[k].length} event` : ''}`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
      <div className="sk-cal-list">
        {byDay[picked] ? byDay[picked].map((e) => (
          <Link key={e.id} to={`/events/${e.id}`}>
            <CalendarDays size={15} /> {e.title}
          </Link>
        )) : <span>No events on this day.</span>}
      </div>
    </div>
  )
}

/* ---------- Overview ---------- */
export default function Overview() {
  const loc = useLocation()
  const [user, setU] = useState(getUser())
  const [events, setEvents] = useState(peekEvents)
  const [loading, setLoading] = useState(!peekEvents().length)
  const [tab, setTab] = useState('events')
  const ann = useAnnouncements()
  const rail = useRef(null)

  useEffect(() => {
    apiGet('/api/auth/me')
      .then((me) => {
        if (me?.user) (setU(me.user), setUser(me.user))
      })
      .catch(() => {})
    getEvents(true).then(setEvents).finally(() => setLoading(false))
    return on('events:loaded', setEvents)
  }, [])

  // #updates / #faq sa link -> mag-scroll doon
  useEffect(() => {
    const id = loc.hash.slice(1)
    if (!id || id.startsWith('faq-')) return undefined
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 140)
    return () => clearTimeout(t)
  }, [loc.hash, loc.key])

  const member = user?.member || {}
  const name = user?.full_name || user?.username || 'Member'
  const first = name.split(' ')[0]
  const memberId = user?.member_id || member.member_id
  const upcoming = useMemo(
    () => events.filter((e) => isUpcoming(e.event_date)).sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))),
    [events]
  )
  const going = upcoming.filter((e) => e.user_rsvp === 'attending')
  const next = upcoming[0]
  const nextDate = next ? parseDate(next.event_date) : null

  const glance = {
    events: { label: 'Upcoming events', value: upcoming.length, text: next ? `Next up: ${next.title}` : 'Nothing scheduled yet. Check back soon.', to: '/events', cta: 'Browse events' },
    going: { label: "I'm going to", value: going.length, text: going.length ? `You are going to ${going[0].title}${going.length > 1 ? ` and ${going.length - 1} more` : ''}.` : 'RSVP to an event and it will show up here.', to: '/dashboard/profile', cta: 'My events' },
    updates: { label: 'New updates', value: ann.unread, text: ann.unread ? 'Fresh news from the officers is waiting for you.' : 'You are all caught up.', to: '/dashboard#updates', cta: 'Read updates' },
  }
  const cur = glance[tab]
  const count = useCountUp(cur.value)

  const onTabKey = (e) => {
    const keys = Object.keys(glance)
    const i = keys.indexOf(tab)
    const to = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? keys[(i + 1) % keys.length] : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? keys[(i - 1 + keys.length) % keys.length] : null
    if (!to) return
    e.preventDefault()
    setTab(to)
    document.getElementById(`glance-${to}`)?.focus()
  }

  const slide = useCallback((dir) => {
    const el = rail.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(360, el.clientWidth * 0.85), behavior: 'smooth' })
  }, [])

  return (
    <div className="hm">
      {/* ===== 1. hero ===== */}
      <section className="hm-hero">
        <i className="hm-orb a" data-depth="0.18" aria-hidden="true" />
        <i className="hm-orb b" data-depth="-0.1" aria-hidden="true" />
        <svg className="hm-squig" data-depth="0.14" viewBox="0 0 200 40" aria-hidden="true">
          <path d="M4 20q12-24 24 0t24 0 24 0 24 0 24 0 24 0 24 0" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
        </svg>

        <div className="hm-hero-copy" data-reveal>
          <span className="sk-kicker">
            <Sparkles size={14} /> Life Generation · Youth
          </span>
          <h1>
            Hello, <span className="hm-name">{first}</span>.
            <br />
            Glad you are here.
          </h1>
          <p>This is your space. Catch up on announcements, plan your week and grow with the community.</p>
          <div className="hm-actions">
            <Link to="/events" className="sk-btn">
              See what is coming <ArrowRight size={17} />
            </Link>
            <Link to="/dgroups" className="sk-btn is-ghost">
              Find a D-Group
            </Link>
          </div>
          <div className="hm-chips">
            {memberId && (
              <span className="sk-chip">
                <Hash size={14} /> {memberId}
              </span>
            )}
            {user?.membership_tier && <span className="sk-chip">{user.membership_tier}</span>}
            {ann.unread > 0 && (
              <Link to="/dashboard#updates" className="sk-chip is-live">
                <Megaphone size={14} /> {ann.unread} new {ann.unread === 1 ? 'update' : 'updates'}
              </Link>
            )}
          </div>
        </div>

        <div className="hm-hero-media" data-reveal="right" data-delay="1">
          <div className="hm-frame" data-depth="0.07">
            <MediaSlot slot="hero" alt="" className="hm-hero-img" />
          </div>
          <Link to="/dgroups" className="hm-sticker" data-depth="-0.09" aria-label="Join a D-Group">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <path id="ring" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
              </defs>
              <text>
                <textPath href="#ring">JOIN A D-GROUP • JOIN A D-GROUP •</textPath>
              </text>
            </svg>
            <span>
              <ArrowUpRight size={22} strokeWidth={2} />
            </span>
          </Link>
          <div className="hm-float">
            <span className="sk-date">
              <b>{nextDate ? nextDate.getDate() : '–'}</b>
              <small>{nextDate ? MONTHS[nextDate.getMonth()] : 'SOON'}</small>
            </span>
            <span className="hm-float-t">
              <small>Next up</small>
              <b>{next ? next.title : 'No events yet'}</b>
            </span>
          </div>
        </div>
      </section>

      {/* ===== 2. at a glance ===== */}
      <section className="hm-glance" data-reveal aria-label="At a glance">
        <h2>What is happening?</h2>
        <div className="hm-glance-in">
          <div className="hm-gtabs" role="tablist" aria-orientation="vertical" onKeyDown={onTabKey}>
            {Object.entries(glance).map(([k, g]) => (
              <button key={k} id={`glance-${k}`} type="button" role="tab" aria-selected={tab === k} tabIndex={tab === k ? 0 : -1} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>
                {k === 'events' ? <CalendarDays size={17} /> : k === 'going' ? <Check size={17} /> : <Megaphone size={17} />}
                {g.label}
              </button>
            ))}
          </div>
          <div className="hm-gbig" role="tabpanel" aria-live="polite">
            <strong>{count}</strong>
            <span>{cur.label}</span>
            <p key={tab}>{cur.text}</p>
            <Link to={cur.to} className="sk-link">
              {cur.cta} <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== 3. announcements ===== */}
      <section className="hm-sec" id="updates">
        <header className="hm-sh" data-reveal>
          <div>
            <h2>Announcements</h2>
            <p>The latest from your officers.</p>
          </div>
          <div className="hm-sh-act">
            {ann.unread > 0 && (
              <button type="button" className="sk-textbtn" onClick={ann.markAllSeen}>
                Mark all read
              </button>
            )}
            <button type="button" className="sk-iconbtn" onClick={() => slide(-1)} aria-label="Previous">
              <ChevronLeft size={19} />
            </button>
            <button type="button" className="sk-iconbtn" onClick={() => slide(1)} aria-label="Next">
              <ChevronRight size={19} />
            </button>
          </div>
        </header>
        {ann.loading ? (
          <div className="hm-rail">
            {[0, 1, 2].map((i) => (
              <div className="hm-ann is-skel" key={i} />
            ))}
          </div>
        ) : ann.items.length === 0 ? (
          <div className="hm-empty" data-reveal>
            <Megaphone size={26} strokeWidth={1.5} />
            <b>No announcements yet</b>
            <span>News from the officers will show up here.</span>
          </div>
        ) : (
          <div className="hm-rail" ref={rail} data-reveal data-delay="1">
            {ann.items.slice(0, 8).map((a) => {
              const Icon = catOf(a.category).icon
              const isNew = !ann.seen.includes(a.id)
              const external = a.link_url?.startsWith('http')
              return (
                <article className={`hm-ann is-${a.category || 'general'}${isNew ? ' is-new' : ''}`} key={a.id} onMouseEnter={() => isNew && ann.markSeen([a.id])}>
                  <div className="hm-ann-top">
                    <span className="sk-tile">
                      <Icon size={18} strokeWidth={1.8} />
                    </span>
                    <span className="sk-tag">{a.badge_text || catOf(a.category).label}</span>
                    {Number(a.is_pinned) === 1 && <span className="sk-tag is-pin">Pinned</span>}
                    {isNew && <i className="sk-dot" aria-label="New" />}
                  </div>
                  <h3>{a.title}</h3>
                  <p>{a.content}</p>
                  {a.link_url &&
                    (external ? (
                      <a href={a.link_url} target="_blank" rel="noopener noreferrer" className="sk-link">
                        {a.link_text || 'Learn more'} <ArrowRight size={15} />
                      </a>
                    ) : (
                      <Link to={a.link_url} className="sk-link">
                        {a.link_text || 'Learn more'} <ArrowRight size={15} />
                      </Link>
                    ))}
                </article>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== 4. events + calendar ===== */}
      <section className="hm-sec">
        <header className="hm-sh" data-reveal>
          <div>
            <h2>Upcoming events</h2>
            <p>Save your seat and invite a friend.</p>
          </div>
          <Link to="/events" className="sk-link">
            View all <ArrowRight size={15} />
          </Link>
        </header>
        <div className="hm-two">
          <div className="hm-evs" data-reveal>
            {loading ? (
              [0, 1, 2].map((i) => <div className="hm-ev is-skel" key={i} />)
            ) : upcoming.length === 0 ? (
              <div className="hm-empty">
                <CalendarDays size={26} strokeWidth={1.5} />
                <b>No upcoming events</b>
                <span>Check back soon.</span>
              </div>
            ) : (
              upcoming.slice(0, 4).map((e, i) => {
                const d = parseDate(e.event_date)
                return (
                  <Link to={`/events/${e.id}`} className="hm-ev" key={e.id} style={{ '--n': i }}>
                    <MediaSlot slot="event" src={e.banner_image ? resolveImageUrl(e.banner_image) : undefined} ratio="1 / 1" className="hm-ev-img" />
                    <span className="hm-ev-main">
                      <b>{e.title}</b>
                      <small>
                        <CalendarDays size={13} /> {d ? `${MONTHS[d.getMonth()]} ${d.getDate()}` : ''}
                        {e.event_time && (
                          <>
                            {' '}
                            · <Clock size={13} /> {e.event_time}
                          </>
                        )}
                      </small>
                      {e.location && (
                        <small>
                          <MapPin size={13} /> {e.location}
                        </small>
                      )}
                    </span>
                    {e.user_rsvp === 'attending' ? <span className="sk-tag is-ok">Going</span> : <ArrowRight size={18} className="sk-res-go" />}
                  </Link>
                )
              })
            )}
          </div>
          <div className="hm-calcard" data-reveal data-delay="1">
            <Calendar events={events} />
          </div>
        </div>
      </section>

      {/* ===== 5. my journey ===== */}
      <section className="hm-sec">
        <header className="hm-sh" data-reveal>
          <div>
            <h2>Your journey</h2>
            <p>Where you belong and where you serve.</p>
          </div>
        </header>
        <div className="hm-pair">
          {[
            { slot: 'dgroup', icon: Users, title: 'My D-Group', value: member.dgroup_name, empty: 'You have not joined a group yet.', to: '/dgroups', cta: member.dgroup_name ? 'View groups' : 'Find a group' },
            { slot: 'ministry', icon: HeartHandshake, title: 'My ministry', value: member.ministry_name, empty: 'You are not on a team yet.', to: '/ministries', cta: member.ministry_name ? 'View ministries' : 'Apply to serve' },
          ].map(({ slot, icon: Icon, title, value, empty, to, cta }, i) => (
            <article className="hm-j" key={title} data-reveal data-delay={i + 1}>
              <MediaSlot slot={slot} className="hm-j-img" />
              <div className="hm-j-body">
                <span className="sk-tile">
                  <Icon size={19} strokeWidth={1.7} />
                </span>
                <small>{title}</small>
                <h3>{value || empty}</h3>
                <Link to={to} className="sk-btn is-soft">
                  {cta} <ArrowRight size={16} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ===== 6. moments (video + pictures) ===== */}
      <section className="hm-sec hm-moments">
        <header className="hm-sh" data-reveal>
          <div>
            <h2>Life Gen moments</h2>
            <p>A look at what we do together.</p>
          </div>
        </header>
        <div className="hm-m-grid">
          <div className="hm-m-video" data-reveal>
            <MediaSlot slot="intro" className="hm-m-vid" />
          </div>
          <div className="hm-m-pics">
            <div className="hm-m-col">
              <div data-depth="0.05">
                <MediaSlot slot="moment1" />
              </div>
            </div>
            <div className="hm-m-col is-low">
              <div data-depth="-0.06">
                <MediaSlot slot="moment2" />
              </div>
              <div data-depth="-0.03">
                <MediaSlot slot="moment3" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== 7. prayer band ===== */}
      <section className="hm-band" data-reveal>
        <i className="hm-orb c" data-depth="0.16" aria-hidden="true" />
        <div className="hm-band-copy">
          <small>Need prayer?</small>
          <h2>You are not alone. Let us pray with you.</h2>
          <Link to="/prayer" className="sk-btn is-white">
            Open the prayer wall <ArrowRight size={17} />
          </Link>
        </div>
        <div className="hm-band-img" data-depth="0.06">
          <MediaSlot slot="prayer" />
        </div>
      </section>

      {/* ===== 8. FAQ ===== */}
      <Faq />

      <footer className="hm-foot">
        <span className="sk-tile">{initials(name)}</span>
        <p>Life Generation Calapan · Youth Ministry</p>
      </footer>
    </div>
  )
}
