import { prefersReduced } from '../../lib/fx.js'

/* Staggered letter reveal. Accessible: ang buong text ay nasa aria-label, ang mga letra ay aria-hidden. */
export function SplitText({ text, as: Tag = 'span', className, step = 24 }) {
  const str = String(text ?? '')
  if (prefersReduced() || str.length > 48) return <Tag className={className}>{str}</Tag>
  let n = 0
  return (
    <Tag className={`fx-split${className ? ` ${className}` : ''}`} aria-label={str} key={str}>
      {str.split(' ').map((w, wi, arr) => (
        <span className="fx-w" aria-hidden="true" key={wi}>
          {[...w].map((ch, ci) => <span className="fx-ch" key={ci} style={{ '--d': `${n++ * step}ms` }}>{ch}</span>)}
          {wi < arr.length - 1 ? ' ' : ''}
        </span>
      ))}
    </Tag>
  )
}

export default SplitText
