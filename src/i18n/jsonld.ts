import { SITE_URL, type Locale, localizePath } from './config';

/**
 * Donnees structurees, une version par langue.
 * Une page anglaise qui declare inLanguage: fr-FR est un signal incoherent :
 * Google rapproche la langue de la page et celle des donnees structurees.
 */

const LOCALE_TAG: Record<Locale, string> = { fr: 'fr-FR', en: 'en-US' };

const ORG_TEXT: Record<Locale, { contact: string[]; region: string[] }> = {
  fr: { contact: ['French', 'English'], region: ['FR'] },
  en: { contact: ['English', 'French'], region: ['FR', 'US'] },
};

const APP_TEXT: Record<
  Locale,
  { description: string; features: string[] }
> = {
  fr: {
    description:
      'SaaS multi-tenant de pilotage des accompagnements pour cabinets, studios et coachs indépendants. Bilans, nutrition, sport, prépa mentale, santé connectée, marque blanche, API, Protection des données, contrôle des accès et traçabilité.',
    features: [
      'Bilans & progression automatisés',
      'Nutrition complète (plans, courses, compléments)',
      'Sport & programmes (bibliothèque 200+ exercices)',
      'Préparation mentale (exercices, ressources, journal)',
      'Santé connectée (Apple Health, Oura, Garmin, 130+ biomarqueurs)',
      'Marque blanche totale + API REST + Webhooks',
      'Protection des données, contrôle des accès et traçabilité, hébergement EU',
    ],
  },
  en: {
    description:
      'Multi-tenant SaaS for running client programs in practices, studios and independent coaching businesses. Check-ins, nutrition, training, mental preparation, connected health, white label, API, data protection, access control and audit trail.',
    features: [
      'Automated check-ins & progress tracking',
      'Full nutrition stack (plans, shopping lists, supplements)',
      'Training & programs (200+ exercise library)',
      'Mental preparation (exercises, resources, journal)',
      'Connected health (Apple Health, Oura, Garmin, 130+ biomarkers)',
      'Full white label + REST API + Webhooks',
      'Data protection, access control and audit trail, EU hosting',
    ],
  },
};

export function organizationJsonLd(locale: Locale) {
  const text = ORG_TEXT[locale];
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: 'Optibilan',
    url: SITE_URL,
    logo: `${SITE_URL}/optibilan-logo.svg`,
    inLanguage: LOCALE_TAG[locale],
    areaServed: text.region,
    sameAs: [
      'https://twitter.com/optibilan',
      'https://linkedin.com/company/optibilan',
      'https://github.com/optibilan',
      'https://youtube.com/@optibilan',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      availableLanguage: text.contact,
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
      addressRegion: 'WY',
      addressLocality: 'Wyoming',
    },
    legalName: 'Elite Longevity LLC',
  };
}

export function websiteJsonLd(locale: Locale) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: 'Optibilan',
    url: SITE_URL,
    inLanguage: LOCALE_TAG[locale],
    publisher: { '@id': `${SITE_URL}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/?s={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function softwareApplicationJsonLd(locale: Locale) {
  const text = APP_TEXT[locale];
  const pricingUrl = `${SITE_URL}${localizePath('/pricing/', locale)}`;
  const offer = (name: string, price: string) => ({
    '@type': 'Offer',
    name,
    price,
    priceCurrency: 'EUR',
    priceSpecification: { '@type': 'UnitPriceSpecification', billingDuration: 'P1M' },
    url: pricingUrl,
    availability: 'https://schema.org/InStock',
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Optibilan',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Cloud / SaaS',
    inLanguage: LOCALE_TAG[locale],
    isAccessibleForFree: false,
    offers: [offer('Solo', '49'), offer('Studio', '149'), offer('Cabinet', '349')],
    description: text.description,
    featureList: text.features,
  };
}
