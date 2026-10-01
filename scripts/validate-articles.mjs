#!/usr/bin/env node
/**
 * Validateur du format article Optibilan.
 * Contrat : docs/format-article.md
 *
 * Usage : node scripts/validate-articles.mjs [dossier-dist]
 * Sortie : 0 si tout est conforme, 1 sinon.
 *
 * Le validateur travaille sur le HTML généré (dist), donc il vérifie exactement
 * ce que Google et le visiteur voient. Les métadonnées sont lues dans le JSON-LD
 * BlogPosting et les FAQ dans le JSON-LD FAQPage.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const DIST = process.argv[2] || 'dist';
const BLOG = join(DIST, 'blog');

// ---------------------------------------------------------------- utilitaires

const stripTags = (h) =>
  h
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const words = (h) => stripTags(h).split(' ').filter(Boolean).length;

const ABBR = new Set([
  'm', 'mme', 'mlle', 'dr', 'pr', 'st', 'ste', 'cf', 'nb', 'env', 'ex', 'etc',
  'p', 'vol', 'no', 'art', 'annexe', 'fig', 'vs', 'kg', 'cm', 'min', 'h', 'j', '€', '%',
]);

/** Compte les phrases en protégeant les abréviations françaises (M. Dupont, etc.). */
function countSentences(html) {
  const text = stripTags(html);
  if (!text) return 0;
  const protectedText = text.replace(/\b([A-Za-zÀ-ÿ]{1,5})\.(?=\s|$)/g, (match, w) => {
    const known = ABBR.has(w.toLowerCase());
    const capitalized = /^[A-ZÀ-Ý]/.test(w);
    return (known || capitalized) && w.length <= 5 ? `${w}\u0001` : match;
  });
  return protectedText
    .split(/(?<=[.!?])\s+(?=[\u0001«"'(\w])/)
    .map((s) => s.replace(/\u0001/g, '.').trim())
    .filter(Boolean).length;
}

const parseJsonLd = (html) => {
  const out = [];
  const re = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1]);
      out.push(...(Array.isArray(parsed) ? parsed : [parsed]));
    } catch {
      /* JSON-LD invalide : ignore ici, testé séparément */
    }
  }
  return out;
};

const attr = (tag, name) => {
  const m = tag.match(new RegExp(`${name}="([^"]*)"`, 'i'));
  return m ? m[1] : '';
};

// ------------------------------------------------------------------- règles

const RULES = {
  words: { min: 1500, max: 2200, label: 'volume total (1500-2200 mots)' },
  sections: { min: 4, max: 6, label: 'sections H2 de contenu (4-6)' },
  paras: 3,
  sentences: { min: 4, max: 8 },
  images: 3,
  externalLinks: 3,
  faq: 6,
  titleMax: 60,
  descMax: 155,
  excerpt: { min: 120, max: 200 },
};

// --------------------------------------------------------------- validation

function validateArticle(file, slug, errors, warns) {
  const html = readFileSync(file, 'utf8');
  const err = (m) => errors.push(`${slug}: ${m}`);
  const warn = (m) => warns.push(`${slug}: ${m}`);

  // --- métadonnées -------------------------------------------------------
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
  const desc = (html.match(/name="description" content="([^"]*)"/) || [, ''])[1];

  if (title.length > RULES.titleMax) err(`titre ${title.length} car. > ${RULES.titleMax} ("${title}")`);
  if (title.length < 25) err(`titre trop court (${title.length} car.)`);

  if (desc.length > RULES.descMax) err(`meta description ${desc.length} car. > ${RULES.descMax}`);
  if (desc.length < 70) err(`meta description trop courte (${desc.length} car.)`);
  if (desc.includes('...') || desc.includes('…')) err(`meta description contient une troncature "..."`);
  else if (!desc.trim().endsWith('.')) err(`meta description non fermée par un point`);

  // --- JSON-LD -----------------------------------------------------------
  const jsonLd = parseJsonLd(html);
  const article = jsonLd.find((j) => j['@type'] === 'BlogPosting');
  const faqLd = jsonLd.find((j) => j['@type'] === 'FAQPage');

  if (!article) {
    err('JSON-LD BlogPosting absent');
    return;
  }
  if (faqLd) {
    if (faqLd.mainEntity.length !== RULES.faq) err(`FAQPage : ${faqLd.mainEntity.length} questions au lieu de ${RULES.faq}`);
    for (const q of faqLd.mainEntity) {
      if (!q.name?.endsWith('?')) warn(`question FAQ sans point d'interrogation : "${q.name?.slice(0, 50)}"`);
    }
  }

  const keywords = String(article.keywords || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  const [main, ...secondary] = keywords;

  const excerpt = String(article.abstract || '');
  if (excerpt) {
    if (excerpt.length < RULES.excerpt.min || excerpt.length > RULES.excerpt.max)
      err(`extrait ${excerpt.length} car. hors ${RULES.excerpt.min}-${RULES.excerpt.max}`);
    if (!excerpt.trim().endsWith('.')) err(`extrait non fermé par un point`);
    if (excerpt.includes('...')) err(`extrait contient "..."`);
  }

  // --- corps de l'article (le bloc .prose exclut FAQ et Sources) ---------
  const proseMatch = html.match(/<div class="prose[^"]*"[^>]*>([\s\S]*?)<\/div>/);
  if (!proseMatch) {
    err('bloc de contenu introuvable');
    return;
  }
  const body = proseMatch[1];

  const w = words(body);
  if (w < RULES.words.min || w > RULES.words.max)
    err(`${w} mots, hors ${RULES.words.min}-${RULES.words.max}`);

  // sections H2 de contenu (celles du bloc .prose ; Sources/FAQ sont rendues à part)
  const h2s = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => stripTags(m[1]));
  if (h2s.length < RULES.sections.min || h2s.length > RULES.sections.max)
    err(`${h2s.length} H2 de contenu, hors ${RULES.sections.min}-${RULES.sections.max}`);

  for (const h of h2s) {
    if (h.length < 25 || h.length > 90) err(`titre H2 hors 25-90 car. : "${h}"`);
    if (h.includes('?')) err(`H2 sous forme de question (réservé à la FAQ) : "${h}"`);
    if (/^(pourquoi|comment|quel|quels|quelle|quand|où|combien|est-ce|que faire)/i.test(h))
      err(`H2 interrogatif ou allusif : "${h}"`);
  }

  // découpage : 3 paragraphes par section, 4-8 phrases par paragraphe
  const parts = body.split(/<h2[^>]*>[\s\S]*?<\/h2>/).slice(1);
  parts.forEach((sec, i) => {
    const paras = [...sec.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)];
    if (paras.length !== RULES.paras)
      err(`section « ${h2s[i] ?? i + 1} » : ${paras.length} paragraphes au lieu de ${RULES.paras}`);
    paras.forEach((p, j) => {
      const n = countSentences(p[1]);
      if (n < RULES.sentences.min || n > RULES.sentences.max)
        err(`section « ${h2s[i] ?? i + 1} » ¶${j + 1} : ${n} phrases, hors ${RULES.sentences.min}-${RULES.sentences.max}`);
    });
  });

  // --- tableau -----------------------------------------------------------
  const tables = (body.match(/<table[\s>]/g) || []).length;
  const declaredNoTable = html.includes('data-no-table="true"');
  if (tables === 0) {
    if (!declaredNoTable)
      err('aucun tableau alors que le sujet porte une valeur mesurable (ou renseigner noTable: true)');
  } else {
    if (!/<thead[\s>]/i.test(body)) warn('tableau sans <thead>');
    if (!/<tbody[\s>]/i.test(body)) warn('tableau sans <tbody>');
  }

  // --- images ------------------------------------------------------------
  const imgs = [...body.matchAll(/<img[^>]*>/g)].map((m) => m[0]);
  if (imgs.length !== RULES.images)
    err(`${imgs.length} images dans le corps au lieu de ${RULES.images}`);
  imgs.forEach((tag, i) => {
    const alt = attr(tag, 'alt');
    if (!alt) err(`image ${i + 1} sans attribut alt`);
    else if (alt.length < 10) err(`image ${i + 1} : alt trop court ("${alt}")`);
    else if (/^(image de|photo de|img[_-]?)/i.test(alt)) err(`image ${i + 1} : alt non descriptif ("${alt}")`);
    if (!attr(tag, 'src')) err(`image ${i + 1} sans src`);
  });
const figures = (body.match(/<figure[\s>]/g) || []).length;
  if (figures !== imgs.length) err(`${figures} <figure> pour ${imgs.length} image(s) (une figure par image)`);
  const captions = (body.match(/<figcaption[\s>]/g) || []).length;
  if (captions !== imgs.length) err(`${captions} <figcaption> pour ${imgs.length} image(s) (légende obligatoire)`);

  // --- liens externes ----------------------------------------------------
  const ext = [...body.matchAll(/href="(https?:\/\/[^"]+)"/g)].map((m) => m[1]);
  const domains = new Set(ext.map((u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } }));
  if (domains.size < RULES.externalLinks)
    err(`${domains.size} domaines externes distincts, minimum ${RULES.externalLinks}`);
  const internal = (body.match(/href="\/[^"#]*"/g) || []).length;
  if (internal > 0) warn(`${internal} lien(s) interne(s) dans le corps (réservé au maillage catégories)`);

  // --- mots-clés ---------------------------------------------------------
  if (!main) {
    err('aucun mot-clé principal déclaré (seoKeywords[0])');
  } else {
    if (!keywords.length) err('seoKeywords vide');
    const inTitle = title.toLowerCase().includes(main.toLowerCase());
    if (!inTitle) err(`mot-clé principal absent du titre : "${main}"`);

    const intro = body.match(/<p[^>]*>([\s\S]*?)<\/p>/);
    if (!intro || !stripTags(intro[1]).toLowerCase().includes(main.toLowerCase()))
      err(`mot-clé principal absent de l'introduction : "${main}"`);

    const firstH2 = (h2s[0] || '').toLowerCase();
    if (!firstH2.includes(main.toLowerCase()))
      err(`mot-clé principal absent du premier H2 ("${h2s[0] ?? ''}") : "${main}"`);

    // chaque mot-clé secondaire doit apparaître tel quel dans un H2 ou en première phrase d'une section
    const firstSentences = parts.map((sec) => {
      const p = sec.match(/<p[^>]*>([\s\S]*?)<\/p>/);
      return p ? stripTags(p[1]).split(/(?<=[.!?])\s+/)[0] || '' : '';
    });
    const h2Blob = h2s.join(' | ').toLowerCase();
    const introBlob = firstSentences.join(' | ').toLowerCase();
    for (const kw of secondary) {
      const k = kw.toLowerCase();
      const covered =
        h2Blob.includes(k) ||
        introBlob.includes(k) ||
        (faqLd && JSON.stringify(faqLd).toLowerCase().includes(k));
      if (!covered) err(`mot-clé secondaire non traité : "${kw}" (absent des H2, des premières phrases et de la FAQ)`);
    }
  }

  // --- sections Sources et FAQ -------------------------------------------
  if (!/<h2[^>]*>Sources<\/h2>/i.test(html)) err('section H2 « Sources » absente');
  const sourcesBlock = html.match(/<section[^>]*aria-labelledby="sources-title"[\s\S]*?<\/section>/);
  if (sourcesBlock) {
    const n = (sourcesBlock[0].match(/<li/g) || []).length;
    if (n === 0) err('section Sources vide');
    if (!sourcesBlock[0].includes('rel="noopener nofollow"')) warn('lien de source sans rel="noopener nofollow"');
  }
  const faqBlock = html.match(/<section[^>]*aria-labelledby="faq-title"[\s\S]*?<\/section>/);
  if (!faqBlock) err('section H2 « Questions fréquentes » absente');
  else {
    const qs = (faqBlock[0].match(/<h3[^>]*>([\s\S]*?)<\/h3>/g) || []).length;
    if (qs !== RULES.faq) err(`FAQ : ${qs} questions en H3 au lieu de ${RULES.faq}`);
  }
  if (faqBlock && sourcesBlock && html.indexOf('sources-title') > html.indexOf('faq-title'))
    err('la section Sources doit précéder la FAQ');
}

// ------------------------------------------------------------------- main

if (!existsSync(BLOG)) {
  console.error(`✗ ${BLOG} introuvable. Lancer le build avant la validation : npm run build`);
  process.exit(1);
}

const files = readdirSync(BLOG, { withFileTypes: true })
  .filter((d) => d.isDirectory() && d.name !== 'category')
  .map((d) => join(BLOG, d.name, 'index.html'))
  .filter((f) => existsSync(f));

if (!files.length) {
  console.error('✗ aucun article trouvé dans', BLOG);
  process.exit(1);
}

const errors = [];
const warns = [];
for (const file of files) validateArticle(file, file.split('/').slice(-2)[0], errors, warns);

console.log(`\nValidation du format article — ${files.length} article(s)\n`);
if (warns.length) {
  console.log('Avertissements :');
  warns.forEach((w) => console.log(`  ~ ${w}`));
  console.log('');
}
if (errors.length) {
  const byArticle = {};
  for (const e of errors) (byArticle[e.split(':')[0]] ||= []).push(e);
  console.log(`✗ ${errors.length} violation(s) sur ${Object.keys(byArticle).length} article(s) :\n`);
  for (const [slug, list] of Object.entries(byArticle)) {
    console.log(`  ${slug} (${list.length})`);
    list.forEach((l) => console.log(`     - ${l.split(': ').slice(1).join(': ')}`));
  }
  console.log(`\nContrat : docs/format-article.md\n`);
  process.exit(1);
}

console.log('✓ Tous les articles respectent le format.\n');