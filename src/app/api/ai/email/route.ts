import { NextRequest, NextResponse } from 'next/server'
import { draftFollowUpEmail } from '@/lib/ai'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { contact, lang } = body

  // Get agent profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', session.user.id)
    .single()

  try {
    const result = await draftFollowUpEmail({
      agentName: profile?.full_name || 'Agent',
      leadFirstName: contact.first_name,
      leadLastName: contact.last_name,
      propertyType: contact.property_type,
      budgetMax: contact.budget_max,
      lastInteraction: contact.last_contacted_at,
      notes: contact.notes,
      lang: lang || 'en',
    })

    await supabase.from('ai_logs').insert({
      user_id: session.user.id,
      type: 'email_draft',
      input: { contact_id: contact.id },
      output: result,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI email error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
