import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface LeadScoreResult {
  score: number
  label: 'hot' | 'warm' | 'cold'
  reasoning: string
  nextAction: string
  urgency: 'high' | 'medium' | 'low'
}

export interface EmailDraftResult {
  subject: string
  body: string
  tone: string
}

export async function scoreLeadWithAI(lead: {
  firstName: string
  lastName?: string
  email?: string
  phone?: string
  source?: string
  budgetMin?: number
  budgetMax?: number
  propertyType?: string
  notes?: string
  lastContactedAt?: string
  activitiesCount?: number
}): Promise<LeadScoreResult> {
  const prompt = `You are an expert real estate AI analyst. Score this lead from 0-100 and classify them.

Lead details:
- Name: ${lead.firstName} ${lead.lastName || ''}
- Source: ${lead.source || 'unknown'}
- Budget: ${lead.budgetMin ? `$${lead.budgetMin.toLocaleString()} - $${lead.budgetMax?.toLocaleString()}` : 'unknown'}
- Property goal: ${lead.propertyType || 'unknown'}
- Last contacted: ${lead.lastContactedAt ? new Date(lead.lastContactedAt).toLocaleDateString() : 'never'}
- Total interactions: ${lead.activitiesCount || 0}
- Notes: ${lead.notes || 'none'}

Scoring criteria:
- 80-100 (HOT): Has budget, clear intent, recent engagement, ready to transact
- 50-79 (WARM): Some engagement, budget unclear, or not urgent
- 0-49 (COLD): No recent contact, unclear intent, or no budget

Respond ONLY with valid JSON:
{
  "score": <0-100>,
  "label": "<hot|warm|cold>",
  "reasoning": "<2 sentences explaining the score>",
  "nextAction": "<specific recommended next action>",
  "urgency": "<high|medium|low>"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')
  return result as LeadScoreResult
}

export async function draftFollowUpEmail(params: {
  agentName: string
  leadFirstName: string
  leadLastName?: string
  propertyType?: string
  budgetMax?: number
  lastInteraction?: string
  notes?: string
  lang?: 'en' | 'ru'
}): Promise<EmailDraftResult> {
  const isRu = params.lang === 'ru'

  const prompt = isRu
    ? `Ты опытный риелтор. Напиши профессиональное follow-up письмо клиенту.

Детали:
- Агент: ${params.agentName}
- Клиент: ${params.leadFirstName} ${params.leadLastName || ''}
- Цель: ${params.propertyType || 'покупка/продажа'}
- Бюджет до: ${params.budgetMax ? `$${params.budgetMax.toLocaleString()}` : 'не указан'}
- Последний контакт: ${params.lastInteraction || 'не было'}
- Заметки: ${params.notes || 'нет'}

Письмо должно быть тёплым, профессиональным, коротким (3-4 абзаца), с конкретным призывом к действию.
Ответь ТОЛЬКО в JSON формате:
{
  "subject": "<тема письма>",
  "body": "<тело письма>",
  "tone": "professional"
}`
    : `You are an experienced real estate agent. Write a professional follow-up email.

Details:
- Agent: ${params.agentName}
- Lead: ${params.leadFirstName} ${params.leadLastName || ''}
- Looking to: ${params.propertyType || 'buy/sell'}
- Budget up to: ${params.budgetMax ? `$${params.budgetMax.toLocaleString()}` : 'unknown'}
- Last interaction: ${params.lastInteraction || 'none'}
- Notes: ${params.notes || 'none'}

Write a warm, professional, concise email (3-4 paragraphs) with a clear call to action.
Respond ONLY with valid JSON:
{
  "subject": "<email subject>",
  "body": "<email body>",
  "tone": "professional"
}`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    response_format: { type: 'json_object' },
  })

  const result = JSON.parse(response.choices[0].message.content || '{}')
  return result as EmailDraftResult
}

export async function generateSmartReminder(params: {
  agentName: string
  leadFirstName: string
  leadLabel: 'hot' | 'warm' | 'cold'
  daysSinceLastContact: number
  lang?: 'en' | 'ru'
}): Promise<string> {
  const isRu = params.lang === 'ru'
  const prompt = isRu
    ? `Сгенерируй короткое (1 предложение) умное напоминание для риелтора о лиде. 
Лид: ${params.leadFirstName}, статус: ${params.leadLabel}, дней без контакта: ${params.daysSinceLastContact}.
Напоминание должно быть конкретным и actionable. Ответь только текстом напоминания.`
    : `Generate a short (1 sentence) smart reminder for a real estate agent about a lead.
Lead: ${params.leadFirstName}, status: ${params.leadLabel}, days since last contact: ${params.daysSinceLastContact}.
Make it specific and actionable. Reply with only the reminder text.`

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.6,
  })

  return response.choices[0].message.content || ''
}
