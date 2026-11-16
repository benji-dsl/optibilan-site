/**
 * Articles français écrits directement dans le dépôt.
 *
 * Le blog français historique vient de WordPress (src/utils/wordpress.ts, avec
 * un repli statique). Les articles produits pour le référencement sont écrits
 * ici, puis fusionnés par src/utils/blog-fr.ts. Chaque article français a sa
 * jumelle anglaise dans src/data/blog-en.
 */
import type { OptibilanArticle } from '@/utils/wordpress';
import { article as logicielToutEnUnCoach } from './logiciel-tout-en-un-coach';
import { article as prixLogicielCoachingSportif } from './prix-logiciel-coaching-sportif';

export const extraArticles: OptibilanArticle[] = [
  logicielToutEnUnCoach,
  prixLogicielCoachingSportif,
];
