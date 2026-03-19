import { NextRequest } from 'next/server'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'

/**
 * GET /api/mbl/campaigns/[id]/pipeline
 * Runs the campaign pipeline as an SSE stream.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: campaignId } = await context.params

  let user
  try {
    user = await requireAuth()
  } catch {
    return new Response('Unauthorized', { status: 401 })
  }

  const admin = createAdminClient()

  // Verify campaign ownership
  const { data: campaign } = await admin
    .from('mbl_campaigns')
    .select('*')
    .eq('id', campaignId)
    .eq('user_id', user.id)
    .single()

  if (!campaign) {
    return new Response('Campaign not found', { status: 404 })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        // Step 1: Search properties
        send({ step: 'searching', progress: 5, message: 'Searching for properties...' })

        const { searchProperties, mapPropertyToDb } = await import('@/lib/services/reapi')
        const properties = await searchProperties({
          city: campaign.criteria_city || undefined,
          state: campaign.criteria_state || undefined,
          zip: campaign.criteria_zip || undefined,
          price_min: campaign.criteria_price_min ?? undefined,
          price_max: campaign.criteria_price_max ?? undefined,
          beds_min: campaign.criteria_beds_min ?? undefined,
          baths_min: campaign.criteria_baths_min ?? undefined,
          sqft_min: campaign.criteria_sqft_min ?? undefined,
          sqft_max: campaign.criteria_sqft_max ?? undefined,
        })

        if (properties.length === 0) {
          send({ step: 'error', progress: 0, message: 'No properties found', error: 'No properties matched your criteria. Try broadening your search.' })
          controller.close()
          return
        }

        const propertyRows = properties.map(p => mapPropertyToDb(p, campaign.id))
        const { data: insertedProps } = await admin
          .from('mbl_properties')
          .insert(propertyRows)
          .select('id, address_line1, address_line2, city, state, zip, owner_type, owner_first_name, owner_last_name, estimated_value, years_owned, bedrooms, sqft, neighborhood')

        await admin
          .from('mbl_campaigns')
          .update({ total_properties: properties.length, status: 'skip_tracing' })
          .eq('id', campaign.id)

        send({ step: 'searching', progress: 20, message: `Found ${properties.length} properties`, count: properties.length })

        // Step 2: Promote all properties to skip_traced (no skip trace API calls)
        const propCount = insertedProps?.length ?? 0
        await admin
          .from('mbl_properties')
          .update({ status: 'skip_traced' })
          .eq('campaign_id', campaign.id)
          .eq('status', 'found')

        await admin
          .from('mbl_campaigns')
          .update({ properties_skip_traced: propCount, status: 'verifying' })
          .eq('id', campaign.id)

        send({ step: 'skip_tracing', progress: 40, message: `${propCount} properties ready`, count: propCount })

        // Step 3: Verify addresses via Lob (skip if no key)
        send({ step: 'verifying', progress: 50, message: 'Verifying addresses...' })

        let verifiedCount = 0
        const hasLobKey = !!env.lob.apiKey

        if (hasLobKey) {
          const { verifyAddress } = await import('@/lib/services/lob')
          const { data: propsToVerify } = await admin
            .from('mbl_properties')
            .select('id, address_line1, address_line2, city, state, zip')
            .eq('campaign_id', campaign.id)
            .eq('status', 'skip_traced')

          for (const prop of propsToVerify ?? []) {
            try {
              const verification = await verifyAddress({
                primary_line: prop.address_line1,
                secondary_line: prop.address_line2 || undefined,
                city: prop.city,
                state: prop.state,
                zip_code: prop.zip,
              })

              const isDeliverable = verification.deliverability === 'deliverable' ||
                verification.deliverability === 'deliverable_unnecessary_unit'

              await admin
                .from('mbl_properties')
                .update({
                  address_verified: true,
                  address_deliverable: isDeliverable,
                  lob_verification_id: verification.id,
                  status: isDeliverable ? 'verified' : 'skip_traced',
                })
                .eq('id', prop.id)

              if (isDeliverable) verifiedCount++
            } catch {
              // Skip failed verifications
            }
          }
        } else {
          // No Lob key — promote all skip_traced to verified
          logger.info('Lob not configured — skipping address verification')
          const { count } = await admin
            .from('mbl_properties')
            .update({ status: 'verified', address_verified: false })
            .eq('campaign_id', campaign.id)
            .eq('status', 'skip_traced')

          verifiedCount = count ?? propCount
        }

        await admin
          .from('mbl_campaigns')
          .update({ properties_verified: verifiedCount, status: 'generating' })
          .eq('id', campaign.id)

        send({ step: 'verifying', progress: 70, message: `${hasLobKey ? 'Verified' : 'Passed'} ${verifiedCount} addresses`, count: verifiedCount })

        // Step 4: Generate letter templates via Claude — one per active skill
        send({ step: 'generating', progress: 75, message: 'AI is writing your letters...' })

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
          // Fallback: use a default prompt if no skills exist
          activeSkills.push({
            id: 'default',
            name: 'Default',
            prompt_instructions: 'Write in a warm, personal, conversational tone. Be genuine and relatable.',
          })
        }

        const campaignContext = {
          buyer_name: campaign.buyer_name,
          area,
          bullet_1: campaign.bullet_1,
          bullet_2: campaign.bullet_2,
          bullet_3: campaign.bullet_3,
        }

        // Generate one template per skill
        const letterTemplates: Record<string, { opening: string; body: string; closing: string }> = {}
        for (let si = 0; si < activeSkills.length; si++) {
          const skill = activeSkills[si]
          send({ step: 'generating', progress: 75 + Math.round(((si + 1) / activeSkills.length) * 10), message: `Writing "${skill.name}" letter...` })
          const template = await generateLetterForSkill(campaignContext, skill.prompt_instructions)
          letterTemplates[skill.id] = template
        }

        // Save templates on campaign
        await admin
          .from('mbl_campaigns')
          .update({ letter_templates: letterTemplates })
          .eq('id', campaign.id)

        send({ step: 'generating', progress: 87, message: 'Personalizing letters for each property...' })

        // Get agent info for template variables
        const { data: agentData } = await admin
          .from('mbl_agents')
          .select('name, phone')
          .eq('id', campaign.agent_id)
          .single()

        // Fill templates per property
        const { data: verifiedProps } = await admin
          .from('mbl_properties')
          .select('id, address_line1, city, neighborhood')
          .eq('campaign_id', campaign.id)
          .eq('status', 'verified')

        let generatedCount = 0
        for (const prop of verifiedProps ?? []) {
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

          // Fill all skill templates for this property
          const contentBySkill: Record<string, { opening: string; bullet_1: string; bullet_2: string; bullet_3: string; closing: string }> = {}
          let firstFilled = null
          for (const [skillId, template] of Object.entries(letterTemplates)) {
            const filled = fillTemplate(template, vars)
            contentBySkill[skillId] = {
              opening: filled.opening,
              bullet_1: campaign.bullet_1,
              bullet_2: campaign.bullet_2,
              bullet_3: campaign.bullet_3,
              closing: filled.closing,
            }
            if (!firstFilled) firstFilled = contentBySkill[skillId]
          }

          await admin
            .from('mbl_properties')
            .update({
              personalized_content: firstFilled,
              personalized_content_by_skill: contentBySkill,
              status: 'generated',
            })
            .eq('id', prop.id)

          generatedCount++
        }

        send({
          step: 'generating',
          progress: 95,
          message: `Personalized ${generatedCount} letters × ${activeSkills.length} style${activeSkills.length > 1 ? 's' : ''}`,
          count: generatedCount,
        })

        await admin
          .from('mbl_campaigns')
          .update({ properties_generated: generatedCount, status: 'ready' })
          .eq('id', campaign.id)

        send({ step: 'ready', progress: 100, message: 'Campaign ready!', count: generatedCount, campaignId: campaign.id })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Pipeline error'
        send({ step: 'error', progress: 0, message, error: message })

        await admin
          .from('mbl_campaigns')
          .update({ status: 'error', error_message: message })
          .eq('id', campaign.id)
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
