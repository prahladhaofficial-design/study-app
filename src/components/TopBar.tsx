import { Globe2, Menu, PanelLeft } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { daysLeft } from '../lib/access'
import { ThemeToggle } from './ThemeToggle'
import { MiniTimer } from './TimerBar'

export function TopBar({ onToggleSidebar, onOpenMobileNav }: { onToggleSidebar: () => void; onOpenMobileNav: () => void }) {
  const { access, preview } = useAuth()
  const onFocusPage = useLocation().pathname === '/'
  const trialDays = access?.allowed && access.reason === 'trial' && access.until ? daysLeft(access.until, new Date()) : null

  return (
    <header className="flex items-center gap-1.5 px-3 py-3 sm:gap-2 sm:px-4 md:px-6">
      <button type="button" onClick={onOpenMobileNav} aria-label="Open menu" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-dim md:hidden">
        <Menu size={18} />
      </button>
      <button type="button" onClick={onToggleSidebar} aria-label="Collapse sidebar" className="hidden size-10 place-items-center rounded-full border border-line bg-surface text-dim hover:text-ink md:grid">
        <PanelLeft size={18} />
      </button>
      {preview && <span className="whitespace-nowrap rounded-full bg-warm/15 px-3 py-1 text-xs font-medium text-warm">Preview</span>}
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {!onFocusPage && <MiniTimer />}
        {trialDays !== null && (
          <Link to="/upgrade" className="whitespace-nowrap rounded-full bg-accent px-4 py-2 text-sm font-semibold text-accent-ink hover:opacity-90">
            {trialDays}d left<span className="hidden sm:inline"> · Upgrade</span>
          </Link>
        )}
        <Link to="/arena" aria-label="Study arena" className="grid size-10 place-items-center rounded-full border border-line bg-surface text-dim hover:text-ink">
          <Globe2 size={18} />
        </Link>
        <ThemeToggle />
      </div>
    </header>
  )
}
