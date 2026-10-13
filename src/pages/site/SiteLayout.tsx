import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/AuthProvider'
import { ThemeToggle } from '../../components/ThemeToggle'
import { BRAND } from '../../config/brand'
import { LEGAL_LINKS } from '../../config/legal'

/** Header and footer for the public pages: landing, pricing and legal. */
export function SiteLayout({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur">
        <nav className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" className="size-7" />
            {BRAND.name}
          </Link>
          <div className="ml-auto hidden items-center gap-6 text-sm text-dim sm:flex">
            <a href="/#features" className="hover:text-ink">
              Features
            </a>
            <a href="/#pricing" className="hover:text-ink">
              Pricing
            </a>
            <a href="/#faq" className="hover:text-ink">
              FAQ
            </a>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:ml-0">
            <ThemeToggle />
            {session ? (
              <Link to="/" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                Open app
              </Link>
            ) : (
              <>
                <Link to="/login" state={{ mode: 'signin' }} className="hidden rounded-xl px-3 py-2 text-sm text-dim hover:text-ink sm:block">
                  Sign in
                </Link>
                <Link to="/login" className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-ink">
                  Start free trial
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-dim sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {BRAND.name} · {BRAND.region}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link key={l.to} to={l.to} className="hover:text-ink">
                {l.label}
              </Link>
            ))}
            <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-ink">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
