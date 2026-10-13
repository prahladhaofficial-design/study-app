import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAccess, RequireUser } from './auth/guards'
import { ALL_NAV } from './components/nav'
import { AppLayout } from './layouts/AppLayout'
import { AccountPage } from './pages/AccountPage'
import { AuthPage } from './pages/AuthPage'
import { ComingSoon } from './pages/ComingSoon'
import { FocusPage } from './pages/FocusPage'
import { UpgradePage } from './pages/UpgradePage'

const BUILT = new Set(['/', '/account'])

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route element={<RequireUser />}>
            <Route path="/upgrade" element={<UpgradePage />} />
            <Route element={<RequireAccess />}>
              <Route element={<AppLayout />}>
                <Route index element={<FocusPage />} />
                <Route path="/account" element={<AccountPage />} />
                {ALL_NAV.filter((n) => !BUILT.has(n.to)).map((n) => (
                  <Route key={n.to} path={n.to} element={<ComingSoon path={n.to} />} />
                ))}
                <Route path="/arena" element={<ComingSoon path="/arena" />} />
                <Route path="*" element={<ComingSoon path="" />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
