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
        #qr-reader {
          border: none !important;
          background: #000 !important;
          border-radius: 14px;
          overflow: hidden;
        }
        #qr-reader video {
          border-radius: 14px;
          object-fit: cover;
          max-height: 320px;
        }
        #qr-reader img[alt="Info icon"] {
          display: none !important;
        }
        #qr-reader__scan_region {
          border: 2px dashed #f97316 !important;
          border-radius: 12px;
        }
      `}</style>

      <PageHeader
        title="Check-in & Attendance"
        desc="Scan member QR codes with your camera or enter Member IDs manually. Fast, automated, and supports walk-ins."
      />

      <section className="p-panel">
        <div className="p-panel-body">
          {/* Event Selection */}
          <div className="p-field" style={{ marginBottom: 20 }}>
            <label className="p-label" htmlFor="ci-event">Selected Event</label>
            <select
              id="ci-event"
              className="p-input"
              value={eventId}
              onChange={(e) => setEventId(e.target.value)}
              style={{ fontSize: 15, fontWeight: 600 }}
            >
              {events.length === 0 && <option value="">No events yet</option>}
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title} — {fmtDate(e.event_date)}
                </option>
              ))}
            </select>
          </div>

          {/* Action Row: Camera Toggle + Quick Info */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            marginBottom: 20
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: isScanning ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                color: isScanning ? '#ef4444' : '#3b82f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {isScanning ? <CameraOff size={20} /> : <QrCode size={20} />}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                  {isScanning ? 'Live QR Scanner Active' : 'Camera QR Scanner'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#9ca3af' }}>
                  {isScanning
                    ? 'Point your phone or webcam at the member’s pass'
                    : 'Use device camera for touchless instant check-in'}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={toggleScanner}
              disabled={!eventId}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '9px 18px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.88rem',
                border: 'none',
                cursor: eventId ? 'pointer' : 'not-allowed',
                background: isScanning
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                color: isScanning ? '#ef4444' : '#ffffff',
                boxShadow: isScanning ? 'none' : '0 4px 12px rgba(234, 88, 12, 0.3)',
                transition: 'all 0.2s ease',
              }}
            >
              {isScanning ? (
                <>
                  <CameraOff size={16} /> Stop Camera
                </>
              ) : (
                <>
                  <Camera size={16} /> Open QR Scanner
                </>
              )}
            </button>
          </div>

          {/* Camera Scanner Viewfinder */}
          {isScanning && (
            <div style={{
              background: '#090d16',
              border: '2px solid rgba(34, 197, 94, 0.35)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 20,
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.5)'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 12,
                padding: '0 4px'
              }}>
                <span style={{ fontSize: '0.82rem', color: '#4ade80', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                  Camera Live — Scanning for LifeGen QR Pass
                </span>
                <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                  Audio feedback on scan
                </span>
              </div>

              <div id="qr-reader" style={{ width: '100%', maxWidth: 420, margin: '0 auto' }} />

              {lastScanned && (
                <div style={{ marginTop: 12, fontSize: '0.82rem', color: '#e5e7eb' }}>
                  Last detected: <strong className="p-mono" style={{ color: '#4ade80' }}>{lastScanned}</strong>
                </div>
              )}
            </div>
          )}

          {cameraError && (
            <div className="p-banner bad" style={{ marginBottom: 16 }}>
              <AlertCircle size={18} style={{ flex: 'none', marginTop: 1 }} />
              <div>
                <strong>Camera Error:</strong> {cameraError}
                <div style={{ fontSize: '0.78rem', marginTop: 4, color: '#fca5a5' }}>
                  Make sure camera permissions are allowed in your browser address bar. You can still check in members manually below!
                </div>
              </div>
            </div>
          )}

          {/* Manual Member ID Input (Always available!) */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              checkIn(memberId)
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label className="p-label" htmlFor="ci-member" style={{ margin: 0 }}>
                Manual Check-In (Member ID, Username, or Email)
              </label>
              <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Format: LG-YYYY-XXXXX</span>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="ci-member"
                ref={inputRef}
                className="p-input p-mono"
                style={{ fontSize: 16, letterSpacing: 0.5 }}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="e.g. LG-2026-00001 or john_doe"
                autoComplete="off"
                autoCapitalize="characters"
                disabled={!eventId}
              />
              <button
                type="submit"
                className="p-btn p-btn-primary"
                disabled={submitting || !memberId.trim() || !eventId}
                style={{ whiteSpace: 'nowrap', padding: '0 20px' }}
              >
                {submitting ? 'Checking…' : 'Check In'}
              </button>
            </div>
          </form>

          {/* Result Banner */}
          {result && (
            <div
              className={`p-banner ${result.tone}`}
              role="status"
              style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                animation: 'fadeIn 0.25s ease'
              }}
            >
              {result.tone === 'ok' ? (
                <CheckCircle2 size={22} style={{ color: '#22c55e', flex: 'none' }} />
              ) : result.tone === 'warn' ? (
                <AlertCircle size={22} style={{ color: '#f59e0b', flex: 'none' }} />
              ) : (
                <AlertCircle size={22} style={{ color: '#ef4444', flex: 'none' }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.94rem' }}>
                  {result.text}
                </div>
                {result.member && (
                  <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: 2 }}>
                    ID: <span className="p-mono">{result.member.member_id}</span> &bull; {result.member.email}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Attendance Stats & Attendees List */}
      <section className="p-panel">
        <div className="p-panel-head">
          <div>
            <h2 className="p-h2">{current ? current.title : 'Attendance'}</h2>
            <div style={{ fontSize: '0.82rem', color: '#9ca3af', marginTop: 2 }}>
              {current ? `${fmtDate(current.event_date)} at ${current.location || 'Life Generation Church'}` : ''}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span className="p-num" style={{ fontSize: 15, fontWeight: 700, color: '#4ade80' }}>
              {checked} / {attendees.length}
            </span>
            <span className="p-muted" style={{ fontSize: 12, marginLeft: 4 }}>
              ({pct}% present)
            </span>
          </div>
        </div>

        <div style={{ padding: '0 16px' }}>
          <div className="p-bar" style={{ marginTop: 12 }} aria-hidden="true">
            <i style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #10b981, #22c55e)' }} />
          </div>
        </div>

        <div className="p-panel-body" style={{ paddingBottom: 0 }}>
          <Tabs
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'all', label: 'All Attendees', count: attendees.length },
              { value: 'in', label: 'Checked In', count: checked },
              { value: 'out', label: 'Pending', count: attendees.length - checked },
            ]}
          />
          <div className="p-search" style={{ marginBottom: 12 }}>
            <Search size={16} />
            <input
              className="p-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter by name, email, or Member ID…"
              aria-label="Search attendees"
            />
          </div>
        </div>

        {loadingList ? (
          <Loading rows={4} />
        ) : shown.length === 0 ? (
          <Empty icon={Users} title="No attendees found" desc="Members who sign up or are checked in will appear here." />
        ) : (
          shown.map((a) => {
            const done = Number(a.checked_in) === 1
            return (
              <div className="p-row" key={a.id}>
                <div className="p-row-main">
                  <div className="p-row-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>{a.member_name}</span>
                    {done && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', color: '#22c55e' }}>
                        <Check size={14} />
                      </span>
                    )}
                  </div>
                  <div className="p-row-sub">
                    <span className="p-mono" style={{ color: '#4ade80', fontWeight: 600 }}>{a.member_id}</span>
                    {a.email ? ` · ${a.email}` : ''}
                    {done && a.checked_in_at ? ` · Checked in ${fmtDateTime(a.checked_in_at)}` : ''}
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
