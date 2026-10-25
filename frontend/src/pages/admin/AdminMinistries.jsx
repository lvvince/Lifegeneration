import { useEffect, useMemo, useRef, useState } from 'react'
import {
  HeartHandshake, Plus, Pencil, Trash2,
  Image as ImageIcon, UploadCloud, X, Users,
  ClipboardList, CheckCircle, XCircle, Clock,
  RotateCcw, UserMinus, ChevronDown, ChevronUp
} from 'lucide-react'
import { API_URL, apiGet, apiPost } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import {
  PageHeader, Empty, Loading, Modal, Field,
  ConfirmDialog, Badge, Tabs, useToast,
} from '../../components/portal/ui.jsx'

/* ─── Icon options ─── */
const ICON_OPTIONS = [
  { value: 'music',          label: 'Music' },
  { value: 'mic2',           label: 'Microphone' },
  { value: 'monitor',        label: 'Monitor / Screen' },
  { value: 'camera',         label: 'Camera' },
  { value: 'headphones',     label: 'Headphones' },
  { value: 'usercheck',      label: 'User Check' },
  { value: 'globe',          label: 'Globe / Outreach' },
  { value: 'megaphone',      label: 'Megaphone' },
  { value: 'tent',           label: 'Tent / Venue' },
  { value: 'brush',          label: 'Brush / Decor' },
  { value: 'hearthandshake', label: 'Heart Handshake' },
  { value: 'star',           label: 'Star' },
  { value: 'users',          label: 'Team / Group' },
]

const STATUS_TONE = { pending: 'warn', approved: 'ok', rejected: 'bad' }
const blank = { id: null, name: '', description: '', slots_available: '', icon: 'star', image: '' }

function getImageUrl(image) {
  if (!image) return null
  if (image.startsWith('http')) return image
  return `${API_URL}/${image}`
}

/* ════════════════════════════════════════
   IMAGE UPLOADER
════════════════════════════════════════ */
function ImageUploader({ currentImage, onUploaded, onRemoved }) {
  const inputRef = useRef()
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState(getImageUrl(currentImage))
  const [err, setErr] = useState('')

  const handleFile = async (file) => {
    if (!file) return
    setErr('')
    const formData = new FormData()
    formData.append('image', file)
    setUploading(true)
    try {
      const token = localStorage.getItem('access_token')
      const res = await fetch(`${API_URL}/api/ministries/upload-image`, {
        method: 'POST',
        headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setPreview(getImageUrl(data.url))
      onUploaded(data.url)
    } catch (e) {
      setErr(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => { setPreview(null); onRemoved(); if (inputRef.current) inputRef.current.value = '' }

  return (
    <div className="mi-uploader">
      {preview ? (
        <div className="mi-preview-wrap">
          <img src={preview} alt="Team" className="mi-preview-img" />
          <button type="button" className="mi-preview-remove" onClick={handleRemove} title="Remove image"><X size={14} /></button>
        </div>
      ) : (
        <div
          className={`mi-dropzone${uploading ? ' uploading' : ''}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]) }}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? <><div className="mi-dz-spinner" /><span>Uploading…</span></> : (
            <><UploadCloud size={28} strokeWidth={1.5} /><span>Drop image or <u>browse</u></span><span className="mi-dz-hint">JPG, PNG, WEBP · max 20 MB</span></>
          )}
        </div>
      )}
      {err && <p className="mi-upload-err">{err}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
    </div>
  )
}

/* ════════════════════════════════════════
   TEAM FORM MODAL
════════════════════════════════════════ */
function MinistryForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim()) { setErr('Team name is required.'); return }
    setSaving(true); setErr('')
    try {
      const body = {
        name: f.name.trim(), icon: f.icon || 'star',
        description: f.description.trim(),
        slots_available: f.slots_available === '' ? '' : Number(f.slots_available),
        image: f.image || '',
      }
      if (f.id) await apiPost('/api/ministries/update', { id: f.id, ...body })
      else       await apiPost('/api/ministries/create', body)
      toast(f.id ? 'Team updated.' : 'Team created.')
      onSaved()
    } catch (e2) {
      setErr(e2.message || 'Could not save the team.')
      setSaving(false)
    }
  }

  return (
    <Modal title={f.id ? 'Edit volunteer team' : 'New volunteer team'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="p-modal-body" style={{ display: 'grid', gap: 18 }}>
          {err && <div className="p-banner bad">{err}</div>}
          <Field label="Team photo" htmlFor="mi-image">
            <ImageUploader currentImage={f.image} onUploaded={(url) => setF((s) => ({ ...s, image: url }))} onRemoved={() => setF((s) => ({ ...s, image: '' }))} />
          </Field>
          <Field label="Team name" htmlFor="mi-name">
            <input id="mi-name" className="p-input" value={f.name} onChange={set('name')} autoFocus required placeholder="e.g. Stage Production Team" />
          </Field>
          <Field label="Icon" htmlFor="mi-icon">
            <select id="mi-icon" className="p-input" value={f.icon} onChange={set('icon')}>
              {ICON_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Description" htmlFor="mi-desc">
            <textarea id="mi-desc" className="p-input" value={f.description} onChange={set('description')} rows={3} placeholder="What does this team do at events?" />
          </Field>
          <Field label="Open slots" htmlFor="mi-slots" hint="Leave blank for unlimited.">
            <input id="mi-slots" type="number" min="1" className="p-input" value={f.slots_available} onChange={set('slots_available')} />
          </Field>
        </div>
        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving}>Cancel</button>
          <button type="submit" className="p-btn p-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : f.id ? 'Save changes' : 'Create team'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

/* ════════════════════════════════════════
   TEAMS TAB
════════════════════════════════════════ */
function TeamsTab({ items, loading, onNew, onEdit, onDelete }) {
  if (loading) return <Loading rows={4} />
  if (items.length === 0) return (
    <Empty
      icon={HeartHandshake}
      title="No teams yet"
      desc="Create a volunteer team so members can apply to serve at events."
      action={<button type="button" className="p-btn p-btn-primary p-btn-sm" onClick={onNew}><Plus size={14} /> New team</button>}
    />
  )
  return (
    <div className="mi-admin-grid">
      {items.map((m) => (
        <div key={m.id} className="mi-admin-card">
          <div className="mi-admin-card-img">
            {getImageUrl(m.image)
              ? <img src={getImageUrl(m.image)} alt={m.name} />
              : <div className="mi-admin-card-img-empty"><ImageIcon size={24} strokeWidth={1.5} /></div>
            }
          </div>
          <div className="mi-admin-card-body">
            <div className="mi-admin-card-title">{m.name}</div>
            {m.description && (
              <div className="mi-admin-card-desc">
                {m.description.length > 80 ? `${m.description.slice(0, 80)}…` : m.description}
              </div>
            )}
            <div className="mi-admin-card-meta">
              <span><Users size={12} /> {m.volunteer_count} volunteer{m.volunteer_count !== 1 ? 's' : ''}</span>
              {m.slots_available
                ? <span className="mi-slots-badge">{m.slots_available} slots open</span>
                : <span className="p-muted" style={{ fontSize: '0.78rem' }}>No slot limit</span>
              }
            </div>
          </div>
          <div className="mi-admin-card-actions">
            <button type="button" className="p-btn p-btn-quiet p-btn-sm" onClick={() => onEdit(m)} aria-label={`Edit ${m.name}`}>
              <Pencil size={14} /> Edit
            </button>
            <button type="button" className="p-btn p-btn-quiet p-btn-sm" style={{ color: 'var(--danger)' }} onClick={() => onDelete(m)} aria-label={`Delete ${m.name}`}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* ════════════════════════════════════════
   VOLUNTEERS TAB  (applications + remove volunteer)
════════════════════════════════════════ */
function VolunteersTab({ teams }) {
  const toast = useToast()
  const [apps, setApps] = useState([])
  const [loadingApps, setLoadingApps] = useState(true)
  const [busyId, setBusyId] = useState(null)
  const [appTab, setAppTab] = useState('pending')
  const [expandedTeam, setExpandedTeam] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)

  const loadApps = () =>
    apiGet('/api/ministries/applications')
      .then((d) => setApps(Array.isArray(d) ? d : []))
      .catch((e) => toast(e.message || 'Failed to load applications.', 'bad'))
      .finally(() => setLoadingApps(false))

  useEffect(() => { loadApps() }, [])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 }
    apps.forEach((a) => { if (c[a.status] !== undefined) c[a.status]++ })
    return c
  }, [apps])

  const shown = appTab === 'all' ? apps : apps.filter((a) => a.status === appTab)

  async function setStatus(a, status) {
    setBusyId(a.id)
    try {
      const res = await apiPost('/api/ministries/update-application', { application_id: a.id, status })
      toast(res.message || `Application ${status}.`)
      await loadApps()
    } catch (e) {
      toast(e.message || 'Could not update application.', 'bad')
    } finally {
      setBusyId(null)
    }
  }

  async function confirmRemove() {
    if (!removeTarget) return
    setRemoving(true)
    try {
      // Reject any approved application to also clear ministry_id on member
      const approvedApp = apps.find(
        (a) => a.user_id === removeTarget.user_id && a.ministry_id === removeTarget.ministry_id && a.status === 'approved'
      )
      if (approvedApp) {
        await apiPost('/api/ministries/update-application', { application_id: approvedApp.id, status: 'rejected' })
      }
      toast(`${removeTarget.member_name} removed from team.`)
      setRemoveTarget(null)
      await loadApps()
    } catch (e) {
      toast(e.message || 'Could not remove volunteer.', 'bad')
    } finally {
      setRemoving(false)
    }
  }

  // Group volunteers (approved) by team
  const approvedByTeam = useMemo(() => {
    const map = {}
    apps.filter((a) => a.status === 'approved').forEach((a) => {
      if (!map[a.ministry_id]) map[a.ministry_id] = []
      map[a.ministry_id].push(a)
    })
    return map
  }, [apps])

  return (
    <div style={{ display: 'grid', gap: 24 }}>

      {/* ── Current Volunteers by Team ── */}
      <section className="p-panel">
        <div className="mi-vol-section-head">
          <Users size={16} />
          <strong>Current Volunteers by Team</strong>
        </div>
        {teams.length === 0 ? (
          <Empty icon={Users} title="No teams yet" desc="Create teams first." />
        ) : (
          <div style={{ display: 'grid', gap: 2 }}>
            {teams.map((team) => {
              const volunteers = approvedByTeam[team.id] || []
              const isOpen = expandedTeam === team.id
              return (
                <div key={team.id} className="mi-team-row">
                  <button
                    type="button"
                    className="mi-team-row-head"
                    onClick={() => setExpandedTeam(isOpen ? null : team.id)}
                  >
                    <div className="mi-team-row-info">
                      {getImageUrl(team.image)
                        ? <img src={getImageUrl(team.image)} alt="" className="mi-team-thumb" />
                        : <div className="mi-team-thumb mi-team-thumb-empty"><Users size={14} /></div>
                      }
                      <div>
                        <div className="mi-team-name">{team.name}</div>
                        <div className="mi-team-count">{volunteers.length} active volunteer{volunteers.length !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>

                  {isOpen && (
                    <div className="mi-team-members">
                      {volunteers.length === 0 ? (
                        <p className="p-muted" style={{ fontSize: '0.85rem', padding: '12px 16px' }}>No active volunteers on this team yet.</p>
                      ) : volunteers.map((v) => (
                        <div key={v.id} className="mi-volunteer-row">
                          <div className="mi-vol-avatar">{(v.member_name || '?')[0].toUpperCase()}</div>
                          <div className="mi-vol-info">
                            <div className="mi-vol-name">{v.member_name}</div>
                            <div className="mi-vol-meta">
                              <span className="p-mono">{v.member_id || '—'}</span>
                              {v.email && <> · {v.email}</>}
                              {v.created_at && <> · Joined {fmtDate(v.created_at)}</>}
                            </div>
                          </div>
                          <button
                            type="button"
                            className="p-btn p-btn-quiet p-btn-sm"
                            style={{ color: 'var(--danger)', flexShrink: 0 }}
                            onClick={() => setRemoveTarget({ ...v, ministry_id: team.id })}
                            disabled={busyId === v.id}
                          >
                            <UserMinus size={14} /> Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ── Applications ── */}
      <section className="p-panel">
        <div className="mi-vol-section-head">
          <ClipboardList size={16} />
          <strong>Volunteer Applications</strong>
        </div>

        <Tabs
          value={appTab}
          onChange={setAppTab}
          tabs={[
            { value: 'pending',  label: 'Pending',  count: counts.pending },
            { value: 'approved', label: 'Approved', count: counts.approved },
            { value: 'rejected', label: 'Rejected', count: counts.rejected },
            { value: 'all',      label: 'All',      count: apps.length },
          ]}
        />

        {loadingApps ? <Loading rows={3} /> : shown.length === 0 ? (
          <Empty
            icon={ClipboardList}
            title={appTab === 'pending' ? 'Nothing to review' : 'No applications here'}
            desc={appTab === 'pending' ? 'New volunteer applications will appear here.' : undefined}
          />
        ) : (
          <div style={{ display: 'grid', gap: 2, marginTop: 4 }}>
            {shown.map((a) => (
              <div key={a.id} className="mi-app-row">
                <div className="mi-vol-avatar">{(a.member_name || '?')[0].toUpperCase()}</div>
                <div className="mi-vol-info" style={{ flex: 1 }}>
                  <div className="mi-vol-name">
                    {a.member_name}
                    <span className="p-muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}> → </span>
                    <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{a.ministry_name}</span>
                  </div>
                  <div className="mi-vol-meta">
                    <span className="p-mono">{a.member_id || '—'}</span>
                    {a.email && <> · {a.email}</>}
                    {a.created_at && <> · {fmtDate(a.created_at)}</>}
                  </div>
                  {a.message && <div className="mi-app-message">"{a.message}"</div>}
                </div>
                <div className="mi-app-actions">
                  <Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge>
                  {a.status !== 'approved' && (
                    <button type="button" className="p-btn p-btn-primary p-btn-sm" disabled={busyId === a.id} onClick={() => setStatus(a, 'approved')}>
                      <CheckCircle size={13} /> Approve
                    </button>
                  )}
                  {a.status !== 'rejected' && (
                    <button type="button" className="p-btn p-btn-secondary p-btn-sm" disabled={busyId === a.id} onClick={() => setStatus(a, 'rejected')}>
                      <XCircle size={13} /> Reject
                    </button>
                  )}
                  {a.status !== 'pending' && (
                    <button type="button" className="p-btn p-btn-quiet p-btn-sm" disabled={busyId === a.id} onClick={() => setStatus(a, 'pending')}>
                      <RotateCcw size={13} /> Reset
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Remove volunteer confirm */}
      {removeTarget && (
        <ConfirmDialog
          title="Remove volunteer from team?"
          message={`This will remove ${removeTarget.member_name} from the team. They can re-apply in the future.`}
          confirmLabel="Remove volunteer"
          danger
          busy={removing}
          onConfirm={confirmRemove}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  )
}

/* ════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════ */
export default function AdminMinistries() {
  const toast = useToast()
  const [tab, setTab]         = useState('teams')
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [form, setForm]       = useState(null)
  const [del, setDel]         = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () =>
    apiGet('/api/ministries')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => { load() }, [])

  async function remove() {
    setDeleting(true)
    try {
      await apiPost('/api/ministries/delete', { id: del.id })
      toast('Team deleted.')
      setDel(null)
      await load()
    } catch (e) {
      toast(e.message || 'Could not delete the team.', 'bad')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Volunteer Teams"
        desc="Manage event ministry teams, volunteers, and applications."
        actions={
          tab === 'teams' && (
            <button type="button" className="p-btn p-btn-primary" onClick={() => setForm(blank)}>
              <Plus size={16} /> New team
            </button>
          )
        }
      />
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'teams',      label: 'Teams',      count: items.length },
          { value: 'volunteers', label: 'Volunteers & Applications' },
        ]}
      />

      <div style={{ marginTop: 20 }}>
        {tab === 'teams' && (
          <section className="p-panel">
            <TeamsTab
              items={items}
              loading={loading}
              onNew={() => setForm(blank)}
              onEdit={(m) => setForm({ id: m.id, name: m.name || '', icon: m.icon || 'star', description: m.description || '', slots_available: m.slots_available ?? '', image: m.image || '' })}
              onDelete={(m) => setDel(m)}
            />
          </section>
        )}

        {tab === 'volunteers' && <VolunteersTab teams={items} />}
      </div>

      {form && (
        <MinistryForm initial={form} onClose={() => setForm(null)} onSaved={() => { setForm(null); load() }} />
      )}
      {del && (
        <ConfirmDialog
          title="Delete this team?"
          message={`"${del.name}" will be removed. Its ${del.volunteer_count} volunteer(s) will be taken off the team and pending applications are deleted.`}
          confirmLabel="Delete team"
          danger
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setDel(null)}
        />
      )}
    </>
  )
}
