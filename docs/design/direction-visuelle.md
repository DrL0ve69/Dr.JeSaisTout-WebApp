# Direction visuelle — Dr. Je-Sais-Tout

> Objectif : un site **distinctif, moderne, interactif** — l'antithèse du « AI-slop » (dégradés
> violets, glassmorphism réflexe, cartes arrondies interchangeables, emojis en guise d'icônes).
> Le personnage : **Dr. Je-Sais-Tout**, savant sympathique — érudit, un brin théâtral, jamais
> infantilisant. Le public est cégep/universitaire : on vise la complicité intelligente, pas le
> gimmick enfantin.
>
> Ce document fixe la direction et les garde-fous ; il sert de brief à l'implémentation (E1).
>
> ⚠️ **Corrigé le 2026-08-04** — les versions précédentes renvoyaient la maquette à un skill
> `frontend-design` qui **n'existe pas** (constat C1, `docs/revue-plan-kb-2026-08-04.md`). La
> méthode d'exploration retenue à sa place est décrite dans le backlog, sous-tâche **E1-ST3**, et
> s'appuie sur les fiches KB `web/frontend/principes-design-visuel.md` et
> `ai/agents/claude-code/design-ui.md`.

---

## 1 · Trois directions candidates

### A — « Carnet de laboratoire » *(recommandée — voir §2)*

L'esthétique d'un carnet de recherche tenu par un savant méticuleux : papier structuré, annotations,
schémas à main levée précise, tampons et marginalia. Sérieux dans le fond, chaleureux dans la forme.

| Axe | Proposition |
|---|---|
| Ambiance | Papier ivoire/os (clair) et ardoise encrée (sombre) ; grille apparente discrète (règlure de carnet) ; encre comme couleur d'action |
| Typographie | Titres : une **serif à caractère** (ex. Fraunces ou équivalent open source, graisses optiques marquées) ; corps : sans-serif humaniste lisible (ex. Inter/Source Sans) ; code : mono soignée avec ligatures désactivables |
| Couleur | Encre bleu-noir profonde + **un accent « encre rouge de correction »** pour le vulnérable et un vert d'annotation pour le corrigé — la sémantique vulnérable/corrigé devient la signature chromatique du site |
| Motifs signature | Encadrés « ⚠️ note du Dr. » façon marginalia ; numéros de modules en tampons ; diagrammes style schéma de labo (traits nets, hachures) ; séparateurs en règlure |
| Risque | Tomber dans le vintage poussiéreux → contrer par une mise en page très contemporaine (grille asymétrique, blancs généreux, micro-interactions nettes) |

### B — « Console clinique »

L'univers du terminal et de l'audit de sécurité, assumé mais raffiné : fonds sombres par défaut,
mono en vedette, accents phosphore.

| Axe | Proposition |
|---|---|
| Ambiance | Sombre dominant, panneaux mats (pas de glass), lignes de scan subtiles |
| Typographie | Mono d'affichage pour les titres, sans-serif neutre pour le corps |
| Couleur | Noir bleuté + vert phosphore/ambre en accents ; rouge réservé au « vulnérable » |
| Motifs signature | Prompts `$` comme puces, sorties d'outils stylisées, badges CVSS |
| Risque | Cliché « hacker » vu partout ; thème clair peu naturel ; intimidant pour la phase 3 (sujets non-sécurité) — **écartée** pour ces raisons |

### C — « Cabinet de curiosités moderne »

Musée personnel du savoir : chaque module est une « pièce de collection » avec cartel, illustrations
gravure revisitées, palette riche.

| Axe | Proposition |
|---|---|
| Ambiance | Fonds profonds (vert bouteille/bordeaux), cadres fins, compositions muséales |
| Typographie | Didone élégante pour les titres, sans-serif pour le corps |
| Couleur | Palette de musée : verts profonds, ocres, laiton |
| Motifs signature | Cartels d'exposition, numérotation en plaques, gravures détournées |
| Risque | Très exigeant en illustrations sur mesure pour un dev solo ; peut paraître décoratif plutôt que pédagogique — **écartée** (coût illustratif), mais ses cartels inspirent les en-têtes de modules |

## 2 · Direction retenue : **A — Carnet de laboratoire**

Pourquoi elle gagne :

- **Cohérente avec le personnage** : le carnet est l'attribut naturel du savant sympathique —
  crédible pour un public cégep/universitaire, extensible aux futurs sujets (phase 3) là où la
  console (B) enfermerait le site dans la sécurité.
- **Signature chromatique pédagogique** : encre rouge = vulnérable, vert d'annotation = corrigé.
  Le design system porte littéralement la pédagogie (`CodeCompareComponent`).
- **Soutenable en solo** : la marginalia, les tampons et les schémas à traits se font en
  SVG/CSS ; pas besoin d'un fonds d'illustrations comme C.
- **Deux thèmes naturels** : papier ivoire (clair) / ardoise encrée (sombre) — aucun des deux n'est
  un « mode inversé » de l'autre.

Éléments d'identité à décliner (E1, selon la méthode d'exploration d'E1-ST3) :

1. Logotype « Dr. Je-Sais-Tout » typographique (serif + tampon), pas de mascotte cartoon.
2. En-têtes de module façon page de garde de carnet : numéro tamponné, titre serif, question-clé de
   la fiche KB en exergue.
3. Encadrés sémantiques : « note du Dr. » (marginalia), « ⚠️ cours vs état de l'art » (encre rouge),
   « à retenir » (surligneur discret).
4. Micro-interactions : transitions brèves et physiques (rien de flottant/parallaxe gratuit),
   états de quiz nets (juste/faux = annotation, pas confetti).

## 3 · Garde-fous « anti AI-slop » (bloquants en revue)

| # | Règle |
|---|---|
| G1 | **Pas de dégradés violets génériques** ni de duos indigo→rose ; les dégradés, rares, restent dans la gamme encre/papier |
| G2 | **Pas de glassmorphism par défaut** (blur/transparence réflexe) ; les surfaces sont mates et structurées |
| G3 | **Typographie affirmée** : hiérarchie marquée (serif de caractère en display), jamais la stack système par défaut faute de décision |
| G4 | **Illustrations et diagrammes cohérents** : un seul langage graphique (traits de carnet) ; pas d'icônes dépareillées, **pas d'emojis** en guise d'iconographie UI |
| G5 | **Thème clair + sombre** dès E1, tous deux dessinés (pas d'inversion automatique) ; respect de `prefers-color-scheme` avec bascule manuelle persistée |
| G6 | **`prefers-reduced-motion` respecté** : toute animation a une variante réduite ; les simulations pas-à-pas restent pilotables sans animation |
| G7 | **Jetons sémantiques SCSS** obligatoires (`--color-surface`, `--color-ink`, `--color-danger-vuln`, `--color-ok-fixed`, échelles espacement/typo) ; aucune couleur ou taille en dur dans les composants |
| G8 | Contraste et focus : AA minimum partout (viser AAA pour le corps de texte), focus visible dessiné (pas l'outline supprimé) — cohérent avec la barre WCAG 2.2 AA / zéro violation AXE |
| G9 | Le sombre n'est pas « noir + couleurs criardes » : ardoise encrée, accents désaturés recalibrés |

## 4 · Mise en œuvre

- Les jetons vivent dans le design system SCSS (E1-ST1 du backlog) : couches `primitives →
  sémantiques → composants`, exposés en custom properties CSS pour le theming clair/sombre.
- La home (E1) est la première application complète de la direction : elle passe par l'exploration
  visuelle décrite en E1-ST3 avant implémentation, et sert de référence visuelle aux pages de
  leçon (E2).
- **G2 est fondé, pas seulement affaire de goût** : `web/frontend/principes-design-visuel.md`
  recommande la « depth » (texture, glassmorphism subtil) — mais tranche dans le même sens que nous
  sur le cas qui nous occupe, en excluant ces effets des produits « où la clarté et la vitesse de
  scan priment ». Un site de cours est un produit de lecture.
- **Polices auto-hébergées obligatoirement** (CSP `font-src 'self'`, aucun hôte externe) : c'est un
  livrable d'E1-ST1, avec vérification du sous-ensemble de glyphes sur du français réel (accents,
  **œ**, guillemets **« »**). Tant qu'il n'est pas fait, G3 reste en écart assumé.
- Toute dérive détectée en revue (`code-reviewer`) se juge contre les garde-fous G1–G9 de ce
  document, qui prévaut sur les goûts du moment.
