/**
 * Configuration i18n de la vitrine.
 *
 * Le site est statique (Cloudflare Pages). Chaque page existe en deux fichiers :
 *   src/pages/pricing/index.astro      -> https://optibilan.com/pricing/
 *   src/pages/en/pricing/index.astro   -> https://optibilan.com/en/pricing/
 *
 * Les slugs sont identiques dans les deux langues : une seule regle de reecriture,
 * zero redirection a maintenir, et un hreflang qui se deduit du chemin.
 */

export const SITE_URL = 'https://optibilan.com';

export const LOCALES = ['fr', 'en'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'fr';

/** Balise BCP-47 utilisee par <html lang> et les donnees structurees. */
export const HTML_LANG: Record<Locale, string> = { fr: 'fr', en: 'en' };
export const OG_LOCALE: Record<Locale, string> = { fr: 'fr_FR', en: 'en_US' };

export function localeOf(value: string | undefined | null): Locale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}

export function otherLocale(locale: Locale): Locale {
  return locale === 'fr' ? 'en' : 'fr';
}

/**
 * Normalise un chemin interne : toujours un slash au debut, un slash a la fin,
 * et jamais de prefixe de langue. Accepte indifferemment "/pricing", "/pricing/",
 * "/en/pricing/" ou une URL absolue.
 */
export function normalizePath(path: string): string {
  let p = (path || '/').trim();

  // URL absolue -> chemin
  const absolute = p.match(/^https?:\/\/[^/]+(\/.*)?$/i);
  if (absolute) p = absolute[1] || '/';

  // on jette query et ancre
  p = p.split('#')[0].split('?')[0];

  if (!p.startsWith('/')) p = `/${p}`;

  // retire le prefixe de langue pour ne garder que le chemin canonique FR
  if (p === '/en' || p === '/en/') p = '/';
  else if (p.startsWith('/en/')) p = p.slice(3);

  if (!p.startsWith('/')) p = `/${p}`;

  // un fichier (extension) ne prend pas de slash final
  const lastSegment = p.split('/').filter(Boolean).pop() || '';
  if (!p.endsWith('/') && !lastSegment.includes('.')) p += '/';

  return p;
}

/** Chemin canonique d'une page dans une langue donnee. */
export function localizePath(path: string, locale: Locale): string {
  // Liens externes, ancres et protocoles (mailto:, tel:, https:) : jamais prefixes.
  if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(path.trim())) return path;

  const p = normalizePath(path);
  if (locale === DEFAULT_LOCALE) return p;
  return p === '/' ? `/${locale}/` : `/${locale}${p}`;
}

/** URL absolue d'une page dans une langue donnee. */
export function absoluteUrl(path: string, locale: Locale): string {
  return `${SITE_URL}${localizePath(path, locale)}`;
}
