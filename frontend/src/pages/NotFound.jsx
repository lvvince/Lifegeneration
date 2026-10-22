import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div style={{ padding: '72px 16px', textAlign: 'center' }}>
      <p style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        404
      </p>
      <h1 style={{ fontSize: 26, margin: '8px 0 6px' }}>Page not found</h1>
      <p style={{ marginBottom: 18 }}>The page you are looking for does not exist or was moved.</p>
      <Link to="/" style={{ fontWeight: 600 }}>
        Go to home
      </Link>
    </div>
  )
}
