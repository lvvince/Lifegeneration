import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../api.js'
import { CheckCircle, Clock, HeartHandshake, X } from 'lucide-react'

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

  useEffect(() => {
    fetchMinistries()
  }, [])

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
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: 8 }}>Ministry Volunteer Pipeline</h1>
        <p className="muted" style={{ maxWidth: 640, margin: '0 auto', fontSize: '1.05rem' }}>
          Discover where your gifts and passions meet church ministry. Step up, volunteer, and make an eternal impact for God’s kingdom!
        </p>
      </div>

      {successMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{successMsg}</div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Loading ministries...</p>
        </div>
      ) : ministries.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">No ministries found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 20 }}>
          {ministries.map((m) => (
            <div key={m.id} className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <span style={{ fontSize: '2rem' }}>{m.icon || '✦'}</span>
                  <div>
                    <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--navy)' }}>{m.name}</h3>
                    <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                      {m.volunteer_count} Active Volunteer{m.volunteer_count !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '0.92rem', color: '#445', margin: '12px 0 16px' }}>
                  {m.description}
                </p>

                {m.slots_available && (
                  <div style={{
                    fontSize: '0.8rem',
                    color: '#2f8f5b',
                    background: '#e3f5ea',
                    display: 'inline-block',
                    padding: '3px 8px',
                    borderRadius: 6,
                    fontWeight: 600,
                    marginBottom: 12
                  }}>
                    {m.slots_available} Open Slots
                  </div>
                )}
              </div>

              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                {!user ? (
                  <Link to="/login" className="btn" style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
                    Sign In to Apply
                  </Link>
                ) : m.is_member ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    color: '#1e7a46',
                    fontWeight: 600,
                    padding: '8px 0'
                  }}>
                    <CheckCircle size={18} /> Serving in this Ministry
                  </div>
                ) : m.application_status === 'pending' ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '0.86rem',
                      color: '#92400e',
                      background: '#fef3c7',
                      padding: '8px 12px',
                      borderRadius: 8
                    }}>
                      <Clock size={16} /> Application Pending
                    </div>
                    <button
                      onClick={() => handleCancelApplication(m.id)}
                      style={{
                        background: '#fff',
                        color: '#666',
                        border: '1px solid #ccc',
                        padding: '6px 10px',
                        fontSize: '0.8rem'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleOpenApply(m)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    <HeartHandshake size={18} /> Apply to Serve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal for Application */}
      {applyingMinistry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          padding: 16,
          zIndex: 100
        }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', position: 'relative' }}>
            <button
              onClick={() => setApplyingMinistry(null)}
              style={{
                position: 'absolute',
                top: 14,
                right: 14,
                background: 'transparent',
                border: 'none',
                color: '#666',
                cursor: 'pointer',
                padding: 4
              }}
            >
              <X size={20} />
            </button>

            <h3>Apply for {applyingMinistry.name}</h3>
            <p className="muted" style={{ fontSize: '0.9rem' }}>
              Tell our ministry heads a little about your experience, heart for serving, or availability.
            </p>

            <form onSubmit={handleSubmitApplication}>
              <label htmlFor="motivation">Personal Note / Experience</label>
              <textarea
                id="motivation"
                rows={4}
                value={motivation}
                onChange={(e) => setMotivation(e.target.value)}
                placeholder="Share your musical background, tech experience, or why you'd like to join..."
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
              />

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setApplyingMinistry(null)}
                  style={{ background: 'transparent', color: '#666', border: '1px solid #ccc' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
