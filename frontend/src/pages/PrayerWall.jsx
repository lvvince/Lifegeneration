import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, CheckCircle2, Lock, Plus, Trash2, Heart, Users } from 'lucide-react'
import { apiGet, apiPost, getUser } from '../api.js'
import { initials } from '../lib/format.js'
import { Modal, ConfirmDialog, Field, Switch, useToast } from '../components/portal/ui.jsx'
import '../styles/pages.css'

export default function PrayerWall() {
  const user = getUser()
  const toast = useToast()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', body: '', visibility: 'public', anonymous: false })
  const [submitting, setSubmitting] = useState(false)
  const [toDelete, setToDelete] = useState(null)

  const load = () =>
    apiGet('/api/prayer')
      .then((d) => setPrayers(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message || 'Failed to load prayers.'))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const mine = (p) => user && (p.is_mine || (p.user_id && Number(p.user_id) === Number(user.id)))
  const owner = (p) => user && (mine(p) || user.role === 'admin')
  const answered = (p) => p.status === 'answered'
  const shown = prayers.filter((p) => (filter === 'answered' ? answered(p) : filter === 'mine' ? mine(p) : true))
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.body.trim()) return
    setSubmitting(true)
    try {
      const res = await apiPost('/api/prayer/submit', { title: form.title.trim(), body: form.body.trim(), visibility: form.visibility, is_anonymous: form.anonymous })
      toast(res.message || 'Prayer request posted.')
      setShowForm(false)
      setForm({ title: '', body: '', visibility: 'public', anonymous: false })
      load()
    } catch (err) {
      toast(err.message || 'Failed to post prayer request.', 'bad')
    } finally {
      setSubmitting(false)
    }
  }

  async function markAnswered(id) {
    try {
      const res = await apiPost('/api/prayer/mark-answered', { id })
      toast(res.message || 'Marked as answered. Praise God!')
      load()
    } catch (err) {
      toast(err.message || 'Failed to update prayer.', 'bad')
    }
  }

  async function remove() {
    try {
      await apiPost('/api/prayer/delete', { id: toDelete.id })
      toast('Prayer request deleted.')
      setToDelete(null)
      load()
    } catch (err) {
      toast(err.message || 'Failed to delete prayer.', 'bad')
    }
  }

  const tabs = [['all', 'All', prayers.length], ['answered', 'Answered', prayers.filter(answered).length], ...(user ? [['mine', 'My prayers', prayers.filter(mine).length]] : [])]

  return (
    <div className="pg-root">
      <section className="pg-hero">
        <div className="pg-hero-row">
          <div>
            <span className="pg-chip"><Heart size={13} /> Prayer wall</span>
            <h1>We pray with you</h1>
            <p>“Do not be anxious about anything, but in every situation, by prayer and petition, present your requests to God.” Philippians 4:6</p>
          </div>
          {user ? (
            <button type="button" className="pg-btn" onClick={() => setShowForm(true)}><Plus size={18} /> Request prayer</button>
          ) : (
            <Link to="/login" className="pg-btn">Sign in to post</Link>
          )}
        </div>
      </section>

      {error && <div className="pg-alert">{error}</div>}

      <div className="pg-tabs" role="tablist">
        {tabs.map(([key, label, n]) => (
          <button key={key} type="button" role="tab" aria-selected={filter === key} className={filter === key ? 'is-on' : ''} onClick={() => setFilter(key)}>
            {label}<small>{n}</small>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="pg-empty">Loading prayer requests…</div>
      ) : shown.length === 0 ? (
        <div className="pg-empty">
          <Heart size={30} strokeWidth={1.5} />
          <b>No prayers here yet</b>
          <span>{filter === 'mine' ? 'Your requests will show up here.' : 'Be the first to share a request.'}</span>
        </div>
      ) : (
        <div className="pr-grid">
          {shown.map((p, i) => (
            <article className={`pg-card pr-card${answered(p) ? ' is-answered' : ''}`} key={p.id} style={{ '--i': Math.min(i, 8) }}>
              <div className="pr-head">
                <span className="pr-avatar">{initials(p.member_name)}</span>
                <div>
                  <b>{p.member_name}</b>
                  <small>{new Date(p.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}</small>
                </div>
              </div>
              {(p.visibility === 'private' || answered(p)) && (
                <div className="pr-tags">
                  {p.visibility === 'private' && <span className="pr-tag"><Lock size={11} /> Private</span>}
                  {answered(p) && <span className="pr-tag ok"><Sparkles size={12} /> Answered</span>}
                </div>
              )}
              <h3 className="pg-title">{p.title}</h3>
              <p>{p.body}</p>
              {owner(p) && (
                <div className="pr-foot">
                  {!answered(p) && (
                    <button type="button" className="pg-btn-ghost" onClick={() => markAnswered(p.id)}><CheckCircle2 size={15} /> Mark answered</button>
                  )}
                  <button type="button" className="pg-btn-ghost" onClick={() => setToDelete(p)} aria-label="Delete request"><Trash2 size={16} /></button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {user && <button type="button" className="pg-fab" onClick={() => setShowForm(true)} aria-label="Request prayer"><Plus size={24} /></button>}

      {showForm && (
        <Modal title="Share a prayer request" onClose={() => setShowForm(false)}>
          <form onSubmit={submit}>
            <div className="p-modal-body">
              <Field label="Title" htmlFor="pr-title">
                <input id="pr-title" className="p-input" value={form.title} onChange={set('title')} placeholder="For example: healing for my family" autoFocus required />
              </Field>
              <Field label="Details" htmlFor="pr-body">
                <textarea id="pr-body" className="p-input" rows={4} value={form.body} onChange={set('body')} placeholder="Share what we can pray about" required />
              </Field>
              <Field label="Who can see this?">
                <div className="pg-seg" role="radiogroup" aria-label="Who can see this?">
                  <button type="button" role="radio" aria-checked={form.visibility === 'public'} className={form.visibility === 'public' ? 'is-on' : ''} onClick={() => setForm((f) => ({ ...f, visibility: 'public' }))}>
                    <Users size={16} /> Everyone
                  </button>
                  <button type="button" role="radio" aria-checked={form.visibility === 'private'} className={form.visibility === 'private' ? 'is-on' : ''} onClick={() => setForm((f) => ({ ...f, visibility: 'private' }))}>
                    <Lock size={16} /> Leaders only
                  </button>
                </div>
              </Field>
              <div className="pg-switchrow">
                <div>
                  <b>Post without my name</b>
                  <small>Your name will be hidden on the wall.</small>
                </div>
                <Switch checked={form.anonymous} label="Post without my name" onChange={() => setForm((f) => ({ ...f, anonymous: !f.anonymous }))} />
              </div>
            </div>
            <div className="p-modal-foot">
              <button type="button" className="p-btn p-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="p-btn p-btn-primary" disabled={submitting}>{submitting ? 'Posting…' : 'Post request'}</button>
            </div>
          </form>
        </Modal>
      )}

      {toDelete && (
        <ConfirmDialog title="Delete this request?" message={`"${toDelete.title}" will be removed for everyone.`} confirmLabel="Delete" danger onConfirm={remove} onCancel={() => setToDelete(null)} />
      )}
    </div>
  )
}
