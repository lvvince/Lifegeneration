import {
  LayoutGrid, CalendarDays, Users, HeartHandshake, MessageCircleHeart,
  LayoutDashboard, ClipboardList, UserCheck, FileText, Network, Megaphone,
} from 'lucide-react'

/* Mga page ng portal. Dito rin kinukuha ng sidebar ang laman ng bawat icon. */
export const MEMBER_NAV = [
  { id: 'home', to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true, blurb: 'Your space: updates, events and everything in one place.' },
  { id: 'events', to: '/events', label: 'Events', icon: CalendarDays, blurb: 'Youth nights, worship and special days.' },
  { id: 'dgroups', to: '/dgroups', label: 'D-Groups', icon: Users, blurb: 'Grow in faith with friends your age.' },
  { id: 'ministries', to: '/ministries', label: 'Ministries', icon: HeartHandshake, blurb: 'Use your gifts to serve the community.' },
  { id: 'prayer', to: '/prayer', label: 'Prayer wall', icon: MessageCircleHeart, blurb: 'Share a request and pray for one another.' },
]

export const ADMIN_NAV = [
  { id: 'a-home', to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true, admin: true, blurb: 'Numbers and activity at a glance.' },
  { id: 'a-members', to: '/admin/members', label: 'Members', icon: Users, admin: true, blurb: 'Manage the member list.' },
  { id: 'a-apps', to: '/admin/applications', label: 'Applications', icon: ClipboardList, admin: true, blurb: 'Review new sign-ups.' },
  { id: 'a-events', to: '/admin/events', label: 'Events', icon: CalendarDays, admin: true, blurb: 'Create and manage events.' },
  { id: 'a-check', to: '/admin/check-in', label: 'Check-in', icon: UserCheck, admin: true, blurb: 'Scan passes and record attendance.' },
  { id: 'a-reports', to: '/admin/reports', label: 'Reports', icon: FileText, admin: true, blurb: 'Attendance and growth reports.' },
  { id: 'a-dgroups', to: '/admin/dgroups', label: 'D-Groups', icon: Network, admin: true, blurb: 'Groups, leaders and requests.' },
  { id: 'a-min', to: '/admin/ministries', label: 'Ministries', icon: HeartHandshake, admin: true, blurb: 'Teams and volunteer applications.' },
  { id: 'a-ann', to: '/admin/announcements', label: 'Announcements', icon: Megaphone, admin: true, blurb: 'Post news that pops up for members.' },
  { id: 'a-prayer', to: '/prayer', label: 'Prayer wall', icon: MessageCircleHeart, admin: true, blurb: 'See and moderate prayer requests.' },
]
