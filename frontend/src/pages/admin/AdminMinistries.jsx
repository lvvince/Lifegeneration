import { useEffect, useState } from 'react'
import { HeartHandshake, Plus, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import {
  PageHeader, Empty, Loading, Modal, Field, ConfirmDialog, useToast,
} from '../../components/portal/ui.jsx'

const blank = { id: null, name: '', description: '', slots_available: '' }

function MinistryForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim()) {
      setErr('Ministry name is required.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const body = {
        name: f.name.trim(),
        description: f.description.trim(),
        slots_available: f.slots_available === '' ? '' : Number(f.slots_available),
      }
      if (f.id) await apiPost('/api/ministries/update', { id: f.id, ...body })
      else await apiPost('/api/ministries/create', body)
      toast(f.id ? 'Ministry updated.' : 'Ministry created.')
      onSaved()
    } catch (e2) {
      setErr(e2.message || 'Could not save the ministry.')
      setSaving(false)
    }
  }

  return (
    <Modal title={f.id ? 'Edit ministry' : 'New ministry'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="p-modal-body">
          {err && <div className="p-banner bad" style={{ marginBottom: 14 }}>{err}</div>}
          <Field label="Ministry name" htmlFor="mi-name">
            <input id="mi-name" className="p-input" value={f.name} onChange={set('name')} autoFocus required />
          </Field>
          <Field label="What does this team do?" htmlFor="mi-desc">
            <textarea id="mi-desc" className="p-input" value={f.description} onChange={set('description')} />
          </Field>
          <Field label="Open slots" htmlFor="mi-slots" hint="Leave blank for no limit.">
            <input id="mi-slots" type="number" min="1" className="p-input" value={f.slots_available} onChange={set('slots_available')} />
          </Field>
        </div>
        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="p-btn p-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : f.id ? 'Save changes' : 'Create ministry'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminMinistries() {
  const toast = useToast()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () =>
    apiGet('/api/ministries')
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  async function remove() {
    setDeleting(true)
    try {
      await apiPost('/api/ministries/delete', { id: del.id })
      toast('Ministry deleted.')
      setDel(null)
      await load()
    } catch (e) {
      toast(e.message || 'Could not delete the ministry.', 'bad')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Ministries"
        desc="Service teams members can apply to join."
        actions={
          <button type="button" className="p-btn p-btn-primary" onClick={() => setForm(blank)}>
            <Plus size={16} /> New ministry
          </button>
        }
      />
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="p-panel">
        {loading ? (
          <Loading rows={4} />
        ) : items.length === 0 ? (
          <Empty
            icon={HeartHandshake}
            title="No ministries yet"
            desc="Create a team so members can apply to serve."
            action={
              <button type="button" className="p-btn p-btn-primary p-btn-sm" onClick={() => setForm(blank)}>
                <Plus size={14} /> New ministry
              </button>
            }
          />
        ) : (
          <div className="p-table-wrap">
            <table className="p-table" style={{ minWidth: 640 }}>
              <thead>
                <tr>
                  <th>Ministry</th>
                  <th>Volunteers</th>
                  <th>Open slots</th>
                  <th style={{ width: 1 }} />
                </tr>
              </thead>
              <tbody>
                {items.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div className="p-row-title">{m.name}</div>
                      {m.description && (
                        <div className="p-row-sub" style={{ maxWidth: 420 }}>
                          {m.description.length > 90 ? `${m.description.slice(0, 90)}…` : m.description}
                        </div>
                      )}
                    </td>
                    <td className="p-num">{m.volunteer_count}</td>
                    <td className="p-num">{m.slots_available ?? <span className="p-muted">No limit</span>}</td>
                    <td>
                      <div className="p-inline" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="p-btn p-btn-quiet p-btn-icon"
                          onClick={() =>
                            setForm({
                              id: m.id,
                              name: m.name || '',
                              description: m.description || '',
                              slots_available: m.slots_available ?? '',
                            })
                          }
                          aria-label={`Edit ${m.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-btn p-btn-quiet p-btn-icon"
                          onClick={() => setDel(m)}
                          aria-label={`Delete ${m.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {form && (
        <MinistryForm
          initial={form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            load()
          }}
        />
      )}
      {del && (
        <ConfirmDialog
          title="Delete this ministry?"
          message={`"${del.name}" will be removed. Its ${del.volunteer_count} volunteer(s) will be taken off the team and pending applications are deleted.`}
          confirmLabel="Delete ministry"
          danger
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setDel(null)}
        />
      )}
    </>
  )
}
