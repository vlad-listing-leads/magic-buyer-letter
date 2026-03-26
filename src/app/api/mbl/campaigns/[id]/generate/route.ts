import { NextRequest } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'

export const maxDuration = 300

/**
 * POST /api/mbl/campaigns/[id]/generate
 *
 * Generates letters for selected properties only.
 * Called AFTER audience selection — only generates for the properties the user picked.
 *
 * Body: { property_ids: string[] }
 * Returns: SSE stream with progress
 */
export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await requireAuth()
  const { id } = await context.params
  const admin = createAdminClient()

  const body = await request.json()
  const propertyIds: string[] = body.property_ids ?? []

  if (propertyIds.length === 0) {
    return new Response(JSON.stringify({ success: false, error: 'No properties selected' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Verify campaign ownership
  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return new Response(JSON.stringify({ success: false, error: 'Campaign not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const send = (data: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      try {
        send({ step: 'generating', progress: 5, message: 'Preparing letter generation...' })

        const { generateLetterForSkill } = await import('@/lib/services/claude')
        const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`

        // Fetch active LETTER skills only
        const { data: skills } = await admin
          .from('mbl_skills')
          .select('id, name, prompt_instructions')
          .eq('is_active', true)
          .eq('channel', 'letter')
          .order('sort_order', { ascending: true })

        const activeSkills = skills ?? []
        if (activeSkills.length === 0) {
          activeSkills.push({
            id: 'default',
            name: 'Default',
            prompt_instructions: 'Write in a warm, personal, conversational tone.',
          })
        }

        // Fetch agent info for the letter
        const { data: agentData } = await admin
          .from('mbl_agents')
          .select('name, phone, brokerage')
          .eq('id', campaign.agent_id)
          .single()

        const campaignContext = {
          buyer_name: campaign.buyer_name,
          area,
          bullet_1: campaign.bullet_1,
          bullet_2: campaign.bullet_2,
          bullet_3: campaign.bullet_3,
          agent_name: agentData?.name ?? '',
          agent_phone: agentData?.phone ?? '',
          agent_brokerage: agentData?.brokerage ?? '',
        }

        // Generate one template per skill (small number of Claude calls)
        const letterTemplates: Record<string, { body: string; ps?: string }> = {}
        for (let si = 0; si < activeSkills.length; si++) {
          const skill = activeSkills[si]
          send({ step: 'generating', progress: 10 + Math.round(((si + 1) / activeSkills.length) * 30), message: `Writing "${skill.name}" letter...` })
          const template = await generateLetterForSkill(campaignContext, skill.prompt_instructions)
          letterTemplates[skill.id] = template
        }

        // Save templates + set _active to the first generated template
        // If user already has _active (edited), preserve it. Otherwise set it now.
        const existingTemplates = (campaign.letter_templates as Record<string, unknown>) ?? {}
        const firstGenerated = Object.values(letterTemplates)[0]
        const merged = {
          ...letterTemplates,
          _active: existingTemplates['_active'] ?? firstGenerated,
        }

        await admin
          .from('mbl_campaigns')
          .update({ letter_templates: merged, status: 'generating' })
          .eq('id', id)

        send({ step: 'generating', progress: 50, message: 'Finalizing...' })

        // Mark selected properties
        await admin
          .from('mbl_properties')
          .update({ status: 'generated', selected: true })
          .eq('campaign_id', id)
          .in('id', propertyIds)

        // Mark non-selected properties
        await admin
          .from('mbl_properties')
          .update({ selected: false })
          .eq('campaign_id', id)
          .not('id', 'in', `(${propertyIds.join(',')})`)

        await admin
          .from('mbl_campaigns')
          .update({ properties_generated: propertyIds.length, status: 'ready' })
          .eq('id', id)

        send({
          step: 'ready',
          progress: 100,
          message: `Letter ready for ${propertyIds.length} properties!`,
          count: propertyIds.length,
          campaignId: id,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Generation error'
        logger.error({ err, campaignId: id }, 'Letter generation failed')
        send({ step: 'error', progress: 0, message, error: message })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
