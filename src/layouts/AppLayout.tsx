import clsx from 'clsx'
import { X } from 'lucide-react'
import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { TimerEngine } from '../components/TimerBar'
import { Sidebar } from '../components/Sidebar'
import { TopBar } from '../components/TopBar'

export function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-full">
      <TimerEngine />
      <aside className={clsx('hidden shrink-0 border-r border-line bg-surface transition-[width] md:block', collapsed ? 'w-[72px]' : 'w-60')}>
        <Sidebar collapsed={collapsed} />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative h-full w-64 border-r border-line bg-surface">
            <button type="button" aria-label="Close menu" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 text-dim">
              <X size={18} />
            </button>
            <Sidebar collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar onToggleSidebar={() => setCollapsed((c) => !c)} onOpenMobileNav={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 pb-8 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
