export const BETA_CODE = 'BETA3MOIS';
export const BETA_COHORT_LIMIT = 20;
// Deux invitations historiques à six mois restent à honorer si elles sont acceptées.
export const BETA_RESERVED_LEGACY_PLACES = 2;
export const BETA_MAX_REDEMPTIONS = BETA_COHORT_LIMIT - BETA_RESERVED_LEGACY_PLACES;

export function normaliseBetaCode(value: unknown, billing: string): string {
  if (value == null || value === '') return '';
  if (typeof value !== 'string') throw new Error('Code promotionnel invalide.');
  const code = value.trim().toUpperCase();
  if (!code) return '';
  if (code !== BETA_CODE) throw new Error('Code promotionnel inconnu.');
  if (billing !== 'monthly') throw new Error('BETA3MOIS est réservé aux abonnements mensuels.');
  return code;
}

export function validateBetaPromotion(promo: any, now = Math.floor(Date.now() / 1000)): void {
  const coupon = promo?.promotion?.coupon;
  if (!promo?.active || promo.code?.toUpperCase() !== BETA_CODE ||
      promo.max_redemptions !== BETA_MAX_REDEMPTIONS ||
      promo.times_redeemed >= BETA_MAX_REDEMPTIONS ||
      (promo.expires_at && promo.expires_at <= now) ||
      !promo.restrictions?.first_time_transaction || promo.customer ||
      !coupon || typeof coupon === 'string' || !coupon.valid ||
      coupon.percent_off !== 100 || coupon.duration !== 'repeating' ||
      coupon.duration_in_months !== 3) {
    throw new Error('Cette offre bêta est indisponible ou complète.');
  }
}
