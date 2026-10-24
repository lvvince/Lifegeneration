import { Routes, Route, useLocation } from 'react-router-dom'
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

// Public pages na walang portal layout at may sariling full-width na itsura
const FULL_BLEED = ['/', '/login', '/register']

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

  // Home, Login, Register
  if (FULL_BLEED.includes(pathname)) {
    return (
      <>
        <AnnouncementBanner />
        <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </>
    )
  }

  // Naka-login: portal (sidebar). Ang /admin ay para sa admin lang (hawak ng ProtectedRoute).
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
