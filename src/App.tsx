import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAccess, RequireUser } from './auth/guards'
import { ALL_NAV } from './components/nav'
import { AppLayout } from './layouts/AppLayout'
import { AccountPage } from './pages/AccountPage'
import { AuthPage } from './pages/AuthPage'
import { ComingSoon } from './pages/ComingSoon'
import { FocusPage } from './pages/FocusPage'
import { DeckPage } from './pages/cards/DeckPage'
import { DecksPage } from './pages/cards/DecksPage'
import { ReviewPage } from './pages/cards/ReviewPage'
import { InsightsPage } from './pages/InsightsPage'
import { BrainDumpPage } from './pages/learn/BrainDumpPage'
import { ExplainPage } from './pages/learn/ExplainPage'
import { QuickRecallPage } from './pages/learn/QuickRecallPage'
import { SketchPage } from './pages/learn/SketchPage'
import { LogPage } from './pages/LogPage'
import { SettingsPage } from './pages/SettingsPage'
import { UpgradePage } from './pages/UpgradePage'

const BUILT = new Set(['/', '/account', '/log', '/stats', '/settings', '/cards', '/recall', '/brain-dump', '/explain', '/sketch'])

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
                <Route path="/log" element={<LogPage />} />
                <Route path="/stats" element={<InsightsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/cards" element={<DecksPage />} />
                <Route path="/cards/:deckId" element={<DeckPage />} />
                <Route path="/cards/:deckId/review" element={<ReviewPage />} />
                <Route path="/recall" element={<QuickRecallPage />} />
                <Route path="/brain-dump" element={<BrainDumpPage />} />
                <Route path="/explain" element={<ExplainPage />} />
                <Route path="/sketch" element={<SketchPage />} />
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
