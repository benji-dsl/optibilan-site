import { blogRoutesEn } from '@/utils/blog-en';

/**
 * Chemins qui existent en anglais (forme canonique FR, sans prefixe).
 *
 * Sert de source de verite a trois endroits :
 *   1. Layout  -> n'emet hreflang="en" que si la page existe vraiment (pas de soft 404)
 *   2. Switcher -> cache/desactive la bascule quand la traduction n'existe pas
 *   3. scripts/check-i18n.mjs -> verifie que la liste et le dossier dist/en concordent
 *
 * Ajouter une page anglaise = creer le fichier dans src/pages/en/ ET l'ajouter ici.
 * Le blog fait exception : ses routes sont calculees depuis src/data/blog-en.
 */
export const EN_ROUTES: string[] = [
  '/',
  '/pricing/',
  '/contact/',
  '/newsletter/',
  '/security/',
  '/docs/',
  '/solutions/',
  '/solutions/coaches/',
  '/solutions/nutrition/',
  '/solutions/medecin/',
  '/solutions/cabinets/',
  '/product/overview/',
  '/product/check-ins/',
  '/product/nutrition/',
  '/product/training/',
  '/product/mental/',
  '/product/health/',
  '/product/engagement/',
  '/product/ai/',
  '/product/white-label/',
  '/product/crm/',
  '/product/integrations/',
  '/product/admin/',
  '/product/agenda/',
  '/legal/mentions/',
  '/legal/confidentialite/',
  '/legal/cookies/',
  '/legal/sous-traitance/',
  '/legal/cgv/',
  '/checkout/solo/',
  '/checkout/studio/',
  '/checkout/cabinet/',
  // Le blog anglais : une route par article, par page de pagination et par categorie.
  ...blogRoutesEn(),
];

const EN_ROUTE_SET = new Set(EN_ROUTES.map((route) => route.replace(/\/?$/, '/')));

export function hasEnglishVersion(path: string): boolean {
  return EN_ROUTE_SET.has(path);
}
