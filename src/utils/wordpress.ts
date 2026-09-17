/**
 * WordPress REST API Client pour Optibilan
 * Récupère les articles depuis un WordPress headless via l'API REST
 * Build-time (SSG) + fallback statique si WP non configuré
 */

interface WPConfig {
  baseUrl: string;
  apiPath?: string;
  timeout?: number;
}

interface WPPost {
  id: number;
  slug: string;
  title: { rendered: string };
  excerpt: { rendered: string };
  content: { rendered: string };
  date: string;
  modified: string;
  author: number;
  categories: number[];
  tags: number[];
  featured_media: number;
  _embedded?: {
    author?: Array<{ id: number; name: string; link: string; avatar_urls?: Record<string, string> }>;
    'wp:featuredmedia'?: Array<{ source_url: string; alt_text: string }>;
    'wp:term'?: Array<Array<{ id: number; name: string; slug: string }>>;
  };
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description: string;
}

interface WPAuthor {
  id: number;
  name: string;
  slug: string;
  link: string;
  description: string;
  avatar_urls: Record<string, string>;
}

interface OptibilanArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  categoryLabel: string;
  author: string;
  authorAvatar?: string;
  date: string;
  readTime: string;
  featured: boolean;
  featuredImage?: string;
}

const DEFAULT_CONFIG: WPConfig = {
  baseUrl: import.meta.env.WP_BASE_URL || 'https://blog.optibilan.com',
  apiPath: '/wp-json/wp/v2',
  timeout: 10000,
};

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  digitalisation: { label: 'Digitalisation des cabinets', icon: 'chart', color: 'bleu-signature' },
  performance: { label: 'Optimisation de la performance', icon: 'zap', color: 'bleu-lecture' },
  business: { label: 'Business & Croissance', icon: 'users', color: 'bordeaux' },
  'sante-connectee': { label: 'Santé connectée', icon: 'globe', color: 'bleu-ardoise' },
  mental: { label: 'Préparation mentale', icon: 'brain', color: 'indigo' },
  nutrition: { label: 'Nutrition & coaching', icon: 'document', color: 'bleu-clair' },
};

function getConfig(): WPConfig {
  return {
    baseUrl: import.meta.env.WP_BASE_URL || 'https://blog.optibilan.com',
    apiPath: import.meta.env.WP_API_PATH || '/wp-json/wp/v2',
    timeout: Number(import.meta.env.WP_TIMEOUT) || 10000,
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 10000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

async function fetchWP<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const config = getConfig();
  const url = new URL(`${config.baseUrl}${config.apiPath}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  
  const res = await fetchWithTimeout(url.toString(), { headers: { 'Accept': 'application/json' } }, config.timeout);
  
  if (!res.ok) throw new Error(`WP API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

function extractCategory(post: WPPost): string {
  if (post._embedded?.['wp:term']) {
    const cats = post._embedded['wp:term'].flat();
    const mapped = cats.find(c => CATEGORY_MAP[c.slug]);
    if (mapped) return mapped.slug;
    if (cats.length) return cats[0].slug;
  }
  return 'digitalisation';
}

function extractAuthor(post: WPPost): string {
  if (post._embedded?.author?.[0]?.name) return post._embedded.author[0].name;
  return 'Équipe Optibilan';
}

function extractAuthorAvatar(post: WPPost): string | undefined {
  return post._embedded?.author?.[0]?.avatar_urls?.['96'] || post._embedded?.author?.[0]?.avatar_urls?.['48'];
}

function extractFeaturedImage(post: WPPost): string | undefined {
  return post._embedded?.['wp:featuredmedia']?.[0]?.source_url;
}

function calculateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]+>/g, '').trim();
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min`;
}

function mapPostToArticle(post: WPPost): OptibilanArticle {
  const category = extractCategory(post);
  const catInfo = CATEGORY_MAP[category] || CATEGORY_MAP.digitalisation;
  
  return {
    slug: post.slug,
    title: post.title.rendered,
    excerpt: post.excerpt.rendered.replace(/<[^>]+>/g, '').trim(),
    content: post.content.rendered,
    category,
    categoryLabel: catInfo.label,
    author: extractAuthor(post),
    authorAvatar: extractAuthorAvatar(post),
    date: new Date(post.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
    readTime: calculateReadTime(post.content.rendered),
    featured: false,
    featuredImage: extractFeaturedImage(post),
  };
}

/**
 * Récupère tous les articles publiés (build-time SSG)
 * Pagination automatique via headers Link
 */

/**
 * Données de fallback statique pour le blog (utilisées si WP non configuré)
 */
const STATIC_FALLBACK_ARTICLES: OptibilanArticle[] = [
  {
    slug: 'bilans-hebdo-automatises',
    title: 'Comment automatiser vos bilans hebdo et gagner 10h par semaine',
    excerpt: 'Découvrez comment les cabinets qui utilisent les bilans guidés Optibilan réduisent leur temps administratif de 75% tout en améliorant la qualité du suivi.',
    content: '<p>Contenu complet de l\'article...</p>',
    category: 'digitalisation',
    categoryLabel: 'Digitalisation des cabinets',
    author: 'Marie Dubois',
    date: '15 janvier 2024',
    readTime: '8 min',
    featured: true,
  },
  {
    slug: 'cas-client-studio-performance',
    title: 'Cas client : Studio Performance Bordeaux — de 20 à 150 coachés en 8 mois',
    excerpt: 'Comment Thomas Bertrand a structuré son studio avec Optibilan : onboarding staff, automatisation bilans, marque blanche.',
    content: '<p>Contenu complet de l\'article...</p>',
    category: 'business',
    categoryLabel: 'Business & Croissance',
    author: 'Équipe Optibilan',
    date: '18 décembre 2023',
    readTime: '9 min',
    featured: true,
  },
];

export async function getAllPosts(): Promise<OptibilanArticle[]> {
  if (!import.meta.env.WP_BASE_URL) { console.log("[WP] WP_BASE_URL non configuré, utilisation des données statiques"); return STATIC_FALLBACK_ARTICLES; }

  const allPosts: WPPost[] = [];
  let page = 1;
  const perPage = 100;

  try {
    while (true) {
      const posts = await fetchWP<WPPost[]>('/posts', {
        per_page: String(perPage),
        page: String(page),
        status: 'publish',
        _embed: 'true',
        orderby: 'date',
        order: 'desc',
      });

      if (!posts.length) break;
      allPosts.push(...posts);

      if (posts.length < perPage) break;
      page++;
      
      if (page > 50) break; // Safety limit
    }

    return allPosts.map(mapPostToArticle);
  } catch (error) {
    console.error('[WP] Erreur récupération posts:', error);
    return [];
  }
}

/**
 * Récupère un article par slug
 */
export async function getPostBySlug(slug: string): Promise<OptibilanArticle | null> {
  if (!import.meta.env.WP_BASE_URL) return null;

  try {
    const posts = await fetchWP<WPPost[]>('/posts', {
      slug,
      _embed: 'true',
      status: 'publish',
    });

    if (!posts.length) return null;
    return mapPostToArticle(posts[0]);
  } catch (error) {
    console.error(`[WP] Erreur récupération post ${slug}:`, error);
    return null;
  }
}

/**
 * Récupère les articles par catégorie
 */
export async function getPostsByCategory(categorySlug: string): Promise<OptibilanArticle[]> {
  if (!import.meta.env.WP_BASE_URL) return [];

  try {
    const category = await fetchWP<WPCategory[]>('/categories', { slug: categorySlug });
    if (!category.length) return [];

    const posts = await fetchWP<WPPost[]>('/posts', {
      categories: String(category[0].id),
      per_page: '20',
      _embed: 'true',
      status: 'publish',
      orderby: 'date',
      order: 'desc',
    });

    return posts.map(mapPostToArticle);
  } catch (error) {
    console.error(`[WP] Erreur posts catégorie ${categorySlug}:`, error);
    return [];
  }
}

/**
 * Récupère toutes les catégories
 */
export async function getCategories(): Promise<Array<{ slug: string; label: string; icon: string; color: string; count: number }>> {
  if (!import.meta.env.WP_BASE_URL) {
    return Object.entries(CATEGORY_MAP).map(([slug, info]) => ({ slug, ...info, count: 0 }));
  }

  try {
    const wpCats = await fetchWP<WPCategory[]>('/categories', { per_page: '50', hide_empty: 'true' });
    return wpCats
      .filter(c => CATEGORY_MAP[c.slug])
      .map(c => ({ ...CATEGORY_MAP[c.slug], slug: c.slug, count: c.count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[WP] Erreur catégories:', error);
    return Object.entries(CATEGORY_MAP).map(([slug, info]) => ({ slug, ...info, count: 0 }));
  }
}

export { CATEGORY_MAP, type OptibilanArticle, type WPConfig };