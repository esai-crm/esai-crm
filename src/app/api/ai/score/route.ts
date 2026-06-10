import { NextRequest, NextResponse } from 'next/server'
import { scoreLeadWithAI } from '@/lib/ai'
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
  const { contact } = body

  try {
    // Get activity count for this contact
    const { count } = await supabase
      .from('activities')
      .select('*', { count: 'exact', head: true })
      .eq('contact_id', contact.id)

    const result = await scoreLeadWithAI({
      ...contact,
      firstName: contact.first_name,
      lastName: contact.last_name,
      activitiesCount: count || 0,
    })

    // Log AI usage
    await supabase.from('ai_logs').insert({
      user_id: session.user.id,
      type: 'score',
      input: { contact_id: contact.id },
      output: result,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('AI scoring error:', error)
    return NextResponse.json({ error: 'AI service error' }, { status: 500 })
  }
}
