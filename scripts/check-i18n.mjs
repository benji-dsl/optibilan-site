#!/usr/bin/env node
/**
 * Controle i18n de la vitrine, apres `npm run build`.
 *
 * 1. Chaque page anglaise a une jumelle francaise (pas de page orpheline).
 * 2. Chaque page anglaise a : lang="en", canonical /en/, les 3 hreflang, og:locale en_US.
 * 3. Reciprocite : la page francaise annonce hreflang="en" vers sa jumelle, et
 *    une page sans traduction n'annonce AUCUNE version anglaise (pas de soft 404).
 * 4. Aucun lien interne casse (FR et EN).
 * 5. Aucun reste de francais visible dans les pages anglaises (heuristique).
 *
 * Usage : node scripts/check-i18n.mjs
 * Sort en erreur (code 1) si un controle bloquant echoue.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = process.cwd();
const DIST = join(ROOT, 'dist');
const SITE = 'https://optibilan.com';

const errors = [];
const warnings = [];

if (!existsSync(DIST)) {
  console.error('dist/ introuvable : lance `npm run build` avant ce controle.');
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* Inventaire du build                                                  */
/* ------------------------------------------------------------------ */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

const htmlFiles = walk(DIST);

/** Chemin de page ("/en/pricing/") depuis un fichier de build. */
function routeOf(file) {
  let rel = relative(DIST, file).replace(/\\/g, '/');
  rel = rel.replace(/index\.html$/, '');
  if (!rel.startsWith('/')) rel = `/${rel}`;
  if (rel === '//') rel = '/';
  return rel;
}

const builtRoutes = new Map(htmlFiles.map((f) => [routeOf(f), f]));

const frRoutes = [...builtRoutes.keys()].filter((r) => !r.startsWith('/en/'));
const enRoutes = [...builtRoutes.keys()].filter((r) => r.startsWith('/en/'));

/* ------------------------------------------------------------------ */
/* 1. Toute page anglaise a une jumelle francaise                       */
/* ------------------------------------------------------------------ */
for (const route of enRoutes) {
  const frCounterpart = route.replace(/^\/en/, '') || '/';
  if (!builtRoutes.has(frCounterpart)) {
    errors.push(`${route} n'a pas de jumelle francaise (${frCounterpart}).`);
  }
}

/* ------------------------------------------------------------------ */
/* 2 + 4 + 5. Metadonnees, liens, langue                                */
/* ------------------------------------------------------------------ */
const FRENCH_MARKERS =
  /\b(votre|vous|nous|pour|avec|dans|cette|être|déjà|gratuit|essai|rejoindre|découvrir|fonctionnalités|confidentialité|connexion|chaque|depuis)\b/gi;

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function checkLink(fromRoute, href) {
  if (!href) return;
  if (/^(mailto:|tel:|javascript:|data:|https?:|\/\/|#)/i.test(href)) return;
  if (!href.startsWith('/')) return;

  const clean = href.split('#')[0].split('?')[0];
  if (!clean) return;

  const candidates = [];
  if (clean.endsWith('/')) candidates.push(join(DIST, clean, 'index.html'));
  else {
    candidates.push(join(DIST, clean));
    candidates.push(join(DIST, clean, 'index.html'));
    candidates.push(join(DIST, `${clean}.html`));
  }

  if (!candidates.some((c) => existsSync(c))) {
    errors.push(`${fromRoute} -> lien interne casse : ${href}`);
  }
}

for (const [route, filePath] of builtRoutes) {
  const html = readFileSync(filePath, 'utf8');
  const isEn = route.startsWith('/en/');

  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    checkLink(route, match[1]);
  }

  if (!isEn) continue;

  if (!/<html[^>]+lang="en"/.test(html)) {
    errors.push(`${route} : <html lang="en"> absent.`);
  }

  const expectedCanonical = `${SITE}${route}`;
  const canonical = html.match(/<link rel="canonical" href="([^"]+)"/);
  if (!canonical) errors.push(`${route} : canonical absent.`);
  else if (canonical[1] !== expectedCanonical) {
    errors.push(`${route} : canonical ${canonical[1]} au lieu de ${expectedCanonical}.`);
  }

  const alternates = new Set(
    [...html.matchAll(/<link rel="alternate" hreflang="([^"]+)"/g)].map((m) => m[1])
  );
  for (const required of ['fr', 'en', 'x-default']) {
    if (!alternates.has(required)) {
      errors.push(`${route} : hreflang="${required}" absent.`);
    }
  }

  if (!/"og:locale" content="en_US"/.test(html)) {
    errors.push(`${route} : og:locale en_US absent.`);
  }

  const text = stripHtml(html);
  const strongMarkers = text.match(FRENCH_MARKERS) || [];
  if (strongMarkers.length >= 4) {
    warnings.push(
      `${route} : ${strongMarkers.length} mots francais detectes (${[...new Set(strongMarkers.map((m) => m.toLowerCase()))].slice(0, 8).join(', ')}).`
    );
  }
  if (text.includes('—')) {
    warnings.push(`${route} : tiret cadratin present (regle editoriale).`);
  }
}

/* ------------------------------------------------------------------ */
/* 3. Reciprocite, dans les deux sens                                   */
/* ------------------------------------------------------------------ */
const enByFrRoute = new Map(enRoutes.map((route) => [route.replace(/^\/en/, '') || '/', route]));

for (const [frRoute, file] of builtRoutes) {
  if (frRoute.startsWith('/en/')) continue;
  const html = readFileSync(file, 'utf8');
  const enRoute = enByFrRoute.get(frRoute);

  if (enRoute) {
    if (!new RegExp(`<link rel="alternate" hreflang="en" href="${SITE}${enRoute}"`).test(html)) {
      errors.push(`${frRoute} : hreflang="en" ne pointe pas vers ${SITE}${enRoute}.`);
    }
  } else if (/<link rel="alternate" hreflang="en"/.test(html)) {
    errors.push(`${frRoute} : annonce une version anglaise qui n'existe pas.`);
  }
}

/* ------------------------------------------------------------------ */
/* Rapport                                                              */
/* ------------------------------------------------------------------ */
console.log(`Pages generees : ${builtRoutes.size} (dont ${enRoutes.length} anglaises, ${frRoutes.length} francaises)`);

if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) :`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}

if (errors.length) {
  console.log(`\n${errors.length} erreur(s) :`);
  for (const e of errors.slice(0, 60)) console.log(`  x ${e}`);
  if (errors.length > 60) console.log(`  ... et ${errors.length - 60} autres.`);
  process.exit(1);
}

console.log('\nOK : i18n coherente, liens internes valides, metadonnees en place.');
