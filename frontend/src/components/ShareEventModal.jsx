import { useEffect, useRef, useState } from 'react'
import { X, Link2, Check, MessageCircle, MapPin, Clock, Download, Share2, Copy } from 'lucide-react'
import '../styles/share.css'
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

  const closeRef = useRef(null)
  useEffect(() => {
    if (!event) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    closeRef.current?.focus()
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [event, onClose])

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
  const d = event.event_date ? new Date(`${String(event.event_date).slice(0, 10)}T00:00:00`) : null
  const valid = d && !Number.isNaN(d.getTime())
  const canNative = typeof navigator !== 'undefined' && !!navigator.share

  return (
    <div className="sh-overlay" role="dialog" aria-modal="true" aria-labelledby="sh-title" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="sh-sheet">
        <span className="sh-grab" aria-hidden="true" />
        <header className="sh-head">
          <div>
            <span className="sh-kicker">Spread the word</span>
            <h2 id="sh-title">Share this event</h2>
          </div>
          <button ref={closeRef} type="button" className="sh-x" onClick={onClose} aria-label="Close"><X size={18} /></button>
        </header>

        <div className="sh-body">
          <article className="sh-ticket">
            {banner && <img className="sh-banner" src={banner} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none' }} />}
            <div className="sh-ev">
              {valid && (
                <span className="sh-date" aria-hidden="true">
                  <b>{d.getDate()}</b>
                  <small>{d.toLocaleString('en', { month: 'short' })}</small>
                </span>
              )}
              <div className="sh-ev-t">
                <h3>{event.title}</h3>
                <p>
                  {timeStr && <span><Clock size={13} aria-hidden="true" />{timeStr}</span>}
                  {event.location && <span><MapPin size={13} aria-hidden="true" />{event.location}</span>}
                </p>
              </div>
            </div>
          </article>

          <button type="button" className="sh-fb" onClick={openFacebook}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.236 2.686.236v2.97h-1.513c-1.491 0-1.956.93-1.956 1.886v2.267h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z" /></svg>
            Post on Facebook
          </button>

          <p className="sh-or"><span>or send it another way</span></p>

          <div className="sh-grid" role="group" aria-label="Other ways to share">
            <a className="sh-tile is-wa" href={waUrl} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={22} aria-hidden="true" /><b>WhatsApp</b><small>Send a message</small>
            </a>
            <button type="button" className={`sh-tile${copiedLink ? ' is-done' : ''}`} onClick={handleCopyLink}>
              {copiedLink ? <Check size={22} aria-hidden="true" /> : <Link2 size={22} aria-hidden="true" />}
              <b>{copiedLink ? 'Copied' : 'Copy link'}</b><small>Share anywhere</small>
            </button>
            <button type="button" className={`sh-tile${copiedCaption ? ' is-done' : ''}`} onClick={handleCopyCaption}>
              {copiedCaption ? <Check size={22} aria-hidden="true" /> : <Copy size={22} aria-hidden="true" />}
              <b>{copiedCaption ? 'Copied' : 'Copy caption'}</b><small>Text and link</small>
            </button>
            {banner ? (
              <button type="button" className="sh-tile" onClick={handleDownloadBanner}>
                <Download size={22} aria-hidden="true" /><b>Save poster</b><small>For your post</small>
              </button>
            ) : canNative ? (
              <button type="button" className="sh-tile" onClick={handleNativeShare}>
                <Share2 size={22} aria-hidden="true" /><b>More apps</b><small>Phone share menu</small>
              </button>
            ) : null}
          </div>

          {banner && canNative && (
            <button type="button" className="sh-more" onClick={handleNativeShare}><Share2 size={16} aria-hidden="true" />More apps on your phone</button>
          )}
        </div>
      </div>
    </div>
  )
}
