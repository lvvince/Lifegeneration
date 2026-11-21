import { API_URL } from '../api.js'

export function parseDate(d) {
  if (!d) return null
  const [y, m, day] = String(d).slice(0, 10).split('-').map(Number)
  return y ? new Date(y, m - 1, day) : null
}

export function fmtDate(d, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  const x = parseDate(d)
  return x ? x.toLocaleDateString('en-PH', opts) : '—'
}

export function fmtDateTime(dt) {
  if (!dt) return '—'
  let s = String(dt).trim().replace(' ', 'T')
  if (!/[Z+-]\d*$/i.test(s) && !s.endsWith('Z')) s += 'Z'
  const x = new Date(s)
  if (isNaN(x)) return '—'
  return x.toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

export function isUpcoming(d) {
  const x = parseDate(d)
  if (!x) return false
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  return x >= t
}

// "14:30" -> "2:30 PM", or if already "2:30 PM" preserves "2:30 PM"
// Also supports ranges like "10:00 - 14:00" -> "10:00 AM - 2:00 PM"
export function to12h(v) {
  if (!v || typeof v !== 'string') return ''
  const trimmed = v.trim()
  if (!trimmed) return ''

  // Range support (e.g. "10:00 - 14:00", "10:00 AM - 2:00 PM", "10:00 to 14:00")
  if (/[-–—]|\bto\b/i.test(trimmed)) {
    const parts = trimmed.split(/\s*(?:[-–—]|\bto\b)\s*/i)
    if (parts.length >= 2) {
      const p1 = to12h(parts[0])
      const p2 = to12h(parts[1])
      if (p1 && p2) return `${p1} - ${p2}`
      return p1 || p2 || trimmed
    }
  }

  // Already 12-hour: e.g. "10:00 AM", "2:30 PM", "2:00pm"
  const ampmMatch = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(trimmed)
  if (ampmMatch) {
    let h = Number(ampmMatch[1])
    h = h % 12 || 12
    return `${h}:${ampmMatch[2]} ${ampmMatch[3].toUpperCase()}`
  }

  // 24-hour: e.g. "14:30", "09:00", "10:00"
  const m = /^(\d{1,2}):(\d{2})/.exec(trimmed)
  if (!m) return trimmed
  let h = Number(m[1])
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${ap}`
}

// "2:30 PM" -> "14:30", "10:00 AM" -> "10:00", "14:30" -> "14:30" (para sa <input type="time">)
export function to24h(v) {
  if (!v || typeof v !== 'string') return ''
  const trimmed = v.trim()
  if (!trimmed) return ''

  // If already 24h format "14:30" or "09:15" without AM/PM
  const match24 = /^(\d{1,2}):(\d{2})$/.exec(trimmed)
  if (match24) {
    const h = Number(match24[1])
    if (h >= 0 && h <= 23) {
      return `${String(h).padStart(2, '0')}:${match24[2]}`
    }
  }

  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec(trimmed)
  if (!m) return ''
  let h = Number(m[1])
  const ap = (m[3] || '').toUpperCase()
  if (ap === 'PM' && h < 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

// Parses "10:00 AM - 2:00 PM" into { start: "10:00", end: "14:00" } for time inputs
export function parseTimeRange(v) {
  if (!v || typeof v !== 'string') return { start: '', end: '' }
  const clean = v.trim()
  if (!clean) return { start: '', end: '' }

  const parts = clean.split(/\s*(?:[-–—]|\bto\b)\s*/i)
  if (parts.length >= 2) {
    return {
      start: to24h(parts[0]),
      end: to24h(parts[1]),
    }
  }
  return {
    start: to24h(clean),
    end: '',
  }
}

// Formats start and end times into "10:00 AM - 2:00 PM" or "10:00 AM"
export function formatEventTimeRange(start, end) {
  const s = to12h(start)
  const e = to12h(end)
  if (s && e) return `${s} - ${e}`
  return s || e || ''
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

export function fmtCurrency(amount) {
  const n = Number(amount) || 0
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Resolves local upload paths and external URLs into valid image sources.
 * Uses API_URL from api.js so there is only one backend base URL to maintain.
 * Proxies any ibb.co cloud URLs through our backend so Philippine ISPs won't block them.
 */
export function resolveImageUrl(path) {
  if (!path) return null
  if (/\/api\/chat\/media/i.test(path)) {
    return path
  }
  if (/ibb\.co/i.test(path)) {
    return `${API_URL.replace(/\/+$/, '')}/api/chat/media?url=${encodeURIComponent(path)}`
  }
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:') || path.startsWith('blob:')) {
    return path
  }
  return `${API_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`
}
