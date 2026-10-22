import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, getUser } from '../api.js'
import GlassIcon from '../components/GlassIcon.jsx'
import { useAuthModal } from '../context/AuthModal.jsx'
import {
  Users, Calendar, HeartHandshake, MessageSquare,
  ArrowRight, Zap, Shield, ChevronRight, Flame
} from 'lucide-react'

export default function Home() {
  const [events, setEvents] = useState([])
  const [dgroups, setDgroups] = useState([])
  const [ministries, setMinistries] = useState([])
  const user = getUser()
  const { openRegister } = useAuthModal()

  useEffect(() => {
    apiGet('/api/events').then(data => Array.isArray(data) && setEvents(data.slice(0, 3))).catch(() => {})
    apiGet('/api/dgroups').then(data => Array.isArray(data) && setDgroups(data.slice(0, 3))).catch(() => {})
    apiGet('/api/ministries').then(data => Array.isArray(data) && setMinistries(data.slice(0, 3))).catch(() => {})
  }, [])

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="hero-section">
        <div className="hero-bg" />

        <div className="hero-content">
          <div className="hero-badge">
            <Zap size={14} />
            Life Generation Community
          </div>

          <h1 className="hero-title">
            A Place Where<br />
            <span style={{
              background: 'linear-gradient(135deg, #f97316, #3b82f6)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              Youth Belong.
            </span>
          </h1>

          <p className="hero-sub">
            An empowered generation that is able to inspire the community through their kindled passion in Christ.
          </p>

          <div className="hero-cta">
            {user ? (
              <Link to="/dashboard" className="btn">
                My Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <button type="button" className="btn" onClick={openRegister} style={{ width: 'auto', margin: 0 }}>
                  Join the Movement <ArrowRight size={16} />
                </button>
                <Link to="/login" className="btn-ghost">
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 6,
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.72rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          animation: 'bounce 2s infinite'
        }}>
          <style>{`
            @keyframes bounce {
              0%,100%{transform:translateX(-50%) translateY(0)}
              50%{transform:translateX(-50%) translateY(6px)}
            }
          `}</style>
          <ChevronRight style={{ transform: 'rotate(90deg)' }} size={18} />
        </div>
      </section>

      {/* ===== CONTENT BELOW HERO ===== */}
      <div className="home-content">

        {/* ===== OUR VISION ===== */}
        <div style={{
          textAlign: 'center',
          maxWidth: 820,
          margin: '0 auto 48px',
          padding: '36px 32px',
          background: 'var(--card)',
          border: '1px solid var(--card-border)',
          borderRadius: 20,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'var(--shadow)'
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: '20%',
            right: '20%',
            height: 3,
            background: 'linear-gradient(90deg, transparent, var(--orange), var(--blue), transparent)'
          }} />

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.14em',
            color: 'var(--orange)',
            marginBottom: 14
          }}>
            <Flame size={15} /> Our Vision
          </div>

          <blockquote style={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)',
            fontWeight: 600,
            lineHeight: 1.6,
            color: 'var(--text)',
            fontStyle: 'italic',
            margin: 0
          }}>
            &ldquo;An empowered generation that is able to inspire the community through their kindled passion in Christ.&rdquo;
          </blockquote>
        </div>

        {/* ===== FEATURE CARDS ===== */}
        <div className="section-label">
          <Zap size={14} /> What We Offer
        </div>

        <div className="feature-grid" style={{ marginTop: 20 }}>
          {/* D-Groups */}
          <div className="feature-card">
            <GlassIcon icon={Users} tint="#f97316" size={52} />
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>Discipleship Groups</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                Walk hand-in-hand with mentors and peers. Build lifelong bonds through weekly Bible study and prayer.
              </p>
            </div>
            <Link to="/dgroups" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.88rem',
              fontWeight: 700,
              color: 'var(--orange)',
              marginTop: 4
            }}>
              Explore D-Groups <ArrowRight size={14} />
            </Link>
          </div>

          {/* Ministries */}
          <div className="feature-card">
            <GlassIcon icon={HeartHandshake} tint="#3b82f6" size={52} />
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>Ministry Teams</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                Serve in worship, audio/visual, ushers, hospitality, creative outreach, or intercession teams.
              </p>
            </div>
            <Link to="/ministries" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#3b82f6',
              marginTop: 4
            }}>
              Find Your Ministry <ArrowRight size={14} />
            </Link>
          </div>

          {/* Prayer Wall */}
          <div className="feature-card">
            <GlassIcon icon={MessageSquare} tint="#a855f7" size={52} />
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>Prayer Wall</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                Post petitions for healing, direction, and breakthrough. Share testimonies when God moves.
              </p>
            </div>
            <Link to="/prayer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#a855f7',
              marginTop: 4
            }}>
              Visit Prayer Wall <ArrowRight size={14} />
            </Link>
          </div>

          {/* Events */}
          <div className="feature-card">
            <GlassIcon icon={Calendar} tint="#22c55e" size={52} />
            <div>
              <h3 style={{ fontSize: '1.15rem', marginBottom: 6 }}>Gatherings & Events</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.65 }}>
                Join life-changing services, youth nights, camps, and special encounters throughout the year.
              </p>
            </div>
            <Link to="/events" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              fontSize: '0.88rem',
              fontWeight: 700,
              color: '#22c55e',
              marginTop: 4
            }}>
              See Events <ArrowRight size={14} />
            </Link>
          </div>
        </div>

        {/* ===== UPCOMING EVENTS ===== */}
        {events.length > 0 && (
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div className="section-label">
                  <Calendar size={14} /> Upcoming Gatherings
                </div>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6 }}>
                  Don't Miss What's Next
                </h2>
              </div>
              <Link to="/events" className="btn-ghost" style={{
                padding: '8px 18px',
                fontSize: '0.85rem',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                color: 'var(--text-muted)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}>
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 16 }}>
              {events.map((ev, i) => (
                <div key={ev.id} style={{
                  background: 'var(--card)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 16,
                  padding: '22px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10,
                  transition: 'border-color 0.2s, transform 0.2s',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)'; e.currentTarget.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {/* Color stripe */}
                  <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    background: i === 0
                      ? 'linear-gradient(90deg, #f97316, #ea6000)'
                      : i === 1
                      ? 'linear-gradient(90deg, #3b82f6, #1d4ed8)'
                      : 'linear-gradient(90deg, #a855f7, #7c3aed)'
                  }} />

                  <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#fff', marginTop: 6 }}>
                    {ev.title}
                  </h4>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      <Calendar size={13} color="var(--orange)" />
                      {ev.event_date} &bull; {ev.event_time}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: '0.84rem', color: 'var(--text-muted)' }}>
                      <Shield size={13} color="var(--orange)" />
                      {ev.location}
                    </div>
                  </div>

                  <Link to={`/events/${ev.id}`} style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    color: 'var(--orange)',
                    marginTop: 4
                  }}>
                    Details & RSVP <ArrowRight size={13} />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== CTA BANNER ===== */}
        {!user && (
          <div style={{
            borderRadius: 22,
            padding: '48px 40px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(59,130,246,0.12) 100%)',
            border: '1px solid rgba(249,115,22,0.2)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{
              position: 'absolute',
              top: '-60px',
              right: '-60px',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(249,115,22,0.15), transparent 70%)'
            }} />
            <div style={{
              position: 'absolute',
              bottom: '-60px',
              left: '-60px',
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)'
            }} />

            <div style={{ position: 'relative', zIndex: 1 }}>
              <h2 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 10 }}>
                Ready to take your next step?
              </h2>
              <p style={{ color: 'var(--text-muted)', marginBottom: 28, maxWidth: 480, margin: '0 auto 28px' }}>
                Become an official member of Life Generation and start your journey with an amazing community.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={openRegister} style={{ width: 'auto', margin: 0 }}>
                  Join Life Generation <ArrowRight size={16} />
                </button>
                <Link to="/login" className="btn-ghost" style={{ borderRadius: 999 }}>
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}