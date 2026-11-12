import { useState } from 'react'
import { X, Link2, Check, MessageCircle, Calendar, MapPin, Clock, Download, Share2, Copy } from 'lucide-react'
import { resolveImageUrl, fmtDate, to12h } from '../lib/format.js'

/**
 * ShareEventModal
 *
 * Shows an event preview card with multi-channel share options:
 * 1. Direct Facebook Sharer
 * 2. Copy Formatted Caption + Link (ready to paste in FB/Instagram post)
 * 3. Download Poster Photo (to attach high-res image directly on FB post)
 * 4. WhatsApp
 * 5. Copy Link
 * 6. Native Device Share (via Android/iOS share sheet)
 */
export default function ShareEventModal({ event, onClose }) {
  const [copiedLink, setCopiedLink]       = useState(false)
  const [copiedCaption, setCopiedCaption] = useState(false)

  if (!event) return null

  // ── Build share URLs ───────────────────────────────────────────────
  const origin = typeof window !== 'undefined' && window.location.origin
    ? window.location.origin
    : ''

  const isLocalhost = Boolean(origin.match(/localhost|127\.0\.0\.1/i))
  const apiBase = isLocalhost
    ? (import.meta.env.VITE_API_URL || 'http://localhost/LIFEGEN/backend/public').replace(/\/$/, '')
    : origin

  const ogUrl       = `${apiBase}/share/event/${event.id}`
  const eventPageUrl = `${origin}/events/${event.id}`
  const fbUrl       = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(ogUrl)}`

  const dateStr = event.event_date ? fmtDate(event.event_date) : ''
  const timeStr = event.event_time ? to12h(event.event_time) : ''
  const desc    = (event.description || '').replace(/<[^>]+>/g, '').trim()

  const captionText = [
    `🎟️ ${event.title}`,
    dateStr ? `📅 ${dateStr}${timeStr ? ' at ' + timeStr : ''}` : '',
    event.location ? `📍 ${event.location}` : '',
    desc ? `\n${desc}` : '',
    `\n👉 Reserve your spot & view details:\n${eventPageUrl}`,
  ].filter(Boolean).join('\n')

  const waUrl = `https://wa.me/?text=${encodeURIComponent(captionText)}`

  // ── Handlers ───────────────────────────────────────────────────────
  const openFacebook = () => {
    const w = 620, h = 520
    const l = Math.round(window.screen.width  / 2 - w / 2)
    const t = Math.round(window.screen.height / 2 - h / 2)
    window.open(fbUrl, 'fb_share', `width=${w},height=${h},top=${t},left=${l},toolbar=0,status=0,menubar=0,scrollbars=0,resizable=1`)
  }

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
  }

  const handleCopyLink = async () => {
    await copyText(ogUrl)
    setCopiedLink(true)
    setTimeout(() => setCopiedLink(false), 2200)
  }

  const handleCopyCaption = async () => {
    await copyText(captionText)
    setCopiedCaption(true)
    setTimeout(() => setCopiedCaption(false), 2200)
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: event.title, text: captionText, url: ogUrl }) }
      catch { /* user dismissed */ }
    }
  }

  const banner = resolveImageUrl(event.banner_image)

  const handleDownloadBanner = async () => {
    if (!banner) return
    try {
      const res  = await fetch(banner)
      const blob = await res.blob()
      const url  = window.URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `lifegen-${(event.title || 'event').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-banner.jpg`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch {
      window.open(banner, '_blank')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes sModalBg {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes sModalCard {
          from { opacity: 0; transform: scale(0.94) translateY(14px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);    }
        }
        .smodal-overlay {
          position: fixed; inset: 0; z-index: 9999;
          background: rgba(0,0,0,0.65);
          backdrop-filter: blur(6px);
          display: flex; align-items: center; justify-content: center;
          padding: 16px;
          animation: sModalBg 0.2s ease;
        }
        .smodal-card {
          background: var(--surface, #fff);
          border: 1px solid var(--card-border, rgba(0,0,0,0.08));
          border-radius: 20px;
          width: 100%;
          max-width: 440px;
          max-height: 92vh;
          overflow-y: auto;
          box-shadow: 0 24px 80px rgba(0,0,0,0.35);
          animation: sModalCard 0.24s cubic-bezier(.34,1.56,.64,1);
          scrollbar-width: none;
        }
        .smodal-card::-webkit-scrollbar { display: none; }

        /* Header */
        .smodal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 20px 14px;
          border-bottom: 1px solid var(--card-border, rgba(0,0,0,0.07));
          position: sticky; top: 0;
          background: var(--surface, #fff);
          z-index: 2;
          border-radius: 20px 20px 0 0;
        }
        .smodal-title {
          font-size: 1rem; font-weight: 700;
          color: var(--text, #0f172a);
          letter-spacing: -0.01em;
        }
        .smodal-close {
          background: var(--surface2, #f4f4f4);
          border: none; border-radius: 50%;
          width: 32px; height: 32px;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; color: var(--text-muted, #64748b);
          transition: background 0.15s, color 0.15s;
          flex-shrink: 0;
        }
        .smodal-close:hover {
          background: var(--orange, #f97316);
          color: #fff;
        }

        /* Preview card */
        .smodal-preview {
          margin: 16px 20px 0;
          border: 1px solid var(--card-border, rgba(0,0,0,0.08));
          border-radius: 14px;
          overflow: hidden;
          background: var(--surface2, #f8fafc);
        }
        .smodal-banner {
          width: 100%; height: 185px;
          object-fit: cover; display: block;
          background: var(--surface2, #f0f0f0);
        }
        .smodal-banner-placeholder {
          width: 100%; height: 110px;
          background: linear-gradient(135deg, var(--orange,#f97316) 0%, #ea580c 100%);
          display: flex; align-items: center; justify-content: center;
        }
        .smodal-info {
          padding: 14px 16px 16px;
        }
        .smodal-brand {
          font-size: 0.65rem; font-weight: 800;
          letter-spacing: 0.1em; text-transform: uppercase;
          color: var(--orange, #f97316);
          margin-bottom: 5px;
        }
        .smodal-event-title {
          font-size: 0.98rem; font-weight: 800;
          color: var(--text, #0f172a);
          line-height: 1.25;
          margin: 0 0 10px;
          text-transform: uppercase;
          letter-spacing: -0.01em;
        }
        .smodal-meta {
          display: flex; flex-direction: column; gap: 5px;
          margin-bottom: 10px;
        }
        .smodal-meta-row {
          display: flex; align-items: center; gap: 7px;
          font-size: 0.78rem; color: var(--text-muted, #475569);
          line-height: 1.3;
        }
        .smodal-meta-icon {
          color: var(--orange, #f97316);
          flex-shrink: 0;
        }
        .smodal-desc {
          font-size: 0.76rem;
          color: var(--text-dim, #64748b);
          line-height: 1.55;
          margin: 0;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Buttons section */
        .smodal-actions {
          padding: 16px 20px 22px;
          display: flex; flex-direction: column; gap: 9px;
        }

        /* Shared btn base */
        .smodal-btn {
          width: 100%;
          padding: 11px 16px;
          border-radius: 12px;
          font-size: 0.875rem; font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          border: none;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: transform 0.12s, box-shadow 0.12s, opacity 0.15s;
          letter-spacing: -0.01em;
          text-decoration: none;
          box-sizing: border-box;
        }
        .smodal-btn:active { transform: scale(0.97); }

        /* Facebook */
        .smodal-btn-fb {
          background: #1877F2;
          color: #fff;
          box-shadow: 0 4px 16px rgba(24,119,242,0.35);
        }
        .smodal-btn-fb:hover { opacity: 0.92; box-shadow: 0 6px 20px rgba(24,119,242,0.45); }

        /* Copy Caption — orange outlined */
        .smodal-btn-caption {
          background: transparent;
          color: var(--orange, #f97316);
          border: 1.5px solid var(--orange, #f97316);
        }
        .smodal-btn-caption:hover {
          background: rgba(249,115,22,0.07);
        }
        .smodal-btn-caption.copied {
          color: #16a34a;
          border-color: #86efac;
          background: rgba(74,222,128,0.07);
        }

        /* Save Poster — surface */
        .smodal-btn-poster {
          background: var(--surface2, #f8fafc);
          color: var(--text-muted, #475569);
          border: 1.5px solid var(--card-border, #e2e8f0);
        }
        .smodal-btn-poster:hover {
          background: var(--card-border, #e2e8f0);
          color: var(--text, #0f172a);
        }

        /* 2-col row */
        .smodal-row2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 9px;
        }

        /* WhatsApp */
        .smodal-btn-wa {
          background: #25D366;
          color: #fff;
          box-shadow: 0 3px 10px rgba(37,211,102,0.3);
          font-size: 0.84rem;
          padding: 10px 12px;
        }
        .smodal-btn-wa:hover { opacity: 0.9; }

        /* Copy Link */
        .smodal-btn-link {
          background: var(--surface2, #f4f4f4);
          color: var(--text, #334155);
          border: 1.5px solid var(--card-border, #e2e8f0);
          font-size: 0.84rem;
          padding: 10px 12px;
        }
        .smodal-btn-link:hover { background: var(--card-border, #e2e8f0); }
        .smodal-btn-link.copied {
          color: #16a34a;
          border-color: #86efac;
          background: rgba(74,222,128,0.07);
        }

        /* Native Share */
        .smodal-btn-native {
          background: transparent;
          color: var(--text-dim, #94a3b8);
          border: 1.5px dashed var(--card-border, #cbd5e1);
          font-size: 0.82rem;
          padding: 9px 16px;
        }
        .smodal-btn-native:hover {
          border-color: var(--orange, #f97316);
          color: var(--orange, #f97316);
        }

        /* Divider */
        .smodal-divider {
          display: flex; align-items: center; gap: 10px;
          color: var(--text-dim, #94a3b8);
          font-size: 0.72rem; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .smodal-divider::before,
        .smodal-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--card-border, rgba(0,0,0,0.08));
        }
      `}</style>

      <div
        className="smodal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Share this event"
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <div className="smodal-card">

          {/* ── Header ── */}
          <div className="smodal-header">
            <span className="smodal-title">Share this Event</span>
            <button className="smodal-close" onClick={onClose} aria-label="Close">
              <X size={15} />
            </button>
          </div>

          {/* ── Event preview card ── */}
          <div className="smodal-preview">
            {banner ? (
              <img
                className="smodal-banner"
                src={banner}
                alt={event.title}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            ) : (
              <div className="smodal-banner-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
                  <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                </svg>
              </div>
            )}

            <div className="smodal-info">
              <div className="smodal-brand">Life Generation Calapan</div>

              <h3 className="smodal-event-title">{event.title}</h3>

              <div className="smodal-meta">
                {event.event_date && (
                  <div className="smodal-meta-row">
                    <Calendar size={13} className="smodal-meta-icon" />
                    <span>
                      {fmtDate(event.event_date, { weekday: 'short', month: 'long', day: 'numeric', year: 'numeric' })}
                      {event.event_time && (
                        <>
                          &nbsp;
                          <Clock size={12} style={{ display: 'inline', verticalAlign: 'middle', color: 'var(--orange, #f97316)' }} />
                          &nbsp;{to12h(event.event_time)}
                        </>
                      )}
                    </span>
                  </div>
                )}
                {event.location && (
                  <div className="smodal-meta-row">
                    <MapPin size={13} className="smodal-meta-icon" />
                    <span>{event.location}</span>
                  </div>
                )}
              </div>

              {desc && (
                <p className="smodal-desc">{desc}</p>
              )}
            </div>
          </div>

          {/* ── Share buttons ── */}
          <div className="smodal-actions">

            {/* Facebook */}
            <button type="button" className="smodal-btn smodal-btn-fb" onClick={openFacebook}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
              </svg>
              Share on Facebook
            </button>

            {/* Copy Caption */}
            <button
              type="button"
              className={`smodal-btn smodal-btn-caption${copiedCaption ? ' copied' : ''}`}
              onClick={handleCopyCaption}
            >
              {copiedCaption ? <Check size={15} /> : <Copy size={15} />}
              {copiedCaption ? 'Caption & Link Copied!' : 'Copy Post Caption with Link'}
            </button>

            {/* Save Poster */}
            {banner && (
              <button type="button" className="smodal-btn smodal-btn-poster" onClick={handleDownloadBanner}>
                <Download size={15} />
                Save Poster Photo
              </button>
            )}

            {/* Divider */}
            <div className="smodal-divider">also share via</div>

            {/* WhatsApp + Copy Link */}
            <div className="smodal-row2">
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="smodal-btn smodal-btn-wa"
              >
                <MessageCircle size={15} />
                WhatsApp
              </a>

              <button
                type="button"
                className={`smodal-btn smodal-btn-link${copiedLink ? ' copied' : ''}`}
                onClick={handleCopyLink}
              >
                {copiedLink ? <Check size={14} /> : <Link2 size={14} />}
                {copiedLink ? 'Copied!' : 'Copy Link'}
              </button>
            </div>

            {/* Native Share */}
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className="smodal-btn smodal-btn-native" onClick={handleNativeShare}>
                <Share2 size={14} />
                More sharing options (Apps)...
              </button>
            )}

          </div>
        </div>
      </div>
    </>
  )
}
