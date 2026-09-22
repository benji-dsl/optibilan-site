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

export async function onRequestGet({ env }: { env: { STRIPE_PUBLISHABLE_KEY?: string } }) {
  const publishableKey = env.STRIPE_PUBLISHABLE_KEY || '';
  return new Response(
    JSON.stringify({ publishableKey, vatRates: VAT_RATES }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
}