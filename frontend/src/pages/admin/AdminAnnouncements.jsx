import { useEffect, useMemo, useState } from 'react'
import {
  Megaphone, Plus, Pencil, Trash2, Pin, Eye, EyeOff, Search,
  AlertCircle, Calendar, Users, ExternalLink, Clock
} from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import {
  PageHeader, Stats, Empty, Loading, Modal, Field, ConfirmDialog, useToast,
} from '../../components/portal/ui.jsx'

const blankAnnouncement = {
  id: null,
  title: '',
  content: '',
  category: 'general',
  badge_text: '',
  link_url: '',
  link_text: '',
  is_pinned: 0,
  is_active: 1,
  expires_at: '',
}

function AnnouncementModal({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const setCheck = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.checked ? 1 : 0 }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (!f.title.trim() || !f.content.trim()) {
      setErr('Title and message content are required.')
      return
    }

    setSaving(true)
    setErr('')
    try {
      const endpoint = f.id
        ? '/api/admin/announcements/update'
        : '/api/admin/announcements/create'
      await apiPost(endpoint, f)
      toast(f.id ? 'Announcement updated!' : 'Announcement published!')
      onSaved()
    } catch (e) {
      setErr(e.message || 'Failed to save announcement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={f.id ? 'Edit Announcement' : 'New Announcement'} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="p-modal-body">
          {err && <div className="p-alert p-alert-danger">{err}</div>}

          <Field label="Title" htmlFor="ann-title">
            <input
              id="ann-title"
              className="p-input"
              value={f.title}
              onChange={set('title')}
              placeholder="e.g. Youth Service Venue Change, Camp Registration"
              autoFocus
              required
            />
          </Field>

          <div className="p-field-row">
            <Field label="Category" htmlFor="ann-cat">
              <select id="ann-cat" className="p-input" value={f.category} onChange={set('category')}>
                <option value="general">General Announcement</option>
                <option value="urgent">Urgent Alert / Advisory</option>
                <option value="event">Event Notice</option>
                <option value="ministry">Ministry Update</option>
              </select>
            </Field>

            <Field label="Badge Label" htmlFor="ann-badge" hint="Optional short tag">
              <input
                id="ann-badge"
                className="p-input"
                value={f.badge_text || ''}
                onChange={set('badge_text')}
                placeholder="e.g. URGENT, NOTICE, NEW"
              />
            </Field>
          </div>

          <Field label="Message / Content" htmlFor="ann-content">
            <textarea
              id="ann-content"
              className="p-input"
              rows={4}
              value={f.content}
              onChange={set('content')}
              placeholder="Type the announcement details here..."
              required
            />
          </Field>

          <div className="p-field-row">
            <Field label="Link URL" htmlFor="ann-link-url" hint="Optional internal route or web link">
              <input
                id="ann-link-url"
                className="p-input"
                value={f.link_url || ''}
                onChange={set('link_url')}
                placeholder="e.g. /events or https://..."
              />
            </Field>

            <Field label="Link Button Text" htmlFor="ann-link-text">
              <input
                id="ann-link-text"
                className="p-input"
                value={f.link_text || ''}
                onChange={set('link_text')}
                placeholder="e.g. Register Now, Learn More"
              />
            </Field>
          </div>

          <Field label="Expires At" htmlFor="ann-expires" hint="Optional expiration date/time">
            <input
              id="ann-expires"
              type="datetime-local"
              className="p-input"
              value={f.expires_at ? f.expires_at.slice(0, 16) : ''}
              onChange={set('expires_at')}
            />
          </Field>

          <div style={{ display: 'flex', gap: 24, marginTop: 16 }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={f.is_pinned === 1}
                onChange={setCheck('is_pinned')}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontWeight: 600 }}>Pin to top of page</span>
            </label>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '0.9rem' }}>
              <input
                type="checkbox"
                checked={f.is_active === 1}
                onChange={setCheck('is_active')}
                style={{ width: 16, height: 16 }}
              />
              <span style={{ fontWeight: 600 }}>Active (Visible to users)</span>
            </label>
          </div>
        </div>

        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="p-btn p-btn-primary" disabled={saving}>
            {saving ? 'Saving...' : f.id ? 'Save changes' : 'Publish announcement'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminAnnouncements() {
  const toast = useToast()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [catFilter, setCatFilter] = useState('all')
  const [form, setForm] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const data = await apiGet('/api/admin/announcements')
      setAnnouncements(Array.isArray(data) ? data : [])
    } catch (e) {
      toast(e.message || 'Failed to load announcements', 'danger')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return announcements.filter((a) => {
      const matchCat = catFilter === 'all' || a.category === catFilter
      const matchQ =
        !query ||
        a.title.toLowerCase().includes(query) ||
        a.content.toLowerCase().includes(query) ||
        (a.badge_text && a.badge_text.toLowerCase().includes(query))
      return matchCat && matchQ
    })
  }, [announcements, q, catFilter])

  const stats = useMemo(() => {
    const total = announcements.length
    const active = announcements.filter((a) => a.is_active === 1).length
    const pinned = announcements.filter((a) => a.is_pinned === 1).length
    return [
      { label: 'Total Announcements', value: total },
      { label: 'Currently Active', value: active },
      { label: 'Pinned to Top', value: pinned },
    ]
  }, [announcements])

  async function togglePin(a) {
    try {
      const updatedPin = a.is_pinned === 1 ? 0 : 1
      await apiPost('/api/admin/announcements/update', { id: a.id, is_pinned: updatedPin })
      toast(updatedPin === 1 ? 'Announcement pinned to top!' : 'Announcement unpinned.')
      load()
    } catch (e) {
      toast(e.message || 'Failed to update pin state', 'danger')
    }
  }

  async function toggleActive(a) {
    try {
      const updatedActive = a.is_active === 1 ? 0 : 1
      await apiPost('/api/admin/announcements/update', { id: a.id, is_active: updatedActive })
      toast(updatedActive === 1 ? 'Announcement activated!' : 'Announcement hidden.')
      load()
    } catch (e) {
      toast(e.message || 'Failed to update active state', 'danger')
    }
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    try {
      await apiPost('/api/admin/announcements/delete', { id: toDelete.id })
      toast('Announcement deleted.')
      setToDelete(null)
      load()
    } catch (e) {
      toast(e.message || 'Failed to delete announcement.', 'danger')
    } finally {
      setDeleting(false)
    }
  }

  const getCatBadge = (category) => {
    switch (category) {
      case 'urgent':
        return { bg: '#fee2e2', color: '#dc2626', label: 'Urgent' }
      case 'event':
        return { bg: '#dcfce7', color: '#15803d', label: 'Event' }
      case 'ministry':
        return { bg: '#e0e7ff', color: '#4338ca', label: 'Ministry' }
      case 'general':
      default:
        return { bg: '#f1f5f9', color: '#475569', label: 'General' }
    }
  }

  return (
    <div>
      <PageHeader
        title="Announcements Bulletin"
        desc="Broadcast alerts, schedule changes, and notices to youth and ministry leaders."
        actions={
          <button
            type="button"
            className="p-btn p-btn-primary"
            onClick={() => setForm({ ...blankAnnouncement })}
          >
            <Plus size={16} /> New Announcement
          </button>
        }
      />

      <Stats items={stats} loading={loading} />

      <div className="p-card" style={{ marginTop: 20 }}>
        <div className="p-card-head" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--p-muted)' }} />
            <input
              type="text"
              className="p-input"
              style={{ paddingLeft: 34, height: 38 }}
              placeholder="Search announcements..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all', 'urgent', 'event', 'ministry', 'general'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCatFilter(cat)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 20,
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  border: catFilter === cat ? '1px solid #1e293b' : '1px solid var(--p-border)',
                  background: catFilter === cat ? '#1e293b' : '#fff',
                  color: catFilter === cat ? '#fff' : 'var(--p-text)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <Loading rows={4} />
        ) : filtered.length === 0 ? (
          <Empty
            icon={Megaphone}
            title="No announcements found"
            desc={q ? 'Try adjusting your search or filters.' : 'Post your first bulletin to keep youth informed.'}
            action={
              <button
                type="button"
                className="p-btn p-btn-primary"
                onClick={() => setForm({ ...blankAnnouncement })}
              >
                <Plus size={16} /> New Announcement
              </button>
            }
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="p-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>Pin</th>
                  <th>Title & Content</th>
                  <th>Category</th>
                  <th>Link</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ width: 110, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const badge = getCatBadge(a.category)
                  return (
                    <tr key={a.id} style={{ opacity: a.is_active === 1 ? 1 : 0.65 }}>
                      <td>
                        <button
                          type="button"
                          onClick={() => togglePin(a)}
                          title={a.is_pinned === 1 ? 'Unpin announcement' : 'Pin to top'}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: a.is_pinned === 1 ? '#e11d48' : '#94a3b8',
                            display: 'flex',
                            alignItems: 'center',
                            padding: 4,
                          }}
                        >
                          <Pin size={17} style={{ fill: a.is_pinned === 1 ? '#e11d48' : 'none' }} />
                        </button>
                      </td>
                      <td style={{ maxWidth: 380 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <strong style={{ fontSize: '0.92rem' }}>{a.title}</strong>
                          {a.badge_text && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: 4,
                                background: '#f1f5f9',
                                color: '#334155',
                              }}
                            >
                              {a.badge_text}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: '4px 0 0', fontSize: '0.84rem', color: 'var(--p-muted)', lineHeight: 1.4 }}>
                          {a.content}
                        </p>
                      </td>
                      <td>
                        <span
                          style={{
                            background: badge.bg,
                            color: badge.color,
                            padding: '3px 9px',
                            borderRadius: 12,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td>
                        {a.link_url ? (
                          <a
                            href={a.link_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: '0.82rem',
                              color: '#2563eb',
                              textDecoration: 'none',
                            }}
                          >
                            {a.link_text || 'Link'} <ExternalLink size={12} />
                          </a>
                        ) : (
                          <span style={{ color: 'var(--p-muted)', fontSize: '0.8rem' }}>None</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => toggleActive(a)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 5,
                            border: 'none',
                            background: a.is_active === 1 ? '#dcfce7' : '#f1f5f9',
                            color: a.is_active === 1 ? '#15803d' : '#64748b',
                            padding: '4px 10px',
                            borderRadius: 14,
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                          title="Click to toggle active state"
                        >
                          {a.is_active === 1 ? <Eye size={12} /> : <EyeOff size={12} />}
                          {a.is_active === 1 ? 'Active' : 'Hidden'}
                        </button>
                      </td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--p-muted)' }}>
                        {fmtDate(a.created_at)}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button
                            type="button"
                            className="p-btn-icon"
                            onClick={() => setForm({ ...a })}
                            title="Edit announcement"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            type="button"
                            className="p-btn-icon p-btn-danger"
                            onClick={() => setToDelete(a)}
                            title="Delete announcement"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <AnnouncementModal
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            load()
          }}
        />
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete Announcement"
          message={`Are you sure you want to delete "${toDelete.title}"? This action cannot be undone.`}
          confirmLabel={deleting ? 'Deleting...' : 'Delete'}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
          danger
        />
      )}
    </div>
  )
}
