export type Plan = 'trial' | 'starter' | 'pro' | 'team'
export type Role = 'user' | 'admin' | 'superadmin'
export type AiLabel = 'hot' | 'warm' | 'cold'
export type Lang = 'en' | 'ru'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  role: Role
  plan: Plan
  plan_expires_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  language: Lang
  timezone: string
  onboarded: boolean
  created_at: string
  updated_at: string
}

export type ContactStatus = 'new' | 'active' | 'negotiating' | 'closed_won' | 'closed_lost' | 'nurture'
export type ContactSource = 'manual' | 'website' | 'referral' | 'zillow' | 'realtor' | 'other'
export type PropertyType = 'buy' | 'rent' | 'sell' | 'invest'

export interface Contact {
  id: string
  user_id: string
  first_name: string
  last_name: string | null
  email: string | null
  phone: string | null
  source: ContactSource | null
  status: ContactStatus
  ai_score: number
  ai_label: AiLabel
  ai_score_updated_at: string | null
  budget_min: number | null
  budget_max: number | null
  property_type: PropertyType | null
  notes: string | null
  tags: string[]
  last_contacted_at: string | null
  created_at: string
  updated_at: string
}

export type DealStage =
  | 'new_lead'
  | 'contacted'
  | 'showing'
  | 'offer'
  | 'negotiation'
  | 'under_contract'
  | 'closed_won'
  | 'closed_lost'

export interface Deal {
  id: string
  user_id: string
  contact_id: string | null
  title: string
  stage: DealStage
  value: number | null
  commission_pct: number
  property_address: string | null
  expected_close_date: string | null
  closed_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
  contact?: Contact
}

export type ActivityType = 'call' | 'email' | 'meeting' | 'note' | 'showing' | 'offer' | 'follow_up'

export interface Activity {
  id: string
  user_id: string
  contact_id: string | null
  deal_id: string | null
  type: ActivityType
  subject: string | null
  body: string | null
  completed: boolean
  scheduled_at: string | null
  completed_at: string | null
  ai_generated: boolean
  created_at: string
  contact?: Contact
}

export interface Reminder {
  id: string
  user_id: string
  contact_id: string | null
  deal_id: string | null
  title: string
  body: string | null
  remind_at: string
  sent: boolean
  ai_generated: boolean
  created_at: string
  contact?: Contact
}

export interface AdminStats {
  total_users: number
  trial_users: number
  starter_users: number
  pro_users: number
  team_users: number
  new_users_7d: number
  total_contacts: number
  total_closed_deals: number
  total_revenue_commissions: number
}

export const PLAN_LIMITS: Record<Plan, { contacts: number; aiCalls: number; label: string; price: number }> = {
  trial: { contacts: 50, aiCalls: 10, label: 'Free Trial', price: 0 },
  starter: { contacts: 200, aiCalls: 50, label: 'Starter', price: 29 },
  pro: { contacts: -1, aiCalls: 500, label: 'Pro', price: 49 },
  team: { contacts: -1, aiCalls: 2000, label: 'Team', price: 99 },
}

export const DEAL_STAGES: DealStage[] = [
  'new_lead', 'contacted', 'showing', 'offer',
  'negotiation', 'under_contract', 'closed_won', 'closed_lost',
]

export const STAGE_COLORS: Record<DealStage, string> = {
  new_lead: 'bg-slate-100 text-slate-700',
  contacted: 'bg-blue-100 text-blue-700',
  showing: 'bg-purple-100 text-purple-700',
  offer: 'bg-amber-100 text-amber-700',
  negotiation: 'bg-orange-100 text-orange-700',
  under_contract: 'bg-teal-100 text-teal-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-700',
}

export const AI_LABEL_COLORS: Record<AiLabel, string> = {
  hot: 'bg-red-100 text-red-700 border border-red-200',
  warm: 'bg-amber-100 text-amber-700 border border-amber-200',
  cold: 'bg-slate-100 text-slate-600 border border-slate-200',
}

export const AI_LABEL_ICONS: Record<AiLabel, string> = {
  hot: '🔥',
  warm: '⚡',
  cold: '❄️',
}
