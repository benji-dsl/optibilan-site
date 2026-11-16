#!/usr/bin/env node
/**
 * Verifie que chaque article anglais garde exactement la structure de son
 * original francais : meme suite de balises, memes images, meme tableau,
 * meme nombre de questions de FAQ et de sources.
 *
 * Le francais vient de deux endroits :
 *   - le repli statique de src/utils/wordpress.ts (articles WordPress),
 *   - src/data/blog-fr/*.ts (articles ecrits dans le depot).
 *
 * Usage : node scripts/check-blog-parity.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const WP_SOURCE = join(ROOT, 'src/utils/wordpress.ts');
const FR_DIR = join(ROOT, 'src/data/blog-fr');
const EN_DIR = join(ROOT, 'src/data/blog-en');

const errors = [];

/* --------------------------------------------------- articles francais */
const frBySlug = new Map();

// 1. repli statique de WordPress
const compact = readFileSync(WP_SOURCE, 'utf8').split('\n').filter((l) => l.trim()).join('\n');
const marker = 'const STATIC_FALLBACK_ARTICLES: OptibilanArticle[] = [';
const start = compact.indexOf(marker);
const from = start + marker.length - 1;
const end = compact.indexOf('\n];', from);
const wpArticles = new Function(`return ${compact.slice(from, end + 3)}`)();

for (const article of wpArticles) {
  frBySlug.set(article.slug, {
    content: article.content,
    faq: (article.faq || []).length,
    sources: (article.sources || []).length,
  });
}

// 2. articles ecrits dans le depot
function readTsArticle(file) {
  const source = readFileSync(file, 'utf8');
  const slug = source.match(/slug:\s*[`'"]([^`'"]+)[`'"]/)?.[1];
  const content = source.match(/content:\s*(`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*")/s)?.[1];
  if (!slug || !content) return null;
  const body = content.startsWith('`') ? JSON.stringify(eval(content)) : content;
  return {
    slug,
    content: JSON.parse(body),
    faq: (source.match(/^\s*\{ q: /gm) || []).length,
    sources: (source.match(/^\s*\{ label: /gm) || []).length,
  };
}

if (existsSync(FR_DIR)) {
  for (const file of readdirSync(FR_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts')) {
    const article = readTsArticle(join(FR_DIR, file));
    if (article) frBySlug.set(article.slug, article);
    else errors.push(`${file} : article francais illisible.`);
  }
}

/* ------------------------------------------------------ comparaisons */
const tags = (html) => [...html.matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase());
const images = (html) => [...html.matchAll(/<img[^>]*src="([^"]+)"/gi)].map((m) => m[1]);
const cells = (html) => [...html.matchAll(/<(th|td)[^>]*>(.*?)<\/\1>/gi)].map((m) => m[1].toLowerCase());

if (!existsSync(EN_DIR)) {
  console.error('src/data/blog-en introuvable.');
  process.exit(1);
}

const enFiles = readdirSync(EN_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts');

for (const file of enFiles) {
  const article = readTsArticle(join(EN_DIR, file));
  if (!article) {
    errors.push(`${file} : article anglais illisible.`);
    continue;
  }

  const fr = frBySlug.get(article.slug);
  if (!fr) {
    errors.push(`${article.slug} : traduction anglaise sans original francais.`);
    continue;
  }

  const frTags = tags(fr.content);
  const enTags = tags(article.content);
  if (frTags.join('>') !== enTags.join('>')) {
    const firstDiff = frTags.findIndex((t, i) => t !== enTags[i]);
    errors.push(
      `${article.slug} : structure HTML differente (${frTags.length} balises FR, ${enTags.length} EN, premiere divergence a l'index ${firstDiff}).`
    );
  }

  if (images(fr.content).join('|') !== images(article.content).join('|')) {
    errors.push(`${article.slug} : images differentes.`);
  }

  if (cells(fr.content).join('|') !== cells(article.content).join('|')) {
    errors.push(`${article.slug} : tableau different.`);
  }

  if (article.faq !== fr.faq) {
    errors.push(`${article.slug} : ${article.faq} question(s) de FAQ pour ${fr.faq} en francais.`);
  }

  if (article.sources !== fr.sources) {
    errors.push(`${article.slug} : ${article.sources} source(s) pour ${fr.sources} en francais.`);
  }

  const text = article.content.replace(/<[^>]+>/g, ' ');
  const frenchWords = text.match(/\b(votre|vous|nous|pour|avec|dans|cette|être|déjà|chaque|depuis|aucun|selon)\b/gi) || [];
  if (frenchWords.length >= 3) {
    errors.push(`${article.slug} : ${frenchWords.length} mot(s) francais dans le corps anglais.`);
  }
}

// Chaque article francais doit avoir sa jumelle anglaise.
const enSlugs = new Set(enFiles.map((f) => readTsArticle(join(EN_DIR, f))?.slug));
for (const slug of frBySlug.keys()) {
  if (!enSlugs.has(slug)) errors.push(`${slug} : pas de traduction anglaise.`);
}

console.log(`${frBySlug.size} article(s) francais, ${enFiles.length} article(s) anglais.`);

if (errors.length) {
  console.log(`\n${errors.length} erreur(s) :`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}

console.log('OK : les articles anglais ont la structure des articles francais.');
