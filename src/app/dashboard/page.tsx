'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/hooks/useStore'
import { translations } from '@/i18n/translations'
import { Contact, Deal } from '@/types'
import { Users, Flame, GitBranch, TrendingUp, Plus, Zap, Bell } from 'lucide-react'
import Link from 'next/link'
import { format, formatDistanceToNow } from 'date-fns'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar
} from 'recharts'

export default function DashboardPage() {
  const { profile, lang, contacts, deals, setContacts, setDeals } = useAppStore()
  const t = translations[lang]
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<any[]>([])
  const [reminders, setReminders] = useState<any[]>([])

  useEffect(() => {
    if (!profile) return
    async function load() {
      const [c, d, a, r] = await Promise.all([
        supabase.from('contacts').select('*').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(100),
        supabase.from('deals').select('*, contact:contacts(first_name,last_name)').eq('user_id', profile!.id).order('created_at', { ascending: false }),
        supabase.from('activities').select('*, contact:contacts(first_name,last_name)').eq('user_id', profile!.id).order('created_at', { ascending: false }).limit(10),
        supabase.from('reminders').select('*, contact:contacts(first_name,last_name)').eq('user_id', profile!.id).eq('sent', false).order('remind_at').limit(5),
      ])
      if (c.data) setContacts(c.data)
      if (d.data) setDeals(d.data)
      if (a.data) setActivities(a.data)
      if (r.data) setReminders(r.data)
      setLoading(false)
    }
    load()
  }, [profile])

  const hotLeads = contacts.filter((c) => c.ai_label === 'hot').length
  const openDeals = deals.filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length
  const estCommission = deals
    .filter((d) => d.stage !== 'closed_lost')
    .reduce((sum, d) => sum + ((d.value || 0) * (d.commission_pct / 100)), 0)

  // Chart data — contacts added per day last 7 days
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const label = format(d, 'MMM d')
    const count = contacts.filter((c) => {
      const cd = new Date(c.created_at)
      return cd.toDateString() === d.toDateString()
    }).length
    return { date: label, leads: count }
  })

  const pipelineData = ['contacted', 'showing', 'offer', 'negotiation', 'under_contract'].map((stage) => ({
    stage: stage.replace('_', ' '),
    count: deals.filter((d) => d.stage === stage).length,
  }))

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.dashboard.title}</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {t.dashboard.welcome}, {profile?.full_name?.split(' ')[0] || 'Agent'} 👋
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/leads?new=1" className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={16} /> {t.dashboard.addLead}
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: t.dashboard.totalLeads, value: contacts.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          { icon: Flame, label: t.dashboard.hotLeads, value: hotLeads, color: 'text-red-600', bg: 'bg-red-50' },
          { icon: GitBranch, label: t.dashboard.openDeals, value: openDeals, color: 'text-purple-600', bg: 'bg-purple-50' },
          { icon: TrendingUp, label: t.dashboard.revenue, value: `$${Math.round(estCommission).toLocaleString()}`, color: 'text-teal-600', bg: 'bg-teal-50' },
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Lead growth chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">New leads — last 7 days</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Line type="monotone" dataKey="leads" stroke="#0D9488" strokeWidth={2.5} dot={{ fill: '#0D9488', r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Pipeline chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Pipeline stages</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={pipelineData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <YAxis dataKey="stage" type="category" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={80} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E2E8F0' }} />
              <Bar dataKey="count" fill="#0D9488" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Reminders */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} className="text-teal-600" />
            <h3 className="text-sm font-semibold text-slate-700">Upcoming reminders</h3>
          </div>
          {reminders.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No upcoming reminders</p>
          ) : (
            <div className="space-y-3">
              {reminders.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-teal-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">{r.title}</p>
                    {r.contact && (
                      <p className="text-xs text-slate-500">{r.contact.first_name} {r.contact.last_name}</p>
                    )}
                    <p className="text-xs text-teal-600">{format(new Date(r.remind_at), 'MMM d, h:mm a')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} className="text-amber-500" />
            <h3 className="text-sm font-semibold text-slate-700">{t.dashboard.recentActivity}</h3>
          </div>
          {activities.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">{t.dashboard.noActivity}</p>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 6).map((a) => (
                <div key={a.id} className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 text-xs">
                    {a.type === 'email' ? '✉️' : a.type === 'call' ? '📞' : a.type === 'meeting' ? '📅' : '📝'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{a.subject || a.type}</p>
                    {a.contact && (
                      <p className="text-xs text-slate-500">{a.contact.first_name} {a.contact.last_name}</p>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 flex-shrink-0">
                    {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
