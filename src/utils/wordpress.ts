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
  faq?: Array<{ q: string; a: string }>;
  sources?: Array<{ label: string; url: string }>;
  noTable?: boolean;
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

// Cache en mémoire pour le build (une seule requête WP par clé, mutualisée
// entre getStaticPaths et le rendu de chaque page)
const buildCache = new Map<string, Promise<unknown>>();

function memoized<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const hit = buildCache.get(key);
  if (hit) return hit as Promise<T>;

  const promise = fn().catch(error => {
    buildCache.delete(key);
    throw error;
  });
  buildCache.set(key, promise);
  return promise;
}

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
  return 'coaching';
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

function mapPostToArticle(post: WPPost): OptibilanArticle {
  const category = extractCategory(post);
  const catInfo = CATEGORY_MAP[category] ?? CATEGORY_MAP.coaching;
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
    categoryLabel: catInfo.label,
    author: author.name,
    authorRole: author.role,
    authorCompany: author.company,
    authorAvatar: author.avatar,
    authorTwitter: author.twitter,
    authorLinkedin: author.linkedin,
    date: post.date,
    modifiedDate: post.modified !== post.date ? post.modified : undefined,
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
    content: `<p>Le bilan hebdomadaire est le cœur de votre accompagnement. C'est lui qui crée le rituel, maintient la motivation et transforme un simple suivi en vrai coaching. Encore faut-il que la préparation ne vous prenne pas plus de temps que la séance elle-même.</p>
<h2>Pourquoi le bilan hebdo consomme autant de temps</h2>
<p>La plupart des coaches passent leur dimanche soir à reconstruire à la main ce qu'ils savent déjà : les dernières mesures, les objectifs, l'historique des séances. Chaque client demande une collecte, un tri, une mise en forme. Multiplié par trente à cinquante clients, cela représente facilement dix heures par semaine de travail purement administratif.</p>
<p>Le paradoxe : ce temps n'apporte aucune valeur ajoutée. Le client ne lit pas votre classement préféré de tableurs. Il lit son ressenti, sa progression, et le plan de la semaine à venir.</p>
<h2>Ce que contient un bilan qui fait avancer</h2>
<p>Un bilan efficace tient sur une page et répond à trois questions :</p>
<ul>
<li><strong>Où en est le client ?</strong> Les indicateurs du suivi en cours (poids, fréquence sport, sommeil, humeur, adhérence aux objectifs).</li>
<li><strong>Ce qui a fonctionné cette semaine.</strong> Une à deux victoires concrètes à mettre au crédit du client, même sur les semaines difficiles.</li>
<li><strong>Le focus de la semaine suivante.</strong> Un seul objectif prioritaire, pas cinq. C'est la friction d'un objectif sur-ambitieux qui fait décrocher.</li>
</ul>
<p>Si votre bilan ne couvre pas ces trois points, il est soit trop long, soit trop générique.</p>
<h2>La méthode pour automatiser sans déshumaniser</h2>
<p>L'idée n'est pas de remplacer le regard humain, mais de déplacer le travail. Concrètement :</p>
<ol>
<li><strong>Centraliser les données.</strong> Les mesures entrent automatiquement dans le dossier client (appareils connectés, questionnaires, saisie du client). Plus jamais de copier-coller de flux.</li>
<li><strong>Pré-remplir le bilan avec les données de la semaine.</strong> Le coach lit les tendances au lieu de les recalculer.</li>
<li><strong>Ajouter le commentaire personnel.</strong> C'est la seule partie réellement écrite, et c'est elle qui fait la différence.</li>
</ol>
<p>Dans Optibilan, cette mécanique est intégrée : le bilan hebdomadaire se prépare en quelques minutes parce que les données du client sont déjà là, assemblées et comparées à l'historique.</p>
<h2>Le piège des solutions « tout automatique »</h2>
<p>L'automatisation totale sans intervention humaine produit des bilans froids que les clients ignorent. Un bilan qui ne mentionne jamais l'humain qui les suit perd son effet en trois semaines. La bonne répartition est de l'ordre de 80 % de données structurées et 20 % de message personnalisé.</p>
<p>Votre valeur de coach n'est pas de compiler des chiffres. Elle est d'interpréter ces chiffres et de décider quoi faire ensuite.</p>
<h2>L'impact mesurable</h2>
<p>Nos utilisateurs qui automatisent la préparation de leurs bilans retrouvent en moyenne huit à dix heures par semaine. Ce temps est réinvesti dans la seule chose qui compte pour leur croissance : de nouvelles prises en charge et la qualité du message envoyé à chaque client.</p>
<p>Le bilan n'est pas une formalité administrative. C'est le rendez-vous de confiance le plus régulier que vous ayez avec votre client. Traitez-le comme tel, et préparez-le comme un pro.</p>`,
    category: 'coaching',
    categoryLabel: 'Coaching',
    author: 'Marie Dubois',
    authorRole: 'Coach santé & nutrition',
    date: '2024-01-15',
    readTime: '8 min',
    featured: true,
  },
  {
    slug: 'cas-client-studio-performance',
    title: 'Cas client : Studio Performance — de 20 à 150 coachés en 8 mois',
    excerpt: 'Comment Thomas a structuré son studio : onboarding staff, automatisation bilans, marque blanche.',
    content: `<p>Quand on passe de vingt à cent cinquante coachés en huit mois, tout change : les séances, l'organisation interne, et surtout la préparation du travail de chaque coach. C'est l'histoire de Thomas, fondateur de Studio Performance, un studio de coaching santé à Nice.</p>
<h2>Le point de départ : tout reposait sur le fondateur</h2>
<p>En début de croissance, Studio Performance fonctionnait sur un modèle artisanal. Chaque nouveau client était suivi directement par Thomas, les notes tenaient dans des tableurs, et la qualité dépendait de son propre état de forme. Le studio atteignait la vingtaine de coachés quand le plafond de verre est apparu : impossible d'embaucher sans casser la qualité, impossible de grandir sans process.</p>
<h2>Décision 1 : standardiser l'arrivée des clients</h2>
<p>La première brique a été l'onboarding. Un nouveau coaché devait livrer ses antécédents, ses objectifs et ses mesures une seule fois, dans un format structuré. Fini les questionnaires imprimés ou les échanges de messages désordonnés. Chaque client arrive aujourd'hui avec un dossier complet, consultable par toute l'équipe et par le client lui-même.</p>
<p>Le résultat a été immédiat : les premières séances ont gagné une heure de contexte, et les coachs arrivent préparés au lieu de découvrir leur client en séance.</p>
<h2>Décision 2 : automatiser la partie répétitive des bilans</h2>
<p>Le quotidien du studio produisait des dizaines de bilans par semaine. Thomas a automatisé l'assemblage des données : mesures, progression, historique, tout est pré-rempli. Chaque coach n'écrit plus que la partie interprétation et plan d'action.</p>
<p>Au-delà du temps gagné, l'effet a été sur la qualité. Un coach fatigué qui compilait des chiffres à 22h faisait des erreurs. Désormais, les données sont fiables et l'attention humaine va à ce qui compte.</p>
<h2>Décision 3 : la marque blanche pour recruter des coachs</h2>
<p>Pour attirer de bons profils, Thomas a équipé son studio d'un suivi qui porte la marque Studio Performance. Les coachs n'ont pas à imposer leur propre outil : ils retrouvent un environnement propre, aux couleurs du studio, avec des bilans qui valorisent le travail de l'équipe auprès des clients.</p>
<p>C'est aussi ce qui a permis d'intégrer rapidement de nouveaux coachs. Un nouvel arrivant opère le même outil que les autres dès le premier jour, sans période d'apprentissage ni méthodes divergentes.</p>
<h2>Ce qui a vraiment fait basculer la croissance</h2>
<p>La croissance n'est pas venue d'un droit d'entrée marketing, mais de la capacité à répéter une qualité constante. Chaque nouveau coaché connaît le même suivi, la même structure de bilan, la même exigence de mesure. Quand un coaché recommande le studio, il recommande une expérience précise, pas une zone de confort variable.</p>
<p>Entre janvier et la rentrée, le studio est passé de vingt à cent cinquante coachés. Le nombre de coachs a suivi, et la qualité perçue s'est stabilisée au lieu de s'effondrer.</p>
<h2>Les trois leçons à retenir</h2>
<ul>
<li><strong>L'onboarding d'abord.</strong> Sans dossier structuré à l'entrée, aucune automatisation ne tient ensuite.</li>
<li><strong>Automatiser la routine, pas la relation.</strong> Les données se préparent toutes seules, le message reste humain.</li>
<li><strong>La marque blanche structure l'équipe.</strong> Un outil aux couleurs du studio aligne les discours et facilite l'intégration des recrues.</li>
</ul>
<p>Le cas de Studio Performance montre qu'on peut croître vite sans sacrifier la qualité, à condition de poser les bons process avant que la charge ne vous rattrape.</p>`,
    category: 'business',
    categoryLabel: 'Business',
    author: 'Équipe Optibilan',
    date: '2023-12-18',
    readTime: '9 min',
    featured: true,
  },
  {
    slug: 'prepa-mentale-3-exercices',
    title: 'Prépa mentale : 3 exercices qui boostent l\'adhérence à 80%+',
    excerpt: 'Ceux qui ont un suivi mental restent engagés 40% plus longtemps. Les exercices qui marchent.',
    content: `<p>En préparation mentale, l'adhérence est le critère numéro un. Un programme brillant que le client arrête à la troisième semaine ne vaut rien. Les données de nos coachés le confirment : ceux qui suivent un protocole de préparation mentale restent engagés en moyenne 40 % plus longtemps que les autres.</p>
<p>Voici trois exercices simples dont l'effet sur la constance est démontré par les retours terrains.</p>
<h2>Exercice 1 : le relevé de 90 secondes chaque matin</h2>
<p>Le principe : chaque matin, avant toute notification ou message, le client note en trois lignes son intention du jour et son niveau d'énergie prévu (1 à 5). L'exercice dure quatre-vingt-dix secondes, pas une minute de plus.</p>
<p>Pourquoi ça marche : il abaisse la barrière d'entrée à un niveau trivial. L'effet de simple exposition se met en place : le client « rencontre » son objectif avant que la journée ne décide à sa place. Le relevé crée aussi une donnée exploitable en bilan, ce qui renforce la boucle de suivi.</p>
<h2>Exercice 2 : la séquence de stabilisation avant l'effort</h2>
<p>Avant chaque séance de sport, entraînement ou épreuve, le client enchaîne une séquence courte de stabilisation : respiration sur quatre temps, activation musculaire lente, visualisation du début de séance pendant trente secondes. La séquence complète ne dépasse pas cinq minutes.</p>
<p>L'intérêt n'est pas physiologique, il est comportemental. La séquence fonctionne comme un déclencheur : le client n'a plus à se persuader de commencer, il s'engage automatiquement dès qu'il lance son protocole. C'est la forme d'implémentation la plus robuste pour les habitudes d'effort.</p>
<h2>Exercice 3 : le bilan de deux minutes en fin de semaine</h2>
<p>Le dimanche soir, le client passe deux minutes sur trois questions : qu'avez-vous fait cette semaine ? Qu'est-ce qui vous a freiné ? Que faites-vous en priorité la semaine prochaine ? Le résultat est envoyé au coach pour préparer le bilan hebdo.</p>
<p>Ce micro-bilan oblige le client à fermer la boucle de la semaine et transforme les échecs isolés en données de progression. Un client qui voit sur six semaines sa constance monter de 50 % à 80 % n'a plus besoin qu'on le motive : il se motive seul sur des preuves.</p>
<h2>Pourquoi l'adhérence dépasse 80 % chez ceux qui tiennent</h2>
<p>Les trois exercices partagent une logique commune : des micro-actions régulières, mesurables, et reliées à un feedback. Aucun ne demande une volonté spectaculaire. L'adhérence n'est pas une affaire de caractère, c'est une affaire de design : on ne décroche plus parce qu'on a une décision lourde à prendre à chaque fois.</p>
<p>Dans Optibilan, les réponses du relevé matinal et du micro-bilan viennent alimenter directement la fiche du client. Le coach voit les tendances d'adhérence plutôt que des impressions, et ajuste le protocole avant que le client ne décroche.</p>
<h2>Comment démarrer dès cette semaine</h2>
<p>N'introduisez pas les trois exercices d'un coup. Commencez par le relevé de 90 secondes pendant deux semaines, ajoutez ensuite seulement la séquence de stabilisation, puis le micro-bilan. Le tout doit tenir dans dix minutes par jour, jamais plus.</p>
<p>La préparation mentale n'a pas besoin d'être spectaculaire pour produire des résultats. Elle a besoin d'être présente, régulière, et visible dans la relation de suivi.</p>`,
    category: 'coaching',
    categoryLabel: 'Coaching',
    author: 'Antoine Moreau',
    authorRole: 'Préparateur mental',
    date: '2024-02-19',
    readTime: '7 min',
    featured: true,
  },
  {
    slug: 'sync-sante-biomarqueurs',
    title: 'Synchroniser Apple Health, Oura et Garmin : guide complet',
    excerpt: 'Config pas à pas via Raccourcis iOS ou n8n. 130+ biomarqueurs auto dans le dossier client.',
    content: `<p>Quand on coaché, la donnée de santé la plus utile est celle qui arrive sans friction. Les bagues Oura, montres Garmin et iPhones produisent déjà des centaines de biomarqueurs : sommeil, HRV, fréquence cardiaque de repos, activité, température. Le problème n'est pas de les collecter, c'est de les faire atterrir dans le dossier client sans saisie manuelle.</p>
<h2>Ce que vous récupérez réellement</h2>
<p>En pratique, trois familles de données méritent d'être suivies :</p>
<ul>
<li><strong>Le sommeil</strong> : durée, phases, régularité des horaires. C'est le premier indicateur qui bouge quand le client va mieux.</li>
<li><strong>La récupération</strong> : HRV et fréquence cardiaque de repos, qui renseignent l'état du système nerveux.</li>
<li><strong>L'activité</strong> : pas, séances, charge d'entraînement. Utile en complément de vos propres mesures de séance.</li>
</ul>
<p>Inutile de tout récupérer : choisissez les huit à douze indicateurs qui parlent à votre protocole, pas les cent trente disponibles.</p>
<h2>Solution 1 : les Raccourcis iOS</h2>
<p>Si votre client a un iPhone et une montre connectée, les Raccourcis iOS permettent d'extraire les valeurs des appareils et de les envoyer automatiquement. Le raccourci se déclenche à heure fixe, lit les mesures de la nuit, et envoie le tout vers votre collecte.</p>
<p>C'est la solution la plus simple à mettre en place pour un petit volume de clients, sans dépendre d'un service externe.</p>
<h2>Solution 2 : n8n pour tout centraliser</h2>
<p>Pour un volume plus important, n8n joue le rôle de chef d'orchestre. Chaque matin, un workflow interroge les API des appareils, normalise les données et les inscrit dans le dossier client. Le tout fonctionne sans maintenance manuelle, et une erreur d'appareil ne bloque pas les autres sources.</p>
<p>La normalisation est le point clé : une heure de sommeil doit s'écrire de la même façon qu'elle vienne d'Oura, de Garmin ou d'Apple Health, sinon les tendances à long terme deviennent illisibles.</p>
<h2>L'approche Optibilan : 130+ biomarqueurs dans le dossier</h2>
<p>Dans Optibilan, la synchronisation est une fonctionnalité intégrée. Les données des appareils connectés alimentent directement la fiche client, au même endroit que vos mesures de séance et les questionnaires. Le coach consulte un historique unifié plutôt que des exports éparpillés.</p>
<p>Le client gagne en autonomie : il ne remplit plus de cases chaque semaine pour des données que sa montre mesure déjà. Vous gagnez en fiabilité : plus de valeurs recopiées de travers.</p>
<h2>Erreurs à éviter au démarrage</h2>
<ul>
<li><strong>Vouloir tout récupérer</strong>. L'abondance de graphes n'impressionne personne si personne ne les lit.</li>
<li><strong>Ignorer la fiabilité de la source</strong>. Mieux vaut une mesure stable et imparfaite que deux sources qui se contredisent.</li>
<li><strong>Oublier le consentement</strong>. Le partage des données de santé impose des règles claires et l'accord explicite du client.</li>
</ul>
<p>La synchro des biomarqueurs n'est pas un gadget. C'est la fin de la saisie manuelle, la fin des oublis le dimanche soir, et des bilans bâtis sur des faits plutôt que sur des souvenirs.</p>`,
    category: 'sante',
    categoryLabel: 'Santé',
    author: 'Dr. Pierre Lambert',
    authorRole: 'Médecin du sport',
    date: '2024-01-02',
    readTime: '10 min',
    featured: false,
  },
  {
    slug: 'delegation-equipe-grandir',
    title: 'Déléguer sans perdre la main : faire grandir son équipe',
    excerpt: 'Comment passer de solo à équipe structurée. Process, recrutement, culture. Le retour d\'expérience.',
    content: `<p>Passer de coach solo à studio structuré, c'est accepter un deuil : celui de tout faire soi-même. C'est aussi la décision qui conditionne la suite de la croissance. Voici la méthode qui nous revient le plus souvent dans les retours d'ateliers.</p>
<h2>Le vrai problème de la délégation</h2>
<p>Le frein n'est pas de trouver des bras. C'est la peur diffuse que la qualité dérape et que la relation client en pâtisse. Tant que cette peur n'est pas traitée par des outils, la délégation échoue, non pas faute de compétences, mais faute de cadre.</p>
<p>Concrètement, déléguer sans process revient à confier son carnet d'adresses à quelqu'un avec des Post-it. Le nouveau coach improvise, les clients sentent la différence, et on revient en arrière.</p>
<h2>Cadrer l'onboarding et le suivi avant de recruter</h2>
<p>Avant d'embaucher, chaque activité récurrente doit avoir une procédure écrite : comment un client entre dans le studio, comment se prépare un bilan, comment sont gérées les mesures, où vit l'historique. Si ces procédures n'existent pas, le recrutement aggrave le chaos au lieu de le réduire.</p>
<p>C'est ici que le logiciel de coaching rend service : un dossier client unique, une structure de bilan identique pour toute l'équipe, des données centralisées. Le nouvel arrivant ne réinvente rien, il applique un standard.</p>
<h2>Recruter sur la méthode, pas seulement sur le charisme</h2>
<p>Un bon coach de studio, c'est d'abord quelqu'un qui respecte votre cadre de suivi. Le charisme motive en séance, mais c'est la constance du suivi qui fait revenir les clients. Posez des questions concrètes en entretien : « Montrez-moi comment vous préparez un bilan » renseigne mieux que « Parlez-moi de votre philosophie ».</p>
<p>Intégrez aussi la culture d'équipe : le client ne doit jamais subir les différences de méthodes entre coachs, sinon il croit que le studio est incohérent.</p>
<h2>La boucle de contrôle sans micro-management</h2>
<p>Une fois l'équipe en place, contrôlez par l'outil, pas par la présence. Les bilans remontent dans le même format, les indicateurs d'adhérence sont visibles, les décrochages deviennent détectables avant la résiliation. Le fondateur ne lit pas chaque dossier, il a des alertes.</p>
<p>C'est la différence entre superviser et surveiller : on regarde les exceptions, pas chaque geste.</p>
<h2>Les pièges qui font rentrer les studios en solo</h2>
<ul>
<li><strong>Déléguer sans standard</strong> : chaque coach fait son propre format, l'identité du studio s'efface.</li>
<li><strong>Recruter quand on est en surcharge</strong> : on intègre en catastrophe et on transmet une pile, pas une méthode.</li>
<li><strong>Arrêter le suivi de la qualité</strong> : sans indicateurs partagés, la dégradation se voit trop tard.</li>
</ul>
<p>Grandir ne demande pas d'abandonner le contrôle, mais de déplacer ce contrôle vers des standards et des données que toute l'équipe partage.</p>
<h2>Ce que ça change au quotidien</h2>
<p>Structuré, le studio peut accueillir plus de clients sans que le fondateur devienne le goulot d'étranglement. Les séances, les bilans et le suivi tournent sur le même système, et la marque du studio devient la garantie d'un accompagnement constant.</p>
<p>La délégation réussie ne se mesure pas au nombre de coachs embauchés, mais au fait que vous ne soyez plus indispensable à chaque dossier.</p>`,
    category: 'business',
    categoryLabel: 'Business',
    author: 'Thomas Bertrand',
    authorRole: 'Fondateur Studio Performance',
    date: '2023-12-18',
    readTime: '9 min',
    featured: true,
  },
  {
    slug: 'marque-blanche-coaching-studio',
    title: 'Marque blanche coaching : lancer votre studio sans tout créer',
    excerpt: 'Lancer son studio de coaching en marque blanche : identité cohérente, accès coachs, portail client. Ce qu\'il faut couvrir et les pièges à éviter.',
    content: `<p>Lancer un studio est un marathon de tâches invisibles : créer un nom, décliner une identité, construire le suivi, embaucher. Peut-on garder la force d'une marque propre sans repartir de zéro ? C'est exactement l'objet de la marque blanche : vos couleurs, votre nom, votre identité, posés sur un socle déjà éprouvé. Voici ce qu'il faut savoir avant de vous lancer.</p>
<h2>Ce qu'est la marque blanche, ce qu'elle n'est pas</h2>
<p>La marque blanche consiste à faire fonctionner une offre sous votre nom et votre identité visuelle, alors que la réalisation s'appuie sur un outil partagé. Ce n'est pas une imitation, c'est une synthèse : vous conservez l'essentiel, votre relation et votre discours, et vous déléguez la mécanique, le développement logiciel, la maintenance.</p>
<p>Prenons un exemple concret. Un studio de coaching santé qui affiche son propre nom et délivre à ses clients des bilans aux couleurs de sa marque utilise la marque blanche, sans que son client s'en aperçoive. Et c'est précisément le but : l'outil disparaît derrière la promesse de la marque.</p>
<h2>Pourquoi c'est pertinent pour un studio de coaching</h2>
<p>Trois raisons poussent les studios vers cette voie.</p>
<p><strong>La cohérence d'abord.</strong> Chaque document envoyé, bilan, contrat, plan, porte la même identité, et la promesse de la marque ne se fragmente pas entre des outils disparates.</p>
<p><strong>L'indépendance ensuite.</strong> Votre marque vit séparément du fournisseur qui la porte. Cette séparation vous permet de changer de socle technique sans perdre dix ans de communication et de relation client.</p>
<p><strong>La rapidité enfin.</strong> Pas de développement sur mesure à piloter, la mise en route se compte en jours, pas en mois. Le temps gagné est investi là où il compte, dans l'accompagnement des clients.</p>
<h2>Ce que doit couvrir votre marque blanche</h2>
<p>Tout ce qui touche le client doit porter votre identité, et tout ce qui concerne l'équipe doit rester simple à piloter. Concrètement :</p>
<ul>
<li>Les bilans et les comptes-rendus, rendus au format de votre marque.</li>
<li>Le dossier client, consultable par le client lui-même à vos couleurs.</li>
<li>Les questionnaires et les documents de lancement.</li>
<li>Les accès coachs, avec des rôles et des droits par intervenant.</li>
<li>Les rappels et les communications automatiques, envoyés à votre nom.</li>
</ul>
<p>Un bon test : demandez-vous si un client, en consultant son espace, peut deviner le nom du fournisseur. Si c'est le cas, la marque blanche n'est pas assez complète.</p>
<h2>Marque blanche et recrutement de coachs</h2>
<p>La marque blanche est aussi un argument d'équipe. Un nouveau coach intègre un environnement clair, aux couleurs du studio, avec les mêmes trames que ses collègues. Il n'importe pas ses propres méthodes au détriment de la cohérence : l'identité du studio traverse chaque intervention.</p>
<p>C'est le point qui transforme le recrutement : on n'embauche plus des solistes qui reconstruisent chacun leur format, on intègre des membres d'une équipe qui partagent le même standard de suivi.</p>
<h2>Les pièges à éviter</h2>
<p>Trois erreurs font perdre le bénéfice de la marque blanche.</p>
<ul>
<li><strong>Une marque blanche purement cosmétique.</strong> Un logo collé sur un outil sans prise en main réelle donne une illusion qui s'effondre à la première anomalie.</li>
<li><strong>Confondre marque blanche et dépendance.</strong> Avant de signer, vérifiez que vous pouvez exporter vos données et repartir avec votre historique si le fournisseur disparaît.</li>
<li><strong>Négliger le support.</strong> Vos coachs ne doivent jamais rester bloqués devant un problème technique sans aucun interlocuteur.</li>
</ul>
<h2>Un levier commercial trop souvent ignoré</h2>
<p>La marque blanche ne sert pas seulement à l'interne. C'est aussi un argument commercial concret face à des partenaires et des prescripteurs.</p>
<p><strong>Les cabinets et les prescripteurs.</strong> Un cabinet médical ou paramédical qui vous adresse ses patients préfère recevoir des comptes-rendus au nom de votre studio, lisibles et alignés sur vos trames, plutôt qu'un écran d'outil tiers. La marque blanche matérialise votre professionnalisme aux yeux de ceux qui vous recommandent.</p>
<p><strong>Les organismes et les entreprises.</strong> Quand vous intervenez auprès d'une entreprise, d'une mutuelle ou d'un organisme sportif, présenter une offre à votre nom, avec vos bilans et votre portail, fait passer l'image d'un prestataire occasionnel à celle d'un partenaire structuré. L'argument de la cohérence porte d'autant plus que le client connaît déjà les codes de votre marque.</p>
<p><strong>La recommandation interne.</strong> Un client content qui parle de « mon espace » et montre ses bilans à un ami raconte l'expérience de votre marque, pas celle d'un outil qu'il aurait pu ouvrir seul. La marque blanche fait de votre suivi le réceptacle fidèle de la confiance, et c'est cette confiance qui se propage.</p>
<p>En clair : plus votre signature est visible à chaque point de contact, plus votre nom raconte l'histoire des résultats. C'est de la valeur permanente qui s'accumule sans rien vous coûter à la production.</p>
<h2>Se lancer sans tout réinventer</h2>
<p>Vous n'avez pas besoin d'une équipe de développement pour commencer. Faites le bilan de vos besoins : accès coachs, bilans aux couleurs du studio, identité sur chaque document, portail client. Évaluez ensuite ce que chaque outil vous prête en personnalisation et ce qu'il vous laisse libre de faire.</p>
<p>Le socle Optibilan porte par exemple <a href="/product/white-label/">une offre marque blanche</a> pensée pour les studios : vos couleurs, vos coachs, vos trames, votre portail. Démarrez avec ce dont vous avez besoin, puis ajoutez le reste au fil des mois, lorsque l'équipe et les clients le réclament.</p>
<h2>Un accélérateur, pas une fin en soi</h2>
<p>La marque blanche n'est pas une destination, c'est un accélérateur. Elle vous rend la cohérence visible dès le premier jour et vous libère pour la vraie construction, celle de votre relation avec les clients. Le parcours type d'un studio qui a franchi ce cap est documenté dans <a href="/blog/cas-client-studio-performance/">le cas Studio Performance</a>, passé de 20 à 150 coachés en huit mois. Et pour faire grandir l'équipe sans perdre la main, prolongez avec <a href="/blog/delegation-equipe-grandir/">notre méthode de délégation</a>.</p>`,
    category: 'business',
    categoryLabel: 'Business',
    author: 'Thomas Bertrand',
    authorRole: 'Fondateur Studio Performance',
    date: '2026-09-21',
    readTime: '6 min',
    featured: false,
    seoTitle: 'Marque blanche coaching : lancer votre studio sans tout créer',
    seoDescription: 'Lancez votre studio de coaching en marque blanche : identité cohérente, accès coachs, portail client. Ce que doit couvrir l\'offre et les pièges à éviter.',
    seoKeywords: ['marque blanche coaching', 'studio de coaching', 'portail client coach'],
    tags: ['marque-blanche', 'studio', 'equipe', 'portail-client'],
  },
  {
    slug: 'fideliser-clients-coaching-retention',
    title: 'Fidéliser ses clients coach : la rétention se joue avant la résiliation',
    excerpt: 'La rétention se joue avant la résiliation : signaux d\'alerte, bilan hebdo, autonomie. Les leviers pour garder vos clients.',
    content: `<p>La plupart des coachs dépensent une énergie considérable à chercher de nouveaux clients, et bien peu à retenir ceux qu'ils ont déjà. C'est l'erreur de coût la plus chère du métier : un client qui reste six mois de plus vaut plusieurs acquisitions, sans aucune dépense de prospection. La rétention n'est pas une qualité innée, c'est un système. Voici comment le construire avant que les premiers décrochages se déclarent.</p>
<h2>Comprendre pourquoi un client part vraiment</h2>
<p>Les raisons affichées ne sont pas les raisons réelles. On entend souvent « manque de temps » ou « questions financières ». Le plus souvent, le client part parce que la progression n'est plus visible, parce qu'il ne perçoit plus la valeur du suivi, ou parce que la routine a transformé les séances en rendez-vous sans cap.</p>
<p>Identifier ces trois motifs change votre vigilance : vous ne cherchez plus des excuses, vous cherchez des signaux. Un client qui sait pourquoi il est là et où il va ne s'en va pas par ennui.</p>
<h2>Détecter les signaux avant la résiliation</h2>
<p>Le décrochage ne survient pas d'un coup. Il s'annonce par des micro-signaux : des bilans complétés avec retard, des rendez-vous décalés, des mensurations absentes, des messages sans réponse. Leur point commun est simple, moins de données à l'arrivée veut dire moins d'engagement.</p>
<p>Si vous regardez la tendance plutôt que chaque incident isolé, vous repérez le décrochage deux à quatre semaines à l'avance. Un tableau de bord qui suit l'adhérence par client change votre angle d'action : au lieu de réagir à une résiliation, vous rappelez un client en difficulté plus tôt, avec des arguments fondés sur les données, pas sur une intuition.</p>
<h2>Le bilan hebdomadaire, outil de fidélisation</h2>
<p>Le rendez-vous le plus fidélisant de votre accompagnement est le bilan hebdomadaire, à condition qu'il ne soit pas une compilation de chiffres. Un bilan efficace raconte la semaine : ce qui a fonctionné, ce qui freine, la prochaine étape. Il rend la progression visible au moment où elle est encore fragile.</p>
<p>Un client qui reçoit un bilan clair chaque semaine sait exactement où il en est, et il voit que vous le suivez de près. C'est précisément ce que l'on ne trouve ni dans une application ni dans un programme téléchargé : une personne qui lit vos données et ajuste votre plan.</p>
<h2>Célébrer les victoires, pas seulement les résultats</h2>
<p>L'erreur de nombreux suivis est de ne valoriser que l'objectif final. Entre le début et l'arrivée, des semaines sont réussies sans que la balance bouge : régularité maintenue, comportement analysé, habitudes intégrées.</p>
<p>Célébrer ces victoires intermédiaires entretient la motivation et transforme la relation en partenariat. Un client encouragé sur ce qu'il fait bien tient mieux qu'un client jugé sur ce qui lui manque. Notez chaque semaine une victoire, même minime, et dites-la.</p>
<h2>Développer l'autonomie du client</h2>
<p>Plus le client dépend de vous pour la moindre décision, plus la relation devient fragile : il finit par vous quitter soit parce que la contrainte devient trop lourde, soit parce qu'il se sent incapable. À l'inverse, chaque portion d'autonomie accordée, choix d'un ajustement, lecture d'une tendance, gestion d'un imprévu, augmente sa fierté et son attachement au suivi.</p>
<p>Votre rôle évolue alors de la décision permanente au pilotage des décisions qu'il prend. Un client autonome n'a plus besoin qu'on le motive : il revient parce que le suivi lui apporte encore quelque chose.</p>
<h2>Les 90 premiers jours décident de la suite</h2>
<p>La fidélité ne se joue pas au moment de la résiliation, elle se construit dans les premiers mois. Un client qui vit bien ses trois premiers mois de suivi a peu de raisons de partir : il a vu des rituels, une structure et de premiers résultats. Un client dont l'entrée est brouillonne garde un doute permanent, prêt à ressortir au premier incident.</p>
<p>Concrètement, soignez l'entrée : un premier bilan structuré qui pose un cap, des mesures de départ explicites, un calendrier prévisible de séances et de points hebdomadaires. Annoncez dès le début comment le suivi fonctionne, ce que vous attendez du client et ce qu'il peut attendre de vous. L'incertitude est le premier ennemi de la rétention.</p>
<p>Pendant ce premier trimestre, le feedback régulier compte plus que les résultats eux-mêmes. Dites ce qui se passe, pourquoi, et ce qui vient ensuite. Un client informé vit le suivi comme un processus contrôlé ; un client laissé dans l'ombre le vit comme une loterie.</p>
<p>Enfin, posez la question de la valeur dès le premier mois, pas au sixième : demandez à votre client ce qui lui apporte le plus dans le suivi, et systématisez ce point. Vous n'attendrez plus qu'il parte pour savoir ce qu'il fallait préserver.</p>
<h2>La grille de lecture mensuelle</h2>
<p>Installez un rendez-vous mensuel de rétrospective, court et structuré : résultats du mois, levier prioritaire du mois suivant, ressenti du client. Cette réévaluation évite l'effet tunnel et redonne un cap quand la routine s'installe.</p>
<p>C'est aussi l'occasion d'ajuster la formule si la réalité du client a changé, plutôt que de le laisser résilier pour devoir le reconquérir ensuite. Une réduction de rythme assumée vaut mieux qu'une résiliation définitive.</p>
<h2>Des abonnés qui durent, un studio qui respire</h2>
<p>La fidélisation agit sur tous les chiffres à la fois : un client qui reste stabilise votre revenu, vous libère du temps de prospection et devient votre meilleur ambassadeur.</p>
<p>Faites de la rétention un indicateur aussi suivi que les résultats de vos clients. Un outil qui structure les bilans, rend l'adhérence visible et conserve l'historique au même endroit change la donne : <a href="/product/overview/">voyez comment fonctionne un dossier de suivi client</a>, puis <a href="/blog/cas-client-studio-performance/">lisez le cas Studio Performance</a>, passé de 20 à 150 coachés en huit mois sans perdre la qualité. Et quand l'équipe grandit, la fidélisation se partage : <a href="/blog/delegation-equipe-grandir/">déléguer sans perdre la main</a> est la suite logique.</p>`,
    category: 'business',
    categoryLabel: 'Business',
    author: 'Thomas Bertrand',
    authorRole: 'Fondateur Studio Performance',
    date: '2026-09-14',
    readTime: '6 min',
    featured: true,
    seoTitle: 'Fidéliser ses clients coach : la rétention avant la résiliation',
    seoDescription: 'Fidélisation coaching : détecter les signaux avant la résiliation, rendre la progression visible, développer l\'autonomie. Le système de rétention.',
    seoKeywords: ['fidélisation client coach', 'rétention coaching', 'adhérence suivi'],
    tags: ['fidelisation', 'retention', 'abonnement', 'suivi'],
  },
  {
    slug: 'questionnaire-lancement-client-coaching',
    title: 'Questionnaire de lancement : 20 questions pour réussir l\'anamnèse',
    excerpt: 'L\'anamnèse qui prépare votre accompagnement : 20 questions sur l\'historique, les objectifs, les habitudes et l\'engagement.',
    content: `<p>La première séance avec un nouveau client est un moment décisif, et souvent mal préparé. On improvise, on pose des questions dans le désordre, et on repart avec dix feuilles que l'on n'exploite jamais. Le questionnaire de lancement change tout : il structure l'histoire du client avant même de commencer, et il vous offre un dossier exploitable dès la première séance. Voici les vingt questions qui font la différence.</p>
<h2>Pourquoi le questionnaire de lancement change tout</h2>
<p>Un accompagnement commence par une promesse : comprendre la situation réelle du client pour construire un plan pertinent. Sans questionnaire, cette promesse repose sur ce que le client vous dit en quinze minutes, souvent adouci par la gêne.</p>
<p>Le questionnaire écrit libère la parole. On confie plus facilement ses antécédents, ses échecs passés et ses doutes à l'écrit qu'en face à face. Il joue aussi un rôle de contrat psychologique : un client qui a investi du temps à répondre arrive en séance déjà engagé dans la démarche, et il valorise votre organisation.</p>
<h2>Les cinq questions d'identité et d'historique</h2>
<p>Ces questions installent le cadre. Sans elles, toutes les recommandations suivantes sont tirées d'une histoire incomplète.</p>
<ol>
<li>Âge, profession et rythme de vie : quelle est votre disponibilité réelle pour le suivi ?</li>
<li>Votre historique de pratique : avez-vous déjà été suivi ou entraîné, dans quel cadre et combien de temps ?</li>
<li>Vos antécédents médicaux et vos blessures : quels sont les points de vigilance à respecter ?</li>
<li>Vos traitements ou suivis en cours avec un autre professionnel de santé.</li>
<li>Ce qui s'est passé lors de vos dernières tentatives : qu'avez-vous testé, et pourquoi cela n'a pas duré ?</li>
</ol>
<h2>Les cinq questions d'objectif et de motivation</h2>
<p>L'objectif est le moteur du suivi. S'il n'est pas écrit, le client le réécrit selon son humeur, et l'effort devient flou.</p>
<ol>
<li>Votre objectif concret à trois mois, formulé comme un critère vérifiable.</li>
<li>Votre objectif à un an, pour vérifier que la direction à trois mois y conduit.</li>
<li>Pourquoi cet objectif compte pour vous : qu'est-ce qui change dans votre vie s'il est atteint ?</li>
<li>Ce qui vous a manqué jusqu'ici : le temps, la méthode, la constance ou le soutien ?</li>
<li>Sur une échelle de 1 à 10, votre confiance à atteindre cet objectif aujourd'hui, et ce qui vous ferait gagner un point.</li>
</ol>
<h2>Les cinq questions d'habitudes et d'environnement</h2>
<p>Les résultats viennent des habitudes répétées, pas des intentions. Votre travail consiste à appuyer celles-ci sur le quotidien réel du client.</p>
<ol>
<li>Votre semaine type : travail, repas, sommeil, et les moments où vous êtes disponible pour le sport.</li>
<li>Votre niveau d'activité actuel hors programme : marche quotidienne, escaliers, travail physique.</li>
<li>Vos habitudes alimentaires : repas à la maison, restaurant, grignotage, boissons.</li>
<li>Votre sommeil : nombre d'heures, régularité, qualité ressentie au réveil.</li>
<li>Votre environnement : qui vit avec vous et peut soutenir ou freiner vos efforts.</li>
</ol>
<h2>Les cinq questions d'engagement et de cadre</h2>
<p>Le cadre protège le suivi et fixe les règles du jeu pour les semaines difficiles.</p>
<ol>
<li>Votre disponibilité horaire pour les séances, et les créneaux irrémédiables.</li>
<li>Votre préférence entre un encadrement ferme et un accompagnement souple.</li>
<li>Ce qui vous a fait choisir un accompagnement plutôt qu'une solution seul ou une application.</li>
<li>Votre engagement sur les points hebdomadaires : êtes-vous prêt à fournir les mesures et les retours demandés ?</li>
<li>Ce que vous attendez de moi au quotidien : relances, ajustements, disponibilité.</li>
</ol>
<h2>Les erreurs qui ruinent un questionnaire</h2>
<p>Un bon questionnaire se repère aussi à ce qu'il évite.</p>
<ul>
<li><strong>Le questionnaire exhaustif.</strong> Trente questions fouillées sur tout, y compris sur ce qui ne servira jamais, font fuir ou découragent de répondre sérieusement. Vingt questions ciblées valent mieux que quarante questions vagues.</li>
<li><strong>Le questionnaire posé en séance.</strong> Poser les questions à l'oral en première séance reproduit la gêne que le format écrit contourne, et il ne reste aucune trace exploitable. L'écrit se lit, se compare et se met à jour ; l'oral s'oublie.</li>
<li><strong>Le questionnaire jamais relu.</strong> Demander des réponses sans les utiliser ensuite est la pire des pertes de confiance. Un client qui répète trois fois la même information croit que vous ne l'écoutez pas.</li>
</ul>
<p>Gardez le document simple, soignez l'ordre des questions, du plus neutre au plus intime, et annoncez le temps de réponse estimé. Un client prévenu que cela prendra quinze minutes le vit comme un investissement, pas comme une formalité.</p>
<p>Ajustez enfin la liste à votre spécialité. Un préparateur mental ajoute les questions sur le stress et les automatismes, un nutritionniste approfondit l'environnement alimentaire, un médecin du sport documente plus finement les antécédents. Le squelette reste identique, seules les branches changent. C'est cette adaptation qui transforme un questionnaire générique en outil de professionnel.</p>
<h2>Que faire des réponses</h2>
<p>Un questionnaire ne vaut que par l'usage que vous en faites. Relisez-le la veille de la première séance et transformez-le en plan : deux priorités à trois mois, deux mesures de départ, un premier ajustement d'habitude.</p>
<p>Résumez au client ce que vous avez compris de sa situation en ouverture de séance. Cette reformulation signale que vous l'avez écouté et crée la confiance qui portera tout le suivi. Archivez les réponses dans son dossier et mettez-les à jour tous les trimestres : une anamnèse datée de six mois n'est plus une anamnèse, c'est un souvenir.</p>
<h2>Le questionnaire, première brique du dossier client</h2>
<p>Le questionnaire de lancement ne fait pas que préparer la première séance, il pose la première pierre du dossier client. Les mesures, les bilans et les ajustements qui suivent viennent s'organiser autour de l'objectif déclaré, dans un seul et même endroit.</p>
<p>Pour encadrer tout le parcours d'entrée, du questionnaire au bilan initial et à la contractualisation, <a href="/lead-magnet-onboarding/">téléchargez notre protocole d'onboarding en 28 pages</a>. Et une fois le client lancé, appuyez la progression avec une trame déjà prête : <a href="/blog/comment-structurer-ses-bilans/">structurez vos bilans hebdomadaires</a> pour ne plus jamais perdre de temps à les préparer.</p>`,
    category: 'coaching',
    categoryLabel: 'Coaching',
    author: 'Marie Dubois',
    authorRole: 'Coach santé & nutrition',
    date: '2026-09-07',
    readTime: '6 min',
    featured: false,
    seoTitle: 'Questionnaire de lancement : 20 questions pour l\'anamnèse',
    seoDescription: '20 questions de questionnaire de lancement pour réussir l\'anamnèse : antécédents, objectifs, habitudes, engagement. Bien préparer le premier bilan.',
    seoKeywords: ['questionnaire de lancement', 'anamnèse coaching', 'bilan initial client'],
    tags: ['anamnese', 'questionnaire', 'onboarding', 'bilan'],
  },
  {
    slug: 'fixer-tarifs-coaching-sportif',
    title: 'Tarifs coaching sportif : la méthode pour fixer le juste prix',
    excerpt: 'Fixer vos tarifs sans brader votre valeur : coût de revient, modèles de prix, valeur perçue. La méthode complète.',
    content: `<p>Fixer ses tarifs est la décision la plus intimidante quand on crée ou développe une activité de coaching. Trop haut, on craint de faire fuir. Trop bas, on s'épuise et on attire des clients qui ne tiennent pas. Pourtant, le prix n'est pas un pari : c'est un résultat. Il découle de votre coût de revient, de la valeur réelle de votre suivi et de la façon dont vous présentez votre offre. Voici la méthode, étape par étape.</p>
<h2>Vos tarifs sont déjà un message</h2>
<p>Avant même que vous prononciez un mot, votre tarif positionne votre offre. Un coaching à 35 euros la séance raconte une histoire différente d'un suivi à 120 euros par mois. Les clients ne comparent pas d'abord les prix entre coachs : ils comparent le prix à l'idée qu'ils se font de vos résultats. Un tarif volontairement bas envoie un signal de doute : si vous ne croyez pas en votre valeur, pourquoi votre client y croirait-il ?</p>
<p>Le niveau de prix idéal n'existe pas. Ce qui existe, c'est la cohérence entre votre tarif, votre cible et votre promesse. Un coach qui recherche ses dix premiers clients n'a pas à charger les prix d'un studio établi. En revanche, il doit structurer une offre dès le début, pour que chaque augmentation progressive soit un argument clair et non une barrière.</p>
<h2>Étape 1 : calculer votre coût de revient réel</h2>
<p>On tarife souvent à l'intuition, en regardant ce que pratique le voisin. Le point de départ correct, c'est le temps et l'argent que chaque client vous coûte réellement. Faites le calcul sur un mois type :</p>
<ul>
<li>Le temps de séance, de préparation et de bilan hebdomadaire, souvent deux à quatre heures par client et par mois.</li>
<li>Les réponses aux messages, les réajustements de programme et la coordination.</li>
<li>Vos outils : logiciel de suivi, plateforme de facturation, équipement de mesure.</li>
<li>Vos charges fixes quand vous tenez un studio : local, énergie, assurance.</li>
<li>Les charges sociales et fiscales, qui pèsent souvent un tiers du chiffre d'affaires.</li>
</ul>
<p>Une fois ce coût connu, fixez votre objectif de revenu net mensuel et divisez-le par votre capacité d'accompagnement. Vous obtenez un tarif plancher sous lequel il est mathématiquement impossible de travailler. Tout ce qui dépasse ce plancher nourrit votre marge et votre investissement.</p>
<h2>Étape 2 : choisir votre modèle de prix</h2>
<p>Trois familles de modèles coexistent, et le meilleur choix dépend de votre mode de suivi.</p>
<p>La séance à l'unité est simple à vendre, mais elle valorise l'heure et non le résultat : vous êtes payé pour votre présence, pas pour la transformation. Le forfait mensuel de suivi, qui réunit séances, bilan structuré et disponibilité, crée un revenu prévisible et engage le client dans la durée. L'accompagnement premium, défini sur trois à six mois avec des étapes et des évaluations régulières, se justifie quand votre méthode produit un résultat chiffrable.</p>
<p>Le marché du coaching de santé a largement basculé vers l'abonnement pour une raison simple : il aligne votre intérêt, rester dans le suivi, sur celui du client, obtenir des résultats durables. C'est aussi le modèle qui résiste le mieux à l'absentéisme et aux ruptures prématurées.</p>
<h2>Étape 3 : construire la valeur perçue</h2>
<p>Avant d'annoncer un tarif, votre offre doit montrer ce qu'elle contient. Un prix ne se justifie pas, il s'assemble. Rassemblez les composants de votre suivi dans une liste claire :</p>
<ul>
<li>Un bilan hebdomadaire structuré qui rend la progression visible.</li>
<li>La collecte et l'interprétation des mesures : adhérence, sommeil, performances.</li>
<li>Un ajustement de programme fondé sur les données, pas sur l'impression.</li>
<li>Une disponibilité définie à l'avance : délai de réponse, canaux de contact.</li>
<li>Un accompagnement nutrition, mental ou récupération selon votre spécialité.</li>
</ul>
<p>Présenté ainsi, votre suivi se compare encore à des séances isolées, mais le rapport n'est plus le même. Le client n'achète plus trente minutes, il achète le système complet qui le mène à son objectif.</p>
<h2>Les trois erreurs qui bradent le prix</h2>
<p>Trois réflexes reviennent et coûtent cher en valeur perçue.</p>
<ul>
<li>Vendre séance par séance et glisser le suivi en option. Quand le bilan devient une annexe, le client ne paie plus pour ce qui fait pourtant la différence.</li>
<li>Aligner son prix sur celui du concurrent. Vous ne vendez pas le même accompagnement que le studio d'à côté, rien ne vous oblige à partager ses tarifs.</li>
<li>Négocier au cas par cas. Chaque exception raconte que votre prix d'affichage n'est pas sérieux, et le bouche-à-oreille finit par le répéter.</li>
</ul>
<h2>Annoncer votre tarif sans hésiter</h2>
<p>L'annonce du prix se structure. Formulez d'abord le cadre : « Pour cet accompagnement, le suivi mensuel démarre à X euros. Il comprend vos séances, un bilan hebdomadaire préparé et un ajustement continu de votre programme. » Puis taisez-vous et laissez la place à la question. Le silence qui suit est un espace de décision, pas un vide à remplir.</p>
<p>Si le client hésite sur le montant, ne rétrogradez pas le prix : déplacez la discussion vers le périmètre. La valeur se défend en ajoutant des éléments concrets, rarement en rabattant le tarif.</p>
<h2>Augmenter vos tarifs sans perdre vos clients</h2>
<p>La hausse de prix est une étape normale, pas une trahison. Annoncez-la à l'avance, avec un délai clair pour que personne ne découvre un changement à la facturation. Justifiez la nouvelle valeur en montrant ce qui a changé depuis la dernière version : un suivi mieux structuré, plus d'outils, de meilleurs résultats.</p>
<p>Prolongez le tarif ancien pour les clients fidèles, ou offrez une transition progressive. Un client fidèle coûte moins cher à servir qu'un nouveau, il peut donc rester à l'ancien tarif pendant un cycle, le temps que la valeur nouvelle devienne évidente. La hausse s'installe alors naturellement, sans friction ni résiliation surprise.</p>
<h2>Un tarif vivant, réévalué avec les résultats</h2>
<p>Un bon tarif ne se choisit pas une fois pour toutes. Il évolue avec votre coût de revient, votre réputation et la qualité de vos résultats. Réévaluez vos prix tous les six mois, chiffres de vos bilans en main. Si vos clients restent plusieurs mois et progressent, c'est que votre suivi vaut plus que votre tarif actuel.</p>
<p>Le temps passé à assembler des bilans et à recopier des mesures est du temps que votre tarif doit rémunérer. Un suivi structuré libère ce temps et renforce ce que vous affichez : <a href="/product/overview/">découvrez le fonctionnement d'un dossier de suivi client</a> et <a href="/pricing/">comparez les formules Optibilan</a>. Et comme un tarif attire mais ne retient pas, prolongez la lecture avec <a href="/blog/fideliser-clients-coaching-retention/">nos leviers pour fidéliser vos clients</a>.</p>`,
    category: 'business',
    categoryLabel: 'Business',
    author: 'Marie Dubois',
    authorRole: 'Coach santé & nutrition',
    date: '2026-08-24',
    readTime: '6 min',
    featured: true,
    seoTitle: 'Tarifs coaching sportif : fixer le juste prix de votre suivi',
    seoDescription: 'Comment fixer vos tarifs de coaching sportif et santé : coût de revient, modèles de prix, valeur perçue. La méthode pour vendre votre suivi au juste prix.',
    seoKeywords: ['tarifs coaching sportif', 'prix coaching santé', 'forfait mensuel coaching'],
    tags: ['tarifs', 'abonnement', 'valeur', 'business'],
  },
  {
    slug: 'perte-de-poids-durable-eviter-yoyo',
    title: 'Perte de poids durable : 7 règles pour éviter l\'effet yoyo',
    excerpt: 'Perte de poids durable : 7 règles contre l\'effet yoyo, préserver le muscle et tenir après l\'objectif.',
    content: `<p>Presque tout le monde sait perdre du poids. Ce qui sépare les résultats durables des échecs répétés, c'est la phase invisible : celle qui suit l'objectif. On maigrit souvent vite, on reprend presque toujours une partie de ce que l'on a perdu, et chaque cycle érode la confiance. La bonne approche renverse la question : au lieu de chercher la perte maximale, elle construit les conditions qui tiennent. Voici les sept règles qui font la différence.</p>
<h2>Pourquoi le yoyo n'est pas un manque de volonté</h2>
<p>Le poids oscille d'abord pour des raisons physiologiques. Une restriction marquée réduit la dépense énergétique, active la faim et fait perdre du muscle en plus de la graisse. Ajoutez un retour aux anciennes habitudes, et la reprise devient le résultat le plus prévisible qui soit.</p>
<p>Comprendre ce mécanisme change le travail du coach : il ne s'agit plus de courir contre la montre, mais de construire un régime que l'on peut tenir, mesurer et ajuster semaine après semaine.</p>
<h2>Règle 1 : perdre lentement pour durer</h2>
<p>Un déficit modéré, de l'ordre de 15 à 25 pour cent des besoins, sans jamais de privation draconienne, produit moins de faim, préserve le muscle et maintient le niveau de vie. La vitesse compte moins que la stabilité : un demi-kilo à un kilo par semaine, en moyenne sur un mois, est un rythme sain et tenable.</p>
<h2>Règle 2 : préserver le muscle</h2>
<p>Le muscle est le moteur de la dépense énergétique au repos. En perte de poids, le stimulus doit rester suffisant pour que le corps ne retire que la graisse excédentaire, pas la masse qui le fait dépenser. Le bon dosage se construit dans le suivi, en ajustant la charge et la fréquence selon les résultats, pas sur une fiche d'exercices générique.</p>
<h2>Règle 3 : suivre plus que la balance</h2>
<p>Le poids se trompe régulièrement : rétention d'eau, variations hormonales, digestion. Il ne devient parlant que sur la tendance de plusieurs semaines. Croisez-le avec le tour de taille, les mesures, le ressenti et la performance sportive : ces indicateurs racontent la vraie trajectoire, celle du corps qui change.</p>
<h2>Règle 4 : construire des habitudes réversibles</h2>
<p>Toute discipline qui ne survit pas à une semaine de vacances, à un déplacement ou à un imprévu est une discipline fragile. Avant de conseiller une habitude, posez la question : le client pourra-t-il la maintenir dans sa réalité ? Si la réponse est non, aménagez-la avant de l'imposer. Une habitude modeste mais stable bat toujours un plan parfait et abandonné.</p>
<h2>Règle 5 : planifier les écarts</h2>
<p>L'interdiction totale prépare la rupture. Planifier un écart par semaine, encadré et assumé, réduit la tension psychologique et protège l'adhérence sur le long terme. Le client apprend à gérer ses repas de fête au lieu de les subir, puis de les compenser en se privant, ce qui alimente le yoyo.</p>
<h2>Règle 6 : réévaluer les besoins à chaque palier</h2>
<p>En perdant du poids, les besoins énergétiques baissent. Un plan qui n'est pas recalibré à chaque palier finit par créer un déficit trop faible, et la perte ralentit sans raison apparente. Le suivi régulier permet d'ajuster le déficit et l'activité en fonction des résultats réels, plutôt que de laisser le client s'épuiser sur un plan devenu obsolète.</p>
<h2>Règle 7 : garder le suivi après l'objectif</h2>
<p>La phase la plus fragile est celle des trois à six mois qui suivent l'objectif. On relâche les efforts, on arrête les bilans, et la dérive s'installe en silence. La reprise se joue ici : prévoyez un suivi allégé mais régulier après l'atteinte de l'objectif, avec des points mensuels et des mesures encore comparées. La surveillance coûte peu, elle évite d'en refaire la totalité.</p>
<h2>Construire la transition vers le maintien</h2>
<p>L'objectif atteint, on ne coupe pas le processus d'un coup. La sortie de régime est une phase à part entière : on remonte progressivement les portions, on réintroduit les aliments écartés dans un ordre contrôlé, et on surveille la réponse du poids sur plusieurs semaines avant d'ajuster.</p>
<p>La règle de la transition est simple : un seul levier à la fois. Augmentez les portions pendant trois semaines et observez. Si le poids reste stable, ajoutez un second levier, la réintroduction d'un repas convivial par exemple. Cette progressivité permet de retrouver une alimentation durable sans basculer dans la surcompensation.</p>
<p>Pendant la phase de maintien, gardez des points mensuels plus légers : une mesure, une discussion sur les écarts, une charge d'entraînement réajustée. Le maintien n'est pas l'arrêt du suivi, c'est un suivi à basse intensité qui coûte peu et protège des années de travail.</p>
<h2>Les erreurs de coaching qui alimentent le yoyo</h2>
<p>Trois erreurs courantes sabordent un accompagnement prometteur.</p>
<ul>
<li><strong>Promettre une perte spectaculaire.</strong> La vitesse séduit à la vente et dessert à long terme : le déficit agressif qui la rend possible prépare la reprise.</li>
<li><strong>Juger la semaine sur la balance.</strong> Un client mesuré chaque lundi, démoralisé par un pic de rétention d'eau, décroche progressivement. La tendance, elle, ne se laisse pas piéger.</li>
<li><strong>Arrêter le suivi à l'objectif.</strong> Le moment où l'on interrompt tout est celui où l'on prive le client de la seule chose qui garantissait sa constance, le regard régulier. La reprise n'est alors pas un échec du client, c'est un échec du dispositif.</li>
</ul>
<h2>Le rôle du coach dans la constance</h2>
<p>Aucune règle ne remplace un regard régulier sur les données. C'est le suivi qui transforme ces principes en décisions : ajuster le déficit, planifier l'écart, réagir à la stagnation. Sans mesure, sans bilan, sans comparaison, les règles restent des souhaits.</p>
<p>Un logiciel de suivi alimenté par les mesures du client rend ce travail simple et visible : <a href="/solutions/nutrition/">voyez comment les nutritionnistes structurent leurs suivis</a>, et comment <a href="/blog/sync-sante-biomarqueurs/">synchroniser les données de santé connectée</a> dans le dossier client pour des bilans fondés sur des faits. Le cadre du bilan hebdo, lui, s'apprend vite : <a href="/blog/comment-structurer-ses-bilans/">notre méthode en 3 questions</a>.</p>`,
    category: 'sante',
    categoryLabel: 'Santé',
    author: 'Dr. Pierre Lambert',
    authorRole: 'Médecin du sport',
    date: '2026-08-10',
    readTime: '6 min',
    featured: true,
    seoTitle: 'Perte de poids durable : 7 règles pour éviter l\'effet yoyo',
    seoDescription: 'Perte de poids durable : 7 règles contre l\'effet yoyo, préserver le muscle, planifier les écarts et tenir après l\'objectif. Guide praticiens.',
    seoKeywords: ['perte de poids durable', 'effet yoyo', 'maintien du poids'],
    tags: ['perte-de-poids', 'nutrition', 'maintien', 'biomarqueurs'],
  },
];

/**
 * Récupère TOUS les articles publiés (build-time SSG)
 * Pagination automatique via headers X-WP-TotalPages
 * Mémoïsé par build + repli sur les articles statiques si WP échoue
 */
export function getAllPosts(): Promise<OptibilanArticle[]> {
  return memoized('blog:posts', fetchAllPosts);
}

async function fetchAllPosts(): Promise<OptibilanArticle[]> {
  if (!import.meta.env.WP_BASE_URL) {
    console.log('[WP] WP_BASE_URL non configuré, utilisation des données statiques');
    return [...STATIC_FALLBACK_ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
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

    if (!allPosts.length) {
      console.warn('[WP] Aucun article publié trouvé, repli sur les articles statiques');
      return [...STATIC_FALLBACK_ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
    }

    return allPosts.sort((a, b) => b.date.localeCompare(a.date));
  } catch (error) {
    console.warn('[WP] Erreur récupération des posts, repli sur les articles statiques:', error);
    return [...STATIC_FALLBACK_ARTICLES].sort((a, b) => b.date.localeCompare(a.date));
  }
}

/**
 * Récupère un article par slug (avec SEO, ACF, media)
 */
export async function getPostBySlug(slug: string): Promise<OptibilanArticle | null> {
  const posts = await getAllPosts();
  return posts.find(p => p.slug === slug) ?? null;
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
 * Mémoïsé par build + repli sur le mapping statique si WP échoue
 */
export function getCategories(): Promise<Array<{ slug: string; label: string; icon: string; color: string; count: number }>> {
  return memoized('blog:categories', fetchCategories);
}

async function fetchCategories(): Promise<Array<{ slug: string; label: string; icon: string; color: string; count: number }>> {
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
    console.warn('[WP] Erreur catégories, repli sur le mapping statique:', error);
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