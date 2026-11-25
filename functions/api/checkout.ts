import Stripe from 'stripe';
import { normaliseBetaCode, validateBetaPromotion } from '../../src/lib/beta-promotion.ts';

const PLAN_PRICES = {
  SOLO: { monthly: 49, yearly: 490 },
  STUDIO: { monthly: 99, yearly: 990 },
  CABINET: { monthly: 199, yearly: 1990 },
} as const;

// Identifiants du catalogue OPTIBILAN vérifiés le 25/11/2026.
const LIVE_PRICES: Record<string, string> = {
  SOLO_MONTHLY: 'price_1Ucl1lBfBlqe4vjDmN0QRYq1', SOLO_YEARLY: 'price_1UclAgBfBlqe4vjDr1tAKyCR',
  STUDIO_MONTHLY: 'price_1UclApBfBlqe4vjDHPc6Dylw', STUDIO_YEARLY: 'price_1UclApBfBlqe4vjDpIWXEbn8',
  CABINET_MONTHLY: 'price_1UclAqBfBlqe4vjDpaapXJ0Y', CABINET_YEARLY: 'price_1UclArBfBlqe4vjD9u9djDXr',
};

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

async function digest(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('');
}

async function claimToken(key: string, requestId: string) {
  const signingKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', signingKey, new TextEncoder().encode(`optibilan-checkout:${requestId}`)))].map(x => x.toString(16).padStart(2, '0')).join('');
}

function checkoutResult(subscription: Stripe.Subscription, token: string) {
  const target = new URL('https://app.optibilan.com/inscription');
  target.searchParams.set('subscription', subscription.id);
  target.searchParams.set('token', token);
  const setup = subscription.pending_setup_intent;
  return json({ok:true, subscriptionId:subscription.id, url:target.toString(),
    setupClientSecret: setup && typeof setup !== 'string' && setup.status !== 'succeeded' ? setup.client_secret : null,
    promoCode:subscription.metadata.promoCode || null});
}

async function getOrCreateTaxRate(stripe: Stripe, country: string, rate: number) {
  const displayName = `TVA ${country}`;
  const percentage = Math.round(rate * 10000) / 100;
  for await (const candidate of stripe.taxRates.list({ active: true, limit: 100 })) {
    if (candidate.display_name === displayName && candidate.percentage === percentage && !candidate.inclusive) return candidate;
  }
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
  env: { STRIPE_SECRET_KEY: string; [key: string]: string | undefined };
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
      address?: string;
      paymentMethodId?: string;
      promoCode?: string;
      requestId?: string;
    };

    const plan = (body.plan || '').toUpperCase();
    const billing = (body.billing || 'monthly') as Billing;
    if (!VALID_BILLING.has(billing)) return json({ error: 'Périodicité invalide' }, 400);

    if (!VALID_PLANS.has(plan)) return json({ error: 'Plan invalide' }, 400);
    const email = (body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Email invalide' }, 400);
    const firstName = (body.firstName || '').trim();
    const lastName = (body.lastName || '').trim();
    if (!firstName || !lastName) return json({ error: 'Prénom et nom requis' }, 400);
    const country = (body.country || '').trim();
    if (!Object.hasOwn(VAT_RATES, country)) return json({ error: 'Pays de facturation invalide' }, 400);
    const vatNumber = (body.vatNumber || '').trim();
    const address = (body.address || '').trim();
    const paymentMethodId = (body.paymentMethodId || '').trim();
    if (!paymentMethodId || !paymentMethodId.startsWith('pm_')) {
      return json({ error: 'Carte bancaire invalide' }, 400);
    }

    let promoCode: string;
    try {
      promoCode = normaliseBetaCode(body.promoCode, billing);
    } catch (error) {
      return json({ error: (error as Error).message }, 400);
    }
    if (typeof body.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(body.requestId)) return json({ error: 'Identifiant de tentative manquant. Rechargez la page.' }, 400);
    const token = await claimToken(env.STRIPE_SECRET_KEY, body.requestId);
    const tokenHash = await digest(token);
    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const priceKey = `${plan}_${billing === 'monthly' ? 'MONTHLY' : 'YEARLY'}`;
    const configuredPrice = env[`STRIPE_PRICE_${priceKey}`] || (env.STRIPE_SECRET_KEY.includes('_live_') ? LIVE_PRICES[priceKey] : undefined);
    if (!configuredPrice) return json({error: 'Cette offre est momentanément indisponible.'}, 503);
    const price = await stripe.prices.retrieve(configuredPrice);
    if (!price.active || price.currency !== 'eur' || price.unit_amount !== PLAN_PRICES[plan as Plan][billing]*100 ||
        price.recurring?.interval !== (billing === 'monthly' ? 'month' : 'year') || price.recurring.interval_count !== 1 || !['exclusive', 'unspecified'].includes(price.tax_behavior)) {
      return json({error: 'Cette offre est momentanément indisponible.'}, 503);
    }
    for await (const existing of stripe.customers.list({email, limit:100})) {
      for await (const previous of stripe.subscriptions.list({customer:existing.id, status:'all', limit:100, expand:['data.pending_setup_intent']})) {
        if (previous.metadata.checkoutClaimHash === tokenHash && ['active','trialing'].includes(previous.status)) return checkoutResult(previous, token);
        if (promoCode || !['canceled','incomplete_expired'].includes(previous.status)) return json({error: 'Un abonnement existe déjà pour cette adresse. Connectez-vous ou contactez contact@optibilan.com.'}, 409);
      }
    }
    // Pas d'abonnement neuf pour un compte déjà créé : son offre se gère dans l'app.
    if (env.STRIPE_SECRET_KEY.includes('_live_')) {
      const eligibility = await fetch('https://app.optibilan.com/api/checkout/eligibility', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email}),
        signal:AbortSignal.timeout(10000),
      });
      if (!eligibility.ok) return json({error:'La vérification du compte est indisponible. Réessayez plus tard.'},503);
      if (!(await eligibility.json() as {eligible?:boolean}).eligible) return json({error:'Un espace existe déjà avec cette adresse. Connectez-vous pour gérer votre abonnement.'},409);
    }
    let promotionId: string | undefined;
    if (promoCode) {
      const promotions = await stripe.promotionCodes.list({
        code: promoCode, active: true, limit: 1,
        expand: ['data.promotion.coupon'],
      });
      try {
        validateBetaPromotion(promotions.data[0]);
      } catch (error) {
        return json({ error: (error as Error).message }, 400);
      }
      promotionId = promotions.data[0].id;

    }

    // Même email, même création Stripe, même en cas de soumissions concurrentes.
    const matches = await stripe.customers.list({email, limit:1});
    const customer = matches.data[0] || await stripe.customers.create({email, name:`${firstName} ${lastName}`, address:{line1:address, ...(/^[A-Z]{2}$/.test(country) ? {country} : {})}, metadata:{source:'optibilan-site-checkout'}}, {idempotencyKey:`signup-customer-${await digest(email)}`});
    if (vatNumber) {
      const ids = await stripe.customers.listTaxIds(customer.id, {limit:100});
      if (!ids.data.some(id => id.type === 'eu_vat' && id.value.toUpperCase() === vatNumber.toUpperCase())) {
        await stripe.customers.createTaxId(customer.id, {type:'eu_vat', value:vatNumber});
      }
    }
    // Ne jamais modifier le moyen de paiement par défaut d'un client existant ici.

    const attachedCard = await stripe.paymentMethods.attach(paymentMethodId, { customer: customer.id });

    // Numéro de TVA intracommunautaire valide = autoliquidation, pas de TVA.
    const vatRate = vatNumber ? 0 : VAT_RATES[country] || 0;


    const taxRateId = vatRate > 0 ? (await getOrCreateTaxRate(stripe, country, vatRate)).id : null;

    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [
        {
          price: price.id,
          ...(taxRateId ? { tax_rates: [taxRateId] } : {}),
        },
      ],
      default_payment_method: attachedCard.id,
      ...(promotionId ? { discounts: [{ promotion_code: promotionId }] } : { trial_period_days: TRIAL_DAYS }),
      metadata: {
        plan,
        billing,
        country,
        vatNumber,
        source: 'optibilan-site-checkout',
        checkoutClaimHash: tokenHash,
        ...(promoCode ? { promoCode } : {}),
      },
      proration_behavior: 'none',
      expand: ['pending_setup_intent'],
    }, {idempotencyKey: `signup-subscription-${customer.id}`});

    return checkoutResult(subscription, token);
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return json({ error: 'La confirmation de votre inscription a échoué. Contactez contact@optibilan.com avant de réessayer.' }, 500);
  }
}