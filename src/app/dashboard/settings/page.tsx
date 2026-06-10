'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/hooks/useStore'
import { translations } from '@/i18n/translations'
import { toast } from 'sonner'
import { Loader2, CreditCard, User, Globe } from 'lucide-react'
import { PLAN_LIMITS } from '@/types'
import { format } from 'date-fns'

export default function SettingsPage() {
  const { profile, lang, setProfile, setLang } = useAppStore()
  const t = translations[lang]
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [timezone, setTimezone] = useState(profile?.timezone || 'UTC')

  async function saveProfile() {
    if (!profile) return
    setSaving(true)
    const { data, error } = await supabase
      .from('profiles')
      .update({ full_name: name, timezone, language: lang })
      .eq('id', profile.id)
      .select()
      .single()
    if (error) { toast.error(t.common.error) }
    else { setProfile(data); toast.success(t.common.success) }
    setSaving(false)
  }

  const planInfo = profile ? PLAN_LIMITS[profile.plan] : null

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="page-title mb-6">{t.settings.title}</h1>

      {/* Profile */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-5">
          <User size={18} className="text-teal-600" />
          <h2 className="text-base font-semibold text-slate-800">{t.settings.profile}</h2>
        </div>
        <div className="space-y-4">
          <div>
            <label className="label">{t.settings.fullName}</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">{t.settings.email}</label>
            <input className="input" value={profile?.email || ''} disabled className="input bg-slate-50 text-slate-400 cursor-not-allowed" />
          </div>
          <div>
            <label className="label">{t.settings.timezone}</label>
            <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              {['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/Moscow', 'Europe/London', 'Asia/Dubai'].map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Language */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-5">
          <Globe size={18} className="text-teal-600" />
          <h2 className="text-base font-semibold text-slate-800">{t.settings.language}</h2>
        </div>
        <div className="flex gap-2">
          {(['en', 'ru'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                lang === l
                  ? 'bg-teal-600 text-white border-teal-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-teal-300'
              }`}
            >
              {l === 'en' ? '🇺🇸 English' : '🇷🇺 Русский'}
            </button>
          ))}
        </div>
      </div>

      {/* Billing */}
      <div className="card p-6 mb-4">
        <div className="flex items-center gap-2 mb-5">
          <CreditCard size={18} className="text-teal-600" />
          <h2 className="text-base font-semibold text-slate-800">{t.settings.billing}</h2>
        </div>
        {planInfo && (
          <div className="bg-gradient-to-r from-teal-50 to-slate-50 rounded-xl p-4 mb-4 border border-teal-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-medium tracking-wide">{t.settings.currentPlan}</p>
                <p className="text-xl font-bold text-slate-900 mt-0.5">{planInfo.label}</p>
                <p className="text-sm text-teal-700 font-semibold">
                  {planInfo.price === 0 ? lang === 'ru' ? 'Бесплатно' : 'Free' : `$${planInfo.price}/mo`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">{t.settings.trialEnds}</p>
                {profile?.plan_expires_at && (
                  <p className="text-sm font-semibold text-slate-700">
                    {format(new Date(profile.plan_expires_at), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[
            { plan: 'starter', label: 'Starter', price: '$29/mo', features: '200 contacts' },
            { plan: 'pro', label: 'Pro', price: '$49/mo', features: 'Unlimited + AI' },
            { plan: 'team', label: 'Team', price: '$99/mo', features: '5 agents' },
          ].map((p) => (
            <div
              key={p.plan}
              className={`border rounded-xl p-3 text-center cursor-pointer transition-all ${
                profile?.plan === p.plan
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-slate-200 hover:border-teal-300 hover:bg-slate-50'
              }`}
            >
              <p className="text-sm font-bold text-slate-800">{p.label}</p>
              <p className="text-lg font-bold text-teal-700">{p.price}</p>
              <p className="text-xs text-slate-500">{p.features}</p>
              {profile?.plan !== p.plan && (
                <p className="text-xs text-teal-600 mt-1 font-medium">
                  {lang === 'ru' ? 'Подключить Stripe' : 'Connect Stripe →'}
                </p>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400 mt-3 text-center">
          {lang === 'ru'
            ? '💳 Платёжная система Stripe подключается за ~1 час. Смотри DEPLOY.md'
            : '💳 Stripe billing connects in ~1 hour. See DEPLOY.md for instructions.'}
        </p>
      </div>

      <button onClick={saveProfile} disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2 py-3">
        {saving && <Loader2 size={16} className="animate-spin" />}
        {t.settings.save}
      </button>
    </div>
  )
}
