import type { APIRoute } from 'astro';
import Stripe from 'stripe';

const PLAN_PRICES = {
  SOLO: { monthly: 49, yearly: 490 },
  STUDIO: { monthly: 149, yearly: 1490 },
  CABINET: { monthly: 349, yearly: 3490 },
};

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const { plan, billing = 'monthly', email } = body;
    
    if (!plan || !['SOLO', 'STUDIO', 'CABINET'].includes(plan)) {
      return new Response(JSON.stringify({ error: 'Plan invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Email invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const price = PLAN_PRICES[plan as keyof typeof PLAN_PRICES][billing as 'monthly' | 'yearly'];
    const stripe = new Stripe(import.meta.env.STRIPE_SECRET_KEY);
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Optibilan ${plan}`,
              description: `${plan} - ${billing === 'monthly' ? 'Mensuel' : 'Annuel'} - 30 jours gratuits puis facturation automatique`,
            },
            unit_amount: price * 100,
            recurring: {
              interval: billing === 'monthly' ? 'month' : 'year',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          plan,
          billing,
        },
      },
      success_url: `${new URL(request.url).origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/tarifs`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_email: email,
    });
    
    return new Response(JSON.stringify({ 
      sessionId: session.id,
      url: session.url 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(JSON.stringify({ error: 'Erreur lors de la création de la session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};