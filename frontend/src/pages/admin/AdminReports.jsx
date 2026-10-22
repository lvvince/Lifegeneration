import { useEffect, useState } from 'react'
import { Download, FileText } from 'lucide-react'
import { apiGet } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import { downloadCsv } from '../../lib/csv.js'
import { PageHeader, Stats, Empty, Loading, useToast } from '../../components/portal/ui.jsx'

function Bar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="p-bar" aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
    </div>
  )
}

function BarList({ rows, empty }) {
  const max = Math.max(0, ...rows.map((r) => Number(r.total)))
  if (!rows.length) return <p className="p-muted">{empty}</p>
  return rows.map((r) => (
    <div className="p-barrow" key={r.label}>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}</span>
      <Bar value={Number(r.total)} max={max} />
      <span className="p-num" style={{ textAlign: 'right' }}>{r.total}</span>
    </div>
  ))
}

export default function AdminReports() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiGet('/api/reports/summary')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function exportMembers() {
    try {
      const rows = await apiGet('/api/members')
      downloadCsv('members-report.csv', rows, [
        { key: 'member_id', label: 'Member ID' },
        { key: 'full_name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'age', label: 'Age' },
        { key: 'address', label: 'Address' },
        { key: 'dgroup_name', label: 'D-Group' },
        { key: 'ministry_name', label: 'Ministry' },
        { key: 'joined_at', label: 'Joined' },
      ])
    } catch (e) {
      toast(e.message, 'bad')
    }
  }

  function exportAttendance() {
    downloadCsv('attendance-report.csv', data.events, [
      { key: 'title', label: 'Event' },
      { key: 'event_date', label: 'Date' },
      { key: 'rsvps', label: 'Signed up' },
      { key: 'attended', label: 'Attended' },
      { key: 'attendance_rate', label: 'Attendance %' },
    ])
  }

  const m = data?.members

  return (
    <>
      <PageHeader title="Reports" desc="Member numbers and event attendance. Export any table as CSV." />
      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      <Stats
        loading={loading}
        items={[
          { label: 'Total members', value: m?.total },
          { label: 'Active', value: m?.active },
          { label: 'Inactive', value: m?.inactive },
          { label: 'Joined in last 30 days', value: m?.new_30_days },
        ]}
      />

      {loading && (
        <section className="p-panel">
          <Loading rows={5} />
        </section>
      )}

      {data && (
        <>
          <section className="p-panel">
            <div className="p-panel-head">
              <h2 className="p-h2">Attendance per event</h2>
              <button type="button" className="p-btn p-btn-secondary p-btn-sm" onClick={exportAttendance} disabled={!data.events.length}>
                <Download size={14} /> Export CSV
              </button>
            </div>
            {data.events.length === 0 ? (
              <Empty icon={FileText} title="No events yet" desc="Attendance will show here once you have events." />
            ) : (
              <div className="p-table-wrap">
                <table className="p-table" style={{ minWidth: 560 }}>
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>Date</th>
                      <th>Signed up</th>
                      <th>Attended</th>
                      <th style={{ width: 180 }}>Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.events.map((e) => (
                      <tr key={e.id}>
                        <td className="p-row-title">{e.title}</td>
                        <td className="p-num">{fmtDate(e.event_date)}</td>
                        <td className="p-num">{e.rsvps}</td>
                        <td className="p-num">{e.attended}</td>
                        <td>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 40px', gap: 10, alignItems: 'center' }}>
                            <Bar value={e.attendance_rate} max={100} />
                            <span className="p-num p-muted" style={{ textAlign: 'right' }}>{e.attendance_rate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="p-panel">
            <div className="p-panel-head">
              <h2 className="p-h2">New members, last 6 months</h2>
              <button type="button" className="p-btn p-btn-secondary p-btn-sm" onClick={exportMembers}>
                <Download size={14} /> Export members CSV
              </button>
            </div>
            <div className="p-panel-body">
              <BarList
                rows={data.members_by_month.map((x) => ({ label: x.month, total: x.total }))}
                empty="No new members in this period."
              />
            </div>
          </section>

          <div className="p-grid-2" style={{ marginTop: 16 }}>
            <section className="p-panel">
              <div className="p-panel-head"><h2 className="p-h2">Members per D-Group</h2></div>
              <div className="p-panel-body">
                <BarList rows={data.dgroups.map((x) => ({ label: x.name, total: x.total }))} empty="No D-Groups yet." />
              </div>
            </section>
            <section className="p-panel">
              <div className="p-panel-head"><h2 className="p-h2">Members per ministry</h2></div>
              <div className="p-panel-body">
                <BarList rows={data.ministries.map((x) => ({ label: x.name, total: x.total }))} empty="No ministries yet." />
              </div>
            </section>
          </div>
        </>
      )}
    </>
  )
}
