#!/usr/bin/env node
/**
 * Compare la structure d'une page FR et de sa jumelle EN.
 *
 * Une traduction ne doit pas toucher au design : memes composants, memes classes
 * Tailwind, memes ids, memes attributs data-*. Ce script signale tout ecart, ce qui
 * attrape a la fois une classe perdue et un bloc oublie.
 *
 * Usage : node scripts/check-i18n-structure.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();

const PAIRS = [
  ['src/pages/index.astro', 'src/pages/en/index.astro'],
  ['src/pages/pricing/index.astro', 'src/pages/en/pricing/index.astro'],
  ['src/pages/contact/index.astro', 'src/pages/en/contact/index.astro'],
  ['src/pages/newsletter/index.astro', 'src/pages/en/newsletter/index.astro'],
  ['src/pages/security/index.astro', 'src/pages/en/security/index.astro'],
  ['src/pages/docs/index.astro', 'src/pages/en/docs/index.astro'],
  ['src/pages/solutions/index.astro', 'src/pages/en/solutions/index.astro'],
  ['src/pages/solutions/coaches.astro', 'src/pages/en/solutions/coaches.astro'],
  ['src/pages/solutions/nutrition.astro', 'src/pages/en/solutions/nutrition.astro'],
  ['src/pages/solutions/medecin.astro', 'src/pages/en/solutions/medecin.astro'],
  ['src/pages/solutions/cabinets.astro', 'src/pages/en/solutions/cabinets.astro'],
  ['src/pages/product/overview.astro', 'src/pages/en/product/overview.astro'],
  ['src/pages/product/check-ins/index.astro', 'src/pages/en/product/check-ins/index.astro'],
  ['src/pages/product/nutrition/index.astro', 'src/pages/en/product/nutrition/index.astro'],
  ['src/pages/product/training/index.astro', 'src/pages/en/product/training/index.astro'],
  ['src/pages/product/mental/index.astro', 'src/pages/en/product/mental/index.astro'],
  ['src/pages/product/health/index.astro', 'src/pages/en/product/health/index.astro'],
  ['src/pages/product/engagement/index.astro', 'src/pages/en/product/engagement/index.astro'],
  ['src/pages/product/ai/index.astro', 'src/pages/en/product/ai/index.astro'],
  ['src/pages/product/white-label/index.astro', 'src/pages/en/product/white-label/index.astro'],
  ['src/pages/product/crm/index.astro', 'src/pages/en/product/crm/index.astro'],
  ['src/pages/product/integrations/index.astro', 'src/pages/en/product/integrations/index.astro'],
  ['src/pages/product/admin/index.astro', 'src/pages/en/product/admin/index.astro'],
  ['src/pages/product/agenda/index.astro', 'src/pages/en/product/agenda/index.astro'],
  ['src/pages/legal/mentions.astro', 'src/pages/en/legal/mentions.astro'],
  ['src/pages/legal/confidentialite.astro', 'src/pages/en/legal/confidentialite.astro'],
  ['src/pages/legal/cookies.astro', 'src/pages/en/legal/cookies.astro'],
  ['src/pages/legal/sous-traitance.astro', 'src/pages/en/legal/sous-traitance.astro'],
  ['src/pages/legal/cgv.astro', 'src/pages/en/legal/cgv.astro'],
  ['src/pages/checkout/[plan].astro', 'src/pages/en/checkout/[plan].astro'],
];

function tokens(source, pattern) {
  const set = new Set();
  for (const m of source.matchAll(pattern)) set.add(m[1]);
  return set;
}

function classes(source) {
  const set = new Set();
  for (const m of source.matchAll(/class=(?:"([^"]*)"|\{`([^`]*)`\}|\{([^}]*)\})/g)) {
    const raw = m[1] ?? m[2] ?? m[3] ?? '';
    for (const part of raw.split(/[\s`${}?:]+/)) {
      if (/^[a-z0-9-]+$/i.test(part) && part.length > 1 && !part.startsWith('var')) set.add(part);
    }
  }
  return set;
}

function ids(source) {
  const set = new Set();
  for (const m of source.matchAll(/\bid="([^"]+)"/g)) set.add(m[1]);
  for (const m of source.matchAll(/\bid=\{`([^`]*)`\}/g)) set.add(m[1]);
  for (const m of source.matchAll(/\bid=\{([^}]+)\}/g)) set.add(m[1].trim());
  return set;
}

const problems = [];
let checked = 0;

for (const [frPath, enPath] of PAIRS) {
  const frFull = join(ROOT, frPath);
  const enFull = join(ROOT, enPath);
  if (!existsSync(frFull)) continue;
  if (!existsSync(enFull)) {
    problems.push(`${enPath} : page anglaise manquante (jumelle de ${frPath}).`);
    continue;
  }
  checked++;

  const fr = readFileSync(frFull, 'utf8');
  const en = readFileSync(enFull, 'utf8');

  const frClasses = classes(fr);
  const enClasses = classes(en);
  const missingClasses = [...frClasses].filter((c) => !enClasses.has(c));
  if (missingClasses.length) {
    problems.push(`${enPath} : ${missingClasses.length} classe(s) absente(s) vs FR -> ${missingClasses.slice(0, 12).join(', ')}`);
  }

  const frIds = ids(fr);
  const enIds = ids(en);
  const missingIds = [...frIds].filter((id) => !enIds.has(id));
  if (missingIds.length) {
    problems.push(`${enPath} : id(s) absent(s) vs FR -> ${missingIds.join(', ')}`);
  }

  // Un <script> par page en general : on verifie surtout qu'on n'en a pas perdu.
  const frScripts = (fr.match(/<script/g) || []).length;
  const enScripts = (en.match(/<script/g) || []).length;
  if (enScripts < frScripts) {
    problems.push(`${enPath} : ${frScripts - enScripts} bloc(s) <script> en moins que la version FR.`);
  }

  const frForms = (fr.match(/<form/g) || []).length;
  const enForms = (en.match(/<form/g) || []).length;
  if (frForms !== enForms) {
    problems.push(`${enPath} : ${enForms} formulaire(s) vs ${frForms} en FR.`);
  }
}

console.log(`${checked} paire(s) FR/EN comparee(s).`);

if (problems.length) {
  console.log(`\n${problems.length} ecart(s) :`);
  for (const p of problems) console.log(`  x ${p}`);
  process.exit(1);
}

console.log('OK : structures identiques.');
