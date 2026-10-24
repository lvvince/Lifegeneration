import { LayoutGrid, CalendarDays, Users, HeartHandshake, MessageCircleHeart } from 'lucide-react'

/* Mga page ng member portal. Dito rin kinukuha ng sidebar ang laman ng bawat icon. */
export const MEMBER_NAV = [
  { id: 'home', to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true, blurb: 'Your space: updates, events and everything in one place.' },
  { id: 'events', to: '/events', label: 'Events', icon: CalendarDays, blurb: 'Youth nights, worship and special days.' },
  { id: 'dgroups', to: '/dgroups', label: 'D-Groups', icon: Users, blurb: 'Grow in faith with friends your age.' },
  { id: 'ministries', to: '/ministries', label: 'Ministries', icon: HeartHandshake, blurb: 'Use your gifts to serve the community.' },
  { id: 'prayer', to: '/prayer', label: 'Prayer wall', icon: MessageCircleHeart, blurb: 'Share a request and pray for one another.' },
]
