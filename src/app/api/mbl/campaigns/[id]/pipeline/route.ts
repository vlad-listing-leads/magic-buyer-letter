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
          years_owned_min: campaign.criteria_years_owned_min ?? undefined,
          property_type: campaign.criteria_property_type ?? undefined,
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
          .update({ properties_verified: verifiedCount, status: 'ready' })
          .eq('id', campaign.id)

        send({ step: 'verifying', progress: 90, message: `${hasLobKey ? 'Verified' : 'Passed'} ${verifiedCount} addresses`, count: verifiedCount })

        // Pipeline stops here — letter generation happens AFTER audience selection
        const readyCount = verifiedCount || propCount
        send({ step: 'ready', progress: 100, message: 'Properties ready!', count: readyCount, campaignId: campaign.id })
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
