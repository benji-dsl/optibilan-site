import {
  getAllPosts as getWordPressPosts,
  CATEGORY_MAP,
  PER_PAGE,
  type OptibilanArticle,
} from './wordpress';
import { extraArticles } from '@/data/blog-fr';

/**
 * Blog français = articles WordPress (ou repli statique) + articles écrits dans
 * le dépôt (src/data/blog-fr). Les pages du blog passent par ce module pour que
 * les deux sources se comportent comme une seule liste.
 */

const byDateDesc = (a: OptibilanArticle, b: OptibilanArticle) => b.date.localeCompare(a.date);

export async function getAllPosts(): Promise<OptibilanArticle[]> {
  const wordpressPosts = await getWordPressPosts();
  return [...wordpressPosts, ...extraArticles].sort(byDateDesc);
}

export async function getCategories() {
  const posts = await getAllPosts();
  return Object.entries(CATEGORY_MAP)
    .map(([slug, info]) => ({ slug, ...info, count: posts.filter((p) => p.category === slug).length }))
    .filter((category) => category.count > 0);
}

export async function getPostBySlug(slug: string): Promise<OptibilanArticle | null> {
  const posts = await getAllPosts();
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getPostsByCategory(categorySlug: string): Promise<OptibilanArticle[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => post.category === categorySlug);
}

export { CATEGORY_MAP, PER_PAGE };
export type { OptibilanArticle };
