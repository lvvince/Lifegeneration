import {
  LayoutGrid, CalendarDays, Users, HeartHandshake, MessageCircleHeart,
  LayoutDashboard, ClipboardList, UserCheck, FileText, Network, Megaphone,
  HandCoins,
} from 'lucide-react'

/* Mga page ng portal. Dito rin kinukuha ng sidebar ang laman ng bawat icon. */
export const MEMBER_NAV = [
  { id: 'home', to: '/dashboard', label: 'Overview', icon: LayoutGrid, end: true, blurb: 'Your space: updates, events and everything in one place.' },
  { id: 'events', to: '/events', label: 'Events', icon: CalendarDays, blurb: 'Youth nights, worship and special days.' },
  { id: 'dgroups', to: '/dgroups', label: 'D-Groups', icon: Users, blurb: 'Grow in faith with friends your age.' },
  { id: 'ministries', to: '/ministries', label: 'Ministries', icon: HeartHandshake, blurb: 'Use your gifts to serve the community.' },
  { id: 'prayer', to: '/prayer', label: 'Prayer wall', icon: MessageCircleHeart, blurb: 'Share a request and pray for one another.' },
  { id: 'give', to: '/give', label: 'Give', icon: HandCoins, blurb: 'Support ministries, youth camps and tithes.' },
]

/* Admin: 4 grupo lang sa rail (hindi 10 icon). Bawat grupo ay may mga page sa loob ng sidebar. */
const A = (id, to, label, icon, blurb, extra = {}) => ({ id, to, label, icon, blurb, admin: true, ...extra })
const MEMBERS = A('a-members', '/admin/members', 'Members', Users, 'Manage the member list.')
const APPS = A('a-apps', '/admin/applications', 'Applications', ClipboardList, 'Review new sign-ups.')
const DG = A('a-dgroups', '/admin/dgroups', 'D-Groups', Network, 'Groups, leaders and requests.')
const MIN = A('a-min', '/admin/ministries', 'Ministries', HeartHandshake, 'Teams and volunteer applications.')
const EV = A('a-events', '/admin/events', 'Events', CalendarDays, 'Create and manage events.')
const CHK = A('a-check', '/admin/check-in', 'Check-in', UserCheck, 'Scan passes and record attendance.')
const DON = A('a-don', '/admin/donations', 'Donations', HandCoins, 'Verify gifts and track funds.')
const ANN = A('a-ann', '/admin/announcements', 'Announcements', Megaphone, 'Post news that pops up for members.')
const REP = A('a-reports', '/admin/reports', 'Reports', FileText, 'Attendance and growth reports.')
const PRY = A('a-prayer', '/prayer', 'Prayer wall', MessageCircleHeart, 'See and moderate prayer requests.')

const group = (id, label, icon, blurb, items) => ({ id, label, icon, blurb, admin: true, to: items[0].to, items, match: items.map((i) => i.to) })

export const ADMIN_NAV = [
  A('a-home', '/admin', 'Overview', LayoutDashboard, 'Numbers and activity at a glance.', { end: true }),
  group('g-people', 'People', Users, 'Members, sign-ups, groups and teams.', [MEMBERS, APPS, DG, MIN]),
  group('g-events', 'Events', CalendarDays, 'Plan events and take attendance.', [EV, CHK]),
  group('g-content', 'Content & Giving', Megaphone, 'News, donations, reports and the prayer wall.', [DON, ANN, REP, PRY]),
]

/* Officer/Secretary: sariling pages + ang member pages. */
const O = (id, to, label, icon, blurb, extra = {}) => ({ id, to, label, icon, blurb, ...extra })

export const OFFICER_NAV = [
  O('o-home', '/officer', 'Overview', LayoutDashboard, 'Pending sign-ups, events and attendance at a glance.', { end: true }),
  O('o-members', '/officer/members', 'Members', Users, 'View the member list.'),
  O('o-apps', '/officer/applications', 'Applications', ClipboardList, 'Approve or reject ministry applications.'),
  O('o-attendance', '/officer/attendance', 'Attendance', UserCheck, 'Scan passes and record who attended.'),
  O('o-donations', '/officer/donations', 'Donations', HandCoins, 'Review and verify online giving receipts.'),
  ...MEMBER_NAV.filter((n) => n.id !== 'home'),
]
