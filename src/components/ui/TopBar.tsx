'use client'
import { useAppStore } from '@/hooks/useStore'
import { Menu, Globe } from 'lucide-react'
import { Lang } from '@/i18n/translations'

export default function TopBar() {
  const { lang, setLang, setSidebarOpen, profile } = useAppStore()

  return (
    <header className="h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 lg:px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          className="lg:hidden p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={20} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          {(['en', 'ru'] as Lang[]).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                lang === l
                  ? 'bg-white text-teal-700 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* User avatar */}
        {profile && (
          <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-sm font-bold">
            {profile.full_name?.[0]?.toUpperCase() || profile.email[0].toUpperCase()}
          </div>
        )}
      </div>
    </header>
  )
}
