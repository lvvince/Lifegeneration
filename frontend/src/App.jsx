import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import ComingSoon from './components/ComingSoon.jsx'
import Home from './pages/Home.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Events from './pages/member/Events.jsx'
import EventDetail from './pages/member/EventDetail.jsx'
import Dashboard from './pages/member/Dashboard.jsx'
import AdminDashboard from './pages/admin/AdminDashboard.jsx'
import AdminMembers from './pages/admin/AdminMembers.jsx'

export default function App() {
  return (
    <>
      <Navbar />
      <main>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/events" element={<Events />} />
          <Route path="/events/:id" element={<EventDetail />} />

          {/* Member (kailangang naka-login) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/profile" element={<ComingSoon title="My Profile" />} />
            <Route path="/dashboard/attendance" element={<ComingSoon title="My Attendance" />} />
          </Route>

          {/* Admin */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/members" element={<AdminMembers />} />
            <Route path="/admin/registrations" element={<ComingSoon title="Registrations" />} />
            <Route path="/admin/events" element={<ComingSoon title="Manage Events" />} />
            <Route path="/admin/attendance" element={<ComingSoon title="Attendance" />} />
            <Route path="/admin/announcements" element={<ComingSoon title="Announcements" />} />
            <Route path="/admin/reports" element={<ComingSoon title="Reports" />} />
          </Route>

          {/* Anumang ibang URL */}
          <Route path="*" element={<ComingSoon title="Page not found" />} />
        </Routes>
      </main>
    </>
  )
}