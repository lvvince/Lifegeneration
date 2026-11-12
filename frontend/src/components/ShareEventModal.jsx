import { useState } from 'react'
import { X, Link2, Check, MessageCircle, Calendar, MapPin, Clock } from 'lucide-react'
import { resolveImageUrl, fmtDate, to12h } from '../lib/format.js'

/**
 * ShareEventModal
 *
 * Shows a beautiful event preview card with share options.
 * Works on localhost AND in production — data comes from our
 * own React state, no Facebook crawler required.
 *
 * Props:
 *   event   – the event object (must have id, title, description, banner_image, event_date, event_time, location)
 *   onClose – callback to close the modal
 */
export default function ShareEventModal({ event, onClose }) {
  const [copied, setCopied] = useState(false)

  if (!event) return null

  // ── Build share URLs ───────────────────────────────────────────────
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : ''

  // Local dev (Laragon) uses the LavaLust subfolder; Production (Render) uses root origin
  const isLocalhost = Boolean(origin.match(/localhost|127\.0\.0\.1/i))
  const apiBase = isLocalhost
    ? (import.meta.env.VITE_API_URL || 'http://localhost/LIFEGEN/backend/public').replace(/\/$/, '')
    : origin

  // Backend OG page — FB crawler fetches Open Graph meta tags (title, image, desc)
  const ogUrl = `${apiBase}/share/event/${event.id}`

  // Facebook sharer
  const fbUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogUrl)}`

  // WhatsApp
  const desc = (event.description || '').replace(/<[^>]+>/g, '').slice(0, 140)
  const waText = encodeURIComponent(
    `🙌 *${event.title}*\n${desc}${desc.length >= 140 ? '…' : ''}\n\n📅 ${fmtDate(event.event_date)}${event.event_time ? ' at ' + to12h(event.event_time) : ''}${event.location ? '\n📍 ' + event.location : ''}\n\n${ogUrl}`
  )
  const waUrl = `https://wa.me/?text=${waText}`

  // ── Handlers ───────────────────────────────────────────────────────
  const openFacebook = () => {
    const w = 620, h = 520
    const l = Math.round(window.screen.width  / 2 - w / 2)
    const t = Math.round(window.screen.height / 2 - h / 2)
    window.open(fbUrl, 'fb_share', `width=${w},height=${h},top=${t},left=${l},toolbar=0,status=0,menubar=0,scrollbars=0,resizable=1`)
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(ogUrl)
    } catch {
      // fallback for older browsers
      const ta = document.createElement('textarea')
      ta.value = ogUrl
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2200)
  }

  const banner = resolveImageUrl(event.banner_image)

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share this event"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(3px)',
      }}
    >
      <div style={{
        background: '#fff',
        borderRadius: 16,
        width: '100%',
        maxWidth: 440,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        overflow: 'hidden',
        animation: 'shareModalIn 0.22s ease',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px 12px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1a1a1a' }}>
            Share this Event
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: '#f4f4f4', border: 'none', borderRadius: '50%',
              width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#555', transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#e8e8e8'}
            onMouseLeave={e => e.currentTarget.style.background = '#f4f4f4'}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Event preview card ── */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            border: '1px solid #e8e8e8',
            borderRadius: 12,
            overflow: 'hidden',
            background: '#fafafa',
          }}>
            {/* Banner image */}
            {banner && (
              <div style={{ width: '100%', height: 180, overflow: 'hidden', background: '#f0f0f0' }}>
                <img
                  src={banner}
                  alt={event.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  onError={e => { e.currentTarget.style.display = 'none' }}
                />
              </div>
            )}

            {/* Event details */}
            <div style={{ padding: '14px 16px' }}>
              <div style={{
                fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em',
                color: '#e55a00', textTransform: 'uppercase', marginBottom: 6,
              }}>
                Life Generation Calapan
              </div>
              <h3 style={{
                margin: '0 0 8px', fontSize: '1rem', fontWeight: 700,
                color: '#1a1a1a', lineHeight: 1.3,
              }}>
                {event.title}
              </h3>

              {/* Meta row */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                {event.event_date && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#555' }}>
                    <Calendar size={13} style={{ color: '#e55a00', flexShrink: 0 }} />
                    {fmtDate(event.event_date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                    {event.event_time && (
                      <> &nbsp;<Clock size={13} style={{ color: '#e55a00', flexShrink: 0 }} /> {to12h(event.event_time)}</>
                    )}
                  </span>
                )}
                {event.location && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: '#555' }}>
                    <MapPin size={13} style={{ color: '#e55a00', flexShrink: 0 }} />
                    {event.location}
                  </span>
                )}
              </div>

              {/* Description snippet */}
              {event.description && (
                <p style={{
                  margin: 0, fontSize: '0.78rem', color: '#666',
                  lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical', overflow: 'hidden',
                }}>
                  {event.description.replace(/<[^>]+>/g, '')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Share buttons ── */}
        <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Facebook */}
          <button
            onClick={openFacebook}
            style={{
              width: '100%', padding: '11px 16px',
              background: '#1877F2', color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              boxShadow: '0 4px 14px rgba(24,119,242,0.3)',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            {/* Facebook F icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
            </svg>
            Share on Facebook
          </button>

          {/* WhatsApp */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%', padding: '11px 16px',
              background: '#25D366', color: '#fff',
              border: 'none', borderRadius: 10,
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(37,211,102,0.3)',
              transition: 'opacity 0.15s',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            <MessageCircle size={18} />
            Share on WhatsApp
          </a>

          {/* Copy link */}
          <button
            onClick={copyLink}
            style={{
              width: '100%', padding: '11px 16px',
              background: copied ? '#f0fdf4' : '#f5f5f5',
              color: copied ? '#16a34a' : '#333',
              border: `1.5px solid ${copied ? '#bbf7d0' : '#e0e0e0'}`,
              borderRadius: 10,
              fontSize: '0.9rem', fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
              transition: 'all 0.2s',
            }}
          >
            {copied ? <Check size={16} /> : <Link2 size={16} />}
            {copied ? 'Link copied!' : 'Copy event link'}
          </button>
        </div>
      </div>

      {/* animation keyframe */}
      <style>{`
        @keyframes shareModalIn {
          from { opacity: 0; transform: scale(0.93) translateY(10px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
      `}</style>
    </div>
  )
}

