import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../api.js'
import { Sparkles, CheckCircle2, Lock, Plus, Trash2, Heart } from 'lucide-react'

export default function PrayerWall() {
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')
  const [filter, setFilter] = useState('all') // 'all', 'answered', 'mine'

  // Modal / Form state
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState('public')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const user = getUser()

  const loadPrayers = async () => {
    try {
      setLoading(true)
      const data = await apiGet('/api/prayer')
      setPrayers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err.message || 'Failed to load prayers.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPrayers()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || !body.trim()) return

    setSubmitting(true)
    setError('')
    try {
      const res = await apiPost('/api/prayer/submit', {
        title: title.trim(),
        body: body.trim(),
        visibility,
        is_anonymous: isAnonymous
      })
      setMsg(res.message || 'Prayer request posted.')
      setShowModal(false)
      setTitle('')
      setBody('')
      setIsAnonymous(false)
      loadPrayers()
    } catch (err) {
      setError(err.message || 'Failed to post prayer request.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleMarkAnswered = async (id) => {
    try {
      const res = await apiPost('/api/prayer/mark-answered', { id })
      setMsg(res.message || 'Prayer marked as answered!')
      loadPrayers()
    } catch (err) {
      setError(err.message || 'Failed to update prayer.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prayer request?')) return
    try {
      await apiPost('/api/prayer/delete', { id })
      setMsg('Prayer request deleted.')
      loadPrayers()
    } catch (err) {
      setError(err.message || 'Failed to delete prayer.')
    }
  }

  const filteredPrayers = prayers.filter((p) => {
    if (filter === 'answered') return p.status === 'answered'
    if (filter === 'mine') return user && (p.is_mine || (p.user_id && Number(p.user_id) === Number(user.id)))
    return true
  })

  return (
    <div>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 16,
        marginBottom: 24
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: 6 }}>Prayer Wall & Intercession</h1>
          <p className="muted" style={{ margin: 0 }}>
            "Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God." — Philippians 4:6
          </p>
        </div>

        {user ? (
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Plus size={18} /> Request Prayer
          </button>
        ) : (
          <Link to="/login" className="btn">
            Sign In to Post Prayer
          </Link>
        )}
      </div>

      {msg && <div className="alert alert-success" style={{ marginBottom: 16 }}>{msg}</div>}
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 10 }}>
        <button
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? 'var(--navy)' : 'transparent',
            color: filter === 'all' ? '#fff' : 'var(--text)',
            border: 'none',
            padding: '6px 14px',
            borderRadius: 20
          }}
        >
          All Requests ({prayers.length})
        </button>
        <button
          onClick={() => setFilter('answered')}
          style={{
            background: filter === 'answered' ? 'var(--navy)' : 'transparent',
            color: filter === 'answered' ? '#fff' : 'var(--text)',
            border: 'none',
            padding: '6px 14px',
            borderRadius: 20
          }}
        >
          Praise & Answered ({prayers.filter(p => p.status === 'answered').length})
        </button>
        {user && (
          <button
            onClick={() => setFilter('mine')}
            style={{
              background: filter === 'mine' ? 'var(--navy)' : 'transparent',
              color: filter === 'mine' ? '#fff' : 'var(--text)',
              border: 'none',
              padding: '6px 14px',
              borderRadius: 20
            }}
          >
            My Prayers
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">Loading prayer requests...</p>
        </div>
      ) : filteredPrayers.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p className="muted">No prayers found in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(310px, 1fr))', gap: 18 }}>
          {filteredPrayers.map((p) => {
            const isOwner = user && (p.is_mine || Number(p.user_id) === Number(user.id) || user.role === 'admin')
            const isAnswered = p.status === 'answered'

            return (
              <div
                key={p.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  border: isAnswered ? '1px solid #86efac' : '1px solid var(--border)',
                  background: isAnswered ? 'rgba(240, 253, 244, 0.6)' : 'var(--card)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '1.2rem' }}>🙏</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.member_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                          {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 6 }}>
                      {p.visibility === 'private' && (
                        <span style={{
                          background: '#fef3c7',
                          color: '#92400e',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.7rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <Lock size={11} /> Private
                        </span>
                      )}

                      {isAnswered && (
                        <span style={{
                          background: '#dcfce7',
                          color: '#15803d',
                          padding: '2px 8px',
                          borderRadius: 12,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3
                        }}>
                          <Sparkles size={12} /> Answered!
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.15rem', color: isAnswered ? '#15803d' : 'var(--navy)', marginBottom: 8 }}>
                    {p.title}
                  </h3>

                  <p style={{ fontSize: '0.92rem', color: '#334', lineHeight: 1.55 }}>
                    {p.body}
                  </p>
                </div>

                {isOwner && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 8,
                    paddingTop: 12,
                    marginTop: 12,
                    borderTop: '1px solid var(--border)'
                  }}>
                    {!isAnswered && (
                      <button
                        onClick={() => handleMarkAnswered(p.id)}
                        style={{
                          background: '#e3f5ea',
                          color: '#1e7a46',
                          border: 'none',
                          padding: '5px 10px',
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4
                        }}
                      >
                        <CheckCircle2 size={14} /> Mark Answered
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{
                        background: 'transparent',
                        color: '#b3261e',
                        border: 'none',
                        padding: '5px 8px',
                        cursor: 'pointer'
                      }}
                      title="Delete request"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal for new prayer */}
      {showModal && (
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
          <div className="card" style={{ maxWidth: 500, width: '100%' }}>
            <h3>Share Prayer Request</h3>
            <p className="muted" style={{ fontSize: '0.9rem', marginBottom: 14 }}>
              Our pastoral and prayer teams will uphold you in fervent intercession.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 10 }}>
                <label htmlFor="p-title">Prayer Title *</label>
                <input
                  id="p-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Healing for family, guidance in career"
                  required
                />
              </div>

              <div style={{ marginBottom: 10 }}>
                <label htmlFor="p-body">Prayer Details / Petition *</label>
                <textarea
                  id="p-body"
                  rows={4}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Share details of your situation so we can pray specifically..."
                  style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid var(--border)', fontFamily: 'inherit' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: 20, margin: '14px 0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 'normal' }}>
                  <input
                    type="radio"
                    name="vis"
                    value="public"
                    checked={visibility === 'public'}
                    onChange={() => setVisibility('public')}
                  />
                  Public (Whole Community)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 'normal' }}>
                  <input
                    type="radio"
                    name="vis"
                    value="private"
                    checked={visibility === 'private'}
                    onChange={() => setVisibility('private')}
                  />
                  Private (Leadership only)
                </label>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 'normal' }}>
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                  />
                  Post anonymously (Hide my name)
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{ background: 'transparent', color: '#666', border: '1px solid #ccc' }}
                >
                  Cancel
                </button>
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Posting...' : 'Post Prayer Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
