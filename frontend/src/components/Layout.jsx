import { Languages } from 'lucide-react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const authedLinks = [
  ['/dashboard', 'Dashboard'],
  ['/partners', 'Partners'],
  ['/messages', 'Messages'],
  ['/schedule', 'Schedule'],
  ['/courses', 'Courses'],
]

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2 shrink-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm">
        <Languages size={18} strokeWidth={2.25} />
      </span>
      <span className="text-[17px] font-bold tracking-tight text-slate-900">
        Language Partner
      </span>
    </Link>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <nav className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-1 text-sm flex-wrap">
            {user ? (
              <>
                {authedLinks.map(([to, label]) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-lg font-medium transition-colors ${
                        isActive
                          ? 'text-indigo-600 bg-indigo-50'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                ))}
                <Link
                  to="/settings"
                  className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white"
                  title="Settings"
                >
                  {(user.first_name?.[0] || user.email[0]).toUpperCase()}
                </Link>
                <button
                  onClick={() => {
                    logout()
                    navigate('/')
                  }}
                  className="ml-2 px-3 py-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 font-medium"
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/about" className="px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium">About</Link>
                <Link to="/faq" className="px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium">FAQ</Link>
                <Link to="/login" className="px-3 py-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium">Log in</Link>
                <Link
                  to="/register"
                  className="ml-1 px-4 py-2 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors"
                >
                  Sign up free
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Languages size={16} />
            <span>Language Partner</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-slate-500">
            <Link to="/about" className="hover:text-slate-900">About</Link>
            <Link to="/faq" className="hover:text-slate-900">FAQ</Link>
          </div>
          <p className="text-xs text-slate-400">© {new Date().getFullYear()} Language Partner — MVP</p>
        </div>
      </footer>
    </div>
  )
}
