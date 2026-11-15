/**
 * Articles anglais du blog.
 *
 * Chaque fichier est la traduction d'un article de STATIC_FALLBACK_ARTICLES
 * (src/utils/wordpress.ts). L'ordre d'import n'a pas d'importance : le tri se
 * fait par date dans src/utils/blog-en.ts.
 */
import type { OptibilanArticle } from '@/utils/wordpress';
import { article as commentStructurerSesBilans } from './comment-structurer-ses-bilans';
import { article as prepaMentale3Exercices } from './prepa-mentale-3-exercices';
import { article as syncSanteBiomarqueurs } from './sync-sante-biomarqueurs';
import { article as casClientStudioPerformance } from './cas-client-studio-performance';
import { article as delegationEquipeGrandir } from './delegation-equipe-grandir';
import { article as marqueBlancheCoachingStudio } from './marque-blanche-coaching-studio';
import { article as fideliserClientsCoachingRetention } from './fideliser-clients-coaching-retention';
import { article as questionnaireLancementClientCoaching } from './questionnaire-lancement-client-coaching';
import { article as fixerTarifsCoachingSportif } from './fixer-tarifs-coaching-sportif';
import { article as perteDePoidsDurableEviterYoyo } from './perte-de-poids-durable-eviter-yoyo';

export const articles: OptibilanArticle[] = [
  commentStructurerSesBilans,
  prepaMentale3Exercices,
  syncSanteBiomarqueurs,
  casClientStudioPerformance,
  delegationEquipeGrandir,
  marqueBlancheCoachingStudio,
  fideliserClientsCoachingRetention,
  questionnaireLancementClientCoaching,
  fixerTarifsCoachingSportif,
  perteDePoidsDurableEviterYoyo,
];
