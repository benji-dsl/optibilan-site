/**
 * WordPress REST API Client pour Optibilan
 * Récupère les articles depuis un WordPress headless via l'API REST
 * Build-time (SSG) + fallback statique si WP non configuré
 * Supporte ACF, Yoast/RankMath, images responsives, cache dev
 */

interface WPConfig {
  baseUrl: string;
  apiPath?: string;
  timeout?: number;
  perPage?: number;
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
  status: string;
  _embedded?: {
    author?: Array<WPAuthor>;
    'wp:featuredmedia'?: Array<WPMedia>;
    'wp:term'?: Array<Array<WPTerm>>;
    replies?: Array<{ id: number }>;
  };
  acf?: Record<string, unknown>;
  yoast_head_json?: Record<string, unknown>;
  rank_math_title?: string;
  rank_math_description?: string;
  rank_math_focus_keyword?: string;
}

interface WPMedia {
  id: number;
  slug: string;
  source_url: string;
  alt_text: string;
  caption: { rendered: string };
  media_details: {
    width: number;
    height: number;
    file: string;
    sizes?: Record<string, { source_url: string; width: number; height: number }>;
  };
  mime_type: string;
}

interface WPCategory {
  id: number;
  name: string;
  slug: string;
  count: number;
  description: string;
  parent: number;
  _links?: { self: Array<{ href: string }> };
}

interface WPTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  count: number;
  _links?: { self: Array<{ href: string }> };
}

interface WPAuthor {
  id: number;
  name: string;
  slug: string;
  link: string;
  description: string;
  avatar_urls: Record<string, string>;
  acf?: {
    role?: string;
    company?: string;
    twitter?: string;
    linkedin?: string;
  };
}

interface WPConfigResponse {
  name: string;
  description: string;
  url: string;
  home: string;
  gmt_offset: number;
  timezone_string: string;
  namespaces: string[];
  authentication: string[];
  routes: Record<string, unknown>;
}

interface OptibilanArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  categoryLabel: string;
  author: string;
  authorRole?: string;
  authorCompany?: string;
  authorAvatar?: string;
  authorTwitter?: string;
  authorLinkedin?: string;
  date: string;
  modifiedDate?: string;
  readTime: string;
  featured: boolean;
  featuredImage?: string;
  featuredImageAlt?: string;
  featuredImageSizes?: Record<string, { source_url: string; width: number; height: number }>;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  tags?: string[];
  acf?: Record<string, unknown>;
}

interface PaginatedResponse<T> {
  data: T[];
  totalPages: number;
  totalItems: number;
  currentPage: number;
}

const CATEGORY_MAP: Record<string, { label: string; icon: string; color: string }> = {
  coaching: { label: 'Coaching', icon: 'zap', color: 'bleu-signature' },
  sante: { label: 'Santé', icon: 'globe', color: 'bleu-ardoise' },
  business: { label: 'Business', icon: 'chart', color: 'bordeaux' },
};

const ALLOWED_CATEGORIES = new Set(Object.keys(CATEGORY_MAP));

const DEFAULT_PER_PAGE = 100;
const MAX_PAGES = 50;
const DEV_CACHE_TTL = 5 * 60 * 1000; // 5 min

// Cache en mémoire pour le dev (évite de hammer WP à chaque save)
const devCache = new Map<string, { data: unknown; expires: number }>();

function getConfig(): Required<WPConfig> {
  return {
    baseUrl: import.meta.env.WP_BASE_URL || 'https://blog.optibilan.com',
    apiPath: import.meta.env.WP_API_PATH || '/wp-json/wp/v2',
    timeout: Number(import.meta.env.WP_TIMEOUT) || 15000,
    perPage: Number(import.meta.env.WP_PER_PAGE) || DEFAULT_PER_PAGE,
  };
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function getCacheKey(endpoint: string, params: Record<string, string>): string {
  const search = new URLSearchParams(params).toString();
  return `${endpoint}?${search}`;
}

async function fetchWP<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const config = getConfig();
  const cacheKey = getCacheKey(endpoint, params);

  // Cache dev uniquement
  if (import.meta.env.DEV) {
    const cached = devCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      return cached.data as T;
    }
  }

  const url = new URL(`${config.baseUrl}${config.apiPath}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetchWithTimeout(url.toString(), { headers: { 'Accept': 'application/json' } }, config.timeout);

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`WP API ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }

  const data = await res.json() as T;

  // Cache dev
  if (import.meta.env.DEV) {
    devCache.set(cacheKey, { data, expires: Date.now() + DEV_CACHE_TTL });
  }

  return data;
}

/**
 * Récupère les headers de pagination (X-WP-Total, X-WP-TotalPages)
 */
async function fetchWPWithPagination<T>(endpoint: string, params: Record<string, string> = {}): Promise<PaginatedResponse<T>> {
  const config = getConfig();
  const url = new URL(`${config.baseUrl}${config.apiPath}${endpoint}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetchWithTimeout(url.toString(), { headers: { 'Accept': 'application/json' } }, config.timeout);

  if (!res.ok) throw new Error(`WP API ${res.status} ${res.statusText}`);

  const totalPages = Number(res.headers.get('X-WP-TotalPages') || '1');
  const totalItems = Number(res.headers.get('X-WP-Total') || '0');
  const data = await res.json() as T[];

  return {
    data,
    totalPages,
    totalItems,
    currentPage: Number(params.page || '1'),
  };
}

function extractCategory(post: WPPost): string {
  if (post._embedded?.['wp:term']) {
    const terms = post._embedded['wp:term'].flat();
    // Priorité aux catégories mappées
    const mapped = terms.find((t: WPTerm) => t.taxonomy === 'category' && ALLOWED_CATEGORIES.has(t.slug));
    if (mapped) return mapped.slug;
    // Sinon première catégorie trouvée
    const cat = terms.find((t: WPTerm) => t.taxonomy === 'category');
    if (cat) return cat.slug;
  }
  return 'digitalisation';
}

function extractTags(post: WPPost): string[] {
  if (!post._embedded?.['wp:term']) return [];
  return post._embedded['wp:term']
    .flat()
    .filter((t: WPTerm) => t.taxonomy === 'post_tag')
    .map((t: WPTerm) => t.slug);
}

function extractAuthor(post: WPPost): { name: string; role?: string; company?: string; avatar?: string; twitter?: string; linkedin?: string } {
  const author = post._embedded?.author?.[0];
  if (!author) return { name: 'Équipe Optibilan' };

  return {
    name: author.name,
    role: author.acf?.role,
    company: author.acf?.company,
    avatar: author.avatar_urls?.['96'] || author.avatar_urls?.['48'] || author.avatar_urls?.['24'],
    twitter: author.acf?.twitter,
    linkedin: author.acf?.linkedin,
  };
}

function extractFeaturedMedia(post: WPPost): { url?: string; alt?: string; sizes?: Record<string, { source_url: string; width: number; height: number }> } | undefined {
  const media = post._embedded?.['wp:featuredmedia']?.[0];
  if (!media) return undefined;
  return {
    url: media.source_url,
    alt: media.alt_text || media.caption?.rendered?.replace(/<[^>]+>/g, '').trim() || undefined,
    sizes: media.media_details?.sizes,
  };
}

function extractSEO(post: WPPost): { title?: string; description?: string; keywords?: string[] } {
  // Yoast
  if (post.yoast_head_json) {
    const yoast = post.yoast_head_json;
    if (yoast.title) return { title: yoast.title, description: yoast.description, keywords: yoast.keywords ? [yoast.keywords] : undefined };
    if (yoast.og_title) return { title: yoast.og_title, description: yoast.og_description };
    if (yoast.twitter_title) return { title: yoast.twitter_title, description: yoast.twitter_description };
  }
  // Rank Math
  if (post.rank_math_title || post.rank_math_description) {
    return {
      title: post.rank_math_title,
      description: post.rank_math_description,
      keywords: post.rank_math_focus_keyword ? [post.rank_math_focus_keyword] : undefined,
    };
  }
  return {};
}

function calculateReadTime(content: string): string {
  const wordsPerMinute = 200;
  const text = content.replace(/<[^>]+>/g, '').trim();
  const words = text.split(/\s+/).length;
  const minutes = Math.ceil(words / wordsPerMinute);
  return `${minutes} min`;
}

function formatDateFR(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function mapPostToArticle(post: WPPost): OptibilanArticle {
  const category = extractCategory(post);
  const catInfo = CATEGORY_MAP[category] || CATEGORY_MAP.digitalisation;
  const author = extractAuthor(post);
  const media = extractFeaturedMedia(post);
  const seo = extractSEO(post);
  const tags = extractTags(post);

  return {
    slug: post.slug,
    title: post.title.rendered,
    excerpt: post.excerpt.rendered.replace(/<[^>]+>/g, '').trim().slice(0, 300),
    content: post.content.rendered,
    category,
    categoryLabel: CATEGORY_MAP[category]?.label || catInfo.label,
    author: author.name,
    authorRole: author.role,
    authorCompany: author.company,
    authorAvatar: author.avatar,
    authorTwitter: author.twitter,
    authorLinkedin: author.linkedin,
    date: formatDateFR(post.date),
    modifiedDate: post.modified !== post.date ? formatDateFR(post.modified) : undefined,
    readTime: calculateReadTime(post.content.rendered),
    featured: post.acf?.featured === true || post.acf?.a_la_une === true,
    featuredImage: media?.url,
    featuredImageAlt: media?.alt,
    featuredImageSizes: media?.sizes,
    seoTitle: seo.title,
    seoDescription: seo.description,
    seoKeywords: seo.keywords,
    tags,
    acf: post.acf,
  };
}

const STATIC_FALLBACK_ARTICLES: OptibilanArticle[] = [
  {
    slug: 'comment-structurer-ses-bilans',
    title: 'Comment structurer ses bilans hebdo pour gagner 10h/semaine',
    excerpt: 'La méthode exacte pour automatiser le suivi sans perdre la relation client. Template inclus.',
    content: '<p>Contenu complet de l\'article...</p>',
    category: 'coaching',
    categoryLabel: 'Coaching',
    author: 'Marie Dubois',
    authorRole: 'Coach santé & nutrition',
    date: '15 janvier 2024',
    readTime: '8 min',
    featured: true,
  },
  {
    slug: 'cas-client-studio-performance',
    title: 'Cas client : Studio Performance — de 20 à 150 coachés en 8 mois',
    excerpt: 'Comment Thomas a structuré son studio : onboarding staff, automatisation bilans, marque blanche.',
    content: '<p>Contenu complet de l\'article...</p>',
    category: 'business',
    categoryLabel: 'Business',
    author: 'Équipe Optibilan',
    date: '18 décembre 2023',
    readTime: '9 min',
    featured: true,
  },
  {
    slug: 'prepa-mentale-3-exercices',
    title: 'Prépa mentale : 3 exercices qui boostent l\'adhérence à 80%+',
    excerpt: 'Ceux qui ont un suivi mental restent engagés 40% plus longtemps. Les exercices qui marchent.',
    content: '<p>Contenu complet de l\'article...</p>',
    category: 'coaching',
    categoryLabel: 'Coaching',
    author: 'Antoine Moreau',
    authorRole: 'Préparateur mental',
    date: '19 février 2024',
    readTime: '7 min',
    featured: true,
  },
  {
    slug: 'sync-sante-biomarqueurs',
    title: 'Synchroniser Apple Health, Oura et Garmin : guide complet',
    excerpt: 'Config pas à pas via Raccourcis iOS ou n8n. 130+ biomarqueurs auto dans le dossier client.',
    content: '<p>Contenu complet de l\'article...</p>',
    category: 'sante',
    categoryLabel: 'Santé',
    author: 'Dr. Pierre Lambert',
    authorRole: 'Médecin du sport',
    date: '2 janvier 2024',
    readTime: '10 min',
    featured: false,
  },
  {
    slug: 'delegation-equipe-grandir',
    title: 'Déléguer sans perdre la main : faire grandir son équipe',
    excerpt: 'Comment passer de solo à équipe structurée. Process, recrutement, culture. Le retour d\'expérience.',
    content: '<p>Contenu complet de l\'article...</p>',
    category: 'business',
    categoryLabel: 'Business',
    author: 'Thomas Bertrand',
    authorRole: 'Fondateur Studio Performance',
    date: '18 décembre 2023',
    readTime: '9 min',
    featured: true,
  },
];

/**
 * Récupère TOUS les articles publiés (build-time SSG)
 * Pagination automatique via headers X-WP-TotalPages
 */
export async function getAllPosts(): Promise<OptibilanArticle[]> {
  if (!import.meta.env.WP_BASE_URL) {
    console.log('[WP] WP_BASE_URL non configuré, utilisation des données statiques');
    return STATIC_FALLBACK_ARTICLES;
  }

  const allPosts: OptibilanArticle[] = [];
  let page = 1;

  try {
    while (page <= MAX_PAGES) {
      const response = await fetchWPWithPagination<WPPost[]>('/posts', {
        per_page: String(getConfig().perPage),
        page: String(page),
        status: 'publish',
        _embed: 'true',
        orderby: 'date',
        order: 'desc',
      });

      if (!response.data.length) break;
      allPosts.push(...response.data.map(mapPostToArticle));

      if (page >= response.totalPages) break;
      page++;
    }

    return allPosts;
  } catch (error) {
    console.error('[WP] Erreur récupération posts:', error);
    return import.meta.env.WP_BASE_URL ? [] : STATIC_FALLBACK_ARTICLES;
  }
}

/**
 * Récupère un article par slug (avec SEO, ACF, media)
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
 * Récupère les articles par catégorie (avec pagination)
 */
export async function getPostsByCategory(categorySlug: string, page = 1, perPage = 12): Promise<PaginatedResponse<OptibilanArticle>> {
  if (!import.meta.env.WP_BASE_URL) {
    const filtered = STATIC_FALLBACK_ARTICLES.filter(a => a.category === categorySlug);
    return { data: filtered, totalPages: 1, totalItems: filtered.length, currentPage: 1 };
  }

  if (!ALLOWED_CATEGORIES.has(categorySlug)) {
    return { data: [], totalPages: 0, totalItems: 0, currentPage: page };
  }

  try {
    const catRes = await fetchWP<WPCategory[]>('/categories', { slug: categorySlug });
    if (!catRes.length) return { data: [], totalPages: 0, totalItems: 0, currentPage: page };

    const response = await fetchWPWithPagination<WPPost[]>('/posts', {
      categories: String(catRes[0].id),
      per_page: String(perPage),
      page: String(page),
      _embed: 'true',
      status: 'publish',
      orderby: 'date',
      order: 'desc',
    });

    return {
      data: response.data.map(mapPostToArticle),
      totalPages: response.totalPages,
      totalItems: response.totalItems,
      currentPage: page,
    };
  } catch (error) {
    console.error(`[WP] Erreur posts catégorie ${categorySlug}:`, error);
    return { data: [], totalPages: 0, totalItems: 0, currentPage: page };
  }
}

/**
 * Récupère toutes les catégories mappées avec leurs compteurs
 */
export async function getCategories(): Promise<Array<{ slug: string; label: string; icon: string; color: string; count: number }>> {
  if (!import.meta.env.WP_BASE_URL) {
    return Object.entries(CATEGORY_MAP).map(([slug, info]) => ({ slug, ...info, count: 0 }));
  }

  try {
    const wpCats = await fetchWP<WPCategory[]>('/categories', { per_page: '100', hide_empty: 'true' });
    return wpCats
      .filter(c => ALLOWED_CATEGORIES.has(c.slug))
      .map(c => ({ ...CATEGORY_MAP[c.slug], slug: c.slug, count: c.count }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('[WP] Erreur catégories:', error);
    return Object.entries(CATEGORY_MAP).map(([slug, info]) => ({ slug, ...info, count: 0 }));
  }
}

/**
 * Récupère les auteurs (pour page équipe / auteurs)
 */
export async function getAuthors(): Promise<Array<{ id: number; name: string; slug: string; description: string; avatar?: string; role?: string; company?: string; twitter?: string; linkedin?: string; count: number }>> {
  if (!import.meta.env.WP_BASE_URL) return [];

  try {
    const authors = await fetchWP<WPAuthor[]>('/users', { per_page: '50', who: 'authors' });
    return authors
      .filter(a => a.description || a.acf?.role || a.acf?.company)
      .map(a => ({
        id: a.id,
        name: a.name,
        slug: a.slug,
        description: a.description.replace(/<[^>]+>/g, '').trim(),
        avatar: a.avatar_urls?.['96'] || a.avatar_urls?.['48'],
        role: a.acf?.role,
        company: a.acf?.company,
        twitter: a.acf?.twitter,
        linkedin: a.acf?.linkedin,
        count: 0, // faudrait un count posts séparé
      }));
  } catch (error) {
    console.error('[WP] Erreur auteurs:', error);
    return [];
  }
}

/**
 * Récupère les posts récents (pour sidebar, homepage, etc.)
 */
export async function getRecentPosts(limit = 5): Promise<OptibilanArticle[]> {
  if (!import.meta.env.WP_BASE_URL) return STATIC_FALLBACK_ARTICLES.slice(0, limit);

  try {
    const posts = await fetchWP<WPPost[]>('/posts', {
      per_page: String(limit),
      _embed: 'true',
      status: 'publish',
      orderby: 'date',
      order: 'desc',
    });
    return posts.map(mapPostToArticle);
  } catch (error) {
    console.error('[WP] Erreur posts récents:', error);
    return [];
  }
}

/**
 * Recherche d'articles
 */
export async function searchPosts(query: string, page = 1, perPage = 12): Promise<PaginatedResponse<OptibilanArticle>> {
  if (!import.meta.env.WP_BASE_URL) return { data: [], totalPages: 0, totalItems: 0, currentPage: page };

  try {
    const response = await fetchWPWithPagination<WPPost[]>('/posts', {
      search: query,
      per_page: String(perPage),
      page: String(page),
      _embed: 'true',
      status: 'publish',
      orderby: 'relevance',
      order: 'desc',
    });
    return {
      data: response.data.map(mapPostToArticle),
      totalPages: response.totalPages,
      totalItems: response.totalItems,
      currentPage: page,
    };
  } catch (error) {
    console.error(`[WP] Erreur recherche "${query}":`, error);
    return { data: [], totalPages: 0, totalItems: 0, currentPage: page };
  }
}

/**
 * Nettoie le cache dev (utile pour les tests)
 */
export function clearDevCache(): void {
  devCache.clear();
}

export { CATEGORY_MAP, type OptibilanArticle, type WPConfig, type PaginatedResponse };