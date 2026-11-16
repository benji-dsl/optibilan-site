/**
 * Mesure d'audience (GA4) pilotee par le consentement.
 *
 * Regles tenues par ce module :
 *   1. Aucune requete vers Google avant un clic explicite sur "Accepter".
 *   2. Le refus est aussi simple que l'acceptation, et il est conserve.
 *   3. Le choix est redemande au bout de 6 mois (recommandation CNIL).
 *   4. Le choix peut etre change a tout moment depuis le pied de page.
 *   5. Aucun identifiant personnel n'est envoye : page, type de clic, libelle.
 */

const CONSENT_KEY = 'optibilan_consent_v1';
const CONSENT_MAX_AGE_DAYS = 180;

type Choice = 'granted' | 'denied';

interface StoredConsent {
  value: Choice;
  date: string;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __optibilanConsent?: { reopen: () => void };
    __gtagLoaded?: boolean;
  }
}

const GA4_ID = document.documentElement.getAttribute('data-ga4') || '';
const banner = document.querySelector<HTMLElement>('[data-consent-banner]');

/* ------------------------------------------------------------------ */
/* Etat du consentement                                                */
/* ------------------------------------------------------------------ */
function readConsent(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed?.value !== 'granted' && parsed?.value !== 'denied') return null;
    const ageDays = (Date.now() - new Date(parsed.date).getTime()) / 86_400_000;
    if (!Number.isFinite(ageDays) || ageDays > CONSENT_MAX_AGE_DAYS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(value: Choice): void {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({ value, date: new Date().toISOString() }));
  } catch {
    // Navigation privee sans stockage : on ne mesure pas, c'est le comportement sur.
  }
}

function clearConsent(): void {
  try {
    window.localStorage.removeItem(CONSENT_KEY);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Chargement de GA4                                                   */
/* ------------------------------------------------------------------ */
function ensureGtag(): void {
  if (!GA4_ID || window.__gtagLoaded) return;

  const dataLayer: unknown[] = (window.dataLayer = window.dataLayer || []);
  // gtag.js ne lit que l'objet `arguments` ici : un tableau est ignore en silence.
  window.gtag = function gtag() {
    dataLayer.push(arguments as unknown as unknown[]);
  };

  // Consent Mode v2 : tout est refuse par defaut, la mesure n'est activee
  // qu'apres le clic, jamais avant.
  window.gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
  });
  window.gtag('consent', 'update', { analytics_storage: 'granted' });
  window.gtag('js', new Date());
  window.gtag('config', GA4_ID, {
    anonymize_ip: true,
    send_page_view: true,
    cookie_flags: 'SameSite=Lax;Secure',
  });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_ID)}`;
  document.head.appendChild(script);
  window.__gtagLoaded = true;
}

/* ------------------------------------------------------------------ */
/* Envoi d'evenements                                                  */
/* ------------------------------------------------------------------ */
function track(name: string, params: Record<string, unknown> = {}): void {
  if (readConsent()?.value !== 'granted') return;
  if (typeof window.gtag !== 'function') return;
  window.gtag('event', name, { page_path: window.location.pathname, ...params });
}

function onTrackedClick(event: MouseEvent): void {
  const target = event.target as Element | null;
  if (!target || typeof target.closest !== 'function') return;

  const langSwitch = target.closest('[data-lang-switch]');
  if (langSwitch) {
    track('language_switch', { language: langSwitch.getAttribute('data-lang-switch') });
    return;
  }

  const holder = target.closest('[data-track]');
  if (!holder) return;

  const ctaId = holder.getAttribute('data-track') || 'unknown';
  const href = holder.getAttribute('href') || '';
  const isExternal = /^https?:\/\//i.test(href) && !href.includes(window.location.hostname);
  const isFile = /\.(pdf|ics|docx?|xlsx?|zip)$/i.test(href);

  if (isFile) {
    track('file_download', { file_name: href.split('/').pop(), cta_id: ctaId });
    return;
  }

  // Deux CTA meritent leur propre nom d'evenement : ils deviennent des
  // conversions dans GA4, et un nom dedie se suit sans filtrer sur un parametre.
  const dedicated: Record<string, string> = {
    hero_cta_demo: 'demo_click',
    hero_cta_trial: 'trial_click',
  };

  track(dedicated[ctaId] ?? (isExternal ? 'outbound_click' : 'cta_click'), {
    cta_id: ctaId,
    link_url: href,
  });
}

function onFormSubmit(event: Event): void {
  const form = event.target as HTMLFormElement | null;
  if (!form || form.tagName !== 'FORM') return;
  track('form_submit', {
    form_id: form.getAttribute('data-track') || form.getAttribute('action') || form.id || 'form',
  });
}

const scrollMilestones = new Set<number>();

function onScroll(): void {
  const doc = document.documentElement;
  const ratio = (window.scrollY + window.innerHeight) / Math.max(doc.scrollHeight, 1);
  const percent = Math.round(ratio * 100);
  for (const step of [50, 90]) {
    if (percent >= step && !scrollMilestones.has(step)) {
      scrollMilestones.add(step);
      track('scroll_depth', { percent: step });
    }
  }
}

/* ------------------------------------------------------------------ */
/* Bandeau                                                             */
/* ------------------------------------------------------------------ */
function showBanner(): void {
  banner?.removeAttribute('hidden');
}

function hideBanner(): void {
  banner?.setAttribute('hidden', '');
}

function setChoice(value: Choice): void {
  writeConsent(value);
  hideBanner();
  if (value === 'granted') ensureGtag();
  document.dispatchEvent(new CustomEvent('optibilan:consent', { detail: value }));
}

/* ------------------------------------------------------------------ */
/* Demarrage                                                           */
/* ------------------------------------------------------------------ */
if (GA4_ID) {
  const stored = readConsent();

  if (!stored) {
    showBanner();
  } else {
    hideBanner();
    if (stored.value === 'granted') ensureGtag();
  }

  document.querySelectorAll<HTMLElement>('[data-consent-choice]').forEach((button) => {
    button.addEventListener('click', () => {
      const value = button.getAttribute('data-consent-choice');
      if (value === 'granted' || value === 'denied') setChoice(value);
    });
  });

  // Le pied de page propose de revenir sur son choix.
  const reopen = (): void => {
    clearConsent();
    showBanner();
    banner?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };
  window.__optibilanConsent = { reopen };
  document.querySelectorAll('[data-consent-manage]').forEach((button) => {
    button.addEventListener('click', reopen);
  });

  document.addEventListener('click', onTrackedClick, { capture: true, passive: true });
  document.addEventListener('submit', onFormSubmit, { capture: true, passive: true });
  window.addEventListener('scroll', onScroll, { passive: true });

  // Page 404 : on veut savoir quelles URL cassees sont demandees.
  if (document.querySelector('[data-notfound]')) {
    track('page_not_found', { missing_path: window.location.pathname });
  }

  // Tunnel d'achat : entree dans le paiement, puis retour de Stripe.
  const path = window.location.pathname;
  if (/^\/(en\/)?checkout\/[a-z]+\/?$/.test(path)) {
    const plan = path.split('/').filter(Boolean).pop() || 'unknown';
    track('begin_checkout', { plan });
  }
  if (/^\/(en\/)?checkout\/success\/?$/.test(path)) {
    track('generate_lead', { method: 'stripe_checkout' });
  }
}

export { track };
