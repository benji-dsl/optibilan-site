# Format article Optibilan — source de vérité

Tout article du blog DOIT respecter ce format. Le contrat est vérifié automatiquement par
`npm run validate:articles` (branche sur `npm run check`, qui est le gate avant push).
Un article non conforme = build en échec. Ne pas déroger aux règles : corriger l'article.

## 1. Volume et découpe

| Règle | Valeur |
|---|---|
| Volume total | **1500 à 2200 mots** (corps de l'article, hors FAQ et Sources) |
| Sections H2 de contenu | **4 à 6** |
| Paragraphes par section H2 | **exactement 3** |
| Phrases par paragraphe | **4 à 8** |

Structure d'un article, dans cet ordre exact :

```
<p> introduction (1 paragraphe, 4-8 phrases, contient le mot-clé principal)
<h2> section 1  → 3 paragraphes
<h2> section 2  → 3 paragraphes
...
<h2> section N (4 à 6)  → 3 paragraphes
[ <table> obligatoire si le sujet porte une valeur mesurable ]
<h2> Sources   → liste de liens numérotés
<h2> Questions fréquentes → 6 questions en H3, réponse 2-4 phrases
```

## 2. Les titres

- Les H2 sont **affirmatifs et compréhensibles seuls**. Interdits : forme interrogative,
  allusions, clickbait, pronouns sans antécédent.
- **Les questions sont réservées à la FAQ.** Aucune question dans un H2 de contenu.
- Le **mot-clé principal apparaît 3 fois** : dans le `<title>`, dans l'introduction,
  et dans le **premier H2**.
- Longueur d'un H2 : 25 à 90 caractères.

## 3. Les mots-clés secondaires

- Déclarés dans `seoKeywords` : `seoKeywords[0]` = principal, `[1..n]` = secondaires.
- Chaque mot-clé secondaire est traité **dans sa propre section ou dans la FAQ**.
- Le mot-clé est employé **tel quel** dans le titre de la section, ou dans la première
  phrase de la section. Ne pas recopier une formulation bancale.
- Un mot-clé qui ne trouve pas sa section doit être retiré de `seoKeywords`.

## 4. Tableau

- **Obligatoire** dès que le sujet porte une valeur mesurable (tarifs, durées, volumes,
  pourcentages, seuils, calculs). Sinon, renseigner `noTable: true` et justifier.
- Tableau sémantique : `<table>` avec `<thead>` (ligne d'en-têtes) et `<tbody>`.

## 5. Sources

- Une section H2 « Sources », **avant la FAQ**, qui reprend **toutes** les sources utilisées.
- Déclarée dans le champ `sources: [{ label, url }]`. Rendue automatiquement.
- Les URL sont des sources d'autorité, réellement consultables.

## 6. FAQ

- **6 questions exactement**, en H3, réponses de 2 à 4 phrases.
- Déclarée dans le champ `faq: [{ q, a }]`. Rendue automatiquement.
- Un balisage **JSON-LD `FAQPage`** est généré depuis le même champ : il ne faut pas
  écrire la FAQ à la main dans le HTML.

## 7. Liens

- **3 liens externes d'autorité minimum**, vers 3 domaines distincts.
- Pas de lien interne dans le corps de l'article : le maillage interne se fait via
  les catégories et « À lire aussi ».

## 8. Les images

- **Exactement 3 photos** dans le corps de l'article, réparties sur les sections.
- Chaque image a une **balise `alt` adaptée**, décrivant ce que montre la photo
  (10 caractères minimum, pas de « image de », pas de nom de fichier).
- Format : `<figure>` + `<img>` + `<figcaption>` (la légende est obligatoire).
- La 1re image sert de `featuredImage` (visuel de carte et image sociale).

## 9. Métadonnées

| Champ | Règle |
|---|---|
| `seoTitle` | **≤ 60 caractères**, contient le mot-clé principal |
| `seoDescription` | **≤ 155 caractères**, **fermée par un point**, **sans points de suspension** |
| `excerpt` | 120 à 200 caractères, se terminant par un point |

## 10. Checklist avant commit

```bash
npm run check
```

Si le validateur échoue, corriger l'article. Ne jamais contourner le validateur.