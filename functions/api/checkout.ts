import Stripe from 'stripe';

interface Env {
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
}

const PLAN_PRICES = {
  SOLO: { monthly: 49, yearly: 490 },
  STUDIO: { monthly: 149, yearly: 1190 },
  CABINET: { monthly: 349, yearly: 3490 },
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { plan, billing = 'monthly' } = body;
    
    if (!plan || !PLAN_PRICES[plan as keyof typeof PLAN_PRICES]) {
      return new Response(JSON.stringify({ error: 'Plan invalide' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const price = PLAN_PRICES[plan as keyof typeof PLAN_PRICES][billing as keyof typeof PLAN_PRICES[typeof plan]];
    
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
      customer_email: body.email,
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