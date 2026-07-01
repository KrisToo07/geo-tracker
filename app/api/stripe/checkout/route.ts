import { NextRequest, NextResponse } from 'next/server'
import { getRouteSupabase } from '@/lib/supabase/route-client'
import { stripe } from '@/lib/stripe/client'
import { PLANS } from '@/lib/stripe/plans'

// POST /api/stripe/checkout — create a Stripe Checkout session for plan upgrade
export async function POST(req: NextRequest) {
  try {
    const supabase = getRouteSupabase()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    // Accept both `plan` and `planId` for compatibility
    const plan: string = body.plan ?? body.planId

    if (!plan || !['pro', 'agency'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan. Must be "pro" or "agency".' }, { status: 400 })
    }

    const planConfig = PLANS[plan]
    const stripePriceId = planConfig?.priceId

    if (!stripePriceId) {
      return NextResponse.json(
        { error: `No Stripe price configured for plan: ${plan}` },
        { status: 500 },
      )
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, stripe_customer_id, email')
      .eq('id', user.id)
      .single()

    if (profile?.plan === plan) {
      return NextResponse.json({ error: `You are already on the ${plan} plan.` }, { status: 400 })
    }

    let customerId: string | undefined = profile?.stripe_customer_id ?? undefined

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? profile?.email,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', user.id)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?upgrade=success&plan=${plan}`,
      cancel_url: `${appUrl}/dashboard/settings/billing?upgrade=cancelled`,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[POST /api/stripe/checkout]', err)
    return NextResponse.json({ error: err.message ?? 'Internal server error' }, { status: 500 })
  }
}
