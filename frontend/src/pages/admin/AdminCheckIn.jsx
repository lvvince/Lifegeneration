import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Search, Users } from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate, fmtDateTime } from '../../lib/format.js'
import { PageHeader, Empty, Loading, Tabs, Badge, useToast } from '../../components/portal/ui.jsx'

export default function AdminCheckIn() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState(params.get('event') || '')
  const [memberId, setMemberId] = useState('')
  const [attendees, setAttendees] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // {tone, text}
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    apiGet('/api/events')
      .then((evs) => {
        const list = Array.isArray(evs) ? evs : []
        setEvents(list)
        if (!eventId && list.length) setEventId(String(list[0].id))
      })
      .catch((e) => setResult({ tone: 'bad', text: e.message }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAttendees = async (id) => {
    if (!id) return
    setLoadingList(true)
    try {
      const d = await apiGet(`/api/events/${id}/attendees`)
      setAttendees(Array.isArray(d) ? d : [])
    } catch (e) {
      setResult({ tone: 'bad', text: e.message })
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    setResult(null)
    setTab('all')
    loadAttendees(eventId)
    if (eventId) setParams({ event: eventId }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function checkIn(code) {
    const value = code.trim().toUpperCase()
    if (!value || !eventId) return
    setSubmitting(true)
    setResult(null)
    try {
      const res = await apiPost('/api/events/check-in', { event_id: eventId, member_id: value })
      setResult({ tone: res.already_in ? 'warn' : 'ok', text: res.message })
      if (!res.already_in) toast(res.message)
      setMemberId('')
      await loadAttendees(eventId)
    } catch (e) {
      setResult({ tone: 'bad', text: e.message || 'Check-in failed. Please check the Member ID.' })
    } finally {
      setSubmitting(false)
      inputRef.current?.focus()
    }
  }

  const checked = attendees.filter((a) => Number(a.checked_in) === 1).length
  const pct = attendees.length ? Math.round((checked / attendees.length) * 100) : 0

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return attendees.filter((a) => {
      const done = Number(a.checked_in) === 1
      if (tab === 'in' && !done) return false
      if (tab === 'out' && done) return false
      if (!term) return true
      return [a.member_name, a.member_id].some((v) => String(v || '').toLowerCase().includes(term))
    })
  }, [attendees, tab, q])

  const current = events.find((e) => String(e.id) === String(eventId))

  return (
    <>
      <PageHeader
        title="Check-in"
        desc="Type or scan a Member ID to log attendance. Walk-ins who did not sign up can be checked in too."
      />

      <section className="p-panel">
        <div className="p-panel-body">
          <div className="p-field">
            <label className="p-label" htmlFor="ci-event">Event</label>
            <select id="ci-event" className="p-input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} — {fmtDate(e.event_date)}
                </option>
              ))}
            </select>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkIn(memberId)
            }}
          >
            <label className="p-label" htmlFor="ci-member">Member ID</label>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <input
                id="ci-member"
                ref={inputRef}
                className="p-input p-mono"
                style={{ fontSize: 16 }}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="LG-2026-XXXXX"
                autoComplete="off"
                autoCapitalize="characters"
                autoFocus
                disabled={!eventId}
              />
              <button type="submit" className="p-btn p-btn-primary" disabled={submitting || !memberId.trim() || !eventId}>
                {submitting ? 'Checking…' : 'Check in'}
              </button>
            </div>
          </form>

          {result && (
            <div className={`p-banner ${result.tone}`} role="status" style={{ marginTop: 14 }}>
              <Check size={18} style={{ flex: 'none', marginTop: 1 }} />
              <span>{result.text}</span>
            </div>
          )}
        </div>
      </section>

      <section className="p-panel">
        <div className="p-panel-head">
          <h2 className="p-h2">{current ? current.title : 'Attendance'}</h2>
          <span className="p-num p-muted" style={{ fontSize: 13 }}>
            {checked} of {attendees.length} checked in
          </span>
        </div>
        <div style={{ padding: '0 16px' }}>
          <div className="p-bar" style={{ marginTop: 12 }} aria-hidden="true">
            <i style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="p-panel-body" style={{ paddingBottom: 0 }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'Signed up', count: attendees.length },
              { value: 'in', label: 'Checked in', count: checked },
              { value: 'out', label: 'Not yet', count: attendees.length - checked },
            ]}
          />
          <div className="p-search" style={{ marginBottom: 12 }}>
            <Search size={16} />
            <input
              className="p-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or ID"
              aria-label="Search attendees"
            />
          </div>
        </div>

        {loadingList ? (
          <Loading rows={4} />
        ) : shown.length === 0 ? (
          <Empty icon={Users} title="No one here yet" desc="Members who sign up will be listed here." />
        ) : (
          shown.map((a) => {
            const done = Number(a.checked_in) === 1
            return (
              <div className="p-row" key={a.id}>
                <div className="p-row-main">
                  <div className="p-row-title">{a.member_name}</div>
                  <div className="p-row-sub">
                    <span className="p-mono">{a.member_id}</span>
                    {done && a.checked_in_at ? ` · ${fmtDateTime(a.checked_in_at)}` : ''}
                  </div>
                </div>
                {done ? (
                  <Badge tone="ok">Checked in</Badge>
                ) : (
                  <button
                    type="button"
                    className="p-btn p-btn-secondary p-btn-sm"
                    disabled={submitting}
                    onClick={() => checkIn(a.member_id)}
                  >
                    Check in
                  </button>
                )}
              </div>
            )
          })
        )}
      </section>
    </>
  )
}
