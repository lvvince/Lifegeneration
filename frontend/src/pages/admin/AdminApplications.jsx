import { useEffect, useMemo, useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { apiGet, apiPost } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import {
  PageHeader, Empty, Loading, Tabs, Badge, useToast,
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

  return (
    <>
      <PageHeader
        title="Applications"
        desc="Members who want to serve in a ministry. Approving one adds the member to that ministry."
      />
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'pending', label: 'Pending', count: counts.pending },
          { value: 'approved', label: 'Approved', count: counts.approved },
          { value: 'rejected', label: 'Rejected', count: counts.rejected },
          { value: 'all', label: 'All', count: apps.length },
        ]}
      />

      <section className="p-panel">
        {loading ? (
          <Loading rows={4} />
        ) : shown.length === 0 ? (
          <Empty
            icon={ClipboardList}
            title={tab === 'pending' ? 'Nothing to review' : 'No applications here'}
            desc={tab === 'pending' ? 'New applications will show up here.' : undefined}
          />
        ) : (
          shown.map((a) => (
            <div className="p-row p-row-wrap" key={a.id}>
              <div className="p-row-main">
                <div className="p-row-title">
                  {a.member_name} <span className="p-muted" style={{ fontWeight: 400 }}>applied to</span> {a.ministry_name}
                </div>
                <div className="p-row-sub">
                  <span className="p-mono">{a.member_id || '—'}</span>
                  {a.email ? ` · ${a.email}` : ''} · {fmtDate(a.created_at)}
                </div>
                {a.message && <p className="p-quote">{a.message}</p>}
              </div>
              <div className="p-inline" style={{ flexWrap: 'wrap' }}>
                <Badge tone={TONE[a.status]}>{a.status}</Badge>
                {a.status !== 'approved' && (
                  <button
                    type="button"
                    className="p-btn p-btn-primary p-btn-sm"
                    disabled={busyId === a.id}
                    onClick={() => setStatus(a, 'approved')}
                  >
                    Approve
                  </button>
                )}
                {a.status !== 'rejected' && (
                  <button
                    type="button"
                    className="p-btn p-btn-secondary p-btn-sm"
                    disabled={busyId === a.id}
                    onClick={() => setStatus(a, 'rejected')}
                  >
                    Reject
                  </button>
                )}
                {a.status !== 'pending' && (
                  <button
                    type="button"
                    className="p-btn p-btn-quiet p-btn-sm"
                    disabled={busyId === a.id}
                    onClick={() => setStatus(a, 'pending')}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </section>
    </>
  )
}
