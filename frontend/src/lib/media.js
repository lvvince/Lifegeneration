import { API_URL } from '../api.js'

// Ginagawang buong link ang path ng image mula sa backend (hal. banner ng event).
export function resolveImageUrl(path) {
  if (!path) return ''
  if (/ibb\.co/i.test(path)) {
    return `${API_URL.replace(/\/+$/, '')}/api/chat/media?url=${encodeURIComponent(path)}`
  }
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  return `${API_URL.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`
}
