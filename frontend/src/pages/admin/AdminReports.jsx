import { useEffect, useState } from 'react'
import { Download, FileText, Printer, Users, TrendingUp, Heart, ClipboardList } from 'lucide-react'
import { apiGet } from '../../api.js'
import { fmtDate } from '../../lib/format.js'
import { downloadCsv } from '../../lib/csv.js'
import { PageHeader, Stats, Empty, Loading, useToast } from '../../components/portal/ui.jsx'
import Insights from '../../components/portal/Insights.jsx'
import PrintReportModal from '../../components/PrintReportModal.jsx'
import PieChart from '../../components/PieChart.jsx'

/* ── inline helpers ── */
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

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--p-surface)',
      border: '1px solid var(--p-border, rgba(0,0,0,.08))',
      borderRadius: 12,
      padding: '18px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      minWidth: 0,
    }}>
      <span style={{
        width: 42, height: 42, borderRadius: 10, flexShrink: 0,
        background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        <Icon size={20} />
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '1.4rem', fontWeight: 800, lineHeight: 1.1, color: 'var(--p-text)' }}>{value ?? '—'}</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--p-muted, #888)', marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.74rem', color: 'var(--p-muted, #888)', marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  )
}

/* ── currency formatter (₱) ── */
function peso(n) {
  if (!n && n !== 0) return '—'
  return '₱' + Number(n).toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

/* ── gender label normalizer ── */
const GENDER_COLOR = { Male: '#1d4ed8', Female: '#db2777', Unspecified: '#9ca3af' }
function genderColor(label) {
  return GENDER_COLOR[label] || '#9ca3af'
}

/* ── application status colors ── */
const APP_COLOR = { approved: '#16a34a', pending: '#ca8a04', rejected: '#dc2626', unknown: '#9ca3af' }
function appColor(label) {
  return APP_COLOR[label?.toLowerCase()] || '#9ca3af'
}

export default function AdminReports() {
  const toast = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [showPrint, setShowPrint] = useState(false)

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
        { key: 'gender', label: 'Gender' },
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

  /* ── build pie chart data arrays ── */
  const dgroupPie = (data?.dgroups ?? []).map((x) => ({ label: x.name, value: Number(x.total) }))
  const ministryPie = (data?.ministries ?? []).map((x) => ({ label: x.name, value: Number(x.total) }))
  const genderPie = (data?.gender_breakdown ?? []).map((x) => ({ label: x.label, value: x.total, color: genderColor(x.label) }))
  const appPie = (data?.applications ?? []).map((x) => ({ label: x.label.charAt(0).toUpperCase() + x.label.slice(1), value: x.total, color: appColor(x.label) }))

  return (
    <>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <PageHeader title="Reports" desc="Member numbers, event attendance and forecasts. Export any table as CSV or print a full PDF report." />
        <button
          type="button"
          className="p-btn p-btn-primary"
          onClick={() => setShowPrint(true)}
          disabled={loading}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0, alignSelf: 'flex-end' }}
        >
          <Printer size={16} />
          Print / PDF
        </button>
      </div>

      {error && <div className="alert" style={{ marginBottom: 16 }}>{error}</div>}

      {/* ── Member stats ── */}
      <Stats
        loading={loading}
        items={[
          { label: 'Total members', value: m?.total },
          { label: 'Active', value: m?.active },
          { label: 'Inactive', value: m?.inactive },
          { label: 'Joined in last 30 days', value: m?.new_30_days },
        ]}
      />

      {/* ── Extra stat cards (giving + applications) ── */}
      {data && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12,
          marginTop: 12,
          marginBottom: 20,
        }}>
          <StatCard icon={Heart}         label="Total giving (verified)"  value={peso(data.giving_total)}      color="#ff5a0a" />
          <StatCard icon={TrendingUp}    label="Giving this month"         value={peso(data.giving_this_month)} color="#16a34a" />
          <StatCard icon={ClipboardList} label="Applications total"        value={data.applications?.reduce((s, x) => s + x.total, 0) ?? 0} color="#1d4ed8" />
          <StatCard icon={Users}         label="Gender entries recorded"   value={data.gender_breakdown?.reduce((s, x) => s + x.total, 0) ?? 0} color="#9333ea" />
        </div>
      )}

      {/* ── Predictive insights ── */}
      <Insights />

      {loading && (
        <section className="p-panel">
          <Loading rows={5} />
        </section>
      )}

      {data && (
        <>
          {/* ── Attendance per event ── */}
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

          {/* ── New members last 6 months ── */}
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

          {/* ── Pie chart grid ── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
            marginTop: 16,
          }}>
            {/* D-Group distribution */}
            <section className="p-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="p-panel-head"><h2 className="p-h2">Members per D-Group</h2></div>
              <div className="p-panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <PieChart
                  data={dgroupPie}
                  empty="No D-Groups yet."
                  size={180}
                />
                {dgroupPie.length > 0 && (
                  <div style={{ marginTop: 16, width: '100%' }}>
                    <BarList rows={data.dgroups.map((x) => ({ label: x.name, total: x.total }))} empty="" />
                  </div>
                )}
              </div>
            </section>

            {/* Ministry distribution */}
            <section className="p-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="p-panel-head"><h2 className="p-h2">Members per Ministry</h2></div>
              <div className="p-panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <PieChart
                  data={ministryPie}
                  empty="No ministries yet."
                  size={180}
                />
                {ministryPie.length > 0 && (
                  <div style={{ marginTop: 16, width: '100%' }}>
                    <BarList rows={data.ministries.map((x) => ({ label: x.name, total: x.total }))} empty="" />
                  </div>
                )}
              </div>
            </section>

            {/* Gender breakdown */}
            <section className="p-panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="p-panel-head"><h2 className="p-h2">Gender Breakdown</h2></div>
              <div className="p-panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <PieChart
                  data={genderPie}
                  empty="No gender data recorded."
                  size={180}
                />
              </div>
            </section>

            {/* Application status */}
            {appPie.length > 0 && (
              <section className="p-panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="p-panel-head"><h2 className="p-h2">Applications by Status</h2></div>
                <div className="p-panel-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <PieChart
                    data={appPie}
                    empty="No applications yet."
                    size={180}
                  />
                </div>
              </section>
            )}
          </div>
        </>
      )}

      {/* ── Print modal ── */}
      {showPrint && <PrintReportModal onClose={() => setShowPrint(false)} />}
    </>
  )
}
