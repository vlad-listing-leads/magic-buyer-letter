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

        const { generateLetterForSkill, fillTemplate } = await import('@/lib/services/claude')
        const area = `${campaign.criteria_city}${campaign.criteria_state ? `, ${campaign.criteria_state}` : ''}`

        // Fetch active skills
        const { data: skills } = await admin
          .from('mbl_skills')
          .select('id, name, prompt_instructions')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        const activeSkills = skills ?? []
        if (activeSkills.length === 0) {
          activeSkills.push({
            id: 'default',
            name: 'Default',
            prompt_instructions: 'Write in a warm, personal, conversational tone.',
          })
        }

        const campaignContext = {
          buyer_name: campaign.buyer_name,
          area,
          bullet_1: campaign.bullet_1,
          bullet_2: campaign.bullet_2,
          bullet_3: campaign.bullet_3,
        }

        // Generate one template per skill (small number of Claude calls)
        const letterTemplates: Record<string, { body: string; ps?: string }> = {}
        for (let si = 0; si < activeSkills.length; si++) {
          const skill = activeSkills[si]
          send({ step: 'generating', progress: 10 + Math.round(((si + 1) / activeSkills.length) * 30), message: `Writing "${skill.name}" letter...` })
          const template = await generateLetterForSkill(campaignContext, skill.prompt_instructions)
          letterTemplates[skill.id] = template
        }

        // Save templates on campaign
        await admin
          .from('mbl_campaigns')
          .update({ letter_templates: letterTemplates, status: 'generating' })
          .eq('id', id)

        send({ step: 'generating', progress: 45, message: 'Personalizing for each property...' })

        // Get agent info
        const { data: agentData } = await admin
          .from('mbl_agents')
          .select('name, phone')
          .eq('id', campaign.agent_id)
          .single()

        // Get selected properties
        const { data: selectedProps } = await admin
          .from('mbl_properties')
          .select('id, address_line1, city, neighborhood')
          .eq('campaign_id', id)
          .in('id', propertyIds)

        // Fill templates per selected property
        let generatedCount = 0
        const total = selectedProps?.length ?? 0
        for (const prop of selectedProps ?? []) {
          const vars = {
            property_address: `${prop.address_line1}, ${prop.city}`,
            neighborhood: prop.neighborhood || prop.city,
            buyer_name: campaign.buyer_name,
            bullet_1: campaign.bullet_1,
            bullet_2: campaign.bullet_2,
            bullet_3: campaign.bullet_3,
            agent_name: agentData?.name ?? '',
            agent_phone: agentData?.phone ?? '',
          }

          const contentBySkill: Record<string, { body: string; ps: string }> = {}
          let firstFilled = null
          for (const [skillId, template] of Object.entries(letterTemplates)) {
            const filled = fillTemplate(template, vars)
            contentBySkill[skillId] = {
              body: filled.body,
              ps: filled.ps ?? '',
            }
            if (!firstFilled) firstFilled = contentBySkill[skillId]
          }

          await admin
            .from('mbl_properties')
            .update({
              personalized_content: firstFilled,
              personalized_content_by_skill: contentBySkill,
              status: 'generated',
              selected: true,
            })
            .eq('id', prop.id)

          generatedCount++

          if (generatedCount % 10 === 0 || generatedCount === total) {
            send({
              step: 'generating',
              progress: 45 + Math.round((generatedCount / total) * 50),
              message: `Personalized ${generatedCount} of ${total} letters`,
              count: generatedCount,
            })
          }
        }

        // Mark non-selected properties
        await admin
          .from('mbl_properties')
          .update({ selected: false })
          .eq('campaign_id', id)
          .not('id', 'in', `(${propertyIds.join(',')})`)

        await admin
          .from('mbl_campaigns')
          .update({ properties_generated: generatedCount, status: 'ready' })
          .eq('id', id)

        send({
          step: 'ready',
          progress: 100,
          message: `${generatedCount} letters ready!`,
          count: generatedCount,
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
