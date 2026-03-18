import Stripe from 'stripe'
import { env } from '@/lib/env'

let stripeInstance: Stripe | null = null

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(env.stripe.secretKey, {
      typescript: true,
    })
  }
  return stripeInstance
}

export async function createCheckoutSession(params: {
  campaignId: string
  agentId: string
  letterCount: number
  pricePerLetterCents: number
  successUrl: string
  cancelUrl: string
}): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe()
  const totalCents = params.letterCount * params.pricePerLetterCents

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'Magic Buyer Letters',
            description: `${params.letterCount} personalized letters`,
          },
          unit_amount: params.pricePerLetterCents,
        },
        quantity: params.letterCount,
      },
    ],
    metadata: {
      campaign_id: params.campaignId,
      agent_id: params.agentId,
      letter_count: String(params.letterCount),
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  })

  return {
    url: session.url!,
    sessionId: session.id,
  }
}

export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe()
  return stripe.webhooks.constructEvent(
    body,
    signature,
    env.stripe.webhookSecret
  )
}

export async function getSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe()
  return stripe.checkout.sessions.retrieve(sessionId)
}
