import "../styles/glass.css"

/**
 * Glassmorphism icon chip.
 * <GlassIcon icon={Users} tint="#f97316" size={48} />
 */
export default function GlassIcon({ icon: Icon, tint = "#f97316", size = 48, iconSize, className = "", style }) {
  return (
    <span
      className={`glass-icon ${className}`}
      style={{ "--tint": tint, "--gi": `${size}px`, ...style }}
      aria-hidden="true"
    >
      <Icon size={iconSize || Math.round(size * 0.46)} strokeWidth={2.1} />
    </span>
  )
}
