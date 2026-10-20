import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../api.js'
import { Users, Calendar, MapPin, CheckCircle, LogOut, PlusCircle } from 'lucide-react'

export default function DGroups() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionMsg, setActionMsg] = useState('')
  const [processingId, setProcessingId] = useState(null)

  const user = getUser()

  const fetchGroups = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/dgroups')
      setGroups(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load D-Groups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGroups()
  }, [])

  const handleJoin = async (id) => {
    if (!user) return
    setProcessingId(id)
    setActionMsg('')
    try {
      const res = await apiPost('/api/dgroups/join', { dgroup_id: id })
      setActionMsg(res.message || 'Joined successfully!')
      fetchGroups()
    } catch (err) {
      setError(err.message || 'Failed to join group.')
    } finally {
      setProcessingId(null)
    }
  }

  const handleLeave = async () => {
    if (!user) return
    setProcessingId('leave')
    setActionMsg('')
    try {
      const res = await apiPost('/api/dgroups/leave')
      setActionMsg(res.message || 'Left group.')
      fetchGroups()
    } catch (err) {
      setError(err.message || 'Failed to leave group.')
    } finally {
      setProcessingId(null)
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.2rem', marginBottom: 8 }}>Discipleship Groups (D-Groups)</h1>
        <p className="muted" style={{ maxWidth: 640, margin: '0 auto', fontSize: '1.05rem' }}>
          Do life together! Find a Christ-centered small group where you can grow spiritually, receive mentorship, and find genuine community.
        </p>
      </div>

      {actionMsg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{actionMsg}</div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Loading D-Groups...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">No D-Groups currently available.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
          {groups.map((g) => (
            <div key={g.id} className="card" style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: g.is_joined ? '2px solid #2f8f5b' : '1px solid var(--border)',
              boxShadow: g.is_joined ? '0 4px 14px rgba(47,143,91,0.2)' : 'var(--shadow)',
              position: 'relative'
            }}>
              {g.is_joined && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
                  background: '#1e7a46',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4
                }}>
                  <CheckCircle size={14} /> My D-Group
                </div>
              )}

              <div>
                <h3 style={{ fontSize: '1.3rem', color: 'var(--navy)', marginBottom: 6, paddingRight: g.is_joined ? 90 : 0 }}>
                  {g.name}
                </h3>
                <div style={{ fontSize: '0.9rem', color: '#3f5749', fontWeight: 600, marginBottom: 12 }}>
                  Leader: {g.leader_name}
                </div>

                <p style={{ fontSize: '0.92rem', color: '#445', marginBottom: 16 }}>
                  {g.description || 'Join this discipleship group to study scripture and encourage one another.'}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.86rem', color: 'var(--muted)', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={15} color="var(--navy)" />
                    <span>{g.schedule}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <MapPin size={15} color="var(--navy)" />
                    <span>{g.location}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Users size={15} color="var(--navy)" />
                    <span>{g.member_count} member{g.member_count !== 1 ? 's' : ''} enrolled</span>
                  </div>
                </div>
              </div>

              <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                {!user ? (
                  <Link to="/login" className="btn" style={{ width: '100%', textAlign: 'center', boxSizing: 'border-box' }}>
                    Sign In to Join
                  </Link>
                ) : g.is_joined ? (
                  <button
                    onClick={handleLeave}
                    disabled={processingId === 'leave'}
                    style={{
                      width: '100%',
                      background: '#fff',
                      color: '#b3261e',
                      border: '1px solid #b3261e',
                      padding: '8px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    <LogOut size={16} />
                    {processingId === 'leave' ? 'Leaving...' : 'Leave Group'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleJoin(g.id)}
                    disabled={processingId === g.id}
                    style={{ width: '100%' }}
                  >
                    {processingId === g.id ? 'Joining...' : 'Join this D-Group'}
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
