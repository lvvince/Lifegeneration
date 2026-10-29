import { useEffect, useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Minus, Download, UserRoundX, CalendarClock, Info, RefreshCw } from 'lucide-react'
import { apiGet } from '../../api.js'
import { fmtDate, fmtCurrency } from '../../lib/format.js'
import { downloadCsv } from '../../lib/csv.js'
import { Tabs, Empty, Loading, Badge } from './ui.jsx'
import ForecastChart from './Charts.jsx'
import '../../styles/insights.css'

const DIR = { up: TrendingUp, down: TrendingDown, flat: Minus }
const DIR_TXT = { up: 'trending up', down: 'trending down', flat: 'holding steady' }
const mon = (k) => {
  const [y, m] = String(k).split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-PH', { month: 'short', year: '2-digit' })
}
const sum = (a) => a.reduce((t, p) => t + p.value, 0)

function Forecast({ label, value, note, dir, conf }) {
  const Icon = DIR[dir] || Minus
  return (
    <div className={`in-card is-${dir}`}>
      <span className="in-card-l">{label}</span>
      <strong>{value}</strong>
      <span className="in-card-d"><Icon size={16} strokeWidth={2.2} aria-hidden="true" /> {note}</span>
      <span className="in-conf" title="How closely the trend line fits the history">Fit {conf}%</span>
    </div>
  )
}

/* Predictive analysis para sa officer at admin. GET /api/reports/predictive */
export default function Insights() {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState('attendance')
  const [busy, setBusy] = useState(true)

  const load = () => {
    setBusy(true)
    setErr('')
    apiGet('/api/reports/predictive').then(setD).catch((e) => setErr(e.message)).finally(() => setBusy(false))
  }
  useEffect(load, [])

  const view = useMemo(() => {
    if (!d) return null
    const a = d.attendance
    const g = d.growth
    const m = d.giving
    return {
      attendance: {
        labels: a.history.map((e) => `${e.title} (${fmtDate(e.event_date, { month: 'short', day: 'numeric' })})`),
        axis: a.history.map((e) => fmtDate(e.event_date, { month: 'short', day: 'numeric' })),
        values: a.history.map((e) => e.attended),
        fcLabels: a.forecast.points.map((_, i) => `Next ${i + 1}`),
        fc: a.forecast.points,
        fmt: (v) => Math.round(v),
        unit: ' people',
      },
      members: { labels: g.months.map(mon), values: g.values, fcLabels: g.forecast_months.map(mon), fc: g.forecast.points, fmt: (v) => Math.round(v), unit: ' new' },
      giving: { labels: m.months.map(mon), values: m.values, fcLabels: m.forecast_months.map(mon), fc: m.forecast.points, fmt: (v) => fmtCurrency(v).replace('.00', ''), unit: '' },
    }
  }, [d])

  if (busy && !d) return <section className="p-panel"><Loading rows={5} /></section>
  if (err) return <div className="alert" style={{ marginBottom: 16 }}>{err}</div>
  if (!d) return null

  const a = d.attendance
  const nextEv = d.upcoming[0]
  const g = d.growth
  const m = d.giving
  const cur = view[tab]
  const tooFew = a.events_considered < 3

  return (
    <section className="in" aria-labelledby="in-h">
      <div className="in-head">
        <div>
          <h2 id="in-h" className="p-h2">Predictive analysis</h2>
          <p className="in-sub">Forecasts from your own attendance, member and giving history.</p>
        </div>
        <button type="button" className="p-btn p-btn-secondary p-btn-sm" onClick={load} disabled={busy}>
          <RefreshCw size={14} className={busy ? 'p-spin' : ''} /> Refresh
        </button>
      </div>

      {tooFew && (
        <p className="in-note"><Info size={16} aria-hidden="true" /> Only {a.events_considered} past event{a.events_considered === 1 ? '' : 's'} on record. Forecasts get sharper after about 5 events.</p>
      )}

      <div className="in-cards">
        <Forecast
          label="Expected at next event"
          value={nextEv ? `${nextEv.expected}` : `${Math.round(a.forecast.points[0]?.value ?? 0)}`}
          note={nextEv ? `${nextEv.rsvps} signed up x ${d.show_rate}% show-up` : `Attendance ${DIR_TXT[a.forecast.direction]}`}
          dir={a.forecast.direction}
          conf={a.forecast.confidence}
        />
        <Forecast
          label="Members in 3 months"
          value={g.projected_members}
          note={`+${Math.round(sum(g.forecast.points))} new, ${DIR_TXT[g.forecast.direction]}`}
          dir={g.forecast.direction}
          conf={g.forecast.confidence}
        />
        <Forecast
          label="Giving next month"
          value={fmtCurrency(m.forecast.points[0]?.value ?? 0).replace('.00', '')}
          note={`Giving ${DIR_TXT[m.forecast.direction]}`}
          dir={m.forecast.direction}
          conf={m.forecast.confidence}
        />
      </div>

      <div className="p-panel in-chart">
        <div className="p-panel-head">
          <Tabs
            tabs={[
              { value: 'attendance', label: 'Attendance' },
              { value: 'members', label: 'New members' },
              { value: 'giving', label: 'Giving' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>
        <div className="p-panel-body">
          {cur.values.every((v) => !v) && !cur.fc.some((f) => f.value) ? (
            <Empty icon={Info} title="Not enough data yet" desc="Forecasts appear as soon as there is some history." />
          ) : (
            <ForecastChart labels={cur.labels} axis={cur.axis} values={cur.values} fcLabels={cur.fcLabels} forecast={cur.fc} format={cur.fmt} unit={cur.unit} />
          )}
        </div>
      </div>

      <div className="p-grid-2">
        <section className="p-panel">
          <div className="p-panel-head"><h3 className="p-h2">Upcoming turnout</h3></div>
          {d.upcoming.length === 0 ? (
            <div className="p-panel-body"><p className="p-muted">No upcoming events to forecast.</p></div>
          ) : (
            d.upcoming.map((e) => (
              <div className="p-row" key={e.id}>
                <div className="p-row-main">
                  <div className="p-row-title">{e.title}</div>
                  <div className="p-row-sub"><CalendarClock size={12} aria-hidden="true" /> {fmtDate(e.event_date)} · {e.rsvps} signed up{e.capacity ? ` of ${e.capacity}` : ''}</div>
                </div>
                <span className="p-badge" title="Signed up x historical show-up rate">~{e.expected} expected</span>
              </div>
            ))
          )}
        </section>

        <section className="p-panel">
          <div className="p-panel-head">
            <h3 className="p-h2">At risk of drifting</h3>
            <button
              type="button"
              className="p-btn p-btn-secondary p-btn-sm"
              disabled={!d.at_risk.length}
              onClick={() => downloadCsv('follow-up-list.csv', d.at_risk, [
                { key: 'member_id', label: 'Member ID' },
                { key: 'full_name', label: 'Name' },
                { key: 'recent_attended', label: 'Attended (last 5 events)' },
                { key: 'risk', label: 'Risk' },
                { key: 'last_seen', label: 'Last check-in' },
              ])}
            >
              <Download size={14} /> CSV
            </button>
          </div>
          {d.at_risk.length === 0 ? (
            <div className="p-panel-body"><p className="p-muted">No one stands out. Regulars who skipped the last 2 events show up here.</p></div>
          ) : (
            d.at_risk.map((r) => (
              <div className="p-row" key={r.user_id}>
                <div className="p-row-main">
                  <div className="p-row-title"><UserRoundX size={14} aria-hidden="true" /> {r.full_name}</div>
                  <div className="p-row-sub">Came to {r.recent_attended} of the last 5 · last seen {fmtDate(r.last_seen)}</div>
                </div>
                <Badge tone={r.risk === 'high' ? 'warn' : ''}>{r.risk}</Badge>
              </div>
            ))
          )}
        </section>
      </div>

      <p className="in-foot"><Info size={14} aria-hidden="true" /> {d.method} Past {a.events_considered} events used. Expected turnout = sign-ups x {d.show_rate}% historical show-up rate.</p>
    </section>
  )
}
