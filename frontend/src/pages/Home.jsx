import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Clock, MapPin, Share2, Users, HeartHandshake, MessageSquare,
  BookOpen, Music, Flame,
} from 'lucide-react'
import { apiGet, getUser } from '../api.js'
import { useAuthModal } from '../context/AuthModal.jsx'
import { shareEventOnFacebook } from '../utils/share.js'
import AddToCalendarButton from '../components/AddToCalendarButton.jsx'
import { resolveImageUrl } from '../lib/media.js'
import { useHomeMotion } from '../components/home/motion.js'
import HomeFooter from '../components/home/HomeFooter.jsx'
import { FacebookIcon, InstagramIcon, TikTokIcon, SOCIALS } from '../components/home/SocialIcons.jsx'
import '../styles/home.css'

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
const DAYS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

function parseDate(d) {
  const [y, m, day] = String(d || '').slice(0, 10).split('-').map(Number)
  return y ? new Date(y, m - 1, day) : null
}

function dateParts(d) {
  const x = parseDate(d)
  return x ? { day: x.getDate(), mon: MONTHS[x.getMonth()], dow: DAYS[x.getDay()] } : null
}

const VISION = 'An empowered generation that is able to inspire the community through their kindled passion in Christ.'
// Palitan ang caption dito kung gusto mo
const GALLERY = [
  { img: 'gallery-1', w: 1000, h: 702, cap: 'Life Generation Fellowship' },
  { img: 'gallery-2', w: 1000, h: 750, cap: 'Growing in faith, living in fellowship.' },
  { img: 'gallery-3', w: 760, h: 937, cap: 'United in His calling.' },
  { img: 'gallery-4', w: 1000, h: 750, cap: 'Group photo' },
  { img: 'gallery-5', w: 1000, h: 750, cap: 'United by purpose.' },
]

const KEY_FROM = 'kindled'

const STRIP = [
  { icon: Music, label: 'Worship' },
  { icon: BookOpen, label: 'Discipleship' },
  { icon: MessageSquare, label: 'Prayer' },
  { icon: HeartHandshake, label: 'Service' },
  { icon: Users, label: 'Community' },
]

function Tile({ tile }) {
  const Icon = tile.icon
  const inner = (
    <>
      <span className="lg-tile-img" data-parallax="0.07" aria-hidden="true">
        <img src={`/images/${tile.img}.webp`} alt="" width="640" height="800" loading="lazy" decoding="async" />
      </span>
      <span className="lg-tile-go" aria-hidden="true">
        <ArrowRight size={18} />
      </span>
      <span className="lg-tile-body">
        <span className="lg-tile-chip" aria-hidden="true">
          <Icon size={20} strokeWidth={1.8} />
        </span>
        <span className="lg-tile-title">{tile.title}</span>
        <span className="lg-tile-sub">{tile.sub}</span>
      </span>
    </>
  )
  return tile.action ? (
    <button type="button" className="lg-tile" onClick={tile.action}>
      {inner}
    </button>
  ) : (
    <Link to={tile.to} className="lg-tile">
      {inner}
    </Link>
  )
}

export default function Home() {
  const user = getUser()
  const { openRegister } = useAuthModal()
  const rootRef = useRef(null)
  const [events, setEvents] = useState([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    apiGet('/api/events')
      .then((d) => Array.isArray(d) && setEvents(d))
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const upcoming = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return events
      .filter((e) => {
        const d = parseDate(e.event_date)
        return d && d >= today
      })
      .sort((a, b) => String(a.event_date).localeCompare(String(b.event_date)))
      .slice(0, 4)
  }, [events])

  const next = upcoming[0]
  const nextParts = next && dateParts(next.event_date)

  useHomeMotion(rootRef, `${loaded}-${upcoming.length}`)

  const tiles = [
    user
      ? { title: 'Join an event', sub: 'See what is coming up and sign up.', icon: Flame, to: '/events', img: 'tile-new' }
      : { title: "I'm new", sub: 'Make your free member account in a minute.', icon: Flame, action: openRegister, img: 'tile-new' },
    { title: 'Find a D-Group', sub: 'Small groups where you grow with friends.', icon: Users, to: '/dgroups', img: 'tile-dgroup' },
    { title: 'I need prayer', sub: 'Share a request on the prayer wall.', icon: MessageSquare, to: '/prayer', img: 'tile-prayer' },
    { title: 'I want to serve', sub: 'Join a ministry team that fits you.', icon: HeartHandshake, to: '/ministries', img: 'tile-serve' },
  ]

  const words = VISION.split(' ')
  const keyIndex = words.findIndex((w) => w.startsWith(KEY_FROM))

  return (
    <>
    <main className="lg-home" ref={rootRef}>
      {/* ===== HERO ===== */}
      <section className="lg-hero" data-hero aria-label="Welcome">
        <div className="lg-hero-media" data-parallax="0.28" aria-hidden="true">
          <img src="/hero-bg.jpg" alt="" width="1376" height="768" fetchPriority="high" decoding="async" />
        </div>

        <div className="lg-wrap">
          <div className="lg-hero-inner" data-hero-fade>
            <div className="lg-hero-text">
              <span className="lg-eyebrow" data-reveal>Youth organization · Calapan</span>
              <h1 className="lg-title">
                <span className="lg-line"><span style={{ '--d': '0.1s' }}>A place for</span></span>
                <span className="lg-line"><span className="lg-accent" style={{ '--d': '0.25s' }}>Imperfect people</span></span>
              </h1>
              <p className="lg-hero-sub" data-reveal style={{ '--d': '0.45s' }}>
                {VISION}
              </p>
              <div className="lg-cta" data-reveal style={{ '--d': '0.6s' }}>
                {user ? (
                  <Link to={user.role === 'admin' ? '/admin' : '/dashboard'} className="lg-btn lg-btn-primary">
                    {user.role === 'admin' ? 'Open admin' : 'My profile'} <ArrowRight size={18} />
                  </Link>
                ) : (
                  <>
                    <button type="button" className="lg-btn lg-btn-primary" onClick={openRegister}>
                      Join the movement <ArrowRight size={18} />
                    </button>
                    <Link to="/login" className="lg-btn lg-btn-line">
                      Sign in
                    </Link>
                  </>
                )}
              </div>
            </div>

            {next && nextParts && (
              <Link to={`/events/${next.id}`} className="lg-next" data-reveal style={{ '--d': '0.75s' }}>
                <span className="lg-next-date">
                  <span>
                    <b>{nextParts.day}</b>
                    <small>{nextParts.mon}</small>
                  </span>
                </span>
                <span className="lg-next-body">
                  <em>Next gathering</em>
                  <strong>{next.title}</strong>
                  <span>
                    {[nextParts.dow, next.event_time, next.location].filter(Boolean).join(' · ')}
                  </span>
                </span>
                <ArrowRight size={18} />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ===== STRIP (hindi gumagalaw) ===== */}
      <ul className="lg-strip">
        {STRIP.map(({ icon: Icon, label }) => (
          <li key={label}>
            <Icon size={22} strokeWidth={1.8} /> {label}
          </li>
        ))}
      </ul>

      {/* ===== GATHERINGS ===== */}
      <section className="lg-section" id="gatherings">
        <div className="lg-wrap lg-split">
          <div className="lg-split-aside" data-reveal>
            <span className="lg-eyebrow">Gatherings</span>
            <h2 className="lg-h2">Come as you are</h2>
            <p className="lg-lead">Meetings, youth nights and special events. Sign up so we can save you a spot.</p>
          </div>

          <div>
            <div className="lg-events">
              {upcoming.length === 0 ? (
                <p className="lg-empty" data-reveal>
                  {loaded
                    ? 'No gatherings are posted right now. Follow our Facebook page to hear about the next one.'
                    : 'Loading gatherings…'}
                  {loaded && (
                    <>
                      {' '}
                      <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer">Open Facebook</a>
                    </>
                  )}
                </p>
              ) : (
                upcoming.map((ev, i) => {
                  const p = dateParts(ev.event_date)
                  return (
                    <div className="lg-event" key={ev.id} data-reveal style={{ '--d': `${i * 0.08}s` }}>
                      <Link to={`/events/${ev.id}`} className="lg-event-main">
                        <span className="lg-event-date">
                          <b>{p?.day}</b>
                          <small>{p ? `${p.mon} · ${p.dow}` : ''}</small>
                        </span>
                        <span>
                          <span className="lg-event-title">{ev.title}</span>
                          <span className="lg-event-meta">
                            {ev.event_time && (
                              <span><Clock size={15} /> {ev.event_time}</span>
                            )}
                            {ev.location && (
                              <span><MapPin size={15} /> {ev.location}</span>
                            )}
                          </span>
                        </span>
                        <span className="lg-event-end" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                          {ev.banner_image && (
                            <img
                              className="lg-event-thumb"
                              src={resolveImageUrl(ev.banner_image)}
                              alt=""
                              loading="lazy"
                              decoding="async"
                            />
                          )}
                          <span className="lg-event-go" aria-hidden="true">
                            <ArrowRight size={20} />
                          </span>
                        </span>
                      </Link>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <AddToCalendarButton
                          event={ev}
                          variant="icon"
                          className="lg-share"
                          style={{ width: 44, height: 44, borderRadius: '50%', border: 0, background: 'transparent', boxShadow: 'none' }}
                        />
                        <button
                          type="button"
                          className="lg-share"
                          onClick={() => shareEventOnFacebook(ev.id, ev.title)}
                          aria-label={`Share ${ev.title} on Facebook`}
                          title="Share on Facebook"
                        >
                          <Share2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="lg-more" data-reveal>
              <Link to="/events" className="lg-btn lg-btn-outline">
                See all events <ArrowRight size={18} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== START HERE (tiles) ===== */}
      <section className="lg-section" id="start" style={{ paddingTop: 0 }}>
        <div className="lg-wrap">
          <div className="lg-tiles-head" data-reveal>
            <div>
              <span className="lg-eyebrow">Find your place</span>
              <h2 className="lg-h2">Where do you<br />want to start?</h2>
            </div>
            <p className="lg-lead" style={{ margin: 0 }}>Four easy ways in. Pick the one that fits you today.</p>
          </div>
          <div className="lg-tiles" data-reveal style={{ '--d': '0.1s' }}>
            {tiles.map((t) => (
              <Tile tile={t} key={t.title} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== GALLERY ===== */}
      <section className="lg-section lg-wall" id="moments">
        <div className="lg-wrap">
          <div className="lg-tiles-head" data-reveal>
            <div>
              <span className="lg-eyebrow">Our people</span>
              <h2 className="lg-h2">Moments together</h2>
            </div>
            <p className="lg-lead" style={{ margin: 0 }}>A few snapshots from our gatherings.</p>
          </div>
          <div className="lg-gallery">
            {GALLERY.map((g, i) => (
              <figure className={`lg-pic lg-pic-${i + 1}`} key={g.img} data-reveal style={{ '--d': `${i * 0.08}s` }}>
                <div className="lg-pic-in" data-parallax={i % 2 ? '-0.03' : '0.04'}>
                  <div className="lg-pic-frame">
                    <span className="lg-pic-photo">
                      <img src={`/images/${g.img}.webp`} alt={g.cap} width={g.w} height={g.h} loading="lazy" decoding="async" />
                    </span>
                  </div>
                  <figcaption>{g.cap}</figcaption>
                </div>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ===== STATEMENT ===== */}
      <section className="lg-section lg-statement-sec">
        <div className="lg-wrap">
          <span className="lg-eyebrow" data-reveal>Our vision</span>
          <p className="lg-statement" data-statement aria-label={VISION}>
            {words.map((w, i) => (
              <span key={i} aria-hidden="true">
                <span className={`lg-w${keyIndex >= 0 && i >= keyIndex ? ' is-key' : ''}`}>{w}</span>{' '}
              </span>
            ))}
          </p>
          <span className="lg-note" data-reveal>young, rooted, and sent out.</span>
        </div>
      </section>

      {/* ===== FOLLOW ALONG ===== */}
      <section className="lg-section" id="updates">
        <div className="lg-wrap">
          <div className="lg-tiles-head" data-reveal>
            <div>
              <span className="lg-eyebrow">What is happening</span>
              <h2 className="lg-h2">Follow along</h2>
            </div>
            <p className="lg-lead" style={{ margin: 0 }}>Photos, recaps and announcements from Life Generation.</p>
          </div>
          <div className="lg-channels" data-reveal style={{ '--d': '0.1s' }}>
            {[
              { icon: FacebookIcon, name: 'Facebook', sub: 'Our official page', cta: 'Follow us', href: SOCIALS.facebook },
              { icon: FacebookIcon, name: 'Radical LED Calapan', sub: 'Youth leadership and campus movement', cta: 'Visit page', href: SOCIALS.radical },
              { icon: InstagramIcon, name: 'Instagram', sub: '@lifegencalapan', cta: 'Follow us', href: SOCIALS.instagram },
              { icon: TikTokIcon, name: 'TikTok', sub: '@life.generation7', cta: 'Watch', href: SOCIALS.tiktok },
            ].map(({ icon: Icon, name, sub, cta, href }) => (
              <a className="lg-channel" key={name} href={href} target="_blank" rel="noopener noreferrer">
                <span className="lg-channel-ico"><Icon size={26} /></span>
                <strong>{name}</strong>
                <span className="lg-channel-sub">{sub}</span>
                <span className="lg-channel-cta">{cta} <ArrowRight size={16} /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA (guests lang) ===== */}
      {!user && (
        <section className="lg-section lg-cta-band">
          <div className="lg-wrap">
            <h2 className="lg-h2" data-reveal>Ready for your next step?</h2>
            <p data-reveal style={{ '--d': '0.1s' }}>
              Become a member of Life Generation. It is free, and you can sign up in a minute.
            </p>
            <div className="lg-cta" data-reveal style={{ '--d': '0.2s' }}>
              <button type="button" className="lg-btn lg-btn-dark" onClick={openRegister}>
                Join Life Generation <ArrowRight size={18} />
              </button>
              <Link to="/login" className="lg-btn lg-btn-outline">
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      )}

    </main>
    <HomeFooter />
    </>
  )
}
