'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/hooks/useStore'
import Sidebar from '@/components/ui/Sidebar'
import TopBar from '@/components/ui/TopBar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { setProfile, profile } = useAppStore()

  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/auth/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
      if (data) {
        setProfile(data)
        if (data.role === 'user') router.push('/dashboard')
      }
    }
    check()
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 animate-fadeIn">{children}</main>
      </div>
    </div>
  )
}
