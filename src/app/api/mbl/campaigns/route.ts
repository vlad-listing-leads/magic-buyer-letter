import { NextRequest } from 'next/server'
import { apiSuccess, apiError } from '@/lib/api/response'
import { requireAuth, createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const campaignCreateSchema = z.object({
  buyer_name: z.string().min(1),
  buyer_description: z.string().default(''),
  criteria: z.object({
    price_min: z.number().optional(),
    price_max: z.number().optional(),
    beds_min: z.number().optional(),
    baths_min: z.number().optional(),
    sqft_min: z.number().optional(),
    sqft_max: z.number().optional(),
    area: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }),
  template_style: z.enum(['warm', 'direct', 'luxury']),
  bullet_1: z.string().min(1),
  bullet_2: z.string().default(''),
  bullet_3: z.string().default(''),
  bullet_4: z.string().optional(),
})

// GET — list campaigns
export async function GET() {
  try {
    const user = await requireAuth()
    const admin = createAdminClient()

    const { data: campaigns, error } = await admin
      .from('mbl_campaigns')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) return apiError('Failed to fetch campaigns', 500)
    return apiSuccess(campaigns)
  } catch {
    return apiError('Unauthorized', 401)
  }
}

// POST — create campaign and run pipeline via SSE
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    const body = await request.json()
    const parsed = campaignCreateSchema.safeParse(body)

    if (!parsed.success) {
      return apiError(parsed.error.errors[0]?.message ?? 'Invalid input', 400)
    }

    const data = parsed.data
    const admin = createAdminClient()

    // Get agent profile
    const { data: agent } = await admin
      .from('mbl_agents')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!agent) {
      return apiError('Please set up your agent profile first', 400)
    }

    // Create campaign record
    const { data: campaign, error: createError } = await admin
      .from('mbl_campaigns')
      .insert({
        user_id: user.id,
        agent_id: agent.id,
        status: 'searching',
        buyer_name: data.buyer_name,
        buyer_description: data.buyer_description,
        criteria_price_min: data.criteria.price_min ?? null,
        criteria_price_max: data.criteria.price_max ?? null,
        criteria_beds_min: data.criteria.beds_min ?? null,
        criteria_baths_min: data.criteria.baths_min ?? null,
        criteria_sqft_min: data.criteria.sqft_min ?? null,
        criteria_sqft_max: data.criteria.sqft_max ?? null,
        criteria_area: data.criteria.area ?? '',
        criteria_city: data.criteria.city ?? '',
        criteria_state: data.criteria.state ?? '',
        criteria_zip: data.criteria.zip ?? '',
        template_style: data.template_style,
        bullet_1: data.bullet_1,
        bullet_2: data.bullet_2,
        bullet_3: data.bullet_3,
        bullet_4: data.bullet_4 ?? null,
      })
      .select()
      .single()

    if (createError || !campaign) {
      return apiError('Failed to create campaign', 500)
    }

    // Return SSE stream for pipeline progress
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
          const properties = await searchProperties(data.criteria)

          if (properties.length === 0) {
            send({ step: 'error', progress: 0, message: 'No properties found', error: 'No properties matched your criteria. Try broadening your search.' })
            controller.close()
            return
          }

          const propertyRows = properties.map(p => mapPropertyToDb(p, campaign.id))
          const { data: insertedProps } = await admin
            .from('mbl_properties')
            .insert(propertyRows)
            .select('id, address_line1, address_line2, city, state, zip, owner_type, estimated_value, years_owned, bedrooms, sqft, neighborhood')

          await admin
            .from('mbl_campaigns')
            .update({ total_properties: properties.length, status: 'skip_tracing' })
            .eq('id', campaign.id)

          send({ step: 'searching', progress: 20, message: `Found ${properties.length} properties`, count: properties.length })

          // Step 2: Skip trace
          send({ step: 'skip_tracing', progress: 25, message: 'Skip tracing owners...' })

          const { bulkSkipTrace } = await import('@/lib/services/reapi')
          const propertyIds = properties.map(p => p.id)
          const skipResults = await bulkSkipTrace(propertyIds)

          let skipTracedCount = 0
          for (const sr of skipResults) {
            const matchingProp = insertedProps?.find(p =>
              properties.find(orig => orig.id === sr.propertyId && orig.address.line1 === p.address_line1)
            )
            if (matchingProp) {
              await admin
                .from('mbl_properties')
                .update({
                  owner_first_name: sr.owner.firstName,
                  owner_last_name: sr.owner.lastName,
                  owner_mailing_address: sr.owner.mailingAddress,
                  owner_phone: sr.owner.phone,
                  owner_email: sr.owner.email,
                  status: 'skip_traced',
                })
                .eq('id', matchingProp.id)
              skipTracedCount++
            }
          }

          await admin
            .from('mbl_campaigns')
            .update({ properties_skip_traced: skipTracedCount, status: 'verifying' })
            .eq('id', campaign.id)

          send({ step: 'skip_tracing', progress: 45, message: `Skip traced ${skipTracedCount} owners`, count: skipTracedCount })

          // Step 3: Verify addresses via Lob
          send({ step: 'verifying', progress: 50, message: 'Verifying addresses...' })

          const { verifyAddress } = await import('@/lib/services/lob')
          const { data: propsToVerify } = await admin
            .from('mbl_properties')
            .select('id, address_line1, address_line2, city, state, zip')
            .eq('campaign_id', campaign.id)
            .eq('status', 'skip_traced')

          let verifiedCount = 0
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

          await admin
            .from('mbl_campaigns')
            .update({ properties_verified: verifiedCount, status: 'generating' })
            .eq('id', campaign.id)

          send({ step: 'verifying', progress: 70, message: `Verified ${verifiedCount} addresses`, count: verifiedCount })

          // Step 4: Generate personalized content via Claude
          send({ step: 'generating', progress: 75, message: 'Personalizing letters with AI...' })

          const { generateLetterContent } = await import('@/lib/services/claude')
          const { data: verifiedProps } = await admin
            .from('mbl_properties')
            .select('*')
            .eq('campaign_id', campaign.id)
            .eq('status', 'verified')

          let generatedCount = 0
          const totalVerified = verifiedProps?.length ?? 0
          for (const prop of verifiedProps ?? []) {
            try {
              const content = await generateLetterContent(
                {
                  owner_first_name: prop.owner_first_name ?? 'Homeowner',
                  owner_last_name: prop.owner_last_name ?? '',
                  owner_type: prop.owner_type ?? 'unknown',
                  address: `${prop.address_line1}, ${prop.city}`,
                  neighborhood: prop.neighborhood,
                  estimated_value: prop.estimated_value,
                  years_owned: prop.years_owned,
                  bedrooms: prop.bedrooms,
                  sqft: prop.sqft,
                },
                {
                  buyer_name: data.buyer_name,
                  bullet_1: data.bullet_1,
                  bullet_2: data.bullet_2,
                  bullet_3: data.bullet_3,
                  template_style: data.template_style,
                }
              )

              await admin
                .from('mbl_properties')
                .update({ personalized_content: content, status: 'generated' })
                .eq('id', prop.id)

              generatedCount++
              send({
                step: 'generating',
                progress: 75 + Math.round((generatedCount / totalVerified) * 20),
                message: `Personalized ${generatedCount} of ${totalVerified} letters`,
                count: generatedCount,
              })
            } catch (err) {
              logger.warn({ propertyId: prop.id, err }, 'Failed to generate letter content')
            }
          }

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
  } catch {
    return apiError('Unauthorized', 401)
  }
}
