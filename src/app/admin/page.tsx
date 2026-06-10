'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/hooks/useStore'
import { translations } from '@/i18n/translations'
import { Profile, AdminStats, Plan } from '@/types'
import { Users, TrendingUp, ShieldCheck, Loader2, Search, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import clsx from 'clsx'
import {
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts'

export default function AdminPage() {
  const { profile, lang } = useAppStore()
  const t = translations[lang]
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats')

  // Guard: only admins
  if (profile && profile.role === 'user') {
    return <div className="flex items-center justify-center h-64"><p className="text-slate-400">Access denied</p></div>
  }

  useEffect(() => {
    async function load() {
      const [s, u] = await Promise.all([
        supabase.from('admin_stats').select('*').single(),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ])
      if (s.data) setStats(s.data)
      if (u.data) setUsers(u.data)
      setLoading(false)
    }
    load()
  }, [])

  async function changePlan(userId: string, plan: Plan) {
    const { error } = await supabase.from('profiles').update({ plan }).eq('id', userId)
    if (error) { toast.error(t.common.error) } else {
      setUsers((u) => u.map((p) => p.id === userId ? { ...p, plan } : p))
      toast.success(t.common.success)
    }
  }

  async function changeRole(userId: string, role: 'user' | 'admin') {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', userId)
    if (error) { toast.error(t.common.error) } else {
      setUsers((u) => u.map((p) => p.id === userId ? { ...p, role } : p))
      toast.success(t.common.success)
    }
  }

  const filteredUsers = users.filter((u) =>
    !search || `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  )

  const planColors: Record<Plan, string> = { trial: '#94A3B8', starter: '#3B82F6', pro: '#0D9488', team: '#8B5CF6' }

  const pieData = stats ? [
    { name: 'Trial', value: stats.trial_users, color: planColors.trial },
    { name: 'Starter', value: stats.starter_users, color: planColors.starter },
    { name: 'Pro', value: stats.pro_users, color: planColors.pro },
    { name: 'Team', value: stats.team_users, color: planColors.team },
  ] : []

  const mrr = stats ? (stats.starter_users * 29 + stats.pro_users * 49 + stats.team_users * 99) : 0

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" /></div>

  return (
    <div className="max-w-6xl mx-auto">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center">
            <ShieldCheck size={20} className="text-white" />
          </div>
          <div>
            <h1 className="page-title">{t.admin.title}</h1>
            <p className="text-xs text-slate-500">Superadmin view</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit mb-6">
        {(['stats', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2 rounded-md text-sm font-semibold capitalize transition-all',
              activeTab === tab ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {tab === 'stats' ? t.admin.stats : t.admin.users}
          </button>
        ))}
      </div>

      {activeTab === 'stats' && stats && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: t.admin.totalUsers, value: stats.total_users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: t.admin.trialUsers, value: stats.trial_users, icon: ShieldCheck, color: 'text-slate-600', bg: 'bg-slate-100' },
              { label: t.admin.paidUsers, value: stats.starter_users + stats.pro_users + stats.team_users, icon: TrendingUp, color: 'text-teal-600', bg: 'bg-teal-50' },
              { label: t.admin.mrr, value: `$${mrr.toLocaleString()}`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            ].map((s, i) => (
              <div key={i} className="stat-card">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{s.label}</p>
                  <div className={`w-8 h-8 rounded-lg ${s.bg} flex items-center justify-center`}>
                    <s.icon size={16} className={s.color} />
                  </div>
                </div>
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Plan distribution */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Plan distribution</h3>
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {pieData.map((p) => (
                    <div key={p.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: p.color }} />
                      <span className="text-xs text-slate-600">{p.name}: <strong>{p.value}</strong></span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Revenue breakdown */}
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">Monthly revenue by plan</h3>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={[
                  { plan: 'Starter', revenue: stats.starter_users * 29 },
                  { plan: 'Pro', revenue: stats.pro_users * 49 },
                  { plan: 'Team', revenue: stats.team_users * 99 },
                ]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis dataKey="plan" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <Tooltip formatter={(v) => [`$${v}`, 'Revenue']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="revenue" fill="#0D9488" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Additional stats */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Total contacts', value: stats.total_contacts },
              { label: 'Closed deals', value: stats.total_closed_deals },
              { label: 'New users (7d)', value: stats.new_users_7d },
            ].map((s, i) => (
              <div key={i} className="card p-4 text-center">
                <p className="text-2xl font-bold text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9 max-w-sm"
              placeholder={t.admin.searchUsers}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['User', 'Plan', 'Role', 'Joined', 'Actions'].map((h) => (
                      <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold">
                            {(u.full_name || u.email)[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{u.full_name || '—'}</p>
                            <p className="text-xs text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={u.plan}
                          onChange={(e) => changePlan(u.id, e.target.value as Plan)}
                          className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                          style={{ color: planColors[u.plan] }}
                        >
                          {['trial','starter','pro','team'].map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'text-xs px-2 py-0.5 rounded-full font-medium',
                          u.role === 'superadmin' ? 'bg-purple-100 text-purple-700' :
                          u.role === 'admin' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-600'
                        )}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {format(new Date(u.created_at), 'MMM d, yyyy')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {u.role !== 'superadmin' && u.id !== profile?.id && (
                            <button
                              onClick={() => changeRole(u.id, u.role === 'admin' ? 'user' : 'admin')}
                              className="text-xs px-2 py-1 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 rounded-lg transition-colors"
                            >
                              {u.role === 'admin' ? t.admin.removeAdmin : t.admin.makeAdmin}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
