// Dimensions réelles des images du site, relevées automatiquement sur les fichiers
// de /public (en-têtes WebP/PNG). Objectif : width/height systématiques sur chaque
// <img> pour éviter tout CLS (Cumulative Layout Shift) et réserver la place avant peinture.

const DIMS: Record<string, [number, number]> = {
  '/images/cabinets/01-studio-performance-realiste.webp': [1000, 750],
  '/images/cabinets/02-cabinet-nutrisante-realiste.webp': [1000, 750],
  '/images/cabinets/03-mental-performance-realiste.webp': [1000, 750],
  '/images/cabinets/04-methode-equilibre-realiste.webp': [1000, 750],
  '/images/product/01-mobile-accueil-programme.webp': [1000, 639],
  '/images/product/02-mobile-nutrition.webp': [1000, 632],
  '/images/product/03-mobile-seance-sport.webp': [1000, 633],
  '/images/product/04-mobile-progression.webp': [1000, 712],
  '/images/product/05-mobile-preparation-mentale.webp': [1000, 683],
  '/images/product/06-praticien-sante-consultation.webp': [1000, 607],
  '/images/product/07-utilisatrice-50ans-lifestyle.webp': [1000, 713],
  '/images/product/08-utilisateur-course-exterieur.webp': [1000, 673],
  '/images/product/09-coach-entretien-client.webp': [1000, 651],
  '/images/product/10-nutritionniste-consultation-sans-ecran.webp': [1000, 378],
  '/images/product/bilans-progression.webp': [575, 273],
  '/images/product/dashboard-coach.webp': [998, 381],
  '/images/product/ia-automatisations.webp': [345, 272],
  '/images/product/interface-client-mobile.webp': [414, 272],
  '/images/product/marque-blanche.webp': [481, 272],
  '/images/product/medecins/01-medecin-generaliste-consultation.webp': [1000, 667],
  '/images/product/medecins/02-medecin-femme-consultation-bilan.webp': [1000, 667],
  '/images/product/medecins/03-medecin-analyse-imagerie-medicale.webp': [1000, 667],
  '/images/product/medecins/04-medecin-femme-analyse-dossier.webp': [1000, 667],
  '/images/product/medecins/05-medecin-homme-consultation-prevention.webp': [1000, 667],
  '/images/product/medecins/06-medecin-consultation-donnees-sante.webp': [1000, 667],
  '/images/product/medecins/07-medecin-homme-consultation-longevite.webp': [1000, 667],
  '/images/product/medecins/08-equipe-medicale-pluridisciplinaire.webp': [1000, 667],
  '/images/product/medecins/09-kinesitherapeute-seance.webp': [1000, 667],
  '/images/product/medecins/10-nutritionniste-consultation.webp': [1000, 667],
  '/images/product/medecins/11-preparateur-mental-entretien.webp': [1000, 667],
  '/images/product/medecins/12-coach-sportif-accompagnement.webp': [1000, 667],
  '/images/product/nutrition-consultation.webp': [667, 381],
  '/images/product/preparation-mentale.webp': [558, 273],
  '/images/product/sante-biomarqueurs.webp': [411, 272],
  '/images/product/sport-programmes.webp': [523, 273],
};

/**
 * Retourne width/height pour une image du site.
 * @returns `{ width, height }`, ou `undefined` si l'image n'est pas dans la table.
 */
export function imageDims(src?: string): { width: number; height: number } | undefined {
  if (!src) return undefined;
  const found = DIMS[src];
  if (!found) return undefined;
  return { width: found[0], height: found[1] };
}

// Avatars et logos sont des SVG : dimensions neutres, le CSS pilote l'affichage.
const SVG_DIMS: Record<string, [number, number]> = {
  '/images/avatars/avatar-placeholder-1.svg': [64, 64],
  '/images/avatars/avatar-placeholder-2.svg': [64, 64],
  '/images/avatars/avatar-placeholder-3.svg': [64, 64],
  '/images/logos/logo-placeholder-1.svg': [64, 64],
  '/images/logos/logo-placeholder-2.svg': [64, 64],
  '/images/logos/logo-placeholder-3.svg': [64, 64],
  '/images/logos/logo-placeholder-4.svg': [64, 64],
};

export function imageDimsAny(src?: string) {
  return imageDims(src) ?? (src && SVG_DIMS[src] ? { width: SVG_DIMS[src][0], height: SVG_DIMS[src][1] } : undefined);
}
