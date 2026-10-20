import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Home from './pages/Home.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import DGroups from './pages/DGroups.jsx'
import Ministries from './pages/Ministries.jsx'
import PrayerWall from './pages/PrayerWall.jsx'
import Events from './pages/member/Events.jsx'
import EventDetail from './pages/member/EventDetail.jsx'
import Dashboard from './pages/member/Dashboard.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminMembers from './pages/admin/AdminMembers.jsx'
import AdminApplications from './pages/admin/AdminApplications.jsx'
import AdminCheckIn from './pages/admin/AdminCheckIn.jsx'

// Pages that should render full-screen without the constrained <main> wrapper
const FULL_BLEED = ['/', '/login', '/register']

export default function App() {
  const { pathname } = useLocation()
  const isFullBleed = FULL_BLEED.includes(pathname)

  return (
    <>
      <Navbar />
      {isFullBleed ? (
        // Full-bleed: no max-width, no side padding
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {/* Fallback also goes here so hero shows */}
          <Route path="*" element={<Home />} />
        </Routes>
      ) : (
        <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 20px 60px' }}>
          <Routes>
            <Route path="/events" element={<Events />} />
            <Route path="/events/:id" element={<EventDetail />} />
            <Route path="/dgroups" element={<DGroups />} />
            <Route path="/ministries" element={<Ministries />} />
            <Route path="/prayer" element={<PrayerWall />} />
            <Route path="/prayers" element={<PrayerWall />} />

            {/* Member Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/profile" element={<Dashboard />} />
            </Route>

            {/* Admin Protected */}
            <Route element={<ProtectedRoute role="admin" />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/members" element={<AdminMembers />} />
              <Route path="/admin/applications" element={<AdminApplications />} />
              <Route path="/admin/check-in" element={<AdminCheckIn />} />
              <Route path="/admin/events" element={<Events />} />
            </Route>
          </Routes>
        </main>
      )}
    </>
  )
}