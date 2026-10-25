import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../api.js'
import { resolveImageUrl } from '../lib/format.js'
import {
  Users, Calendar, MapPin, CheckCircle,
  Network, UserPlus, ChevronRight, MessageCircle,
  Lock, Clock, ExternalLink, AlertCircle
} from 'lucide-react'
import '../styles/pages.css'

/* Backend sometimes returns HTML-escaped text (e.g. &#039;) – decode it for display */
function decodeEntities(str) {
  if (!str) return ''
  const el = document.createElement('textarea')
  el.innerHTML = str
  return el.value
}

export default function DGroups() {
  const [groups, setGroups]             = useState([])
  const [loading, setLoading]           = useState(true)
  const [loadFailed, setLoadFailed]     = useState(false)
  const [error, setError]               = useState('')
  const [actionMsg, setActionMsg]       = useState('')
  const [processingId, setProcessingId] = useState(null)

  const user = getUser()

  const fetchGroups = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      setLoadFailed(false)
      const data = await apiGet('/api/dgroups')
      setGroups(Array.isArray(data) ? data : [])
    } catch (err) {
      setLoadFailed(true)
      setError(decodeEntities(err.message) || 'Failed to load D-Groups.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchGroups() }, [])

  const runAction = async (id, request, fallbackSuccess, fallbackError) => {
    if (!user) return
    setProcessingId(id)
    setActionMsg('')
    setError('')
    try {
      const res = await request()
      setActionMsg(decodeEntities(res?.message) || fallbackSuccess)
      await fetchGroups({ silent: true })
    } catch (err) {
      setError(decodeEntities(err.message) || fallbackError)
    } finally {
      setProcessingId(null)
    }
  }

  const handleRequestJoin = (id) =>
    runAction(
      id,
      () => apiPost('/api/dgroups/request', { dgroup_id: id }),
      'Join request submitted! Awaiting leader approval.',
      'Failed to submit join request.'
    )

  const handleCancelRequest = (id) =>
    runAction(
      id,
      () => apiPost('/api/dgroups/cancel-request', { dgroup_id: id }),
      'Join request cancelled.',
      'Failed to cancel request.'
    )

  const handleLeave = () => {
    if (!window.confirm('Are you sure you want to leave your D-Group? You will lose access to the official Group Chat (GC).')) {
      return
    }
    runAction(
      'leave',
      () => apiPost('/api/dgroups/leave'),
      'You have left your D-Group.',
      'Failed to leave group.'
    )
  }

  const totalMembers = groups.reduce((s, g) => s + (g.member_count || 0), 0)

  return (
    <div className="dg-page pg-root">
      {/* ── Hero ── */}
      <div className="dg-hero">
        <div className="dg-hero-badge">
          <Network size={13} />
          <span>Small Groups</span>
        </div>
        <h1 className="dg-hero-title">find your <em className="hl">d-group</em></h1>
        <p className="dg-hero-sub">
          Do life together. Join a close-knit cell group where you can grow,
          be mentored, and build genuine friendships with exclusive Group Chat (GC) access.
        </p>
        <div className="dg-hero-stats">
          <div className="dg-stat">
            <strong>{groups.length}</strong>
            <span>Active Groups</span>
          </div>
          <div className="dg-stat-divider" />
          <div className="dg-stat">
            <strong>{totalMembers}</strong>
            <span>Total Members</span>
          </div>
        </div>
      </div>

      {/* ── Alerts ── */}
      {actionMsg && (
        <div className="alert alert-success" style={{ marginBottom: 20 }}>
          <CheckCircle size={15} style={{ flexShrink: 0 }} /> {actionMsg}
        </div>
      )}
      {error && (
        <div className="alert" style={{ marginBottom: 20, background: '#fee2e2', color: '#dc2626', borderColor: '#fca5a5' }}>
          <AlertCircle size={15} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {/* ── Cards ── */}
      {loading ? (
        <div className="dg-skeleton-grid">
          {[1, 2, 3].map(i => (
            <div key={i} className="dg-skel-card">
              <div className="dg-skel-img" />
              <div className="dg-skel-body">
                <div className="dg-skel-line w65" />
                <div className="dg-skel-line w45" />
                <div className="dg-skel-line w85" />
                <div className="dg-skel-line w55" />
              </div>
            </div>
          ))}
        </div>
      ) : loadFailed ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <AlertCircle size={32} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p className="muted">Couldn't load D-Groups.</p>
          <button type="button" className="dg-btn-primary" style={{ marginTop: 16 }} onClick={() => fetchGroups()}>
            Try Again
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <Network size={32} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 12 }} />
          <p className="muted">No D-Groups are available right now.</p>
        </div>
      ) : (
        <div className="dg-grid">
          {groups.map((g) => {
            const imgSrc = g.image ? resolveImageUrl(g.image) : null
            const isMember = g.is_joined
            const isPending = g.request_status === 'pending'
            const count = g.member_count || 0

            return (
              <div
                key={g.id}
                className={`dg-card${isMember ? ' dg-card--joined' : ''}`}
              >
                {/* Image */}
                <div className="dg-card-img-wrap">
                  {imgSrc ? (
                    <img src={imgSrc} alt={g.name} className="dg-card-img" />
                  ) : (
                    <div className="dg-card-img-placeholder">
                      <Network size={36} strokeWidth={1.5} />
                    </div>
                  )}
                  <div className="dg-card-img-overlay" />

                  {isMember && (
                    <div className="dg-joined-pill">
                      <CheckCircle size={12} /> My D-Group
                    </div>
                  )}

                  {!isMember && isPending && (
                    <div className="dg-pending-pill">
                      <Clock size={12} /> Request Pending
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="dg-card-body">
                  <div className="dg-card-top">
                    <h3 className="dg-card-title">{g.name}</h3>
                    {g.leader_name && (
                      <p className="dg-card-leader">Led by {g.leader_name}</p>
                    )}
                  </div>

                  {g.description && (
                    <p className="dg-card-desc">{g.description}</p>
                  )}

                  <div className="dg-card-meta">
                    {g.schedule && (
                      <div className="dg-meta-row">
                        <Calendar size={13} />
                        <span>{g.schedule}</span>
                      </div>
                    )}
                    {g.location && (
                      <div className="dg-meta-row">
                        <MapPin size={13} />
                        <span>{g.location}</span>
                      </div>
                    )}
                    <div className="dg-meta-row">
                      <Users size={13} />
                      <span>{count} member{count !== 1 ? 's' : ''}</span>
                    </div>
                  </div>

                  <div className="dg-card-foot">
                    {!user ? (
                      <div>
                        <Link to="/login" className="dg-btn-primary">
                          Sign In to Join <ChevronRight size={15} />
                        </Link>
                        <div className="dg-gc-lock-hint">
                          <Lock size={12} /> GC link unlocked upon leader approval
                        </div>
                      </div>
                    ) : isMember ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {g.gc_link ? (
                          <a
                            href={g.gc_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="dg-btn-gc"
                          >
                            <MessageCircle size={17} /> Open Official Group Chat <ExternalLink size={14} />
                          </a>
                        ) : (
                          <div className="dg-gc-empty-notice">
                            <MessageCircle size={13} style={{ display: 'inline', marginRight: 4 }} />
                            You're approved! Leader will post the GC link soon.
                          </div>
                        )}
                        <button
                          type="button"
                          className="dg-btn-leave-text"
                          onClick={handleLeave}
                          disabled={processingId === 'leave'}
                        >
                          {processingId === 'leave' ? 'Leaving…' : 'Leave D-Group'}
                        </button>
                      </div>
                    ) : isPending ? (
                      <div className="dg-pending-box">
                        <div className="dg-pending-text">
                          <Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span><b>Request Sent:</b> Waiting for leader approval. GC link unlocks as soon as you're accepted.</span>
                        </div>
                        <button
                          type="button"
                          className="dg-btn-cancel-req"
                          onClick={() => handleCancelRequest(g.id)}
                          disabled={processingId === g.id}
                        >
                          {processingId === g.id ? 'Cancelling…' : 'Cancel Request'}
                        </button>
                      </div>
                    ) : (
                      <div>
                        <button
                          type="button"
                          className="dg-btn-primary"
                          onClick={() => handleRequestJoin(g.id)}
                          disabled={processingId === g.id}
                        >
                          <UserPlus size={15} />
                          {processingId === g.id ? 'Submitting Request…' : 'Request to Join'}
                        </button>
                        <div className="dg-gc-lock-hint">
                          <Lock size={12} /> Group Chat (GC) unlocked upon leader approval
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}