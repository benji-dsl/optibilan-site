// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const SITE_URL = 'https://optibilan.com';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Dates de publication des articles, pour le `lastmod` du sitemap.
 * Google s'en sert pour planifier ses visites : sans lui, un article neuf
 * attend le prochain passage general.
 */
function collectArticleDates() {
  const dates = new Map();
  const add = (slug, date) => {
    if (!slug || !date) return;
    dates.set(`${SITE_URL}/blog/${slug}/`, date);
    dates.set(`${SITE_URL}/en/blog/${slug}/`, date);
  };

  // 1. articles WordPress (repli statique), avec le meme decalage de lignes
  const wpPath = path.resolve(__dirname, 'src/utils/wordpress.ts');
  if (existsSync(wpPath)) {
    const compact = readFileSync(wpPath, 'utf8').split('\n').filter((l) => l.trim()).join('\n');
    for (const m of compact.matchAll(/slug:\s*'([^']+)',[\s\S]{0,4000}?date:\s*'([^']+)'/g)) {
      add(m[1], m[2]);
    }
  }

  // 2. articles ecrits dans le depot
  for (const dir of ['src/data/blog-fr', 'src/data/blog-en']) {
    const abs = path.resolve(__dirname, dir);
    if (!existsSync(abs)) continue;
    for (const file of readdirSync(abs)) {
      if (!file.endsWith('.ts') || file === 'index.ts') continue;
      const source = readFileSync(path.join(abs, file), 'utf8');
      const slug = source.match(/slug:\s*[`'"]([^`'"]+)[`'"]/)?.[1];
      const date = source.match(/date:\s*[`'"]([^`'"]+)[`'"]/)?.[1];
      add(slug, date);
    }
  }

  return dates;
}

const ARTICLE_DATES = collectArticleDates();

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // Les pages anglaises vivent sous /en/. Le francais reste a la racine (aucune URL cassee).
  i18n: {
    defaultLocale: 'fr',
    locales: ['fr', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  redirects: {
    '/solutions/mental/': '/solutions/medecin/',
    '/docs/sandbox': '/docs/#sandbox',
    '/sitemap.xml': '/sitemap-index.xml',
    '/tarifs': '/pricing/',
  },
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '@layouts': path.resolve(__dirname, 'src/layouts'),
        '@components': path.resolve(__dirname, 'src/components'),
        '@utils': path.resolve(__dirname, 'src/utils'),
        '@': path.resolve(__dirname, 'src'),
      }
    }
  },
  integrations: [sitemap({
    // Ajoute les alternates hreflang dans le sitemap : Google relie les deux versions.
    i18n: {
      defaultLocale: 'fr',
      locales: { fr: 'fr-FR', en: 'en-US' },
    },
    filter: (page) => !page.includes('/404') && !page.includes('/checkout/'),
    serialize(item) {
      const date = ARTICLE_DATES.get(item.url);
      if (date) item.lastmod = date;
      return item;
    },
  })],
  compressHTML: true,
  prefetch: true,
});
