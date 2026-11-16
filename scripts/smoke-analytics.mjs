#!/usr/bin/env node
/**
 * Smoke test de la mesure d'audience, dans un Chrome vierge.
 *
 * Deux scenarios, deux profils jetables :
 *   1. ACCEPTER : la balise GA4 doit charger, poser ses cookies et envoyer un
 *      hit (POST /g/collect en 204).
 *   2. REFUSER   : aucun script googletagmanager, aucun cookie _ga, aucun hit.
 *
 * Un bloqueur de publicites fausse le resultat : c'est pour ca que le test
 * lance son propre Chrome, sans extension. Ne pas le lancer depuis un navigateur
 * de tous les jours.
 *
 * Usage : node scripts/smoke-analytics.mjs [url]
 *   CHROME=/chemin/vers/chrome pour forcer le binaire.
 */
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_TO_TEST = process.argv[2] || 'https://optibilan.com/';
const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = Number(process.env.CHROME_PORT || 9334);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function runScenario(choice) {
  const profile = mkdtempSync(join(tmpdir(), `ga-${choice}-`));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-blink-features=AutomationControlled',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${profile}`,
      `--remote-debugging-port=${PORT}`,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  try {
    let target = null;
    for (let i = 0; i < 40 && !target; i += 1) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await res.json();
        target = list.find((t) => t.type === 'page') || null;
      } catch {
        /* pas encore pret */
      }
      if (!target) await sleep(250);
    }
    if (!target) throw new Error('Chrome ne repond pas');

    const ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.addEventListener('open', resolve, { once: true });
      ws.addEventListener('error', reject, { once: true });
    });

    let id = 0;
    const pending = new Map();
    const hits = [];

    ws.addEventListener('message', (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg);
        pending.delete(msg.id);
      }
      if (msg.method === 'Network.responseReceived' && msg.params.response.url.includes('/g/collect')) {
        hits.push(msg.params.response.status);
      }
    });

    const send = (method, params = {}) => {
      id += 1;
      const current = id;
      return new Promise((resolve) => {
        pending.set(current, resolve);
        ws.send(JSON.stringify({ id: current, method, params }));
      });
    };

    const evaluate = async (expression) => {
      const res = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
      return res.result?.result?.value;
    };

    await send('Page.enable');
    await send('Runtime.enable');
    await send('Network.enable');
    await send('Page.navigate', { url: URL_TO_TEST });
    await sleep(4000);

    await evaluate(`(() => {
      const btn = document.querySelector('[data-consent-choice="${choice}"]');
      if (btn) btn.click();
      return !!btn;
    })()`);
    await sleep(7000);

    const state = JSON.parse(
      await evaluate(`JSON.stringify({
        gtag: typeof window.gtag,
        scripts: document.querySelectorAll('script[src*="googletagmanager"]').length,
        cookies: document.cookie.split(';').map((c) => c.trim().split('=')[0]).filter((n) => n.startsWith('_ga')),
      })`)
    );

    ws.close();
    return { ...state, hits };
  } finally {
    chrome.kill('SIGKILL');
    rmSync(profile, { recursive: true, force: true });
  }
}

const errors = [];

const accepted = await runScenario('granted');
console.log('ACCEPTER :', JSON.stringify(accepted));
if (accepted.gtag !== 'function') errors.push('gtag non charge apres acceptation');
if (accepted.scripts === 0) errors.push('script googletagmanager absent apres acceptation');
if (accepted.cookies.length === 0) errors.push('aucun cookie _ga apres acceptation');
if (!accepted.hits.includes(204)) errors.push(`aucun hit /g/collect en 204 (recu : ${accepted.hits.join(',') || 'rien'})`);

const denied = await runScenario('denied');
console.log('REFUSER  :', JSON.stringify(denied));
if (denied.scripts !== 0) errors.push('script googletagmanager charge malgre le refus');
if (denied.cookies.length !== 0) errors.push('cookie _ga pose malgre le refus');
if (denied.hits.length !== 0) errors.push('hit envoye malgre le refus');

if (errors.length) {
  console.log(`\nECHEC (${errors.length}) :`);
  for (const e of errors) console.log(`  x ${e}`);
  process.exit(1);
}

console.log('\nOK : mesure conforme au consentement.');
