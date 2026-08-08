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

---

**Avant de déclarer une leçon publiable :** exactitude sourcée et datée (§1) ? chaque concept a
théorie + 2 exemples + analogie bornée + support visuel (§2) ? français et gabarit conformes
(§3) ? code vulnérable confiné et vérifié (§4) ? quiz expliqué et simulation fidèle (§5) ? Au
moindre doute sur un fait — **marqueur `à-vérifier:`, passe du `verificateur-theorie`, pas de
publication**.
