import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { apiGet, apiPost, getUser } from '../api.js'
import { resolveImageUrl } from '../lib/format.js'
import {
  Users, Calendar, MapPin, CheckCircle,
  Network, UserPlus, ChevronRight, MessageCircle,
  Lock, Clock, AlertCircle, Sparkles
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

  const handleLeave = (id, groupName) => {
    if (!window.confirm(`Are you sure you want to leave ${groupName || 'this D-Group'}?`)) {
      return
    }
    runAction(
      `leave-${id}`,
      () => apiPost('/api/dgroups/leave', { dgroup_id: id }),
      `You have left ${groupName || 'the D-Group'}.`,
      'Failed to leave group.'
    )
  }

  const totalMembers = groups.reduce((s, g) => s + (g.member_count || 0), 0)

  return (
    <div className="dg-page pg-root">
      {/* ── Hero ── */}
      <div className="dg-hero">
        <div className="dg-hero-badge">
          <Network size={12} />
          <span>Discipleship Groups</span>
        </div>
        <h1 className="dg-hero-title">
          find your{' '}
          <em className="hl">d-group</em>
        </h1>
        <p className="dg-hero-sub">
          Do life together. Join a close-knit cell group where you can grow,
          be mentored, and build genuine friendships with exclusive Group Chat access.
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

      {/* ── Gifts Matcher Banner ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
          background: 'linear-gradient(135deg, rgba(255,90,10,0.07) 0%, rgba(251,146,60,0.04) 100%)',
          border: '1.5px solid rgba(255,90,10,0.18)',
          borderRadius: 20,
          padding: '18px 24px',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13,
            background: 'rgba(255,90,10,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <Sparkles size={22} color="#ff5a0a" />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--p-text)', marginBottom: 3 }}>
              Don't know which D-Group fits you best?
            </div>
            <div style={{ fontSize: 13, color: 'var(--p-text-2, #586079)' }}>
              Answer 7 quick questions and we'll match you to the right community group for your season of life.
            </div>
          </div>
        </div>
        <Link
          to="/gifts-matcher"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '11px 22px', borderRadius: 13,
            background: '#ff5a0a', color: '#fff',
            fontWeight: 700, fontSize: 13.5, textDecoration: 'none',
            whiteSpace: 'nowrap', flexShrink: 0,
            boxShadow: '0 4px 16px rgba(255,90,10,0.32)'
          }}
        >
          <Sparkles size={14} />
          Find My D-Group
        </Link>
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
                          <Lock size={12} /> Group chat unlocked upon leader approval
                        </div>
                      </div>
                    ) : isMember ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Link
                          to="/chat"
                          className="dg-btn-gc"
                        >
                          <MessageCircle size={17} /> Open Fellowship Chat <ChevronRight size={14} />
                        </Link>
                        <button
                          type="button"
                          className="dg-btn-leave-text"
                          onClick={() => handleLeave(g.id, g.name)}
                          disabled={processingId === `leave-${g.id}`}
                        >
                          {processingId === `leave-${g.id}` ? 'Leaving…' : 'Leave D-Group'}
                        </button>
                      </div>
                    ) : isPending ? (
                      <div className="dg-pending-box">
                        <div className="dg-pending-text">
                          <Clock size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                          <span><b>Request Sent:</b> Waiting for leader approval. Group chat unlocks as soon as you're accepted.</span>
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
                          <Lock size={12} /> Group chat unlocked upon leader approval
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