import type { Locale } from './config';
import { t } from './ui';

/**
 * Source unique de la navigation.
 * Les drapeaux (desktop / mobile) consomment ces listes : impossible que les deux
 * menus divergent, et changer un libelle ne se fait qu'ici.
 *
 * Les href sont des chemins canoniques FR ; les composants les traduisent avec
 * localizePath(href, locale).
 */

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

export function productGroups(locale: Locale): NavGroup[] {
  const d = t(locale);
  return [
    {
      title: d.nav.groups.discover,
      links: [
        { href: '/product/overview/', label: d.nav.items.overview },
        { href: '/product/crm/', label: d.nav.items.crm },
        { href: '/product/integrations/', label: d.nav.items.integrations },
      ],
    },
    {
      title: d.nav.groups.support,
      links: [
        { href: '/product/check-ins/', label: d.nav.items.checkins },
        { href: '/product/nutrition/', label: d.nav.items.nutrition },
        { href: '/product/training/', label: d.nav.items.training },
        { href: '/product/mental/', label: d.nav.items.mental },
      ],
    },
    {
      title: d.nav.groups.track,
      links: [
        { href: '/product/health/', label: d.nav.items.health },
        { href: '/product/engagement/', label: d.nav.items.engagement },
      ],
    },
    {
      title: d.nav.groups.automate,
      links: [
        { href: '/product/ai/', label: d.nav.items.ai },
        { href: '/product/white-label/', label: d.nav.items.whitelabel },
      ],
    },
  ];
}

export function solutionLinks(locale: Locale): NavLink[] {
  const d = t(locale);
  return [
    { href: '/solutions/coaches/', label: d.nav.solutionsItems.coaches },
    { href: '/solutions/nutrition/', label: d.nav.solutionsItems.nutrition },
    { href: '/solutions/medecin/', label: d.nav.solutionsItems.medecin },
    { href: '/solutions/cabinets/', label: d.nav.solutionsItems.cabinets },
  ];
}

export function mainLinks(locale: Locale): NavLink[] {
  const d = t(locale);
  return [
    { href: '/blog/', label: d.nav.blog },
    { href: '/pricing/', label: d.nav.pricing },
    { href: '/contact/', label: d.nav.contact },
  ];
}
