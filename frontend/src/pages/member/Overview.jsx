import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, ArrowRight, ArrowUpRight, Hash, MapPin, Clock, Users, HeartHandshake } from 'lucide-react'
import { apiGet, getUser, setUser } from '../../api.js'
import { isUpcoming, parseDate, resolveImageUrl } from '../../lib/format.js'
import { getEvents, peekEvents } from '../../lib/events-cache.js'
import { on } from '../../lib/bus.js'
import { catOf, useAnnouncements } from '../../components/portal/announcements.jsx'
import MediaSlot from '../../components/portal/MediaSlot.jsx'
import Faq from '../../components/portal/Faq.jsx'
import DailyDevotional from '../../components/portal/DailyDevotional.jsx'

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

function Stat({ to, value, label, text }) {
  const n = useCountUp(value)
  return (
    <Link to={to} className="hm-stat">
      <strong>{String(n).padStart(2, '0')}</strong>
      <b>{label}</b>
      <span>{text}</span>
      <ArrowUpRight size={20} strokeWidth={2} className="hm-stat-go" />
    </Link>
  )
}

function Head({ no, title, sub, right }) {
  return (
    <header className="hm-sh" data-reveal>
      <div>
        <span className="hm-no">{no}</span>
        <h2>{title}</h2>
        {sub && <p>{sub}</p>}
      </div>
      {right}
    </header>
  )
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
  const first = name.split(' ')[0].slice(0, 14)
  const memberId = user?.member_id || member.member_id
  const upcoming = useMemo(
    () => events.filter((e) => isUpcoming(e.event_date)).sort((a, b) => String(a.event_date).localeCompare(String(b.event_date))),
    [events]
  )
  const going = upcoming.filter((e) => e.user_rsvp === 'attending')
  const next = upcoming[0]
  const nextDate = next ? parseDate(next.event_date) : null

  const slide = useCallback((dir) => {
    const el = rail.current
    if (!el) return
    el.scrollBy({ left: dir * Math.min(380, el.clientWidth * 0.85), behavior: 'smooth' })
  }, [])

  return (
    <div className="hm">
      {/* ===== HERO: cover photo ===== */}
      <section className="hm-hero">
        <div className="hm-cover" data-depth="0.12" aria-hidden="true">
          <MediaSlot slot="hero" ratio="16 / 9" alt="" />
        </div>
        <i className="hm-shade" aria-hidden="true" />

        <div className="hm-hero-in">
          <p className="hm-eyebrow hm-in" style={{ '--d': 0 }}>
            Life Generation <i /> Calapan Youth
          </p>
          <h1 className="hm-in" style={{ '--d': 1 }}>
            Hello,
            <br />
            <span>{first}.</span>
          </h1>
          <p className="hm-lead hm-in" style={{ '--d': 2 }}>
            This is your space. Catch up on announcements, plan your week and grow with the community.
          </p>
          <div className="hm-actions hm-in" style={{ '--d': 3 }}>
            <Link to="/events" className="sk-btn">
              See what is coming <ArrowRight size={18} />
            </Link>
            <Link to="/dgroups" className="sk-btn is-line">
              Find a D-Group
            </Link>
          </div>
        </div>

        <div className="hm-dock hm-in" style={{ '--d': 4 }}>
          <div className="hm-cell">
            <small>Member ID</small>
            <b>
              <Hash size={15} /> {memberId || 'Pending'}
            </b>
          </div>
          <div className="hm-cell">
            <small>Membership</small>
            <b>{user?.membership_tier || 'Standard Member'}</b>
          </div>
          <Link to={next ? `/events/${next.id}` : '/events'} className="hm-cell is-next">
            <span className="hm-date">
              <b>{nextDate ? nextDate.getDate() : '–'}</b>
              <small>{nextDate ? MONTHS[nextDate.getMonth()] : 'SOON'}</small>
            </span>
            <span className="hm-next-t">
              <small>Next up</small>
              <b>{next ? next.title : 'No events yet'}</b>
            </span>
            <ArrowUpRight size={20} strokeWidth={2} />
          </Link>
        </div>
      </section>

      {/* ===== 01 at a glance ===== */}
      <DailyDevotional />
      <section className="hm-band hm-white">
        <div className="hm-wrap">
          <div className="hm-stats" data-reveal>
            <Stat to="/events" value={upcoming.length} label="Upcoming events" text={next ? `Next: ${next.title}` : 'Check back soon'} />
            <Stat to="/dashboard/profile" value={going.length} label="I am going to" text={going.length ? going[0].title : 'RSVP to an event'} />
            <Stat to="/dashboard#updates" value={ann.unread} label="New updates" text={ann.unread ? 'Waiting for you' : 'All caught up'} />
          </div>
        </div>
      </section>

      {/* ===== 02 announcements ===== */}
      <section className="hm-band hm-blue" id="updates">
        <div className="hm-wrap">
          <Head
            no="01"
            title="Announcements"
            sub="The latest from your officers."
            right={
              <div className="hm-sh-act">
                {ann.unread > 0 && (
                  <button type="button" className="sk-textbtn" onClick={ann.markAllSeen}>
                    Mark all read
                  </button>
                )}
                <button type="button" className="sk-iconbtn" onClick={() => slide(-1)} aria-label="Previous">
                  <ChevronLeft size={20} />
                </button>
                <button type="button" className="sk-iconbtn" onClick={() => slide(1)} aria-label="Next">
                  <ChevronRight size={20} />
                </button>
              </div>
            }
          />
          {ann.loading ? (
            <div className="hm-rail">
              {[0, 1, 2].map((i) => (
                <div className="hm-ann is-skel" key={i} />
              ))}
            </div>
          ) : ann.items.length === 0 ? (
            <div className="hm-empty" data-reveal>
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
                  <article className={`hm-ann is-${a.category || 'general'}${isNew ? ' is-new' : ''}`} key={a.id} onPointerEnter={(e) => isNew && e.pointerType === 'mouse' && ann.markSeen([a.id])}>
                    <div className="hm-ann-top">
                      <span className="sk-tile">
                        <Icon size={18} strokeWidth={1.9} />
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
        </div>
      </section>

      {/* ===== 03 events + calendar ===== */}
      <section className="hm-band hm-white">
        <div className="hm-wrap">
          <Head
            no="02"
            title="Upcoming events"
            sub="Save your seat and invite a friend."
            right={
              <Link to="/events" className="sk-link">
                View all <ArrowRight size={15} />
              </Link>
            }
          />
          <div className="hm-two">
            <div className="hm-evs" data-reveal>
              {loading ? (
                [0, 1, 2].map((i) => <div className="hm-ev is-skel" key={i} />)
              ) : upcoming.length === 0 ? (
                <div className="hm-empty">
                  <b>No upcoming events</b>
                  <span>Check back soon.</span>
                </div>
              ) : (
                upcoming.slice(0, 4).map((e, i) => {
                  const d = parseDate(e.event_date)
                  return (
                    <Link to={`/events/${e.id}`} className="hm-ev" key={e.id} style={{ '--n': i }}>
                      <span className="hm-date is-or">
                        <b>{d?.getDate()}</b>
                        <small>{d ? MONTHS[d.getMonth()] : ''}</small>
                      </span>
                      <span className="hm-ev-main">
                        <b>{e.title}</b>
                        <small>
                          {e.event_time && (
                            <>
                              <Clock size={13} /> {e.event_time}
                            </>
                          )}
                          {e.location && (
                            <>
                              <MapPin size={13} /> {e.location}
                            </>
                          )}
                        </small>
                      </span>
                      <MediaSlot slot="event" src={e.banner_image ? resolveImageUrl(e.banner_image) : undefined} ratio="1 / 1" className="hm-ev-img" />
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
        </div>
      </section>

      {/* ===== 04 journey ===== */}
      <section className="hm-band hm-warm">
        <div className="hm-wrap">
          <Head no="03" title="Your journey" sub="Where you belong and where you serve." />
          <div className="hm-pair">
            {[
              { slot: 'dgroup', icon: Users, title: 'My D-Group', value: member.dgroup_name, empty: 'You have not joined a group yet.', to: '/dgroups', cta: member.dgroup_name ? 'View groups' : 'Find a group' },
              { slot: 'ministry', icon: HeartHandshake, title: 'My ministry', value: member.ministry_name, empty: 'You are not on a team yet.', to: '/ministries', cta: member.ministry_name ? 'View ministries' : 'Apply to serve' },
            ].map(({ slot, icon: Icon, title, value, empty, to, cta }, i) => (
              <article className="hm-j" key={title} data-reveal data-delay={i + 1}>
                <MediaSlot slot={slot} className="hm-j-img" />
                <div className="hm-j-body">
                  <small>
                    <Icon size={16} strokeWidth={2} /> {title}
                  </small>
                  <h3>{value || empty}</h3>
                  <Link to={to} className="sk-btn is-ink">
                    {cta} <ArrowRight size={17} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 05 moments (pictures lang) ===== */}
      <section className="hm-band hm-white">
        <div className="hm-wrap">
          <Head no="04" title="Life Gen moments" sub="A look at what we do together." />
          <div className="hm-moments">
            {[
              ['moment1', 'Worship nights'],
              ['moment2', 'D-Group fellowship'],
              ['moment3', 'Outreach and serving'],
            ].map(([slot, cap], i) => (
              <figure key={slot} data-reveal data-delay={i}>
                <div data-depth="0.03">
                  <MediaSlot slot={slot} ratio="4 / 5" />
                </div>
                <figcaption>
                  <span>0{i + 1}</span> {cap}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 06 video (hiwalay) ===== */}
      <section className="hm-band hm-ink">
        <div className="hm-wrap hm-watch">
          <div className="hm-watch-copy" data-reveal>
            <span className="hm-no">05</span>
            <h2>Watch</h2>
            <p>Life Generation in one minute. See who we are and what we are about.</p>
          </div>
          <div className="hm-watch-vid" data-reveal data-delay="1">
            <MediaSlot slot="intro" />
          </div>
        </div>
      </section>

      {/* ===== 07 prayer ===== */}
      <section className="hm-band hm-orange">
        <div className="hm-wrap hm-pray" data-reveal>
          <div>
            <small>Need prayer?</small>
            <h2>You are not alone. Let us pray with you.</h2>
            <Link to="/prayer" className="sk-btn is-white">
              Open the prayer wall <ArrowRight size={18} />
            </Link>
          </div>
          <div className="hm-pray-img" data-depth="0.05">
            <MediaSlot slot="prayerVideo" alt="Friends praying together" />
          </div>
        </div>
      </section>

      {/* ===== 08 FAQ ===== */}
      <section className="hm-band hm-white hm-faqband">
        <div className="hm-wrap">
          <Faq />
        </div>
      </section>

      <footer className="hm-foot">
        <span>Life Generation Calapan</span>
        <span>Youth Ministry</span>
      </footer>
    </div>
  )
}
