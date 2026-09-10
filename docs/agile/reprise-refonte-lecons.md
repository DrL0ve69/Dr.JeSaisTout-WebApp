# ⏭️ REPRISE — Refonte « leçons actionnables » (ouverte le 2026-08-31)

> **À lire en premier dans toute session qui reprend ce chantier.** Ce fichier n'est PAS
> auto-injecté : `CLAUDE.md` n'en porte qu'une ligne de pointeur, délibérément — un bloc de reprise
> qui accumule l'historique d'un épic est payé par **chaque agent de chaque session**
> (`.claude/rules/agent-context-budget.md` §7). Le détail vit ici.
>
> **Branche : `feat/refonte-lecons-actionnables`**, partie de `main` à `05e3ff2`.
> Commits : `da1ef65` (extracteur de diapositives), `6eeaf47` + `1b88dfd` (ce pointeur),
> `696f135` (dossier de décision), puis le verdict du propriétaire.

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

- 🔴 **N-6 EST ROUVERT — L'ÉNONCÉ DU PROJET DE 420-B10-HU EST EN LIGNE DEPUIS (signalé par le
  propriétaire, vérifié le 2026-09-08).** La page
  <https://www.alexandrepetrin.ca/securisation-des-applications-web/> porte désormais
  `telechargement/web/securisation/2026/projet/projet_session_securisation_2026.pdf` — un énoncé
  propre au cours de **sécurité**, là où il n'y en avait aucun le 2026-08-31. La consigne écrite
  alors (« rouvrir cette page et réécrire la date ») a donc fonctionné, et c'est le seul mérite de
  ce paragraphe.
  🔴 **CE QUE ÇA REND DETTE, ET IL FAUT LE DIRE MAINTENANT :** le module 11 `projet-de-session` a
  été écrit **sans cet énoncé** — sa matière vient du projet de **PHP** et des diapositives des deux
  cours. Il n'est pas faux pour autant (il enseigne l'amorçage LAMP, pas la portée d'une
  évaluation), mais **rien n'a encore confronté ce qu'il promet à ce que l'enseignant demande**.
  C'est un lot à part : télécharger le PDF, l'extraire, puis relire le module 11 contre lui.
  ⚠️ **Ne pas faire lire ce PDF par `WebFetch`** — il invente plutôt que d'échouer, et le dépôt l'a
  déjà payé quatre fois.
  ⚠️ **Le support du cours 5 est lui aussi susceptible d'avoir changé** (même signalement) : la copie
  locale `securite-app-web-2026/Cours05_Securite_utilisateurs.pptx` date du **2026-08-25**, et c'est
  celle-là que E3-ST17 décrivait comme un « squelette » (23 diapositives, dix titres nus, deux
  `(TODO)` de l'enseignant). **Retélécharger avant d'écrire la séance 5** : le diagnostic
  « squelette » est daté, pas permanent.
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
toute chose** : le **verdict du propriétaire** en tête (sept arbitrages, tous rendus le 2026-08-31),
puis les quatre décisions avec leurs options écartées, douze lots dimensionnés, et sept risques nommés
dont trois demandent une **mesure** avant de coder.

✅ **LES SEPT ARBITRAGES SONT RENDUS — ils font foi, et ils ne se rouvrent pas.** D-A conteneur
`:::: marche-a-suivre` · D-B l'attribut sur le **titre lui-même** · D-C onglets **CSS purs** (radios),
zéro JavaScript · D-D gate qui **se durcit module par module**, avec compteur · **R-3** la règle
s'assouplit (une séance d'évaluation **pratique** peut porter un module, l'**examen écrit** reste
interdit) · **R-7** la **reprise des dix modules passe devant** le contenu neuf · **R-4** la perte du
`Ctrl+F` dans un onglet masqué est **acceptée**, sous réserve écrite au contrat. Ce que chacun engage,
et les trois conséquences qui coûtent : `docs/design/refonte-lecons-actionnables.md`, bloc « VERDICT ».

⚠️ **Deux défauts de brief à ne pas répéter, consignés en fin de ce dossier.** L'agent a fini à
**163k** (au-dessus du maximum de 150k) pour **21 appels d'outils** : le débordement venait du volume
**écrit**, pas de l'exploration — la découpe juste était « dossier de décision » puis « plan par
lots », en deux agents. Et **l'outil `Write` était désactivé pour les sous-agents de cette session**,
si bien que l'agent a dû rendre ses ~600 lignes dans son rapport final, que le fil principal a
réécrites sur disque. **Vérifier l'outillage d'un agent avant de lui confier un livrable-fichier.**

### ✅ La cartographie des diapositives du module 11 EXISTE — et elle est recoupée

🔴 **Ce pointeur a annoncé le contraire jusqu'au 2026-08-31, et c'était faux.** L'agent avait été tué
par la limite de session **après** avoir écrit son fichier :
`docs/contenu/renvois-diapos-module-11.md` est sur disque (**30 647 o**, horodaté 16:46, deux
minutes après le commit du pointeur qui le déclarait perdu). ⚠️ **Un agent tué n'a pas forcément rien
rendu — regarder le disque avant de relancer un lot.** Relancer aurait coûté un agent entier pour
réécrire ce qui existait.

**Ce qu'il porte** : §0 les seize extraits lus et ce qu'ils valent · §1 la table section par section
(`ligne:titre | cours | séance | diapos | citation de preuve | confiance`), une ligne par déck pour
ne jamais mêler deux numérotations · §2 les recoupements et **conflits** entre les deux cours · §3 ce
que la leçon enseigne hors des deux cours · §4 les neuf sujets que les cours portent et que la leçon
**tait**.

**Contrôle exécuté le 2026-08-31** (le fichier n'était pas commité, donc pas encore revu) : six
citations tirées au hasard confrontées aux extraits — 4P2 Cours01 [25]/[45]/[107], B10 Cours01
[6]/[13]/[63], B10 Cours02 [24]/[25], 4P2 Cours08 [37]/[38]. **Les six tombent au mot près.** Ce
n'est pas une preuve d'exhaustivité, c'est une preuve de non-invention — la seule qui manquait, vu
l'antécédent du `WebFetch` qui avait halluciné une lecture de `.pptx`.

⚠️ **Ce que le contrôle NE dit pas** (R-6 du dossier de décision) : aucun gate ne peut vérifier qu'une
diapositive **parle bien** du titre qui la cite. C'est du ressort du `verificateur-theorie`, au lot 8.

🔴 **Trois trouvailles de cette table qui sont du CONTENU, pas de la cartographie**, et qui devront
être tranchées en écrivant la leçon : la leçon annonce le projet à **20 %** quand la diapositive 6 du
cours 1 de B10 écrit **15 %** · l'image du droplet diverge entre les deux cours (**LAMP on 18.04** en
B10 s2 d24, **LAMP on 24.04** en 4P2 s8 d37) et le coût aussi (**5 $** contre **6 $**) · **XAMPP est
exigé par les DEUX cours** (B10 s1 d63 le liste), ce qui contredit l'encadré de la leçon qui le
présente comme étranger à B10.


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

> ✅ **MIS À JOUR LE 2026-08-31, APRÈS LE VERDICT.** Le `/clear` a eu lieu, le propriétaire a collé
> ses sept arbitrages, et deux des gestes ci-dessous étaient déjà faits. Ce §6 reste **le point
> d'entrée exact** de la session suivante.

**0. ✅ Le verdict est rendu et gravé** — §3 pour le résumé, le dossier de décision pour le détail,
`CLAUDE.md` pour le pointeur. L'Artifact
<https://claude.ai/code/artifact/4d7fbadc-2879-4263-b977-256a1bcb3b07> est **périmé sur son
formulaire** (il demande encore de choisir). ⚠️ Pour le corriger, republier **avec son `url`** —
sans quoi on crée un second Artifact et le lien du propriétaire pointe sur la vieille version.

**1. ✅ La cartographie des diapositives du module 11 existe** — `docs/contenu/renvois-diapos-module-11.md`,
recoupée sur six citations (§3). **Ne pas la relancer.** Commitée dans `8217c3f`.

**2. ✅ Le `devils-advocate` est passé, et le plan en sort AMÉLIORABLE.** Ses constats, plus les deux
mesures faites dans la foulée, vivent en **section (D)** de `docs/design/refonte-lecons-actionnables.md`.
🔴 **(D) fait foi contre (B)** : il est postérieur et mesuré. Trois de ses constats ont été
**revérifiés à la ligne** par le fil principal avant d'être repris — `design:contrastes:check` absent
de `npm run build` (`ci.yml:133` / `deploy.yml:407` seulement), le tripwire `PAIRES` qui refuse tout
jeton couleur neuf, et `verifier-axe.mjs` qui désactive nommément `color-contrast` **et**
`target-size`.

**3. Les mesures — deux faites, une impossible pour l'instant.**
✅ **R-2 est levé, et il RÉFUTE la recommandation de D-B** : le pipeline est **mono-sujet par
exécution**, un `content/cours/php/horaire.json` n'est pas accepté, il n'est **jamais lu** (D.1).
✅ **R-3 est chiffré** : il exige un champ **requis** neuf au schéma, rien ne distingue aujourd'hui un
examen écrit d'un projet (D.2).
🔴 **R-1 n'est PAS mesurable en l'état** : il n'existe aucune radio **non liée** dans une page
prerendue, donc la mesure demande d'abord une fixture — c'est le **lot 4bis**, pas une case à cocher.
Ne pas rendre une déduction à la place d'une mesure (L-074).
⏳ **R-5** ne se mesure que **sur une branche du lot 2**, comme le dossier le dit lui-même.

**4. L'implémentation, dans l'ORDRE RÉVISÉ par (D).** ~~`0`~~ **✅ livré** (contrats, les trois trous de
D.5) → ~~**`0bis`**~~ **✅ + `0ter`** (schéma `evaluation.nature` **requis** + fixture invalide — **bloquant pour le lot
8**) → ~~**`1a`**~~ **✅ livré** (`diapos` intra-sujet) → ~~**`2`**~~ **✅** → ~~**`3`**~~ **✅** → ~~**`4`**~~ **✅** → ~~**`4bis`**~~ **✅**
(spike R-1, jetable — **R-1 levé**) → ~~**`5`**~~ **✅ livré** (PR #48) → ~~**`6`**~~ **✅ livré** (PR #50, 2026-09-07) → ~~**`7`**~~ **✅ livré** (2026-09-07, périmètre RÉFUTÉ par la mesure) → ~~**`1b`**~~ **✅ livré** (PR #52, 2026-09-08 — résolution inter-cours) → ~~**`1b-B`**~~ **✅ livré** (2026-09-08 — les contrôles positifs des refus inter-cours ; **cinq annoncés, QUINZE recensés**) → `8`
~~**`8-A`**~~ **✅ livré** (PR #56, 2026-09-08 — moitié haute) → ~~**`8-B`**~~ **✅ livré** (PR #57,
2026-09-08 — moitié basse ; **le module 11 est totalement cartographié, 0 titre muet**) →
~~**`9`**~~ **✅ livré** (2026-09-08 — le gate `MODULES_AU_FORMAT_ACTIONNABLE`, son compteur **1/9**,
et la permission morte jugée en G-test parce qu'elle ne pouvait pas l'être dans le validateur).
**Le plan est épuisé** : la suite est le legs ouvert du lot 6 (aucun onglet mesuré) puis la reprise
du module suivant, module par module.
⚠️ **Les lots 2, 4 et 6 lancent aussi `npm run design:contrastes:check`** et déclarent **quelles paires
ils ajoutent** avant d'écrire une couleur. ⚠️ **Le lot 6 porte sa preuve en e2e, pas dans `a11y:axe`**,
et son critère d'acceptation inclut un canal **non chromatique** pour `forced-colors: active` (R-8).

✅ **LE LOT 0 EST LIVRÉ — commit `9daecdb`, 2026-08-31.** Les trois contrats sont écrits, **avant**
toute ligne de code, et les trois trous de D.5 y sont fermés nommément :

| Où | Ce qui y est désormais écrit |
|---|---|
| `docs/contenu/pipeline-contenu.md` | conteneur `marche-a-suivre` (D-A) · conteneur `methodes` (D-C) · gate du format actionnable (D-D) |
| `docs/contenu/ancrage-au-cours.md` | **§3bis** l'attribut sur le titre (D-B) · §4 `SectionCompilee.renvoiCours` · §5 (d) et (e) ce que voit le lecteur |
| `.claude/skills/lecon/SKILL.md` | les sections obligatoires **nommées en toutes lettres** dans le brief · l'entrée dans `MODULES_AU_FORMAT_ACTIONNABLE` en dernier geste de clôture |

🔴 **UNE DÉCISION DE CONTRAT A ÉTÉ FORCÉE PAR D-D, et elle contredit la lettre de la recommandation
de D-A.** D-A écrivait que `## En bref — la marche à suivre` « entre dans la liste des sections
imposées ». Prise au pied de la lettre, cette phrase fait **rougir le build sur les dix leçons
publiées** le jour même de sa livraison — exactement ce que D-D existe pour éviter. Le contrat écrit
donc : la section est imposée aux **seuls modules de `MODULES_AU_FORMAT_ACTIONNABLE`** ; sa **place**
(immédiatement après `## L'idée en une image`) est en revanche vérifiée pour tout le monde dès
qu'elle est présente. C'est D-D qui gouverne, comme il le dit lui-même.

**Trois refus silencieux fermés au passage**, tous nommés dans le contrat : un `{voir="…"}` **ambigu**
(deux sections au même titre) est un refus qui nomme les deux, jamais « la première gagne » · un
`{voir="module:<slug>"}` visant une cible non `publiee` est refusé (c'est l'incident de production du
2026-08-27) · le cliquet de D-D exige `##` **et** `###`, refuse un module de la liste **sans**
`seance`, et refuse un slug de la liste **sans leçon** (permission morte, S-005).

Gate : `npm run content:build` **vert, 10 leçons, 5/5, 0 dépassement** — inchangé, le lot est
documentaire.

✅ **LES LOTS 0bis ET 0ter SONT LIVRÉS — commits `390a8f2` et `c34940c`, 2026-08-31.** `evaluation.nature`
existe, elle est **requise**, son enum est fermé à `examen-ecrit` | `evaluation-pratique`, et la règle
3bis porte désormais sur la **nature** au lieu de la **présence**. Les trois évaluations du cours sont
qualifiées ; la séance 11 est déclarable. **Le lot 8 n'est plus bloqué de ce côté.**

🔴 **LE LOT 0bis ÉTAIT INCOMPLET, ET C'EST LA LEÇON DU JOUR : LA RÈGLE EST APPLIQUÉE DEUX FOIS.**
`valider.mjs:verifierSeanceContreHoraire` la porte **au build** ; `contenu-compile.ts:ancrerAuCours`
(l. 721+) la porte **au rendu prerendu**, et son `refuser()` **lève**. La seconde n'était nommée ni
dans le plan (B), ni dans la passe (D), ni dans mon brief : le lot 8 aurait donc vu `content:build`
déclarer la leçon **valide**, puis `ng build` **échouer au prerendu**, sur un message parlant du
mauvais contrat. ⚠️ **Famille S-010, à l'identique** — « le lot annonçait trois points de décision, il
y en avait cinq ». **Avant de relâcher une règle de contenu, recenser TOUS les endroits qui
l'appliquent** : le pipeline et l'app en portent chacun une copie, délibérément, et elles doivent dire
la même chose.

Le lot 0ter ferme aussi un trou que personne n'avait vu : **Ajv valide l'horaire au BUILD, pas
l'artéfact au CHARGEMENT.** `verifierEvaluationOptionnelle` contraint maintenant la **valeur** de
`nature` (liste blanche `NATURES_D_EVALUATION`), et pas seulement sa présence — sans quoi une nature
inconnue serait lue comme « pas `evaluation-pratique` », donc comme un examen, et le build accuserait
le **module** au lieu de l'horaire fautif.

**Ce que le lot a mesuré sans corriger — le sommaire sous une séance à double emploi.** Avec
`seance: 11`, `positionDuJalon` **ne lève pas** : le groupe « Projet de session » vaut exactement
{11}, donc jamais `min < 11 && max > 11`. Le jalon « Projet de session · 16 octobre » reste juste
avant sa propre section. Le seul mouvement est une **amélioration** — le jalon « Examen final »,
rendu aujourd'hui *avant* la section Projet, passera *après*. Résidu cosmétique **déjà présent** :
le libellé « Projet de session » s'affichera deux fois de suite (jalon, puis titre de section).
Ce n'est pas un bloqueur du lot 8 ; c'est une retouche à décider en le rédigeant.

**Gates à la clôture de 0ter** : `lint` **0** · `npm test` **952 / 43 fichiers / 0 échec** (949 avant
le chantier) · `typecheck:tools` **0** · `content:build` **vert, 10 leçons, 5/5, 0 dépassement** ·
`build` **13 routes prerendues, 14 hachages de style / 0 de script — inchangés** · validateur
`--fixtures` **44/44**, compte en dur intact.

⚠️ **DEUX DÉFAUTS DE BRIEF PAYÉS ICI, à ne pas répéter au lot 1a.** (1) Mon brief du 0bis annonçait
UN livrable (« le schéma ») mais en portait **trois** : le schéma, une passe **mécanique sur 22
fixtures**, et une **mesure d'observation** du sommaire. L'agent a fini à **218 670 tokens** pour 84
appels — le test du « + » ne se lit pas seulement dans la phrase d'objectif, il se lit dans la
**liste des gestes**. (2) Une passe mécanique sur N fichiers **est un lot**, exactement comme un
corpus de fixtures (règle §9 du budget de contexte) : elle se compte avant d'écrire le brief.

✅ **LA REVUE À REGARD NEUF EST PASSÉE — verdict APPROUVÉ, réserves levées, commit `06e77f7`.**
Rien de Critique ni de Majeur sur `395a58d..c34940c`. Ce qu'elle a **mesuré plutôt que lu** : les deux
applications de la règle testent bien la nature **autorisée** dans le même sens ; la pince du pipeline
est **sensible** (fixture `seance: 4` → code 0, la même mutée en `seance: 3` → code 1 en nommant la
nature) ; `nature` est requise **de bout en bout**, sans chemin où une valeur absente ou inconnue
passerait ; et les 22 fixtures qualifiées le sont **justement**, aucune faute propre masquée.

**Trois réserves traitées dans `06e77f7`.** (1) Le commentaire de `NATURES_D_EVALUATION` promettait un
appariement des trois écritures qu'**aucun gate ne tenait** — on a rendu la promesse **vraie** plutôt
que de l'affaiblir : l'union de `types.d.ts` et la liste de l'app sont désormais appariées **par le
typage** (`Record<NatureDEvaluation, true>`, total et fermé, dont la liste d'exécution est dérivée),
et l'accord avec l'`enum` du schéma JSON — qu'aucun type ne peut voir — est tenu par
`src/contrat-nature-evaluation.spec.ts`, **égalité dans les deux sens**. 🔴 **Contrôle positif
exécuté** : « oral » ajouté au seul `enum` du schéma → **1 test rouge, exactement le neuf** ; schéma
remis et vérifié sur disque. (2) Une ligne vide manquante faisait **fusionner** deux alinéas d'§2 au
rendu. (3) §5 dit maintenant pourquoi la `portee` d'une évaluation ne cite **aucune** séance
d'évaluation, nature pratique comprise — le seul endroit où R-3 n'a **rien** changé, délibérément.

🔴 **LA QUATRIÈME RÉSERVE PART AVEC LE LOT 8, ET ELLE EST NOMMÉE ICI POUR NE PAS SE PERDRE.**
`sommaire.ts:positionDuJalon` est un **troisième** intervenant : il n'**applique** pas la règle, il en
**dépend** — il lève si un jalon tombe *à l'intérieur* d'un groupe. Vérifié : avec les sections
actuelles le module 11 sera **seul** dans son groupe (`min = max = 11`), donc pas de levée. Mais
**aucun spec ne couvre la combinaison « groupe portant la séance d'un jalon »**, et une section future
qui enjamberait la séance 11 ferait lever le rendu. **À ajouter au lot 8** : un cas de
`sommaire.spec.ts` où un module sur une séance `evaluation-pratique` rend **et** le jalon **et** le
module, dans cet ordre. C'est le filet de régression du lot.

⚠️ **L'ANGLE NEUF DE S-010, à retenir avant tout assouplissement de contrat** : quand on relâche une
règle, on cherche spontanément les endroits qui l'**appliquent** — il en manquait un (`ancrerAuCours`,
trouvé au lot 0ter). Mais il faut aussi chercher les **consommateurs de l'invariant** : du code qui ne
teste rien et présuppose seulement que l'invariant tient. `positionDuJalon` ne lit aucune nature ; il
suppose qu'un jalon ne partage jamais sa séance avec un module. Un tel consommateur ne rougit dans
aucun grep de la règle.


✅ **LE LOT 1a EST LIVRÉ — commit `e580698`, 2026-09-01.** `{diapos="…"}` / `{seance="…"}` sur les
titres `##`/`###`, matrice fermée à trois clefs, plages dépliées, `SectionCompilee.renvoiCours`.
`cours="…"` est **reconnu mais refusé à l'usage** en disant pourquoi — c'est le lot 1b. Rien n'est
rendu : le rendu et le sommaire sont le lot 2. Fixtures invalides **45 → 48**.

🔴 **LES TROIS DÉFAUTS DE CE LOT SE TAISAIENT DES DEUX CÔTÉS À LA FOIS — S-010, troisième forme.**
Aux lots 0bis/0ter, la famille était « on relâche une règle et il manque un endroit qui l'applique ».
Ici les deux copies **existaient**, **s'accordaient**, et **avaient tort ensemble** — donc aucun
appariement compilateur/validateur ne pouvait rougir :
- **(a)** Le découpage prend le **dernier** bloc `{…}`. `## A {seance="4"} {diapos="45-50"}` laissait
  `{seance="4"}` dans le **texte** du titre — donc dans l'ancre et au sommaire — et la séance 4 était
  **perdue** : le renvoi se résolvait sur la séance du frontmatter. Parade : refuser toute accolade
  survivant au dépouillement, pendant exact du contrôle de **résidu** de `lireBlocDAttributs`.
- **(b)** CommonMark admet `### Titre ##`. Le compilateur lit les jetons de markdown-it et **voyait**
  l'attribut ; le validateur lit la ligne **brute** et ne le voyait **jamais**. ⚠️ **Les deux copies
  d'une règle doivent voir la MÊME CHAÎNE** — ce n'est pas acquis quand l'une part de l'AST et
  l'autre de la source.
- **(c)** La §4d du validateur était **vacue** : `return null` à la place de sa queue laissait la
  suite **entièrement verte**, le seul cas de titre du corpus sortant plus tôt.

⚠️ **UNE FIXTURE QUI REFUSE NE PROUVE PAS QU'ELLE REFUSE POUR LA BONNE CAUSE.** En débranchant le
retrait de la fermeture ATX, `corps-titre-atx-ferme` **reste refusée** — par le garde d'accolade
résiduelle, sur la **mauvaise** cause. L'assertion épingle donc « séance 99 », seul discriminant.
**Un contrôle positif qui ne vérifie que le refus est à moitié aveugle** dès que deux gardes se
recouvrent.

⚠️ **`content:build` RESTE VERT sous la mutation du dépouillement** : aucune des dix leçons publiées
ne porte d'attribut de titre. Le corpus ne prouve donc **rien** ici — c'est la fixture, et elle seule.

🔴 **LE DÉFAUT DE BRIEF DE CE LOT, PAYÉ 300k ET UNE HEURE QUARANTE.** J'ai écrit **`npm test`** dans le
périmètre de l'implémenteur. Sur ce dépôt ce n'est pas une suite unitaire : c'est `content:build`
(Mermaid via Chromium) **plus** un bundle Angular complet (**206 s** mesurés) **plus** ~980 tests — et
le contrôle positif par mutation impose de rejouer ce cycle trois ou quatre fois, chaque passe laissant
son mur de sortie dans le transcript. `.claude/rules/agent-context-budget.md` §4 le dit déjà :
**l'implémenteur ne lance que les gates CIBLÉS**. La découpe juste était `lint` + `typecheck:tools` +
`content:build` pour lui, `npm test` et la mutation pour l'appelant. ⚠️ **Aggravation à ne pas répéter :
j'ai lancé deux builds Angular complets pendant qu'il tournait** — contention pure, un worker Vitest
tué, et son mur allongé d'autant. **Un seul build lourd à la fois sur ce poste.**

✅ **LE LOT 2 EST LIVRÉ — 2026-09-02.** Le renvoi de diapositives est **rendu** : un `<p class="renvoi-titre">`
**frère** du `<h2>`/`<h3>`, et le renvoi **dans le texte** du lien de sommaire. Fabrique unique neuve
`src/app/features/cours/lecon/renvoi-au-cours.ts` (153 l.), consommée par les titres **et** les encadrés.

🔵 **DEUX DÉCISIONS DU PROPRIÉTAIRE, PRISES CE JOUR — elles font foi, reportées au contrat (`ancrage-au-cours.md` §5 (a)(d)(e)).**
Le contrat écrivait **trois** formats divergents pour le même libellé, et la demande d'origine en disait un
quatrième (« entre parenthèses ») : l'écart n'était pas tranchable sans arbitrage.
**(1)** Sous un titre : **entre parenthèses, plages repliées, séance TUE quand elle est celle du module** —
`(diapos 12 à 18)`, `(séance 4 · diapos 45 à 50)`, `(420-4P2-HU · séance 8 · diapos 30 à 42)`. Un `cours`
renseigné **force** l'affichage de la séance ; un `frontmatter.seance` **absent** l'écrit toujours.
**(2)** Le repli vaut **AUSSI pour les encadrés déjà en ligne** — une seule fabrique, jamais deux.
Règle : **une suite d'au moins TROIS** numéros consécutifs se replie ; une ou deux restent en virgules.
⚠️ **Mesuré : six libellés changent de rendu** dans **deux** leçons publiées (`02-environnement-linux` ×1,
`03-communication-serveur` ×5) — « diapos 56, 57, 64, 65, 66, 69, 70, 71 » devient « 56, 57, 64 à 66, 69 à 71 ».
**Aucun fichier de contenu n'est touché** : c'est le rendu seul.

🔴 **LE DÉFAUT MAJEUR DU LOT, ET IL AVAIT SURVÉCU À 994 TESTS — [[L-086]].** Remplacer
`this.frontmatter().seance` par `undefined` aux **deux** points d'appel de `lecon.ts` (l. 475 et 490)
passait toute la suite. Les tests unitaires appelaient les fabriques **directement** (ils prouvaient la
fonction, jamais le **câblage**), et le seul test DOM tournait sur la fixture témoin **sans `seance`** — le
seul cas où « câblé » et « jamais passé » rendent la **même** chaîne. ⚠️ **La prémisse du test était VRAIE**
et le rendait pourtant aveugle : c'est la cousine **inversée** de L-035. Or 8 des 10 leçons en ligne
déclarent `seance:` — la branche non prouvée était celle de **production**.
**Fermé, avec contrôle positif imprimé** : deux tests **séparés**, un par point d'appel (réunis, la mutation
d'un seul serait indiscernable de l'autre) ; sous mutation **exactement 2 rouges**, et restauration de
`lecon.ts` prouvée par `sha256` identique avant/après. La leçon retient aussi le corollaire : **N points
d'appel demandent N assertions mutation-séparables.**

⚠️ **AUCUN GATE D'ARTÉFACT N'A VU LE BALISAGE NEUF — à ne pas oublier au lot 8.** Mesuré : **zéro** titre du
corpus ne porte `{diapos=…}` aujourd'hui, donc les 1118 vérifications d'axe portent sur des pages où le
`<p class="renvoi-titre">` et le `<span class="texte-lien">` **n'existent pas**. Même famille que
« `verifiee` n'est pas `publiee` », payée deux fois sur ce dépôt. **Relancer G-axe et G-e2e à la première
leçon qui ancre un titre**, avant de la déclarer finie.

🔵 **CE QUE LA REVUE DE SÉCURITÉ A ÉTABLI, ET LA DETTE QU'ELLE DATE — [[S-026]].** Rien d'exploitable :
les consommateurs sont tous des interpolations en **nœud texte**, échappées par Angular ; aucun `[attr.…]`,
aucun `innerHTML`, aucun `bypassSecurityTrust*` ; aucun `id` neuf, donc aucune collision d'ancre ; CSP
inchangée et aucun littéral épinglé réaligné en douce.
🔴 **Mais `cours` est le seul membre du renvoi SANS grammaire** — `seance` et `diapos` en ont chacune une,
totale et ancrée au compilateur. Il n'est injoignable que par le `echec()` du lot 1a, et **un refus
temporaire n'est pas une validation**. **Au lot 1b, dans le MÊME commit que la levée du `echec()`** :
grammaire nominative **au compilateur** (`^[A-Z0-9-]{3,20}$` couvre `420-4P2-HU`), jamais au rendu.
✅ Le **test à deux mains** de S-011 (e) a été **avancé à ce lot** plutôt que reporté : il couvre les deux
surfaces qui existent réellement, avec son propre contrôle positif sur l'inspection d'attributs.
✅ **Fausse dette écartée** : l'étiquette d'**encadré** n'est pas concernée — son `renvoiCours` est typé
`{ seance, diapos }` **sans** `cours` (`types.d.ts:280` et `:314`). TypeScript rend le cas irreprésentable.

**Gates à la clôture du lot 2** : `lint` **0** · `npm test` **997 / 45 fichiers / 1 sauté / 0 échec**
(952/43 avant le chantier) · `build` **13 routes · 14 hachages de style / 0 de script — inchangés** ·
`a11y:axe` **13 fichiers · 1118 vérifications · 0 violation** · `e2e` **50 passés / 1 sauté** ·
`design:contrastes:check` **40 paires / 40 mesures · 0 paire neuve** (`--couleur-encre-tertiaire`, déjà
mesuré sur `--couleur-surface` **et** `--couleur-surface-creuse`).

⚠️ **LE DÉFAUT DE BRIEF DE CE LOT — l'implémenteur a fini à 199 397 tokens**, au ras du plafond
« exceptionnel ». Les gates lourds étaient pourtant **sortis** de son périmètre (la leçon du lot 1a a tenu :
`npx ng test --include "…/lecon/**/*.spec.ts" --no-watch` mesuré à **55 s / 159 tests**, contre un cycle
`npm test` de plusieurs minutes). Ce qui a débordé est le **volume écrit** : ~300 lignes réparties sur
7 fichiers, plus la lecture ciblée de deux specs de 1500+ lignes. **La découpe juste était « la fabrique et
son adoption par les encadrés » puis « le rendu au titre et au sommaire ».** Même famille que le
dimensionnement du lot 0bis : le test du « + » se lit dans la **liste des gestes**, pas dans la phrase
d'objectif. En regard, l'agent de **correctifs** — périmètre étroit, trois filets nommés — a fini à **139k**,
et les deux revues à **127k** et **103k**.

✅ **LE LOT 3 EST LIVRÉ — 2026-09-02.** Le conteneur `:::: marche-a-suivre` est **compilé et validé** :
titre obligatoire non vide, liste ordonnée d’étapes, une phrase par étape et **au plus un** bloc de code,
renvoi `{voir="…"}` littéralement en tête — résolu en **ancre** pour un titre de section, **vérifié** contre
le statut de la cible pour un `module:<slug>`. Le rendu reste au lot 4 ; `rendu-blocs` refuse le type en le
NOMMANT, sous tripwire auto-périmant. Fixtures invalides **48 → 51**.

🔴 **LA DIVERGENCE ENTRE LES DEUX COPIES A ÉTÉ TROUVÉE PAR LA REVUE, ET LE DÉFAUT N’EST PAS CELUI QU’ELLE A
TITRÉ.** `nomDeConteneur` (validateur) lisait `/^([A-Za-z0-9-]+)/`, **qui s’arrête sur `{`** ; markdown-it,
lui, fait `params.trim().split(/\s+/)[0]`. Mesuré : sur `:::: marche-a-suivre{titre="…"}` — l’espace
oubliée — le validateur rendait « 2 leçon(s) valides » **en code 0** quand le compilateur refusait la même
racine. La revue a titré « Majeur : la construction publie du balisage d’auteur en clair » ; **c’est faux**,
la construction est *fail-closed* et rien n’atteignait le lecteur. Le vrai défaut, suffisant, est que **le
juge d’AMONT laisse passer ce que l’aval refuse** : l’auteur reçoit le message générique du compilateur au
lieu de celui qui nomme sa faute, et rien ne garantit que la prochaine divergence penchera du bon côté.
⚠️ **Ne pas laisser un surqualificatif se figer en folklore** — il fait corriger au mauvais endroit.
Même famille, corrigée dans le même geste : `titresDuCorps` admet désormais les **0 à 3 blanches de tête**
de CommonMark, sans quoi `  ## Titre` était une section pour le compilateur et n’existait pas pour le
validateur (S-010, énième forme — cousine directe du `### Titre ##` du lot 1a).

🔴 **UNE FIXTURE SOUS `__fixtures__/invalides/` NE PROUVE QU’UNE DES DEUX IMPLÉMENTATIONS.** Ce dossier est
la table câblée de `pipeline-contenu-validation.spec.ts`, qui fait tourner **`valider.mjs` seul**. Or les
deux règles que le contrat écrit en rouge — « deux sections au même titre = refus » et « un `module:` exige
`statut: publiee` » — sont écrites **deux fois**. Trois fixtures neuves donnaient donc l’illusion d’une
couverture complète, la moitié compilateur n’ayant **aucun** contrôle positif. Parade : la compilation
pointe le COMPILATEUR sur les **mêmes racines**, et chaque assertion épingle ce que **seul** lui produit —
les ancres suffixées `#…-2`, le `en « statut: verifiee »` lu sur la leçon compilée.
**Preuve par mutation, mesurée** : `if (candidates.length > 1)` → `if (false)` ⇒ **1 rouge, le bon** ;
`if (statut !== 'publiee')` → `if (false)` ⇒ **1 rouge, le bon** ; `html: false` → `true` ⇒ **les deux
mains** du test d’échappement ; `renderInline(phrase)` tronqué ⇒ **la première main seule**, ce qui prouve
que les deux moitiés sont séparables et qu’aucune n’est un no-op. Restauration prouvée par `sha256`
identique avant/après à chaque fois.

🔴 **G-LINT MANQUAIT À LA LISTE DE GATES DU BRIEF, ET C’EST LE SEUL QUI PORTE `sonarjs`.** Le brief nommait
`content:build`, `npm test`, `typecheck:tools`. À la vérification finale, `npm run lint` est sorti **rouge
sur 7 erreurs** — deux fonctions à complexité cognitive 19, une à 25, quatre gabarits imbriqués — sur un lot
par ailleurs entièrement vert. Aucune n’était un défaut de comportement, toutes étaient de vraies dettes de
lisibilité ; le correctif a été mécanique (trois fonctions extraites, quatre sous-expressions sorties en
`const`, comportement inchangé ligne pour ligne). **Un lot qui écrit du code d’outillage neuf porte G-lint
dans sa liste, quelle que soit la couche touchée** — l’omettre reporte un rouge certain sur le fil principal,
à l’heure où le lot se croit fini.

⚠️ **CE QUE LE CONTRAT PROMETTAIT ET QUE PERSONNE NE JUGEAIT (patron S-005).** « La section se place juste
après *L’idée en une image* » n’était vérifié nulle part : c’est désormais un **refus nommé** du validateur,
pour tout module qui porte une marche à suivre. « Elle ne contient **que** ce conteneur » ne l’est **pas**, et
le contrat le dit maintenant en toutes lettres, dans un tableau « clause → jugée par → comment » :
le validateur lit des **lignes brutes**, et juger ce qu’une section contient en plus l’obligerait à
réimplémenter l’analyse des blocs de CommonMark — la liste de motifs sur format structuré que
`.claude/rules/security.md` §4 interdit. **Contrat et gate disent désormais la même chose.**

⚠️ **LE PIÈGE DES MESSAGES FRANÇAIS ÉPINGLÉS À L’OCTET.** Les refus de ce dépôt portent U+00A0 (`étape n° 1`,
écrite en échappement des deux côtés), l’apostrophe typographique U+2019 **à côté** de l’apostrophe droite
dans le même fichier, et les guillemets `«` `»`. Une assertion retapée au clavier échoue sur un produit
**sain** — ou reste verte par vacuité. **On copie-colle depuis la sortie réelle, et tout caractère invisible
s’écrit en échappement.** Cousine de L-015 : un octet qu’on ne voit pas fait diverger la mesure de l’intention.

**Gates à la clôture du lot 3** : `lint` **0** · `typecheck:tools` **0** · `content:build` **10 leçon(s) ·
0 dépassement** · `valider --fixtures` **51/51 refusés avec une cause nommée** · `npm test` **1019 / 45
fichiers / 1 sauté / 0 échec** (997 à la clôture du lot 2) · `build` **13 routes · 14 hachages de style /
0 de script — inchangés** · `a11y:axe` **13 fichiers · 1118 vérifications · 0 violation — inchangé** ·
`e2e` **50 passés / 1 sauté** · `npm audit --omit=dev` **0**.

<!-- RÉCIT CLOS — le pointeur qui annonçait le lot 4, livré le 2026-09-02. Ses trois mises en garde ont
     TENU : `design:contrastes:check` lancé, 0 paire neuve ; les DEUX tripwires du lot 3 se sont retirés
     comme prévu ; le corpus de fixtures invalides reste au lot 7.
**Le geste suivant : le lot 4** (le RENDU de la marche à suivre) — `rendu-blocs`, son gabarit, ses styles.
-->

✅ **LE LOT 4 EST LIVRÉ — 2026-09-02.** Le conteneur `marche-a-suivre` est **rendu** : `<ol>` sémantique
nommé par `aria-label`, titre en `<p class="etiquette">`, code d'étape dans un défileur nommé, renvoi en
`routerLink` + `fragment`. Aucun composant neuf, donc **aucun hachage `style-src` de plus**. Les deux
tripwires du lot 3 se sont retirés des deux côtés.

🔵 **UN ARBITRAGE DU PROPRIÉTAIRE, PRIS CE JOUR — il fait foi.** **Le bloc de code d'une étape n'entre PAS
dans la numérotation continue des figures.** Pas de `<figcaption>` « Exemple n° N », et `cumulerFigures`
reste **inchangée** — vérifié : ses trois occurrences au diff sont toutes en commentaire. Motif écrit : la
marche à suivre *résume* la leçon, une commande résumée en tête ne vole pas son numéro à l'exemple qui
l'enseigne plus bas. Le défileur garde son nom (« Étape n° 1 — bash ») et son arrêt de tabulation : **pas de
numéro de figure ne veut pas dire pas de nom** (WCAG 2.4.6 / 2.1.1). La preuve de non-numérotation est
**croisée à trois endroits** — les noms des défileurs, `cumulerFigures([MARCHE]) === {0,0}`, et le compte de
`figcaption` à 0.

🔴 **LE DÉFAUT QUE 1 028 TESTS NE VOYAIENT PAS — la variante SORTIE de [[L-086]].** Le lien de renvoi vers un
**module** n'était tenu par aucune assertion sur son texte : le test ne lisait que `fragment` et `href`.
Muter `texte` en `''` laissait la suite **entière verte** et publiait un `<a>` **sans nom accessible** (axe
`link-name`, WCAG 2.4.4 / 4.1.2). ⚠️ La fixture portait pourtant **les quatre formes d'étape** du contrat, et
le gabarit les rendait toutes : **une fixture qui exerce N branches ne prouve pas N branches — il faut N
assertions mutation-séparables.** Au lot 2, L-086 était la variante *entrée* (les tests appelaient les
fabriques directement) ; ici c'est la *sortie*. Le geste : pour chaque branche du gabarit, se demander non
pas « est-elle rendue ? » mais « quelle mutation la ferait rougir ? ». **Fermé, avec contrôle positif : sous
mutation, exactement 2 rouges.**

🔴 **UNE FEUILLE QUI DOCUMENTE UNE EXCEPTION N'Y PENSE PAS TOUTE SEULE POUR LE CAS SUIVANT.** Le titre de la
marche à suivre recevait le tampon `micro-etiquette` — **Silkscreen, une police BITMAP**, plus
`text-transform: uppercase` et la chasse de tampon — alors qu'il est **une phrase par contrat** (quatre à
cinq mots). Or `rendu-blocs.scss` **lève déjà ces trois propriétés**, avec la raison écrite, pour les
**quatre** étiquettes d'encadré qui portent une phrase ; la marche à suivre est la **cinquième** et n'était
pas passée devant la liste. Son propre commentaire (« même traitement que l'étiquette d'un encadré »)
désignait les **trois** encadrés de ton — le mauvais précédent. ⚠️ **Aucun gate ne pouvait le voir** : **aucun
test ne lisait `.marche-a-suivre` dans la feuille compilée**, et la mutation de contrôle a rougi **1 seul
test** — révélant au passage que les quatre étiquettes-phrases d'encadré n'ont, elles non plus, aucune
assertion de feuille. Quand une feuille porte une liste d'exceptions **nommées**, tout ajout de même nature
doit se demander s'il rejoint la liste — et le **dire** dans son commentaire, dans un sens ou dans l'autre.

🔴 **L'INVENTAIRE DE SÉCURITÉ CITÉ COMME FAISANT FOI ÉTAIT FAUX DE MOITIÉ — [[S-011]], angle neuf.**
`generer-config-swa.mjs` énumère les champs d'auteur qui atteignent une **valeur d'attribut** (où la
sérialisation n'échappe pas `<`, donc où le compte brut de `<script` sort en **code 1** sur un dépôt sain).
Il en nommait **trois** ; mesuré par grep des liaisons `[attr.…]`/`[value]` de `src/app`, il y en a **six** —
le `<option value>` du quiz et le nom de région de la simulation manquaient **depuis toujours**, avant ce
lot. ⚠️ **Pourquoi ça compte, et ce n'est pas de la tenue de registre** : le jour où ce gate sort en code 1,
celui qui diagnostique **lit cette liste** ; si elle ne nomme pas la surface fautive, la correction
« rapide » devient de **relâcher le compte** — la pression S-011 elle-même, au pire moment, sur un site qui
enseigne la CSP. Les six sont désormais énumérés avec leur `fichier:ligne`. 🔴 **Dette nommée, non fermée :
aucun test ne tient cette liste**, elle se périmera au prochain `[attr.…]` ajouté à `src/app`.

🔴 **MON PROPRE CORRECTIF A RATÉ SON CONTRÔLE POSITIF, ET C'EST LA LEÇON LA PLUS UTILE DU LOT.** L'assertion
censée épingler le **canal** de `renvoi.titre` s'écrivait `expect(valeursDAttribut).not.toContain(charge)`.
Sous la mutation qui ajoute `[attr.title]="renvoi.texte"` au gabarit, elle est restée **VERTE** : sur un
tableau, `toContain` teste l'**ÉGALITÉ** d'un élément, or la valeur sortie est la charge **composée** dans
« Voir la section : « … » », jamais la charge nue. ⚠️ **Une assertion de sécurité qui passe son contrôle
positif par accident de matcher est un no-op qui a l'air d'un garde-fou.** Réécrite avec `.some(v =>
v?.includes(charge))`, elle rougit — **mesuré, pas déduit**. Corollaire : `toContain` sur un **tableau** et
sur une **chaîne** ne veulent pas dire la même chose, et c'est le genre d'écart qu'aucune revue de lecture
n'attrape.

⚠️ **DEUX PIÈGES D'ÉCRITURE PAYÉS EN DIRECT, tous deux de la famille [[L-015]].** (1) Un motif multi-ligne
écrit en `\n` **n'a pas mordu** sur un passage CRLF — le garde-fou du script de mutation l'a attrapé, au lieu
de me faire mesurer la référence en croyant mesurer la variante. (2) Les **antislashs d'une regex** écrite
dans un script d'édition ont été **mangés** : le test est sorti avec un motif qui ne matche jamais. Il a
rougi bruyamment — mais un motif subtilement faux serait passé **vert et vacu**. Parade adoptée :
l'assertion de feuille est écrite **sans aucune regex**, par `indexOf` sur le bloc, comme le fait déjà
`blocMedia`. **Les fins de ligne sont MIXTES à l'intérieur d'un même fichier** — `rendu-blocs.spec.ts` en
porte des deux sortes.

🔴 **LE BUDGET DE `rendu-blocs.scss` EST FRANCHI — AVERTISSEMENT, PAS ERREUR, ET LE LOT 6 EST PRÉVENU.**
Mesuré par compilation directe des deux versions : **5 769 o avant → 6 465 o après**. `angular.json`
(l. 46-57) pose `anyComponentStyle` à **6 kB d'avertissement / 8 kB d'erreur**. La CI ne rougit pas (elle
lance `npm run build`, code 0), mais **la marge jusqu'à l'erreur dure tombe à ~1 727 o**. **Le lot 4 ne
dégraisse pas** : ses règles neuves ont été relues une par une, aucune n'est morte ni redondante — couper là
couperait du comportement. **Relever le budget est refusé** : cacher la mesure n'est pas une option ici.
**Trois conditions écrites, à porter DANS LE BRIEF DU LOT 6** :

1. **Le lot 6 mesure AVANT d'écrire**, pas après :
   `npx sass --style=compressed …/rendu-blocs.scss | wc -c`, puis `npm run build` pour le chiffre qui fait
   foi. Son plafond à lui est **8 192 o**, pas 6 144. ⚠️ **Et ceci, qui n'est pas intuitif : chaque sélecteur
   neuf coûte ~22 o de PLUS que ce que `sass` affiche**, à cause de l'attribut d'encapsulation
   `[_ngcontent-…]` ajouté à chacun. Des onglets CSS purs, ce sont **beaucoup** de sélecteurs
   (`input:checked + label`, `input:checked ~ .volet`, `:focus-visible`…) : la sous-estimation y serait
   mécanique.
2. **La coupe est déjà identifiée et chiffrée** : fusionner les **13** blocs `@media (forced-colors: active)`
   en un seul, en fin de feuille — **~372 o** récupérés, mêmes spécificités, toutes les règles de base
   précèdent déjà. ⚠️ Elle touche `cartouche` / `contraste-force`, donc **d'autres composants** : c'est un
   **lot de feuille à part**, pas un correctif du lot 6.
3. **Si le lot 6 déborde malgré ça, le levier n'est ni le budget ni un composant neuf** (un composant
   coûterait un hachage `style-src` de plus, ce que la décision du lot 4 refuse) : c'est de sortir les styles
   d'onglets en **partiale globale** — `src/styles/_onglets-methodes.scss`, précédent `_code.scss` —, ce qui
   bascule les octets sous le budget `initial`, **mesuré lui aussi**. Coût réel à écrire : la règle globale
   ne fuit que si elle reste **strictement namespacée sous `.methodes`**, et elle sort du champ de
   `feuilleCompilee()` pour entrer dans celui de `design-system.spec.ts`.

⚠️ **AUCUN GATE D'ARTÉFACT N'A VU CE BALISAGE, et il faut le dire ainsi.** **Zéro** leçon de `content/`
n'écrit `:::: marche-a-suivre` : les 1 118 vérifications d'axe et les 50 e2e portent sur des pages où le
`<ol class="etapes">`, le défileur d'étape et le lien de renvoi **n'existent pas**. Leur vert prouve la
**non-régression**, jamais le rendu. **La preuve du rendu est dans `rendu-blocs.spec.ts`, ou elle n'est nulle
part** — même famille que « `verifiee` n'est pas `publiee` », payée trois fois ici. **Relancer G-axe et G-e2e
à la première leçon qui écrit le conteneur** (lot 8), avant de la déclarer finie.

**Deux dettes datées, délibérément HORS de ce lot** — les corriger d'un seul côté fabriquerait la divergence
que le dépôt paie depuis trois lots :

- **L'insécable des noms de défileurs.** `Étape n° 1 — bash` (U+00A0, convention française) contre
  `Code n°1 — php` (aucune) : les deux se lisent à la suite sur la même page. Aligner `etiquetteCode`
  **déplace des littéraux épinglés dans plusieurs specs** — c'est un lot à part, pas un correctif.
- **`code.langage` sort en valeur d'attribut sans grammaire runtime** ([[S-020]] transposée) :
  `verifierMarche` ne vérifie que `typeof === 'string'`, pas l'appartenance aux huit langages du contrat.
  **Défaut PRÉ-EXISTANT et présent à DEUX endroits** (`etiquetteEtape` **et** `etiquetteCode`) : à traiter
  aux deux dans le même commit, avec une liste blanche **dérivée** du contrat, jamais recopiée.

**Ce que les deux revues ont établi, et qui est propre** : aucun `bypassSecurityTrust*` neuf (l'unique appel
du dépôt reste scopé à `mermaid`, son garde-fou source intact) · les deux `[innerHTML]` neufs sont **nus**,
sanitizer actif, alimentés par `markdown-it` en `html: false` · **aucun `id` fabriqué** (L-026) ·
`routerLink` + `fragment`, jamais un `href="#…"` nu (L-030), avec contrôle négatif · **aucun jeton
`--couleur-…` neuf** · aucun littéral épinglé réaligné en douce · le choix `<p class="etiquette">` plutôt
qu'un `<h_>` est **juste et pour la bonne raison** (le composant ignore son niveau de titre ; un `<h_>`
ferait rougir `heading-order`).

**Gates à la clôture du lot 4** : `lint` **0** · `typecheck:tools` **0** · `content:build` **10 leçon(s) ·
33 SVG · 939/939 identifiants uniques** · `npm test` **1030 / 45 fichiers / 1 sauté / 0 échec** (1019 à la
clôture du lot 3) · `build` **13 routes · 14 hachages de style / 0 de script — inchangés**, plus **1
avertissement de budget SCSS, neuf et assumé** · `a11y:axe` **13 fichiers · 1118 vérifications · 0 violation
— inchangé** · `e2e` **50 passés / 1 sauté** · `design:contrastes:check` **40 paires / 40 mesures · 0 paire
neuve** · `npm audit --omit=dev` **0**.

⚠️ **LES DEUX DÉFAUTS DE BRIEF DE CE LOT, à ne pas répéter au lot 5.** (1) **L'implémenteur a fini à
218 355 tokens**, au-delà du plafond « exceptionnel » de 200k, alors que le brief annonçait « trois
fichiers » — ce qui *paraissait* dimensionné. La vraie mesure était le **volume écrit** (~580 lignes) plus la
lecture ciblée d'un spec de 1 900 lignes. **La découpe juste était « le rendu et ses styles » puis « les
tests et leurs contrôles positifs ».** Même famille que les lots 0bis et 2 : *le test du « + » se lit dans la
liste des gestes, jamais dans la phrase d'objectif.* (2) **L'agent de correctifs a été coupé en cours de
route** par une limite de session, après C1-C4 et avant A1, A2, B1-B3, C5. ⚠️ **Son rapport d'étape annonçait
« maintenant C4 » — il avait traité les items DANS UN AUTRE ORDRE que le brief**, si bien que la position
déclarée ne disait **rien** de ce qui restait. Le fil principal a terminé le reste lui-même. **Constater
l'état sur DISQUE, item par item, est le seul relevé qui fasse foi** quand un agent s'arrête en chemin —
jamais sa dernière phrase.

✅ **LE LOT 4bis EST LIVRÉ — spike jetable, 2026-09-06. LE VERDICT EST : D-C OPTION 1 TIENT.**
Mesuré en navigateur sur `/cours/securite-web/automatisation-surveillance/` (`ROUTE_LECON_QUIZ`), fenêtre
de pré-hydratation réellement ouverte (chunk paresseux `chunk-BbiB0V41.js` retenu), spec **2 passés / 0
échec**. Fixture fabriquée pour l'occasion — un groupe de radios dont le `name` est **lié** et le `checked`
**statique**, posé dans le `@for` de `rendu-blocs.ts` —, puis arbre de travail remis propre. Preuves
conservées hors dépôt (`spike-r1-rendu-blocs.diff`, `spike-r1.spec.ts`, journaux de run).

| Mesure | Verdict |
|---|---|
| **M1** — l'hydratation réécrit-elle le `checked` d'une radio statique ? | **NON.** La coche posée par le visiteur pendant la fenêtre survit ; le `checked` statique n'est **pas** réappliqué |
| **M2** — le `@for` recrée-t-il les `<input>` lors d'une interaction voisine ? | **NON.** Volet coché, puis quiz répondu et corrigé (`data-verdict="juste"`, donc le quiz a bien réagi) : l'onglet est **intact** |
| le `checked` est-il sérialisé dans le HTML prerendu ? | **OUI** — 85 `checked` pour 85 groupes |
| la fenêtre était-elle ouverte ? (contrôle positif **comportemental**) | **OUI** — un clic sur « Corriger mes réponses » émis dedans est **PERDU** (`.verdict` à 0 après hydratation) |

**Conséquence : le repli option 2 n'est pas nécessaire, `defaut` garde tout son sens, et les bornes du
conteneur `methodes` tiennent telles qu'elles sont écrites au contrat.** R-1 est **levé, par mesure**.

🔴 **LE SPIKE A TROUVÉ PLUS GRAVE QUE CE QU'IL CHERCHAIT, ET ÇA CHANGE LE CRITÈRE D'ACCEPTATION DU LOT 6.**
Le plan prescrit un `name` de groupe **dérivé du décalage de figures**, « jamais une constante ». Mesuré :
**ce décalage n'est pas un identifiant unique de page.** Plusieurs `app-rendu-blocs` sont montés par page —
un par encadré, par récursion — et **chacun recommence son `@for` à l'index 0** ; par ailleurs deux encadrés
sans figure entre eux **portent le même décalage**. Constaté en direct sur la fixture : 85 groupes ayant reçu
le même `name` ont été **fusionnés en un seul groupe par le navigateur**, et seul le **dernier** `checked` a
survécu — une radio dont l'attribut `checked` était pourtant bien présent s'affichait **décochée**.
⚠️ **C'est le vrai risque de D-C, et ce n'est pas l'hydratation.** Le lot 6 doit donc **prouver l'unicité du
`name` sur la page entière**, pas seulement sa dérivation ; sans quoi **un seul jeu d'onglets fonctionnerait
par page**, en silence, et le mode d'échec ressemblerait à un bug de CSS. Même famille que [[L-026]] (aucun
`id` fabriqué), et même famille que **S-010** : la promesse « dérivé, donc distinct » est un raisonnement,
et le décalage de figures ne la tient pas.

⚠️ **UNE LIAISON `[attr.name]` EST RÉÉVALUÉE À L'HYDRATATION** — mesuré : `spike-34-0` dans le HTML prerendu,
`spike-1-0` après hydratation, parce que la clef de la fixture était un compteur de module. Sans conséquence
là (les deux radios de la paire ont migré ensemble), mais **toute clef non déterministe entre le rendu
serveur et le client réécrit le `name` en silence**. Le décalage de figures est déterministe — à condition
que le point ci-dessus soit réglé.

⚠️ **PIÈGE D'ÉCRITURE PAYÉ AU PASSAGE, hors sujet mais coûteux :** un **backtick dans un commentaire HTML**
d'un gabarit *inline* **ferme le template literal TypeScript**. Le build sort rouge sur « Unexpected ";" »
et trois `NG8110` pointant **350 lignes plus bas** — aucun message ne nomme la cause. Candidat à
`lessons-learned.md`.

⚠️ **Coût du lot : 158 473 tokens / 42 appels**, au-dessus du gros maximum de 150k. Défaut de brief, pas
d'agent : j'ai mis `npm run build` (≈ 3-4 min, mur de sortie) **et** la boucle Playwright dans le même
périmètre. La découpe juste était « fabriquer la fixture et bâtir » puis « mesurer ». À retenir : **un spike
qui doit BÂTIR avant de MESURER est déjà deux lots.**

**Le geste suivant : le lot 5** (conteneur `methodes` — compilation et validation).
⚠️ **Le piège du lot, mesuré par le fil principal avant d'écrire le brief** : `defaut` est un **marqueur sans
valeur**, et **aucune grammaire d'attribut du dépôt ne sait en lire un**. `lireBlocDAttributs`
(`compiler-markdown.mjs:1047`) et `MOTIF_PAIRE_ATTRIBUT` (`valider.mjs:1108`) n'acceptent que des paires
`clef="valeur"` et **refusent tout résidu** — donc `{libelle="…" defaut}` est refusé **des deux côtés**
aujourd'hui. La grammaire s'étend dans les **deux** copies, par **liste blanche nominative** passée par
l'appelant, et le contrôle de résidu doit **rester sensible** à `{lignes=2}`.
⚠️ Le corpus de **fixtures invalides** reste le **lot 7**, délibérément à part (§9 du budget de contexte).

<!-- RÉCIT CLOS — le pointeur qui annonçait le lot 2, livré le 2026-09-02. Ses deux mises en garde ont
     TENU : `design:contrastes:check` a été lancé et n'a ajouté aucune paire ; `cours` reste refusé par le
     lot 1a (dette datée au lot 1b, [[S-026]]) et `diapos` n'est jamais vide sur un titre.
**Le geste suivant : le lot 2** (rendu du renvoi + sommaire). ⚠️ Il lance **aussi**
`npm run design:contrastes:check`, absent de `npm run build`, et déclare **quelles paires il ajoute**
avant d'écrire une couleur. ⚠️ Deux entrées l'attendent : `renvoiCours` peut porter `cours` (jamais
aujourd'hui, le lot 1a le refuse) et **`diapos` n'est jamais vide** — le lot 1a l'a rendu requis sur
un titre, si bien que le rendu n'a pas à cas-particulariser la liste vide.
-->

**5. Ensuite les neuf autres modules** (R-7 : la reprise passe devant le contenu neuf). ⚠️ **Coût
assumé par le propriétaire** : les séances enseignées d'ici la fin de la reprise n'auront pas de leçon.

**6. Ne pas oublier la trace.** À la clôture, reporter le contrat retenu dans
`docs/contenu/pipeline-contenu.md` **et** `docs/contenu/ancrage-au-cours.md`, la barre de qualité
dans `.claude/rules/contenu-pedagogique.md`, et la consigne de rédaction dans le skill `/lecon` —
sinon le prochain rédacteur écrira à l'ancien format.

⚠️ **Rappel de dimensionnement, payé quatre fois sur ce dépôt** : un lot se dimensionne au **volume
écrit**, pas au nombre de constats ni de livrables. Le dernier agent de correctifs du module 11 a
fini à **178k** pour 7 bloquants, parce que la leçon est passée de 731 à 939 lignes. Un correctif qui
fait croître une leçon de plus de ~15 % **est une réécriture partielle et se scinde**.

---

## CLÔTURE — LOT 5 : le conteneur `methodes` est compilé et validé (2026-09-07)

**Livré.** `:::: methodes` / `::: methode {libelle="…" defaut}` est désormais **compilé**
(`compiler-markdown.mjs`, `lireMethodes`) et **validé** (`valider.mjs`), avec la grammaire
d'attributs étendue **dans les deux copies** au marqueur SANS VALEUR `defaut`, par **liste blanche
nominative passée par l'appelant** (`marqueursAutorises`, `[]` par défaut — les cinq autres
conteneurs gardent leur message à l'octet près). Deux fixtures suivies
(`tools/content-pipeline/__fixtures__/methodes/`) pour les deux cardinalités, le reste sur racines
jetables. **Pas de rendu** : `TYPES_RENDUS` exclut toujours `methodes`, le lot 6 lève l'exclusion.

**Gates à la clôture — les sept verts, deux fois** (une fois sur le lot brut, une fois après les
correctifs de revue) : G-lint 0 · G-typage-outils 0 · G-content **10 leçon(s) compilée(s)**, 0
dépassement de poids · G-test **1061 passés / 1 sauté / 45 fichiers** (1051 avant les correctifs :
**+10 contrôles positifs**) · G-build **13 routes prerendues, 14 hachages de style / 0 de script** —
inchangé · G-axe **13 fichiers, 1118 vérifications, 0 violation** · G-e2e **50 passés / 1 sauté** ·
`npm audit --omit=dev` **0**.

**Deux revues indépendantes, verdict identique : APPROUVÉ AVEC RÉSERVES**, aucune faille
exploitable — tout ce qu'elles ont trouvé est *fail-closed* ou préventif. Les huit correctifs ont
été appliqués par un agent **frais**.

🔴 **CE QUE LES REVUES ONT ATTRAPÉ, ET QUI SE REPRODUIRA SI ON N'Y PENSE PAS.**
**(a) La parité des deux copies a été honorée pour l'ENFANT et oubliée pour le PARENT.**
`verifierVoletsDeMethode` n'inspectait que les lignes `::: methode` : `:::: methodes {titre="x"}`
passait la validation **code 0** et cassait la construction. Famille **S-010**. ⚠️ Quand un lot
ajoute un couple **conteneur/volet**, la parité se vérifie **aux deux niveaux**.
**(b) Une liste noire se réplique par COPIER-COLLER.** `refuserJetonHorsVolet` avait hérité le
prédicat négatif de `refuserJetonHorsPaire` — jamais mesuré. Mesuré à la revue : un `---` entre deux
volets produit **3 jetons `hr` de nesting 0**, tous **avalés en silence**. Les deux jumeaux refusent
désormais **tout** jeton en nommant son `type`. ⚠️ Le `content:build` post-correctif confirme les
**10 leçons** : le resserrement n'a cassé aucune leçon publiée.
**(c) Un message d'erreur peut suggérer à l'auteur la forme qui ne marche pas.** `::: methodes`
(3 `:`) avec 2 volets disait « porte **1** volet(s) », et `lireAttributs` composait son libellé avec
`':::'` **en dur**. Le libellé vient maintenant de `ouverture.markup`, et le refus dit qu'un
conteneur s'ouvre avec **au moins un `:` de plus** que ses volets.
**(d) L-019 récidive PAR TABLE.** `INTERDITS_DANS_UN_VOLET` a 5 entrées, **1 seule** était exercée :
une clef mal orthographiée n'apparierait plus rien, **en silence**. Trois entrées de plus sont
couvertes ; la 5ᵉ (`comparaison` imbriquée) exigerait six niveaux de deux-points — **résidu nommé**.

✅ **UNE CONCLUSION DE REVUE CORRIGÉE PAR LA MESURE DU FIL PRINCIPAL — et c'est la leçon de méthode
du lot.** Les deux revues concluaient qu'un volet **ne peut pas** contenir d'encadré, donc que
`types.d.ts` et `pipeline-contenu.md` mentaient en promettant « du contenu de bloc **général** ».
**Mesure : c'est faux.** `markdown-it-container` ferme un conteneur à la première ligne dont le
marqueur est **au moins aussi long** que l'ouverture — les longueurs doivent seulement **décroître
strictement**. Sous `:::::` / `::::` / `:::`, un volet rend `['prose', 'code', 'encadre']`, mesuré.
Le contrat n'était donc pas **menteur** mais **incomplet** : ce qui manquait est la règle de
longueur, écrite depuis aux **trois** endroits (`types.d.ts`, `docs/contenu/pipeline-contenu.md`,
et le `LISEZMOI.md` de la fixture, dont le titre absolu est corrigé). ⚠️ **Les deux revues avaient
mesuré le bon cas et généralisé d'un cran de trop** — un constat mesuré sur UNE forme ne devient pas
une impossibilité tant que les formes voisines n'ont pas été essayées.

⚠️ **COÛT DES AGENTS DE CE LOT, et les deux défauts de brief qui l'expliquent.** Rédaction **305k**
(le double du maximum admissible) · revue de code **164k** · revue de sécurité **155k** · correctifs
**183k**. Le brief de rédaction passait le test du « + » sur sa phrase d'objectif, mais portait
**quatre** gestes : étendre la grammaire d'attributs dans deux copies, écrire le lecteur du
conteneur, étendre quatre descentes récursives, **et** écrire les fixtures témoins. La découpe juste
était « la grammaire des marqueurs sans valeur, les deux copies, avec ses contrôles positifs » puis
« le conteneur `methodes` et ses bornes ». Le brief de correctifs portait **huit** correctifs dont un
resserrement à risque de régression : deux lots, là aussi.

**Le geste suivant : le lot 6** (rendu CSS pur du conteneur). Ses critères d'acceptation ont grossi
de deux familles pendant ce lot, tous deux écrits dans
[`docs/design/refonte-lecons-actionnables.md`](../design/refonte-lecons-actionnables.md) § « Lot 6 » :
les **quatre** critères du `libelle` (nœud texte seul, `name`/`id`/`for` dérivés d'indices, test à
deux mains de S-011 dans le même lot, inventaire des six écarts) et les **deux descentes de
`rendu-blocs.ts`** — `cumulerFigures` (~l. 426) et `decalagesDesSections` (~l. 1026) — qui ne voient
pas `methodes[].volets[].blocs` et doivent être corrigées **dans le commit qui ajoute le `@case`**,
sous peine d'un décalage de figures silencieusement faux.

---

## CLÔTURE — LOT 6 : le conteneur `methodes` est RENDU, en CSS pur (2026-09-07)

**Livré.** Le `@case ('methodes')` lève l'exclusion de `TYPES_RENDUS` : un groupe de radios de même
`name`, chacune suivie de son `<label>`, et les panneaux montrés par `:checked ~ …`. **Aucun
JavaScript, aucun composant neuf** — `script-src` reste à zéro, et aucun hachage `style-src` ne
s'ajoute (le bloc `<style>` d'un composant existant ne change pas de page).

**Gates à la clôture — les huit verts, deux fois** (une fois sur le lot brut, une fois après les
correctifs de revue) : G-lint 0 · G-typage-outils 0 · G-content **10 leçon(s)**, 0 dépassement ·
G-test **1081 passés / 1 sauté / 45 fichiers** (1061 au lot 5) · G-build **13 routes prerendues,
14 hachages de style / 0 de script** — inchangés · G-axe **13 fichiers, 1118 vérifications, 0
violation** · G-e2e **50 passés / 1 sauté** · G-contrastes **40 paires, aucune neuve** ·
`npm audit --omit=dev` **0**. PR **#50**, CI verte, SonarCloud vert.

🔴 **CE QUE LE LOT PROUVE, ET QUI N'ÉTAIT QU'UN RAISONNEMENT DANS LE PLAN.** Le critère d'acceptation
né du spike 4bis — « l'unicité du `name` sur la PAGE ENTIÈRE » — est tenu **par construction, puis
mesuré aux deux étages**. Le préfixe vient d'un input `chemin` : `Lecon` passe `section.ancre` (que
`contenu-compile.ts` dérive en kebab-case **et** dédoublonne), la récursion d'un encadré compose
`<chemin>_e<rang>`, un volet `<chemin>_m<rang>_v<rang>`. Le souligné étant impossible en kebab-case,
la disjonction avec l'espace de noms d'ancres est **structurelle**, pas argumentée.
⚠️ **Et il fallait DEUX specs, pas un** : `rendu-blocs.spec.ts` ne monte qu'une instance racine et
mesure la disjonction *à l'intérieur* (jusqu'au conteneur niché DANS un volet, le seul cas où le
chemin se compose deux fois) ; seul `lecon.spec.ts` mesure la disjonction *d'une section à l'autre*,
et lui seul tue la mutation « retirer `[chemin]="section.ancre"` ». C'est **L-086** appliquée
d'avance : un test qui appelle la fabrique prouve la fonction, jamais le **câblage**.

🔴 **`checked` EST UN ATTRIBUT LITTÉRAL, ET LES DEUX AUTRES FORMES CASSENT DIFFÉREMMENT.** Une
liaison de **propriété** (`[checked]`) ne touche que l'IDL, que la sérialisation du prerender
n'écrit pas : la page servie n'aurait **aucun** volet à l'écran. Une liaison d'**attribut**
(`[attr.checked]`) sérialise bien, mais le spike 4bis a mesuré qu'elle est **réévaluée à
l'hydratation** : le lecteur qui coche un autre onglet pendant la fenêtre de pré-hydratation ne pose
le *dirty checkedness flag* que sur CE volet-là, si bien que la réécriture rendrait sa coche au volet
`defaut` — l'onglet choisi sauterait en arrière, **en silence**, sur le seul mécanisme du site censé
être immunisé à L-033. D'où l'attribut statique, au prix assumé de deux branches `@if`/`@else`
identiques à un mot près.

🔴 **LE CRITÈRE R-8 A REÇU SA PINCE, ET C'EST LE GESTE QUE LE PLAN NE DEMANDAIT PAS.** Le contrat
exigeait un canal non chromatique ; la forme retenue est la plus économique qu'il autorise — la
**radio native reste visible**, son point coché étant peint par l'agent utilisateur, avec l'épaisseur
du filet en second canal. Mais rien ne **tenait** ce choix : `forced-colors: active` n'est mesuré par
aucun gate du dépôt, et un `appearance: none` posé plus tard par un lot qui trouve la radio
inélégante aurait détruit le canal **sans faire rougir quoi que ce soit** — le mode d'échec exact du
filet `.ligne-annotee` d'E2-ST4. Un test de feuille refuse désormais toute propriété qui efface la
radio, et l'assertion d'impression dit **pourquoi** le bloc `@media print` en est exempté (sur
papier, tous les volets sont dépliés : la rangée d'onglets n'a plus rien à commander). Contrôle
positif par mutation : **exactement 1 rouge**.

🔴 **CE QUE LA REVUE À REGARD NEUF A ATTRAPÉ — verdict APPROUVÉ AVEC RÉSERVES, rien de Critique.**
Les quatre axes qu'elle devait forcer (unicité, divergence serveur/client, fuite de `libelle`,
décalage de figures) sont ressortis propres, **par la construction et non par l'argument**. Ses trois
réserves étaient réelles et sont payées :
**(a) Deux gardes voisines comparaient deux chaînes différentes.** La vacuité du `libelle` se jugeait
sur la valeur **ébarbée**, le doublon sur la valeur **brute** — « Cours » et « Cours » suivie d'une
espace passaient donc toutes deux, alors que la garde du doublon existe précisément pour refuser deux
onglets qu'on ne distingue ni à l'œil ni au lecteur d'écran, et qu'une espace finale ne se voit dans
**aucun** des deux. ⚠️ **Une garde qui normalise d'un côté et compare de l'autre laisse passer
exactement ce qu'elle refuse** — et les deux lignes étaient voisines.
**(b) La pince de R-8, écrite au même lot, était elle-même une liste NOIRE.** Elle reconnaissait le
sujet d'une règle par **préfixe de chaîne** : `input.onglet { appearance: none }` et
`.onglet.actif { opacity: 0 }` lui échappaient — c'est-à-dire les deux formes les plus naturelles
pour qui veut masquer une radio. Le patron S-001/S-003 **récidive jusque dans le garde-fou écrit pour
l'appliquer** : on découpe désormais le compound en sélecteurs simples et on cherche la classe par
**appartenance**.
**(c) `nth-of-type` présupposait une composition que seul un commentaire tenait.** La correspondance
onglet ↔ panneau n'est juste que si les panneaux sont les seuls `<div>` du `<fieldset>` et les
onglets ses seuls `<input>` — `nth-of-type` compte par **nom d'élément**, sans regarder les classes.
Un `<div>` d'habillage décalerait toute la table : le deuxième onglet ouvrirait le premier panneau,
en silence.

🔴 **LA RÉSERVE MAJEURE EST REPORTÉE PAR ÉCRIT, ET C'EST LE POINT À NE PAS LAISSER TACITE.** Le
contrat du lot 6 nomme le spec e2e des trois états « la **seule** preuve recevable pour la famille
L-033 ». **Il n'est pas livré, et il ne pouvait pas l'être** : aucune leçon de `content/` n'écrit
`:::: methodes`, si bien qu'un spec e2e n'aurait aucune page à naviguer.
⚠️ **Conséquence à dire franchement : les 1 118 vérifications d'axe et les 50 e2e de ce lot n'ont vu
AUCUN `.methodes`.** Leur vert prouve la **non-régression**, jamais le rendu — ils sont verts *par
absence de données*, et les citer comme preuve du lot leur prêterait une portée qu'ils n'ont pas.
Concrètement, **rien ne mesure aujourd'hui que cocher un onglet montre son panneau** : jsdom ne
calcule pas la cascade, et `:checked ~ div:nth-of-type(N)` n'est vérifié par aucun test.
**Ce qui part donc avec le lot 8** (la première leçon qui écrira le conteneur), et qui n'est PAS clos
ici : le spec e2e des trois états, la passe G-axe sur une page portant des onglets, et la **capture
manuelle en contraste forcé** qu'exige §D.4. Même patron que le lot 4 (`marche-a-suivre`), et même
famille que « `verifiee` n'est pas `publiee` », payée trois fois sur ce dépôt.

⚠️ **RÉSIDU CHIFFRÉ — `rendu-blocs.scss` compile à 7 425 o**, sous le plafond d'**erreur** de 8 192 o
d'`angular.json`, mais à **~600 o** de lui (l'avertissement à 6 144 o est franchi depuis le lot 4).
Les trois conditions écrites pour ce lot ont tenu : mesure avant écriture, aucune coupe improvisée
dans les règles d'autrui, aucun jeton de couleur neuf. Le levier écrit pour le prochain lot qui
touchera cette feuille reste la **partiale globale** `src/styles/_onglets-methodes.scss` (précédent
`_code.scss`), qui bascule les octets sous le budget `initial` — **pas** un relèvement du budget, qui
reviendrait à cacher la mesure.

**Le geste suivant : le lot 7** — le corpus de fixtures invalides du conteneur. ⚠️ Il est à part
**délibérément** (§9 du budget de contexte) : un corpus de fixtures a déjà **doublé** un lot sur ce
dépôt, et il se compte — nombre de dossiers × lignes par dossier — **avant** d'écrire le brief.

---

## CLÔTURE — LOT 7 : les contrôles positifs de `{voir="…"}`, et le corpus qui n'avait plus d'objet (2026-09-07)

🔴 **LE PÉRIMÈTRE ÉCRIT AU PLAN A ÉTÉ RÉFUTÉ PAR LA MESURE, ET C'EST LE RÉSULTAT PRINCIPAL DU LOT.**
Le plan annonçait « ~12 cas invalides » en dossiers `__fixtures__/invalides/`. Le geste qu'impose
§9 du budget de contexte — **compter le corpus avant d'écrire le brief** — a montré que **dix des
douze étaient déjà écrits**, par les lots 3 et 5 eux-mêmes (table `REFUS` de
`pipeline-contenu-compilation.spec.ts`, bac à sable de `pipeline-contenu-validation.spec.ts`), et
que le douzième (« marche à suivre absente d'un module de la liste ») n'est **pas implémentable** :
`MODULES_AU_FORMAT_ACTIONNABLE` n'existe pas encore, c'est le lot 9. Écrire les douze aurait
recopié ~1 900 lignes pour rejouer une couverture existante, **et** gonflé de douze crans le compte
en dur que ce dépôt oblige un humain à relire. Le détail, cas par cas :
[`docs/design/refonte-lecons-actionnables.md`](../design/refonte-lecons-actionnables.md), bloc
« CE PÉRIMÈTRE A ÉTÉ RÉFUTÉ PAR LA MESURE ».

🔴 **CE QUE LA MESURE A TROUVÉ À LA PLACE — S-010, sixième forme, et personne ne la cherchait là.**
`jugerRenvoiDEtape` (la copie **validateur** de `{voir=…}`) porte **SEPT** refus. **Un seul** était
exercé : le titre ambigu, par `invalides/voir-titre-ambigu`. Les six autres étaient présents,
corrects, et **invisibles à toute régression** (**L-019**) — pendant que le **compilateur**, lui,
avait ses propres contrôles positifs pour plusieurs de ces mêmes formes. C'est exactement le motif
payé au lot 1a et au correctif C1 du lot 5 : **l'aval refuse, l'amont laisse passer**, et l'auteur
reçoit le message de l'aval, qui lui parle d'une **étape compilée** qu'il n'a pas sous les yeux.
⚠️ **Le grep qui aurait dû l'attraper ne pouvait pas** : les deux copies existaient, s'accordaient
sur le fond, et une seule était mesurée. Rien ne rougissait, rien n'était en `skip` — c'est la
**population des tests** qui était trouée, pas leur résultat. Chercher « quelle branche du juge
d'AMONT aucun runner n'atteint » est un geste distinct de « les deux copies disent-elles la même
chose ».

**Livré, et pourquoi sous cette forme plutôt qu'en douze dossiers.**

| Où | Quoi |
|---|---|
| `src/pipeline-contenu-validation.spec.ts` | bloc neuf : **six** refus de `jugerRenvoiDEtape` en bac à sable jetable (renvoi vide · `module:` sans slug · titre introuvable · renvoi hors tête · deux renvois · guillemets courbes), **plus la pince** — la racine témoin non mutée passe en code 0 |
| `tools/content-pipeline/__fixtures__/invalides/voir-module-inconnu/` | **un** dossier, UNE leçon : `{voir="module:cible-absente"}` vers un slug absent du sujet |
| `src/pipeline-contenu-compilation.spec.ts` | la branche **jumelle** du compilateur sur la même racine — c'est le COUPLE des deux assertions qui prouve la parité, aucune ne la prouve seule |
| comptes en dur | `51 → 52`, aux deux littéraux du spec et aux deux du `LISEZMOI` |

⚠️ **Chaque cas du bac à sable est une mutation d'UNE LIGNE de `__fixtures__/marche-a-suivre`**, qui
est valide. Le binaire exécuté est le même, la racine est vraie : la couverture est celle d'un
dossier, le coût ne l'est pas. `invalides/` reste réservé aux fautes qu'une mutation d'une ligne ne
sait pas écrire — d'où `voir-module-inconnu`, qui a besoin d'un **sujet** à lui.
⚠️ **Ce dossier ne porte qu'UNE leçon**, contrairement à ses deux voisins `voir-…` : un slug est
déjà absent d'un sujet qui n'en compte qu'un. Son discriminant est « slugs déclarés : **guide** »,
c'est-à-dire un **index non vide** — sans lui, un juge dont la carte slug → statut resterait vide
refuserait **tout** renvoi `module:` et passerait pour juste.

✅ **LES DEUX CONTRÔLES POSITIFS PAR MUTATION SONT EXÉCUTÉS, et le second est le plus instructif.**
Branche « renvoi vide » débranchée → **exactement 1 rouge**, le cas neuf. Branche « slug inconnu »
débranchée → **exactement 1 rouge**, et 🔴 **la racine reste REFUSÉE** : `52/52 cas refusés` demeure
**vert**, le renvoi retombant sur la branche du statut et sortant « statut: undefined ». Seule
l'assertion de **cause propre** l'attrape. C'est la démonstration, sur pièce, de ce que le
`LISEZMOI` de `invalides/` promet depuis le début — **un cas qui refuse ne prouve rien tant que la
cause n'est pas épinglée**, et c'est la discipline « un dossier = une faute » qui rend l'épinglage
possible.

⚠️ **UN PIÈGE PAYÉ EN ÉCRIVANT, ET IL EST TYPOGRAPHIQUE.** `jugerRenvoiDEtape` compose ses causes
avec des apostrophes **DROITES** (« qui n'est le titre d'aucune section »), alors que la prose de ce
dépôt emploie la **courbe** et qu'un éditeur la substitue volontiers. Première exécution : **1
rouge sur un produit sain** (**L-035**), l'assertion ayant été « normalisée » à la relecture. Le
texte de l'**étape injectée** peut, lui, porter la courbe — elle vient de l'auteur et traverse le
validateur telle quelle. Les deux graphies coexistent donc dans le même cas, et un commentaire le
dit sur place pour qu'un futur formateur ne les uniformise pas.

**Gates à la clôture — tous verts.** G-lint **0** · G-typage-outils **0** · G-content **10 leçon(s),
5/5 poids, 0 dépassement** · `--fixtures` **52/52 cas refusés avec une cause nommée** · G-test
**1090 passés / 1 sauté / 45 fichiers** (1081 au lot 6 : **+9**, soit 6 bacs à sable + la pince
témoin + le cas de fixture + la jumelle compilateur) · G-build **13 routes prerendues, 14 hachages
de style / 0 de script — inchangés** · `npm audit --omit=dev` **0**.
⚠️ **G-axe et G-e2e ne sont pas relancés localement et c'est délibéré** : ce lot ne touche **aucun**
code produit (`git diff` sur `valider.mjs` et `compiler-markdown.mjs` est **vide**), aucune feuille
de style et aucun contenu. La CI les exécute ; les citer comme preuve d'un lot qui n'a rien rendu
leur prêterait une portée qu'ils n'ont pas — même réserve qu'au lot 6, écrite pour la même raison.

⏳ **RÉSIDU NOMMÉ, à ne pas perdre.** L'inventaire des branches non exercées a été fait sur
`jugerRenvoiDEtape` et sur `exigerLesRenvoisDeModule`, pas sur le pipeline entier : un balayage
plus large a rendu **trop de faux positifs** pour faire foi (une assertion existante peut épingler
un fragment plus court que le message). **Ce lot ne prétend donc pas avoir fermé L-019 partout** —
il ferme la surface `{voir=…}`. Le balayage général reste à faire, et il demande de comparer des
**assertions** à des **branches**, pas des chaînes à des chaînes.

---

## CLÔTURE — LOT 1b : la résolution inter-cours de `cours="…"` (2026-09-08)

✅ **LE REFUS PROVISOIRE DU LOT 1a EST LEVÉ, DES DEUX CÔTÉS DANS LE MÊME COMMIT.** `cours="php"`
nomme un **dossier de sujet frère** ; le compilateur lit le `cours.code` de son `horaire.json` et
pose **ce code** au contrat compilé, d'où il part au rendu. PR **#52**, trois commits.
Contenu neuf : `content/cours/php/horaire.json` — les 13 séances du **420-4P2-HU**, relevées sur le
site de l'enseignant (deux lectures indépendantes concordantes ; pondérations 10+20+10+60 = 100).
Aucune `portee` n'est publiée par l'enseignant, donc **aucune n'est inventée**. Racine sans leçon
jusqu'à E7 — mesuré : son horaire est **tout de même validé par le schéma**.

🔵 **QUATRE DÉCISIONS PRISES EN L'ABSENCE DU PROPRIÉTAIRE, écrites au contrat AVANT le code**
([`docs/contenu/ancrage-au-cours.md`](../contenu/ancrage-au-cours.md) §3bis et §4). Elles sont
réversibles ; ce qui suit est le raisonnement, pour qu'il n'ait pas à le redériver.
**(1)** La valeur de `cours` est un **nom de dossier**, jamais un code de cours — donc le membre
rendu **cesse d'être du texte d'auteur**, ce qui ferme **S-026** par construction et non par une
regex. **(2)** Le registre est indexé par **nom de dossier** et non par le champ `sujet` déclaré :
**mesuré**, les racines de fixtures déclarent presque toutes `securite-web`, et une clef sur ce
champ les mettrait toutes en collision — chaque exécution de fixture rougirait sur une faute qui
n'est pas la sienne. **(3)** `seance` devient **obligatoire** dès que `cours` est écrit : sans
elle, le renvoi retomberait sur la séance du frontmatter, qui appartient à l'**autre** cours.
**(4)** Un dossier frère sans `horaire.json` n'est pas un sujet ; le refus **énumère les sujets
connus**, comme `voir-module-inconnu` au lot 7.

🔴 **CE QUE LA REVUE DE SÉCURITÉ A TROUVÉ, ET QUI VAUT AU-DELÀ DE CE LOT — « fermée pour le
PIPELINE » n'est pas « fermée pour la FONCTION ».** La grammaire du code de cours vivait dans
`schemas/horaire.schema.json`, donc dans `valider.mjs`, qui tourne **avant** le compilateur sur le
chemin de `build.mjs`. S-026 exigeait pourtant une grammaire **au compilateur** — et c'est lui,
seul, qui pose `code` au contrat compilé. La stratification du pipeline **fermait la dette là où
on la regardait**, pas là où elle vit. ⚠️ Contrôle positif exécuté, et c'est la moitié qui compte :
le garde débranché, `420-zzz-hu` **traverse jusqu'au contrat compilé** — la mesure dit donc que
c'est ce garde-là qui attrape, et pas un voisin. Compilateur restauré, `sha256` identique.
Second constat, corrigé dans le même commit : `Dirent.isDirectory()` fermait la porte du
**dossier**, mais `readFileSync` suivait encore un lien symbolique sur l'`horaire.json` **lui-même**
— `lstatSync().isFile()` (et non `statSync`, qui suit le lien) la ferme. **Un contrôle
d'EXISTENCE ne dit jamais rien du TYPE de ce qui existe** (S-021, deuxième forme).

🔴 **SONARCLOUD A ROUGI, ET IL AVAIT RAISON — 22,1 % de lignes dupliquées sur le code neuf (seuil
3 %).** Le réflexe du dépôt est de classer une duplication compilateur/validateur en faux positif :
la duplication **est** le contrat, appariée par les specs. **Ce cas-ci est l'exception, et la
distinction mérite d'être retenue : la duplication est le contrat pour ce qui JUGE, jamais pour ce
qui RECENSE.** Une divergence sur « quels frères existent » serait du pire genre — chaque copie
rendrait la **bonne** cause pour la population qu'elle a balayée, et aucun appariement de messages
ne pourrait la voir. Une seule source y est donc **plus forte** que deux. Le balayage est extrait
dans `tools/content-pipeline/sujets-freres.mjs`, importé par les deux (précédent
`compter-lignes.mjs`, même dossier) ; les **cinq refus**, eux, restent dupliqués.

⚠️ **DEUX DÉFAUTS TROUVÉS EN RELISANT LE DIFF, ET LE PREMIER EST UNE L-074.** Le commentaire du
spec affirmait que `420-4P2-HU` « n'apparaît **nulle part** dans le `lecon.md` » — c'était **faux**,
la prose de la fixture l'écrivait. Corrigé **en retirant le littéral de la fixture**, et non en
amendant le commentaire : la propriété devient vraie **par mesure** au lieu d'être affirmée. Second
défaut : un message de refus mélangeait apostrophe **courbe et droite dans la même phrase** —
exactement le piège payé au lot 7.

⚠️ **LE LOT 1b-B RESTE OUVERT, ET C'EST DÉLIBÉRÉ** (§9 du budget de contexte : un corpus de
fixtures est un **second livrable**). Les **cinq refus** de `causeDuRenvoiInterCours` — forme du
nom, superflu, sujet inconnu, séance absente, séance inexistante dans l'horaire cité — n'ont
**aucun contrôle positif** dans `invalides/` ni en bac à sable : seul le chemin **passant** est
mesuré. 🔴 **C'est exactement la population trouée de S-010/L-019**, et le lot 7 a montré qu'un
juge peut porter sept refus dont un seul est exercé. ⚠️ **L-094 s'applique : ce lot différé se
re-mesurera contre l'état du dépôt le jour où il s'ouvrira**, pas contre cette ligne — l'agent du
lot 1b-A a déjà **retargeté** un test existant du refus 1a vers le refus « pas un sujet frère »,
donc une part du corpus est peut-être déjà écrite. **Compter avant d'écrire le brief.**
Résidu nommé : le contrôle du lien symbolique sur l'`horaire.json` n'a **pas** de contrôle positif
— en écrire un demande un lien réel, ce que Windows n'accorde pas sans privilège.

🔴 **SONARCLOUD A ROUGI, ET IL AVAIT RAISON — POUR LA RÈGLE QUE CE DÉPÔT AVAIT LUI-MÊME ÉCRITE AU
LOT 1b.** 6,1 % de lignes dupliquées sur le code neuf (seuil 3 %). Le réflexe aurait été de classer
ça en faux positif : « deux specs qui mesurent deux copies d'un juge se ressemblent forcément ».
**C'était faux, et la mesure le dit.** Sur les trois blocs signalés, **deux étaient pré-existants**
et un seul était de ce lot : **15 lignes**, le harnais de bac à sable — copier l'arbre témoin,
muter une ligne, vérifier que la mutation a mordu — recopié à l'identique dans les deux specs.

⚠️ **C'est exactement la distinction du lot 1b, appliquée aux specs cette fois : la duplication est
le contrat pour ce qui JUGE, jamais pour ce qui RECENSE.** Les quinze causes de refus restent
écrites deux fois, et doivent l'être — c'est leur appariement qui interdit « l'aval refuse, l'amont
laisse passer ». Mais « bâtir l'arbre » ne juge rien. Si les deux harnais divergeaient, chaque spec
construirait un arbre légèrement différent et rendrait la **bonne** cause pour l'arbre qu'il a
construit. Extrait dans `src/aides-de-test/bac-a-sable-inter-cours.ts`, importé par les deux.
⚠️ **Nuance honnête, écrite pour ne pas être gommée :** contrairement au balayage de production de
`sujets-freres.mjs`, cette divergence-ci ne serait **pas totalement silencieuse** — chaque spec
épingle une cause précise et lève si sa mutation ne mord pas. C'est « plus sûr et moins cher », pas
« la seule option correcte ». Le dire évite qu'on cite ce précédent, plus tard, pour une extraction
qui n'aurait pas les mêmes raisons.

🔴 **L'EXTRACTION A DÉPLACÉ UNE FRONTIÈRE, ET C'EST LA VRAIE DÉPENSE DE CE CORRECTIF (L-034).**
`tsconfig.app.json` inclut `src/**/*.ts` en n'excluant **que** `*.spec.ts`, et porte `"types": []`
pour qu'aucune API Node ne soit atteignable depuis un composant — c'est la panne d'E1 qui a fait
naître ce réglage. Une aide qui appelle `node:fs`, posée n'importe où sous `src/`, entre donc **par
défaut** dans le programme de l'**application**. Il n'existait aucun emplacement pour ça : tout
`.ts` non-spec de `src/` est du code d'application, **mesuré avant d'écrire**. D'où
`src/aides-de-test/`, **exclu** nominativement de `tsconfig.app.json` et **inclus** nominativement
dans `tsconfig.spec.json`.
⚠️ **Les deux moitiés sont tenues par un garde-fou neuf**, sur le modèle exact du contrat de
contenu : chacune ne casse **qu'un seul programme à la fois**. Retirer l'exclusion laisse `npm
test` intégralement vert et ne fait rougir que `ng build`, plus tard, sur un message qui parle de
`cpSync` introuvable sans dire pourquoi ; retirer l'inclusion laisse les specs compiler **par
import transitif**, mais fait sortir l'aide du programme **déclaré**. Mutation exécutée sur
l'exclusion : **1 rouge exactement**, le bon test. G-build **inchangé** après l'extraction — 13
routes, 14 hachages de style / 0 de script.

**Gates à la clôture — tous verts, tous exécutés localement.** G-lint **0** · G-typage-outils **0**
· G-content **10 leçon(s), 5/5 poids, 0 dépassement**, journal neuf `4/5 sujets frères — 1 sujet(s)
voisin(s) portant un « horaire.json » : php` (L-005) · `--fixtures` **52/52 cas refusés avec une
cause nommée** (inchangé — aucun cas neuf, voulu) · G-test **1091 passés / 1 sauté / 45 fichiers**
(1090 au lot 7 : **+1**, l'assertion du chemin passant) · G-build **13 routes · 14 hachages de style
/ 0 de script — inchangés** · G-axe **13 fichiers / 1118 vérifications / 0 violation** · G-e2e
**50 passés / 1 sauté** · `npm audit --omit=dev` **0**.
⚠️ G-axe et G-e2e sont verts **par absence de données** : aucune leçon de `content/` ne porte encore
`{cours=…}`, donc leur vert prouve la **non-régression**, jamais le rendu — même réserve qu'aux
lots 6 et 7, écrite pour la même raison.

---

~~**Le geste suivant : le lot `1b-B`**~~ **✅ LIVRÉ le 2026-09-08** — voir la clôture ci-dessous.

---

## CLÔTURE — LOT 1b-B : les contrôles positifs des refus inter-cours (2026-09-08)

🔴 **LE LOT ANNONÇAIT « CINQ REFUS ». LE RECOMPTAGE EN A TROUVÉ QUINZE, DONT UN SEUL ÉTAIT
EXERCÉ.** C'est L-094 appliquée à la lettre — un lot différé se re-mesure contre l'état du dépôt le
jour où il s'ouvre — et c'est la deuxième fois d'affilée qu'elle paie : le lot 7 avait déjà trouvé
sept refus là où le plan en voyait un. La population réelle se répartit sur **trois** juges, pas un :

| Juge | Branches | Exercées avant ce lot |
|---|---|---|
| `causeDuRenvoiInterCours` (`valider.mjs`) | **6** | 0 |
| `resoudreRenvoiInterCours` (`compiler-markdown.mjs`) | **5** | 1 |
| `lireHoraireDUnSujetFrere` (`compiler-markdown.mjs`) | **4** | 0 |

⚠️ **LA LEÇON DE MÉTHODE, ET ELLE EST PLUS GÉNÉRALE QUE CE LOT : on ne compte pas des branches en
énumérant les façons d'écrire un attribut.** Les cinq refus du plan étaient exactement les cinq
qu'un auteur peut déclencher **en tapant dans son `lecon.md`**. Les dix autres ne s'atteignent qu'en
abîmant un fichier d'une **autre racine** — l'`horaire.json` du frère — et aucune lecture de la
grammaire d'auteur ne pouvait les faire apparaître. **Le recensement se fait en lisant le JUGE,
jamais en listant les entrées.**

🔴 **CE QUE LE RECENSEMENT A TROUVÉ ET QUI VAUT LE LOT À LUI SEUL : LE GARDE S-026 QUE LA REVUE DE
SÉCURITÉ AVAIT EXIGÉ N'AVAIT AUCUN CONTRÔLE POSITIF COMMITÉ.** La clôture du lot 1b écrit que le
contrôle positif « a été exécuté », le garde débranché, `420-zzz-hu` traversant jusqu'au contrat
compilé. C'était vrai — et c'était une mesure **à la main, une fois**. Rien dans le dépôt ne la
rejouait : ni `MOTIF_CODE_DE_COURS`, ni `cours.code`, ni `420-zzz` n'apparaissaient dans un seul
spec. ⚠️ **Une mesure qui ne laisse aucune trace qu'un gate puisse relancer est une intention, pas
un contrôle positif** (L-019) — et c'est un mode d'échec propre aux revues : elles mesurent pour
**décider**, et la mesure meurt avec le rapport. Le garde le plus récemment posé du dépôt était
donc, à la clôture même du lot qui l'a posé, le moins protégé contre sa propre disparition.

✅ **LE COUPLE S-026 EST DÉSORMAIS TENU AUX DEUX ÉTAGES, ET LES DEUX SONT NÉCESSAIRES.** La moitié
« fermée pour le PIPELINE » (la grammaire du schéma, atteinte par `valider.mjs`) vit dans le spec de
validation ; la moitié « fermée pour la FONCTION » (le littéral recopié dans le compilateur) vit
dans le spec de compilation. Retirer l'une rouvre S-026 **en silence** : `valider.mjs` tourne AVANT
le compilateur sur le chemin de `build.mjs`, si bien qu'un test passant par le pipeline ne prouve
rien de la fonction qui, seule, pose `code` au contrat compilé.

⚠️ **AUCUN DOSSIER N'A ÉTÉ AJOUTÉ À `invalides/` — `--fixtures` reste à 52/52, et c'est voulu.**
Même arbitrage qu'au lot 7, et il pèse plus lourd ici : chaque cas est une mutation d'**une ligne**
d'une racine valide qui a besoin d'un **sujet frère** à côté d'elle. En dossiers, chacun coûterait
l'arbre entier (`cours/securite-web/01-temoin/{lecon.md,quiz.json}` + `cours/php/horaire.json`) pour
une ligne utile — §9 de `.claude/rules/agent-context-budget.md`. Le bac à sable exécute le **même
binaire** sur une **vraie** racine : la couverture est la même, le coût ne l'est pas.

🔴 **LA DISCRIMINATION EST MESURÉE PAR MUTATION, PAS AFFIRMÉE (L-074).** Un test qui n'épingle que
« ça a échoué » passerait sur un juge qui refuse TOUT. Trois gardes ont donc été débranchés un par
un, chaque mutation imprimant d'abord la **preuve qu'elle a mordu** (L-015 — les fins de ligne de ce
poste sont mixtes) :

| Garde débranché | Rouges | Ce que ça établit |
|---|---|---|
| validateur · refus « superflu » | **1** | exactement le test qui le mesure |
| validateur · 6ᵉ branche « horaire refusé » | **2** | les deux cas qui traversent cette branche unique, chacun par sa cause |
| **compilateur · grammaire `cours.code` (S-026)** | **1** | exactement le test S-026 — la preuve que la revue demandait, désormais rejouable |

Restauration vérifiée après chaque passe — les deux outils reviennent à l'octet près à leur état
d'avant mutation. (Ces trois passes ont précédé la correction des deux commentaires de comptage
ci-dessus : le `git diff` alors constaté vide l'était donc légitimement.)

⚠️ **UN DISCRIMINANT QUE LE TEST EXISTANT NE POUVAIT PAS PORTER.** Le refus « sujet inconnu » avait
déjà un contrôle positif — mais sur une racine **ad hoc sans frère**, où le message sort en
énumérant **zéro** sujet. Un registre **toujours vide** aurait passé ce test-là. Le cas neuf vit sur
une racine qui a un frère et exige que le message le **nomme** : c'est le piège de l'index vide,
nommé au lot 7 sur `voir-module-inconnu`. ⚠️ **Un contrôle positif posé sur une population vide ne
mesure pas ce qu'il croit mesurer** — et rien dans son intitulé ne le dit.

⚠️ **DEUX COPIES QUI DISENT LA MÊME CHOSE AUTREMENT, ET QU'IL NE FAUT PAS « HARMONISER ».** Le
validateur ramène les quatre fautes d'horaire sous **une** branche (« dont l'horaire est refusé —
<cause Ajv> ») là où le compilateur en **nomme quatre**. Les deux sont concordantes, aucune n'est la
reformulation de l'autre, et une assertion recopiée d'un fichier à l'autre rougirait sur un produit
sain (L-035). Un commentaire le dit sur place, pour la même raison qu'au lot 7 : la prochaine
relecture voudra uniformiser.

**Gates à la clôture — tous verts, tous exécutés localement.** G-lint **0** · G-typage-outils **0**
· G-content **10 leçon(s), 5/5 poids, 0 dépassement** · `--fixtures` **52/52 cas refusés avec une
cause nommée** (inchangé, voulu) · G-test **1111 passés / 1 sauté / 45 fichiers** (1091 au lot 1b : **+20** — 18 contrôles
positifs de refus, plus les 2 gardes de la frontière ouverte par l'extraction) ·
`npm audit --omit=dev` **0**.
⚠️ **G-axe et G-e2e ne sont pas relancés localement, et c'est délibéré** — même réserve qu'au
lot 7 : ce lot ne rend **aucun pixel**, ne touche aucune feuille de style et aucun contenu. La CI
les exécute ; les citer comme preuve d'un lot qui n'affiche rien leur prêterait une portée qu'ils
n'ont pas.

⚠️ **DEUX FORMULES DU LOT 7 NE S'APPLIQUENT PAS ICI, ET LES RECOPIER AURAIT ÉTÉ UN MENSONGE.**
**(a)** « `git diff` est vide sur les deux outils » : `valider.mjs` et `compiler-markdown.mjs` SONT
modifiés — de **commentaires seulement** (les deux comptes de refus périmés, ci-dessus). Vérifié
par mesure plutôt qu'affirmé : leur diff, privé de ses lignes de commentaire, est **vide**.
**(b)** « aucune ligne exécutable » : c'était vrai avant le correctif SonarCloud, ça ne l'est
plus. L'extraction ajoute `src/aides-de-test/bac-a-sable-inter-cours.ts` et modifie **deux
tsconfig**. C'est précisément pourquoi **G-build A ÉTÉ relancé** — et il est **inchangé** : 13
routes prerendues, 14 hachages de style / 0 de script. Un lot qui touche au périmètre d'un
programme TypeScript ne peut pas se réclamer de la réserve « aucun pixel rendu ».

⚠️ **G-TEST COMPLET N'A PAS PU TOURNER D'UN SEUL TENANT SUR CE POSTE — mesuré, pas supposé.** Deux
tentatives ont été **tuées pour mémoire** (8 Go de RAM, ~2 Go libres, un navigateur en occupant
~1,5). Le chiffre ci-dessus est donc la **somme de quatre lots** `--include` disjoints couvrant les
45 fichiers, et non un run unique. ⚠️ **Le plafond CI du job entier est de 25 minutes** : sous
Linux, la suite tient largement — c'est ce poste-ci qui est la contrainte, pas la suite. Le coût
propre de ce lot est **mesuré à ~24 s** (les 13 tests du bloc compilateur sous `--filter`, 10
processus de compilation compris).

🔴 **UNE LENTEUR DIAGNOSTIQUÉE À TORT EN COURS DE ROUTE, corrigée par la mesure — ça vaut d'être
écrit.** Le spec de compilation avait tourné **35 minutes sans finir** avant d'être tué, et j'en ai
conclu qu'il était intrinsèquement lent (« chaque `compiler()` recharge Shiki »). **C'est faux** :
relancé seul, mémoire disponible, le même fichier fait ses **103 tests en 115 s**. Les 35 minutes
n'étaient pas du calcul, c'était du *thrashing* — la machine paginait. ⚠️ **Une explication
plausible et cohérente avec le symptôme n'est pas une cause** : celle-ci accusait la conception du
spec, ce qui aurait pu faire « optimiser » un fichier sain (L-074, même famille que les trois
règles CSS dont une était inerte). La bonne question devant une lenteur n'est pas « pourquoi ce
code est-il lent ? » mais « qu'est-ce qui a changé entre le run lent et le run rapide ? ».

⏳ **RÉSIDUS NOMMÉS, à ne pas perdre.**
**(a)** Le contrôle du **lien symbolique** sur l'`horaire.json` (`lstatSync().isFile()`) reste
**sans contrôle positif** — en écrire un demande un lien réel, que Windows n'accorde pas sans
privilège. Déjà nommé à la clôture du lot 1b ; **ce lot ne le lève pas**, et le redire vaut mieux
que le laisser se dissoudre.
**(b)** Le recensement a porté sur les **trois juges du renvoi inter-cours**, pas sur le pipeline
entier. **Ce lot ne prétend donc pas fermer L-019 partout** — il ferme la surface `cours="…"`. Le
balayage général reste à faire, et il demande de comparer des **assertions** à des **branches**,
pas des chaînes à des chaînes (même réserve qu'au lot 7).

**Le geste suivant : le lot 8** — le module 11 repris, en deux demi-lots. ⚠️ Il reste porteur de ce
que le lot 6 lui a légué et qui n'est **pas** clos : le spec e2e des trois états d'un onglet, la
passe G-axe sur une page portant des onglets, et la capture manuelle en contraste forcé.

---

## ✅ CLÔTURE — LOT 1c « le marqueur `{hors-cours}` » (PR #55, 2026-09-08)

Le marqueur est **compilé, validé et rendu**. Il dit qu’une section EST cartographiée et qu’aucune
diapositive ne la porte — ce qui la distingue du **silence**, réservé au non-cartographié. Deux
demi-lots : 1c-A au pipeline, 1c-B au rendu, plus un correctif SonarCloud.

🔴 **DEUX ÉCARTS QUE LA MESURE A IMPOSÉS, tous deux hors du périmètre écrit.**
**(a)** `{hors-cours="oui"}` n’était atteignable par **aucun** garde : il sortait en « attribut
inconnu », ce qui envoie l’auteur chercher une faute de frappe dans un nom parfaitement au contrat.
Les deux copies du juge gagnent une branche « cette clef est un marqueur déclaré ». Effet de bord
assumé : `{defaut="oui"}` sort désormais sous la même grammaire.
**(b)** Les deux copies **auraient divergé** sur `{titre="x" hors-cours="oui"}` — le validateur
jugeait les clefs par un `filter` rendant la première inconnue, le compilateur clef par clef dans sa
boucle. C’est le défaut (b) du lot 1a, à l’identique. Le filtre est devenu une boucle ordonnée.

🔴 **`SousEntreeSommaire.renvoiCours` S’APPELLE MAINTENANT `mention` — famille S-010.** Depuis
§3bis, ce champ peut porter « (hors du cours) », l’exact **contraire** d’un renvoi au cours. Un
littéral dont le nom promet autre chose que ce qu’il porte se relit faux par le prochain lecteur, et
ce dépôt l’a déjà payé sur `…_PAGE_LECON`. **Une promesse au singulier a une date de péremption
implicite** ; celle-ci était atteinte.

🔴 **CE QUE SONARCLOUD A ATTRAPÉ, ET POURQUOI IL AVAIT RAISON.** La porte a rougi à 10,8 % de
duplication sur le code neuf (seuil 3 %). Mesuré plutôt que supposé, par l’API : **un seul** foyer
était réellement neuf — les deux autres du rapport portaient sur des lignes **anciennes**, qui ne
comptent pas dans la métrique de code neuf. Ce foyer contenait dix lignes de `mkdtempSync`/`rmSync`,
le titre témoin recopié, et les trois cas de refus écrits deux fois à l’identique.
Correctif : `bacASableInterCours`, `TITRE_NU_INTER_COURS` (dont `TITRE_TEMOIN_INTER_COURS` est
désormais **dérivé**), `REFUS_DU_MARQUEUR_HORS_COURS` et `ISSUES_DU_BLOC_VIDE` montent dans
`src/aides-de-test/bac-a-sable-inter-cours.ts`. **10,8 % → 0,0 %**, comptes de tests **identiques**
(93/93 et 109/109) — le seul résultat acceptable pour un lot qui ne devait rien changer d’observable.
⚠️ **CE N’EST PAS UN RELÂCHEMENT DE « CE QUI JUGE SE DUPLIQUE » (L-095), C’EST SON APPLICATION.** Ce
qui reste écrit deux fois, ce sont les **branches** de `valider.mjs` et de `compiler-markdown.mjs` —
mesuré au lot 1c-A, **1 rouge exactement** sous mutation d’une seule copie. Une table d’ATTENTE
partagée ne partage pas la mesure : chaque spec lance toujours son propre juge, et si un seul des
deux outils changeait de message, sa moitié rougirait seule. Le contrat veut d’ailleurs la **même
phrase** des deux côtés, puisque l’auteur ne sait pas lequel des deux outils l’a repoussé.

**Gates à la clôture.** G-lint **0** · G-typage-outils **0** · G-content **10 leçons**, `--fixtures`
**52/52** inchangé · G-test `lecon` **103**, `rendu-blocs` **102**, compilation **109**, validation
**93** · G-build **13 routes · 14 hachages de style / 0 de script**, inchangés. Mutation 1c-B :
branche `horsCours` débranchée → **4 rouges exactement**, un par point d’appel, 99 verts intacts ;
restauration prouvée par `sha256` identique avant/après.

⚠️ **RÉSERVE ÉCRITE À LA CLÔTURE, et elle a été levée dès le lot suivant :** au moment de fusionner,
aucune leçon n’écrivait `{hors-cours}`, donc G-axe et G-e2e ne voyaient **aucune** mention. Leur vert
prouvait la non-régression, jamais le rendu.

---

## ✅ CLÔTURE — LOT 8-A « la moitié haute du module 11 » (PR #56, 2026-09-08)

Les onze titres de la moitié haute portent ce que
[`../contenu/renvois-diapos-module-11.md`](../contenu/renvois-diapos-module-11.md) **mesure** :
sept `{hors-cours}`, deux renvois inter-cours `{cours="php" …}`, deux renvois internes.

⚠️ **`{hors-cours}` N’EST PAS « JE N’AI PAS CHERCHÉ », et c’est ce qui rend le marqueur utile.** Les
sept sont adossés à une mesure d’absence sur les **16 extraits** (748 diapositives) : `VirtualHost`,
`DocumentRoot`, `AllowOverride`, `a2ensite`, `RewriteRule`, `public/`, `src/`, `composer`, `PSR-4`,
`WSL`, `Docker`, `php -S` — **zéro occurrence**. Un `aucun` de cette table est un **résultat**.

🔴 **LA RÉSERVE DU LOT 5 EST LEVÉE — PAR MESURE, PAS PAR UN VERT.** Le lot 5 avait écrit que « zéro
titre du corpus ne porte `{diapos=…}`, donc les 1118 vérifications d’axe portent sur des pages où le
`<p class="renvoi-titre">` n’existe pas ». Relevé sur `dist/…/projet-de-session/index.html` :
**11** `<p class="renvoi-titre">` sous les titres, et au sommaire **18 entrées dont 11 portent une
mention et 7 restent MUETTES**. Les sept muettes sont les sections de la moitié basse. **Le silence
d’« absent ≠ `false` » est donc visible en production**, et pas seulement en test unitaire.

🔴 **SIX DÉSACCORDS ENTRE LA LEÇON ET LES SUPPORTS, NOMMÉS AU LIEU D’ÊTRE TRANCHÉS EN SILENCE.**
Pondération du projet (15 % en diapositive, 20 % à l’horaire — R-10) · version de l’image
DigitalOcean (18.04 en capture, 24.04 au catalogue — R-1) · **XAMPP n’est pas propre au cours de
PHP** : la liste du matériel du cours de sécurité le réclame aussi, et ce qui appartient en propre au
4P2 est la *procédure détaillée* (R-3) · **MariaDB non plus** : la séance 9 l’installe
explicitement, donc l’écart est entre les deux cours et le **serveur cible**, pas entre les deux
cours (R-6) · la séquence `apt` **est** celle du cours, le seul ajout de la leçon étant le dépôt
`ondrej/php` · les deux cours prescrivent l’arborescence **plate** sous `/var/www/html`, l’exact
inverse de la section.

⚠️ **UN DÉFAUT PRÉEXISTANT DEVENU VISIBLE : LE PIPELINE NE REND PAS LE CODE EN LIGNE DANS UN TITRE.**
Le titre du VirtualHost portait des rétronotations ; le lecteur voyait les accents graves **dans le
`<h3>` comme au sommaire**. Corrigé côté contenu (les deux écritures, le titre et son `{voir="…"}`),
et le renvoi résout toujours — ce qui **prouve que l’ancre n’a pas bougé**. La limite du pipeline,
elle, appartient au rendu et reste ouverte : elle n’a pas été corrigée ici.

**Gates.** G-content **10 leçons / 0 dépassement** · G-build **13 routes · 14 hachages de style / 0
de script**, inchangés · G-axe **13 fichiers · 1118 vérifications · 0 violation**, cette fois **sur**
des pages qui portent le balisage · G-e2e **50 passés / 1 sauté** · G-test **159** sur les trois specs
qui lisent le manifeste réel.

🔴 **UN DÉFAUT DE BRIEF, PORTÉ AU COMPTE DU LOT 1c-A : l’agent a fini à 197k**, au-dessus du maximum
de 150k. Le brief tenait en un livrable déclarable seul, mais il portait deux juges + le type + le
contrat + deux specs + une mesure par mutation. ⚠️ **Le test du « + » ne se lit pas dans la phrase
d’objectif, il se lit dans la LISTE DES GESTES** — troisième fois que ce dépôt le paie. La découpe
juste était « les deux juges + le type » d’un côté, « les contrôles positifs et la mutation » de
l’autre.

**Le geste suivant : le lot 8-B** — la moitié basse du module 11, de « Cinq gestes de la mise en
ligne » à « Aller plus loin ». Ses réserves sont déjà écrites et **mesurées**
(`renvois-diapos-module-11.md` §2) : **R-2** (le prix du serveur existe en trois chiffres) · **R-4**
(WinSCP n’est **pas** de la séance 2 — 0 occurrence sur 82 diapositives ; l’encadré fautif promet
pourtant « ce sont eux qui seront nommés à l’examen ») · **R-5** (phpMyAdmin et `GRANT ALL` sur
toutes les bases sont enseignés par les **deux** cours) · **R-7** (le moindre privilège SQL est déjà
dans le cours de sécurité : la critique juste est plus étroite — le cours ne revient jamais
restreindre le compte qu’il vient de créer, et c’est celui-là que l’application emploie) · **R-8**
(le HTTPS est annoncé et jamais couvert **des deux côtés** — le seul recoupement où la leçon a raison
sans le revendiquer).

⚠️ **CE QUE NI 8-A NI 8-B NE FERMENT :** aucune leçon n’écrit encore `:::: methodes`. Le spec e2e des
trois états d’un onglet, la passe G-axe sur une page à onglets et la capture en contraste forcé
restent le legs **ouvert** du lot 6 — et ils demandent un lot à eux, pas une ligne de plus dans 8-B.

## ✅ CLÔTURE — LOT 8-B « la moitié basse du module 11 » (PR #57, 2026-09-08)

Les sept titres restants portent ce que
[`../contenu/renvois-diapos-module-11.md`](../contenu/renvois-diapos-module-11.md) mesure : quatre
renvois — dont **trois inter-cours** `{cours="php"}`, aux séances 3 et 8 — et trois `{hors-cours}`.

🔴 **LE MODULE 11 EST DÉSORMAIS TOTALEMENT CARTOGRAPHIÉ, ET C'EST MESURÉ SUR L'ARTÉFACT, PAS DÉDUIT
DU CONTRAT COMPILÉ.** Relevé sur `dist/…/projet-de-session/index.html` :

| | lot 8-A | lot 8-B |
|---|---|---|
| `<p class="renvoi-titre">` sous les titres | 11 | **18** |
| entrées de sommaire portant une mention | 11 / 18 | **18 / 18** |
| entrées **muettes** | 7 | **0** |

C'est exactement la condition que le gate total du lot 9 attend : chaque `##`/`###` porte soit des
diapositives, soit l'aveu qu'il n'y en a pas. ⚠️ **Le lot 9 hérite donc d'un corpus déjà conforme sur
son seul module de la liste** — son cliquet ne pourra pas se prouver sur le module 11 par un simple
vert. Il lui faudra une **fixture** qui viole la règle, comme au lot 1a.

**LES CINQ RÉSERVES SONT TRAITÉES, NOMMÉES DANS LA LEÇON PLUTÔT QUE TRANCHÉES EN SILENCE.**

- **R-2** — le prix du serveur existe en **quatre** chiffres, deux par cours et deux dates de
  catalogue (5 $ et 5 $/mois côté B10 ; 3 $ et 6 $/mois côté 4P2). La leçon donne l'**ordre de
  grandeur** et dit pourquoi les quatre sont exacts, au lieu d'en recopier un.
- **R-4** — 🔴 **WinSCP n'appartient PAS à la séance 2** (0 occurrence sur 82 diapositives) : posé à
  la séance 1, reconfiguré à la 3, employé à la 9. L'encadré fautif promettait pourtant « ce sont eux
  qui seront nommés à l'examen » — une promesse d'examen bâtie sur une attribution fausse est le pire
  des deux échecs symétriques de `contenu-pedagogique.md` §6. Scindé en **deux** encadrés, un par
  séance réelle : un encadré ne porte qu'une séance, la découpe n'était donc pas cosmétique.
- **R-5** — phpMyAdmin en racine web et `GRANT ALL ON *.*` sont enseignés par les **deux** cours.
- **R-7** — le moindre privilège SQL est **déjà** enseigné (séance 9, diapos 32-35). La critique
  juste est plus étroite : le cours ne revient jamais restreindre le compte qu'il vient de créer, et
  c'est celui-là que l'application emploie.
- **R-8** — le HTTPS est annoncé puis jamais couvert **des deux côtés** : ce n'est donc pas un angle
  mort du cours, c'est une promesse non tenue — et le dire ainsi rend le danger crédible au lieu de
  l'exagérer (mode d'échec des séances 3 et 4).

⚠️ **UNE CORRECTION D'ENCADRÉ SE PROPAGE AU RÉSUMÉ, ET LE RÉSUMÉ N'EST DANS AUCUN DIFF D'ENCADRÉ.**
Le paragraphe d'ouverture de la section (« trois gestes d'ici, trois de là-bas ») **et** le point
d'`À retenir` qui le reprenait portaient tous deux l'attribution corrigée par R-4 et R-5. Un lot qui
n'aurait édité que les encadrés aurait laissé la leçon se contredire **à deux endroits**, dont celui
que l'étudiant relit la veille de l'examen.

🔴 **LA QUATRIÈME RÉSERVE DU LOT 0ter EST FERMÉE, ET ELLE VALAIT D'ÊTRE ÉCRITE.**
`sommaire.ts:positionDuJalon` n'**applique** aucune règle de nature d'évaluation : il **présuppose**
qu'un jalon ne partage jamais sa séance avec un module. Le lot 0bis (`evaluation-pratique`) a rendu
cette présupposition fausse **en production** — le module 11 est publié sur la séance 11, celle du
projet — sans qu'aucun grep de la règle puisse le montrer. Un cas de `sommaire.spec.ts` le tient
désormais : le groupe {11} ne déclenche pas le fail-closed (il faut `min < seance && max > seance`,
or 11 n'est ni avant ni après lui-même) et ne réclame pas la position du jalon, donc le jalon se pose
**avant** le module qu'il évalue.
**Contrôle positif par mutation, imprimé** : `maximum <` → `maximum <=` dans `positionDuJalon` →
**1 rouge exactement**, et c'est le neuf ; les 41 autres tests du fichier restent **verts**, ce qui
prouve que le cas couvre une branche que rien n'exerçait. Mutation vérifiée **sur disque** avant
exécution (L-015), puis restaurée et re-mesurée à 42/42.

**Gates.** G-lint **0** · G-content **10 leçons / 0 dépassement** · G-build **13 routes · 14 hachages
de style / 0 de script**, inchangés · G-axe **13 fichiers · 1118 vérifications · 0 violation** ·
G-e2e **50 passés / 1 sauté** · G-test **1127 passés / 1 sauté · 45 fichiers** (+1, le cas neuf).

**Le geste suivant : le lot 9** — le gate du format actionnable (`MODULES_AU_FORMAT_ACTIONNABLE`,
D-D), qui n'existe pas encore. Il trouve le module 11 déjà conforme ; sa **sensibilité** se prouve
donc en fixture, jamais sur le corpus.

⚠️ **CE QUE LE LOT 9 NE FERME PAS DAVANTAGE :** aucune leçon n'écrit encore `:::: methodes`. Le spec
e2e des trois états d'un onglet, la passe G-axe sur une page à onglets et la capture en contraste
forcé restent le legs **ouvert** du lot 6, et demandent un lot à eux.
## ✅ CLÔTURE — LOT 9 « le gate du format actionnable » (2026-09-08)

`MODULES_AU_FORMAT_ACTIONNABLE` **existe**, la règle 13 de `valider.mjs` la lit, et le durcissement
porte son compteur : **`FORMAT ACTIONNABLE — 1/9 module(s) ancré(s) au cours repris ; 8 restant(s)`**, imprimé à
chaque exécution de G-test.

**Ce que la règle 13 exige d'un module de la liste, et rien d'autre :** (1) la section
`## En bref — la marche à suivre` présente, immédiatement après `## L'idée en une image`, et portant
son conteneur ; (2) chaque titre `##` **ou** `###` porte un bloc d'attributs ; (3) le module déclare
une `seance`. Pour tout autre module, **rien ne change** — c'est ce que D-D existe pour permettre.

🔴 **L'EXIGENCE (2) NE REJUGE PAS LA GRAMMAIRE D'UN RENVOI, ET C'EST CE QUI LA REND TOTALE.** Elle ne
teste que la **présence** d'un bloc ; ce que ce bloc contient est déjà jugé par la règle 4d, qui
refuse tout bloc ne citant ni `diapos` ni le marqueur `hors-cours`. La composition des deux donne
exactement « soit des diapositives, soit l'aveu qu'il n'y en a pas » — et rejuger ici aurait produit
**deux causes pour une seule faute**, ce que le mode `--fixtures` interdit. ⚠️ C'est le lot 1c qui a
rendu ce gate possible : sans `{hors-cours}`, « pas encore cartographié » et « rien à citer »
s'écrivent pareil, c'est-à-dire ne s'écrivent pas.

🔴 **LA PERMISSION MORTE NE POUVAIT PAS VIVRE DANS LE VALIDATEUR, ET LA MESURE L'A ÉTABLI CONTRE LE
CONTRAT DU LOT 0.** Celui-ci écrivait qu'un slug listé sans leçon correspondante « fait échouer le
build » — ce qui se lit naturellement comme « dans `valider.mjs` ». Porté là, le contrôle mordrait
sur **chaque racine** que le validateur examine, or **toutes** les racines de `__fixtures__/`
en sont — dont la cinquantaine de `invalides/` —, et aucune ne porte de `projet-de-session`. Les verdir
aurait demandé de leur écrire un module sans objet. Le contrôle vit donc dans
`src/format-actionnable.spec.ts`, seul à voir `content/cours/…` — **G-test rouge tant que la liste
ment**, ce qui bloque la PR au même titre. ⚠️ **La leçon est plus large que le cas : une règle dont
l'énoncé dit « le corpus » ne peut pas s'appliquer là où « la racine » est paramétrable.** Le contrat
(`docs/contenu/pipeline-contenu.md`) porte désormais la mesure, pas la formulation d'origine.

🔴 **CE QUI PROUVE LE GATE N'EST AUCUN DE SES REFUS — C'EST LE CAS DE PLUS, QUI ACCEPTE.** Le
module 11 est **déjà conforme** depuis le lot 8-B : un `content:build` vert ne dit donc rien de la
sensibilité de la règle, et le corpus ne peut pas la démontrer (le lot 8-B l'avait annoncé). D'où
`tools/content-pipeline/__fixtures__/format-actionnable/` — un module conforme au slug
`projet-de-session`, copié dans un bac à sable jetable et abîmé d'**une** mutation par cas. Le cas
**`hors-liste`** applique la *même* faute en changeant le seul `slug` : il doit sortir en **code 0**.
Sans lui, « refuse un titre sans renvoi » serait indistinguable de « refuse **tout** titre sans
renvoi » — soit un gate qui ferait rougir les neuf autres leçons publiées, dont aucune n'annote ses
titres. **C'est la moitié positive de la pince, et c'est elle qui coûte le plus cher à omettre.**

**Les huit cas, un par branche.** `sans-seance` · `titre-de-niveau-3-sans-renvoi` (⚠️ le **niveau 3** :
le relevé qui a dimensionné ce chantier compte 247 titres `##` **et** `###` ensemble ; n'exiger que
les `##` laisserait la moitié du corpus dehors sans un mot) · `section-absente` ·
`section-sans-conteneur` (un titre n'est pas une marche à suivre) · `section-mal-placee` ·
`section-entiere-deplacee` · `section-en-double` · `hors-liste`. Chacun sort **exactement une**
anomalie, et l'assertion épingle le fragment le plus spécifique du message, jamais le seul échec.

⚠️ **UN DÉTAIL DE FIXTURE QUI A COÛTÉ UNE MESURE, ET QUI SE REPRODUIRA.** L'étape 1 de la marche à
suivre témoin renvoyait d'abord à `## Ce que le gate exige` — la section que `section-mal-placee`
**renomme**. Le cas sortait donc **deux** causes, dont une (« titre introuvable ») qui n'avait rien à
voir avec ce qu'on mesurait. Le renvoi vise désormais le titre de niveau 3, que aucune mutation ne
renomme. **Dans une racine témoin, ce qu'une mutation touche et ce qu'un renvoi cite doivent être
disjoints** — sinon le harnais fabrique lui-même la seconde cause.

### La revue à regard neuf, et les trois défauts qu'elle a mesurés

Verdict initial **APPROUVÉ AVEC RÉSERVES**. Aucune réserve n'était une question de style ; les trois
premières ont été **reproduites par mesure** avant d'être corrigées, et deux d'entre elles ne se
voyaient dans aucun test.

1. 🔴 **Le compteur ne pouvait pas atteindre son état final.** `20-evaluation-cvss` est publiée,
   `section: Compléments hors cours`, **sans `seance`** — donc structurellement inéligible, puisque
   l'exigence (3) refuse un module listé sans séance. Elle était pourtant au dénominateur. La
   promesse du contrat (« le jour où les deux ensembles coïncident, la constante est supprimée »)
   était **inatteignable**, et l'exécuter aurait rendu cette leçon rouge à jamais. ⚠️ **S-005 pris à
   l'envers : une promesse écrite plus forte que ce que le gate peut tenir.** Dénominateur restreint
   aux publiées **ancrées** ; le compteur dit **1/9**, et nomme à part ce qu'il exclut.
2. 🔴 **Double cause sur la faute la plus naturelle.** Déplacer la section « En bref » **entière**
   donnait **deux** anomalies, dont la première mentait à l'œil (« est dans « ## En bref — la marche
   à suivre » » se lit comme une confirmation). Le cas `section-mal-placee` esquivait la question :
   il renommait deux titres en laissant le conteneur en place, un montage qu'aucun auteur ne
   produit. ⚠️ **Quand une règle neuve recoupe une règle existante sur la même donnée, le cas à
   écrire est la forme NATURELLE de la faute, pas celle qui isole proprement la branche visée** — et
   « une seule cause par faute » n'a **aucun garde-fou exécutable** hors du mode `--fixtures`.
3. 🔴 **Un doublon de la section passait VERT.** `findIndex` prenait la première occurrence et se
   taisait ; deux sections au même titre fabriquent deux ancres identiques — ce dont le lot 6 avait
   fait son critère d'acceptation.
4. ⚠️ **`--modules-actionnables` était un chemin PROPRE vers « code 0 sans rien valider »** :
   combiné à `--racine` ou `--fixtures`, il imprimait sa liste et sortait 0. Ce n'est pas une
   permission élargie, mais c'est la forme exacte qu'un contournement d'ordonnancement prend
   (famille S-018). Les modes de test sont désormais **exclusifs**, `--clefs` compris.
5. ⚠️ **Trois chiffres périmés dans trois écritures** (« onze racines », « une douzaine », « quatre
   refus » pour cinq). Réécrits **sans nombre** : un ordre de grandeur recopié nu devient un
   mensonge à la vitesse où le corpus grossit.

**Gates, après correctifs.** G-lint **0** (⚠️ deux dépassements de complexité cognitive apparus au
correctif, fermés par extraction : `causeDeLaSectionActionnable` et `exigerDesModesDeTestExclusifs`)
· G-typage-outils **0** · G-content **10 leçons / 5/5 poids / 0 dépassement** · `--fixtures`
**52/52** (compte en dur **inchangé** : les huit cas vivent en bac à sable, pas dans `invalides/`) ·
G-test **1140 passés / 1 sauté · 46 fichiers** — la référence a été **remesurée sur `main` en
retirant les fichiers du lot** : **1128 / 1 sauté · 45 fichiers**, donc **+12 exactement, les douze
tests neufs** (⚠️ la clôture du lot 8-B annonçait 1127 : l'écart d'un test est **antérieur à ce lot**
et non expliqué par lui) · G-build **13 routes · 14 hachages de style / 0 de script**, inchangés ·
G-axe **13 fichiers · 1118 vérifications · 0 violation**, inchangés.

**Cinq contrôles positifs par mutation, exécutés, mutation vérifiée sur disque avant mesure (L-015) :**

| Mutation de `valider.mjs` | Résultat |
|---|---|
| exigence (2) débranchée | **1 rouge exactement** — `titre-de-niveau-3-sans-renvoi` |
| branche « sans conteneur » débranchée | **1 rouge exactement** — `section-sans-conteneur` |
| gate rendu inconditionnel (`if (formatActionnable \|\| true)`) | **1 rouge exactement** — `hors-liste`, la moitié qui discrimine |
| slug **fantôme** ajouté à la liste | **1 rouge exactement** — la permission morte, qui **nomme** le slug |
| `evaluation-cvss` (publiée, **sans `seance`**) ajoutée à la liste | **1 rouge exactement** — c'est la garantie NEUVE du constat n°1 : la liste ne peut pas accueillir un module qu'elle ferait échouer |

### 🔴 CORRECTIF POSTÉRIEUR — le spec du lot 9 rendait DEUX verdicts selon l'hôte (2026-09-09)

**Le symptôme.** Sur ce poste Windows, `npm test` sur un `main` **propre** rendait **1135 passés /
5 échecs**, tous dans `src/format-actionnable.spec.ts`, tous sur le même message : « … introuvable —
la fixture a changé ». La fixture était pourtant intacte (`git diff` vide). La CI, elle, était
**verte** — les cinq PR fusionnées depuis le lot 9 le confirment.

**La cause, mesurée.** Les cibles de mutation arrivent sous **deux formes typographiques** qui ne
portent pas les mêmes fins de ligne : `SECTION_TEMOIN` est un littéral **gabarit** qui s'étend sur de
vraies lignes, donc il hérite des fins de ligne **du fichier `.ts` lui-même** ; les autres cibles sont
écrites avec des échappements `\n`, donc toujours en **LF**. Avec `core.autocrlf=true`, une extraction
fraîche rend le spec **et** la fixture en **CRLF** sous Windows : les cibles en `\n` ne mordent plus.
Sur le runner Linux tout est en LF, et les cinq cas passent.

🔴 **CE QUI REND LE DÉFAUT SÉRIEUX N'EST PAS LE ROUGE, C'EST SON SENS.** Le spec ne se contentait pas
d'échouer : il **cessait de mesurer** le gate le plus récent du dépôt sur toute machine Windows,
c'est-à-dire celle où les leçons s'écrivent. C'est le **miroir exact** du piège déjà payé sur
`extraire-diapositives.mjs` — « une garde dont le verdict change avec l'hôte est DEUX gardes » — à
ceci près qu'ici le verdict trompeur était le **vert** de la CI. ⚠️ Et le harnais a fait exactement ce
qu'il devait : `muter` **lève** sur une cible introuvable au lieu de mesurer une racine non mutée. Sans
ce garde, les cinq cas auraient été **verts en ne prouvant rien** — la racine serait restée valide et
le validateur l'aurait acceptée, ce que le test attendait… pour la mauvaise raison.

**Le correctif.** `muter` normalise les **deux** côtés de la comparaison en LF. Le spec devient
indifférent à la forme d'extraction, et la fixture peut arriver dans l'une ou l'autre.
**Mesure après correctif, sur ce poste : `npm test` → 1140 passés / 1 sauté / 46 fichiers**, soit
exactement le chiffre que la clôture du lot 9 annonçait. Les cinq cas appliquent de nouveau leur
mutation et le validateur les refuse — c'est le contrôle positif : une mutation qui ne mordrait pas
laisserait la racine valide et le cas échouerait.

⚠️ **La règle qui en sort, plus large que ce spec.** Dans ce dépôt, **une cible de comparaison
textuelle ne se compare jamais telle quelle** : soit on normalise, soit on écrit la cible dans la
même forme que la source — et la forme d'un littéral gabarit **n'est pas choisie par son auteur**,
elle est celle du fichier. Cousine de L-015, avec l'aggravation que le désaccord ne se voit que sur
la moitié des plateformes.

**Le geste suivant : le legs OUVERT du lot 6.** Aucune leçon n'écrit encore `:::: methodes`, donc
G-axe et G-e2e n'ont **vu aucun onglet** — leur vert prouve la non-régression, jamais le rendu, et
**rien ne mesure aujourd'hui que cocher un onglet montre son panneau**. Le spec e2e des trois états,
la passe axe sur une page portant des onglets et la capture en contraste forcé se font à la première
leçon qui emploie le conteneur. Puis la reprise du module suivant (R-7 : les dix modules publiés
passent devant le contenu neuf), qui fera descendre le compteur de 1/9 à 2/9.

## ✅ CLÔTURE — LOT 10 « la reprise du module 01 » (PR #61, 2026-09-09)

`MODULES_AU_FORMAT_ACTIONNABLE` porte désormais **deux** slugs, et le compteur imprimé par G-test
dit **`FORMAT ACTIONNABLE — 2/9 module(s) ancré(s) au cours repris ; 7 restant(s)`**. Le module
`01-fondamentaux` — dix-sept titres `##`, aucun `###` — porte onze renvois `{diapos="…"}` et six
`{hors-cours}`, une section `## En bref — la marche à suivre` à six étapes, et **le premier
`:::: methodes` du dépôt**.

### 🔴 LE LEGS DU LOT 6 EST LEVÉ SUR SA MOITIÉ « RENDU », ET SEULEMENT SUR CELLE-LÀ

Depuis le lot 6, aucune leçon n'écrivait le conteneur : G-axe et G-e2e n'avaient **vu aucun
onglet**. Relevé sur `dist/…/fondamentaux/index.html` : **un** `<fieldset class="methodes">`, **deux**
radios `.onglet` de même `name` (`la-chaine-d-outils-de-la-session_m4`), **un seul** `checked`, deux
`<label class="onglet-nom">`, et **24 renvois d'encadré** rendus dont celui d'un
`correction-du-cours` (« Séance 1 · diapos 46, 52 »). G-axe a donc tourné **sur une page portant des
onglets** — 13 fichiers, 1118 vérifications, 0 violation.

⚠️ **Ce que ce vert ne prouve toujours pas.** Le **spec e2e des trois états** (sans JS,
pré-hydratation, impression) et la **capture en contraste forcé** n'existent pas : **rien ne mesure
que cocher un onglet montre son panneau**. Le lot 10 les **débloque** — il ne les écrit pas. C'est le
geste suivant, et il demande un lot à lui.

### La cartographie d'abord, et `aucun` comme résultat

`docs/contenu/renvois-diapos-module-01.md` — 45 lignes de table, **27 renvoyant à des diapositives,
17 `aucun` en confiance certaine**. 44 termes cherchés dans les **21 extraits**, sans distinction de
casse, et **la cellule les nomme**. ⚠️ Sa propre limite y est écrite : les **exercices de B10 n'ont
pas d'extrait**, donc `aucun` veut dire « absent des 21 extraits de diapositives », jamais « absent
du cours ». C'est cette phrase-là qui a permis de trancher R-3.

### 🔴 LES TROIS RÉSERVES QUI ONT COÛTÉ LE PLUS, ET POURQUOI

- **R-4** — la leçon affirmait que « la diapositive d'introduction du cours **liste** ces mots :
  chapeau blanc, chapeau noir, pirate, éthique, faille, intrusion ». Mesuré : `chapeau` **0**,
  `éthique` **0**, `intrusion` **0**, `faille` **1** — et dans l'autre cours. **Cette diapositive
  n'existe pas.** Parade appliquée : **retirer l'attribution, garder le fait**.
- **R-3** — « aucune question d'examen 2026 ne s'appuie dessus » est une **promesse que ce dépôt ne
  peut pas tenir** : la diapositive 6 écrit que l'examen porte sur « les notes **et les exercices** »,
  les notes sont celles des treize séances. ⚠️ **Une promesse d'exclusion fait choisir à l'étudiant ce
  qu'il ne révise pas** — c'est le pire des deux échecs symétriques, pire qu'un fait manquant.
- **R-1** — le déck porte **quatre** blocs de contenu, pas trois ; la leçon **enseignait** le
  quatrième (diapositive 23) tout en le déclarant inexistant.

### 🔴 LA LEÇON DE MÉTHODE DU LOT, PAYÉE DEUX FOIS DANS LE MÊME LOT

**Une marche à suivre écrite APRÈS les correctifs les recopie de mémoire et ressuscite la version
corrigée.** L'étape 2 réintroduisait l'appariement attaque→CIA « que le cours repose à chaque
famille » (R-7, fermée deux commits plus tôt) ; l'étape 6 réintroduisait « trois blocs » (R-1). La
première a été attrapée par relecture, **la seconde seulement par la revue à regard neuf**.
⚠️ **Aucun diff ne peut montrer ça** : la section neuve est *ajoutée*, la correction qu'elle défait
est ailleurs et non touchée. **Une section neuve se relit contre chaque réserve FERMÉE, jamais contre
le diff.**

Même famille, autre forme : l'encadré OWASP affirmait encore « ce qui est **attendu à l'examen** …
pas de réciter dix intitulés », et `quiz.json` q6 le durcissait en « Faux » catégorique. **C'est la
correction R-3 qui a créé l'incohérence** — le passage était juste avant elle. ⚠️ **Quand on
interdit une CLASSE d'affirmation, il faut recenser toutes ses occurrences, pas seulement celle qu'on
corrigeait.**

### Ce que la revue a mesuré d'autre

⚠️ **Un volet d'onglet masqué avait capté une matière UNIQUE** : `/var/www/html/` n'existait nulle
part ailleurs dans la leçon. C'est exactement ce que la clause de rédaction de **D-C** interdit — le
contenu masqué est l'**équivalent** du visible, jamais une information qu'on ne trouve pas ailleurs —
et le `Ctrl+F` ne l'atteint pas (R-4 du verdict, coût assumé). Le chemin est nommé dans le volet
visible. 🔴 **Aucun gate ne peut mesurer cette clause** : c'est une règle de rédaction, et elle s'est
fait enfreindre **dès le premier conteneur écrit**.
⚠️ Un `correction-du-cours` mettait « Diapositives 46 et 52 » **en texte libre dans `source=`** alors
que la variante **admet `diapos`** : le renvoi n'était ni mesuré ni rendu. La table des variantes du
§3 se relit avant d'écrire un encadré, pas après.

### Les défauts de BRIEF de ce lot, comptés

Quatre agents, dont **deux au-dessus du maximum** : cartographie **186k**, réserves du périmètre
**146k**, réserves de l'outillage **143k**, format actionnable **157k**, revue **148k**.
🔴 **Le débordement de la cartographie a une cause nommable : la MESURE D'ABSENCE est un lot en
soi.** Le brief la mentionnait en une ligne (« cherche les termes dans les 21 extraits ») ; c'est en
réalité **44 termes × 21 fichiers**, dont chaque résultat entre au contexte. **Même patron que les
fixtures (§9 du budget de contexte) : ce que l'agent doit PRODUIRE se compte avant d'écrire le
brief — et une campagne de `grep` produit du volume exactement comme un corpus de fixtures.**

**Gates.** G-lint **0** · G-typage-outils **0** · G-content **10 leçons · 939/939 identifiants
uniques · 0 dépassement** (`fondamentaux` 123,0 → 124 Ko brut / 33,4 Ko servi) · `--fixtures`
**52/52**, compte en dur **inchangé** · G-test **1140 passés / 1 sauté · 46 fichiers**, **inchangés**
· G-build **13 routes · 14 hachages de style / 0 de script**, **inchangés** · G-axe **13 fichiers ·
1118 vérifications · 0 violation** · G-e2e **50 passés / 1 sauté**.

**Le geste suivant : le legs du lot 6, dans sa moitié qui reste.** ✅ **FAIT AU LOT 11** (bloc de
clôture en fin de document) — le spec e2e des quatre états et la capture en contraste forcé existent,
et G-e2e passe de 50 à 57. Reste la reprise du module suivant, qui fera descendre le compteur de 2/9
à 3/9.

## ✅ CLÔTURE — LOT 11 « les quatre états des onglets, mesurés en navigateur » (2026-09-09)

Le legs du lot 6 est **entièrement levé**. `e2e/onglets-methodes.spec.ts` porte **sept tests** sur
`cours/securite-web/fondamentaux/` — la seule page du dépôt qui porte un `:::: methodes` — et G-e2e
passe de **50 à 57 passés / 1 sauté**. Avant ce lot, « cocher un onglet montre son panneau », c'est-à-dire
le comportement **entier** de la fonctionnalité, n'était mesuré **nulle part** : jsdom épingle la
structure et n'applique aucune feuille ; G-axe et G-e2e, eux, n'avaient jamais vu d'onglet.

### Les quatre états, et ce que chacun a exigé d'instrument

1. **Sans JavaScript** — un `browser.newContext({ javaScriptEnabled: false })`, parce que le drapeau ne
   se règle qu'à la création du contexte. Contrôle positif : les attributs `ngh` du HTML déshydraté
   sont **toujours là** ; un contexte dont le drapeau serait ignoré rendrait le test vert en mesurant
   une page vivante.
2. **Pendant la fenêtre de pré-hydratation** — l'état posé par le DOM natif survit. ⚠️ **Cet état n'a
   PAS de contrôle positif comportemental, et c'est structurel** : le contrôle du spec du quiz est
   « un clic émis dans la fenêtre est perdu », or ici il n'y a **aucun écouteur à perdre** — c'est
   précisément ce qu'on mesure. Restent les deux contrôles structurels (`ngh` présents, un `.js`
   réellement retenu).
3. **À l'impression** — les trois volets visibles, chacun sous son `<p class="panneau-nom">`, dans
   l'ordre du document ; radios et `<label>` absents. Témoin négatif posé **avant** `emulateMedia` :
   à l'écran, un seul panneau — sans lui, une feuille `print` jamais appliquée serait indiscernable
   d'une page qui montre déjà tout.
4. **En `forced-colors: active`** — mesuré **deux fois**, par la règle retenue et par les pixels.

### 🔴 CE QUE LA CAPTURE A APPRIS, ET QU'AUCUNE LECTURE DE FEUILLE NE DISAIT

Le critère de R-8 demandait « une capture manuelle en HCM à la clôture ». Elle est **mesurée** plutôt
que regardée, et elle a **réfuté la lecture optimiste** du commentaire de `rendu-blocs.scss`.

**Le canal d'épaisseur survit, mais sa marge se réduit exactement là où on comptait sur lui.** En
`forced-colors: active`, le filet de l'onglet **inactif** — `solid transparent`, donc rien du tout à
l'écran normal — devient **PEINT** : le moteur force sa teinte sur `CanvasText` comme celle de son
voisin. Relevé en rangées pleines sous le `<label>` : **écran normal 2 contre 0 · contraste forcé 2
contre 1**. En HCM, **tous** les onglets portent donc un trait, et il ne reste **qu'un pixel d'écart**
entre l'actif et les autres.

🔴 **C'est pourquoi le canal qui porte réellement R-8 est l'AUTRE, et il est désormais mesuré en
pixels : la radio native laissée visible.** `rendu-blocs.scss` l'affirmait déjà (« le point d'une
radio cochée est peint par l'agent utilisateur et survit ») ; l'affirmation était écrite et non
mesurée. Relevé dans le quart central de la boîte de 13 × 13, en contraste forcé : radio **cochée
1,00**, radio **vide 0,00** — un anneau creux contre un point plein. Et le point **suit la
sélection** : après bascule, l'encre a déménagé et l'onglet abandonné est revenu à 0,00 (sans ce
second relevé, un rendu où le premier onglet serait peint en dur — mécanisme mort — passerait).

### 🔴 UN INSTRUMENT QUI SE CALIBRE SUR CE QU'IL MESURE MESURE ZÉRO

Défaut trouvé **par la mutation, pas par relecture**, et c'est la leçon de méthode du lot. La
première version de `profilPeint` définissait son « fond » comme la **teinte majoritaire** de la
capture — heuristique juste sur un `<label>` de 358 × 44, où le fond domine largement. Elle
**s'inverse** sur une radio cochée : dans une boîte de 13 × 13 occupée par un anneau plein et son
point, c'est l'**encre** qui est majoritaire, si bien que le point peint se comparait à lui-même et
se mesurait **0,00**. Le test accusait le produit ; c'était l'instrument.

Le fond est désormais le **pixel du coin supérieur gauche** — hors du disque d'une radio comme hors
du filet d'un onglet — avec un garde-fou **à sens unique** : au-delà de 0,98 d'encre, le coin est
tombé sur de l'encre et l'aide **lève**. ⚠️ **Le sens inverse est délibérément laissé passer** : une
capture presque vide n'est pas un défaut d'instrument, c'est un élément qui ne peint rien — très
exactement la régression que les appelants cherchent. La refuser dans l'aide **volerait à
l'assertion de l'appelant son message**, qui nomme R-8.

Même famille, corrigé au passage : le message du contrôle positif n'accusait **que** l'instrument
(« la découpe est tombée à côté »). Mesuré par mutation, c'est la cause la **moins** probable : un
`appearance: none` posé sur `.onglet` « pour faire propre » fait tomber la même assertion, et c'est
alors R-8 qui est mort. Le message nomme désormais les deux lectures, **la cause produit d'abord**.

### Les six mutations, et ce qu'elles ont mesuré

| Mutation | Ce qu'elle casse | Rouges mesurés |
|---|---|---|
| retrait de `border-block-end-width: var(--filet-marge)` | le canal d'épaisseur | **2** (règle + pixels) |
| `appearance: none` sur `.onglet` | le canal de la radio | **1** |
| retrait des trois `.onglet:nth-of-type(N):checked ~ div:nth-of-type(N)` | états 1 et 2 | **2** |
| retrait du bloc `@media print` entier | état 3 | **1** |
| retrait de la SEULE ligne `.panneau-nom` du bloc `@media print` | « chacun sous son libellé » | **1** — et **0 avant le correctif de revue** |
| `CAPACITES_MESUREES_EN_E2E.onglets` à `false` | le filet hors-suite | **1** (G-test) |

Feuille et littéral restaurés, `git diff` vide sur les deux. ⚠️ **Chaque mutation de feuille a coûté un
`npm run build` complet** (~70 s) : les specs mesurent `dist/`, une feuille mutée sans rebâtissage ne
mesure rien — et c'est le mode d'échec qui fait croire qu'un test discrimine alors qu'il n'a **pas vu**
la mutation (L-015, transposé à l'artéfact).

🔴 **La cinquième ligne est celle qui valait le plus.** Les quatre premières mutations étaient celles
que j'avais imaginées, et elles sont toutes passées ; c'est la **revue** qui a nommé la faute qu'aucune
ne couvrait, et la mutation ciblée l'a confirmée en mesurant **0 rouge** avant correctif. Une batterie
de mutations ne prouve que ce que son auteur a pensé à casser.

### ⚠️ AUCUN COMPTE DE RANGÉES N'EST ÉPINGLÉ, ET C'EST DÉLIBÉRÉ

La feuille demande **3 px** sous l'onglet actif ; la capture en compte **2 rangées pleines** —
l'alignement subpixel de la découpe, pas un défaut de style. On mesure donc un **ORDRE** (l'actif est
peint plus épais que l'inactif) et un **plancher** (il est peint) ; un littéral « 3 » rougirait sur le
premier poste en DPR 2 **sans qu'aucun défaut existe**. ⚠️ **Ce qui stabilise le relevé n'est pas le
test, c'est le projet** : `playwright.config.ts` fixe `deviceScaleFactor: 1`. À DPR 2 la marge devrait
s'élargir plutôt que se réduire (3 px et 1 px de CSS donnant 6 et 2 pixels d'appareil) — **ce n'est pas
mesuré, et le commentaire du fichier ne l'affirme donc pas**. C'était une promesse de commentaire plus
forte que ce qui est appliqué, attrapée en revue.

### La seconde source, et le filet qui la protège

Aucun compte d'onglet n'est écrit à la main : le nombre de volets, leurs libellés et **lequel** porte
`defaut` sont lus dans le `lecon.md` de l'**auteur** (S-014 — un test qui compterait les onglets dans
le DOM puis vérifierait qu'il y en a ce nombre-là prouverait sa propre entrée). ⚠️ On lit le
**Markdown**, pas le JSON compilé : le contrat compilé sort du même pipeline que le HTML servi, les
opposer comparerait une sortie à elle-même. Et `INDEX_DEFAUT` est **relu** plutôt que supposé en
tête : rien dans la grammaire n'oblige l'auteur à placer le volet par défaut en premier.

Le filet de L-019 est un test à lui : une lecture de source qui échouerait rendrait un tableau vide,
et les six tests suivants mesureraient le vide. Il exige 2 à 3 volets et **exactement un** `defaut`.

### `pre-hydratation.ts` — une aide de plus, et le risque qu'elle déplace

La mécanique d'ouverture de la fenêtre de pré-hydratation vivait entière dans
`quiz-pre-hydratation.spec.ts`. Ce lot lui a donné un **second** appelant ; deux copies d'un harnais
aussi subtil auraient divergé en silence (L-016), comme l'avaient déjà fait déménager
`indicateur-focus.ts`, `sonde-csp.ts` et `hydratation.ts`. Elle est donc extraite — et elle paie le
prix de **L-034** : elle est épinglée dans `src/configuration-typescript.spec.ts`, qui passe de
**SEPT à HUIT** `e2e/aides/*.ts`. 🔴 **Son mode d'échec est le pire de cette liste** : si sa
désignation du chunk cessait de mordre, la fenêtre ne s'ouvrirait **jamais** et ses deux appelants
mesureraient une page **déjà hydratée** en croyant mesurer l'inverse. C'est pourquoi elle exige
elle-même qu'un `.js` ait **réellement** été retenu, et pourquoi le **jalon prerendu est un paramètre
obligatoire** : ouvrir la fenêtre sans constater que la chose qu'on va manipuler est déjà peinte
serait un gate creux.

⚠️ **Le tripwire du pinning a mordu, et c'est ce qui l'a rendu visible** : les deux fichiers neufs
étaient entrés dans le programme e2e sans être épinglés, et `ne compile RIEN d'autre que ces fichiers`
rougissait — le même mode d'échec que celui qu'il avait attrapé sur six fichiers d'un coup au lot E
d'E2-ST3, et pour la même raison : un fichier entre dans le programme sans que personne le constate.

### Ce que ce lot NE prouve toujours pas, dit franchement

- **Qu'un œil humain distingue les deux onglets.** « Peint plus épais » n'est pas « perçu comme
  actif », et aucun gate ne peut trancher ça. En HCM la distinction tient à **un pixel de filet** et
  au **point de la radio** ; c'est le point qui fait le travail.
- **La clause de rédaction de D-C** — le contenu masqué doit être l'**équivalent** du visible — reste
  sans aucun gate possible, et elle s'était fait enfreindre dès le premier conteneur écrit (lot 10).
- **La politique de routage de production** : `npx swa start` n'implémente pas `trailingSlash`
  (L-032, couvert en ligne seulement).
- Un **second** `:::: methodes` sur une même page n'est mesuré que pour le **premier** conteneur
  (`.first()`, nommément) ; le contrat ne l'interdit pas, aucune leçon ne le fait aujourd'hui.

**Gates.** G-lint **0** · G-typage-outils **0** · `tsc -p tsconfig.e2e.json` **0** · G-content
**10 leçons · 939/939 identifiants uniques · 0 dépassement**, `--fixtures` **52/52** (comptes
**inchangés**) · compteur du format actionnable **2/9**, inchangé — ce lot ne touche aucun contenu ·
G-test **1143 passés / 1 sauté · 46 fichiers** (+3 : les deux épinglages et le cas `SPECS_D_ONGLETS`) · G-build **13 routes · 14
hachages de style / 0 de script**, **inchangés** · G-axe **13 fichiers · 1118 vérifications · 0
violation**, **inchangés** · G-e2e **57 passés / 1 sauté** (était 50/1) · `npm audit --omit=dev`
**0**.

~~**Le geste suivant : la reprise du module suivant**, qui fera descendre le compteur de **2/9 à 3/9**.~~ ✅ **FAIT AU LOT 12** — `02-environnement-linux`, bloc de clôture en fin de document. Le compteur dit **3/9**.
Le legs du lot 6 est clos : plus aucune moitié du conteneur d'onglets n'attend de mesure.

### 🔴 CE QUE LA REVUE À REGARD NEUF A ATTRAPÉ — quatre majeurs, tous réels, tous corrigés

**(1) La capacité e2e neuve n'avait AUCUN filet hors de la suite, et c'est le fichier qui PROMET ce
filet qui avait oublié de le poser.** `e2e/onglets-methodes.spec.ts` arrivait avec son garde
`exigerUneLeconAvecOnglets`, donc avec le pouvoir de se sauter **tout entier** — sept tests — sans
qu'aucune liste de `src/workflows-github.spec.ts` ne le connaisse : `CAPACITES_MESUREES_EN_E2E` ne
portait que `quiz` et `simulation`. Le jour où `01-fondamentaux` perdrait son `:::: methodes`, G-e2e
passerait de 57 à 50 passés + 7 sautés, **vert**, et G-test aussi. ⚠️ **Pendant ce temps l'en-tête de
`artefact-mesure.ts` écrivait « ce fichier SAUTE bruyamment, jamais en silence »** — une promesse plus
forte que ce qui était appliqué, dans le fichier même qui dépend du filet. Corrigé :
`onglets: true`, `SPECS_D_ONGLETS`, la mesure sur `content/`, et le cas qui exige que le spec existe
**et** appelle son garde en position d'instruction (L-043). Mutation du littéral à `false` → **1
rouge exactement**, avec le message qui nomme les sept mesures perdues.
⚠️ **La mesure des onglets retire les blocs clôturés avant de chercher, et ses deux voisines ne le
font pas.** Le conteneur n'a ni fichier ni ancre : il vit **dans** le `lecon.md`, donc `porte(…)` est
inapplicable. Or ce module **enseigne le contenu-as-code** — une leçon qui documente la grammaire
écrirait `:::: methodes` dans un bloc de code sans rendre un seul `<fieldset>`, ce qui mettrait le
littéral à `true` pendant que le spec, lui, se sauterait. C'est le silence exact que ce bloc existe
pour interdire.

**(2) Le seul des trois tests de contraste forcé qui porte réellement R-8 n'avait pas de contrôle
positif d'émulation.** Ses deux frères en portent un. 🔴 **Mais la revue s'est trompée sur la
conséquence, et la mesure tranche :** elle annonçait un test **vert** si `forcedColors` était ignoré
— c'est faux. En thème sombre, l'agent utilisateur peint aussi l'intérieur d'une radio **vide**
(noyau relevé à **1,00**), si bien qu'une émulation sans effet fait **tomber** l'assertion « le noyau
de la vide est à 0,00 ». Le test était donc déjà protégé — **mais par accident**, par la façon dont
Chromium peint une radio sur fond sombre, que rien de ce dépôt ne contrôle. Le relevé d'avant
émulation rend la protection **explicite** et cesse d'en dépendre. ⚠️ Un constat de revue peut être
juste sur le défaut et faux sur son mode d'échec : le correctif se garde, la justification se
remesure.

**(3) `toHaveText` ne mesure RIEN de l'impression — et c'est le plus retors des quatre.**
`toHaveText` lit `textContent`, que le DOM rend **aussi** pour un élément en `display: none` :
l'égalité des libellés de panneaux était donc **déjà vraie à l'écran**, avant toute émulation. Elle
mesure l'ordre et l'orthographe, **jamais la révélation**. Or c'est `.panneau-nom { display: block }`
dans le `@media print` qui porte la moitié « chacun sous son libellé » du critère d'acceptation.
**Mesuré : retirer cette seule ligne laissait le test VERT** ; le « 1 rouge » obtenu au retrait du
bloc entier venait de la moitié `.panneau`. Corrigé par un `toBeVisible()` par volet, plus un
**témoin d'écran** qui mesure du même coup la promesse d'accessibilité du gabarit (le nom de panneau
est masqué à l'écran pour ne pas faire entendre deux fois le libellé au lecteur d'écran). Mutation
ciblée sur la seule ligne `.panneau-nom` → **1 rouge exactement**, là où elle était verte avant.
🔴 **La leçon est celle d'un instrument mal choisi, pas d'une assertion manquante** : une assertion de
texte, sur un sélecteur masqué, a toutes les apparences d'une mesure de rendu.

**(4) Une seconde conclusion « ce noyau est vide » sans le contrôle d'instrument que le fichier
impose quarante lignes plus haut.** `apresBascule` s'auto-garde par son `> 0.9` ; `abandonnee`, non —
une découpe qui aurait raté sa cible après le clic l'aurait rendue vraie sans rien mesurer. Une ligne.

**Cinq mineurs, corrigés aussi.** Le marqueur `defaut` était cherché dans **tout** le bloc
d'attributs, **valeurs entre guillemets comprises** : un libellé légitime (« La méthode par
defaut ») aurait fait rougir le test-filet sur un contenu sain (L-035). · Un commentaire **périmé**
affirmait encore que « la capture en contraste forcé reste à faire », 230 lignes au-dessus de la
capture. · Les états 1 et 2 n'examinaient que **deux** panneaux alors que l'en-tête promet que rien
n'épingle « deux » : avec trois volets, la règle `:nth-of-type(3)` de la feuille n'aurait été mesurée
que par le test d'impression — remplacé par un balayage de l'ensemble déclaré. · L'affirmation « la
mesure survit à un changement de densité d'écran » n'était **pas mesurée** : ce qui stabilise le
relevé est `playwright.config.ts` (`deviceScaleFactor: 1`), pas le test, et le commentaire le dit
désormais. · L-016 avait été appliqué au **code** et pas au **commentaire qui porte la subtilité du
code** : les deux paragraphes déménagés vivaient encore en double dans `quiz-pre-hydratation.spec.ts`,
et la copie locale disait déjà quelque chose de **faux** pour l'autre appelant (« donc `Quiz` n'est
jamais instancié » — les onglets n'instancient aucun composant).

⚠️ **Et un défaut que seul le lint a vu** : le passage des états 1 et 2 à l'aide commune laissait un
`panneaux` destructuré sans emploi. La correction à la main en a retiré **un de trop** — celui de
l'état 2, encore utilisé — et c'est `tsc -p tsconfig.e2e.json` qui l'a dit. Le lint nommait **une**
ligne ; en corriger deux « par symétrie » est exactement la faute que le lot 10 a payée deux fois.

## ✅ CLÔTURE — LOT 12 « la reprise du module 02 » (2026-09-10)

`MODULES_AU_FORMAT_ACTIONNABLE` porte **trois** slugs et le compteur dit **`3/9 module(s) ancré(s)
au cours repris ; 6 restant(s)`**. Le module `02-environnement-linux` — seize titres `##` et huit
`###` — porte **dix-neuf** `{diapos="…"}` de la séance 2, **quatre** `{seance="5" diapos="…"}`, **un**
`{hors-cours}`, une marche à suivre de huit étapes et le **deuxième `:::: methodes` du dépôt**.

### 🔴 `{seance="5"}` N'EST PAS `{hors-cours}`, ET C'EST LE FAIT CENTRAL DU LOT

Trois encadrés de la leçon publiée déclaraient que les permissions, `chmod`, `chown`, `apt` et
`systemctl` « viennent de la base de connaissances » et que l'étudiant « ne sera pas évalué dessus ».
La **première** moitié était mesurée et juste : dans le déck de la séance 2, `permission` **0**,
`chmod` **0**, `apt` **0**, `systemctl` **0**. La seconde était fausse — la **séance 5 du même cours**
leur consacre `[63]`, `[66]`-`[71]`, `[75]`-`[77]`, `[80]`, `[82]`-`[84]`, notation symbolique
comprise, et la table des trois droits de la leçon est `[71]` **mot pour mot**.

⚠️ **Une absence dans le déck de SA séance ne dit rien du cours.** Le marqueur `{hors-cours}` répond
à « aucune diapositive **des deux cours** ne porte cette section » ; se contenter du déck de la séance
aurait réécrit R-2 dans la grammaire même de la leçon, cette fois de façon **structurée et durable**.
La mesure d'absence porte donc sur les **21 extraits**, jamais sur un seul.

🔴 **Et c'est le mode d'échec n°2 du dépôt, la promesse d'EXCLUSION** — le pire des deux échecs
symétriques, parce qu'il fait choisir à l'étudiant **ce qu'il ne révise pas**. Ce dépôt ne peut pas la
tenir : la diapositive [6] de la séance 1 écrit que l'examen porte sur « les notes **et les
exercices** », donc sur les treize séances.

### 🔴 LA MÊME ACCUSATION VIVAIT DANS LE `quiz.json`, ET DURCIE

R-7 : un `correction-du-cours` accusait le cours de ranger Heroku en IaaS. Mesuré, sa diapositive
**[15] le classe explicitement en PaaS**, six diapositives avant l'endroit où la leçon le corrigeait.
Or l'explication d'une question du quiz portait la **même** affirmation, en plus catégorique (« un
classement à connaître parce que le cours le **range mal** »). ⚠️ **Corriger la leçon seule aurait
laissé le module se contredire** — c'est le corollaire du lot 10, reconfirmé : *interdire une CLASSE
d'affirmation oblige à recenser toutes ses occurrences*, y compris hors du fichier qu'on corrigeait.
Le recensement a été **fait avant d'écrire le brief** et injecté dedans, ligne par ligne.

### 🔴 CE QUE LE LOT A DÉPLACÉ SANS QUE RIEN NE LE DISE — S-010, énième occurrence

`LECON_AVEC_ONGLETS` (`e2e/aides/artefact-mesure.ts`) est une cible **DÉCOUVERTE** : la première page
prerendue portant `class="methodes"`, dans un ordre **explicitement trié**. `environnement-linux`
précède `fondamentaux` : **écrire le deuxième `:::: methodes` du dépôt réassigne les sept tests de
`e2e/onglets-methodes.spec.ts` à une autre page.** G-e2e reste vert à **57 passés / 1 sauté** — et il
ne le reste que parce que le **lot 11 avait fait DÉRIVER les attentes du spec de la source d'auteur**
(`voletsDeclares()` relit le `lecon.md` de la leçon découverte) au lieu de les épingler. Un compte de
volets ou un libellé écrit en dur aurait rougi ici, et la première question aurait été « quel chiffre
y mettre ? » plutôt que « quelle page mesure-t-il maintenant ? ».
⚠️ **Le vert d'un lot ne prouve donc pas que ce lot est sans effet sur les instruments** : il peut
prouver qu'un lot **antérieur** avait bien construit les siens.

### ⚠️ SURFACE NEUVE POUR UN DÉFAUT DÉJÀ NOMMÉ : `libelle` est interpolé nu

Le lot 8 avait nommé, sans le corriger, que **le pipeline ne rend pas le code en ligne dans un
TITRE**. Mesuré ici : `volet.libelle` est rendu par une **interpolation nue** — `{{ volet.libelle }}` —
**aux deux endroits** où il paraît (`rendu-blocs.ts` : le `<label class="onglet-nom">` de l'onglet, et
le `<p class="panneau-nom">` que le `@media print` révèle). Des accents graves dans un `libelle`
sortiraient donc **littéralement**, à l'écran et sur le papier. Les deux libellés du conteneur
s'écrivent sans accents graves. **Le défaut a donc au moins deux surfaces, pas une** ; le corriger
reste un lot à part.

### Ce qui a rendu ce lot moins cher que le lot 10, et ce qui l'a rendu plus cher

✅ **La mesure d'absence est sortie du périmètre de l'agent.** Au lot 10, elle avait fait déborder la
cartographie à **186k** : le brief la mentionnait en une ligne, c'était en réalité **44 termes × 21
fichiers**, dont chaque sortie de `grep` entrait au contexte. Ici, une **sonde jetable** (scratchpad,
hors dépôt) rend **une ligne par terme** — `terme <TAB> total <TAB> deck:diapos…` ou `AUCUN` — et
47 termes ont été mesurés **par le fil principal avant d'écrire le brief**, puis injectés dedans.

🔴 **Deux enseignements, dont un contre-intuitif.** **(a)** La sonde a besoin d'un mode **mot
entier** : sans lui, `vi` remonte **191** diapositives (vie, avis, service, vider) et donnerait à une
absence toutes les apparences d'une présence. **(b)** ⚠️ **La mesure injectée portait DEUX fausses
absences** — `on-premise` et `chemin relatif` sortaient `AUCUN` parce que le cours écrit « On Premise »
et « adresse relative ». **Pré-mesurer pour un agent transfère les hypothèses d'orthographe du
coordinateur dans son contexte avec le statut de fait mesuré.** L'agent les a rattrapées en cherchant
les variantes — c'est exactement ce qu'il faut lui demander, donc c'est ce qu'il faut lui **dire** :
une mesure injectée est un point de départ, jamais un verdict.

❌ **Le volume d'ÉCRITURE reste sous-estimé, comme au §9 du budget de contexte.** La cartographie a
fini à **213k** pour **19 appels d'outils** : rien n'a débordé du côté *lecture*, c'est le document de
**392 lignes** qu'elle devait produire qui a coûté. Un document de cette taille est un **corpus**, et
il se compte avant d'écrire le brief exactement comme un jeu de fixtures. La découpe juste était
**(A1)** la table des 25 titres, **(A2)** les treize réserves — A2 n'a besoin que de la table, pas du
transcript d'A1.

⚠️ **Un agent coupé en cours de route laisse un livrable à moitié écrit, et son rapport ne dit pas
lequel.** L'agent des correctifs a été interrompu par une limite de session ; son dernier message
annonçait deux encadrés restants, alors que la **mesure du fichier** en montrait un seul, plus le
`quiz.json` intact. **C'est l'état du dépôt qui fait foi à la reprise, jamais le rapport de l'agent** —
le recensement a été rejoué sur le fichier avant que les cinq sites restants soient finis au fil
principal.

### ⚠️ LE PIÈGE DU POSEUR DE RENVOIS, ET IL AURAIT ÉTÉ SILENCIEUX

La cartographie **annote** les sections imposées : « `## Exemple simple` *(le chmod 777 et le chown)* ».
Or leur titre réel est **nu**, et `valider.mjs` reconnaît une section imposée par **égalité de chaîne
exacte** sur le titre dépouillé de son bloc d'attributs. Recopier l'annotation aurait fait refuser la
leçon pour « **section absente** » — un message qui n'aurait aidé personne.

Le poseur apparie donc sur le **TEXTE** du titre, jamais sur son numéro de ligne — que les correctifs
des réserves avaient **déjà décalé une fois** — et il **ÉCHOUE en nommant** tout titre non apparié
plutôt que de le sauter. Il a mordu du premier coup : deux titres emploient l'apostrophe **droite** là
où le poseur écrivait la typographique. **Un poseur qui saute en silence pose 22 renvois sur 24 et
laisse le gate nommer les deux manquants sans dire pourquoi.**

### Contrôle positif de la règle 13

Un titre privé de son bloc d'attributs (`## Renommer, déplacer, se déplacer`) rend **1 rouge
exactement**, avec sa cause propre : « *sans renvoi au cours — un module au FORMAT ACTIONNABLE cite
ses diapositives, ou déclare le marqueur `{hors-cours}`* ». Le gate mord sur ce module ; il ne l'a pas
seulement laissé passer.

### Gates

G-lint **0** · G-typage-outils **0** · G-content **10 leçons · 0 dépassement**
(`environnement-linux` 167,0 → **181,4 Ko** brut / **45,9 Ko** servi) · G-test **1143 passés / 1
sauté · 46 fichiers** · G-build **14 pages · 14 hachages de style / 0 de script, INCHANGÉS** ·
G-axe **13 fichiers · 1118 vérifications · 0 violation** · G-e2e **57 passés / 1 sauté** ·
`npm audit --omit=dev` **0**.


### 🔴 CE QUE LA REVUE À REGARD NEUF A ATTRAPÉ — un Majeur, et il est né DANS ce lot

Le lot a posé `{diapos="18"}` sur `### Le modèle de responsabilité partagée`, et laissé intact, cent
dix lignes plus haut, un encadré déclarant que « le modèle de responsabilité partagée … **vient de la
base de connaissances** ». Or la phrase-clé de cette section — « en IaaS, ta responsabilité commence
au système d'exploitation » — **est** la diapositive [18] mot pour mot. La leçon se contredisait, dans
la classe d'affirmation même que le lot existait pour éteindre.

🔴 **LA LEÇON, ET ELLE ÉLARGIT CELLE DU LOT 10.** *Recenser toutes les occurrences d'une classe
d'affirmation* ne suffit pas : il faut aussi celles que **le même lot rend fausses par ailleurs**.
**Poser un renvoi de titre est un JUGEMENT DE PROVENANCE** — donc tout encadré qui parle de la
provenance d'une section se relit contre le renvoi **neuf** de cette section. ⚠️ **Aucun diff ne
montre ça** : le renvoi est *ajouté* d'un côté, l'encadré est *intact* de l'autre, et les deux sont
dans le même commit. Le recensement de la classe avait été fait — il datait d'**avant** que les
renvois existent.

**Trois mineurs tranchés par la MESURE plutôt que par l'avis** — la revue les a posés en questions,
faute d'avoir les extraits, et la sonde a répondu :
- la diapositive **[25], point 10** écrit « Vous recevrez un **courriel** avec les informations de
  connexion du serveur (Code utilisateur, mot de passe, adresse IP) ». La leçon faisait relever
  l'adresse IP « dans la console » — vrai en pratique, mais ce n'est pas la procédure du cours ;
- la diapositive **[67]** nomme « VIM, **NANO** » elle-même. Le volet masqué ne pouvait donc pas
  s'intituler « l'équivalent **moderne** » — et surtout, le lot avait supprimé la seule mention
  **visible** de `nano` : le mot ne vivait plus que derrière un onglet, donc **introuvable au
  `Ctrl+F`**. C'est la clause de rédaction **D-C** enfreinte pour la deuxième fois en deux
  conteneurs écrits — ⚠️ **le mode d'échec de ce conteneur n'est pas d'y mettre trop, c'est d'y
  enfermer le seul exemplaire d'un fait** ;
- la lecture colonne par colonne de `ls -l` est la **quatrième** occurrence de la famille R-10, non
  traitée : elle est mesurée en **séance 5**, et le renvoi neuf du titre l'étiquetait séance 2 —
  ce qui **aggravait** l'attribution au lieu de la laisser neutre.

Plus un mineur d'hygiène : **379 lignes réécrites sans bumper `maj:`**. Gates relancés après
correctifs, tous inchangés.

### Les défauts de BRIEF de ce lot, comptés

Quatre agents : cartographie **213k** (au-dessus du maximum — cause nommée ci-dessus : le volume
d'**écriture**), correctifs des réserves **coupé par une limite de session**, format actionnable
**171k**, revue **155k**. Le fil principal a absorbé la mesure d'absence, les 24 blocs d'attributs,
les cinq sites laissés par l'agent coupé et les six correctifs de revue — soit tout ce qui était
**déjà décidé**, et qui n'avait donc pas à repartir d'un cache froid.

**Le geste suivant : la reprise du module suivant**, qui fera descendre le compteur de **3/9 à 4/9**.
Le candidat naturel est `03-communication-serveur` (séance 3, déck `Cours03-Securite_communication_serveur`),
et la sonde de mesure d'absence se rejoue telle quelle : elle est jetable et vit dans le scratchpad,
mais son patron — **un terme, une ligne de sortie ; préfixe `=` pour le mot entier** — est ce qui a
tenu le budget de la cartographie du côté lecture.
