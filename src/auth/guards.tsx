import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LandingPage } from '../pages/site/LandingPage'
import { useAuth } from './AuthProvider'

function Splash() {
  return <div className="grid h-full place-items-center text-dim">Loading…</div>
}

/** Requires a signed-in user (always true in preview mode). */
export function RequireUser() {
  const { loading, session, preview } = useAuth()
  const location = useLocation()
  if (loading) return <Splash />
  if (!session && !preview) {
    // Signed-out visitors to the home page see the public landing page.
    if (location.pathname === '/') return <LandingPage />
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}

/** Requires an active trial or paid plan; otherwise shows the paywall. */
export function RequireAccess() {
  const { access } = useAuth()
  if (!access) return <Splash />
  if (!access.allowed) return <Navigate to="/upgrade" replace />
  return <Outlet />
}
