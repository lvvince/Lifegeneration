import { useEffect, useRef, useState } from 'react'
import {
  Network, Plus, Pencil, Trash2,
  Image as ImageIcon, UploadCloud, X,
  Users, Calendar, MapPin, MessageCircle,
  Inbox, Check, X as XIcon, Clock, ExternalLink
} from 'lucide-react'
import { API_URL, apiGet, apiPost } from '../../api.js'
import { resolveImageUrl, fmtDate } from '../../lib/format.js'
import {
  PageHeader, Empty, Loading, Modal, Field, ConfirmDialog, useToast,
} from '../../components/portal/ui.jsx'

const blank = {
  id: null,
  name: '',
  leader_name: '',
  schedule: '',
  location: '',
  gc_link: '',
  description: '',
  image: '',
}

/* ════════════════════════════════════════
   IMAGE UPLOADER
════════════════════════════════════════ */
function ImageUploader({ currentImage, onUploaded, onRemoved }) {
  const inputRef  = useRef()
  const [uploading, setUploading] = useState(false)
  const [preview,   setPreview]   = useState(currentImage ? resolveImageUrl(currentImage) : null)
  const [err,       setErr]       = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setErr('')
    const formData = new FormData()
    formData.append('image', file)
    setUploading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_URL}/api/dgroups/upload-image`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPreview(resolveImageUrl(data.url))
      onUploaded(data.url)
    } catch (e) {
      setErr(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setPreview(null)
    onRemoved()
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="mi-uploader">
      {preview ? (
        <div className="mi-preview-wrap">
          <img src={preview} alt="D-Group" className="mi-preview-img" />
          <button type="button" className="mi-preview-remove" onClick={handleRemove} title="Remove image">
            <X size={14} />
          </button>
        </div>
      ) : (
        <div
          className={`mi-dropzone${uploading ? ' uploading' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <><div className="mi-dz-spinner" /><span>Uploading…</span></>
          ) : (
            <><UploadCloud size={28} strokeWidth={1.5} /><span>Drop image or <u>browse</u></span><span className="mi-dz-hint">JPG, PNG, WEBP · max 20 MB</span></>
          )}
        </div>
      )}
      {err && <p className="mi-upload-err">{err}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files[0])}
      />
    </div>
  )
}

/* ════════════════════════════════════════
   GROUP FORM MODAL
════════════════════════════════════════ */
function GroupForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF]       = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr]   = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.leader_name.trim()) {
      setErr('Group name and leader name are required.')
      return
    }
    setSaving(true); setErr('')
    try {
      const body = {
        name:         f.name.trim(),
        leader_name:  f.leader_name.trim(),
        schedule:     f.schedule.trim(),
        location:     f.location.trim(),
        gc_link:      (f.gc_link || '').trim(),
        description:  f.description.trim(),
        image:        (f.image || '').trim(),
      }
      if (f.id) await apiPost('/api/dgroups/update', { id: f.id, ...body })
      else       await apiPost('/api/dgroups/create', body)
      toast(f.id ? 'D-Group updated.' : 'D-Group created.')
      onSaved()
    } catch (e2) {
      setErr(e2.message || 'Could not save the D-Group.')
      setSaving(false)
    }
  }

  return (
    <Modal title={f.id ? 'Edit D-Group' : 'New D-Group'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="p-modal-body" style={{ display: 'grid', gap: 16 }}>
          {err && <div className="p-banner bad">{err}</div>}

          <Field label="Cover photo" htmlFor="dg-img">
            <ImageUploader
              currentImage={f.image}
              onUploaded={(url) => setF((s) => ({ ...s, image: url }))}
              onRemoved={() => setF((s) => ({ ...s, image: '' }))}
            />
          </Field>

          <Field label="Group name" htmlFor="dg-name">
            <input id="dg-name" className="p-input" value={f.name} onChange={set('name')} autoFocus required placeholder="e.g. Young Professionals Group" />
          </Field>

          <Field label="Leader" htmlFor="dg-leader">
            <input id="dg-leader" className="p-input" value={f.leader_name} onChange={set('leader_name')} required placeholder="Full name of leader" />
          </Field>

          <div className="p-field-row">
            <Field label="Schedule" htmlFor="dg-sched">
              <input id="dg-sched" className="p-input" value={f.schedule} onChange={set('schedule')} placeholder="e.g. Saturdays 5:00 PM" />
            </Field>
            <Field label="Location" htmlFor="dg-loc">
              <input id="dg-loc" className="p-input" value={f.location} onChange={set('location')} placeholder="e.g. Room A / Zoom" />
            </Field>
          </div>

          <Field
            label="Official Group Chat Link (GC)"
            htmlFor="dg-gc"
            hint="Unlocked only for approved members (e.g. Messenger GC https://m.me/j/... or Telegram)"
          >
            <input
              id="dg-gc"
              className="p-input"
              value={f.gc_link || ''}
              onChange={set('gc_link')}
              placeholder="https://m.me/j/... or Telegram invite"
            />
          </Field>

          <Field label="Description" htmlFor="dg-desc">
            <textarea id="dg-desc" className="p-input" value={f.description} onChange={set('description')} rows={3} placeholder="What is this group about?" />
          </Field>
        </div>

        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="p-btn p-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : f.id ? 'Save changes' : 'Create D-Group'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ════════════════════════════════════════
   JOIN REQUESTS MODAL
════════════════════════════════════════ */
function RequestsModal({ requests, loading, onClose, onRefresh }) {
  const toast = useToast()
  const [tab, setTab] = useState('pending')
  const [actingId, setActingId] = useState(null)

  const pending = requests.filter(r => r.status === 'pending')
  const approved = requests.filter(r => r.status === 'approved')
  const shown = tab === 'pending' ? pending : tab === 'approved' ? approved : requests

  async function handleAccept(req) {
    setActingId(req.id)
    try {
      const res = await apiPost('/api/dgroups/accept-request', { request_id: req.id })
      toast(res.message || 'Request accepted! Member has been granted GC access.')
      onRefresh()
    } catch (e) {
      toast(e.message || 'Failed to accept request.', 'bad')
    } finally {
      setActingId(null)
    }
  }

  async function handleReject(req) {
    setActingId(req.id)
    try {
      const res = await apiPost('/api/dgroups/reject-request', { request_id: req.id })
      toast(res.message || 'Request declined.')
      onRefresh()
    } catch (e) {
      toast(e.message || 'Failed to reject request.', 'bad')
    } finally {
      setActingId(null)
    }
  }

  return (
    <Modal title="D-Group Join Requests" onClose={onClose}>
      <div className="p-modal-body" style={{ minWidth: 500, maxWidth: 640 }}>
        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, borderBottom: '1px solid var(--p-border)', paddingBottom: 10 }}>
          <button
            type="button"
            onClick={() => setTab('pending')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 600,
              border: tab === 'pending' ? '1px solid #b45309' : '1px solid var(--p-border)',
              background: tab === 'pending' ? '#fef3c7' : '#fff',
              color: tab === 'pending' ? '#b45309' : 'var(--p-text)',
              cursor: 'pointer',
            }}
          >
            Pending ({pending.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('approved')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 600,
              border: tab === 'approved' ? '1px solid #15803d' : '1px solid var(--p-border)',
              background: tab === 'approved' ? '#dcfce7' : '#fff',
              color: tab === 'approved' ? '#15803d' : 'var(--p-text)',
              cursor: 'pointer',
            }}
          >
            Approved ({approved.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('all')}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.82rem',
              fontWeight: 600,
              border: tab === 'all' ? '1px solid #1e293b' : '1px solid var(--p-border)',
              background: tab === 'all' ? '#1e293b' : '#fff',
              color: tab === 'all' ? '#fff' : 'var(--p-text)',
              cursor: 'pointer',
            }}
          >
            All Requests ({requests.length})
          </button>
        </div>

        {loading ? (
          <Loading rows={3} />
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 12px', color: 'var(--p-muted)' }}>
            <Inbox size={32} strokeWidth={1.5} style={{ opacity: 0.4, marginBottom: 8 }} />
            <p>No {tab !== 'all' ? tab : ''} requests found.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
            {shown.map((r) => (
              <div
                key={r.id}
                style={{
                  border: '1px solid var(--p-border)',
                  borderRadius: 10,
                  padding: '12px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12,
                  background: r.status === 'pending' ? 'rgba(254, 243, 199, 0.2)' : '#fff',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <strong style={{ fontSize: '0.92rem' }}>{r.display_name}</strong>
                    {r.member_id && (
                      <span style={{ fontSize: '0.72rem', background: '#f1f5f9', padding: '1px 6px', borderRadius: 4 }}>
                        {r.member_id}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--p-muted)', marginTop: 2 }}>
                    Requested to join: <b>{r.dgroup_name}</b>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: 2 }}>
                    Applied on {fmtDate(r.created_at)}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAccept(r)}
                        disabled={actingId === r.id}
                        style={{
                          background: '#15803d',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '6px 12px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <Check size={14} /> Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(r)}
                        disabled={actingId === r.id}
                        style={{
                          background: '#fee2e2',
                          color: '#dc2626',
                          border: '1px solid #fca5a5',
                          borderRadius: 6,
                          padding: '6px 10px',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Decline
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 9px',
                        borderRadius: 12,
                        textTransform: 'uppercase',
                        background: r.status === 'approved' ? '#dcfce7' : '#fee2e2',
                        color: r.status === 'approved' ? '#15803d' : '#dc2626',
                      }}
                    >
                      {r.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-modal-foot">
        <button type="button" className="p-btn p-btn-secondary" onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  )
}

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
export default function AdminDGroups() {
  const toast = useToast()
  const [groups, setGroups]           = useState([])
  const [requests, setRequests]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingReq, setLoadingReq]   = useState(true)
  const [error, setError]             = useState('')
  const [form, setForm]               = useState(null)
  const [del, setDel]                 = useState(null)
  const [deleting, setDeleting]       = useState(false)
  const [showRequests, setShowRequests] = useState(false)

  const loadGroups = () =>
    apiGet('/api/dgroups')
      .then((d) => setGroups(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))

  const loadRequests = () =>
    apiGet('/api/dgroups/requests')
      .then((d) => setRequests(Array.isArray(d) ? d : []))
      .catch(() => {})

  const loadAll = () => {
    setLoading(true)
    Promise.all([loadGroups(), loadRequests()]).finally(() => {
      setLoading(false)
      setLoadingReq(false)
    })
  }

  useEffect(() => { loadAll() }, [])

  const pendingCount = requests.filter((r) => r.status === 'pending').length

  async function remove() {
    setDeleting(true)
    try {
      await apiPost('/api/dgroups/delete', { id: del.id })
      toast('D-Group deleted.')
      setDel(null)
      await loadAll()
    } catch (e) {
      toast(e.message || 'Could not delete the D-Group.', 'bad')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="D-Groups"
        desc="Small discipleship groups that members request to join. Accepting requests unlocks the official Group Chat (GC)."
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="p-btn p-btn-secondary"
              onClick={() => setShowRequests(true)}
              style={{ position: 'relative' }}
            >
              <Inbox size={16} /> Join Requests
              {pendingCount > 0 && (
                <span
                  style={{
                    background: '#e11d48',
                    color: '#fff',
                    borderRadius: 99,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    marginLeft: 6,
                  }}
                >
                  {pendingCount}
                </span>
              )}
            </button>
            <button type="button" className="p-btn p-btn-primary" onClick={() => setForm(blank)}>
              <Plus size={16} /> New D-Group
            </button>
          </div>
        }
      />
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="p-panel" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: 20 }}><Loading rows={4} /></div>
        ) : groups.length === 0 ? (
          <Empty
            icon={Network}
            title="No D-Groups yet"
            desc="Create the first group so members can request to join."
            action={
              <button type="button" className="p-btn p-btn-primary p-btn-sm" onClick={() => setForm(blank)}>
                <Plus size={14} /> New D-Group
              </button>
            }
          />
        ) : (
          <div className="dg-admin-grid">
            {groups.map((g) => {
              const imgSrc = g.image ? resolveImageUrl(g.image) : null
              return (
                <div key={g.id} className="dg-admin-card">
                  {/* Image */}
                  <div className="dg-admin-card-img">
                    {imgSrc
                      ? <img src={imgSrc} alt={g.name} />
                      : <div className="dg-admin-card-img-empty"><ImageIcon size={24} strokeWidth={1.5} /></div>
                    }
                  </div>

                  {/* Body */}
                  <div className="dg-admin-card-body">
                    <div className="dg-admin-card-title">{g.name}</div>
                    <div className="dg-admin-card-leader">Led by {g.leader_name}</div>

                    {g.description && (
                      <div className="dg-admin-card-desc">
                        {g.description.length > 75 ? `${g.description.slice(0, 75)}…` : g.description}
                      </div>
                    )}

                    <div className="dg-admin-card-meta">
                      {g.schedule && (
                        <span className="dg-meta-chip"><Calendar size={11} /> {g.schedule}</span>
                      )}
                      {g.location && (
                        <span className="dg-meta-chip"><MapPin size={11} /> {g.location}</span>
                      )}
                      <span className="dg-meta-chip"><Users size={11} /> {g.member_count} member{g.member_count !== 1 ? 's' : ''}</span>
                      {g.gc_link ? (
                        <span className="dg-meta-chip" style={{ color: '#0284c7', background: '#f0f9ff' }}>
                          <MessageCircle size={11} /> GC Configured
                        </span>
                      ) : (
                        <span className="dg-meta-chip" style={{ color: '#94a3b8' }}>
                          No GC Link
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="dg-admin-card-actions">
                    <button
                      type="button"
                      className="p-btn p-btn-quiet p-btn-sm"
                      onClick={() => setForm({
                        id:           g.id,
                        name:         g.name || '',
                        leader_name:  g.leader_name || '',
                        schedule:     g.schedule || '',
                        location:     g.location || '',
                        gc_link:      g.gc_link || '',
                        description:  g.description || '',
                        image:        g.image || '',
                      })}
                      aria-label={`Edit ${g.name}`}
                    >
                      <Pencil size={14} /> Edit
                    </button>
                    <button
                      type="button"
                      className="p-btn p-btn-quiet p-btn-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => setDel(g)}
                      aria-label={`Delete ${g.name}`}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {form && (
        <GroupForm
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => { setForm(null); loadAll() }}
        />
      )}

      {showRequests && (
        <RequestsModal
          requests={requests}
          loading={loadingReq}
          onClose={() => setShowRequests(false)}
          onRefresh={loadAll}
        />
      )}

      {del && (
        <ConfirmDialog
          title="Delete this D-Group?"
          message={`"${del.name}" will be removed and its ${del.member_count} member(s) will be left without a group.`}
          confirmLabel="Delete D-Group"
          danger
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setDel(null)}
        />
      )}
    </>
  )
}
