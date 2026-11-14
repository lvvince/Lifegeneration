import { useEffect, lazy, Suspense } from 'react'
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom'
import { initFx } from './lib/fx.js'
import { initSelects } from './lib/selectfx.js'
import './styles/controls.css'
import './styles/compact.css'
import './styles/soft.css'
import './styles/polish.css'
import Navbar from './components/Navbar.jsx'
import AnnouncementBanner from './components/AnnouncementBanner.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PortalLayout from './components/portal/PortalLayout.jsx'
import OfflineBanner from './components/OfflineBanner.jsx'
import { getUser } from './api.js'

// Core initial pages
import Home from './pages/Home.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import ResetPassword from './pages/ResetPassword.jsx'

// Lazy-loaded routes for optimal loading on low-end phones and slow connections
const NotFound = lazy(() => import('./pages/NotFound.jsx'))
const DGroups = lazy(() => import('./pages/DGroups.jsx'))
const Ministries = lazy(() => import('./pages/Ministries.jsx'))
const GiftsMatcher = lazy(() => import('./pages/GiftsMatcher.jsx'))
const PrayerWall = lazy(() => import('./pages/PrayerWall.jsx'))
const GodToday = lazy(() => import('./pages/GodToday.jsx'))
const Give = lazy(() => import('./pages/Give.jsx'))
const Chat = lazy(() => import('./pages/Chat.jsx'))
const Legal = lazy(() => import('./pages/Legal.jsx'))
const Events = lazy(() => import('./pages/member/Events.jsx'))
const EventDetail = lazy(() => import('./pages/member/EventDetail.jsx'))
const Dashboard = lazy(() => import('./pages/member/Dashboard.jsx'))
const Overview = lazy(() => import('./pages/member/Overview.jsx'))

// Lazy-loaded Officer & Admin portals
const OfficerDashboard = lazy(() => import('./pages/officer/OfficerDashboard.jsx'))
const OfficerAttendance = lazy(() => import('./pages/officer/OfficerAttendance.jsx'))
const OfficerApplications = lazy(() => import('./pages/officer/OfficerApplications.jsx'))
const OfficerMembers = lazy(() => import('./pages/officer/OfficerMembers.jsx'))
const OfficerInsights = lazy(() => import('./pages/officer/OfficerInsights.jsx'))
const OfficerDonations = lazy(() => import('./pages/officer/OfficerDonations.jsx'))

const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminMembers = lazy(() => import('./pages/admin/AdminMembers.jsx'))
const AdminApplications = lazy(() => import('./pages/admin/AdminApplications.jsx'))
const AdminCheckIn = lazy(() => import('./pages/admin/AdminCheckIn.jsx'))
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents.jsx'))
const AdminDGroups = lazy(() => import('./pages/admin/AdminDGroups.jsx'))
const AdminMinistries = lazy(() => import('./pages/admin/AdminMinistries.jsx'))
const AdminReports = lazy(() => import('./pages/admin/AdminReports.jsx'))
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements.jsx'))
const AdminDonations = lazy(() => import('./pages/admin/AdminDonations.jsx'))

function RouteFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh', gap: 10, color: '#94a3b8' }}>
      <span className="au-spin" style={{ width: 22, height: 22, borderWidth: 2 }} />
      <span style={{ fontSize: '0.9rem' }}>Loading...</span>
    </div>
  )
}

// Auth pages: full-screen, walang navbar at walang portal layout
const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/reset-password']

// Officer/secretary at admin lang ang pwedeng pumasok sa /officer.
// Walang sariling sidebar: ang compact rail ng portal ang gamit, katulad ng admin.
function StaffRoute() {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (!['officer', 'secretary', 'admin'].includes(user.role)) return <Navigate to="/" replace />
  return <Outlet />
}

function PageRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/events" element={<Events />} />
        <Route path="/events/:id" element={<EventDetail />} />
        <Route path="/dgroups" element={<DGroups />} />
        <Route path="/ministries" element={<Ministries />} />
        <Route path="/gifts-matcher" element={<GiftsMatcher />} />
        <Route path="/matcher" element={<GiftsMatcher />} />
        <Route path="/prayer" element={<PrayerWall />} />
        <Route path="/prayers" element={<PrayerWall />} />
        <Route path="/god-today" element={<GodToday />} />
        <Route path="/give" element={<Give />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/donations" element={<Give />} />
        <Route path="/privacy" element={<Legal doc="privacy" />} />
        <Route path="/terms" element={<Legal doc="terms" />} />
        <Route path="/giving-policy" element={<Legal doc="giving" />} />

        {/* Member */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Overview />} />
          <Route path="/dashboard/overview" element={<Overview />} />
          <Route path="/dashboard/profile" element={<Dashboard />} />
        </Route>

        {/* Officer / Secretary */}
        <Route element={<StaffRoute />}>
          <Route path="/officer" element={<OfficerDashboard />} />
          <Route path="/officer/members" element={<OfficerMembers />} />
          <Route path="/officer/attendance" element={<OfficerAttendance />} />
          <Route path="/officer/applications" element={<OfficerApplications />} />
          <Route path="/officer/donations" element={<OfficerDonations />} />
          <Route path="/officer/insights" element={<OfficerInsights />} />
        </Route>

        {/* Admin */}
        <Route element={<ProtectedRoute role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/members" element={<AdminMembers />} />
          <Route path="/admin/applications" element={<AdminApplications />} />
          <Route path="/admin/events" element={<AdminEvents />} />
          <Route path="/admin/check-in" element={<AdminCheckIn />} />
          <Route path="/admin/reports" element={<AdminReports />} />
          <Route path="/admin/dgroups" element={<AdminDGroups />} />
          <Route path="/admin/ministries" element={<AdminMinistries />} />
          <Route path="/admin/announcements" element={<AdminAnnouncements />} />
          <Route path="/admin/donations" element={<AdminDonations />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  )
}

function AppRoutes() {
  const { pathname } = useLocation()
  const user = getUser()

  // Login, Register, Forgot/Reset password: walang navbar
  if (AUTH_PATHS.includes(pathname)) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
      </Routes>
    )
  }

  // Home: may sariling full-width na itsura
  if (pathname === '/') {
    return (
      <>
        <AnnouncementBanner />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </>
    )
  }

  // Naka-login: portal (icon rail). Ang /admin ay admin lang, ang /officer ay officer at admin.
  if (user) {
    return (
      <PortalLayout>
        <PageRoutes />
      </PortalLayout>
    )
  }

  // Bisita: public pages na may navbar
  return (
    <>
      <AnnouncementBanner />
      <Navbar />
      <main style={{ maxWidth: 1320, margin: '0 auto', padding: '28px 20px 60px' }}>
        <PageRoutes />
      </main>
    </>
  )
}

export default function App() {
  useEffect(() => { const a = initFx(); const b = initSelects(); return () => { a(); b() } }, [])
  return (
    <>
      <OfflineBanner />
      <AppRoutes />
    </>
  )
}
