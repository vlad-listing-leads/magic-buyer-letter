import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getSession } from '@/lib/services/stripe'
import { createLetter } from '@/lib/services/lob'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  const sessionId = request.nextUrl.searchParams.get('session_id')

  if (!sessionId) {
    return NextResponse.redirect(new URL(`/campaigns/${id}`, request.url))
  }

  const admin = createAdminClient()

  try {
    // Verify Stripe payment
    const session = await getSession(sessionId)
    if (session.payment_status !== 'paid') {
      return NextResponse.redirect(new URL(`/campaigns/${id}?error=payment_failed`, request.url))
    }

    // Update campaign payment status
    await admin
      .from('mbl_campaigns')
      .update({ stripe_payment_status: 'paid', status: 'sending' })
      .eq('id', id)

    // Get campaign and agent
    const { data: campaign } = await admin
      .from('mbl_campaigns')
      .select('*, mbl_agents(*)')
      .eq('id', id)
      .single()

    if (!campaign) {
      return NextResponse.redirect(new URL(`/campaigns/${id}?error=not_found`, request.url))
    }

    const agent = (campaign as Record<string, unknown>).mbl_agents as Record<string, string>

    // Get selected, generated properties
    const { data: properties } = await admin
      .from('mbl_properties')
      .select('*')
      .eq('campaign_id', id)
      .eq('selected', true)
      .eq('status', 'generated')

    // Send letters via Lob
    let sentCount = 0
    for (const prop of properties ?? []) {
      try {
        const personalized = prop.personalized_content as Record<string, string> | null

        const mergeVars: Record<string, string> = {
          property_address: `${prop.address_line1}, ${prop.city}`,
          neighborhood: prop.neighborhood || prop.city,
          buyer_name: campaign.buyer_name,
          bullet_1: personalized?.bullet_1 || campaign.bullet_1,
          bullet_2: personalized?.bullet_2 || campaign.bullet_2,
          bullet_3: personalized?.bullet_3 || campaign.bullet_3,
          agent_name: agent.name,
          agent_brokerage: agent.brokerage || '',
          agent_phone: agent.phone || '',
          agent_website: agent.website || '',
          agent_headshot_url: agent.headshot_url || '',
          agent_logo_url: agent.logo_url || '',
          agent_initials: agent.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '',
          agent_address_line1: agent.address_line1 || '',
          agent_city: agent.city || '',
          agent_state: agent.state || '',
          agent_zip: agent.zip || '',
        }

        const letter = await createLetter({
          to: {
            name: `${prop.owner_first_name || ''} ${prop.owner_last_name || ''}`.trim() || 'Current Resident',
            address_line1: prop.address_line1,
            address_line2: prop.address_line2 || undefined,
            address_city: prop.city,
            address_state: prop.state,
            address_zip: prop.zip,
          },
          from: agent.lob_address_id,
          template_id: env.lob.templateId,
          merge_variables: mergeVars,
          metadata: {
            campaign_id: id,
            property_id: prop.id,
          },
        })

        await admin
          .from('mbl_properties')
          .update({
            lob_letter_id: letter.id,
            lob_url: letter.url,
            expected_delivery: letter.expected_delivery_date,
            status: 'sent',
            delivery_status: 'in_transit',
          })
          .eq('id', prop.id)

        sentCount++

        // Throttle between sends
        await new Promise(resolve => setTimeout(resolve, 50))
      } catch (err) {
        logger.error({ propertyId: prop.id, err }, 'Failed to send letter')
        await admin
          .from('mbl_properties')
          .update({ status: 'send_failed' })
          .eq('id', prop.id)
      }
    }

    // Update campaign aggregates
    await admin
      .from('mbl_campaigns')
      .update({
        properties_sent: sentCount,
        status: 'sent',
      })
      .eq('id', id)

    return NextResponse.redirect(new URL(`/new?step=confirmation&campaign_id=${id}&sent=${sentCount}`, request.url))
  } catch (err) {
    logger.error({ campaignId: id, err }, 'Send confirmation error')
    return NextResponse.redirect(new URL(`/campaigns/${id}?error=send_failed`, request.url))
  }
}
