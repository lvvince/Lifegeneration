import { useState, useEffect, useRef } from 'react'
import { X, Printer, Loader } from 'lucide-react'
import { apiGet } from '../api.js'
import { fmtDate, fmtCurrency } from '../lib/format.js'

/**
 * PrintReportModal
 *
 * Opens a print-ready HTML report in a new window and triggers window.print().
 * Uses only browser-native APIs — no external PDF library needed.
 * Accessible to admin + officer only (enforced by the backend; this component
 * is only rendered on admin/officer pages).
 */
export default function PrintReportModal({ onClose }) {
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [summary, setSummary] = useState(null)
  const [predictive, setPredictive] = useState(null)
  const printed = useRef(false)

  useEffect(() => {
    Promise.all([
      apiGet('/api/reports/summary'),
      apiGet('/api/reports/predictive'),
    ])
      .then(([s, p]) => { setSummary(s); setPredictive(p) })
      .catch((e) => setError(e.message || 'Failed to load report data.'))
      .finally(() => setLoading(false))
  }, [])

  function handlePrint() {
    if (!summary || !predictive) return
    openPrintWindow(summary, predictive)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Print report"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(3px)',
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32,
        width: '100%', maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        textAlign: 'center',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div style={{ textAlign: 'left' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>Print / Export PDF</h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#666' }}>
              Generates a full church analytics report ready to print or save as PDF.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close" style={{
            background: '#f4f4f4', border: 'none', borderRadius: '50%',
            width: 32, height: 32, cursor: 'pointer', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {loading && (
          <div style={{ padding: '24px 0', color: '#888' }}>
            <Loader size={28} style={{ animation: 'spin 1s linear infinite', marginBottom: 10 }} />
            <p style={{ margin: 0, fontSize: '0.88rem' }}>Fetching report data…</p>
          </div>
        )}

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '12px 16px', color: '#dc2626', fontSize: '0.85rem', marginBottom: 16 }}>
            {error}
          </div>
        )}

        {!loading && !error && summary && predictive && (
          <>
            {/* Report preview summary */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px', textAlign: 'left', marginBottom: 20 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#e55a00', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
                Report includes
              </div>
              {[
                `📊 Member Overview — ${summary.members.total} total, ${summary.members.active} active`,
                `📅 Attendance — ${summary.events.length} events`,
                `📈 Member Growth — last 6 months`,
                `🔮 Predictive Forecasts — 3-month outlook`,
                `⚠️ At-Risk Members — ${predictive.at_risk.length} flagged`,
                `🙏 D-Groups & Ministries breakdown`,
              ].map((line) => (
                <div key={line} style={{ fontSize: '0.82rem', color: '#374151', padding: '3px 0', borderBottom: '1px solid #f0f0f0' }}>
                  {line}
                </div>
              ))}
            </div>

            <button
              onClick={handlePrint}
              style={{
                width: '100%', padding: '12px 20px',
                background: '#e55a00', color: '#fff',
                border: 'none', borderRadius: 10,
                fontSize: '0.95rem', fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                boxShadow: '0 4px 14px rgba(229,90,0,0.3)',
                transition: 'opacity 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <Printer size={18} />
              Open print / Save PDF
            </button>
            <p style={{ margin: '10px 0 0', fontSize: '0.75rem', color: '#999' }}>
              In the print dialog, choose "Save as PDF" to export.
            </p>
          </>
        )}

        <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   openPrintWindow
   Builds a fully self-contained HTML document, injects it into a new window,
   and triggers print. No external dependencies.
───────────────────────────────────────────────────────────────────────────── */
function openPrintWindow(summary, predictive) {
  const generatedAt = new Date().toLocaleString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })

  const m   = summary.members
  const att = summary.events
  const dg  = summary.dgroups
  const min = summary.ministries
  const mbm = summary.members_by_month
  const p   = predictive

  // ── Helper: table row ────────────────────────────────────────────────
  const tr = (...cells) => `<tr>${cells.map((c) => `<td>${c}</td>`).join('')}</tr>`
  const th = (...cells) => `<tr>${cells.map((c) => `<th>${c}</th>`).join('')}</tr>`

  // ── Attendance rate bar (simple text representation) ─────────────────
  const rateBar = (rate) => {
    const filled = Math.round(rate / 10)
    return `<span class="bar-bg"><span class="bar-fill" style="width:${rate}%"></span></span> ${rate}%`
  }

  // ── At-risk rows ─────────────────────────────────────────────────────
  const atRiskRows = p.at_risk.length === 0
    ? '<tr><td colspan="4" class="center muted">No at-risk members detected.</td></tr>'
    : p.at_risk.map((r) => tr(
        r.full_name || '—',
        r.member_id || '—',
        `${r.recent_attended} / 5`,
        `<span class="badge badge-${r.risk}">${r.risk}</span>`,
      )).join('')

  // ── Upcoming rows ────────────────────────────────────────────────────
  const upcomingRows = p.upcoming.length === 0
    ? '<tr><td colspan="4" class="center muted">No upcoming events.</td></tr>'
    : p.upcoming.map((e) => tr(
        e.title,
        fmtDate(e.event_date),
        e.rsvps,
        `~${e.expected}`,
      )).join('')

  // ── D-Group & Ministry rows ──────────────────────────────────────────
  const dgRows  = dg.map((x)  => tr(x.name, x.total)).join('')
  const minRows = min.map((x) => tr(x.name, x.total)).join('')

  // ── New-members-by-month rows ────────────────────────────────────────
  const mbmRows = mbm.length === 0
    ? '<tr><td colspan="2" class="center muted">No data.</td></tr>'
    : mbm.map((x) => tr(x.month, x.total)).join('')

  // ── Forecast summary ─────────────────────────────────────────────────
  const fcAtt0  = Math.round(p.attendance.forecast.points[0]?.value  ?? 0)
  const fcMem   = Math.round(p.growth.forecast.points.reduce((s, x) => s + x.value, 0))
  const fcGive  = fmtCurrency(p.giving.forecast.points[0]?.value ?? 0)
  const showRate = p.show_rate

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Life Generation Calapan — Church Report</title>
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:11pt;color:#111;background:#fff;padding:0}
  /* ── Print layout ── */
  @page{size:A4 portrait;margin:18mm 15mm 18mm}
  @media print{
    .no-print{display:none!important}
    section{page-break-inside:avoid}
    h2{page-break-after:avoid}
    table{page-break-inside:auto}
    tr{page-break-inside:avoid}
  }

  /* ── Utilities ── */
  .center{text-align:center}
  .right{text-align:right}
  .muted{color:#888;font-style:italic}
  .bold{font-weight:700}
  .mb8{margin-bottom:8px}
  .mb16{margin-bottom:16px}
  .mb24{margin-bottom:24px}

  /* ── Page header ── */
  .rpt-header{border-bottom:3px solid #e55a00;padding-bottom:14px;margin-bottom:22px;display:flex;justify-content:space-between;align-items:flex-end}
  .rpt-header h1{font-size:18pt;font-weight:800;color:#e55a00;line-height:1.2}
  .rpt-header .rpt-sub{font-size:9pt;color:#555;margin-top:3px}
  .rpt-header .rpt-meta{font-size:8.5pt;color:#777;text-align:right;line-height:1.6}

  /* ── Section ── */
  section{margin-bottom:28px}
  h2{font-size:12pt;font-weight:700;color:#1a1a1a;border-left:4px solid #e55a00;padding-left:10px;margin-bottom:12px}
  h3{font-size:10.5pt;font-weight:700;color:#333;margin-bottom:8px}

  /* ── Stat grid ── */
  .stat-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
  .stat-box{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
  .stat-box .stat-val{font-size:22pt;font-weight:800;color:#e55a00;line-height:1.1}
  .stat-box .stat-lbl{font-size:8.5pt;color:#666;margin-top:3px}

  /* ── Table ── */
  table{width:100%;border-collapse:collapse;font-size:9.5pt}
  th{background:#f3f4f6;font-weight:700;text-align:left;padding:7px 10px;border-bottom:2px solid #d1d5db;color:#374151}
  td{padding:6px 10px;border-bottom:1px solid #f0f0f0;vertical-align:middle}
  tr:last-child td{border-bottom:none}
  tr:hover td{background:#fafafa}

  /* ── Attendance rate bar ── */
  .bar-bg{display:inline-block;width:60px;height:7px;background:#e5e7eb;border-radius:4px;vertical-align:middle;position:relative;margin-right:4px}
  .bar-fill{position:absolute;left:0;top:0;bottom:0;background:#e55a00;border-radius:4px}

  /* ── 2-col grid ── */
  .col2{display:grid;grid-template-columns:1fr 1fr;gap:16px}

  /* ── Badges ── */
  .badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:8pt;font-weight:700;text-transform:uppercase}
  .badge-high{background:#fef3c7;color:#92400e}
  .badge-medium{background:#eff6ff;color:#1d4ed8}

  /* ── Forecast cards ── */
  .fc-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
  .fc-card{border:1px solid #e5e7eb;border-radius:8px;padding:12px 14px}
  .fc-card .fc-val{font-size:16pt;font-weight:800;color:#e55a00}
  .fc-card .fc-lbl{font-size:8pt;color:#666;margin-bottom:4px}
  .fc-card .fc-note{font-size:8pt;color:#555;margin-top:4px}

  /* ── Footer ── */
  .rpt-footer{margin-top:28px;padding-top:12px;border-top:1px solid #e5e7eb;font-size:8pt;color:#999;display:flex;justify-content:space-between}

  /* ── Print button (screen only) ── */
  .print-btn{display:block;margin:20px auto 0;padding:12px 32px;background:#e55a00;color:#fff;border:none;border-radius:8px;font-size:12pt;font-weight:700;cursor:pointer}
  @media print{.print-btn{display:none}}
</style>
</head>
<body>

<!-- ── PRINT BUTTON (screen only) ── -->
<div class="no-print" style="text-align:center;padding:16px 0 0">
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>
</div>

<div style="padding:12px 0">

<!-- ── HEADER ── -->
<div class="rpt-header">
  <div>
    <h1>Life Generation Calapan</h1>
    <div class="rpt-sub">Church Analytics Report — Confidential (Admin &amp; Officer Only)</div>
  </div>
  <div class="rpt-meta">
    Generated: ${generatedAt}<br/>
    Show-up rate (historical): ${showRate}%
  </div>
</div>

<!-- ── 1. MEMBER OVERVIEW ── -->
<section>
  <h2>1. Member Overview</h2>
  <div class="stat-grid">
    <div class="stat-box">
      <div class="stat-val">${m.total}</div>
      <div class="stat-lbl">Total members</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${m.active}</div>
      <div class="stat-lbl">Active</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${m.inactive}</div>
      <div class="stat-lbl">Inactive</div>
    </div>
    <div class="stat-box">
      <div class="stat-val">${m.new_30_days}</div>
      <div class="stat-lbl">New (last 30 days)</div>
    </div>
  </div>
</section>

<!-- ── 2. PREDICTIVE FORECASTS ── -->
<section>
  <h2>2. Predictive Forecasts (3-Month Outlook)</h2>
  <div class="fc-cards">
    <div class="fc-card">
      <div class="fc-lbl">Expected at next event</div>
      <div class="fc-val">${p.upcoming[0] ? p.upcoming[0].expected : fcAtt0}</div>
      <div class="fc-note">${p.upcoming[0] ? `${p.upcoming[0].rsvps} signed up × ${showRate}% show-up` : `Attendance ${p.attendance.forecast.direction}`}</div>
      <div class="fc-note muted">Fit: ${p.attendance.forecast.confidence}%</div>
    </div>
    <div class="fc-card">
      <div class="fc-lbl">Members in 3 months</div>
      <div class="fc-val">${p.growth.projected_members}</div>
      <div class="fc-note">+${fcMem} new, ${p.growth.forecast.direction}</div>
      <div class="fc-note muted">Fit: ${p.growth.forecast.confidence}%</div>
    </div>
    <div class="fc-card">
      <div class="fc-lbl">Giving next month</div>
      <div class="fc-val">${fcGive}</div>
      <div class="fc-note">Giving ${p.giving.forecast.direction}</div>
      <div class="fc-note muted">Fit: ${p.giving.forecast.confidence}%</div>
    </div>
  </div>
  <p style="font-size:8.5pt;color:#888;margin-top:4px">${p.method}</p>
</section>

<!-- ── 3. UPCOMING EVENTS TURNOUT ── -->
<section>
  <h2>3. Upcoming Events — Expected Turnout</h2>
  <table>
    <thead>${th('Event', 'Date', 'RSVPs', 'Expected Turnout')}</thead>
    <tbody>${upcomingRows}</tbody>
  </table>
</section>

<!-- ── 4. ATTENDANCE PER EVENT ── -->
<section>
  <h2>4. Attendance Per Event</h2>
  <table>
    <thead>${th('Event', 'Date', 'Signed Up', 'Attended', 'Rate')}</thead>
    <tbody>
      ${att.map((e) => `<tr>
        <td>${e.title}</td>
        <td>${fmtDate(e.event_date)}</td>
        <td class="right">${e.rsvps}</td>
        <td class="right">${e.attended}</td>
        <td>${rateBar(e.attendance_rate)}</td>
      </tr>`).join('') || '<tr><td colspan="5" class="center muted">No events yet.</td></tr>'}
    </tbody>
  </table>
</section>

<!-- ── 5. NEW MEMBERS BY MONTH ── -->
<section>
  <h2>5. New Members — Last 6 Months</h2>
  <table>
    <thead>${th('Month', 'New Members')}</thead>
    <tbody>${mbmRows}</tbody>
  </table>
</section>

<!-- ── 6. AT-RISK MEMBERS ── -->
<section>
  <h2>6. At-Risk Members (Follow-Up List)</h2>
  <p style="font-size:9pt;color:#555;margin-bottom:10px">
    Regulars who attended ≥2 of the last 5 events but missed the last 2.
  </p>
  <table>
    <thead>${th('Name', 'Member ID', 'Attended (last 5)', 'Risk')}</thead>
    <tbody>${atRiskRows}</tbody>
  </table>
</section>

<!-- ── 7. D-GROUPS & MINISTRIES ── -->
<section>
  <h2>7. D-Groups &amp; Ministries</h2>
  <div class="col2">
    <div>
      <h3>Members per D-Group</h3>
      <table>
        <thead>${th('D-Group', 'Members')}</thead>
        <tbody>${dgRows || '<tr><td colspan="2" class="center muted">None yet.</td></tr>'}</tbody>
      </table>
    </div>
    <div>
      <h3>Members per Ministry</h3>
      <table>
        <thead>${th('Ministry', 'Members')}</thead>
        <tbody>${minRows || '<tr><td colspan="2" class="center muted">None yet.</td></tr>'}</tbody>
      </table>
    </div>
  </div>
</section>

<!-- ── FOOTER ── -->
<div class="rpt-footer">
  <span>Life Generation Calapan — Confidential</span>
  <span>Generated ${generatedAt}</span>
</div>

</div><!-- /padding wrapper -->

<script>
  // Auto-print after fonts load (small delay for rendering)
  window.addEventListener('load', () => {
    setTimeout(() => window.print(), 400)
  })
<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) {
    alert('Pop-up was blocked. Please allow pop-ups for this site and try again.')
    return
  }
  win.document.write(html)
  win.document.close()
}
