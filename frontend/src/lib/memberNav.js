import {
  LayoutGrid, CalendarDays, Users, HeartHandshake, MessageCircleHeart,
  LayoutDashboard, ClipboardList, UserCheck, FileText, Network, Megaphone,
  HandCoins, TrendingUp, Sparkles, MessageSquare,
} from 'lucide-react'

/* Mga page ng portal. Dito rin kinukuha ng sidebar ang laman ng bawat icon. */
export const MEMBER_NAV = [
  { id: 'home',     to: '/dashboard',     label: 'Overview',        icon: LayoutGrid,        end: true, blurb: 'Your space: updates, events and everything in one place.' },
  { id: 'chat',     to: '/chat',          label: 'Fellowship Chat', icon: MessageSquare,     blurb: 'Chat with youth members, ask questions, and share photos.' },
  { id: 'events',   to: '/events',        label: 'Events',          icon: CalendarDays,      blurb: 'Youth nights, worship and special days.' },
  { id: 'dgroups',  to: '/dgroups',       label: 'D-Groups',        icon: Users,             blurb: 'Grow in faith with friends your age.' },
  { id: 'ministries', to: '/ministries',  label: 'Ministries',      icon: HeartHandshake,    blurb: 'Use your gifts to serve the community.' },
  { id: 'matcher',  to: '/gifts-matcher', label: 'Find My Place',   icon: Sparkles,          blurb: 'Take a short quiz to discover your best ministry team and D-Group.', badge: 'New' },
  { id: 'prayer',   to: '/prayer',        label: 'Prayer wall',     icon: MessageCircleHeart, blurb: 'Share a request and pray for one another.' },
  { id: 'give',     to: '/give',          label: 'Give',            icon: HandCoins,         blurb: 'Support ministries, youth camps and tithes.' },
]

/* Admin: Rail icons + drawer sub-pages */
const A = (id, to, label, icon, blurb, extra = {}) => ({ id, to, label, icon, blurb, admin: true, ...extra })
const MEMBERS = A('a-members', '/admin/members',       'Members',         Users,             'Manage the member list.')
const APPS    = A('a-apps',    '/admin/applications',  'Applications',    ClipboardList,     'Review new sign-ups.')
const DG      = A('a-dgroups', '/admin/dgroups',       'D-Groups',        Network,           'Groups, leaders and requests.')
const MIN     = A('a-min',     '/admin/ministries',    'Ministries',      HeartHandshake,    'Teams and volunteer applications.')
const EV      = A('a-events',  '/admin/events',        'Events',          CalendarDays,      'Create and manage events.')
const CHK     = A('a-check',   '/admin/check-in',      'Check-in',        UserCheck,         'Scan passes and record attendance.')
const DON     = A('a-don',     '/admin/donations',     'Donations',       HandCoins,         'Verify gifts and track funds.')
const ANN     = A('a-ann',     '/admin/announcements', 'Announcements',   Megaphone,         'Post news that pops up for members.')
const REP     = A('a-reports', '/admin/reports',       'Reports',         FileText,          'Attendance and growth reports.')
const PRY     = A('a-prayer',  '/prayer',              'Prayer wall',     MessageCircleHeart,'See and moderate prayer requests.')
const CHAT    = A('a-chat',    '/chat',                'Fellowship Chat', MessageSquare,     'Chat with youth members, officers and admins.')

const group = (id, label, icon, blurb, items) => ({ id, label, icon, blurb, admin: true, to: items[0].to, items, match: items.map((i) => i.to) })

export const ADMIN_NAV = [
  A('a-home', '/admin', 'Overview', LayoutDashboard, 'Numbers and activity at a glance.', { end: true }),
  { id: 'chat', to: '/chat', label: 'Fellowship Chat', icon: MessageSquare, blurb: 'Chat with youth members, officers, and admins in real time.' },
  group('g-people',  'People',              Users,       'Members, sign-ups, groups and teams.',             [MEMBERS, APPS, DG, MIN]),
  group('g-events',  'Events',              CalendarDays,'Plan events and take attendance.',                  [EV, CHK]),
  group('g-content', 'Content & Community', Megaphone,   'News, donations, reports, prayer wall, and chat.', [DON, ANN, REP, PRY, CHAT]),
]

/* Officer/Secretary: same compact rail and grouped pages as the admin portal. */
const O = (id, to, label, icon, blurb, extra = {}) => ({ id, to, label, icon, blurb, admin: true, ...extra })
const oGroup = (id, label, icon, blurb, items) => ({ id, label, icon, blurb, admin: true, to: items[0].to, items, match: items.map((i) => i.to) })

const O_MEMBERS = O('o-members',    '/officer/members',      'Members',      Users,             'View the member list.')
const O_APPS    = O('o-apps',       '/officer/applications', 'Applications', ClipboardList,     'Approve or reject ministry applications.')
const O_DG      = O('o-dgroups',    '/dgroups',              'D-Groups',     Network,           'Groups and their leaders.')
const O_MIN     = O('o-min',        '/ministries',           'Ministries',   HeartHandshake,    'Teams and volunteer slots.')
const O_ATT     = O('o-attendance', '/officer/attendance',   'Attendance',   UserCheck,         'Scan passes and record who attended.')
const O_EVENTS  = O('o-events',     '/events',               'Events',       CalendarDays,      'Youth nights, worship and special days.')
const O_DON     = O('o-donations',  '/officer/donations',    'Donations',    HandCoins,         'Review and verify online giving receipts.')
const O_INS     = O('o-insights',   '/officer/insights',     'Insights',     TrendingUp,        'Forecasts for attendance, members and giving.')
const O_PRAY    = O('o-prayer',     '/prayer',               'Prayer wall',  MessageCircleHeart,'See and moderate prayer requests.')

export const OFFICER_NAV = [
  O('o-home', '/officer', 'Overview', LayoutDashboard, 'Pending sign-ups, events and attendance at a glance.', { end: true }),
  { id: 'chat', to: '/chat', label: 'Fellowship Chat', icon: MessageSquare, blurb: 'Chat with youth members, officers, and admins.' },
  oGroup('og-people',  'People',              Users,        'Members, applications, groups and teams.', [O_MEMBERS, O_APPS, O_DG, O_MIN]),
  oGroup('og-events',  'Events',              CalendarDays, 'Plan around events and take attendance.',  [O_ATT, O_EVENTS]),
  oGroup('og-content', 'Content & Community', Megaphone,    'Giving, insights and the prayer wall.',    [O_DON, O_INS, O_PRAY]),
]
