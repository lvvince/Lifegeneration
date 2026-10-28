import { useEffect, useMemo, useState, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CalendarDays, Plus, Pencil, Trash2, UserCheck, Upload, Image as ImageIcon, X, MapPin, ExternalLink, Compass } from 'lucide-react'
import { apiGet, apiPost, API_URL } from '../../api.js'
import { fmtDate, isUpcoming, to12h, to24h, resolveImageUrl } from '../../lib/format.js'
import { getGoogleMapEmbedUrl, getGoogleMapsDirectionsUrl } from '../../utils/maps.js'
import {
  PageHeader, Empty, Loading, Tabs, Modal, Field, ConfirmDialog, useToast,
} from '../../components/portal/ui.jsx'

const blank = {
  id: null,
  title: '',
  description: '',
  location: '',
  map_url: '',
  event_date: '',
  time: '10:00',
  capacity: '',
  banner_image: '',
}

function EventForm({ initial, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState('')
  const fileInputRef = useRef(null)

  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }))

  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setErr('')
    try {
      const token = localStorage.getItem('access_token')
      const fd = new FormData()
      fd.append('banner', file)

      const res = await fetch(`${API_URL}/api/events/upload-banner`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: fd,
      })

      const data = await res.json()
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to upload image')
      }

      setF((s) => ({ ...s, banner_image: data.url }))
      toast('Photo uploaded successfully!')
    } catch (e2) {
      setErr(e2.message || 'Error uploading photo.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

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
        map_url: f.map_url?.trim() || '',
        event_date: f.event_date,
        event_time: to12h(f.time),
        capacity: f.capacity === '' ? '' : Number(f.capacity),
        banner_image: f.banner_image?.trim() || '',
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

  const previewSrc = resolveImageUrl(f.banner_image)

  return (
    <Modal title={f.id ? 'Edit event' : 'New event'} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="p-modal-body">
          {err && <div className="p-banner bad" style={{ marginBottom: 14 }}>{err}</div>}

          {/* Event Photo / Banner Upload */}
          <div style={{ marginBottom: 16 }}>
            <label className="p-label" style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <ImageIcon size={15} color="#f97316" /> Event Photo / Banner
              <span className="p-muted" style={{ fontWeight: 400, fontSize: '0.75rem' }}>(Admin only)</span>
            </label>

            {previewSrc ? (
              <div style={{
                position: 'relative',
                borderRadius: 12,
                overflow: 'hidden',
                border: '1px solid var(--border)',
                maxHeight: 180,
                background: '#090d16',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 8
              }}>
                <img
                  src={previewSrc}
                  alt="Event Banner Preview"
                  style={{ width: '100%', height: 180, objectFit: 'cover' }}
                />
                <button
                  type="button"
                  onClick={() => setF(s => ({ ...s, banner_image: '' }))}
                  title="Remove image"
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    background: 'rgba(0,0,0,0.7)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed rgba(255,255,255,0.15)',
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: 'rgba(255,255,255,0.02)',
                  cursor: 'pointer',
                  marginBottom: 8,
                  transition: 'border-color 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.5)'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'}
              >
                <Upload size={24} style={{ color: '#f97316', margin: '0 auto 6px' }} />
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#fff' }}>
                  {uploading ? 'Uploading image...' : 'Click to upload event photo'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                  Supports JPG, PNG, WEBP (Max 60MB)
                </div>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />

            <input
              className="p-input"
              placeholder="Or paste image URL (e.g. https://...)"
              value={f.banner_image || ''}
              onChange={set('banner_image')}
              style={{ fontSize: '0.82rem' }}
            />
          </div>

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
          <Field label="Venue & Physical Location" htmlFor="ev-loc" hint="e.g. LifeGen Hall, Main Campus or CCF Center, Pasig City">
            <input
              id="ev-loc"
              className="p-input"
              placeholder="Enter venue name or address"
              value={f.location}
              onChange={set('location')}
            />
          </Field>

          <Field
            label="Google Maps Pin / Link (Optional)"
            htmlFor="ev-map"
            hint="Paste Google Maps share link, coordinates, or leave blank to auto-pin from venue address above."
          >
            <input
              id="ev-map"
              className="p-input"
              placeholder="e.g. https://maps.app.goo.gl/... or coordinates"
              value={f.map_url || ''}
              onChange={set('map_url')}
              style={{ fontSize: '0.82rem' }}
            />
          </Field>

          {/* Live Google Map Preview */}
          {(() => {
            const embedPreviewUrl = getGoogleMapEmbedUrl(f.location, f.map_url)
            const directionsPreviewUrl = getGoogleMapsDirectionsUrl(f.location, f.map_url)

            if (embedPreviewUrl) {
              return (
                <div style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--p-border-strong, rgba(255,255,255,0.12))',
                  borderRadius: 12,
                  overflow: 'hidden',
                  marginBottom: 16,
                }}>
                  <div style={{
                    padding: '8px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(0, 0, 0, 0.25)',
                    borderBottom: '1px solid var(--p-border, rgba(255,255,255,0.08))',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                  }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f97316' }}>
                      <MapPin size={13} /> Live Google Map Pin Preview
                    </span>
                    <a
                      href={directionsPreviewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        color: 'var(--p-text-2, #a1a1aa)',
                        textDecoration: 'none',
                        fontSize: '0.74rem',
                      }}
                    >
                      Test in Google Maps <ExternalLink size={11} />
                    </a>
                  </div>
                  <div style={{ height: 160, width: '100%', position: 'relative', background: '#18181b' }}>
                    <iframe
                      title="Google Map Preview"
                      src={embedPreviewUrl}
                      width="100%"
                      height="100%"
                      style={{ border: 0, display: 'block' }}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </div>
              )
            }

            return (
              <div style={{
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(249, 115, 22, 0.05)',
                border: '1px dashed rgba(249, 115, 22, 0.25)',
                fontSize: '0.76rem',
                color: 'var(--p-text-3, #71717a)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 16,
              }}>
                <MapPin size={14} style={{ color: '#f97316', flexShrink: 0 }} />
                <span>Enter a venue or paste a Google Maps link to preview the pin members will see.</span>
              </div>
            )
          })()}
          <Field label="Description" htmlFor="ev-desc">
            <textarea id="ev-desc" className="p-input" value={f.description} onChange={set('description')} />
          </Field>
          <Field label="Capacity" htmlFor="ev-cap" hint="Leave blank for no limit.">
            <input id="ev-cap" type="number" min="1" className="p-input" value={f.capacity} onChange={set('capacity')} />
          </Field>
        </div>
        <div className="p-modal-foot">
          <button type="button" className="p-btn p-btn-secondary" onClick={onClose} disabled={saving || uploading}>
            Cancel
          </button>
          <button type="submit" className="p-btn p-btn-primary" disabled={saving || uploading}>
            {saving ? 'Saving...' : f.id ? 'Save changes' : 'Create event'}
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
      map_url: e.map_url || '',
      event_date: String(e.event_date || '').slice(0, 10),
      time: to24h(e.event_time),
      capacity: e.capacity ?? '',
      banner_image: e.banner_image || '',
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
        desc="Create gatherings, set a capacity, upload photos, and see who signed up."
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
            desc={tab === 'upcoming' ? 'Create an event with a banner photo so members can sign up.' : undefined}
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
                {shown.map((e) => {
                  const img = resolveImageUrl(e.banner_image)
                  return (
                    <tr key={e.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {img ? (
                            <img
                              src={img}
                              alt={e.title}
                              style={{
                                width: 48,
                                height: 48,
                                borderRadius: 8,
                                objectFit: 'cover',
                                flexShrink: 0,
                                border: '1px solid var(--border)'
                              }}
                            />
                          ) : (
                            <div style={{
                              width: 48,
                              height: 48,
                              borderRadius: 8,
                              background: 'rgba(255,255,255,0.05)',
                              border: '1px solid var(--border)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              <ImageIcon size={20} color="var(--muted)" />
                            </div>
                          )}
                          <div>
                            <div className="p-row-title">{e.title}</div>
                            <div className="p-row-sub">{e.location || 'No location set'}</div>
                          </div>
                        </div>
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
                  )
                })}
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
