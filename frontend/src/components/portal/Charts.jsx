import { useId, useRef, useState } from 'react'

/* Magaan na SVG chart (walang library). History = solid, forecast = dashed + 80% band.
   Hover / pindot / arrow keys para makita ang halaga. */
const W = 640
const H = 240
const PAD = { t: 16, r: 16, b: 34, l: 44 }

export default function ForecastChart({ labels = [], axis = [], values = [], fcLabels = [], forecast = [], format = (v) => v, unit = '' }) {
  const id = useId()
  const box = useRef(null)
  const [hot, setHot] = useState(null)

  const all = [...values, ...forecast.map((f) => f.value)]
  const hi = Math.max(1, ...all, ...forecast.map((f) => f.high))
  const top = Math.ceil(hi * 1.1) || 1
  const n = values.length + forecast.length
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const x = (i) => PAD.l + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw)
  const y = (v) => PAD.t + ih - (v / top) * ih

  const hist = values.map((v, i) => [x(i), y(v)])
  const fc = forecast.map((f, i) => [x(values.length + i), y(f.value)])
  const join = (pts) => pts.map((p) => p.join(',')).join(' ')
  const bridge = hist.length && fc.length ? [hist[hist.length - 1], ...fc] : fc
  const band = fc.length
    ? [
        ...forecast.map((f, i) => `${x(values.length + i)},${y(f.high)}`),
        ...[...forecast].reverse().map((f, i) => `${x(values.length + forecast.length - 1 - i)},${y(f.low)}`),
      ].join(' ')
    : ''

  const pts = [...labels.map((l, i) => ({ l, a: axis[i] ?? l, v: values[i], fc: false })), ...fcLabels.map((l, i) => ({ l, a: l, v: forecast[i]?.value, fc: true, lo: forecast[i]?.low, hi: forecast[i]?.high }))]
  const ticks = [0, 0.5, 1].map((t) => Math.round(top * t))
  const step = Math.max(1, Math.ceil(n / 5))

  const pick = (e) => {
    const r = box.current?.getBoundingClientRect()
    if (!r || !n) return
    const px = ((e.clientX - r.left) / r.width) * W
    const i = Math.round(((px - PAD.l) / iw) * (n - 1))
    setHot(Math.max(0, Math.min(n - 1, i)))
  }
  const onKey = (e) => {
    if (e.key === 'ArrowRight') setHot((h) => Math.min(n - 1, (h ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setHot((h) => Math.max(0, (h ?? n) - 1))
    else if (e.key === 'Escape') setHot(null)
    else return
    e.preventDefault()
  }
  const cur = hot != null ? pts[hot] : null

  return (
    <figure className="ch" ref={box}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        tabIndex={0}
        aria-label={`Chart with ${values.length} past points and ${forecast.length} forecast points`}
        onPointerMove={pick}
        onPointerDown={pick}
        onPointerLeave={() => setHot(null)}
        onKeyDown={onKey}
        onBlur={() => setHot(null)}
      >
        <defs>
          <pattern id={`${id}h`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="6" className="ch-hatch" />
          </pattern>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} className="ch-grid" />
            <text x={PAD.l - 8} y={y(t) + 4} className="ch-axis" textAnchor="end">{t >= 1000 ? `${Math.round(t / 100) / 10}k` : t}</text>
          </g>
        ))}
        {fc.length > 0 && <rect x={x(values.length - 0.5)} y={PAD.t} width={W - PAD.r - x(values.length - 0.5)} height={ih} fill={`url(#${id}h)`} />}
        {band && <polygon points={band} className="ch-band" />}
        {hist.length > 1 && <polyline points={join(hist)} className="ch-line" />}
        {bridge.length > 1 && <polyline points={join(bridge)} className="ch-fc" />}
        {hist.map((p, i) => <circle key={`h${i}`} cx={p[0]} cy={p[1]} r={hot === i ? 6 : 3.5} className="ch-dot" />)}
        {fc.map((p, i) => <circle key={`f${i}`} cx={p[0]} cy={p[1]} r={hot === values.length + i ? 6 : 4} className="ch-dot is-fc" />)}
        {pts.map((p, i) => (i % step === 0 || i === n - 1) && (
          <text key={i} x={x(i)} y={H - 10} className={`ch-axis${p.fc ? ' is-fc' : ''}`} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{String(p.a).slice(0, 10)}</text>
        ))}
        {hot != null && <line x1={x(hot)} x2={x(hot)} y1={PAD.t} y2={PAD.t + ih} className="ch-cursor" />}
      </svg>
      <figcaption className="ch-tip" aria-live="polite">
        {cur ? (
          <>
            <b>{cur.l}</b> {cur.fc ? 'forecast' : 'actual'}: <strong>{format(cur.v)}{unit}</strong>
            {cur.fc && <span> (range {format(cur.lo)} to {format(cur.hi)})</span>}
          </>
        ) : (
          <span>Touch or hover the chart for exact values.</span>
        )}
      </figcaption>
      <div className="ch-key" aria-hidden="true">
        <span><i className="k-solid" /> Actual</span>
        {fc.length > 0 && <span><i className="k-dash" /> Forecast</span>}
        {fc.length > 0 && <span><i className="k-band" /> 80% range</span>}
      </div>
    </figure>
  )
}
