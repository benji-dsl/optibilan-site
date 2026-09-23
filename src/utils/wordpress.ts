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