import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { RequireAccess, RequireUser } from './auth/guards'
import { ALL_NAV } from './components/nav'
import { AppLayout } from './layouts/AppLayout'
import { AccountPage } from './pages/AccountPage'
import { ArenaPage } from './pages/ArenaPage'
import { AuthPage } from './pages/AuthPage'
import { ComingSoon } from './pages/ComingSoon'
import { FocusPage } from './pages/FocusPage'
import { GoalsPage } from './pages/GoalsPage'
import { DeckPage } from './pages/cards/DeckPage'
import { DecksPage } from './pages/cards/DecksPage'
import { ReviewPage } from './pages/cards/ReviewPage'
import { InsightsPage } from './pages/InsightsPage'
import { BrainDumpPage } from './pages/learn/BrainDumpPage'
import { ExplainPage } from './pages/learn/ExplainPage'
import { QuickRecallPage } from './pages/learn/QuickRecallPage'
import { SketchPage } from './pages/learn/SketchPage'
import { LogPage } from './pages/LogPage'
import { MomentsPage } from './pages/MomentsPage'
import { ProjectsPage } from './pages/ProjectsPage'
import { SettingsPage } from './pages/SettingsPage'
import { SoundsPage } from './pages/SoundsPage'
import { TasksPage } from './pages/TasksPage'
import { UpgradePage } from './pages/UpgradePage'
import { LandingPage } from './pages/site/LandingPage'
import { PrivacyPage, RefundPage, TermsPage } from './pages/site/LegalPages'

const BUILT = new Set(['/', '/account', '/log', '/stats', '/settings', '/cards', '/recall', '/brain-dump', '/explain', '/sketch', '/goals', '/sounds', '/tasks', '/moments', '/projects', '/arena'])

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<AuthPage />} />
          <Route path="/welcome" element={<LandingPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/refunds" element={<RefundPage />} />
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
                <Route path="/goals" element={<GoalsPage />} />
                <Route path="/sounds" element={<SoundsPage />} />
                <Route path="/tasks" element={<TasksPage />} />
                <Route path="/moments" element={<MomentsPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
                {ALL_NAV.filter((n) => !BUILT.has(n.to)).map((n) => (
                  <Route key={n.to} path={n.to} element={<ComingSoon path={n.to} />} />
                ))}
                <Route path="/arena" element={<ArenaPage />} />
                <Route path="*" element={<ComingSoon path="" />} />
              </Route>
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
