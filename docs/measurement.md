# Mesure d'audience (GA4) et consentement

## Ce qui est en place

- **GA4** (Google Analytics 4) est chargé **uniquement après un accord explicite**.
  Avant le clic, aucune requête ne part vers Google et aucun cookie n'est déposé.
- **Bandeau de consentement** en bas de page, deux boutons de poids visuel identique
  (Refuser / Accepter), texte traduit FR/EN, lien vers la politique cookies.
- **Consent Mode v2** : `analytics_storage`, `ad_storage`, `ad_user_data`,
  `ad_personalization` sont refusés par défaut, puis `analytics_storage` passe à
  `granted` seulement après le clic.
- **Choix conservé 6 mois** dans `localStorage` (`optibilan_consent_v1`), puis
  redemandé. Aucun cookie tiers n'est créé pour mémoriser le choix.
- **Retrait à tout moment** : bouton « Gérer les cookies » dans le pied de page, et
  « modifier mon choix » sur la page Cookies. Le retrait efface le choix et
  réaffiche le bandeau.

Tout est dans `src/scripts/analytics.ts` (chargement, consentement, événements) et
`src/components/ConsentBanner.astro` (interface).

## Activer la mesure

Le site lit la variable d'environnement **`PUBLIC_GA4_ID`**. Sans elle, rien n'est
chargé et le bandeau ne s'affiche pas : c'est l'état actuel.

1. Créer la propriété GA4 sur `analytics.google.com` (flux « Web », domaine `optibilan.com`).
2. Copier l'identifiant de mesure, de la forme `G-XXXXXXXXXX`.
3. Dans Cloudflare Pages : **Settings → Environment variables → Production**,
   ajouter `PUBLIC_GA4_ID` = l'identifiant.
4. Redéployer (`git push` ou « Retry deployment »).

En local : `PUBLIC_GA4_ID=G-XXXXXXXXXX npm run build && npx astro preview`.

## Événements envoyés

| Événement | Déclencheur | Paramètres |
| --- | --- | --- |
| `page_view` | chargement de page (automatique) | `page_path` |
| `cta_click` | clic sur un élément `data-track` interne | `cta_id`, `link_url` |
| `outbound_click` | clic vers un domaine externe | `cta_id`, `link_url` |
| `file_download` | clic vers un `.pdf`, `.ics`, `.zip` | `file_name` |
| `form_submit` | envoi d'un formulaire (contact, newsletter) | `form_id` |
| `language_switch` | clic sur le drapeau FR/US | `language` |
| `scroll_depth` | 50 % et 90 % de la page atteints | `percent` |
| `page_not_found` | page 404 servie | `missing_path` |

Les `data-track` existants (`hero_cta_demo`, `hero_cta_trial`, `contact_submit`,
`newsletter_submit`, `docs_pricing`, `404_*`, `security_contact`, …) sont repris
tels quels dans `cta_id` : aucun attribut à réécrire dans les pages.

## Vérifier après activation

1. Ouvrir le site en navigation privée : le bandeau apparaît, l'onglet Réseau ne
   montre **aucune** requête `googletagmanager.com`.
2. Cliquer sur Accepter : la requête part, l'événement `page_view` apparaît dans
   GA4 → Temps réel.
3. Recharger : le bandeau ne revient pas.
4. Pied de page → « Gérer les cookies » : le bandeau revient, le choix est effacé.
5. Refuser, puis vérifier dans l'onglet Application qu'aucun cookie `_ga` n'existe.

## Pourquoi pas de bandeau géant

Le bandeau est une barre basse, non bloquante, avec un refus aussi accessible que
l'acceptation. C'est ce que demande la CNIL : pas de case pré-cochée, pas de
« tout accepter » mis en avant, et un retrait aussi simple que le consentement.
