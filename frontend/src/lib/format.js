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
  const x = new Date(String(dt).replace(' ', 'T'))
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

// "14:30" -> "2:30 PM"
export function to12h(v) {
  const m = /^(\d{1,2}):(\d{2})/.exec(v || '')
  if (!m) return ''
  let h = Number(m[1])
  const ap = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m[2]} ${ap}`
}

// "2:30 PM" -> "14:30"  (para sa <input type="time">)
export function to24h(v) {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i.exec((v || '').trim())
  if (!m) return ''
  let h = Number(m[1])
  const ap = (m[3] || '').toUpperCase()
  if (ap === 'PM' && h < 12) h += 12
  if (ap === 'AM' && h === 12) h = 0
  return `${String(h).padStart(2, '0')}:${m[2]}`
}

export function initials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase()
}

/**
 * Resolves local upload paths and external URLs into valid image sources
 */
export function resolveImageUrl(path) {
  if (!path) return null
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path
  }
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/+$/, '')
    : 'http://localhost/LIFEGEN/backend/public'
  return `${base}/${path.replace(/^\/+/, '')}`
}
