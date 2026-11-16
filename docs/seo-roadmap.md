# Feuille de route SEO : viser la première place

Ce document dit où en est le site, ce qui a été fait pour le référencement, et
ce qui reste à faire. Il distingue ce que le code peut obtenir (technique,
contenu, maillage) de ce qui demande des actions hors du dépôt (annuaires,
backlinks, autorité). Sans les secondes, la première place sur les requêtes
larges n'arrive pas, quel que soit le travail technique.

## 1. Où on en est (novembre 2026)

- Site indexé : Google renvoie déjà une dizaine d'URL sur `site:optibilan.com`.
- 96 pages, dont 47 en anglais, chacune avec son `hreflang` réciproque.
- Sitemap bilingue envoyé dans Search Console, avec `lastmod` sur les articles.
- Performance : page d'accueil sous 400 Ko, moins de 350 ms de chargement local,
  deux polices auto-hébergées, aucun script tiers bloquant.
- Données structurées : Organization, WebSite, SoftwareApplication, Breadcrumb,
  BlogPosting, FAQPage, ContactPage.
- Contenu : 10 articles historiques + les nouveaux articles de captation.

## 2. Ce que disent les vraies SERP

Relevé du 16 novembre 2026, sur Google.fr, sans personnalisation.

| Requête | Qui occupe la page 1 | Lecture |
| --- | --- | --- |
| `logiciel coaching sportif` | getapp, appvizer, nolio, sportigo, azeoo, goxpro, fitdistance, lacompagniedusport | Annuaires et concurrents installés. Requête de notoriété, à viser à 12 mois. |
| `logiciel suivi client coach sportif` | **Reddit en 1**, puis sportigo, lacompagniedusport, appvizer, nolio | Un forum en tête : la SERP est faible. C'est là qu'on peut prendre la place. |
| `logiciel pour nutritionniste` | nutritioapp, hexfit, monsuividiet, nutrium, madietenligne, capterra | Outils 100 % nutrition. On ne gagne pas frontalement : on gagne sur « nutrition + sport + santé ». |
| `logiciel marque blanche coaching` | trainero, teasio, azeoo, uteach, beedeez | Requête de niche, peu d'acteurs français. Accessible. |
| `alternative excel coach sportif` | goodcoach, theperfclub, optitrainer, gymkee, jotform | Les comparatifs règnent. Une page « méthode » peut s'y insérer. |

Conclusion : les requêtes larges sont tenues par des annuaires. Les requêtes
gagnables sont celles à intention précise (prix, outil unique, praticien de
santé, marque blanche), et les annuaires eux-mêmes, où il faut être listé.

## 3. Ce qui a été publié pour viser ces requêtes

- **/blog/logiciel-tout-en-un-coach/** : vise « logiciel tout-en-un pour coach »,
  là où les concurrents sont mono-métier. C'est le seul angle que personne ne
  peut copier sans refondre son produit.
- **/blog/prix-logiciel-coaching-sportif/** : vise « prix logiciel de coaching
  sportif », intention d'achat, SERP occupée par des pages commerciales.
- **Maillage** : les pages produit Bilans et Marque blanche pointent vers les
  articles correspondants, et les articles reviennent vers les catégories.
- **`llms.txt`** : résumé factuel du produit pour les moteurs de réponse (AI
  Overviews, ChatGPT, Perplexity), avec les prix, les fonctions et ce qu'il ne
  faut pas affirmer.
- **`lastmod`** dans le sitemap : Google sait quels articles sont neufs.

## 4. Les trois chantiers qui font la différence

### a. Être listé là où la page 1 se joue

Les annuaires occupent les trois premières places de « logiciel coaching
sportif ». Y figurer, c'est apparaître en page 1 sans attendre l'autorité de
domaine. Liste des cibles, à faire à la main (compte + fiche) :

| Site | Type | Ce qu'il faut préparer |
| --- | --- | --- |
| getapp.fr | annuaire logiciels | fiche produit, 3 captures, catégories, prix |
| appvizer.fr | annuaire logiciels | idem + vidéo courte |
| capterra.fr | annuaire logiciels | idem, version FR et EN |
| lacompagniedusport.com | média du secteur | demande de test ou d'interview, pas un lien payant |
| theperfclub.com | comparatifs coaching | proposer une fiche produit factuelle |
| optitrainer.fr | comparatif | idem |
| gymkee.com | comparatif | idem |
| Product Hunt | lancement | fiche EN, visuels 1270×760, tagline |
| AlternativeTo (EN) | annuaire | fiche EN, alternatives déclarées |

Texte de fiche à réutiliser (127 caractères, format annuaire) :

> Optibilan réunit bilans, nutrition, sport, préparation mentale et biomarqueurs
> dans un seul outil, en marque blanche. Essai 30 jours, dès 49 €/mois.

Description longue (400 caractères) :

> Optibilan est un logiciel de suivi pour coachs, nutritionnistes et praticiens
> de santé. Il rassemble les bilans, les programmes sportifs, les plans
> nutritionnels, la préparation mentale et les données de santé connectée
> (Apple Health, Oura, Garmin) dans un dossier unique par personne suivie.
> Marque blanche, API REST et hébergement européen. À partir de 49 € par mois.

### b. Backlinks

Le site n'a aujourd'hui presque aucun lien entrant, et c'est le premier
frein sur les requêtes larges. Trois sources réalistes, dans l'ordre :

1. **LinkedIn** : une page entreprise avec le domaine vérifié, et un article par
   mois qui reprend un article du blog, avec le lien en premier commentaire.
2. **Annuaires SaaS français** : il existe des listes « outils pour coachs » et
   « logiciels santé » tenues par des blogs. Un email factuel par site.
3. **Partenaires** : Supabase, Stripe, Notion et Slack ont des pages
   « intégrations » ou « qui utilise ». Une intégration publiée peut valoir un
   lien.

Un lien de qualité par mois vaut mieux que vingt annuaires génériques.

### c. Contenu récurrent

Un article par mois, une intention par article, dans l'ordre de facilité :

1. « Suivi nutritionnel et sportif dans un seul outil » (angle produit unique).
2. « Logiciel pour praticien de santé : RGPD et données de santé » (confiance).
3. « Changer de logiciel de coaching : la checklist de migration » (bas de tunnel).
4. « Marque blanche ou sous-domaine : que choisir » (décision technique).
5. « Combien de personnes suivre seul avant d'embaucher » (croissance).

Chaque article doit respecter `docs/format-article.md` et avoir sa jumelle
anglaise : `npm run check:i18n` refuse l'inverse.

## 5. Plan

**Jours 1 à 30**
- Publier les deux articles de captation, demander l'indexation dans Search
  Console (Inspection d'URL, une par une).
- Créer les fiches getapp, appvizer, capterra.
- Vérifier dans Search Console : Pages indexées, requêtes apparues.

**Jours 31 à 60**
- Trois articles de plus.
- Deux demandes de test auprès de médias du secteur.
- Page LinkedIn entreprise + un post par semaine.

**Jours 61 à 90**
- Bilan par requête : celles qui montent en 11-30, on renforce ; celles qui
  stagnent au-delà de 30, on réécrit ou on abandonne.
- Viser explicitement la première place sur trois requêtes à intention
  d'achat, pas sur la requête large.

## 6. Comment mesurer

- **Search Console → Performances** : filtrer par requête, suivre la position
  moyenne des 10 requêtes cibles. C'est la seule mesure honnête.
- **Couverture** : aucune page utile en « Explorée, non indexée ».
- **Core Web Vitals** : rester vert sur mobile, sinon Google plafonne.

Rappel : la première place sur « logiciel coaching sportif » demande de
l'autorité, donc du temps et des liens. La première place sur les requêtes
listées en section 2 est atteignable en quelques semaines de contenu et de
présence dans les annuaires.
