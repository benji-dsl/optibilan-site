## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)

## Déploiement (accès GitHub configuré)

- Le dépôt `benji-dsl/optibilan-site` est relié à Cloudflare Pages : chaque `git push origin main` reconstruit et met en ligne optibilan.com.
- L'accès GitHub est déjà enregistré dans ce dépôt (`.git/credentials`). Tu peux lancer `git push` toi-même, sans demander d'identifiants.
- **Avant chaque push : lance `npm run build` (doit passer 0 erreur), montre la liste des fichiers modifiés. NE DEMANDE PLUS d'accord explicite : Benjamin a demandé de committer et pousser systématiquement à chaque étape, sans attendre son feu vert.**
- Ne supprime jamais `.git/credentials` et ne l'affiche jamais.

## État actuel (19 sept 2026) — corrections launch optibilan.com

### Déployé en prod (commit `068b8dd` → Cloudflare Pages)

**✅ Tout corrigé et poussé sur `main`** :

1. **Identité légale** : "Benjamin Sant EI" → **"Elite Longevity LLC"** partout (4 pages légales + footer + Layout JSON-LD + cookies)
2. **Hero H1** : espaces corrigés sur 28 titres multi-lignes (`title="...\n ..."` format Astro) — home, 6 pages produit, security
3. **CTA secondaires** : défaut `Essayer Optibilan` → **"Essai offert"** dans `Hero.astro` + `CTA.astro` + pages concernées
4. **Double AVANT** (home + product/overview) : remplacé par **"AVANT OPTIBILAN"** / **"AVEC OPTIBILAN"**
5. **Texte workflow** : "Trois étapes pour transformer votre pratique." → **"Trois étapes pour structurer votre accompagnement."**
6. **Petits CTA** : nouveau composant `DiscoverCTA` premium (texte vert foncé semi-bold, flèche, hover translateX, 40px, radius 10px, fond transparent) — uniforme sur toutes pages
6. **Top Bar** : "Rejoindre Optibilan" / "Essai offert" uniformisés (40px, radius 10px, stable en sticky)
7. **Menu Produit** : refait en **click-based** (ouvre/ferme au clic, ferme extérieur/Escape, z-index 110, liens cliquables, stable sticky)
8. **Contraste global** : règles CSS `!important` remplaçant `text-encre/40-70` par variables WCAG AA (`--color-muted-light`, `--color-body-light`, etc.)
9. **Pages produit** : visuels/descriptions spécifiques par module (Bilans, Nutrition, Sport, Santé, Mental, IA)
10. **Nutrition** : "Modèles par objectif / pathologie" → **"Modèles personnalisables selon l'objectif et le contexte d'accompagnement"**
11. **Sport** : "Le client ne progresse pas. Le coach ne pilote pas." → **"Quand les séances et les données sont dispersées, la progression devient difficile à suivre."**
12. **Santé** : exemples interprétatifs supprimés (VFC/charge/sommeil simultanés ; habitudes vs biomarqueurs = factuel)
13. **Mental** : "Le sportif ne pratique pas..." → **"Quand exercices et retours sont dispersés, le suivi devient difficile dans la durée."**
14. **Sécurité** : "Aucune fuite cross-tenant possible" → **"Isolation validée par 13/13 tests automatisés en CI"**
15. **Pages légales** : sobres, structure Titre/Date/Contenu/Contact, entité Elite Longevity LLC

**CTA principaux conservés** : **"Rejoindre Optibilan"** / **"Essai offert"**

### En attente de déploiement Cloudflare Pages
Cloudflare Pages auto-déploie depuis `main` (build ~1 min). Le site public mettra quelques minutes à refléter les changements après push.

### Prochaines étapes
- Vérifier optibilan.com public après déploiement Cloudflare
- Build : `npm run build` (Astro statique) — 0 erreur attendue
- Pas de lint/typecheck configuré (projet Astro pur)

## Stack
- Astro 5.x + Tailwind 4.x
- Static output (SSG)
- `@astrojs/sitemap` pour sitemap.xml
- Fonts : Playfair Display (display) + Inter (body)
- Couleurs : variables CSS custom (`--color-bleu-signature`, `--color-vert`, `--color-encre`, etc.)