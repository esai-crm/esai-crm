'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/hooks/useStore'
import { translations } from '@/i18n/translations'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, GitBranch, Bell,
  Settings, ShieldCheck, LogOut, X, Zap
} from 'lucide-react'
import clsx from 'clsx'

export default function Sidebar() {
  const { profile, lang, sidebarOpen, setSidebarOpen } = useAppStore()
  const t = translations[lang]
  const pathname = usePathname()
  const router = useRouter()

  const links = [
    { href: '/dashboard', icon: LayoutDashboard, label: t.nav.dashboard },
    { href: '/dashboard/leads', icon: Users, label: t.nav.leads },
    { href: '/dashboard/pipeline', icon: GitBranch, label: t.nav.pipeline },
    { href: '/dashboard/activities', icon: Bell, label: t.nav.activities },
    { href: '/dashboard/settings', icon: Settings, label: t.nav.settings },
    ...(profile?.role === 'admin' || profile?.role === 'superadmin'
      ? [{ href: '/admin', icon: ShieldCheck, label: t.nav.admin }]
      : []),
  ]

  async function handleLogout() {
    await supabase.auth.signOut()
    useAppStore.getState().reset()
    router.push('/auth/login')
  }

  const planColors: Record<string, string> = {
    trial: 'bg-slate-500',
    starter: 'bg-blue-500',
    pro: 'bg-teal-500',
    team: 'bg-purple-500',
  }

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={clsx(
        'fixed top-0 left-0 h-full z-40 w-64 flex flex-col',
        'bg-[#0D1B3E] transition-transform duration-300',
        'lg:translate-x-0 lg:static lg:z-auto',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold text-white tracking-tight">
              ES<span className="text-teal-400">AI</span>
            </span>
          </div>
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Plan badge */}
        {profile && (
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
              <div className={clsx('w-2 h-2 rounded-full', planColors[profile.plan])} />
              <span className="text-xs text-slate-300 capitalize">
                {t.plans[profile.plan as keyof typeof t.plans]} Plan
              </span>
            </div>
          </div>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {links.map((link) => {
            const active = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href))
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  'sidebar-link',
                  active ? 'sidebar-link-active' : 'sidebar-link-inactive'
                )}
              >
                <link.icon size={18} className={active ? 'text-white' : 'text-slate-400'} />
                {link.label}
              </Link>
            )
          })}
        </nav>

        {/* User + logout */}
        <div className="px-3 pb-4 border-t border-white/10 pt-3">
          {profile && (
            <div className="flex items-center gap-3 px-3 py-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{profile.full_name || 'Agent'}</p>
                <p className="text-xs text-slate-400 truncate">{profile.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="sidebar-link sidebar-link-inactive w-full"
          >
            <LogOut size={18} className="text-slate-400" />
            {t.nav.logout}
          </button>
        </div>
      </aside>
    </>
  )
}
