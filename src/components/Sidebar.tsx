import clsx from 'clsx'
import { NavLink } from 'react-router-dom'
import { BRAND } from '../config/brand'
import { NAV_FOOT, NAV_LEARN, NAV_MAIN, type NavItem } from './nav'

function Item({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          isActive ? 'bg-surface-2 text-ink' : 'text-dim hover:bg-surface-2/60 hover:text-ink',
          collapsed && 'justify-center px-2',
        )
      }
    >
      <Icon size={18} strokeWidth={1.8} className="shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  )
}

function Group({ title, items, collapsed, onNavigate }: { title?: string; items: NavItem[]; collapsed: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-0.5">
      {title && !collapsed && <p className="px-3 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-faint">{title}</p>}
      {title && collapsed && <div className="mx-3 my-3 border-t border-line" />}
      {items.map((i) => (
        <Item key={i.to} item={i} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

export function Sidebar({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="flex h-full flex-col gap-2 overflow-y-auto p-3">
      <div className={clsx('flex items-center gap-2 px-2 py-2', collapsed && 'justify-center')}>
        <img src="/favicon.svg" alt="" className="size-7" />
        {!collapsed && <span className="text-[15px] font-semibold tracking-tight">{BRAND.name}</span>}
      </div>
      <Group items={NAV_MAIN} collapsed={collapsed} onNavigate={onNavigate} />
      <Group title="Learn" items={NAV_LEARN} collapsed={collapsed} onNavigate={onNavigate} />
      <div className="mt-auto">
        <Group items={NAV_FOOT} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </nav>
  )
}
