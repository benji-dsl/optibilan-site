#!/usr/bin/env node
/**
 * Audit SEO statique de la vitrine, apres `npm run build`.
 *
 * Ne remplace pas le controle i18n (scripts/check-i18n.mjs) : il regarde ce que
 * Google lit vraiment, page par page, et signale ce qui se degrade avec le temps.
 *
 * Usage : node scripts/audit-seo.mjs
 * Code de sortie 0 : aucun probleme bloquant. 1 : au moins une erreur.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

const routeOf = (file) => {
  let rel = relative(DIST, file).replace(/\\/g, '/');
  rel = rel.replace(/index\.html$/, '');
  return rel.startsWith('/') ? rel : `/${rel}`;
};

const errors = [];
const warnings = [];

const pages = walk(DIST).map((file) => {
  const html = readFileSync(file, 'utf8');
  const route = routeOf(file);
  const title = (html.match(/<title>([^<]*)<\/title>/) || [, ''])[1].trim();
  const desc = (html.match(/<meta name="description" content="([^"]*)"/) || [, ''])[1].trim();
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map((m) =>
    m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  );
  const imgs = [...html.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const links = [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const lang = (html.match(/<html[^>]*lang="([^"]+)"/) || [, ''])[1];
  const isRedirect = /http-equiv="refresh"/.test(html);
  return { route, title, desc, h1s, imgs, links, noindex, lang, isRedirect };
});

const content = pages.filter((p) => !p.isRedirect);

/* ---------------------------------------------------------- metadonnees */
const titles = new Map();
const descs = new Map();

for (const page of content) {
  if (page.noindex) continue;

  if (page.title.length === 0) errors.push(`${page.route} : <title> vide.`);
  else if (page.title.length > 65) warnings.push(`${page.route} : titre ${page.title.length} car. (> 65).`);
  else if (page.title.length < 25) warnings.push(`${page.route} : titre court (${page.title.length} car.).`);

  if (page.desc.length === 0) errors.push(`${page.route} : meta description absente.`);
  else if (page.desc.length > 165) warnings.push(`${page.route} : description ${page.desc.length} car. (> 165).`);
  else if (page.desc.length < 70) warnings.push(`${page.route} : description courte (${page.desc.length} car.).`);

  if (page.desc.includes('...') || page.desc.includes('…')) {
    warnings.push(`${page.route} : description tronquee ("...").`);
  }

  if (page.h1s.length !== 1) errors.push(`${page.route} : ${page.h1s.length} <h1> (il en faut exactement 1).`);

  if (page.lang !== (page.route.startsWith('/en/') ? 'en' : 'fr')) {
    errors.push(`${page.route} : lang="${page.lang}" incoherent avec le chemin.`);
  }

  titles.set(page.title, [...(titles.get(page.title) || []), page.route]);
  descs.set(page.desc, [...(descs.get(page.desc) || []), page.route]);

  const withoutDims = page.imgs.filter((img) => !/\bwidth="\d/.test(img) || !/\bheight="\d/.test(img));
  if (withoutDims.length > 0) {
    warnings.push(`${page.route} : ${withoutDims.length} image(s) sans width/height (CLS).`);
  }
}

for (const [title, routes] of titles) {
  if (routes.length > 2) warnings.push(`titre duplique sur ${routes.length} pages: "${title.slice(0, 60)}" (${routes.slice(0, 3).join(', ')})`);
}
for (const [, routes] of descs) {
  if (routes.length > 2) warnings.push(`description dupliquee sur ${routes.length} pages (${routes.slice(0, 3).join(', ')})`);
}

/* ------------------------------------------------------------- maillage */
const inbound = new Map(content.map((p) => [p.route, 0]));
const normalize = (href) => (href.endsWith('/') ? href : `${href}/`);

for (const page of content) {
  for (const href of page.links) {
    const target = normalize(href);
    if (inbound.has(target)) inbound.set(target, inbound.get(target) + 1);
  }
}

for (const [route, count] of inbound) {
  if (count === 0 && !route.startsWith('/checkout/') && route !== '/404/') {
    warnings.push(`${route} : aucune page ne pointe vers elle (orpheline).`);
  }
}

/* --------------------------------------------------------------- rapport */
console.log(`${content.length} page(s) analysee(s).`);

if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) :`);
  for (const w of warnings.slice(0, 40)) console.log(`  ~ ${w}`);
  if (warnings.length > 40) console.log(`  ... et ${warnings.length - 40} autres.`);
}

if (errors.length) {
  console.log(`\n${errors.length} erreur(s) :`);
  for (const e of errors.slice(0, 30)) console.log(`  x ${e}`);
  process.exit(1);
}

console.log('\nOK : aucune erreur SEO bloquante.');
