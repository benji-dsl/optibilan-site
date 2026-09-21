import Stripe from 'stripe';

const PLAN_PRICES = {
  SOLO: { monthly: 49, yearly: 490 },
  STUDIO: { monthly: 149, yearly: 1490 },
  CABINET: { monthly: 349, yearly: 3490 },
};

const VAT_RATES = {
  'FR': 0.20,
  'BE': 0.21,
  'CH': 0.081,
  'LU': 0.17,
  'DE': 0.19,
  'ES': 0.21,
  'IT': 0.22,
  'NL': 0.21,
  'OTHER': 0.20,
  'NON_EU': 0,
};

export async function onRequestPost({ request, env }: { request: Request; env: { STRIPE_SECRET_KEY: string } }) {
  try {
    const body = await request.json();
    const { plan, billing = 'monthly', email, country, vatNumber, firstName, lastName } = body;
    
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
    
    if (!country) {
      return new Response(JSON.stringify({ error: 'Pays requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    if (!firstName || !lastName) {
      return new Response(JSON.stringify({ error: 'Prénom et nom requis' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    const basePrice = PLAN_PRICES[plan as keyof typeof PLAN_PRICES][billing as 'monthly' | 'yearly'];
    const vatRate = VAT_RATES[country] || 0;
    const vatAmount = Math.round(basePrice * vatRate * 100) / 100;
    const totalAmount = basePrice + vatAmount;
    
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    
    // Create or retrieve customer
    let customer;
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length > 0) {
      customer = customers.data[0];
      // Update customer name if needed
      await stripe.customers.update(customer.id, {
        name: `${firstName} ${lastName}`,
      });
    } else {
      customer = await stripe.customers.create({
        email,
        name: `${firstName} ${lastName}`,
        address: { country: country === 'NON_EU' ? 'US' : country },
        tax_exempt: vatNumber ? 'reverse' : 'none',
      });
    }
    
    // Update customer with VAT number if provided
    if (vatNumber) {
      await stripe.customers.update(customer.id, {
        tax_id_data: [{ type: 'eu_vat', value: vatNumber }],
      });
    }
    
    // Create price with tax behavior
    const price = await stripe.prices.create({
      currency: 'eur',
      unit_amount: Math.round(basePrice * 100),
      recurring: {
        interval: billing === 'monthly' ? 'month' : 'year',
      },
      product_data: {
        name: `Optibilan ${plan}`,
        description: `${plan} - ${billing === 'monthly' ? 'Mensuel' : 'Annuel'} - 30 jours gratuits puis facturation automatique`,
        metadata: { plan, billing },
      },
      tax_behavior: 'exclusive',
    });
    
    const taxRates = [];
    if (vatRate > 0) {
      const taxRate = await stripe.taxRates.create({
        display_name: `TVA ${country}`,
        percentage: vatRate * 100,
        inclusive: false,
        jurisdiction: country,
      });
      taxRates.push(taxRate.id);
    }
    
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer.id,
      line_items: [
        {
          price: price.id,
          quantity: 1,
          tax_rates: taxRates,
        },
      ],
      subscription_data: {
        trial_period_days: 30,
        metadata: {
          plan,
          billing,
          country,
          vatNumber: vatNumber || '',
        },
      },
      success_url: `${new URL(request.url).origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${new URL(request.url).origin}/tarifs`,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_email: email,
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: true },
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