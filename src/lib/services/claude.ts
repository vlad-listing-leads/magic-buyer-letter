import { env } from '@/lib/env'
import { logger } from '@/lib/logger'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'

export interface LetterTemplate {
  body: string
  ps?: string
}

interface CampaignContext {
  buyer_name: string
  area: string
  bullet_1: string
  bullet_2: string
  bullet_3: string
}

function buildSystemPrompt(skillInstructions: string): string {
  return `${skillInstructions}

Available placeholders (app replaces per recipient): {{property_address}}, {{neighborhood}}, {{buyer_name}}, {{agent_name}}, {{agent_phone}}, {{bullet_1}}, {{bullet_2}}, {{bullet_3}}

No homeowner names available.

JSON only: {"body": "content with \\n for breaks", "ps": "or empty string"}`
}

async function callClaude(systemPrompt: string, userPrompt: string): Promise<LetterTemplate> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    logger.error({ status: res.status, body: errorBody }, 'Claude API error')
    throw new Error(`Claude API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0]) as LetterTemplate
  } catch {
    logger.warn({ text }, 'Failed to parse Claude response as JSON')
    return { body: text }
  }
}

export async function generateLetterForSkill(
  context: CampaignContext,
  skillInstructions: string
): Promise<LetterTemplate> {
  logger.info({ skill: skillInstructions.slice(0, 80) }, 'Generating letter')
  const systemPrompt = buildSystemPrompt(skillInstructions)
  // User prompt: just the data, no instructions
  const userPrompt = `${context.buyer_name}, ${context.area}, {{bullet_1}}=${context.bullet_1}, {{bullet_2}}=${context.bullet_2}, {{bullet_3}}=${context.bullet_3}`
  return callClaude(systemPrompt, userPrompt)
}

// ============================================================================
// Magic 5 — Multi-channel content generation
// ============================================================================

export interface ChannelContext {
  buyer_name: string
  area: string
  city: string
  state: string
  price_range: string
  financing: string
  closing_flexibility: string
  condition_tolerance: string
  agent_name: string
  agent_phone: string
  agent_brokerage: string
}

export interface ChannelResult {
  subject?: string
  body: string
}

const CHANNEL_PROMPTS: Record<string, string> = {
  email: `You write cold outreach emails from a real estate agent to a homeowner. The agent represents a buyer who is looking for a home in the homeowner's area.

Write a professional but warm email. Include:
- A compelling subject line
- A concise body (200-300 words)
- Merge variables: {{first_name}} (homeowner), {{address}} (their property), {{street}}, {{neighborhood}}
- The agent's contact info naturally woven in
- A soft call to action (quick conversation, no pressure)

Return JSON only: {"subject": "subject line with {{street}} or {{neighborhood}}", "body": "email body with \\n for breaks"}`,

  text: `You write cold outreach text messages from a real estate agent to a homeowner. The agent represents a buyer looking in the homeowner's area.

Write a short, casual SMS message (~160 characters ideal, max 300). Include:
- Merge variables: {{first_name}}, {{address}}
- Agent name and phone number
- Friendly, conversational, no pressure
- One clear ask (quick conversation)

Return JSON only: {"body": "the text message"}`,

  call_script: `You write cold call scripts for real estate agents calling homeowners. The agent represents a buyer looking in the homeowner's area.

Write a structured phone script with these sections:
[OPENING] — Brief intro, ask for 60 seconds
[IF YES — THE HOOK] — Explain the buyer situation, mention their home at {{address}}
[PAUSE — let them respond]
[THE BRIDGE] — Acknowledge surprise, no pressure, just asking if the right offer came along
[IF INTERESTED] — Great, ask about price/timing/priorities, suggest a quick meeting
[IF NOT INTERESTED] — No problem, ask if they know anyone thinking of selling, leave contact info

Use merge variables: {{first_name}}, {{address}}, {{neighborhood}}
Include agent name, brokerage, and phone naturally.
Conversational tone — these are spoken words, not written.

Return JSON only: {"body": "the full script with \\n for breaks"}`,
}

async function callClaudeRaw(systemPrompt: string, userPrompt: string, maxTokens = 1500): Promise<ChannelResult> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    const errorBody = await res.text()
    logger.error({ status: res.status, body: errorBody }, 'Claude API error (channel)')
    throw new Error(`Claude API error ${res.status}`)
  }

  const data = await res.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON found')
    return JSON.parse(jsonMatch[0]) as ChannelResult
  } catch {
    logger.warn({ text }, 'Failed to parse channel response as JSON')
    return { body: text }
  }
}

export async function generateChannelContent(
  channel: string,
  context: ChannelContext
): Promise<ChannelResult> {
  const systemPrompt = CHANNEL_PROMPTS[channel]
  if (!systemPrompt) throw new Error(`Unknown channel: ${channel}`)

  const userPrompt = [
    `Buyer: ${context.buyer_name}`,
    `Area: ${context.area} (${context.city}, ${context.state})`,
    `Price range: ${context.price_range}`,
    `Financing: ${context.financing}`,
    context.closing_flexibility ? `Closing: ${context.closing_flexibility}` : '',
    context.condition_tolerance ? `Condition: ${context.condition_tolerance}` : '',
    `Agent: ${context.agent_name}, ${context.agent_brokerage}`,
    `Phone: ${context.agent_phone}`,
  ].filter(Boolean).join('\n')

  logger.info({ channel }, 'Generating channel content')
  return callClaudeRaw(systemPrompt, userPrompt, channel === 'call_script' ? 2000 : 1000)
}

export function fillTemplate(
  template: LetterTemplate,
  vars: Record<string, string>
): LetterTemplate {
  const fill = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] ?? match)
  return {
    body: fill(template.body),
    ps: template.ps ? fill(template.ps) : undefined,
  }
}
