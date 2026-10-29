import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import About from './pages/About'
import Call from './pages/Call'
import FAQ from './pages/FAQ'
import ForgotPassword from './pages/ForgotPassword'
import Home from './pages/Home'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Materials from './pages/Materials'
import Messages from './pages/Messages'
import Notes from './pages/Notes'
import Notifications from './pages/Notifications'
import Partners from './pages/Partners'
import PartnerProfile from './pages/PartnerProfile'
import Profile from './pages/Profile'
import Register from './pages/Register'
import Schedule from './pages/Schedule'
import Settings from './pages/Settings'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/about" element={<About />} />
        <Route path="/faq" element={<FAQ />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/partners/:userId" element={<PartnerProfile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/:conversationId" element={<Messages />} />
          <Route path="/call/:roomId" element={<Call />} />
          <Route path="/schedule" element={<Schedule />} />

          <Route path="/materials" element={<Materials />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
