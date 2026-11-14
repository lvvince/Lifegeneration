import { useEffect, useMemo, useState } from 'react'
import { ClipboardList, Check, X, RotateCcw } from 'lucide-react'
import '../../styles/staffui.css'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import {
  PageHeader, Empty, Loading, useToast,
} from '../../components/portal/ui.jsx'

const TONE = { pending: 'warn', approved: 'ok', rejected: 'bad' }

export default function AdminApplications() {
  const toast = useToast()
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('pending')
  const [busyId, setBusyId] = useState(null)

  const load = () =>
    apiGet('/api/ministries/applications')
      .then((d) => setApps(Array.isArray(d) ? d : []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

  useEffect(() => {
    load()
  }, [])

  const counts = useMemo(() => {
    const c = { pending: 0, approved: 0, rejected: 0 }
    apps.forEach((a) => {
      if (c[a.status] !== undefined) c[a.status]++
    })
    return c
  }, [apps])

  const shown = tab === 'all' ? apps : apps.filter((a) => a.status === tab)

  async function setStatus(a, status) {
    setBusyId(a.id)
    try {
      const res = await apiPost('/api/ministries/update-application', { application_id: a.id, status })
      toast(res.message || `Application ${status}.`)
      await load()
    } catch (e) {
      toast(e.message || 'Could not update the application.', 'bad')
    } finally {
      setBusyId(null)
    }
  }

  const initials = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
  return (
    <div className="su">
      <PageHeader
        title="Applications"
        desc="Members who want to serve. Approving adds them to the ministry."
        actions={counts.pending > 0 ? <span className="su-badge">{counts.pending} to review</span> : null}
      />
      {error && <div className="alert" style={{ marginBottom: 12 }}>{error}</div>}

      <div className="su-bar is-simple">
        <div className="su-seg" role="group" aria-label="Status">
          {[['pending', 'Pending', counts.pending], ['approved', 'Approved', counts.approved], ['rejected', 'Rejected', counts.rejected], ['all', 'All', apps.length]].map(([k, l, n]) => (
            <button key={k} type="button" className={tab === k ? 'is-on' : ''} aria-pressed={tab === k} onClick={() => setTab(k)}>{l}<em>{n}</em></button>
          ))}
        </div>
      </div>

      <section className="su-list su-grid" aria-live="polite">
        {loading ? (
          <Loading rows={4} />
        ) : shown.length === 0 ? (
          <Empty
            icon={ClipboardList}
            title={tab === 'pending' ? 'Nothing to review' : 'No applications here'}
            desc={tab === 'pending' ? 'New applications will show up here.' : undefined}
          />
        ) : (
          shown.map((a, i) => (
            <article className={`su-row is-${a.status} is-stack`} key={a.id} style={{ '--i': Math.min(i, 8) }}>
              <span className="su-puck">{initials(a.member_name)}</span>
              <div className="su-main">
                <div className="su-top">
                  <h3>{a.member_name}</h3>
                  <span className={`su-pill is-${a.status}`}>{a.status}</span>
                </div>
                <div className="su-meta">
                  <span className="su-chip is-accent">{a.ministry_name}</span>
                  <code>{a.member_id || '—'}</code>
                  <time>{fmtDate(a.created_at)}</time>
                </div>
                {a.email && <div className="su-sub">{a.email}</div>}
                {a.message && <p className="su-note">“{a.message}”</p>}
              </div>
              <div className="su-acts is-row">
                {a.status !== 'approved' && (
                  <button type="button" className="su-act is-ok" disabled={busyId === a.id} onClick={() => setStatus(a, 'approved')}><Check size={16} /> Approve</button>
                )}
                {a.status !== 'rejected' && (
                  <button type="button" className="su-act" disabled={busyId === a.id} onClick={() => setStatus(a, 'rejected')}><X size={16} /> Reject</button>
                )}
                {a.status !== 'pending' && (
                  <button type="button" className="su-act is-quiet" disabled={busyId === a.id} onClick={() => setStatus(a, 'pending')}><RotateCcw size={15} /> Reset</button>
                )}
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
