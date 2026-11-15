import type { OptibilanArticle } from './wordpress';
import { articles } from '@/data/blog-en';

/**
 * Blog anglais : memes getters que src/utils/wordpress.ts, mais sur le jeu
 * d'articles traduits de src/data/blog-en/.
 *
 * Le blog francais reste servi par wordpress.ts (flux WP + repli statique).
 * Les deux blogs partagent les memes slugs et les memes images : seuls les
 * textes changent, donc chaque article FR a exactement une jumelle EN.
 */

export const PER_PAGE_EN = 6;

export const CATEGORY_MAP_EN: Record<string, { label: string; icon: string; color: string }> = {
  coaching: { label: 'Coaching', icon: 'zap', color: 'bleu-signature' },
  sante: { label: 'Health', icon: 'globe', color: 'bleu-ardoise' },
  business: { label: 'Business', icon: 'chart', color: 'bordeaux' },
};

export function getAllPostsEn(): OptibilanArticle[] {
  return [...articles].sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlugEn(slug: string): OptibilanArticle | null {
  return getAllPostsEn().find((post) => post.slug === slug) ?? null;
}

export function getCategoriesEn() {
  return Object.entries(CATEGORY_MAP_EN)
    .map(([slug, info]) => ({
      slug,
      ...info,
      count: articles.filter((article) => article.category === slug).length,
    }))
    .filter((category) => category.count > 0);
}

export function getPostsByCategoryEn(slug: string): OptibilanArticle[] {
  return getAllPostsEn().filter((post) => post.category === slug);
}

export function getRelatedPostsEn(post: OptibilanArticle, limit = 3): OptibilanArticle[] {
  const all = getAllPostsEn().filter((candidate) => candidate.slug !== post.slug);
  return [
    ...all.filter((candidate) => candidate.category === post.category),
    ...all.filter((candidate) => candidate.category !== post.category),
  ].slice(0, limit);
}

/**
 * Toutes les routes du blog anglais, sous leur forme canonique FR (sans /en).
 * Consomme par src/i18n/routes.ts pour que hreflang et bascule de langue
 * suivent automatiquement l'ajout d'un article.
 */
export function blogRoutesEn(): string[] {
  const routes = new Set<string>(['/blog/']);
  const posts = getAllPostsEn();

  for (const post of posts) routes.add(`/blog/${post.slug}/`);

  const totalPages = Math.max(1, Math.ceil(posts.length / PER_PAGE_EN));
  for (let page = 2; page <= totalPages; page += 1) routes.add(`/blog/page/${page}/`);

  for (const category of getCategoriesEn()) {
    routes.add(`/blog/category/${category.slug}/`);
    const categoryPages = Math.max(1, Math.ceil(category.count / PER_PAGE_EN));
    for (let page = 2; page <= categoryPages; page += 1) {
      routes.add(`/blog/category/${category.slug}/page/${page}/`);
    }
  }

  return [...routes];
}
