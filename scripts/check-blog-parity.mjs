#!/usr/bin/env node
/**
 * Verifie que chaque article anglais garde exactement la structure de son
 * original francais : meme suite de balises, memes images, meme tableau,
 * meme nombre de questions de FAQ et de sources.
 *
 * Une traduction ne doit rien ajouter ni retirer au contenu. Ce controle
 * attrape un paragraphe oublie, une image supprimee ou une ligne de tableau
 * perdue, ce qu'une relecture rapide ne voit pas.
 *
 * Usage : node scripts/check-blog-parity.mjs
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const FR_SOURCE = join(ROOT, 'src/utils/wordpress.ts');
const EN_DIR = join(ROOT, 'src/data/blog-en');

const errors = [];

/* ---------------------------------------------------------------- FR */
const compact = readFileSync(FR_SOURCE, 'utf8').split('\n').filter((l) => l.trim()).join('\n');
const marker = 'const STATIC_FALLBACK_ARTICLES: OptibilanArticle[] = [';
const start = compact.indexOf(marker);
const from = start + marker.length - 1;
const end = compact.indexOf('\n];', from);
const frArticles = new Function(`return ${compact.slice(from, end + 3)}`)();

/* ------------------------------------------------------------ helpers */
const tags = (html) => [...html.matchAll(/<\/?([a-z0-9]+)/gi)].map((m) => m[1].toLowerCase());
const images = (html) => [...html.matchAll(/<img[^>]*src="([^"]+)"/gi)].map((m) => m[1]);
const cells = (html) => [...html.matchAll(/<(th|td)[^>]*>(.*?)<\/\1>/gi)].map((m) => m[1].toLowerCase());

if (!existsSync(EN_DIR)) {
  console.error('src/data/blog-en introuvable.');
  process.exit(1);
}

const enFiles = readdirSync(EN_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts');
if (enFiles.length !== frArticles.length) {
  errors.push(`${enFiles.length} article(s) anglais pour ${frArticles.length} article(s) francais.`);
}

for (const fr of frArticles) {
  const file = join(EN_DIR, `${fr.slug}.ts`);
  if (!existsSync(file)) {
    errors.push(`${fr.slug} : traduction manquante.`);
    continue;
  }

  const source = readFileSync(file, 'utf8');
  const match = source.match(/content: (`(?:[^`\\]|\\.)*`|"(?:[^"\\]|\\.)*")/s);
  if (!match) {
    errors.push(`${fr.slug} : champ content introuvable.`);
    continue;
  }

  let enContent;
  try {
    enContent = JSON.parse(match[1].startsWith('`') ? JSON.stringify(eval(match[1])) : match[1]);
  } catch {
    errors.push(`${fr.slug} : content illisible (echappement).`);
    continue;
  }

  const frTags = tags(fr.content);
  const enTags = tags(enContent);
  if (frTags.join('>') !== enTags.join('>')) {
    const firstDiff = frTags.findIndex((t, i) => t !== enTags[i]);
    errors.push(
      `${fr.slug} : structure HTML differente (${frTags.length} balises FR, ${enTags.length} EN, premiere divergence a l'index ${firstDiff}).`
    );
  }

  const frImages = images(fr.content);
  const enImages = images(enContent);
  if (frImages.join('|') !== enImages.join('|')) {
    errors.push(`${fr.slug} : images differentes (${frImages.length} FR, ${enImages.length} EN).`);
  }

  const frCells = cells(fr.content).join('|');
  const enCells = cells(enContent).join('|');
  if (frCells !== enCells) {
    errors.push(`${fr.slug} : tableau different (${frCells.split('|').length} cellules FR, ${enCells.split('|').length} EN).`);
  }

  const faqCount = (source.match(/^\s*\{ q: /gm) || []).length;
  if (faqCount !== (fr.faq || []).length) {
    errors.push(`${fr.slug} : ${faqCount} question(s) de FAQ pour ${(fr.faq || []).length} en francais.`);
  }

  const srcCount = (source.match(/^\s*\{ label: /gm) || []).length;
  if (srcCount !== (fr.sources || []).length) {
    errors.push(`${fr.slug} : ${srcCount} source(s) pour ${(fr.sources || []).length} en francais.`);
  }

  // Le francais ne doit pas rester dans le corps anglais.
  const text = enContent.replace(/<[^>]+>/g, ' ');
  const frenchWords = text.match(/\b(votre|vous|nous|pour|avec|dans|cette|être|déjà|chaque|depuis|aucun|selon)\b/gi) || [];
  if (frenchWords.length >= 3) {
    errors.push(`${fr.slug} : ${frenchWords.length} mot(s) francais dans le corps anglais.`);
  }
}

console.log(`${frArticles.length} article(s) compare(s).`);

if (errors.length) {
  console.log(`\n${errors.length} erreur(s) :`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}

console.log('OK : les articles anglais ont la structure des articles francais.');
