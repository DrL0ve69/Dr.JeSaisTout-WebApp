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
8**) → ~~**`1a`**~~ **✅ livré** (`diapos` intra-sujet) → **`2`** → `3` → `4` → **`4bis`** (spike R-1,
jetable, **avant** d'écrire le lot 5) → `5` → `6` → `7` → **`1b`** (résolution inter-cours) → `8`
(**scindé en deux demi-lots**, la leçon fait 942 lignes) → `9`.
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

**Le geste suivant : le lot 3** (conteneur `marche-a-suivre`, compilation et validation) — `compiler-markdown.mjs`,
`valider.mjs`, `types.d.ts`, deux fixtures témoins. Gates : `content:build`, `npm test`, `typecheck:tools`.
⚠️ Le corpus de **fixtures invalides** est le **lot 7**, délibérément à part (§9 du budget de contexte) : ne
le laisse pas remonter dans le brief du lot 3.

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
