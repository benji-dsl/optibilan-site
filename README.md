# Optibilan — Site Public

Site marketing statique (Astro + Tailwind) pour optibilan.com, déployé sur Cloudflare Pages.

## 🚀 Stack

- **Astro 5** — Static Site Generation (SSG)
- **Tailwind CSS 4** — Utility-first styling
- **TypeScript** — Type safety
- **Cloudflare Pages** — Hosting, CDN, DNS, WAF, Analytics

## 📁 Structure

```
src/
├── components/          # Composants réutilisables
│   ├── Header.astro     # Navigation responsive + menu mobile
│   ├── Footer.astro     # Liens, social, legal
│   ├── Hero.astro       # Section hero avec CTA
│   ├── Features.astro   # Grille de fonctionnalités
│   ├── Pricing.astro    # Tableau tarifs + toggle mensuel/annuel + FAQ
│   ├── CTA.astro        # Call-to-action section
│   └── TrustBar.astro   # Logos partenaires
├── layouts/
│   └── Layout.astro     # Layout global + SEO + JSON-LD + CSP
├── pages/
│   ├── index.astro      # Accueil
│   ├── features/        # Fonctionnalités détaillées
│   ├── pricing/         # Tarifs + comparatif + FAQ
│   ├── docs/            # Documentation technique
│   └── legal/           # Mentions, CGV, Confidentialité, Sous-traitance
├── styles/
│   └── global.css       # Tailwind + design tokens + animations
└── scripts/
    └── generate-icons.mjs  # Génération favicons PNG
```

## 📄 Pages

| Route | Description |
|-------|-------------|
| `/` | Accueil : hero, trust bar, features, pricing, CTA |
| `/features` | 9 modules détaillés avec liens profonds |
| `/pricing` | 3 offres (Solo/Studio/Cabinet), toggle mensuel/annuel, tableau comparatif, FAQ accordéon |
| `/docs` | Doc technique : démarrage, API REST, intégrations, sécurité, déploiement |
| `/legal/mentions` | Mentions légales (éditeur, hébergeur, DPO, propriété intellectuelle) |
| `/legal/cgv` | Conditions Générales de Vente complètes |
| `/legal/confidentialite` | Politique de confidentialité RGPD (droits, cookies, sous-traitants) |
| `/legal/sous-traitance` | Registre Art. 28 RGPD (6 sous-traitants, DPA, SCC, chaîne) |

## 🛠 Développement

```bash
# Installer
npm install

# Dev server (http://localhost:4321)
npm run dev

# Build production (→ dist/)
npm run build

# Preview build
npm run preview

# Générer icônes (après modif favicon.svg)
node scripts/generate-icons.mjs
```

## 🌐 Déploiement Cloudflare Pages

### 1. Connecter le repo
- Dashboard Cloudflare → Pages → "Connect to Git"
- Sélectionner ce repository
- Configuration :
  - **Build command** : `npm run build`
  - **Build output directory** : `dist`
  - **Root directory** : `/`

### 2. Variables d'environnement (aucune requise pour le build statique)

### 3. Domaine personnalisé
- `optibilan.com` → Cloudflare Pages (CNAME)
- `www.optibilan.com` → Redirect vers apex

### 4. Headers & Redirects
- `public/_redirects` → Redirections (legacy, API proxy)
- `wrangler.toml` → Headers sécurité, cache, CSP

### 5. DNS (Cloudflare)
```
Type    Name    Content                    Proxy
CNAME   @       optibilan.pages.dev        🟠 Proxied
CNAME   www     optibilan.pages.dev        🟠 Proxied
```

## 🔒 Sécurité & Performance

- **CSP stricte** : `script-src 'self' 'unsafe-inline'`, `connect-src 'self' https://api.stripe.com`
- **Headers** : HSTS, X-Frame-Options: DENY, X-Content-Type-Options: nosniff
- **Cache** : Assets hashés → `Cache-Control: public, max-age=31536000, immutable`
- **Compression** : Brotli + Gzip auto (Cloudflare)
- **Images** : WebP/AVIF auto, responsive, lazy-loading
- **Fonts** : Inter preconnect + preload, `font-display: swap`

## ♿ Accessibilité

- Semantic HTML5 (`<header>`, `<main>`, `<nav>`, `<article>`, `<footer>`)
- ARIA labels, roles, `aria-expanded`, `aria-controls`
- Focus visible, skip links, contrast ratios WCAG AA
- Reduced motion respect (`prefers-reduced-motion`)
- Keyboard navigation complète

## 📊 SEO

- Meta tags complets (title, description, canonical, OG, Twitter)
- JSON-LD WebSite + SearchAction
- Sitemap auto (`@astrojs/sitemap`) → `/sitemap-index.xml`
- Robots.txt
- Structured data sur pages clés

## 🎨 Design Tokens (Tailwind)

```css
/* Couleurs principales */
--color-primary-500: #3b82f6;   /* Bleu principal */
--color-primary-600: #2563eb;   /* Bleu hover */
--color-gold-500: #eab308;      /* Or accent */
--color-ink-900: #0f172a;       /* Texte principal */

/* Ombres */
--shadow-soft: 0 2px 15px -3px rgba(0,0,0,0.07);
--shadow-card: 0 4px 25px -5px rgba(0,0,0,0.08);
--shadow-elevated: 0 20px 50px -12px rgba(0,0,0,0.15);

/* Rayons */
--radius-xl: 1rem;
--radius-2xl: 1.5rem;
```

## 📦 Composants clés

### `Hero.astro`
```astro
<Hero
  title="Titre principal\nsur deux lignes"
  subtitle="Description courte"
  ctaPrimary={{ href: "/inscription", label: "Essai gratuit" }}
  ctaSecondary={{ href: "/features", label: "Voir features" }}
  badge="Nouveau !"
  illustration="/hero.svg"
/>
```

### `Pricing.astro`
```astro
<Pricing
  plans={[
    { name: 'Solo', priceMonthly: 49, priceYearly: 39, features: [...], cta: {...} },
    { name: 'Studio', priceMonthly: 149, priceYearly: 119, popular: true, ... },
  ]}
/>
```

## 🔄 Mise à jour contenu

1. Modifier les fichiers `.astro` dans `src/pages/`
2. `npm run build` → vérifie `dist/`
3. Push → Cloudflare Pages build & deploy auto (~1-2 min)

## 📝 Licence

Propriétaire — Optibilan. Tous droits réservés.