'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/hooks/useStore'
import { translations } from '@/i18n/translations'
import { Deal, DEAL_STAGES, STAGE_COLORS, DealStage } from '@/types'
import { Plus, X, Loader2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import clsx from 'clsx'

export default function PipelinePage() {
  const { profile, lang, deals, setDeals, addDeal, updateDeal, removeDeal } = useAppStore()
  const t = translations[lang]
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [dragCard, setDragCard] = useState<Deal | null>(null)
  const [form, setForm] = useState({ title: '', stage: 'new_lead', value: '', commission_pct: '3', property_address: '', expected_close_date: '', notes: '' })

  useEffect(() => {
    if (!profile) return
    supabase.from('deals').select('*, contact:contacts(first_name,last_name)').eq('user_id', profile.id)
      .then(({ data }) => { if (data) setDeals(data); setLoading(false) })
  }, [profile])

  async function saveDeal() {
    if (!form.title.trim()) return
    const payload = {
      user_id: profile!.id,
      title: form.title,
      stage: form.stage as DealStage,
      value: form.value ? parseInt(form.value) : null,
      commission_pct: parseFloat(form.commission_pct),
      property_address: form.property_address || null,
      expected_close_date: form.expected_close_date || null,
      notes: form.notes || null,
    }
    const { data, error } = await supabase.from('deals').insert(payload).select('*, contact:contacts(first_name,last_name)').single()
    if (error) { toast.error(t.common.error) } else { addDeal(data); toast.success(t.common.success); setShowModal(false) }
  }

  async function moveDeal(deal: Deal, newStage: DealStage) {
    const { error } = await supabase.from('deals').update({ stage: newStage }).eq('id', deal.id)
    if (!error) updateDeal(deal.id, { stage: newStage })
  }

  async function deleteDeal(id: string) {
    const { error } = await supabase.from('deals').delete().eq('id', id)
    if (!error) { removeDeal(id); toast.success(t.common.success) }
  }

  const totalValue = deals.filter(d => d.stage !== 'closed_lost').reduce((s, d) => s + (d.value || 0), 0)
  const totalComm = deals.filter(d => d.stage !== 'closed_lost').reduce((s, d) => s + ((d.value || 0) * d.commission_pct / 100), 0)

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-teal-600" /></div>

  return (
    <div className="max-w-full">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t.pipeline.title}</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {deals.filter(d => d.stage !== 'closed_won' && d.stage !== 'closed_lost').length} open · ${Math.round(totalComm).toLocaleString()} est. commission
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={16} /> {t.pipeline.addDeal}
        </button>
      </div>

      {/* Summary row */}
      <div className="flex gap-4 mb-5 overflow-x-auto pb-1">
        {['closed_won', 'closed_lost'].map((stage) => {
          const stageDeals = deals.filter(d => d.stage === stage)
          const val = stageDeals.reduce((s, d) => s + (d.value || 0), 0)
          return (
            <div key={stage} className={clsx('card px-4 py-2 flex-shrink-0 flex items-center gap-3', stage === 'closed_won' ? 'border-green-200' : 'border-red-200')}>
              <DollarSign size={16} className={stage === 'closed_won' ? 'text-green-600' : 'text-red-400'} />
              <div>
                <p className="text-xs text-slate-500">{t.pipeline.stages[stage as DealStage]}</p>
                <p className="text-sm font-bold text-slate-800">{stageDeals.length} deals · ${val.toLocaleString()}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Kanban board */}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {DEAL_STAGES.filter(s => s !== 'closed_won' && s !== 'closed_lost').map((stage) => {
          const stageDeals = deals.filter(d => d.stage === stage)
          return (
            <div
              key={stage}
              className="flex-shrink-0 w-60 bg-slate-100 rounded-xl p-3"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dragCard && moveDeal(dragCard, stage)}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', STAGE_COLORS[stage])}>
                  {t.pipeline.stages[stage]}
                </span>
                <span className="text-xs text-slate-400 font-medium">{stageDeals.length}</span>
              </div>
              <div className="kanban-col space-y-2">
                {stageDeals.length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">{t.pipeline.noDeals}</p>
                )}
                {stageDeals.map((deal) => (
                  <div
                    key={deal.id}
                    draggable
                    onDragStart={() => setDragCard(deal)}
                    onDragEnd={() => setDragCard(null)}
                    className="bg-white rounded-lg p-3 shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="text-sm font-semibold text-slate-800 leading-tight">{deal.title}</p>
                      <button onClick={() => deleteDeal(deal.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0 mt-0.5">
                        <X size={12} />
                      </button>
                    </div>
                    {deal.contact && (
                      <p className="text-xs text-slate-500 mb-1">{(deal.contact as any).first_name} {(deal.contact as any).last_name}</p>
                    )}
                    {deal.value && (
                      <p className="text-xs font-semibold text-teal-700">${deal.value.toLocaleString()}</p>
                    )}
                    {deal.property_address && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{deal.property_address}</p>
                    )}
                    {deal.expected_close_date && (
                      <p className="text-xs text-amber-600 mt-1">📅 {new Date(deal.expected_close_date).toLocaleDateString()}</p>
                    )}
                    {/* Stage move buttons */}
                    <div className="flex gap-1 mt-2">
                      {DEAL_STAGES.filter(s => s !== stage).slice(0, 3).map((s) => (
                        <button
                          key={s}
                          onClick={() => moveDeal(deal, s)}
                          title={t.pipeline.stages[s]}
                          className="text-xs px-1.5 py-0.5 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-500 rounded transition-colors"
                        >
                          →{t.pipeline.stages[s].split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Add Deal Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">{t.pipeline.addDeal}</h2>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-slate-500" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Deal title *</label>
                <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{t.pipeline.dealValue} ($)</label>
                  <input className="input" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
                </div>
                <div>
                  <label className="label">{t.pipeline.commission} (%)</label>
                  <input className="input" type="number" step="0.1" value={form.commission_pct} onChange={(e) => setForm({ ...form, commission_pct: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Stage</label>
                <select className="input" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                  {DEAL_STAGES.map((s) => <option key={s} value={s}>{t.pipeline.stages[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="label">{t.pipeline.property}</label>
                <input className="input" value={form.property_address} onChange={(e) => setForm({ ...form, property_address: e.target.value })} />
              </div>
              <div>
                <label className="label">{t.pipeline.expectedClose}</label>
                <input className="input" type="date" value={form.expected_close_date} onChange={(e) => setForm({ ...form, expected_close_date: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">{t.common.cancel}</button>
              <button onClick={saveDeal} className="btn-primary flex-1">{t.common.save}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
