/* Ivy vine with fairy lights. Pure SVG, generated once, no images. */
const W = 1200
const yAt = (x) => 40 + 22 * Math.sin(x / 110) + 9 * Math.sin(x / 37)
const GREENS = ['#5d7a58', '#6f8f66', '#4b6a49', '#7d9a70']
const LEAF = 'M0,0 C-9,-5 -15,-14 -10,-23 C-6,-27 0,-23 0,-16 C0,-23 6,-27 10,-23 C15,-14 9,-5 0,0Z'

const pts = []
for (let x = -10; x <= W + 10; x += 12) pts.push([x, yAt(x)])
const vine = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y.toFixed(1)}`).join('')

const leaves = []
let k = 0
for (let x = 6; x < W; x += 26) {
  const y = yAt(x)
  const dy = yAt(x + 2) - yAt(x - 2)
  const tan = (Math.atan2(dy, 4) * 180) / Math.PI
  const side = k % 2 ? 1 : -1
  const rot = tan + 90 + side * (48 + ((k * 13) % 30))
  const sc = 0.78 + ((k * 7) % 5) * 0.12
  leaves.push({ x, y, rot, sc, c: GREENS[k % 4] })
  k++
}
const strands = [90, 210, 380, 560, 700, 880, 1010, 1130].map((x, i) => {
  const len = 34 + ((i * 29) % 52)
  const y0 = yAt(x)
  const ls = []
  for (let t = 10; t < len; t += 15) ls.push({ x: x + Math.sin(t / 9 + i) * 4, y: y0 + t, rot: (t % 30 ? 25 : -25) + (i % 2 ? 180 : 180), sc: 0.7, c: GREENS[(i + t) % 4] })
  return { x, y0, len, i, ls }
})
const bulbs = []
for (let x = 30; x < W; x += 54) bulbs.push({ x: x + ((x * 7) % 11), y: yAt(x) + 7 + ((x * 3) % 6), d: ((x * 13) % 30) / 10 })

const Leaf = ({ x, y, rot, sc, c }) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${sc.toFixed(2)})`}>
    <path d={LEAF} fill={c} />
    <path d="M0,0 L0,-17" stroke="rgba(255,255,255,.28)" strokeWidth="1" fill="none" />
  </g>
)

export default function Garland({ className = '' }) {
  return (
    <svg className={`fh-garland ${className}`} viewBox={`0 0 ${W} 150`} preserveAspectRatio="xMidYMin slice" aria-hidden="true" focusable="false">
      <path d={vine} fill="none" stroke="#3f5a3d" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      {strands.map((s) => (
        <g key={s.i}>
          <path d={`M${s.x},${s.y0} q6,${s.len / 2} 0,${s.len}`} fill="none" stroke="#3f5a3d" strokeWidth="2" strokeLinecap="round" />
          {s.ls.map((l, j) => <Leaf key={j} {...l} />)}
        </g>
      ))}
      {leaves.map((l, i) => <Leaf key={i} {...l} />)}
      <g className="fh-bulbs">
        {bulbs.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r="3.6" style={{ animationDelay: `${b.d}s` }} />
        ))}
      </g>
    </svg>
  )
}
