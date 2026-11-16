/**
 * Identifiants de mesure.
 *
 * L'identifiant GA4 n'est pas un secret : il est visible dans le code source de
 * toutes les pages qui l'utilisent. Il est ecrit ici pour que le site fonctionne
 * sans dependre d'une variable d'environnement Cloudflare, et pour qu'un clone du
 * depot produise exactement le meme site.
 *
 * `PUBLIC_GA4_ID` reste prioritaire si elle est definie (utile pour tester avec
 * une autre propriete, ou pour couper la mesure sans toucher au code en la
 * definissant a `off`).
 */
export const GA4_MEASUREMENT_ID = 'G-CJDPMV3JHX';

/** Identifiant effectivement utilise, ou chaine vide si la mesure est coupee. */
export function resolveGa4Id(envValue: string | undefined): string {
  const value = (envValue ?? GA4_MEASUREMENT_ID).trim();
  if (!value || value.toLowerCase() === 'off') return '';
  return value;
}
