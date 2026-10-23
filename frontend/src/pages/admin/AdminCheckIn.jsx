import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check,
  Search,
  Users,
  QrCode,
  Camera,
  CameraOff,
  AlertCircle,
  CheckCircle2,
  Volume2,
  RefreshCw,
  Sparkles
} from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate, fmtDateTime, initials } from '../../lib/format.js'
import { PageHeader, Empty, Loading, Tabs, Badge, useToast } from '../../components/portal/ui.jsx'
import '../../styles/pages.css'

export default function AdminCheckIn() {
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [eventId, setEventId] = useState(params.get('event') || '')
  const [memberId, setMemberId] = useState('')
  const [attendees, setAttendees] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null) // {tone, text, member}
  const [tab, setTab] = useState('all')
  const [q, setQ] = useState('')
  const inputRef = useRef(null)

  // QR Scanner States
  const [isScanning, setIsScanning] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [lastScanned, setLastScanned] = useState(null)
  const scannerRef = useRef(null)
  const lastScanTimeRef = useRef({ code: '', time: 0 })

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

  // Play pleasant check-in chime
  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(880, ctx.currentTime) // 880Hz crisp beep
      gain.gain.setValueAtTime(0.2, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.18)
    } catch {
      // Audio may be blocked by browser policy until gesture
    }
  }

  async function checkIn(code) {
    const raw = (code || '').trim()
    if (!raw || !eventId) return
    
    // Extract standard LG member ID if embedded in string/URL
    const match = raw.match(/LG-\d{4}-[A-Z0-9]+/i)
    const value = (match ? match[0] : raw).toUpperCase()

    setSubmitting(true)
    setResult(null)
    try {
      const res = await apiPost('/api/events/check-in', { event_id: eventId, member_id: value })
      setResult({
        tone: res.already_in ? 'warn' : 'ok',
        text: res.message,
        member: res.member,
      })
      if (!res.already_in) {
        toast(res.message)
      }
      setMemberId('')
      await loadAttendees(eventId)
    } catch (e) {
      setResult({ tone: 'bad', text: e.message || 'Check-in failed. Please check the Member ID.' })
    } finally {
      setSubmitting(false)
      inputRef.current?.focus()
    }
  }

  const handleScan = (rawText) => {
    if (!rawText) return
    const cleaned = rawText.trim()
    const match = cleaned.match(/LG-\d{4}-[A-Z0-9]+/i)
    const code = match ? match[0].toUpperCase() : cleaned.toUpperCase()

    const now = Date.now()
    if (lastScanTimeRef.current.code === code && now - lastScanTimeRef.current.time < 3500) {
      return // Avoid double scan trigger within 3.5 seconds
    }
    lastScanTimeRef.current = { code, time: now }

    playBeep()
    setLastScanned(code)
    checkIn(code)
  }

  const toggleScanner = () => {
    if (isScanning) {
      stopScanner()
    } else {
      setCameraError(null)
      setIsScanning(true)
    }
  }

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        await scannerRef.current.clear()
      } catch (err) {
        console.warn('Scanner stop error:', err)
      } finally {
        scannerRef.current = null
      }
    }
    setIsScanning(false)
  }

  // Effect to manage camera scanner lifecycle
  useEffect(() => {
    let html5QrCode = null
    let active = true

    if (isScanning && eventId) {
      const timer = setTimeout(async () => {
        const elem = document.getElementById('qr-reader')
        if (!elem || !active) return

        try {
          html5QrCode = new Html5Qrcode('qr-reader')
          scannerRef.current = html5QrCode

          await html5QrCode.start(
            { facingMode: 'environment' },
            {
              fps: 10,
              qrbox: { width: 240, height: 240 },
              aspectRatio: 1.0,
            },
            (decodedText) => {
              if (active) handleScan(decodedText)
            },
            () => {
              // Ignore standard frame scan errors
            }
          )
        } catch (err) {
          console.error('Failed to start camera:', err)
          if (active) {
            setCameraError(err?.message || 'Unable to access camera. Please allow camera permissions.')
            setIsScanning(false)
          }
        }
      }, 200)

      return () => {
        active = false
        clearTimeout(timer)
        if (html5QrCode) {
          try {
            if (html5QrCode.isScanning) {
              html5QrCode.stop().then(() => html5QrCode.clear()).catch(() => {})
            } else {
              html5QrCode.clear()
            }
          } catch (e) {
            // cleanup safely
          }
        }
      }
    }
  }, [isScanning, eventId])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop().then(() => scannerRef.current.clear()).catch(() => {})
          }
        } catch {
          // ignore
        }
      }
    }
  }, [])

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
      <style>{`
        #qr-reader { border: none !important; background: #000 !important; border-radius: 20px; overflow: hidden; width: 100%; }
        #qr-reader video { border-radius: 20px; object-fit: cover; max-height: 320px; }
        #qr-reader img[alt="Info icon"] { display: none !important; }
        #qr-reader__scan_region { border-radius: 16px; }
      `}</style>
      <PageHeader title="Check-in" desc="Scan a member's QR pass or type their ID. Walk-ins are welcome." />

      <div className="ck-grid">
        <div className="ck-side">
          <section className="p-panel ck-card">
            <label className="p-label" htmlFor="ci-event">Event</label>
            <select id="ci-event" className="p-input" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((e) => (
                <option key={e.id} value={e.id}>{e.title} — {fmtDate(e.event_date)}</option>
              ))}
            </select>
            <div className="ck-ring-row">
              <div className="ck-ring" aria-hidden="true">
                <svg viewBox="0 0 36 36">
                  <circle className="bg" cx="18" cy="18" r="15.9" />
                  <circle className="fg" cx="18" cy="18" r="15.9" pathLength="100" strokeDasharray={`${pct} 100`} />
                </svg>
                <b>{pct}%</b>
              </div>
              <div className="ck-ring-text">
                <strong>{checked} of {attendees.length}</strong>
                <span>checked in</span>
                {current && <small>{fmtDate(current.event_date)}{current.location ? ` · ${current.location}` : ''}</small>}
              </div>
            </div>
          </section>

          <section className="p-panel ck-card">
            <div className={`ck-scan${isScanning ? ' is-live' : ''}`}>
              {isScanning ? (
                <>
                  <div id="qr-reader" />
                  {lastScanned && <div className="ck-last">Last detected <b className="p-mono">{lastScanned}</b></div>}
                </>
              ) : (
                <div className="ck-idle">
                  <span className="neo-tile"><QrCode size={22} strokeWidth={1.7} /></span>
                  <b>Camera scanner</b>
                  <small>Start the camera and point it at a member's QR pass.</small>
                </div>
              )}
            </div>
            <button
              type="button"
              className={`p-btn ck-wide ${isScanning ? 'p-btn-secondary' : 'p-btn-primary'}`}
              onClick={toggleScanner}
              disabled={!eventId}
            >
              {isScanning ? <><CameraOff size={17} /> Stop camera</> : <><Camera size={17} /> Start scanner</>}
            </button>

            {cameraError && (
              <div className="p-banner bad">
                <AlertCircle size={18} style={{ flex: 'none', marginTop: 1 }} />
                <div>
                  <strong>Camera error:</strong> {cameraError}
                  <div style={{ fontSize: 12.5, marginTop: 4 }}>Allow the camera in your browser, or check in manually below.</div>
                </div>
              </div>
            )}

            <div className="ck-or"><span>or type an ID</span></div>
            <form onSubmit={(e) => { e.preventDefault(); checkIn(memberId) }}>
              <div className="ck-manual">
                <input
                  id="ci-member"
                  ref={inputRef}
                  className="p-input p-mono"
                  value={memberId}
                  onChange={(e) => setMemberId(e.target.value)}
                  placeholder="LG-2026-00001"
                  aria-label="Member ID, username or email"
                  autoComplete="off"
                  autoCapitalize="characters"
                  disabled={!eventId}
                />
                <button type="submit" className="p-btn p-btn-primary" disabled={submitting || !memberId.trim() || !eventId}>
                  {submitting ? 'Checking…' : 'Check in'}
                </button>
              </div>
              <span className="p-hint">Member ID, username or email.</span>
            </form>

            {result && (
              <div className={`p-banner ${result.tone}`} role="status">
                {result.tone === 'ok' ? <CheckCircle2 size={20} style={{ flex: 'none' }} /> : <AlertCircle size={20} style={{ flex: 'none' }} />}
                <div>
                  <b>{result.text}</b>
                  {result.member && (
                    <div style={{ fontSize: 12.5, marginTop: 2 }}>
                      <span className="p-mono">{result.member.member_id}</span>{result.member.email ? ` · ${result.member.email}` : ''}
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        </div>

        <section className="p-panel ck-list">
          <div className="p-panel-head">
            <div>
              <h2 className="p-h2">{current ? current.title : 'Attendance'}</h2>
              <div className="p-row-sub">{checked} of {attendees.length} present</div>
            </div>
          </div>
          <div className="p-panel-body" style={{ paddingBottom: 4 }}>
            <Tabs
              value={tab}
              onChange={setTab}
              tabs={[
                { value: 'all', label: 'All', count: attendees.length },
                { value: 'in', label: 'Checked in', count: checked },
                { value: 'out', label: 'Pending', count: attendees.length - checked },
              ]}
            />
            <div className="p-search" style={{ marginBottom: 6 }}>
              <Search size={16} />
              <input className="p-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email or ID" aria-label="Search attendees" />
            </div>
          </div>
          {loadingList ? (
            <Loading rows={4} />
          ) : shown.length === 0 ? (
            <Empty icon={Users} title="No attendees found" desc="Members who sign up or check in will appear here." />
          ) : (
            shown.map((a) => {
              const done = Number(a.checked_in) === 1
              return (
                <div className="p-row ck-row" key={a.id}>
                  <span className={`ck-av${done ? ' is-in' : ''}`}>{done ? <Check size={17} /> : initials(a.member_name)}</span>
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
                    <button type="button" className="p-btn p-btn-secondary p-btn-sm" disabled={submitting} onClick={() => checkIn(a.member_id)}>
                      Check in
                    </button>
                  )}
                </div>
              )
            })
          )}
        </section>
      </div>
    </>
  )
}
