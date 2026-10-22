import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Plus, Pencil, Trash2, UserCheck } from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate, isUpcoming, to12h, to24h } from '../../lib/format.js'
import {
  PageHeader, Empty, Loading, Tabs, Modal, Field, ConfirmDialog, useToast,
} from '../../components/portal/ui.jsx'

const blank = { id: null, title: '', description: '', location: '', event_date: '', time: '10:00', capacity: '' }

function EventForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function submit(e) {
    e.preventDefault()
    if (!f.title.trim() || !f.event_date) {
      setErr('Title and date are required.')
      return
    }
    setSaving(true)
    setErr('')
    try {
      const body = {
        title: f.title.trim(),
        description: f.description.trim(),
        location: f.location.trim(),
        event_date: f.event_date,
        event_time: to12h(f.time),
        capacity: f.capacity === '' ? '' : Number(f.capacity),
      }
      if (f.id) await apiPost('/api/events/update', { id: f.id, ...body })
      else await apiPost('/api/events/create', body)
      toast(f.id ? 'Event updated.' : 'Event created.')
      onSaved()
    } catch (e2) {
      setErr(e2.message || 'Could not save the event.')
      setSaving(false)
    }
  }

  return (
    <Modal title={f.id ? 'Edit event' : 'New event'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="p-modal-body">
          {err && <div className="p-banner bad" style={{ marginBottom: 14 }}>{err}</div>}
          <Field label="Title" htmlFor="ev-title">
            <input id="ev-title" className="p-input" value={f.title} onChange={set('title')} autoFocus required />
          </Field>
          <div className="p-field-row">
            <Field label="Date" htmlFor="ev-date">
              <input id="ev-date" type="date" className="p-input" value={f.event_date} onChange={set('event_date')} required />
            </Field>
            <Field label="Time" htmlFor="ev-time">
              <input id="ev-time" type="time" className="p-input" value={f.time} onChange={set('time')} />
            </Field>
          </div>
          <Field label="Location" htmlFor="ev-loc">
            <input id="ev-loc" className="p-input" value={f.location} onChange={set('location')} />
          </Field>
          <Field label="Description" htmlFor="ev-desc">
            <textarea id="ev-desc" className="p-input" value={f.description} onChange={set('description')} />
          </Field>
          <Field label="Capacity" htmlFor="ev-cap" hint="Leave blank for no limit.">
            <input id="ev-cap" type="number" min="1" className="p-input" value={f.capacity} onChange={set('capacity')} />
          </Field>
        </div>
        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="p-btn p-btn-primary" disabled={saving}>
            {saving ? 'Saving…' : f.id ? 'Save changes' : 'Create event'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

export default function AdminEvents() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('upcoming')
  const [form, setForm] = useState(params.get('new') ? blank : null)
  const [del, setDel] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const load = () =>
    apiGet('/api/events')
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const upcoming = useMemo(() => events.filter((e) => isUpcoming(e.event_date)), [events])
  const past = useMemo(() => events.filter((e) => !isUpcoming(e.event_date)).reverse(), [events])
  const shown = tab === 'upcoming' ? upcoming : tab === 'past' ? past : events

  function closeForm() {
    setForm(null)
    if (params.get('new')) setParams({}, { replace: true })
  }

  function edit(e) {
    setForm({
      id: e.id,
      title: e.title || '',
      description: e.description || '',
      location: e.location || '',
      event_date: String(e.event_date || '').slice(0, 10),
      time: to24h(e.event_time),
      capacity: e.capacity ?? '',
    })
  }

  async function remove() {
    setDeleting(true)
    try {
      await apiPost('/api/events/delete', { id: del.id })
      toast('Event deleted.')
      setDel(null)
      await load()
    } catch (e) {
      toast(e.message || 'Could not delete the event.', 'bad')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Events"
        desc="Create gatherings, set a capacity, and see who signed up."
        actions={
          <button type="button" className="p-btn p-btn-primary" onClick={() => setForm(blank)}>
            <Plus size={16} /> New event
          </button>
        }
      />
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'upcoming', label: 'Upcoming', count: upcoming.length },
          { value: 'past', label: 'Past', count: past.length },
          { value: 'all', label: 'All', count: events.length },
        ]}
      />

      <section className="p-panel">
        {loading ? (
          <Loading rows={4} />
        ) : shown.length === 0 ? (
          <Empty
            icon={CalendarDays}
            title="No events here"
            desc={tab === 'upcoming' ? 'Create an event so members can sign up.' : undefined}
            action={
              tab === 'upcoming' && (
                <button type="button" className="p-btn p-btn-primary p-btn-sm" onClick={() => setForm(blank)}>
                  <Plus size={14} /> New event
                </button>
              )
            }
          />
        ) : (
          <div className="p-table-wrap">
            <table className="p-table" style={{ minWidth: 700 }}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>When</th>
                  <th>Signed up</th>
                  <th style={{ width: 1 }} />
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => (
                  <tr key={e.id}>
                    <td>
                      <div className="p-row-title">{e.title}</div>
                      <div className="p-row-sub">{e.location || 'No location set'}</div>
                    </td>
                    <td className="p-num">
                      {fmtDate(e.event_date)}
                      <div className="p-row-sub">{e.event_time || ''}</div>
                    </td>
                    <td className="p-num">
                      {e.attendee_count}
                      {e.capacity ? <span className="p-muted"> / {e.capacity}</span> : null}
                    </td>
                    <td>
                      <div className="p-inline" style={{ justifyContent: 'flex-end' }}>
                        <Link
                          to={`/admin/check-in?event=${e.id}`}
                          className="p-btn p-btn-quiet p-btn-sm"
                          title="Attendance and check-in"
                        >
                          <UserCheck size={15} /> Attendance
                        </Link>
                        <button
                          type="button"
                          className="p-btn p-btn-quiet p-btn-icon"
                          onClick={() => edit(e)}
                          aria-label={`Edit ${e.title}`}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className="p-btn p-btn-quiet p-btn-icon"
                          onClick={() => setDel(e)}
                          aria-label={`Delete ${e.title}`}
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
        <EventForm
          initial={form}
          onClose={closeForm}
          onSaved={() => {
            closeForm()
            load()
          }}
        />
      )}
      {del && (
        <ConfirmDialog
          title="Delete this event?"
          message={`"${del.title}" and its sign-ups and attendance records will be permanently removed. This cannot be undone.`}
          confirmLabel="Delete event"
          danger
          busy={deleting}
          onConfirm={remove}
          onCancel={() => setDel(null)}
        />
      )}
    </>
  )
}
