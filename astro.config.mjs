// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE_URL = 'https://optibilan.com';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  })],
  compressHTML: true,
  prefetch: true,
});
