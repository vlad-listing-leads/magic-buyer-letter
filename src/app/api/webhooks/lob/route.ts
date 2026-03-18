import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { env } from '@/lib/env'
import crypto from 'crypto'

const LOB_EVENT_MAP: Record<string, string> = {
  'letter.created': 'pending',
  'letter.rendered_pdf': 'pending',
  'letter.rendered_thumbnails': 'pending',
  'letter.deleted': 'cancelled',
  'letter.delivered': 'delivered',
  'letter.in_transit': 'in_transit',
  'letter.in_local_area': 'in_local_area',
  'letter.processed_for_delivery': 'processed_for_delivery',
  'letter.re-routed': 're_routed',
  'letter.returned_to_sender': 'returned',
}

function verifyWebhookSignature(body: string, signature: string): boolean {
  if (!env.lob.webhookSecret) return false
  const expected = crypto
    .createHmac('sha256', env.lob.webhookSecret)
    .update(body)
    .digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('lob-signature') ?? ''

  // Verify signature if secret is configured
  if (env.lob.webhookSecret && !verifyWebhookSignature(body, signature)) {
    logger.warn('Invalid Lob webhook signature')
    return NextResponse.json({ received: true }, { status: 200 })
  }

  try {
    const event = JSON.parse(body)
    const eventType = event.event_type?.id ?? ''
    const letterId = event.body?.id ?? ''

    if (!letterId || !eventType) {
      return NextResponse.json({ received: true })
    }

    const deliveryStatus = LOB_EVENT_MAP[eventType]
    if (!deliveryStatus) {
      return NextResponse.json({ received: true })
    }

    const admin = createAdminClient()

    // Find property by lob_letter_id
    const { data: property } = await admin
      .from('mbl_properties')
      .select('id, campaign_id, delivery_events')
      .eq('lob_letter_id', letterId)
      .maybeSingle()

    if (!property) {
      return NextResponse.json({ received: true })
    }

    // Append delivery event
    const events = Array.isArray(property.delivery_events) ? property.delivery_events : []
    events.push({
      type: eventType,
      date: new Date().toISOString(),
      location: event.body?.tracking_events?.[0]?.location ?? null,
    })

    // Update property
    const propertyStatus = deliveryStatus === 'delivered' ? 'delivered'
      : deliveryStatus === 'returned' ? 'returned'
      : deliveryStatus === 'cancelled' ? 'cancelled'
      : 'sent'

    await admin
      .from('mbl_properties')
      .update({
        delivery_status: deliveryStatus,
        delivery_events: events,
        status: propertyStatus,
      })
      .eq('id', property.id)

    // Recount campaign aggregates
    const { data: counts } = await admin
      .from('mbl_properties')
      .select('status')
      .eq('campaign_id', property.campaign_id)

    if (counts) {
      const delivered = counts.filter(c => c.status === 'delivered').length
      const returned = counts.filter(c => c.status === 'returned').length

      await admin
        .from('mbl_campaigns')
        .update({
          properties_delivered: delivered,
          properties_returned: returned,
          status: delivered + returned === counts.length ? 'delivered' : 'sent',
        })
        .eq('id', property.campaign_id)
    }
  } catch (err) {
    logger.error({ err }, 'Lob webhook processing error')
  }

  // Always return 200
  return NextResponse.json({ received: true })
}
