import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, MapPin, Users, HeartHandshake, MessageSquare,
  BookOpen, Music, Flame, HandCoins, ShieldCheck, Tent,
} from 'lucide-react'
import { apiGet, getUser } from '../api.js'
import { useAuthModal } from '../context/AuthModal.jsx'
import { resolveImageUrl } from '../lib/media.js'
import { useHomeMotion } from '../components/home/motion.js'
import HomeFooter from '../components/home/HomeFooter.jsx'
import { SOCIALS } from '../components/home/SocialIcons.jsx'
import '../styles/home.css'
import '../styles/home-extra.css'
import '../styles/home3.css'
import '../styles/home4.css'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
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

const USES = [
  { icon: Flame, t: 'Youth nights', d: 'Worship, sound and venue.' },
  { icon: Tent, t: 'Camps', d: 'Retreats and leadership camps.' },
  { icon: HeartHandshake, t: 'Outreach', d: 'Serving the community.' },
  { icon: BookOpen, t: 'Discipleship', d: 'D-Group materials and training.' },
]

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
        <div className="lg-hero-media" data-parallax="0.22" aria-hidden="true">
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
                  <Link to={user.role === 'admin' ? '/admin' : (user.role === 'officer' ? '/officer' : '/dashboard')} className="lg-btn lg-btn-primary">
                    {user.role === 'admin' ? 'Open admin' : (user.role === 'officer' ? 'Officer portal' : 'My profile')} <ArrowRight size={18} />
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

      {/* ===== EVENTS ===== */}
      <section className="lg-section lg-evs" id="gatherings" aria-labelledby="evs-h">
        <div className="lg-wrap">
          <header className="lg-evs-head" data-reveal>
            <h2 id="evs-h">Events</h2>
            <p>Youth nights, meetings and special gatherings throughout the year. Register so we can save you a spot.</p>
          </header>
          <div className="lg-evs-sub" data-reveal>
            <h3>Upcoming events</h3>
            <Link to="/events">See all events <ArrowRight size={16} aria-hidden="true" /></Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="lg-empty" data-reveal>
              {loaded ? 'No gatherings are posted right now. Follow our Facebook page to hear about the next one.' : 'Loading gatherings…'}
              {loaded && <> <a href={SOCIALS.facebook} target="_blank" rel="noopener noreferrer">Open Facebook</a></>}
            </p>
          ) : (
            <ul className="lg-evs-grid">
              {upcoming.map((ev, i) => {
                const d = parseDate(ev.event_date)
                const photo = resolveImageUrl(ev.banner_image) || `/images/gallery-${(i % 5) + 1}.webp`
                return (
                  <li className="lg-evc" key={ev.id} data-reveal style={{ '--d': `${i * 0.08}s` }}>
                    <Link to={`/events/${ev.id}`} className="lg-evc-top">
                      <h4>{ev.title}</h4>
                      <span className="lg-evc-when">
                        <span className="lg-evc-day">{d.getDate()}</span>
                        <span className="lg-evc-my"><b>{MONTH_SHORT[d.getMonth()]}</b><small>{DOW[d.getDay()]}{ev.event_time ? ` · ${ev.event_time}` : ''}</small></span>
                      </span>
                      {ev.location && <span className="lg-evc-loc"><MapPin size={14} aria-hidden="true" /> {ev.location}</span>}
                    </Link>
                    <Link to={`/events/${ev.id}`} className="lg-evc-img" tabIndex={-1} aria-hidden="true">
                      <img src={photo} alt="" loading="lazy" decoding="async" draggable="false" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = `/images/gallery-${(i % 5) + 1}.webp` }} />
                    </Link>
                    <div className="lg-evc-bar">
                      {user ? (
                        <Link to={`/events/${ev.id}`} className="lg-evc-a">Register</Link>
                      ) : (
                        <button type="button" className="lg-evc-a" onClick={openRegister}>Register</button>
                      )}
                      <Link to={`/events/${ev.id}`} className="lg-evc-a">More info</Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
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
      <section className="lg-section lg-moments" id="moments" aria-labelledby="mom-h">
        <div className="lg-wrap">
          <header className="lg-moments-head" data-reveal>
            <h2 id="mom-h">Moments together</h2>
            <p>A few snapshots from our gatherings.</p>
          </header>
          <div className="lg-collage">
            {GALLERY.map((g, i) => (
              <figure className={`lg-cp lg-cp-${i + 1}`} key={g.img} data-reveal style={{ '--d': `${i * 0.07}s` }}>
                <img src={`/images/${g.img}.webp`} alt={g.cap} width={g.w} height={g.h} loading="lazy" decoding="async" draggable="false" />
                <figcaption>{g.cap}</figcaption>
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

      {/* ===== GIVE ===== */}
      <section className="lg-section lg-give" id="give" aria-labelledby="give-h">
        <span className="lg-give-ring" data-parallax="-0.08" aria-hidden="true" />
        <div className="lg-wrap lg-give-grid">
          <div data-reveal>
            <span className="lg-eyebrow">Giving</span>
            <h2 className="lg-h2" id="give-h">Give from<br />the heart</h2>
            <p className="lg-lead">There is no required amount here. Whatever you place in the offering, big or small, helps fund youth nights, camps, outreach and discipleship in Calapan, and it is received with gratitude.</p>
            <ul className="lg-uses">
              {USES.map(({ icon: Icon, t, d }) => (
                <li key={t}><span><Icon size={20} aria-hidden="true" /></span><div><b>{t}</b><small>{d}</small></div></li>
              ))}
            </ul>
          </div>

          <div className="lg-give-card" data-reveal style={{ '--d': '0.1s' }}>
            <blockquote className="lg-give-verse">
              <HeartHandshake size={22} aria-hidden="true" />
              <p>“Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver.”</p>
              <cite>2 Corinthians 9:7</cite>
            </blockquote>
            <ol className="lg-give-steps">
              <li><b>Choose a way</b><span>GCash, Maya or bank transfer.</span></li>
              <li><b>Send and submit</b><span>Fill the short form with your reference number.</span></li>
              <li><b>We confirm</b><span>An officer verifies it and your code shows the status.</span></li>
            </ol>
            <div className="lg-give-row">
              <Link to="/give" className="lg-btn lg-btn-primary lg-give-go">
                <HandCoins size={18} aria-hidden="true" /> Give as you are led
              </Link>
              <span className="lg-give-note"><ShieldCheck size={16} aria-hidden="true" /> Checked by our officers</span>
            </div>
            <p className="lg-give-policy">
              By giving you agree to our <Link to="/giving-policy">Giving policy</Link>. See also our <Link to="/privacy">Privacy policy</Link>.
            </p>
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
