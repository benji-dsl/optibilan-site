#!/usr/bin/env node
/**
 * Exporte les 10 articles du blog FR (src/utils/wordpress.ts) vers
 * src/data/blog-en/<slug>.ts, prets a etre traduits.
 *
 * A ne lancer QU'UNE FOIS, pour amorcer la version anglaise (ou pour ajouter un
 * nouvel article francais). Les fichiers produits sont ensuite edites a la main :
 * ce script les ecrase.
 *
 * Usage : node scripts/export-blog-en-source.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'src/utils/wordpress.ts');
const OUT_DIR = join(ROOT, 'src/data/blog-en');

const src = readFileSync(SOURCE, 'utf8');

// Le fichier est ecrit avec un pas de 2048 lignes (une ligne de code, puis du vide).
// On le compacte d'abord, puis on isole le tableau de repli.
const compact = src.split('\n').filter((line) => line.trim()).join('\n');

const marker = 'const STATIC_FALLBACK_ARTICLES: OptibilanArticle[] = [';
const start = compact.indexOf(marker);
if (start === -1) throw new Error('Tableau STATIC_FALLBACK_ARTICLES introuvable.');

const from = start + marker.length - 1; // le '[' final du marqueur
const end = compact.indexOf('\n];', from);
if (end === -1) throw new Error('Fin du tableau introuvable.');

// +3 pour inclure le retour a la ligne et le '];' final
const literal = compact.slice(from, end + 3);
// eslint-disable-next-line no-new-func
const articles = new Function(`return ${literal}`)();

if (!Array.isArray(articles) || articles.length === 0) {
  throw new Error('Aucun article extrait.');
}

const camel = (slug) => slug.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());

const quote = (value) => {
  const str = String(value);
  if (str.includes('`') || str.includes('${')) return JSON.stringify(str);
  return `\`${str}\``;
};

function serialize(article) {
  const lines = [];
  lines.push('{');
  for (const [key, value] of Object.entries(article)) {
    if (value === undefined || value === null) continue;
    if (key === 'faq') {
      lines.push('  faq: [');
      for (const item of value) {
        lines.push(`    { q: ${quote(item.q)}, a: ${quote(item.a)} },`);
      }
      lines.push('  ],');
      continue;
    }
    if (key === 'sources') {
      lines.push('  sources: [');
      for (const item of value) {
        lines.push(`    { label: ${quote(item.label)}, url: ${quote(item.url)} },`);
      }
      lines.push('  ],');
      continue;
    }
    if (Array.isArray(value)) {
      lines.push(`  ${key}: [${value.map((v) => quote(v)).join(', ')}],`);
      continue;
    }
    if (typeof value === 'object') {
      lines.push(`  ${key}: ${JSON.stringify(value)},`);
      continue;
    }
    if (typeof value === 'boolean' || typeof value === 'number') {
      lines.push(`  ${key}: ${value},`);
      continue;
    }
    lines.push(`  ${key}: ${quote(value)},`);
  }
  lines.push('};');
  return lines.join('\n');
}

mkdirSync(OUT_DIR, { recursive: true });

const imports = [];

for (const article of articles) {
  const file = join(OUT_DIR, `${article.slug}.ts`);
  const body = `/**
 * Article anglais : ${article.slug}
 *
 * Source francaise : STATIC_FALLBACK_ARTICLES dans src/utils/wordpress.ts.
 * Le HTML doit rester structurellement identique a la version francaise
 * (memes balises, memes images, meme tableau, meme FAQ de 6 questions).
 */
import type { OptibilanArticle } from '@/utils/wordpress';

export const article: OptibilanArticle = ${serialize(article)}
`;
  writeFileSync(file, body, 'utf8');
  imports.push({ slug: article.slug, name: camel(article.slug), category: article.category, date: article.date });
  console.log(`  ${article.slug} -> src/data/blog-en/${article.slug}.ts`);
}

const index = `/**
 * Articles anglais du blog.
 *
 * Chaque fichier est la traduction d'un article de STATIC_FALLBACK_ARTICLES
 * (src/utils/wordpress.ts). L'ordre d'import n'a pas d'importance : le tri se
 * fait par date dans src/utils/blog-en.ts.
 */
import type { OptibilanArticle } from '@/utils/wordpress';
${imports.map((i) => `import { article as ${i.name} } from './${i.slug}';`).join('\n')}

export const articles: OptibilanArticle[] = [
${imports.map((i) => `  ${i.name},`).join('\n')}
];
`;

writeFileSync(join(OUT_DIR, 'index.ts'), index, 'utf8');
console.log(`\n${articles.length} article(s) exportes dans src/data/blog-en/.`);
