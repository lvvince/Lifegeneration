import { useEffect, useMemo, useState } from 'react'
import { Megaphone, Plus, Pencil, Trash2, Pin, Search, ExternalLink, Clock, CalendarDays } from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import { emit } from '../../lib/bus.js'
import { fmtDate } from '../../lib/format.js'
import { Modal, Field, ConfirmDialog, Empty, useToast } from '../../components/portal/ui.jsx'
import { AnnouncementCard } from '../../components/portal/AnnouncementPopup.jsx'
import { catOf } from '../../components/portal/announcements.jsx'

const blank = {
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

const FILTERS = ['all', 'urgent', 'event', 'ministry', 'general']
const on1 = (v) => Number(v) === 1

// "2026-10-30 18:00:00" -> "2026-10-30T18:00" (kailangan ng datetime-local)
const toLocalInput = (v) => (v ? String(v).replace(' ', 'T').slice(0, 16) : '')

/* ---------- Form na may live preview ---------- */
function AnnouncementModal({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ ...initial, expires_at: toLocalInput(initial.expires_at) })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))
  const flip = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.checked ? 1 : 0 }))

  async function submit(e) {
    e.preventDefault()
    if (!f.title.trim() || !f.content.trim()) return setErr('Title and message are required.')
    setSaving(true)
    setErr('')
    try {
      await apiPost(f.id ? '/api/admin/announcements/update' : '/api/admin/announcements/create', {
        ...f,
        expires_at: f.expires_at ? f.expires_at.replace('T', ' ') : '',
      })
      toast(f.id ? 'Announcement updated.' : 'Announcement published.')
      emit('announcements:changed') // mag-refresh agad ang popup at bell ng members
      onSaved()
    } catch (e2) {
      setErr(e2.message || 'Failed to save announcement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={f.id ? 'Edit announcement' : 'New announcement'}
      onClose={onClose}
      footer={
        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" form="ad-form" className="p-btn p-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : f.id ? 'Save changes' : 'Publish'}
          </button>
        </div>
      }
    >
      <form id="ad-form" className="ad-form" onSubmit={submit}>
        {err && <div className="p-alert p-alert-danger">{err}</div>}

        <div className="ad-preview" aria-label="Preview">
          <small>Preview · how members see it</small>
          <AnnouncementCard a={f} preview />
        </div>

        <Field label="Title" htmlFor="ad-title">
          <input id="ad-title" className="p-input" value={f.title} onChange={set('title')} placeholder="e.g. Youth service moved to 6 PM" maxLength={120} autoFocus required />
        </Field>

        <Field label="Message" htmlFor="ad-content" hint={`${f.content.length}/400`}>
          <textarea id="ad-content" className="p-input" rows={4} value={f.content} onChange={set('content')} placeholder="Type the details here…" maxLength={400} required />
        </Field>

        <div className="ad-row">
          <Field label="Category" htmlFor="ad-cat">
            <select id="ad-cat" className="p-input" value={f.category} onChange={set('category')}>
              <option value="general">General</option>
              <option value="urgent">Urgent</option>
              <option value="event">Event</option>
              <option value="ministry">Ministry</option>
            </select>
          </Field>
          <Field label="Badge (optional)" htmlFor="ad-badge">
            <input id="ad-badge" className="p-input" value={f.badge_text || ''} onChange={set('badge_text')} placeholder="NEW, REMINDER…" maxLength={20} />
          </Field>
        </div>

        <div className="ad-row">
          <Field label="Link (optional)" htmlFor="ad-url" hint="/events or https://…">
            <input id="ad-url" className="p-input" value={f.link_url || ''} onChange={set('link_url')} placeholder="/events" autoCapitalize="none" autoCorrect="off" />
          </Field>
          <Field label="Button text" htmlFor="ad-link">
            <input id="ad-link" className="p-input" value={f.link_text || ''} onChange={set('link_text')} placeholder="Learn more" maxLength={24} />
          </Field>
        </div>

        <Field label="Hide automatically on (optional)" htmlFor="ad-exp">
          <input id="ad-exp" type="datetime-local" className="p-input" value={f.expires_at} onChange={set('expires_at')} />
        </Field>

        <label className="ad-check">
          <input type="checkbox" checked={on1(f.is_pinned)} onChange={flip('is_pinned')} /> Pin to top
        </label>
        <label className="ad-check">
          <input type="checkbox" checked={on1(f.is_active)} onChange={flip('is_active')} /> Visible to members
        </label>
      </form>
    </Modal>
  )
}

/* ---------- Page ---------- */
export default function AdminAnnouncements() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [form, setForm] = useState(null)
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)

  async function load() {
    try {
      const d = await apiGet('/api/admin/announcements')
      setItems(Array.isArray(d) ? d : [])
    } catch (e) {
      toast(e.message || 'Failed to load announcements.', 'bad')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    load()
  }, [])

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase()
    return items
      .filter((a) => (cat === 'all' || a.category === cat) && (!t || [a.title, a.content, a.badge_text].some((v) => String(v || '').toLowerCase().includes(t))))
      .sort((a, b) => Number(on1(b.is_pinned)) - Number(on1(a.is_pinned)))
  }, [items, q, cat])

  const stats = [
    ['Total', items.length],
    ['Active', items.filter((a) => on1(a.is_active)).length],
    ['Pinned', items.filter((a) => on1(a.is_pinned)).length],
  ]

  async function patch(a, fields, msg) {
    try {
      await apiPost('/api/admin/announcements/update', { id: a.id, ...fields })
      toast(msg)
      emit('announcements:changed')
      load()
    } catch (e) {
      toast(e.message || 'Could not update.', 'bad')
    }
  }

  async function remove() {
    setDeleting(true)
    try {
      await apiPost('/api/admin/announcements/delete', { id: toDelete.id })
      toast('Announcement deleted.')
      emit('announcements:changed')
      setToDelete(null)
      load()
    } catch (e) {
      toast(e.message || 'Failed to delete.', 'bad')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="ad-head">
        <div>
          <h1>Announcements</h1>
          <p>Pop up at the top of every member’s portal. Pin the important ones, hide them when they’re done.</p>
        </div>
        <button type="button" className="p-btn p-btn-primary" onClick={() => setForm({ ...blank })}>
          <Plus size={18} /> New announcement
        </button>
      </div>

      <div className="ad-stats">
        {stats.map(([label, n]) => (
          <div className="ad-stat" key={label}>
            <strong>{loading ? '–' : n}</strong>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div className="ad-tools">
        <div className="ad-search">
          <Search size={18} />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search announcements" aria-label="Search announcements" />
        </div>
        <div className="ad-chips" role="tablist">
          {FILTERS.map((c) => (
            <button key={c} type="button" role="tab" aria-selected={cat === c} className={cat === c ? 'is-on' : ''} onClick={() => setCat(c)}>
              {c === 'all' ? 'All' : catOf(c).label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="ad-list">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ad-skel" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Empty
          icon={Megaphone}
          title="No announcements found"
          desc={q || cat !== 'all' ? 'Try a different search or filter.' : 'Post your first announcement to keep everyone in the loop.'}
          action={
            <button type="button" className="p-btn p-btn-primary" onClick={() => setForm({ ...blank })}>
              <Plus size={18} /> New announcement
            </button>
          }
        />
      ) : (
        <div className="ad-list">
          {shown.map((a, i) => (
            <article key={a.id} className={`ad-card${on1(a.is_active) ? '' : ' is-off'}${on1(a.is_pinned) ? ' is-pinned' : ''}`} style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div className="ad-top">
                <span className={`ad-tag is-${a.category || 'general'}`}>{catOf(a.category).label}</span>
                {a.badge_text && <span className="ad-badge">{a.badge_text}</span>}
                <button
                  type="button"
                  className={`ad-pin${on1(a.is_pinned) ? ' is-on' : ''}`}
                  onClick={() => patch(a, { is_pinned: on1(a.is_pinned) ? 0 : 1 }, on1(a.is_pinned) ? 'Unpinned.' : 'Pinned to top.')}
                  aria-label={on1(a.is_pinned) ? 'Unpin' : 'Pin to top'}
                  aria-pressed={on1(a.is_pinned)}
                >
                  <Pin size={18} />
                </button>
              </div>
              <h3>{a.title}</h3>
              <p>{a.content}</p>
              <div className="ad-meta">
                <span>
                  <CalendarDays size={14} /> {fmtDate(a.created_at)}
                </span>
                {a.expires_at && (
                  <span>
                    <Clock size={14} /> Ends {fmtDate(a.expires_at)}
                  </span>
                )}
                {a.link_url && (
                  <span>
                    <ExternalLink size={14} /> {a.link_text || 'Link'}
                  </span>
                )}
              </div>
              <div className="ad-foot">
                <button
                  type="button"
                  className={`ad-state${on1(a.is_active) ? ' is-on' : ''}`}
                  role="switch"
                  aria-checked={on1(a.is_active)}
                  onClick={() => patch(a, { is_active: on1(a.is_active) ? 0 : 1 }, on1(a.is_active) ? 'Hidden from members.' : 'Visible to members.')}
                >
                  <span className="ad-sw" />
                  {on1(a.is_active) ? 'Active' : 'Hidden'}
                </button>
                <div className="ad-acts">
                  <button type="button" onClick={() => setForm({ ...a })} aria-label="Edit">
                    <Pencil size={18} />
                  </button>
                  <button type="button" className="is-danger" onClick={() => setToDelete(a)} aria-label="Delete">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

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
          title="Delete announcement?"
          message={`“${toDelete.title}” will be removed for everyone. This can’t be undone.`}
          confirmLabel="Delete"
          danger
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  )
}
