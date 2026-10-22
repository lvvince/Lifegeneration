import { Link } from 'react-router-dom'
import { Calendar, Users, HeartHandshake, MessageSquare, MapPin, Heart, ExternalLink } from 'lucide-react'

export function FacebookIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export function InstagramIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export function TikTokIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.298-.002.595.042.88.13V9.4a6.33 6.33 0 0 0-1-.08A6.34 6.34 0 0 0 3 15.66a6.34 6.34 0 0 0 10.82 4.49 6.27 6.27 0 0 0 1.93-4.48V8.71a8.28 8.28 0 0 0 4.84 1.55v-3.57h-.001z" />
    </svg>
  )
}

export default function Footer() {
  const currentYear = new Date().getFullYear()

  const socials = [
    {
      name: 'Life Generation Calapan',
      handle: 'Facebook Page',
      url: 'https://www.facebook.com/life.generation.calapan',
      icon: <FacebookIcon size={18} color="#1877F2" />,
      tag: 'Official'
    },
    {
      name: 'Radical LED Calapan',
      handle: 'Youth Movement',
      url: 'https://www.facebook.com/radicalledcalapan',
      icon: <FacebookIcon size={18} color="#00C6FF" />,
      tag: 'Youth'
    },
    {
      name: '@lifegencalapan',
      handle: 'Instagram',
      url: 'https://www.instagram.com/lifegencalapan?psln=ZDNlZDc0MzIxNw==',
      icon: <InstagramIcon size={18} color="#E4405F" />,
      tag: 'Photos & Stories'
    },
    {
      name: '@life.generation7',
      handle: 'TikTok',
      url: 'https://www.tiktok.com/@life.generation7?is_from_webapp=1&sender_device=pc',
      icon: <TikTokIcon size={18} color="#25F4EE" />,
      tag: 'Reels'
    }
  ]

  return (
    <footer style={{
      marginTop: 80,
      background: 'rgba(10, 10, 15, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
      color: 'var(--text)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top subtle gradient glow */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: '10%',
        right: '10%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(249,115,22,0.5), rgba(59,130,246,0.5), transparent)'
      }} />

      <div style={{
        maxWidth: 1140,
        margin: '0 auto',
        padding: '60px 24px 30px',
      }}>
        {/* Main Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 40,
          marginBottom: 48
        }}>
          {/* Column 1: Brand & Mission */}
          <div>
            <Link to="/" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              textDecoration: 'none',
              color: '#fff',
              fontSize: '1.25rem',
              fontWeight: 800,
              marginBottom: 14
            }}>
              <img
                src="/logo.png"
                alt="Life Generation"
                style={{ width: 36, height: 36, objectFit: 'contain' }}
              />
              <span>Life<span style={{ color: '#f97316' }}>Gen</span> Calapan</span>
            </Link>

            <p style={{
              fontSize: '0.88rem',
              color: 'var(--text-muted)',
              lineHeight: 1.65,
              marginBottom: 16
            }}>
              An empowered generation that is able to inspire the community through their kindled passion in Christ.
            </p>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.82rem',
              color: 'var(--text-muted)'
            }}>
              <MapPin size={15} color="#f97316" />
              <span>Calapan City, Oriental Mindoro</span>
            </div>
          </div>

          {/* Column 2: Navigation Links */}
          <div>
            <h4 style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#fff',
              marginBottom: 16
            }}>
              Quick Navigation
            </h4>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <li>
                <Link to="/events" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Calendar size={14} /> Gatherings & Events
                </Link>
              </li>
              <li>
                <Link to="/dgroups" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <Users size={14} /> Discipleship Groups (D-Groups)
                </Link>
              </li>
              <li>
                <Link to="/ministries" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <HeartHandshake size={14} /> Ministry Volunteer
                </Link>
              </li>
              <li>
                <Link to="/prayer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.88rem',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.color = '#f97316'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                  <MessageSquare size={14} /> Prayer Wall & Testimonies
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Connect & Social Media */}
          <div>
            <h4 style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#fff',
              marginBottom: 16
            }}>
              Official Social Media
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {socials.map((s, i) => (
                <a
                  key={i}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '9px 12px',
                    borderRadius: 10,
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    textDecoration: 'none',
                    color: '#fff',
                    transition: 'all 0.2s',
                    fontSize: '0.85rem'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.4)'
                    e.currentTarget.style.transform = 'translateX(3px)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'
                    e.currentTarget.style.transform = 'translateX(0)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center' }}>{s.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.86rem' }}>{s.name}</div>
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{s.handle}</div>
                    </div>
                  </div>
                  <ExternalLink size={13} color="rgba(255,255,255,0.4)" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div style={{
          paddingTop: 24,
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <div>
            &copy; {currentYear} <span style={{ color: '#fff', fontWeight: 600 }}>Life Generation Calapan</span>. All rights reserved.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Built with</span>
            <Heart size={13} color="#ef4444" fill="#ef4444" />
            <span>for the youth of Calapan City</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
