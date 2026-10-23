import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { API_URL, apiGet, apiPost, getUser } from '../api.js'
import {
  CheckCircle, Clock, HeartHandshake, X, Users, Mic2,
  Monitor, UserCheck, Globe, Music, Star, Megaphone,
  Camera, Headphones, Tent, Brush, ChevronRight
} from 'lucide-react'
import '../styles/pages.css'

/* Map icon name stored in DB → Lucide component */
const ICON_MAP = {
  mic2: Mic2,
  monitor: Monitor,
  usercheck: UserCheck,
  globe: Globe,
  music: Music,
  star: Star,
  megaphone: Megaphone,
  camera: Camera,
  headphones: Headphones,
  tent: Tent,
  brush: Brush,
  hearthandshake: HeartHandshake,
  users: Users,
}

function MinistryIcon({ name, size = 28 }) {
  const key = (name || '').toLowerCase().replace(/[^a-z]/g, '')
  const Icon = ICON_MAP[key] || Star
  return <Icon size={size} strokeWidth={1.75} />
}

function getImageUrl(image) {
  if (!image) return null
  if (image.startsWith('http')) return image
  return `${API_URL}/${image}`
}

export default function Ministries() {
  const [ministries, setMinistries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [applyingMinistry, setApplyingMinistry] = useState(null)
  const [motivation, setMotivation] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const user = getUser()

  const fetchMinistries = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/ministries')
      setMinistries(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load ministries.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchMinistries() }, [])

  const handleOpenApply = (min) => {
    setApplyingMinistry(min)
    setMotivation('')
    setError('')
    setSuccessMsg('')
  }

  const handleSubmitApplication = async (e) => {
    e.preventDefault()
    if (!applyingMinistry) return
    setSubmitting(true)
    setError('')
    try {
      const res = await apiPost('/api/ministries/apply', {
        ministry_id: applyingMinistry.id,
        message: motivation.trim()
      })
      setSuccessMsg(res.message || 'Application submitted!')
      setApplyingMinistry(null)
      fetchMinistries()
    } catch (err) {
      setError(err.message || 'Failed to submit application.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelApplication = async (minId) => {
    try {
      await apiPost('/api/ministries/cancel', { ministry_id: minId })
      setSuccessMsg('Application cancelled.')
      fetchMinistries()
    } catch (err) {
      setError(err.message || 'Failed to cancel application.')
    }
  }

  return (
    <div className="min-vol-page pg-root">
      {/* ── Hero ── */}
      <div className="min-vol-hero">
        <div className="min-vol-hero-badge">
          <Star size={13} />
          <span>Volunteer Opportunities</span>
        </div>
        <h1 className="min-vol-hero-title">Join Our Event Teams</h1>
        <p className="min-vol-hero-sub">
          Bring your talents, energy, and passion to the events that shape our community.
          Choose a team, apply in seconds, and make every event unforgettable.
        </p>
        <div className="min-vol-hero-stats">
          <div className="min-vol-stat">
            <strong>{ministries.reduce((s, m) => s + (m.volunteer_count || 0), 0)}</strong>
            <span>Active Volunteers</span>
          </div>
          <div className="min-vol-stat-divider" />
          <div className="min-vol-stat">
            <strong>{ministries.length}</strong>
            <span>Teams Available</span>
          </div>
          <div className="min-vol-stat-divider" />
          <div className="min-vol-stat">
            <strong>{ministries.reduce((s, m) => s + (m.slots_available || 0), 0) || '∞'}</strong>
            <span>Open Slots</span>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle size={16} /> {successMsg}
        </div>
      )}
      {error && (
        <div className="alert" style={{ marginBottom: 20 }}>{error}</div>
      )}

      {/* ── Cards ── */}
      {loading ? (
        <div className="min-vol-skeleton-grid">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="min-vol-skel-card">
              <div className="min-vol-skel-img" />
              <div className="min-vol-skel-body">
                <div className="min-vol-skel-line w70" />
                <div className="min-vol-skel-line w50" />
                <div className="min-vol-skel-line w90" />
              </div>
            </div>
          ))}
        </div>
      ) : ministries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Users size={32} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p className="muted">No volunteer teams available right now.</p>
        </div>
      ) : (
        <div className="min-vol-grid">
          {ministries.map((m) => (
            <div key={m.id} className="min-vol-card">
              {/* Card image */}
              <div className="min-vol-card-img-wrap">
                {getImageUrl(m.image) ? (
                  <img
                    src={getImageUrl(m.image)}
                    alt={m.name}
                    className="min-vol-card-img"
                  />
                ) : (
                  <div className="min-vol-card-img-placeholder">
                    <MinistryIcon name={m.icon} size={40} />
                  </div>
                )}
                <div className="min-vol-card-img-overlay" />
                {m.slots_available && (
                  <div className="min-vol-open-badge">
                    <CheckCircle size={11} /> {m.slots_available} open
                  </div>
                )}
              </div>

              {/* Card body */}
              <div className="min-vol-card-body">
                <div className="min-vol-card-header">
                  <div className="min-vol-icon-chip">
                    <MinistryIcon name={m.icon} size={18} />
                  </div>
                  <div>
                    <h3 className="min-vol-card-name">{m.name}</h3>
                    <p className="min-vol-card-count">
                      <Users size={12} />
                      {m.volunteer_count} volunteer{m.volunteer_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <p className="min-vol-card-desc">{m.description}</p>

                <div className="min-vol-card-foot">
                  {!user ? (
                    <Link to="/login" className="min-vol-apply-btn">
                      Sign In to Apply <ChevronRight size={15} />
                    </Link>
                  ) : m.is_member ? (
                    <div className="min-vol-serving-badge">
                      <CheckCircle size={15} /> Serving on this Team
                    </div>
                  ) : m.application_status === 'pending' ? (
                    <div className="min-vol-pending-row">
                      <div className="min-vol-pending-badge">
                        <Clock size={14} /> Pending Review
                      </div>
                      <button
                        onClick={() => handleCancelApplication(m.id)}
                        className="min-vol-cancel-btn"
                      >
                        Withdraw
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenApply(m)}
                      className="min-vol-apply-btn"
                    >
                      <HeartHandshake size={15} /> Apply to Join
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Application Modal ── */}
      {applyingMinistry && (
        <div className="min-vol-overlay" onClick={(e) => e.target === e.currentTarget && setApplyingMinistry(null)}>
          <div className="min-vol-modal">
            <div className="min-vol-modal-head">
              <div>
                <div className="min-vol-modal-icon">
                  <MinistryIcon name={applyingMinistry.icon} size={20} />
                </div>
                <div>
                  <h3>Join {applyingMinistry.name}</h3>
                  <p className="muted" style={{ fontSize: '0.82rem', marginTop: 2 }}>
                    Tell us about yourself and your availability
                  </p>
                </div>
              </div>
              <button className="min-vol-modal-close" onClick={() => setApplyingMinistry(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="min-vol-modal-body">
              <label className="min-vol-label">Your Background & Availability</label>
              <textarea
                rows={5}
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder={`Share any relevant experience, skills, or why you'd love to serve on the ${applyingMinistry.name} team…`}
                className="min-vol-textarea"
              />
              <div className="min-vol-modal-foot">
                <button
                  type="button"
                  className="min-vol-btn-secondary"
                  onClick={() => setApplyingMinistry(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="min-vol-apply-btn" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
