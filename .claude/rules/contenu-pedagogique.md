---
paths:
  - "content/**"
  - "tools/content-pipeline/**"
  - "docs/contenu/**"
  - "src/app/features/cours/**"
---

<!--
PORTÉE DE CHEMIN, posée le 2026-08-20. Sans le `paths:` ci-dessus, ce fichier était chargé
INCONDITIONNELLEMENT dans chaque session et chaque sous-agent (doc officielle : « Rules without
a `paths` field are loaded unconditionally »). Mesuré le même jour : ~74 000 tokens de préambule
permanent par sous-agent, dont ~10 600 pour les cinq fichiers de `.claude/rules/`.

POURQUOI CELUI-CI EST SCOPABLE. Barre de qualité éditoriale : elle ne sert que devant du contenu. ⚠️ Filet indispensable, parce qu’une règle à portée de chemin se déclenche quand Claude LIT un fichier apparié — un agent qui CRÉE une leçon pourrait n’en lire aucune : `professeur-web` (§2 de sa définition) et `verificateur-theorie` (§3) chargent donc ce fichier NOMMÉMENT, sans dépendre de la portée.

⚠️ CE QUE LA PORTÉE COÛTE, dit ici pour que personne ne le redécouvre : une règle à `paths:`
n'est PAS réinjectée après un `/compact` (doc : elle se recharge à la prochaine lecture d'un
fichier apparié). Une règle dont la perte en cours de session serait grave — sécurité, budget —
reste donc SANS portée, délibérément. Voir `.claude/rules/agent-context-budget.md` §7.
-->

# Contenu pédagogique — la barre de qualité d'une leçon (Dr. Je-Sais-Tout)

> **Ce que c'est.** La barre **non négociable** qu'une leçon de `content/` doit franchir avant
> d'être déclarée publiable. Elle traduit la vision du propriétaire (README.txt) en critères
> vérifiables. S'applique à toute création/modification de leçon — `professeur-web` la charge
> avant d'écrire, `verificateur-theorie` s'en sert comme grille. Le contrat technique (gabarit,
> schémas JSON) vit dans `docs/contenu/pipeline-contenu.md` ; cette règle dit **ce qui rend une
> leçon bonne**, le pipeline dit **quelle forme elle prend**.
>
> **Règle d'or :** *on n'enseigne jamais du faux, et on n'enseigne jamais du vrai que le lecteur
> ne peut pas comprendre.* Les deux moitiés comptent autant.

---

## 1 · Exactitude — le vrai avant le beau

- [ ] **Toute affirmation technique est vérifiable** — et vérifiée (par la fiche KB source, par
      une source primaire, ou marquée `à-vérifier:` pour le vérificateur). Aucune affirmation
      « de mémoire » non sourcée dans une leçon publiée.
- [ ] **Datée si périssable** : recommandations (itérations de hachage, tailles de clés),
      millésimes (OWASP Top 10 2021/2025), versions, politiques (NIST) portent leur date ou
      version. « Recommandé » sans date est un futur mensonge.
- [ ] **Sources citées** : frontmatter `fiches-sources` (chemins KB) + section « Aller plus
      loin » avec les fiches KB et, quand la fiche les donne, les sources originales.
- [ ] **Les analogies sont bornées** : chaque analogie dit où elle casse. Une analogie qui
      survend est une erreur d'exactitude, pas un détail de style.
- [ ] Précédent réel à garder en tête : le cours d'origine contenait ~12 erreurs (salt=username,
      RSA 1024, « MD5 : collisions théoriques »…). La KB héritée est faillible ; le doute se
      marque, il ne se publie pas.

## 2 · Pédagogie — l'exigence centrale du projet

Chaque **concept** de la leçon présente :

- [ ] **(1) une explication théorique rigoureuse** et progressive — du connu vers l'inconnu,
      chaque terme défini à sa première apparition ;
- [ ] **(2) un exemple simple ET un plus complexe** — le simple isole le mécanisme, le complexe
      le montre en situation réaliste ;
- [ ] **(3) une analogie imagée quand c'est possible** — système routier, quartiers/maisons,
      cadenas/videur de bar… (tradition d'imagerie en informatique) ;
- [ ] **(4) des exercices/diagrammes/images** qui aident la compréhension — au minimum le quiz,
      idéalement une simulation pas-à-pas quand le sujet décrit un flux ou une attaque.

Et la leçon dans son ensemble :

- [ ] **Objectifs d'apprentissage observables** (« expliquer pourquoi… », « repérer la faille
      dans… ») — pas « comprendre X ».
- [ ] **Prérequis explicites** pointant les leçons ou notions nécessaires.
- [ ] **Résumé final** : les 3-5 points que le lecteur doit retenir s'il ne retient rien d'autre.
- [ ] **Pourquoi avant comment** (même exigence que `KnowledgeBase/CONVENTIONS.md`) : quel
      problème le concept résout, quand il ne s'applique pas.

## 3 · Forme — français et structure

- [ ] **Français correct**, niveau vulgarisation **accessible mais rigoureux** (public phase 1 :
      cégep/université). Termes techniques conservés dans leur langue d'usage (XSS, payload,
      token) avec définition française à la première mention.
- [ ] **Structure conforme au gabarit** de `docs/contenu/pipeline-contenu.md` : frontmatter
      complet, sections dans l'ordre, nommage `content/<sujet>/<nn>-<slug>/`.
- [ ] **Diagramme Mermaid obligatoire** dès qu'un flux, une séquence d'attaque ou une
      architecture est expliqué (`sequenceDiagram` pour un échange, `flowchart` pour une
      décision/architecture). Un paragraphe qui décrit un aller-retour en prose seule est
      incomplet.
- [ ] **Blanches insécables : U+00A0 et rien d'autre.** Le contenu n'emploie **jamais** U+202F
      (espace fine insécable) ni U+2009 (espace fine). Contrainte matérielle née d'E1-ST1-B, pas une
      préférence de style : **U+202F est absente de Fraunces comme d'Inter**, et U+2009 n'est portée
      que par Inter — titres et corps ne s'espaceraient donc pas pareil. Le sous-ensemble maison qui
      les récupérerait est précisément ce qui casse `œ`, `« »` et `’` en silence : il est interdit.
- [ ] **La flèche « → » (U+2192) est rendue par la police de repli** — écart assumé, pas une
      erreur : le gate `tools/design/verifier-glyphes.mjs` l'imprime à chaque exécution. À savoir
      avant de bâtir une notation sur elle (`client → serveur`) : elle ne portera pas l'œil
      typographique du reste de la page. Un diagramme Mermaid, lui, n'est pas concerné.
      Les deux gates **échouent** si l'un de ces caractères devenait couvert, pour que ces consignes
      ne survivent pas à leur propre péremption. Détail : [`docs/design/polices.md`](../../docs/design/polices.md).

## 4 · Code d'exemple — vulnérable sans être dangereux

- [ ] Le code vulnérable vit **UNIQUEMENT dans des blocs d'exemple marqués** selon le pipeline
      (blocs annotés `vulnerable`/`corrige`) — jamais dans du code exécutable du site, jamais
      dans un extrait qu'un composant pourrait interpréter. Le site MONTRE des failles, il n'en
      contient pas.
- [ ] **Vulnérable et corrigé côte à côte**, annotés : la ligne fautive est désignée, le
      correctif expliqué (pourquoi il corrige, pas juste quoi taper).
- [ ] Le code « vulnérable » illustre **la vulnérabilité annoncée** (vérifié par le
      `verificateur-theorie`) ; le « corrigé » est une vraie parade, pas un cache-misère (une
      liste noire présentée comme défense n°1 est un constat INEXACT).
- [ ] Payloads d'exemple **inoffensifs et pédagogiques** (`alert('XSS')`, données fictives) —
      jamais d'exfiltration réelle prête à l'emploi vers une URL réelle.

## 5 · Quiz et simulations

- [ ] Chaque question porte une **explication de réponse** : pourquoi la bonne réponse est bonne
      ET, pour les distracteurs plausibles, pourquoi ils sont faux. Jamais juste
      « bonne réponse : B ».
- [ ] Les questions testent la **compréhension** (repérer une faille, prédire un comportement,
      choisir la parade), pas la mémorisation de la formulation de la leçon.
- [ ] Chaque question référence sa fiche KB source (`ficheSource`) — traçabilité du savoir.
- [ ] Une simulation raconte une **histoire techniquement fidèle** : chaque étape a une narration
      ET un état visuel ; la séquence complète correspond au diagramme Mermaid de la leçon.

## 6 · Provenance — séparer la matière d'examen du complément

> **Née le 2026-08-19**, de l'exigence explicite du propriétaire lors de la passe E3-ST0. Le site
> sert d'abord à **étudier les cours du cégep** (420-B10-HU sécurité, 420-4P2-HU PHP). Deux
> échecs symétriques sont donc possibles, et tous deux sont graves : **omettre** de la matière
> d'examen, ou **présenter comme examinable** ce que l'enseignant n'a jamais enseigné. Un étudiant
> qui révise le second perd son temps ; un étudiant à qui manque le premier perd des points.

**Les trois marqueurs, déjà en vigueur dans les fiches de `KnowledgeBase\web\securite\` et
`web\php\` — les reprendre à l'identique, ne pas en inventer d'autres :**

| Marqueur | Sens | Statut à l'examen |
|---|---|---|
| **📘 Cours** | présent tel quel dans les diapositives ou les exercices publiés de l'enseignant | **matière d'examen** |
| **🧩 Complément KB** | ajout de la base de connaissances, absent du cours | utile en production, **pas exigible** |
| **⚠️** | le cours dit quelque chose de **périmé, d'imprécis ou de faux** | le texte du cours est **conservé** ; la correction est donnée à côté, **sourcée et datée** |

- [ ] **Une leçon n'aplatit jamais la distinction que sa fiche source porte.** Si la fiche marque
      un passage 🧩 et que la leçon le présente sans le dire, l'information de provenance est
      **perdue au moment exact où elle sert** — c'est le lecteur, pas la fiche, qui passe l'examen.
- [ ] **La règle d'arbitrage s'écrit dans la leçon, pas seulement dans la fiche** :
      *« à l'examen, donne la réponse du cours ; en production, applique la correction »*.
- [ ] **Un ⚠️ ne supprime jamais le contenu qu'il corrige.** On conserve ce que l'enseignant
      enseigne — c'est ce qui sera évalué — et on explique **pourquoi** c'est faux et **quoi faire
      à la place**. Un encadré qui efface la version du cours rend la leçon inutilisable pour
      réviser.
- [ ] **Un ⚠️ qui accuse le cours à tort est un défaut grave**, au même titre qu'une erreur
      technique : il salit un enseignant sur la foi d'une lecture trop rapide. Toute correction
      passe par le `verificateur-theorie` avant publication.
- [ ] **Le cours est SOMMAIRE par nature** — un concept présent n'y est presque jamais traité en
      entier. Combler le trou est **attendu** ; le combler **en silence** ne l'est pas.

**✅ Décision de rendu TRANCHÉE par le propriétaire le 2026-08-20 (voie b) — plus une note
flottante.** Le pipeline porte désormais **six** variantes d'encadré — `attention`, `note`,
`a-retenir`, **`cours`**, **`complement`**, **`correction-du-cours`**
(`tools/content-pipeline/compiler-markdown.mjs`,
`VARIANTES_ENCADRE`), plutôt que la voie (a), qui aurait réemployé `note`/`attention` avec un préfixe
en gras — insuffisant précisément parce qu'elle ne rendait la distinction ni stylable ni vérifiable
par un gate. Syntaxe et attributs : [`docs/contenu/pipeline-contenu.md`](../../docs/contenu/pipeline-contenu.md),
section « Encadrés — les six variantes ». Trois règles hors schéma la rendent vérifiable, plutôt que
déclarative :

- **G1** — aucun pictogramme **📘/🧩/⚠️** littéral dans le corps d'une leçon (hors bloc de code) :
  le pictogramme est posé par le rendu, jamais tapé par l'auteur. Le **⚠️** est couvert depuis le
  2026-08-20 (il ne l'était pas, alors que ce document l'annonçait déjà) : c'est le plus important
  des trois, puisque écrit en prose il **accuse l'enseignant sans passer par G3**, donc sans source.
  Les deux formes de saisie sont refusées, U+26A0 nue comme U+26A0 U+FE0F.
  ⏳ **Trou connu, non fermé :** G1 balaie la source **brute**, or markdown-it décode les entités —
  une entité numérique (`&#x26A0;`, `&#x1F4D8;`…) produit le pictogramme dans la page publiée sans
  que G1 le voie (mesuré le 2026-08-20). La parade est de porter G1 sur la **sortie compilée** — les
  nœuds texte de l'AST hors blocs `code`, où les entités sont résolues — et non d'énumérer des
  motifs d'entités, qui serait la liste noire que `.claude/rules/security.md` §4 interdit. Lot à part.
- **G2** — toute leçon `statut: publiee` porte au moins un encadré `cours` ou `complement`.
- **G3** — un `correction-du-cours` sans `{source="…"}` non vide est refusé.

⚠️ **Ce qui n'existe PAS, et pourquoi : aucun compte de provenance déclaré au frontmatter.** Un
compte que l'auteur écrirait lui-même à côté des encadrés qu'il pose serait une preuve fabriquée par
l'entrée qu'elle prétend vérifier — le patron que `.claude/rules/security.md` §4 nomme **S-014** :
un garde-fou dont l'entrée peut fabriquer la preuve qu'il exige n'en est pas un. La fidélité réelle
d'une leçon à sa fiche source — est-ce que ce qui est marqué `cours` est vraiment dans le cours, est-ce
qu'un `complement` n'est pas en réalité examinable — reste vérifiée par lecture de la source : c'est
le rôle du `verificateur-theorie`, pas d'un compte auto-déclaré.

---

**Avant de déclarer une leçon publiable :** exactitude sourcée et datée (§1) ? chaque concept a
théorie + 2 exemples + analogie bornée + support visuel (§2) ? français et gabarit conformes
(§3) ? code vulnérable confiné et vérifié (§4) ? quiz expliqué et simulation fidèle (§5) ? provenance 📘/🧩/⚠️ préservée depuis la fiche source (§6) ? Au
moindre doute sur un fait — **marqueur `à-vérifier:`, passe du `verificateur-theorie`, pas de
publication**.
