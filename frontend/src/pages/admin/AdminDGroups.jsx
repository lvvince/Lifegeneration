import { useEffect, useState } from 'react'
import { Network, Plus, Pencil, Trash2 } from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import {
  PageHeader, Empty, Loading, Modal, Field, ConfirmDialog, useToast,
} from '../../components/portal/ui.jsx'

const blank = { id: null, name: '', leader_name: '', schedule: '', location: '', description: '', image: '' }

function GroupForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!f.name.trim() || !f.leader_name.trim()) {
      setErr('Group name and leader are required.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const body = {
        name: f.name.trim(),
        leader_name: f.leader_name.trim(),
        schedule: f.schedule.trim(),
        location: f.location.trim(),
        description: f.description.trim(),
        image: f.image.trim(),
      }
      if (f.id) await apiPost('/api/dgroups/update', { id: f.id, ...body })
      else await apiPost('/api/dgroups/create', body)
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
        <div className="p-modal-body">
          {err && <div className="p-banner bad" style={{ marginBottom: 14 }}>{err}</div>}
          <Field label="Group name" htmlFor="dg-name">
            <input id="dg-name" className="p-input" value={f.name} onChange={set('name')} autoFocus required />
          </Field>
          <Field label="Leader" htmlFor="dg-leader">
            <input id="dg-leader" className="p-input" value={f.leader_name} onChange={set('leader_name')} required />
          </Field>
          <div className="p-field-row">
            <Field label="Schedule" htmlFor="dg-sched">
              <input id="dg-sched" className="p-input" value={f.schedule} onChange={set('schedule')} />
            </Field>
            <Field label="Location" htmlFor="dg-loc">
              <input id="dg-loc" className="p-input" value={f.location} onChange={set('location')} />
            </Field>
          </div>
          <Field label="Description" htmlFor="dg-desc">
            <textarea id="dg-desc" className="p-input" value={f.description} onChange={set('description')} />
          </Field>
          <Field label="Image link" htmlFor="dg-img" hint="Optional. Paste a link to a photo.">
            <input id="dg-img" className="p-input" value={f.image} onChange={set('image')} />
          </Field>
        </div>
        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="p-btn p-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : f.id ? 'Save changes' : 'Create D-Group'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminDGroups() {
  const toast = useToast()
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState(null)
  const [del, setDel] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () =>
    apiGet('/api/dgroups')
      .then((d) => setGroups(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  async function remove() {
    setDeleting(true)
    try {
      await apiPost('/api/dgroups/delete', { id: del.id })
      toast('D-Group deleted.')
      setDel(null)
      await load()
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
        desc="Small groups that meet regularly. Members can join one from their portal."
        actions={
          <button type="button" className="p-btn p-btn-primary" onClick={() => setForm(blank)}>
            <Plus size={16} /> New D-Group
          </button>
        }
      />
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <section className="p-panel">
        {loading ? (
          <Loading rows={4} />
        ) : groups.length === 0 ? (
          <Empty
            icon={Network}
            title="No D-Groups yet"
            desc="Create the first group so members can join."
            action={
              <button type="button" className="p-btn p-btn-primary p-btn-sm" onClick={() => setForm(blank)}>
                <Plus size={14} /> New D-Group
              </button>
            }
          />
        ) : (
          <div className="p-table-wrap">
            <table className="p-table" style={{ minWidth: 680 }}>
              <thead>
                <tr>
                  <th>Group</th>
                  <th>Leader</th>
                  <th>Meets</th>
                  <th>Members</th>
                  <th style={{ width: 1 }} />
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id}>
                    <td className="p-row-title">{g.name}</td>
                    <td>{g.leader_name}</td>
                    <td>
                      {g.schedule || <span className="p-muted">—</span>}
                      {g.location && <div className="p-row-sub">{g.location}</div>}
                    </td>
                    <td className="p-num">{g.member_count}</td>
                    <td>
                      <div className="p-inline" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="p-btn p-btn-quiet p-btn-icon"
                          onClick={() =>
                            setForm({
                              id: g.id,
                              name: g.name || '',
                              leader_name: g.leader_name || '',
                              schedule: g.schedule || '',
                              location: g.location || '',
                              description: g.description || '',
                              image: g.image || '',
                            })
                          }
                          aria-label={`Edit ${g.name}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-btn p-btn-quiet p-btn-icon"
                          onClick={() => setDel(g)}
                          aria-label={`Delete ${g.name}`}
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
        <GroupForm
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
