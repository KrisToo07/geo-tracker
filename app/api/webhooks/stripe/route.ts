import { NextRequest, NextResponse } from 'next/server'
import { getAdminSupabase } from '@/lib/supabase/route-client'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'

// Map Stripe price IDs → plan names (set these in your env or plans config)
function planFromPriceId(priceId: string | null | undefined): string {
  if (!priceId) return 'free'
  const map: Record<string, string> = {
    [process.env.STRIPE_PRO_PRICE_ID ?? '']: 'pro',
    [process.env.STRIPE_AGENCY_PRICE_ID ?? '']: 'agency',
  }
  return map[priceId] ?? 'pro' // default to pro for unknown paid price
}

async function updateProfilePlan(
  customerId: string,
  plan: string,
  stripeSubscriptionId?: string | null,
) {
  const adminSupabase = getAdminSupabase()
  const updates: Record<string, unknown> = {
    plan,
    stripe_customer_id: customerId,
  }
  if (stripeSubscriptionId !== undefined) {
    updates.stripe_subscription_id = stripeSubscriptionId
  }
  // Reset monthly scan counter when plan changes
  if (plan === 'free') {
    updates.scans_used_this_month = 0
  }

  const { error } = await adminSupabase
    .from('profiles')
    .update(updates)
    .eq('stripe_customer_id', customerId)

  if (error) {
    console.error('[stripe webhook] Failed to update profile plan:', error)
    throw error
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[stripe webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode !== 'subscription') break

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Retrieve subscription to get the price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id
        const plan = planFromPriceId(priceId)

        // If we have a user_id in metadata, also update by user_id
        const userId = session.metadata?.user_id
        if (userId) {
          await getAdminSupabase()
            .from('profiles')
            .update({
              plan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
            })
            .eq('id', userId)
        } else {
          await updateProfilePlan(customerId, plan, subscriptionId)
        }

        console.log(`[stripe webhook] checkout.session.completed → plan=${plan} customer=${customerId}`)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id
        const plan = planFromPriceId(priceId)

        // Handle cancellation at period end
        const effectivePlan =
          subscription.cancel_at_period_end || subscription.status === 'canceled'
            ? 'free'
            : plan

        await updateProfilePlan(customerId, effectivePlan, subscription.id)
        console.log(`[stripe webhook] subscription.updated → plan=${effectivePlan} customer=${customerId}`)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await updateProfilePlan(customerId, 'free', null)
        console.log(`[stripe webhook] subscription.deleted → plan=free customer=${customerId}`)
        break
      }

      default:
        // Unhandled event type — acknowledge receipt
        console.log(`[stripe webhook] Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (err: any) {
    console.error('[stripe webhook] Handler error:', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
