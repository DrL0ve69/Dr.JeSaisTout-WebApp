# ⏭️ REPRISE — Refonte « leçons actionnables » (ouverte le 2026-08-31)

> **À lire en premier dans toute session qui reprend ce chantier.** Ce fichier n'est PAS
> auto-injecté : `CLAUDE.md` n'en porte qu'une ligne de pointeur, délibérément — un bloc de reprise
> qui accumule l'historique d'un épic est payé par **chaque agent de chaque session**
> (`.claude/rules/agent-context-budget.md` §7). Le détail vit ici.
>
> **Branche : `feat/refonte-lecons-actionnables`**, partie de `main` à `05e3ff2`.
> Un seul commit pour l'instant : `da1ef65` (l'extracteur de diapositives).

---

## 1 · La demande du propriétaire, telle qu'elle a été faite

Le 2026-08-31, après avoir lu le module `11-projet-de-session` **en ligne**, il a dit ne pas
pouvoir s'en servir pour **agir** : la théorie est bonne, mais on s'y perd dès qu'on cherche une
commande. Cinq exigences, qui valent pour **tous** les modules et non pour le seul module 11 :

1. **Une marche à suivre concise, d'entrée de jeu** — les commandes dans l'ordre, avec de courtes
   explications en commentaire dans le bloc de code, ou une phrase par étape dans un tableau / un
   pas-à-pas. Chaque étape dit **pourquoi**, ou **renvoie vers la théorie plus bas** dans la page,
   ou vers un autre module.
2. **Les diapositives concernées s'affichent dans les titres et sous-titres, sur les étapes, les
   actions, la théorie, les commandes — ET dans le sommaire de la barre latérale.** Entre
   parenthèses. ⚠️ **Le nom du COURS n'est nécessaire que pour le projet de session**, qui mêle
   420-B10-HU et 420-4P2-HU ; un module ordinaire appartient à une seule séance, le cours y est
   implicite.
3. **Une passe `/feature-cycle` complète pour planifier la refonte**, parce qu'elle s'appliquera
   ensuite aux dix modules publiés. Module 11 d'abord.
4. **Comparer deux méthodes se fait par ONGLETS** — méthode du cours contre équivalent moderne /
   meilleure pratique / plus simple. On clique, l'option cliquée **garde le focus**, on revient à la
   méthode enseignée d'un clic. Pas d'empilement vertical.
5. Le but est **l'action** : accomplir la tâche générale, ou les sous-tâches et commandes du sujet.
6. **Jusqu'à 2 sous-agents à la fois** pour cette session (contrainte donnée par le propriétaire).
7. **Conserver la trace de la refonte** pour ne pas avoir à se répéter → ce fichier, plus les deux
   mémoires `lecons-actionnables-exigence` et `supports-de-cours-extraits-mesures`.

---

## 2 · Ce qui est DÉJÀ FAIT, et mesuré

### 2.1 · L'outil qui rend les renvois de diapositives possibles — livré et commité

`tools/supports-cours/extraire-diapositives.mjs` convertit un `.pptx` en un fichier texte d'**une
ligne par diapositive**, préfixée de son **rang de présentation** :

```
node tools/supports-cours/extraire-diapositives.mjs <fichier.pptx> <sortie.txt>
```

- Le rang vient de `ppt/presentation.xml` + `presentation.xml.rels`, **jamais** du nom de fichier :
  `slide10.xml` précède `slide2.xml` en ordre alphabétique. C'est ce rang que `diapos="…"` doit citer.
- **Contrôle positif exécuté** : repassé sur les cinq extraits de 420-B10-HU qui existaient déjà →
  même compte, même ordre, même texte. Seul écart : l'outil **décode** les entités XML
  (`&lt;` → `<`), ce que l'extraction précédente ne faisait pas.
- Motif d'existence : aucun outil d'agent ne lit un `.pptx`, et `WebFetch` a déjà rendu une lecture
  **inventée** d'un support — qui confirmait ce qu'on cherchait — avant de répondre « ABSENT » sur
  relance verbatim.

### 2.2 · Les supports téléchargés le 2026-08-31 (dossiers gitignorés)

| Dossier | Cours | Contenu |
|---|---|---|
| `php-2026/extraits/` | **420-4P2-HU** (PHP) | Cours 1 (111 diapos), 2 (60), 3 (74), 4 (53), 5 (73), 7 (78), 8 (103) · exercices des cours 1 à 5 · `Projet_de_Session_PHP.txt` |
| `securite-app-web-2026/extraits/` | **420-B10-HU** (sécurité) | Cours 1 à 5 déjà présents · **neufs** : cours 7 (39), 9 (58), 10 (106) |

`php-2026/extraits/PROVENANCE.md` porte le détail, les comptes et les réserves. **Le lire avant de
citer quoi que ce soit.**

### 2.3 · Deux questions ouvertes du backlog, refermées au passage

- 🔴 **N-6 tranché : l'énoncé du projet de session de 420-B10-HU N'EST PAS PUBLIÉ.** Vérifié le
  2026-08-31 sur <https://www.alexandrepetrin.ca/securisation-des-applications-web/> — la ligne
  « Cours 11 · 16 octobre · Projet de session (20 %) » ne porte **aucun** lien de document. Ce n'est
  pas un fichier introuvable, c'est un document que l'enseignant n'a pas encore mis en ligne.
  L'enseignant publiant en cours de session, **rouvrir cette page et réécrire la date** avant toute
  affirmation sur la portée du projet de B10.
- ⚠️ **Le projet de session de PHP, lui, existe** (`Projet_de_Session_PHP.pdf`) mais **ne se lit
  qu'en partie** : le PDF n'a livré qu'un flux de contenu, et le corps de la section « Évaluation »
  ainsi que sa grille manquent. Lisible : application web appliquant les concepts du cours (syntaxe
  PHP, serveurs virtuels, variables de session, bases de données, POO), **contexte fictif** inventé
  par l'étudiant, **individuel**, **10 %**. ⚠️ Ce 10 % contredit la **diapositive 6 du cours 1 de
  PHP** (« Cours 11 Projet de session : 15 % ») — contradiction **dans les documents de
  l'enseignant**, non tranchée, même famille que celle déjà consignée pour B10
  (`docs/contenu/ancrage-au-cours.md` §0). Toute affirmation qui en dépend porte `à-vérifier:`.

### 2.4 · Gate de référence, avant toute modification

`npm run content:build` **vert** au 2026-08-31 : **10 leçons compilées**, 5/5 sur le gate de poids,
0 dépassement. C'est la ligne de base à laquelle comparer.

---

## 3 · L'état des deux sous-agents lancés en parallèle

### ✅ L'architecte a rendu — `docs/design/refonte-lecons-actionnables.md`

Le dossier de décision **et** le plan par lots sont sur disque. **C'est le document à lire avant
toute chose** : quatre décisions à trancher par le propriétaire (D-A marche à suivre, D-B renvoi de
diapos sur les titres et dans le sommaire, D-C conteneur à onglets, D-D stratégie de reprise), douze
lots dimensionnés, et sept risques nommés dont trois demandent une **mesure** avant de coder.

🔴 **Trois choses de ce dossier qui appellent une décision du propriétaire, pas de l'exécutant :**

- **R-3 — `11-projet-de-session` ne PEUT PAS déclarer `seance: 11`.** La séance 11 porte une
  `evaluation`, et `ancrage-au-cours.md` §2 l'interdit alors. Le module de la séance 11 s'affiche
  donc « Complément · hors cours ». Assouplir la règle ou l'assumer est un **choix de contrat**.
- **R-7 — la reprise des dix modules pèse ~12 runs de rédaction**, à mettre en concurrence avec le
  contenu neuf des séances restantes. **Lequel passe devant ?**
- **R-4 — un onglet masqué échappe au `Ctrl+F`.** Coût réel, borné mais non levé ; c'est le seul
  motif de ST4-1 qui se rejoue. Si le propriétaire le juge inacceptable, l'option de repli est écrite.

⚠️ **Deux défauts de brief à ne pas répéter, consignés en fin de ce dossier.** L'agent a fini à
**163k** (au-dessus du maximum de 150k) pour **21 appels d'outils** : le débordement venait du volume
**écrit**, pas de l'exploration — la découpe juste était « dossier de décision » puis « plan par
lots », en deux agents. Et **l'outil `Write` était désactivé pour les sous-agents de cette session**,
si bien que l'agent a dû rendre ses ~600 lignes dans son rapport final, que le fil principal a
réécrites sur disque. **Vérifier l'outillage d'un agent avant de lui confier un livrable-fichier.**

### 🔴 La cartographie des diapositives du module 11 est À RELANCER

`docs/contenu/renvois-diapos-module-11.md` **n'existe pas** : l'agent a été tué par la limite de
session au moment exact où il écrivait le tableau (« *I have all the material measured. Writing the
correspondence table.* »). **Aucun résultat n'a survécu** — le travail est entièrement à refaire, et
c'est un **agent frais**, jamais une reprise.

Ce qu'il devait produire, pour reconstituer le brief : une table **par section de la leçon** (tous
les `##` et `###`, dans l'ordre du fichier) —
`section (ligne:titre) | cours (B10 / 4P2 / les deux / aucun) | séance | diapos | citation de preuve | confiance (certaine / partielle)`.
Trois règles non négociables : **`aucun` est une réponse légitime et attendue** (ne jamais forcer un
renvoi — un renvoi faux envoie l'étudiant réviser la mauvaise diapositive, en silence) ; la colonne
« preuve » cite **des mots réellement présents** dans la ligne `[n]` de l'extrait, pour être
vérifiable sans croire l'agent sur parole ; `diapos` suit la grammaire du dépôt (croissante, plages
`45-50`). Puis trois sections courtes : les **conflits** entre les deux cours (XAMPP/`htdocs` du 4P2
contre droplet/Linux de B10 — c'est le défaut qui a déjà fait réviser XAMPP à un étudiant de B10), ce
que la leçon enseigne **hors** des deux cours, et ce que les cours portent et que la leçon **tait**.

Sources à lui injecter : `php-2026/extraits/PROVENANCE.md` (à lire en premier), `Cours01` (111
diapos) et `Cours08` (103) côté 4P2, `Cours02_environnement_linux` (82) et
`Cours09-Securite_base_de_donnees` (58) côté B10, plus
`content/cours/securite-web/11-projet-de-session/lecon.md` (942 l.).

---

## 4 · Les contraintes qu'un plan doit traiter, sous peine d'être à refaire

- 🔴 **Décision ST4-1 de `CLAUDE.md`, « à ne pas rouvrir » : aucun sélecteur, aucun repliage sur le
  conteneur `comparaison`.** Ses trois motifs : les `exemples` d'une `comparaison` sont des
  **vulnérabilités distinctes** (des onglets « de langage » cacheraient un exemple pédagogique
  entier derrière une étiquette mensongère) · un `<details>` fermé **ne s'imprime pas** et échappe
  au `Ctrl+F` · un accordéon exclusif peut finir **à zéro exemple** à l'écran.
  ⚠️ **La demande n°4 du propriétaire porte sur autre chose** : « même geste, deux méthodes »
  (le cours contre l'équivalent moderne), rendu aujourd'hui par un `::: cours` suivi d'un
  `::: complement` **empilés**. La question à trancher est donc « conteneur NEUF, et à quelles
  conditions les trois motifs ne se rejouent-ils pas ? » — **ne pas rouvrir ST4-1, démontrer qu'on
  est ailleurs.**
- 🔴 **`withNoIncrementalHydration()` est actif et le site est prerendu** (L-033) : entre la peinture
  et l'hydratation, un bouton **a l'air vivant et perd les clics**. Tout mécanisme à onglets doit
  être **utilisable et complet sans JavaScript**, et ne jamais peindre un contrôle mort. Dire
  explicitement ce que voit un lecteur **sans JS**, **pendant la pré-hydratation**, et **à
  l'impression**.
- **WCAG 2.2 AA, zéro violation axe — barre dure.** Un renvoi de diapositive posé dans un `<h2>`
  entre dans le **nom accessible** du titre, donc dans la liste des titres d'un lecteur d'écran ;
  le sommaire est un `<nav>` nommé. Et `preserveWhitespaces: false` **supprime le nœud blanc entre
  deux `<span>`**, ce qui colle les mots dans le nom accessible (L-024).
- **CSP à hachages** : tout composant neuf fait naître un bloc `<style>`, donc **un hachage de
  `style-src` de plus** (14 aujourd'hui), recopié à la main à **trois** endroits
  (`tools/deploiement/generer-config-swa.mjs`, `src/config-swa-provenance-style.spec.ts`,
  `src/config-swa-contournements.spec.ts`) plus **deux comptes par page** dans
  `e2e/simulation-sous-csp.spec.ts` (`BLOCS_STYLE_PAGE_QUIZ` = 6, `BLOCS_STYLE_PAGE_SIMULATION` = 7).
  **`script-src` est à zéro et le reste** : aucune solution ne peut ajouter un script inline.
- **L-080** : `src/styles/_coloration-syntaxique-generee.scss` est **généré par `content:build`** —
  une construction syntaxique inédite y fait naître des propriétés neuves et fait rougir le gate de
  contraste. Dette voisine (**nœud N-8**) : la leçon 11 emploie des blocs `ini` et `apache`, **hors
  de la liste fermée à huit** (`php, csharp, typescript, sql, bash, json, html, javascript`), rendus
  sous une **étiquette d'emprunt** — donc un `<figcaption>` visible et un `aria-label` qui annoncent
  une langue que le bloc ne contient pas. Ouvrir la liste est un **lot à part**.
- **Cross-cours** : `horaire.json` est **par sujet** et `content/cours/php/` **n'existe pas encore**
  (épic **E7**, backlog l. 3991-4017, sept sous-tâches déjà écrites). Ne rien bâtir qui devra être
  défait quand E7 arrivera.
- **Le module 11 n'a volontairement PAS de champ `seance`** (nœud N-5) : `valider.mjs:1942-1947`
  refuse qu'un module cite une séance portant une `evaluation`, et la séance 11 en est une. C'est
  aujourd'hui la **seule forme valide**, et c'est ce qui exclut le module de la portée de tout examen.
- ⚠️ **Trou nommé du validateur** : `valider.mjs:1252` sort en silence quand un `::: cours` ne
  déclare **ni** `diapos` **ni** `seance` — l'obligation de rattacher un renvoi ne s'arme qu'une fois
  qu'on a commencé à en renseigner un. C'est ce trou qui avait laissé deux encadrés annoncer
  « matière d'examen » en mêlant, sans le dire, la matière de **deux cours différents**.

---

## 5 · Le point d'entrée du code, pour ne pas le rechercher

| Ce qu'on veut toucher | Où |
|---|---|
| Contrat d'ancrage (séance, `diapos`, `renvoiCours`) | `docs/contenu/ancrage-au-cours.md` §2 à §5 |
| Contrat de compilation (gabarit du corps, encadrés, `comparaison`, 8 langages) | `docs/contenu/pipeline-contenu.md` |
| Compilateur | `tools/content-pipeline/compiler-markdown.mjs` (2628 l.) — `lireAttributs`, `lireExemple`, `lirePortee`, `VARIANTES_ENCADRE`, `langageDe` |
| Validateur, règles hors schéma | `tools/content-pipeline/valider.mjs` (2825 l.) — G1/G2/G3, gate de complétude des exercices |
| Sommaire de la barre latérale | `construireSommaire()` dans `src/app/features/cours/lecon/navigation-lecon.ts` ; appelé `lecon.ts:447` ; rendu `lecon.ts:262-280` |
| Titres de section (`<h2>`/`<h3>` + `[id]="section.ancre"`) | `lecon.ts:295-301` |
| Rendu des blocs et des encadrés | `src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts` (1195 l.) |
| Palette « Moniteur ambre » | `src/styles/_primitives.scss` (`$ambre #ffb454`, `$noir-tube #06080a`, `$noir-creux #0b1114`, `$phosphore-100 #d6e2e6`, `$rouge-vuln #ff5c57`, `$vert-corrige #4ade80`) et `_themes.scss` |
| La leçon à refondre | `content/cours/securite-web/11-projet-de-session/lecon.md` (942 l.) + `quiz.json` |

---

## 6 · Le geste suivant, dans l'ordre

1. **Vérifier l'existence des deux fichiers du §3.** Absents → relancer les deux briefs ; présents →
   les lire.
2. **Soumettre les décisions au propriétaire dans un Artifact, pas en prose** — c'est sa préférence
   explicite (mémoire `presenter-les-choix-visuels-en-artifact`) : les candidats de bloc « marche à
   suivre », le conteneur à onglets et la forme du renvoi dans le titre et le sommaire se **montrent**
   dans la peau « Moniteur ambre ».
3. **Puis seulement** : `devils-advocate` sur le plan (c'est un début de chantier structurel, il le
   mérite), puis l'implémentation lot par lot, module 11 d'abord.
4. **Ne pas oublier la trace** : à la clôture, reporter le contrat retenu dans
   `docs/contenu/pipeline-contenu.md` **et** `docs/contenu/ancrage-au-cours.md`, la barre de qualité
   dans `.claude/rules/contenu-pedagogique.md`, et la consigne de rédaction dans le skill `/lecon` —
   sinon le prochain rédacteur écrira à l'ancien format.

⚠️ **Rappel de dimensionnement, payé quatre fois sur ce dépôt** : un lot se dimensionne au **volume
écrit**, pas au nombre de constats ni de livrables. Le dernier agent de correctifs du module 11 a
fini à **178k** pour 7 bloquants, parce que la leçon est passée de 731 à 939 lignes. Un correctif qui
fait croître une leçon de plus de ~15 % **est une réécriture partielle et se scinde**.
