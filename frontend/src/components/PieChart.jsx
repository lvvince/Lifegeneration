/**
 * PieChart – pure SVG, zero external deps.
 * Props:
 *   data   : [{ label, value, color? }]  — color is optional; palette auto-fills
 *   title  : string (optional, shown above chart)
 *   size   : number (viewBox dimension, default 200)
 *   donut  : bool (default true – prettier donut)
 *   empty  : string (message when data is empty / all zero)
 */

const PALETTE = [
  '#ff5a0a', '#fb923c', '#1d4ed8', '#16a34a',
  '#9333ea', '#dc2626', '#0891b2', '#ca8a04',
  '#db2777', '#059669', '#7c3aed', '#d97706',
]

function slice(cx, cy, r, inner, startAngle, endAngle) {
  const toRad = (d) => (d * Math.PI) / 180
  const s = toRad(startAngle)
  const e = toRad(endAngle)
  const largeArc = endAngle - startAngle > 180 ? 1 : 0
  const cos = Math.cos
  const sin = Math.sin
  const x1o = cx + r * cos(s), y1o = cy + r * sin(s)
  const x2o = cx + r * cos(e), y2o = cy + r * sin(e)
  const x1i = cx + inner * cos(e), y1i = cy + inner * sin(e)
  const x2i = cx + inner * cos(s), y2i = cy + inner * sin(s)
  return `M ${x1o} ${y1o} A ${r} ${r} 0 ${largeArc} 1 ${x2o} ${y2o} L ${x1i} ${y1i} A ${inner} ${inner} 0 ${largeArc} 0 ${x2i} ${y2i} Z`
}

export default function PieChart({ data = [], title, size = 200, donut = true, empty = 'No data yet.' }) {
  const total = data.reduce((s, d) => s + (Number(d.value) || 0), 0)
  const colored = data.map((d, i) => ({ ...d, color: d.color || PALETTE[i % PALETTE.length], value: Number(d.value) || 0 }))

  const cx = size / 2
  const cy = size / 2
  const r = size * 0.42
  const inner = donut ? r * 0.52 : 0

  // Build slices — skip zero-value items
  const slices = []
  let angle = -90
  for (const item of colored) {
    if (item.value <= 0) continue
    const sweep = (item.value / total) * 360
    // Avoid full-circle edge case (100%) — cap sweep slightly
    const safeSweep = Math.min(sweep, 359.9999)
    slices.push({ ...item, startAngle: angle, endAngle: angle + safeSweep, sweep })
    angle += sweep
  }

  const hasData = total > 0 && slices.length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, width: '100%' }}>
      {title && <h3 style={{ fontSize: '0.85rem', fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--p-muted, #888)', margin: 0 }}>{title}</h3>}

      {!hasData ? (
        <p style={{ color: 'var(--p-muted, #888)', fontSize: '0.875rem', margin: '24px 0' }}>{empty}</p>
      ) : (
        <svg
          viewBox={`0 0 ${size} ${size}`}
          style={{ width: '100%', maxWidth: size, height: 'auto', overflow: 'visible' }}
          aria-hidden="true"
        >
          {slices.map((s, i) => (
            <path
              key={i}
              d={slice(cx, cy, r, inner, s.startAngle, s.endAngle)}
              fill={s.color}
              stroke="var(--p-surface, #fff)"
              strokeWidth={2}
              style={{ transition: 'opacity .15s' }}
            >
              <title>{s.label}: {s.value} ({Math.round((s.value / total) * 100)}%)</title>
            </path>
          ))}
          {donut && (
            <text
              x={cx}
              y={cy + 5}
              textAnchor="middle"
              style={{ fontSize: size * 0.11, fontWeight: 700, fill: 'var(--p-text, #111)' }}
            >
              {total}
            </text>
          )}
        </svg>
      )}

      {/* Legend */}
      {hasData && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {colored.filter(d => d.value > 0).map((d, i) => (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--p-text)' }}>{d.label}</span>
              <span style={{ fontWeight: 600, color: 'var(--p-accent, #ff5a0a)', flexShrink: 0 }}>{d.value}</span>
              <span style={{ color: 'var(--p-muted, #888)', flexShrink: 0 }}>({Math.round((d.value / total) * 100)}%)</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

