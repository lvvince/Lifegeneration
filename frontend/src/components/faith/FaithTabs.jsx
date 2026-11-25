import { Link, useLocation } from 'react-router-dom'
import { HandHeart, Sun, Compass } from 'lucide-react'

/* Switches between faith & social community pages. */
const TABS = [
  { to: '/social', label: 'Life Hub', short: 'Life Hub', icon: Compass },
  { to: '/prayer', label: 'Prayer Wall', icon: HandHeart },
  { to: '/god-today', label: 'Where have you seen God today?', short: 'God today', icon: Sun },
]

export default function FaithTabs() {
  const { pathname } = useLocation()
  return (
    <nav className="fh-tabs" aria-label="Faith community pages">
      {TABS.map(({ to, label, short, icon: Icon }) => {
        const on = pathname.startsWith(to) || (to === '/prayer' && pathname.startsWith('/prayers')) || (to === '/social' && pathname.startsWith('/social-hub'))
        return (
          <Link key={to} to={to} className={on ? 'is-on' : ''} aria-current={on ? 'page' : undefined}>
            <Icon size={17} aria-hidden="true" />
            <span className="fh-tab-long">{label}</span>
            {short && <span className="fh-tab-short">{short}</span>}
          </Link>
        )
      })}
    </nav>
  )
}
