import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, getUser } from '../api.js'
import GlassIcon from '../components/GlassIcon.jsx'
import Footer, { FacebookIcon, InstagramIcon, TikTokIcon } from '../components/Footer.jsx'
import { shareEventOnFacebook } from '../utils/share.js'
import { resolveImageUrl } from '../lib/format.js'
import { useAuthModal } from '../context/AuthModal.jsx'
import {
  Users, Calendar, HeartHandshake, MessageSquare,
  ArrowRight, Zap, Shield, ChevronRight, Flame, Globe, ExternalLink, Share2
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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
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
      <div className="home-content" style={{ flex: 1 }}>

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

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24 }}>
              {events.map((ev, i) => (
                <div key={ev.id} style={{
                  background: 'var(--card)',
                  border: '1px solid var(--card-border)',
                  borderRadius: 18,
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                  position: 'relative',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow)'
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'; e.currentTarget.style.transform = 'translateY(-4px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  {/* Event Photo Banner / Pubmat */}
                  {ev.banner_image ? (
                    <div style={{ width: '100%', height: 210, overflow: 'hidden', position: 'relative', background: '#090d16' }}>
                      <img
                        src={resolveImageUrl(ev.banner_image)}
                        alt={ev.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.5) 100%)' }} />
                    </div>
                  ) : (
                    <div style={{
                      width: '100%',
                      height: 120,
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.15), rgba(59,130,246,0.15))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Calendar size={32} color="var(--orange)" style={{ opacity: 0.6 }} />
                    </div>
                  )}

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

                  <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', flex: 1, gap: 12 }}>
                    <h4 style={{ fontSize: '1.12rem', fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.35 }}>
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

                  {/* Actions row: Details & Facebook Share */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginTop: 'auto',
                    paddingTop: 14,
                    borderTop: '1px solid var(--border)'
                  }}>
                    <Link to={`/events/${ev.id}`} style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: 'var(--orange)'
                    }}>
                      Details & RSVP <ArrowRight size={13} />
                    </Link>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault()
                        shareEventOnFacebook(ev.id, ev.title)
                      }}
                      title="Share event on Facebook"
                      style={{
                        background: 'rgba(24, 119, 242, 0.12)',
                        border: '1px solid rgba(24, 119, 242, 0.3)',
                        color: '#38bdf8',
                        padding: '5px 11px',
                        borderRadius: 8,
                        fontSize: '0.78rem',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = '#1877F2'
                        e.currentTarget.style.color = '#fff'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'rgba(24, 119, 242, 0.12)'
                        e.currentTarget.style.color = '#38bdf8'
                      }}
                    >
                      <FacebookIcon size={13} color="currentColor" /> Share
                    </button>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SOCIAL FEEDS & FACEBOOK PAGE PLUGIN ===== */}
        <div style={{ marginBottom: 54 }}>
          <div style={{ marginBottom: 20 }}>
            <div className="section-label">
              <Globe size={14} /> Official Social Channels
            </div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginTop: 6, marginBottom: 8 }}>
              Stay Connected with the Community
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: 640 }}>
              Follow our official feeds to catch live updates, youth encounters, stories, and inspiring messages from Life Generation Calapan.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 24,
            alignItems: 'start'
          }}>
            {/* Left: Facebook Page Plugin */}
            <div style={{
              background: 'var(--card)',
              border: '1px solid var(--card-border)',
              borderRadius: 20,
              padding: '22px',
              boxShadow: 'var(--shadow)',
              overflow: 'hidden'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                paddingBottom: 14,
                borderBottom: '1px solid rgba(255,255,255,0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: '#1877F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff'
                  }}>
                    <FacebookIcon size={20} color="#fff" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: '#fff' }}>
                      Life Generation Calapan
                    </h4>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Official Facebook Page</span>
                  </div>
                </div>

                <a
                  href="https://www.facebook.com/life.generation.calapan"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn"
                  style={{
                    fontSize: '0.78rem',
                    padding: '6px 14px',
                    borderRadius: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    width: 'auto',
                    margin: 0
                  }}
                >
                  Follow Page <ExternalLink size={12} />
                </a>
              </div>

              {/* Responsive Facebook Page Embed */}
              <div style={{
                width: '100%',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#0d1117'
              }}>
                <iframe
                  src="https://www.facebook.com/plugins/page.php?href=https%3A%2F%2Fwww.facebook.com%2Flife.generation.calapan&tabs=timeline&width=500&height=400&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId"
                  width="100%"
                  height="400"
                  style={{ border: 'none', overflow: 'hidden', display: 'block' }}
                  scrolling="no"
                  frameBorder="0"
                  allowFullScreen={true}
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                  title="Life Generation Calapan Facebook Page"
                />
              </div>
            </div>

            {/* Right: Social Media Spotlight Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Radical LED Calapan Card */}
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--card-border)',
                borderRadius: 18,
                padding: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 4,
                  bottom: 0,
                  background: 'linear-gradient(180deg, #00C6FF, #0072FF)'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(0,198,255,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FacebookIcon size={19} color="#00C6FF" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                        Radical LED Calapan
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#38bdf8' }}>Youth Leadership & Campus Movement</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: 'rgba(0,198,255,0.12)',
                    color: '#00C6FF',
                    padding: '3px 8px',
                    borderRadius: 12
                  }}>
                    Movement
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '8px 0 14px' }}>
                  Join the radical generation of student leaders, campus disciples, and empowered youth advancing God's kingdom across Calapan!
                </p>

                <a
                  href="https://www.facebook.com/radicalledcalapan"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#00C6FF',
                    textDecoration: 'none'
                  }}
                >
                  Visit Radical LED Facebook <ArrowRight size={13} />
                </a>
              </div>

              {/* Instagram Card */}
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--card-border)',
                borderRadius: 18,
                padding: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 4,
                  bottom: 0,
                  background: 'linear-gradient(180deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(228,64,95,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <InstagramIcon size={19} color="#E4405F" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                        @lifegencalapan
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#f472b6' }}>Instagram Highlights</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: 'rgba(228,64,95,0.12)',
                    color: '#E4405F',
                    padding: '3px 8px',
                    borderRadius: 12
                  }}>
                    Photos & Reels
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '8px 0 14px' }}>
                  Behind-the-scenes moments, Sunday service highlights, youth camp recaps, and weekly photo drops.
                </p>

                <a
                  href="https://www.instagram.com/lifegencalapan?psln=ZDNlZDc0MzIxNw=="
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#E4405F',
                    textDecoration: 'none'
                  }}
                >
                  Follow on Instagram <ArrowRight size={13} />
                </a>
              </div>

              {/* TikTok Card */}
              <div style={{
                background: 'var(--card)',
                border: '1px solid var(--card-border)',
                borderRadius: 18,
                padding: '20px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: 4,
                  bottom: 0,
                  background: 'linear-gradient(180deg, #25F4EE, #FE2C55)'
                }} />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: 'rgba(37,244,238,0.12)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <TikTokIcon size={19} color="#25F4EE" />
                    </div>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 700, color: '#fff' }}>
                        @life.generation7
                      </h4>
                      <span style={{ fontSize: '0.74rem', color: '#2dd4bf' }}>TikTok Community</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    background: 'rgba(37,244,238,0.12)',
                    color: '#25F4EE',
                    padding: '3px 8px',
                    borderRadius: 12
                  }}>
                    Shorts & Clips
                  </span>
                </div>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.55, margin: '8px 0 14px' }}>
                  Short inspiring sermon clips, funny youth group moments, and worship snippets on TikTok!
                </p>

                <a
                  href="https://www.tiktok.com/@life.generation7?is_from_webapp=1&sender_device=pc"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: '#2dd4bf',
                    textDecoration: 'none'
                  }}
                >
                  Watch on TikTok <ArrowRight size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>

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

      {/* ===== GLOBAL FOOTER ===== */}
      <Footer />
    </div>
  )
}
