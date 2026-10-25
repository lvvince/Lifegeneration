import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import AnnouncementBanner from './components/AnnouncementBanner.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PortalLayout from './components/portal/PortalLayout.jsx'
import { getUser } from './api.js'
import Home from './pages/Home.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import NotFound from './pages/NotFound.jsx'
import DGroups from './pages/DGroups.jsx'
import Ministries from './pages/Ministries.jsx'
import PrayerWall from './pages/PrayerWall.jsx'
import Events from './pages/member/Events.jsx'
import EventDetail from './pages/member/EventDetail.jsx'
import Dashboard from './pages/member/Dashboard.jsx'
import Overview from './pages/member/Overview.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminMembers from './pages/admin/AdminMembers.jsx'
import AdminApplications from './pages/admin/AdminApplications.jsx'
import AdminCheckIn from './pages/admin/AdminCheckIn.jsx'
import AdminEvents from './pages/admin/AdminEvents.jsx'
import AdminDGroups from './pages/admin/AdminDGroups.jsx'
import AdminMinistries from './pages/admin/AdminMinistries.jsx'
import AdminReports from './pages/admin/AdminReports.jsx'
import AdminAnnouncements from './pages/admin/AdminAnnouncements.jsx'
import OfficerDashboard from './pages/officer/OfficerDashboard.jsx'
import OfficerAttendance from './pages/officer/OfficerAttendance.jsx'
import OfficerApplications from './pages/officer/OfficerApplications.jsx'
import OfficerMembers from './pages/officer/OfficerMembers.jsx'
import OfficerSideLayout from './pages/officer/OfficerSideLayout.jsx'

// Public pages na walang portal layout at may sariling full-width na itsura
const FULL_BLEED = ['/', '/login', '/register']

// Officer/secretary at admin lang ang pwedeng pumasok sa /officer.
// Nakabalot sa dashboard sidebar (OfficerSideLayout, may <Outlet /> sa loob).
function StaffRoute() {
  const user = getUser()
  if (!user) return <Navigate to="/login" replace />
  if (!['officer', 'secretary', 'admin'].includes(user.role)) return <Navigate to="/" replace />
  return <OfficerSideLayout />
}

function PageRoutes() {
  return (
    <Routes>
      <Route path="/events" element={<Events />} />
      <Route path="/events/:id" element={<EventDetail />} />
      <Route path="/dgroups" element={<DGroups />} />
      <Route path="/ministries" element={<Ministries />} />
      <Route path="/prayer" element={<PrayerWall />} />
      <Route path="/prayers" element={<PrayerWall />} />

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
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  const { pathname } = useLocation()
  const user = getUser()

  // Login at Register: walang navbar
  if (pathname === '/login' || pathname === '/register') {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    )
  }

  // Home
  if (FULL_BLEED.includes(pathname)) {
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