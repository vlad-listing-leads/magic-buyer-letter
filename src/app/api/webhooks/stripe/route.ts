import { NextRequest, NextResponse } from 'next/server'
import { verifyWebhookSignature } from '@/lib/services/stripe'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature') ?? ''

  try {
    const event = await verifyWebhookSignature(body, signature)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        const campaignId = session.metadata?.campaign_id
        if (campaignId) {
          logger.info({ campaignId, sessionId: session.id }, 'Stripe checkout completed')
          // Payment confirmation is handled by the redirect to send-confirmed
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    logger.error({ err }, 'Stripe webhook error')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
}
