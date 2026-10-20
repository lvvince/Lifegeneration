import { Link } from 'react-router-dom'

export default function ComingSoon({ title = 'This page' }) {
  return (
    <div className="container">
      <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
        <h1>{title}</h1>
        <p className="muted">Coming soon. This feature is planned for a later phase.</p>
        <Link to="/">Back to Home</Link>
      </div>
    </div>
  )
}