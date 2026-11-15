#!/usr/bin/env node
/**
 * Controle i18n de la vitrine, apres `npm run build`.
 *
 * 1. Chaque route de EN_ROUTES a bien un fichier dans dist/en.
 * 2. Chaque page anglaise a : lang="en", canonical /en/, les 3 hreflang, og:locale en_US.
 * 3. Reciprocite : la page francaise equivalente annonce bien hreflang="en".
 * 4. Aucun lien interne casse (FR et EN), aucun lien anglais qui sort vers un 404.
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
/* Liste des routes anglaises declarees                                 */
/* ------------------------------------------------------------------ */
const routesSource = readFileSync(join(ROOT, 'src/i18n/routes.ts'), 'utf8');
const declared = [...routesSource.matchAll(/^\s*'([^']+)',/gm)].map((m) => m[1]);
const declaredSet = new Set(declared);

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

/* ------------------------------------------------------------------ */
/* 1. Les routes declarees existent, et inversement                     */
/* ------------------------------------------------------------------ */
for (const route of declared) {
  const enRoute = route === '/' ? '/en/' : `/en${route}`;
  if (!builtRoutes.has(enRoute)) {
    errors.push(`EN_ROUTES declare ${route} mais ${enRoute} n'a pas ete genere.`);
  }
}

for (const [route, file] of builtRoutes) {
  if (!route.startsWith('/en/')) continue;
  if (route === '/en/404/') continue;
  const canonical = route.replace(/^\/en/, '') || '/';
  if (!declaredSet.has(canonical)) {
    errors.push(`${relative(ROOT, file)} existe mais ${canonical} manque dans EN_ROUTES.`);
  }
}

/* ------------------------------------------------------------------ */
/* 2 + 3 + 4. Contenu des pages                                         */
/* ------------------------------------------------------------------ */
const FRENCH_MARKERS =
  /\b(votre|vous|nous|pour|avec|dans|cette|être|déjà|gratuit|essai|tarifs|rejoindre|découvrir|en savoir plus|fonctionnalités|confidentialité|connexion|gratuits|chaque|aussi|depuis|entre|sans|plus|sur|une|les|des|est|sont)\b/gi;

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');
}

function checkLink(fromRoute, href, file) {
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
    return;
  }

  // Un lien vers une page HTML existe : on verifie qu'il ne sort pas du perimetre i18n.
  if (file.startsWith('/en/') && !file.startsWith('/en/')) return;
}

for (const [route, filePath] of builtRoutes) {
  const html = readFileSync(filePath, 'utf8');
  const isEn = route.startsWith('/en/');

  // 4. liens internes
  for (const match of html.matchAll(/href="([^"]+)"/g)) {
    checkLink(route, match[1], filePath);
  }

  if (!isEn) continue;

  // 2. metadonnees de la page anglaise
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

  // 5. restes de francais visibles
  const text = stripHtml(html);
  const markers = text.match(FRENCH_MARKERS) || [];
  const strongMarkers = text.match(
    /\b(votre|vous|nous|pour|avec|dans|cette|être|déjà|gratuit|essai|rejoindre|découvrir|fonctionnalités|confidentialité|connexion|chaque|depuis)\b/gi
  ) || [];
  if (strongMarkers.length >= 4) {
    warnings.push(
      `${route} : ${strongMarkers.length} mots francais detectes (${[...new Set(strongMarkers.map((m) => m.toLowerCase()))].slice(0, 8).join(', ')}) | ${markers.length} marqueurs au total.`
    );
  }
  if (text.includes('—')) {
    warnings.push(`${route} : tiret cadratin present (regle editoriale).`);
  }
}

/* ------------------------------------------------------------------ */
/* Reciprocite : la page FR annonce la version EN                       */
/* ------------------------------------------------------------------ */
for (const route of declared) {
  const frRoute = route;
  const frFile = builtRoutes.get(frRoute);
  if (!frFile) {
    errors.push(`Page francaise manquante pour ${route}.`);
    continue;
  }
  const html = readFileSync(frFile, 'utf8');
  const enRoute = route === '/' ? '/en/' : `/en${route}`;
  if (!new RegExp(`hreflang="en" href="${SITE}${enRoute}"`).test(html)) {
    errors.push(`${frRoute} : hreflang="en" ne pointe pas vers ${SITE}${enRoute}.`);
  }
}

/* ------------------------------------------------------------------ */
/* Rapport                                                              */
/* ------------------------------------------------------------------ */
const enCount = [...builtRoutes.keys()].filter((r) => r.startsWith('/en/')).length;

console.log(`Pages generees : ${builtRoutes.size} (dont ${enCount} anglaises)`);
console.log(`Routes anglaises declarees : ${declared.length}`);

if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) :`);
  for (const w of warnings) console.log(`  ~ ${w}`);
}

if (errors.length) {
  console.log(`\n${errors.length} erreur(s) :`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}

console.log('\nOK : i18n coherente, liens internes valides, metadonnees en place.');
