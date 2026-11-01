import { useEffect, useRef, useState } from 'react'
import { prefersReduced } from '../../lib/fx.js'

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&'

/* Text scramble: bumabagsak ang mga letra sa tamang salita. Tumatakbo sa mount at (opsyonal) sa hover. */
export function Scramble({ text, hover = false, duration = 820, className }) {
  const [out, setOut] = useState(text)
  const raf = useRef(0)
  const run = () => {
    if (prefersReduced()) return
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      const fixed = Math.floor(p * text.length)
      setOut([...text].map((c, i) => (i < fixed || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0])).join(''))
      if (p < 1) raf.current = requestAnimationFrame(tick)
      else setOut(text)
    }
    raf.current = requestAnimationFrame(tick)
  }
  useEffect(() => { run(); return () => cancelAnimationFrame(raf.current) }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span className={className} aria-label={text} onPointerEnter={hover ? run : undefined}>
      <span aria-hidden="true">{out}</span>
    </span>
  )
}

export default Scramble
