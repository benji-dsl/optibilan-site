import Stripe from 'stripe';

const PLAN_PRICES = {
  SOLO: { monthly: 49, yearly: 490 },
  STUDIO: { monthly: 149, yearly: 1490 },
  CABINET: { monthly: 349, yearly: 3490 },
} as const;

const VAT_RATES: Record<string, number> = {
  FR: 0.2,
  BE: 0.21,
  CH: 0.081,
  LU: 0.17,
  DE: 0.19,
  ES: 0.21,
  IT: 0.22,
  NL: 0.21,
  OTHER: 0.2,
  NON_EU: 0,
};

const TRIAL_DAYS = 30;

type Plan = keyof typeof PLAN_PRICES;
type Billing = 'monthly' | 'yearly';

const VALID_PLANS = new Set(['SOLO', 'STUDIO', 'CABINET']);
const VALID_BILLING = new Set(['monthly', 'yearly']);

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function getOrCreateCustomer(stripe: Stripe, args: {
  email: string;
  firstName: string;
  lastName: string;
  country: string;
  vatNumber: string;
}) {
  const customers = await stripe.customers.list({ email: args.email, limit: 1 });
  const name = `${args.firstName} ${args.lastName}`;
  const country = args.country === 'NON_EU' ? 'US' : args.country;

  let customer: Stripe.Customer;
  if (customers.data.length > 0) {
    customer = customers.data[0];
    customer = await stripe.customers.update(customer.id, {
      name,
      address: customer.address ? { ...customer.address, country } : { country },
    });
  } else {
    customer = await stripe.customers.create({
      email: args.email,
      name,
      address: { country },
    });
  }

  if (args.vatNumber) {
    const existing = await stripe.customers.listTaxIds(customer.id, { limit: 1 });
    const already = existing.data.some(
      (id) => id.type === 'eu_vat' && (id.value || '').toUpperCase() === args.vatNumber.toUpperCase()
    );
    if (!already) {
      await stripe.customers.createTaxId(customer.id, { type: 'eu_vat', value: args.vatNumber });
    }
  }

  return customer;
}

async function getOrCreateProduct(stripe: Stripe, productName: string) {
  const matches = await stripe.products.search({
    query: `active:'true' AND name:\"${productName}\"`,
    limit: 1,
  });
  if (matches.data.length > 0) return matches.data[0];
  return stripe.products.create({ name: productName, metadata: { source: 'optibilan-site-checkout' } });
}

async function getOrCreatePrice(
  stripe: Stripe,
  productId: string,
  basePrice: number,
  billing: Billing
) {
  const amount = Math.round(basePrice * 100);
  const matches = await stripe.prices.search({
    query: `product:\"${productId}\" AND active:'true' AND currency:'eur' AND recurring.interval:'${billing}' AND unit_amount:${amount}`,
    limit: 1,
  });
  if (matches.data.length > 0) return matches.data[0];
  return stripe.prices.create({
    currency: 'eur',
    unit_amount: amount,
    recurring: { interval: billing === 'monthly' ? 'month' : 'year' },
    product: productId,
    tax_behavior: 'exclusive',
    metadata: { billing },
  });
}

async function getOrCreateTaxRate(stripe: Stripe, country: string, rate: number) {
  const displayName = `TVA ${country}`;
  const matches = await stripe.taxRates.search({
    query: `active:'true' AND display_name:\"${displayName}\"`,
    limit: 1,
  });
  if (matches.data.length > 0) return matches.data[0];
  return stripe.taxRates.create({
    display_name: displayName,
    percentage: Math.round(rate * 10000) / 100,
    inclusive: false,
    jurisdiction: country,
    metadata: { source: 'optibilan-site-checkout' },
  });
}

export async function onRequestPost({
  request,
  env,
}: {
  request: Request;
  env: { STRIPE_SECRET_KEY: string };
}) {
  try {
    const body = (await request.json()) as {
      plan?: string;
      billing?: string;
      email?: string;
      firstName?: string;
      lastName?: string;
      country?: string;
      vatNumber?: string;
      paymentMethodId?: string;
    };

    const plan = (body.plan || '').toUpperCase();
    const billing = (body.billing === 'yearly' ? 'yearly' : 'monthly') as Billing;

    if (!VALID_PLANS.has(plan)) return json({ error: 'Plan invalide' }, 400);
    const email = (body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Email invalide' }, 400);
    const firstName = (body.firstName || '').trim();
    const lastName = (body.lastName || '').trim();
    if (!firstName || !lastName) return json({ error: 'Prénom et nom requis' }, 400);
    const country = (body.country || '').trim();
    if (!country) return json({ error: 'Pays de facturation requis' }, 400);
    const vatNumber = (body.vatNumber || '').trim();
    const paymentMethodId = (body.paymentMethodId || '').trim();
    if (!paymentMethodId || !paymentMethodId.startsWith('pm_')) {
      return json({ error: 'Carte bancaire invalide' }, 400);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);

    const customer = await getOrCreateCustomer(stripe, {
      email,
      firstName,
      lastName,
      country,
      vatNumber,
    });

    await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    // Numéro de TVA intracommunautaire valide = autoliquidation, pas de TVA.
    const vatRate = vatNumber ? 0 : VAT_RATES[country] || 0;
    const basePrice = PLAN_PRICES[plan as Plan][billing];

    const product = await getOrCreateProduct(stripe, `Optibilan ${plan}`);
    const price = await getOrCreatePrice(stripe, product.id, basePrice, billing);

    const taxRateId = vatRate > 0 ? (await getOrCreateTaxRate(stripe, country, vatRate)).id : null;

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: price.id,
          ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
        },
      ],
      default_payment_method: paymentMethodId,
      trial_period_days: TRIAL_DAYS,
      metadata: {
        plan,
        billing,
        country,
        vatNumber,
        source: 'optibilan-site-checkout',
      },
      proration_behavior: 'none',
    });

    const url = new URL(request.url);
    const successUrl = `${url.origin}/checkout/success?plan=${plan.toLowerCase()}&billing=${billing}`;

    return json({ ok: true, subscriptionId: subscription.id, url: successUrl });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return json({ error: 'Le paiement a échoué. Votre carte n\'a pas été débitée.' }, 500);
  }
}