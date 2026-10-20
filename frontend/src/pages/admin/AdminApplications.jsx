import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost } from '../../api.js'
import { ArrowLeft, Check, X, Clock, HeartHandshake } from 'lucide-react'

export default function AdminApplications() {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const loadApplications = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/ministries/applications')
      setApps(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadApplications()
  }, [])

  const handleUpdate = async (id, status) => {
    setProcessingId(id)
    setMsg('')
    try {
      const res = await apiPost('/api/ministries/update-application', {
        application_id: id,
        status
      })
      setMsg(res.message || `Application ${status}!`)
      loadApplications()
    } catch (err) {
      setError(err.message || 'Failed to update application.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Link to="/admin" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={16} /> Back to Admin
        </Link>
        <span style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Total Applications: {apps.length}
        </span>
      </div>

      <h1 style={{ fontSize: '2rem', marginBottom: 8 }}>Volunteer Ministry Applications</h1>
      <p className="muted" style={{ marginBottom: 20 }}>
        Review member applications to serve in ministries. Approving an applicant automatically connects them to their chosen team.
      </p>

      {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Loading applications...</p>
        </div>
      ) : apps.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">No volunteer applications submitted yet.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16 }}>
          {apps.map((a) => (
            <div key={a.id} className="card" style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 16,
              borderLeft: a.status === 'approved' ? '4px solid #16a34a' : a.status === 'rejected' ? '4px solid #dc2626' : '4px solid #f59e0b'
            }}>
              <div style={{ flex: '1 1 300px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '1.2rem' }}>{a.ministry_icon || '✦'}</span>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--navy)' }}>{a.ministry_name}</h3>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: a.status === 'approved' ? '#dcfce7' : a.status === 'rejected' ? '#fee2e2' : '#fef3c7',
                    color: a.status === 'approved' ? '#15803d' : a.status === 'rejected' ? '#991b1b' : '#92400e'
                  }}>
                    {a.status}
                  </span>
                </div>

                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: '#1f2d25' }}>
                  {a.member_name} ({a.member_id || 'LG-MEMBER'}) &bull; <span style={{ color: 'var(--muted)', fontWeight: 400 }}>{a.email}</span>
                </div>

                {a.message && (
                  <div style={{
                    marginTop: 8,
                    fontSize: '0.88rem',
                    background: 'rgba(0,0,0,0.02)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    borderLeft: '2px solid var(--border)'
                  }}>
                    "{a.message}"
                  </div>
                )}

                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
                  Applied on {new Date(a.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {a.status !== 'approved' && (
                  <button
                    onClick={() => handleUpdate(a.id, 'approved')}
                    disabled={processingId === a.id}
                    style={{
                      background: '#16a34a',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 14px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <Check size={16} /> Approve
                  </button>
                )}

                {a.status !== 'rejected' && (
                  <button
                    onClick={() => handleUpdate(a.id, 'rejected')}
                    disabled={processingId === a.id}
                    style={{
                      background: '#fff',
                      color: '#b3261e',
                      border: '1px solid #b3261e',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '8px 14px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <X size={16} /> Reject
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
