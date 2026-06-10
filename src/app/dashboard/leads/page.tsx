'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/hooks/useStore'
import { translations } from '@/i18n/translations'
import { Contact, AI_LABEL_COLORS, AI_LABEL_ICONS } from '@/types'
import { Plus, Search, Trash2, Edit, Mail, Brain, Phone, X, Loader2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import clsx from 'clsx'

type Filter = 'all' | 'hot' | 'warm' | 'cold'

export default function LeadsPage() {
  const { profile, lang, contacts, setContacts, addContact, updateContact, removeContact } = useAppStore()
  const t = translations[lang]
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingContact, setEditingContact] = useState<Contact | null>(null)
  const [aiModal, setAiModal] = useState<{ type: 'score' | 'email'; contact: Contact } | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    source: 'manual', budget_min: '', budget_max: '',
    property_type: 'buy', notes: '', tags: '',
  })

  useEffect(() => {
    if (!profile) return
    supabase.from('contacts').select('*').eq('user_id', profile.id)
      .order('ai_score', { ascending: false })
      .then(({ data }) => { if (data) setContacts(data); setLoading(false) })
  }, [profile])

  const filtered = contacts.filter((c) => {
    const matchFilter = filter === 'all' || c.ai_label === filter
    const matchSearch = !search ||
      `${c.first_name} ${c.last_name} ${c.email} ${c.phone}`.toLowerCase().includes(search.toLowerCase())
    return matchFilter && matchSearch
  })

  function openNew() {
    setEditingContact(null)
    setForm({ first_name: '', last_name: '', email: '', phone: '', source: 'manual', budget_min: '', budget_max: '', property_type: 'buy', notes: '', tags: '' })
    setShowModal(true)
  }

  function openEdit(c: Contact) {
    setEditingContact(c)
    setForm({
      first_name: c.first_name, last_name: c.last_name || '',
      email: c.email || '', phone: c.phone || '',
      source: c.source || 'manual', budget_min: c.budget_min?.toString() || '',
      budget_max: c.budget_max?.toString() || '', property_type: c.property_type || 'buy',
      notes: c.notes || '', tags: c.tags?.join(', ') || '',
    })
    setShowModal(true)
  }

  async function saveContact() {
    if (!form.first_name.trim()) { toast.error('First name is required'); return }
    setSaving(true)
    const payload = {
      user_id: profile!.id,
      first_name: form.first_name,
      last_name: form.last_name || null,
      email: form.email || null,
      phone: form.phone || null,
      source: form.source as any,
      budget_min: form.budget_min ? parseInt(form.budget_min) : null,
      budget_max: form.budget_max ? parseInt(form.budget_max) : null,
      property_type: form.property_type as any,
      notes: form.notes || null,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    }

    if (editingContact) {
      const { data, error } = await supabase.from('contacts').update(payload).eq('id', editingContact.id).select().single()
      if (error) { toast.error(t.common.error); } else { updateContact(editingContact.id, data); toast.success(t.common.success) }
    } else {
      const { data, error } = await supabase.from('contacts').insert(payload).select().single()
      if (error) { toast.error(t.common.error); } else { addContact(data); toast.success(t.common.success) }
    }
    setSaving(false)
    setShowModal(false)
  }

  async function deleteContact(id: string) {
    if (!confirm(t.leads.confirmDelete)) return
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) { toast.error(t.common.error) } else { removeContact(id); toast.success(t.common.success) }
  }

  async function runAI(type: 'score' | 'email', contact: Contact) {
    setAiModal({ type, contact })
    setAiLoading(true)
    setAiResult(null)
    try {
      const endpoint = type === 'score' ? '/api/ai/score' : '/api/ai/email'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, lang }),
      })
      const data = await res.json()
      setAiResult(data)
      if (type === 'score' && data.score !== undefined) {
        const label = data.score >= 70 ? 'hot' : data.score >= 40 ? 'warm' : 'cold'
        await supabase.from('contacts').update({ ai_score: data.score, ai_label: label, ai_score_updated_at: new Date().toISOString() }).eq('id', contact.id)
        updateContact(contact.id, { ai_score: data.score, ai_label: label })
        toast.success(lang === 'ru' ? 'AI оценка обновлена' : 'AI score updated')
      }
    } catch (e) { toast.error(t.common.error) }
    setAiLoading(false)
  }

  async function copyToClipboard(text: string) {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="page-header">
        <h1 className="page-title">{t.leads.title}</h1>
        <button onClick={openNew} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> {t.leads.addLead}
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-9"
            placeholder={t.leads.search}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {(['all', 'hot', 'warm', 'cold'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-all',
                filter === f ? 'bg-teal-600 text-white' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {f !== 'all' && AI_LABEL_ICONS[f as 'hot' | 'warm' | 'cold']} {t.leads[f as keyof typeof t.leads] as string}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-slate-400 text-sm">{t.leads.noLeads}</p>
          <button onClick={openNew} className="btn-primary mt-4 text-sm">{t.leads.addLead}</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[t.leads.name, t.leads.email, t.leads.phone, t.leads.score, t.leads.source, t.leads.lastContact, t.leads.actions].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-xs font-bold flex-shrink-0">
                          {c.first_name[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{c.first_name} {c.last_name}</p>
                          {c.budget_max && <p className="text-xs text-slate-400">${c.budget_max.toLocaleString()}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.email || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{c.phone || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('text-xs px-2 py-1 rounded-full font-semibold', AI_LABEL_COLORS[c.ai_label])}>
                        {AI_LABEL_ICONS[c.ai_label]} {c.ai_score}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 capitalize">{c.source || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.last_contacted_at ? formatDistanceToNow(new Date(c.last_contacted_at), { addSuffix: true }) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button title={t.leads.aiScore} onClick={() => runAI('score', c)} className="p-1.5 hover:bg-teal-50 rounded-lg text-teal-600 transition-colors">
                          <Brain size={14} />
                        </button>
                        <button title={t.leads.aiDraft} onClick={() => runAI('email', c)} className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors">
                          <Mail size={14} />
                        </button>
                        <button title={t.leads.editLead} onClick={() => openEdit(c)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors">
                          <Edit size={14} />
                        </button>
                        <button title={t.leads.deleteLead} onClick={() => deleteContact(c.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{editingContact ? t.leads.editLead : t.leads.addLead}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                { key: 'first_name', label: t.leads.firstName, col: 1 },
                { key: 'last_name', label: t.leads.lastName, col: 1 },
                { key: 'email', label: t.leads.email, col: 2, type: 'email' },
                { key: 'phone', label: t.leads.phone, col: 2 },
                { key: 'budget_min', label: t.leads.budgetMin, col: 1, type: 'number' },
                { key: 'budget_max', label: t.leads.budgetMax, col: 1, type: 'number' },
              ].map(({ key, label, col, type }) => (
                <div key={key} className={col === 2 ? 'col-span-2' : ''}>
                  <label className="label">{label}</label>
                  <input
                    className="input"
                    type={type || 'text'}
                    value={form[key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </div>
              ))}
              <div>
                <label className="label">{t.leads.source}</label>
                <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  {['manual','website','referral','zillow','realtor','other'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.leads.propertyType}</label>
                <select className="input" value={form.property_type} onChange={(e) => setForm({ ...form, property_type: e.target.value })}>
                  {['buy','rent','sell','invest'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">{t.leads.tags}</label>
                <input className="input" placeholder="first-time, investor, luxury" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className="label">{t.leads.notes}</label>
                <textarea className="input h-20 resize-none" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">{t.leads.cancel}</button>
              <button onClick={saveContact} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />} {t.leads.save}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Modal */}
      {aiModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setAiModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-white">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
                  {aiModal.type === 'score' ? <Brain size={16} className="text-white" /> : <Mail size={16} className="text-white" />}
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {aiModal.type === 'score' ? t.ai.scoreResult : t.ai.draftResult}
                </h2>
              </div>
              <button onClick={() => setAiModal(null)}><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6">
              {aiLoading ? (
                <div className="flex flex-col items-center py-8 gap-3">
                  <div className="w-10 h-10 border-3 border-teal-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-slate-500">{aiModal.type === 'score' ? t.ai.scoring : t.ai.drafting}</p>
                </div>
              ) : aiResult ? (
                aiModal.type === 'score' ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-full bg-teal-50 border-4 border-teal-600 flex items-center justify-center">
                        <span className="text-2xl font-bold text-teal-700">{aiResult.score}</span>
                      </div>
                      <div>
                        <span className={clsx('text-sm px-3 py-1 rounded-full font-bold', AI_LABEL_COLORS[aiResult.label as 'hot' | 'warm' | 'cold'])}>
                          {AI_LABEL_ICONS[aiResult.label as 'hot' | 'warm' | 'cold']} {aiResult.label?.toUpperCase()}
                        </span>
                        <p className="text-xs text-slate-500 mt-1 capitalize">{aiResult.urgency} urgency</p>
                      </div>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                      <p className="text-sm text-slate-700">{aiResult.reasoning}</p>
                      <p className="text-sm font-semibold text-teal-700">→ {aiResult.nextAction}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Subject</p>
                      <p className="text-sm font-semibold text-slate-800 bg-slate-50 px-3 py-2 rounded-lg">{aiResult.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Body</p>
                      <pre className="text-sm text-slate-700 bg-slate-50 px-3 py-3 rounded-lg whitespace-pre-wrap font-sans leading-relaxed max-h-52 overflow-y-auto">{aiResult.body}</pre>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => copyToClipboard(`Subject: ${aiResult.subject}\n\n${aiResult.body}`)}
                        className="btn-secondary flex items-center gap-2 text-sm flex-1"
                      >
                        {copied ? <><Check size={14} className="text-teal-600" /> {t.ai.copied}</> : <><Copy size={14} /> {t.ai.copyDraft}</>}
                      </button>
                      {aiModal.contact.email && (
                        <a
                          href={`mailto:${aiModal.contact.email}?subject=${encodeURIComponent(aiResult.subject)}&body=${encodeURIComponent(aiResult.body)}`}
                          className="btn-primary flex items-center gap-2 text-sm"
                        >
                          <Mail size={14} /> {lang === 'ru' ? 'Открыть' : 'Open'}
                        </a>
                      )}
                    </div>
                  </div>
                )
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
