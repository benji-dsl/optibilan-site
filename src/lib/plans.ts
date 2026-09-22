export interface PlanDetails {
  name: string;
  tagline: string;
  priceMonthly: number;
  priceYearly: number;
  features: string[];
}

export function getPlanDetails(plan: 'SOLO' | 'STUDIO' | 'CABINET'): PlanDetails {
  switch (plan) {
    case 'SOLO':
      return {
        name: 'Solo',
        tagline: 'Pour les professionnels indépendants',
        priceMonthly: 49,
        priceYearly: 490,
        features: [
          'Jusqu\'à 30 clients',
          '1 accès professionnel',
          'Bilans & progression',
          'Journal & photos',
          'Nutrition & sport',
          'Assistant IA (1 000 messages/mois)',
          'Export des données',
          'Support email',
        ],
      };
    case 'STUDIO':
      return {
        name: 'Studio',
        tagline: 'Petite équipe (2-5)',
        priceMonthly: 149,
        priceYearly: 1490,
        features: [
          'Jusqu\'à 150 clients',
          'Jusqu\'à 5 accès staff',
          'Prépa mentale & santé',
          'Templates nutrition/sport',
          'Assistant IA (5 000 messages/mois)',
          'API REST (120 req/min)',
          'Webhooks + Slack',
          'Marque blanche avancée',
          'Support prioritaire',
        ],
      };
    case 'CABINET':
      return {
        name: 'Cabinet',
        tagline: 'Structure 5+ coachs',
        priceMonthly: 349,
        priceYearly: 3490,
        features: [
          'Clients illimités',
          'Accès staff illimités',
          'Multi-spécialités (coach / mental / diététique)',
          'Assistant IA (20 000 messages/mois)',
          'API sans limite pratique',
          'SSO / SAML (bientôt)',
          'Audit trail complet',
          'SLA & support dédié',
          'Onboarding équipe offert',
        ],
      };
    default:
      throw new Error(`Plan inconnu: ${plan}`);
  }
}

export const PLAN_PRICES = {
  SOLO: { monthly: 49, yearly: 490 },
  STUDIO: { monthly: 149, yearly: 1490 },
  CABINET: { monthly: 349, yearly: 3490 },
} as const;