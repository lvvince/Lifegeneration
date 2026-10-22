import { API_URL } from '../api.js'

// Ginagawang buong link ang path ng image mula sa backend (hal. banner ng event).
// Kung may sarili nang resolveImageUrl ang team mo sa lib/format.js, pwede mo itong palitan sa Home.jsx.
export function resolveImageUrl(path) {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  return `${API_URL.replace(/\/+$/, '')}/${String(path).replace(/^\/+/, '')}`
}
