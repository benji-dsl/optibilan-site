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
- Avant chaque push : montre la liste des fichiers modifiés et attends l'accord explicite de Benjamin.
- Ne supprime jamais `.git/credentials` et ne l'affiche jamais.
