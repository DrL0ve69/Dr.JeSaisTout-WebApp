# CLAUDE.md

Guide de Claude Code pour ce dépôt. > Langue du projet : **français** (code commenté, commits, contenu). Match it.

## Projet

**Dr. Je-Sais-Tout** (`Dr.JeSaisTout-WebApp`) — site d'apprentissage web. **Phase 1 (août–octobre
2026)** : cours public « Sécurité des applications web » (13 modules) + page d'accueil. Pas de
comptes, pas de backend actif en phase 1. Vision long terme (multi-sujets, tutorat) :
[`docs/vision.md`](docs/vision.md).

> ## 🔴 BASCULE DE DIRECTION — 2026-08-17, à lire AVANT le bloc de reprise
>
> Le propriétaire a changé la direction produit et visuelle. **Quatre décisions, prises, à ne pas
> rouvrir** (détail et justifications : [`docs/design/direction-visuelle.md`](docs/design/direction-visuelle.md) §0 et §4) :
>
> **D-1 · L'habillage devient « Moniteur ambre ».** La structure produit de **boot.dev**
> (apprentissage jalonné, carte de parcours, progression visible) habillée en **rétro-arcade +
> Matrix**. La direction **« Carnet de laboratoire » est ABANDONNÉE** — papier ivoire, Fraunces,
> marginalia, tampons, encre : tout ce vocabulaire est mort. ⚠️ **Le point à ne pas rater :** la
> couleur de marque est **l'AMBRE `#FFB454`, pas le vert**, parce que **le vert est déjà pris — il
> veut dire « corrigé »**. Un vert phosphore de marque diluerait la seule signature chromatique
> pédagogique du site (rouge = vulnérable / vert = corrigé). *Matrix* passe par le **motif** (pluie de
> glyphes, scanlines, noir profond), jamais par la teinte. Palette d'amorçage **mesurée** : 18 paires,
> 0 échec.
> **D-2 · Thème SOMBRE SEUL en phase 1.** G5 est amendé ; le thème clair devient un **livrable
> d'E4-ST1**, pas une note flottante (mode d'échec connu du dépôt, famille L-007).
> **D-3 · La bascule s'exécute APRÈS E3 bloc A**, sous l'épic **E6**. Le contenu garde le chemin
> critique de mi-septembre. **Ordre révisé : E2 → E3-ST0 → E3 bloc A → E6 → E3 blocs B/C → E4 → E5.**
> **D-4 · Identité typographique, aucun avatar dessiné.** « Dr. Je-Sais-Tout » reste le nom ; son
> incarnation devient l'**opérateur** derrière la console.
>
> **Deux conséquences immédiates pour qui code d'ici E6 :** (a) écrire du composant neuf est **sans
> risque** *à condition* de ne consommer que des **jetons sémantiques** — le pari explicite d'E6 est
> qu'aucun composant n'a besoin d'être touché pour changer de peau, et tout composant qui l'exige
> sera consigné comme **défaut G7** ; (b) une **règle d'architecture neuve et bloquante en revue** :
> **aucune feature n'importe une autre feature** — `cours/sommaire` lit la progression que
> `cours/quiz` écrit **via `core/progression/`**, jamais par import direct. Elle se gagne ou se perd
> exactement au couple **E2-ST3 / E2-ST6**.
>
> **Deux tâches neuves au backlog :** **E3-ST0** — le site du cours de l'enseignant a été **complété
> depuis la passe `/archiviste`** ; les fiches KB de `web/securite/` ont donc des trous, et une leçon
> écrite sur une fiche trouée est à réécrire. Fusion à faire **avant** la première leçon
> (<https://www.alexandrepetrin.ca/securisation-des-applications-web/> et
> <https://www.alexandrepetrin.ca/php/>). Et **E6** (5 sous-tâches).
>
> **Périmètre « jeu », tranché et restreint** (backlog §E2-ST6) : on prend la **carte de parcours** et
> la **maîtrise** (quiz réussi, jamais le temps passé) ; on **refuse** série quotidienne, ligues,
> classements, monnaie et boutique — dark patterns documentés, impossibles sans compte, sans usage
> réel ici. ⚠️ **Trou de KB constaté** : `npm run kb -- gamification …` ne remonte que 2 fiches ; ce
> qui a tranché est de la recherche web datée, pas la KB (consigné dans `docs/kb-map.md`).
>
> ---
>
> ## ⏭️ REPRISE — état au 2026-08-19
>
> **E0 CLOS · E1 CLOSE EN ENTIER · E2-ST1 CLOSE · E2-ST2 CLOSE (2 réserves sur 3 levées) · E2-ST3
> CLOSE EN ENTIER** (PR #17 fusionnée) **· E2-ST4 CLOSE EN ENTIER** (lots A1, A2, B, C — PR #18,
> #19, #20, et la PR du lot C) **· E2-ST5 CLOSE EN ENTIER** (lots a, b1, b2, c1, c2, d).
> **Le geste suivant : E2-ST6 — Sommaire du cours & progression** :
> [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md) §E2-ST6.
> 🔴 **Son périmètre a CHANGÉ le 2026-08-19, à lire avant de commencer** : le propriétaire a décidé
> d'un second cours publié (PHP, épic **E7**, §E7 du backlog) et d'un bloc D au cours de sécurité —
> la phase 1 passe de 13 à 27 modules. E2-ST6 était conçue pour UN seul cours ; avec deux cours il
> faut un **index de cours** et une progression indexée **par cours** dans `core/progression/`, pas
> une progression globale à plat — changement de modèle de données à faire **avant** d'écrire le
> composant, pas après. Détail : backlog §E7.
>
> **🔴 LE DÉPLOIEMENT A ÉTÉ ROUGE, ET LA LEÇON VAUT POUR TOUT SPEC E2E À VENIR.** La PR #17 est
> passée verte en CI puis a rendu `deploy.yml` **rouge sur 10 tests e2e**. Cause structurelle : la
> décision E-2 fait bâtir à `ci.yml` l'artéfact depuis la **fixture témoin**, tandis que `deploy.yml`
> garde la racine de **production** — or les huit specs du lot E visent
> `/cours/securite-web/lecon-temoin/`, une route qui n'existe **que** dans l'artéfact de fixture. Le
> vert de `ci.yml` masquait le trou parce qu'il regarde l'autre artéfact (**L-007**).
> ⚠️ **Donc : tout spec e2e neuf qui vise la page de leçon DOIT appeler `exigerLaPageDeLecon(…)`**
> (`e2e/aides/artefact-mesure.ts`) — il interroge le **disque**, pas le serveur (une 404 ne
> distinguerait pas « artéfact de production » de « serveur cassé »), saute en imprimant ce qui n'a
> pas été mesuré, et ce saut est tenu par un filet **hors de la suite e2e** : un fichier entièrement
> sauté ne peut pas s'assertionner, c'est donc `src/workflows-github.spec.ts` qui exige que la
> fixture de `ci.yml` porte une leçon **au slug exact** que ces specs cherchent.
> Mesures attendues : **21 e2e / 0 sauté** sur l'artéfact fixture, **11 passés / 10 sautés** sur
> l'artéfact de production.
>
> **🔵 LES DEUX DÉCISIONS D'E2-ST4, PRISES LE 2026-08-18, À NE PAS ROUVRIR.**
> **ST4-1 · Il n'y a PAS de sélecteur de langage, et le nœud « onglets » du backlog est SANS OBJET.**
> L'objectif écrit annonçait « onglets de langage (PHP/C#/TS) ». Le modèle de données ne porte pas
> ça : les `exemples` d'un bloc `comparaison` sont des **paires de vulnérabilités DISTINCTES** — la
> fixture témoin fait PHP/XSS puis C#/injection SQL — et `compiler-markdown.mjs` n'impose aucune
> unicité de langage entre paires. Des onglets « de langage » cacheraient **un exemple pédagogique
> entier** derrière une étiquette mensongère. Ni ARIA `tablist`, ni `<details name>` : **aucun
> sélecteur**, et **aucun repliage** (un `<details>` fermé ne s'imprime pas, Safari ne le trouve pas
> au `Ctrl+F`, et un accordéon exclusif peut finir avec zéro exemple à l'écran).
> ⚠️ À garder de la passe d'architecture, parce que ça vaut pour **tout** composant à venir :
> construire des onglets JavaScript sur une page prerendue de ce dépôt donnerait un **bouton mort
> qui a l'air vivant** pendant la fenêtre de pré-hydratation (`withNoIncrementalHydration()` actif,
> **L-033**).
> **ST4-2 · On enrichit le rendu EN PLACE, on n'extrait pas de `code-compare/`.** Le rendu
> `comparaison` **existe déjà** (`src/app/features/cours/lecon/rendu-blocs/rendu-blocs.ts`, ~l.
> 114-165 : deux volets côte à côte, étiquettes écrites, annotations, zéro JS) et s'y annonce
> lui-même comme provisoire ; ses paires de contraste sont **déjà mesurées**. Le chemin
> `src/app/features/cours/code-compare/` écrit dans l'objectif est donc **caduc**.
> Le delta réel : **(a)** ancrer les annotations à la ligne, **(b)** le contrôle de portée manquant,
> **(c)** les 2 colonnes en large.
>
> ✅ **E2-ST4 CLOSE EN ENTIER (lots A1, A2, B, C).** Lots A1/A2/B : contrat `lignes: number[]`
> (le vrai défaut était `lignes="1,,2"`, jeton VIDE légal par coercition) ; ancre de ligne en
> `class="ancre-ligne-N"` (le sanitizer d'Angular efface `id`/`data-*`, S-014) ; numérotation CSS de
> toutes les lignes plutôt qu'un filet `.ligne-annotee` (invisible en `forced-colors: active`) ;
> syntaxe d'auteur à forme unique `{lignes="…"}`.
> **Lot C — décision du propriétaire, à ne pas rouvrir : numérotation des figures de code CONTINUE
> sur toute la page** (compteurs `code`/`paires` distincts mais non réinitialisés par section).
> Trois constats à retenir de toutes les revues du sous-lot : **(1)** une mutation survivait aux 573
> tests — le compteur `paires` n'était jamais exercé à travers la récursion (**L-039**) ; **(2)** un
> test vert **par compensation** — son commentaire l'annonçait comme filet de la récursion, la
> mutation correspondante le laissait vert parce que le harnais travaillait à un décalage neutre
> (0) où la descente compense exactement la propagation absente ; **(3)** ⚠️ **la CSP servie bloque
> une écriture CSSOM `style` SANS lever d'événement `securitypolicyviolation`** — l'attribut se
> relit dans le DOM, `getComputedStyle` ne bouge pas : un contrôle positif e2e bâti sur l'événement
> serait un no-op silencieux accusant le produit (**L-041**/**S-016**, à relire avant tout nouveau
> spec e2e qui teste un refus de style).
> **Dettes neuves → E6** : `--couleur-code-fond` vient des thèmes github (fichier gitignoré), hors
> du gate de contraste ; huit `tabindex="0"` posés par le lot B sont **sans emploi à 1280 px**
> (aucun défileur ne déborde à cette largeur — bruit clavier, pas un échec WCAG). **Dette neuve →
> sécurité** : le contrôle positif CSP (`e2e/aides/sonde-csp.ts`) ne couvre que `script-src` ;
> `style-src` (la directive la plus mouvante) n'a **aucun** contrôle positif prouvant qu'il bloque
> réellement (voir **S-016**).
> **Chiffres à la clôture d'E2-ST4 (2026-08-19)** : G-test **576/30**, G-e2e 29/0 sauté (fixture) et
> 12 passés/17 sautés (production), G-axe 344 vérif./0 violation, G-build 12/1 hachages (fixture)
> inchangés, `npm audit --omit=dev` 0.
> **Chiffres à la clôture d'E2-ST5 (2026-08-19)** : G-test **657/32**, 0 échec, G-e2e **48 passés/0
> sauté** (fixture) et 12 passés/36 sautés (production), G-axe 344 vérif./0 violation, G-build
> production 9/9 hachages de style + 1 de script, fixture 13/13, `npm audit --omit=dev` 0.
>
> ---
>
> **✅ CE QUE LE LOT E A FERMÉ, ET QUI NE SE REDÉCOUVRE PAS.**
> **(1) La CSP est mesurée avec le quiz à l'écran, par DEUX instruments.** Côté artéfact : la page
> de leçon interactive porte bien un script inline de plus — `<script id="ng-state"
> type="application/json">`, l'état d'hydratation — mais son `type` est **inerte**, donc `script-src`
> **n'a pas bougé** et la liste blanche reste **nominative à un seul élément**. Côté navigateur :
> `npx swa start` + Playwright, quiz réellement actionné (4 radios, 3 `<select>`, correction, 5
> verdicts) → **0 violation**, contrôle positif injecté **après hydratation**, témoin prouvant que la
> politique est **appliquée** et non `report-only`.
> 🔴 **La crainte de S-005 était juste sur le principe et fausse sur la CIBLE** : ce n'est pas
> `script-src` qui bouge quand la page devient interactive, c'est **`style-src`** (+3 hachages, les
> blocs `<style>` des composants) — et c'est lui qui est **dérivé de l'artéfact**. Les 3 ont été
> **nommés et inspectés un par un** avant d'être épinglés.
> **(2) L-033 est mesuré, plus raisonné.** La fenêtre de pré-hydratation est **élargie** : le chunk
> paresseux est retenu (règle : tout `.js` que le document servi n'annonce pas), on agit dedans, on
> relâche. Deux contrôles positifs attestent qu'elle était ouverte — un clic sur « Corriger » émis
> pendant la fenêtre est **perdu**, et les `ngh` sont encore là. Le piège jumeau du `<select>` a son
> test.
> **(3) G-clavier existe** : huit arrêts dans l'ordre du document, flèches dans les trois mécaniques
> à radios, `<select>` rempli à la flèche seule avec preuve que le `(change)` a couru, Maj+Tab en
> miroir, indicateur de focus calculé et non masqué partout (2.4.7 / 2.4.11).
> **Chiffres de clôture (2026-08-18)** : **G-test 498 / 28 fichiers · G-e2e 21 · G-axe 4 fichiers,
> 344 vérifications, 0 violation · G-build 12 hachages de style (fixture) / 9 (production), 1 de
> script des deux côtés · `npm audit --omit=dev` 0.**
>
> **⚠️ TROISIÈME PIÈGE DU HARNAIS E2E, PAYÉ EN DIRECT AU LOT A1 — et il ment dans les DEUX sens.**
> `playwright.config.ts` pose `reuseExistingServer: !CI`. Un `npx swa start` laissé en marche par un
> run précédent est **réutilisé**, et il sert la politique CSP qu'il a lue à **son** démarrage :
> reconstruire l'artéfact ne le lui apprend pas. Or changer un gabarit change l'identifiant du
> composant, donc le contenu de son bloc `<style>`, donc son hachage. Constaté : une violation
> `style-src-elem` parfaitement **reproductible** sur un dépôt sain — j'ai cru à une régression.
> **Le sens inverse est le vrai danger** : un serveur démarré sur une politique plus permissive
> rendrait **vert** exactement ce que ces specs existent pour attraper. `exigerCspServie` compare
> désormais la CSP **servie** à celle de l'artéfact **sur le disque**, à l'octet près (contrôle
> positif exécuté). En local, après tout rebâtissage : **arrêter le processus qui écoute le port
> 4280** avant de relancer `npm run e2e`.
>
> **⚠️ LES DEUX PIÈGES QUE LE LOT E A CRÉÉS EN SE CORRIGEANT — à connaître avant d'écrire un e2e.**
> **(a) Mutualiser une vérification DÉPLACE le risque** (**L-034**, née ici). `e2e/aides/` porte
> désormais la mesure elle-même — ce qu'est un anneau de focus dessiné, les trois collecteurs de
> violations CSP, le point de départ commun de la page de leçon. Ces modules **ne sont pas des
> specs** et sont épinglés nommément dans `src/configuration-typescript.spec.ts` : un défaut de
> typage y serait invisible depuis les appelants et ferait passer **verts** les gates les plus
> structurants du dépôt. Tout fichier neuf sous `e2e/` doit être inscrit dans cette liste — sinon
> G-test rougit, et c'est voulu (le tripwire a mordu sur six fichiers d'un coup, avant qu'aucun
> humain ne remarque leur entrée).
> **(b) Une prémisse de test fausse rougit sur un produit sain** (**L-035**, née ici). Les trois
> échecs du lot E-c1 venaient tous du spec : un compte relevé sur la page entière réemployé dans un
> périmètre borné au quiz (14 au lieu de 11), un test qui choisissait la **bonne** réponse puis
> exigeait une correction qui ne cite que les **fausses**, et une U+00A0 littérale refusée par
> `no-irregular-whitespace` (elle s'écrit `\u00A0` dans un littéral).
>
> **⏳ PÉREMPTION, à ne pas perdre : le harnais de fixture se retire à la clôture d'E3-ST1.** Depuis
> le lot E-b2, `ci.yml` bâtit son artéfact depuis `tools/content-pipeline/__fixtures__/temoin/…` avec
> `--hachages-style 12` : G-axe, G-e2e et le générateur de CSP voient donc en permanence une page de
> leçon **interactive**. `deploy.yml` garde la racine de production (9 hachages). Le jour où
> `content/` porte sa première leçon, l'étape G-build de `ci.yml` redevient `npm run build` et le
> drapeau disparaît. Écrit à trois endroits (workflow, `src/workflows-github.spec.ts`, backlog), dont
> un **tripwire exécutable**.
>
> **⚠️ RESTE OUVERT après E2-ST3** — la réserve **(3)** d'E2-ST2 : une leçon en `statut: brouillon`
> **sera prerendue publique et indexable**. Elle se lève en clôture d'E3-ST1. Les réserves (1) et (2)
> sont levées. Et un avertissement de build **antérieur au lot E** : `quiz.scss` dépasse son budget
> de **88 o** (4,09 Ko pour 4,00 Ko) — relever le budget ou alléger la feuille, à trancher en E2-ST4
> ou dans le lot de dette.
>
> **🔴 LEÇON S-011, née du lot C, à connaître avant d'écrire une question de leçon.**
> `generer-config-swa.mjs` refuse dans le HTML prerendu **deux** motifs — le style en ligne **et**
> tout gestionnaire d'événement en ligne (`on…=` suivi d'un guillemet) — et l'interpolation
> d'Angular n'échappe que `&`, `<` et `>`. Un `onerror=` entre guillemets dans une question de la
> leçon **XSS** arrive donc **intact** dans la sortie et fait échouer le build sur un message
> accusant la CSP. Fail-closed, donc sain ; le piège est la **pression à assouplir le garde-fou pour
> publier**, sur un site qui enseigne la CSP. La parade est **éditoriale** (guillemets
> typographiques, entité), jamais une exclusion de balayage.
>
> **Ce que les lots A et B avaient posé, et qui reste vrai :** (a) `ficheSource` **n'est pas** dans
> l'artéfact, c'est voulu — la voie publiée vers les sources est « Aller plus loin » ; (b) ce qui
> autorise à rendre `htmlColore` est **mesuré** et plus étroit qu'il n'y paraît : Shiki échappe `<`
> en `&#x3C;` et **laisse `>` brut** — sûr parce qu'aucune balise ne peut s'**ouvrir**, pas parce que
> tout serait échappé. ⚠️ Le lot C **ne lit toujours pas** `htmlColore` : il rend le `code` brut, par
> interpolation.
>
> **🔴 INCIDENT DE PRODUCTION RÉSOLU LE 2026-08-17 — à connaître avant de toucher au routage.**
> Signalé par le propriétaire depuis la console du site déployé : `main-<hash>.js/chunk-<hash>.js` en
> **404**. `trailingSlash: "always"` redirigeait **aussi les fichiers** ; le 301 déplaçait l'URL
> finale du module, donc la **base de ses imports relatifs**, et **la route paresseuse de la page de
> leçon était morte**. Défaut **connu et écrit depuis E1-ST1-B** — mais classé *coût de performance*,
> personne n'ayant vu qu'il deviendrait une panne dès le **premier chunk paresseux** (E2-ST2).
> Corrigé en **`trailingSlash: "auto"`** (les dossiers restent canonicalisés, les fichiers sont
> servis directement). ⚠️ **Aucun gate local ne pouvait le voir** : l'émulateur `npx swa start`
> n'implémente pas `trailingSlash`, donc `e2e` était vert sur une politique de routage qui n'était
> pas celle de la production. D'où le gate neuf, **en ligne uniquement** : `deploy.yml` → « Vérifier
> le routage servi » bloc **(c)**, chaque asset référencé par la page servie doit répondre 200 et
> jamais 3xx. Leçon **L-032** ; détail dans `docs/deployment.md`.
>
> **⚠️ Les 3 réserves de clôture d'E2-ST2, toutes dues à un `content/` VIDE** (détail : backlog
> §E2-ST2) : (1) `a11y:axe` et `e2e` **n'ont jamais vu** une page de leçon — la barre AXE est
> *contournée par l'absence de données*, pas franchie ; (2) la **CSP servie n'a jamais été mesurée**
> sur une page de leçon ; (3) une leçon en `statut: brouillon` **sera prerendue publique et
> indexable**. Les trois se lèvent **en clôture d'E3-ST1**, pas avant.
>
> **Ce qui suit reste vrai** — le **moteur de contenu tourne**. `content/` est
> validé (Ajv + règles hors schéma), compilé en AST typé (Markdown → HTML, Shiki précompilé, encadrés),
> ses diagrammes Mermaid sont rendus au build et **déshabillés par un analyseur à liste blanche**, et
> il en sort un manifeste de routes + une carte d'imports paresseux. `content:build` précède `ng build`
> **et** `ng test` (crochets + étape CI avant G-lint dans les deux workflows).
> **Au 2026-08-18 : 509 tests / 28 fichiers · 21 e2e (fixture) ou 11 + 10 sautés (production) ·
> axe 344 vérifications, 0 violation ·
> `npm audit --omit=dev` 0.**
> Le **jalon J2 est atteint neuf jours avant son échéance**.
>
> **⚠️ PIÈGES ENCORE ACTIFS, hérités des lots précédents.**
> **(1) `withNoIncrementalHydration()` est toujours actif** — `@defer (hydrate …)` est **inerte** et
> le rejeu d'événements est perdu. Piège hérité d'E1-ST2, et il **a mordu au lot C d'E2-ST3**, comme
> annoncé : entre la peinture prerendue et l'hydratation, le DOM natif accepte la saisie, et la
> première détection de changements l'**écrase**. Le composant amorce donc son état depuis le DOM
> (`afterNextRender`) — **leçon L-033, à relire avant tout `(change)`/`(click)` neuf sur une page
> prerendue**. « Sans JS » et « pas encore hydraté » sont deux états distincts ; le second ment,
> parce que l'interface a l'air vivante.
> **(2) Une CSP validée sur une page INERTE ne vaut que pour une page inerte.** Le premier écouteur
> d'événement d'une page fait apparaître des scripts inline que le framework n'émettait pas avant
> (constaté en E1-ST2, build rouge). **E2-ST3 est exactement ce moment-là pour la page de leçon** :
> revalider la CSP, et garder la liste blanche **NOMINATIVE**, jamais dérivée de l'artéfact (S-005).
> **(3) Le sanitizer d'Angular efface TOUT le SVG** — mesuré (`src/sonde-sanitizer-svg.spec.ts`,
> gardée comme tripwire) : 24 éléments → 0, 71 attributs → 0. D'où le `bypassSecurityTrustHtml`
> **scopé au seul bloc `mermaid`**, justifié nominativement au point d'appel. Ne pas l'élargir.
> **(4) Retirer la `mentionChantier` « Chantier en cours »** de la carte le jour où la première leçon
> est publiée, sinon l'accueil ment. Rappel repris en **E6-ST4**.
>
> **❓ NŒUDS : tous tranchés le 2026-08-16, ne pas les rouvrir** (détail : §E2 du backlog). Dette
> sécurité → **avant E3-ST1**, pas avant E2-ST1 · leçon-témoin → **fixture hors de `content/`** ·
> diagrammes Mermaid → **rendus au build** (une invocation `mmdc` par leçon, cache par hachage,
> Chromium de Playwright réutilisé). **Un seul reste ouvert, et il n'appartient qu'au propriétaire :**
> marquer *False Positive* le `css:S8776` de SonarCloud (le `&` de `@mixin focus-visible`) — un
> fichier de propriétés ne sait pas taire une issue.
>
> **✅ LES CONSTATS NAVIGATEUR D'E1 SONT FAITS** (2026-08-16, sur le site déployé) — et la consigne qui
> les bloquait était **fausse par excès** : ce n'est pas le navigateur qui est banni, c'est
> l'**extension** Claude in Chrome. **Playwright, déjà installé, est la voie.** Résultats : **0**
> violation de CSP en actionnant les trois états de la bascule (avec **contrôle positif** : un script
> inline non haché injecté est bien capté) · **aucun flash** de clair sur thème sombre épinglé,
> *prouvé par capture* — les 3 images du chargement filmé sont sombres dès la première (L-025) ·
> `/404/*` **couvre bien** `/404/` (`x-robots-tag: noindex` présent) · le lien du pied de page porte un
> **soulignement** en plus de sa couleur (`link-in-text-block` tenu).
> ⚠️ *Leçon de méthode payée au passage* : la 1ʳᵉ mesure du flash a échoué **sur l'instrument** — un
> `MutationObserver` posé avant l'existence de `documentElement` levait, et le script a rapporté son
> propre plantage comme « 1 violation CSP ».
>
> **Dette à ne pas perdre**, de la plus mordante à la plus froide. **Les quatre premières forment UN
> SEUL LOT, à payer AVANT E3-ST1** (la première leçon publiée) — elles sont de la même famille :
> **🔴 S-003** (le garde-fou de CSP ne prouve pas qu'il a *tout vu* : un guillemet orphelin rend une
> balise `<script>` invisible à son motif) · **le garde-fou de `generer-config-swa.mjs` ne connaît que
> le motif ` style="`** — `style='…'` ou sans guillemets lui échappe · **la CSP servie n'est vérifiée
> que par motifs, pas structurellement** (comparer directive par directive avec
> `config/staticwebapp.config.source.json`) · **la portée du sceau d'artéfact de `deploy.yml` a été
> réduite** par la remontée de l'installation du navigateur (imposée par le pipeline de contenu) : la
> parade est un **job propre** pour `content:build`, pas un digest — aucun digest n'épingle un
> `apt-get` en root. *Ces quatre-là ont maintenant un patron de correctif DANS le dépôt :
> `rendre-mermaid.mjs` a remplacé sa liste noire par un analyseur jsdom à liste blanche — le
> transposer, pas en réinventer un.*
> Puis, plus froid : `Azure/static-web-apps-deploy@v1` est un **tag mutable** dans le job qui détient
> le jeton (SHA relevé, épinglage volontairement reporté à ce même lot) · **`.claude/rules/security.md`
> n'a pas intégré S-007/S-008** · **typage (b) 34 et (c) 35 erreurs** sur les deux gates de design · et
> le texte de l'extrait d'en-têtes de la Home est **en dur** (borné par un test qui relit
> `staticwebapp.config.source.json`).
> Détail de chacune : [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md) §E1-ST1, §E1-ST2, §E1-ST3 et §E2.
>
> **Acquis, vérifié :** dépôt <https://github.com/DrL0ve69/Dr.JeSaisTout-WebApp> (public, `main`) ·
> ressources Azure créées (*Azure for Students*, palier **Free**) · secret
> `AZURE_STATIC_WEB_APPS_API_TOKEN` posé · workflows `Déploiement` **et** `Infra` **verts, zéro
> annotation** · ST1-A : design system 3 couches (73 primitives → 58 jetons sémantiques → 0 jeton
> composant), gate `verifier-contrastes.mjs` (33 paires, 66 mesures, plus bas 3,24:1/3,39:1) ·
> ST1-B : Fraunces + Inter en OFL auto-hébergées (196 Ko livrés, **83 Ko chargés**), gate
> `verifier-glyphes.mjs` (lecture réelle de la table `cmap`, 80 vérifications) · ST2 : `deploy.yml`
> **scindé en deux jobs** (`gates` sans secret → `publication` qui détient le jeton), artéfact
> **scellé par empreintes sha256** entre les deux, vérifications en ligne **fail-closed** et portant
> sur les **directives** CSP, pas seulement sur la présence des en-têtes — tous les gates câblés dans
> `ci.yml` **et** `deploy.yml` (L-007) · aucun `tfstate` versionné.
>
> **Pièges à ne pas repayer.** Les trois neufs d'E2-ST1 d'abord, parce qu'ils se ressemblent :
> **(A) une liste NOIRE de motifs sur un format structuré est un S-003 par construction.** Le scrub
> du SVG surveillait cinq motifs par regex ; `<a xlink:href="javascript:…">`, `<use href="https://…">`
> et `<animate attributeName="href">` passaient intacts. On **parse**, puis on confronte à une **liste
> blanche nominative** — jamais l'inverse. **(B) un contrôle positif qu'aucun runner n'exécute est une
> intention, pas un gate** : les 9 fixtures invalides du validateur étaient exactes, exécutables à la
> main… et lancées par personne, donc invisibles à toute régression (cousine de **L-019**, sur l'axe
> *câblage*). Même famille : un garde-fou qui ne vit que dans un harnais CLI que la CI n'appelle pas.
> **(C) un identifiant dérivé du hachage du CONTENU se duplique dès que le contenu se répète** — deux
> diagrammes identiques dans une leçon recevaient le même SVG, donc les mêmes `id` dans la page. Une
> clef de cache indexe une **source** ; un préfixe doit distinguer une **occurrence**.
>
> Puis (0, celui d'E1-ST3, le plus retors parce qu'il ne fait rougir
> AUCUN gate) : la feuille de l'agent utilisateur pose `margin-inline: auto` sur `<hr>` — en **item
> de grille**, une marge automatique l'emporte sur l'étirement et la largeur retombe à **zéro**. Le
> filet occupait sa place et ne peignait rien, avec un style calculé parfaitement juste. Corrigé dans
> `@mixin filet-horizontal` ; morale plus large : **un `getComputedStyle` correct ne prouve pas un
> pixel peint**, seule une capture ou une géométrie le prouve (**L-025**, cousine de L-021). Puis les
> deux d'E1-ST2 : (1) `provideClientHydration()` d'Angular 22 active par
> défaut l'**hydratation incrémentale**, qui injecte deux scripts inline que la CSP à hachages refuse —
> et ces scripts n'apparaissent **qu'avec le premier élément interactif**. D'où
> `withNoIncrementalHydration()` dans `app.config.ts` : rejeu d'événements perdu, `@defer (hydrate …)`
> inerte — **piège pour E2**. (2) `preserveWhitespaces: false` retire le nœud blanc entre deux
> `<span>` : le nom accessible se calcule **en un seul mot**, l'espace visible ne venant que du `gap`
> CSS qu'aucune API d'accessibilité ne lit (**L-024**).
>
> **⚠️ Contrainte de RÉDACTION née de ST1-B : le contenu emploie U+00A0**, jamais U+202F.
> L'espace fine insécable est **absente de Fraunces comme d'Inter**, et irrécupérable (le
> sous-ensemble maison est interdit — c'est lui qui casse `œ`, `« »`, `’` en silence). U+2009 n'est
> pas une issue : Inter la porte, Fraunces non. À reporter dans
> `.claude/rules/contenu-pedagogique.md` §3 à la première leçon. Détail :
> [`docs/design/polices.md`](docs/design/polices.md).
>
> **SonarCloud** : porte **verte**. L'analyse est **automatique** (app GitHub) — elle lit
> `.sonarcloud.properties`, et **ignore** `sonar-project.properties` ; ne pas créer ce dernier en
> croyant régler quelque chose. Un seul reliquat, côté propriétaire : marquer *False Positive* le
> bug `css:S8776` sur le `&` de `@mixin focus-visible` (faux positif prouvé en compilant ; le
> fichier de propriétés ne sait pas taire une issue).
>
> **Pièges déjà payés, à ne pas repayer.** (1) Une vérification post-déploiement doit attendre
> l'**effet**, pas le code de retour : SWA répond 200 pendant ~30-60 s *avant* d'appliquer
> `staticwebapp.config.json`, et `curl --retry` ne rattrape rien puisque la réponse est un succès
> (lesson **L-004**). (2) Un run « vert » ne prouve pas qu'une vérification a *tourné* — c'est le
> **journal** qui fait foi. (3) `public/**` est copié sans empreinte de contenu alors que les
> `.js` sont servis `immutable` un an — d'où le choix ST1-C d'un script inline haché plutôt qu'un
> fichier externe pour l'anti-flash de thème, et d'où les **noms de polices versionnés** de ST1-B.
> (4) Un outil d'analyse a raison **et** tort dans le même run : sur la PR #1, la duplication et le
> « bug » étaient deux faux positifs ; sur la PR #2, les cinq bugs signalés étaient réels. On
> vérifie chaque constat, on n'accepte ni ne rejette le lot en bloc. (5) `.yml`/`.json` sont en
> **CRLF** sur ce poste : un `replace()` sur un littéral multi-ligne en `\n` ne mute rien, et une
> regex ancrée `$` en multiligne s'ancre **après** le `\r` (**L-015**).
>
> Spikes tranchés : addendums §9 de
> [`docs/architecture/stack-et-architecture.md`](docs/architecture/stack-et-architecture.md).
> Le plan fait foi : [`docs/agile/backlog-phase-1.md`](docs/agile/backlog-phase-1.md).
> Scaffold par CLI officiels (`ng new` / `dotnet new`) uniquement — jamais à la main.

## Stack (décidée — ADR complets dans `docs/architecture/stack-et-architecture.md`)

- **Frontend** : **Angular 22.1** (installé) — **zoneless** (défaut v22, aucun `zone.js`), standalone,
  signaux, OnPush, **SCSS** jetons sémantiques, `outputMode: "static"` → **toutes** les routes sont
  prerendues, site 100 % statique (pas de serveur Express : `src/server.ts` a été retiré).
  ⚠️ `optimization.styles.inlineCritical: false` est **obligatoire** — le défaut d'Angular émet un
  gestionnaire `onload` inline que la CSP stricte bloque, ce qui afficherait le site sans styles.
- **Contenu-as-code** : leçons Markdown + quiz/simulations JSON dans `content/`, validés et
  compilés au build (gabarits : [`docs/contenu/pipeline-contenu.md`](docs/contenu/pipeline-contenu.md)).
  Source de théorie : la **KnowledgeBase** (voir §KnowledgeBase ci-dessous). KB en lecture seule,
  sauf correction d'erreur avérée.
- **Backend** : .NET 10 / C# Clean Architecture allégée — **phase 2** (squelette optionnel E5,
  conventions du projet frère `2026/Templates/AbrisAutoOutaouais-WebApp`).
- **Hébergement** : Azure Static Web Apps **Free** ; headers/CSP via `staticwebapp.config.json`.
  Provisionnement en **Terraform** (`infra/`, palier Free en dur) — exécuté **manuellement par le
  propriétaire, jamais en CI** : la CI ne détient que le jeton de déploiement SWA, pas d'identifiant
  Azure à haut privilège. Voir [`infra/README.md`](infra/README.md).

## KnowledgeBase — comment y entrer (règle de méthode)

`C:\Users\phili\ProjetsPortfolio\KnowledgeBase\` — **263 fiches, 10 domaines de premier niveau**
(`web/`, `cs/`, `ai/`, `devops/`, `outils/`, `divers/`, `mobile/`, `gamedev/`, `desktop/`, plus
`_archiviste/` qui est technique). Elle ne se limite **pas** à `web/securite/`.

**Ordre obligatoire, du moins cher au plus cher :**

1. [`docs/kb-map.md`](docs/kb-map.md) — table de routage **tâche → fiches**, ~3 000 tokens. Couvre
   contenu, pédagogie, Angular/CSS/a11y, sécurité, CI-CD, architecture, phase 2 .NET, harnais
   d'agents, et la liste des **trous** (ce que la KB ne couvre pas : SWA, WCAG au critère, Vitest,
   Mermaid, Angular 22). **Toujours commencer ici.**
2. `npm run kb -- <termes>` — recherche par frontmatter/tags/description (`--full` pour le corps,
   `--any` pour un OU). Gratuit, sans clé, sans index à maintenir.
3. `KnowledgeBase/<domaine>/carte.md` — la carte du domaine donne l'ordre de lecture et les trous.
4. `KnowledgeBase/INDEX.md` — exhaustif mais **~26 000 tokens** : en dernier recours seulement.

**Si `kb-map.md` ne couvre pas le sujet traité : chercher, puis le compléter.** Un plan bâti sur le
seul dossier au nom évident est une faute constatée sur ce projet (2026-08-04) — voir la note
d'ouverture de `docs/kb-map.md`.

Ce que cette faute avait coûté, et les correctifs appliqués au plan :
[`docs/revue-plan-kb-2026-08-04.md`](docs/revue-plan-kb-2026-08-04.md). **Constats C6 (axe ≠ WCAG),
C7 (moment mémorable ; 4 modules sur 13 sans support mémorable) et C8 (prérequis réseau) restent
ouverts** — ils touchent `.claude/rules/contenu-pedagogique.md` et la définition des gates a11y.

## Commandes

**Prérequis : Node ≥ 24.15** (Angular 22 le refuse en deçà ; poste en 24.18.1 LTS).

| Commande | Rôle | Gate |
|---|---|---|
| `npm run lint` | ESLint + angular-eslint | G-lint |
| `npm test` | Vitest (runner par défaut d'Angular 22) | G-test |
| `npm run content:build` | **compile `content/`** : valide → Markdown/HTML + Mermaid → manifeste de routes + carte d'imports. **Précède** `ng build` ET `ng test` (crochets `prestart`/`pretest`) | G-content |
| `npm run build` | `content:build` + `ng build` + **génération de la config SWA** (CSP à hachages) → `dist/dr-je-sais-tout/browser` | G-build |
| `npm run config:swa` | régénère seul `staticwebapp.config.json` dans l'artéfact ; **code 1** si la sortie casse la CSP | G-build |
| `npm run typecheck:tools` | vérifie les types de `tools/**/*.mjs` + `eslint.config.js` (`checkJs`) | G-typage-outils |
| `npm run a11y:axe` | axe-core sur les pages prerendues de `dist/` | G-axe |
| `npm run e2e` | Playwright sur `dist/` servi par `npx swa start` — donc **sous la CSP réelle** | G-e2e |
| `npm start` | serveur de dev | — |
| `npm run kb -- <termes>` | recherche dans la KnowledgeBase (`--full`, `--any`, `--n N`) | — |
| `npm audit --omit=dev` | surface de production (doit rester à **0**) | G-audit |

⚠️ **`content:build` n'est pas optionnel, même avec un `content/` vide.** `src/styles.scss` fait
`@use` sur `styles/coloration-syntaxique-generee`, une feuille **gitignorée** que seul ce pipeline
produit : sur un clone frais, sans lui, c'est `npm test` qui tombe **en premier**, sur une erreur
Sass qui ne nomme pas la cause. D'où les crochets `prestart`/`pretest` et l'étape CI placée **avant
G-lint** dans `ci.yml` **et** `deploy.yml` (L-007).

⚠️ **Sur un clone frais, l'ordre est `npm ci` → `npm run e2e:install` → le reste.** Le deuxième
n'est pas réservé au gate e2e : `rendre-mermaid.mjs` impose **ce** Chromium-là à `mmdc`
(`.puppeteerrc.cjs` interdit à Puppeteer d'en télécharger un second, ~200 Mo), et la leçon-témoin du
pipeline porte deux diagrammes — donc **`npm ci && npm test` seul est ROUGE**, sur un message qui
parle de Playwright au milieu d'un test de contenu. La CI l'installe en tête des deux workflows pour
cette raison.

`npm audit` complet remonte **5 vulnérabilités, dont 4 *high*** — toutes **dev-only et
préexistantes** : `adm-zip`, `devcert` et `tmp` via `@azure/static-web-apps-cli`, `nanoid` via
`@angular/build`. Aucune n'atteint la surface livrée : **`--omit=dev` reste à 0**, et c'est lui qui
fait foi (mesure du 2026-08-16 ; l'ancienne note « 3 moderate via le SDK MCP d'@angular/cli » était
périmée). Reste à venir : `dotnet build`/`dotnet test` (**phase 2**).

## Règles dures (rappelées automatiquement par les hooks)

- **Zéro dépense** — gratuit ET sans clé ; seul le crédit étudiant Azure (~120 $ CA) est permis :
  `.claude/rules/budget-free-tier.md`.
- **Budget de contexte par sous-agent** : viser de finir sous ~120k ; 150k alerte / 200k toléré /
  250k jamais ; un agent = UN livrable ; boucle séquentielle par défaut :
  `.claude/rules/agent-context-budget.md`.
- **Accessibilité** : WCAG 2.2 AA, zéro violation AXE — barre dure.
- **Sécurité** : le site **enseigne** la sécurité web, il doit exemplifier ce qu'il prêche (CSP
  stricte, headers, `npm audit` vert ; code vulnérable UNIQUEMENT en blocs d'exemple marqués) :
  `.claude/rules/security.md`.
- **Qualité pédagogique** : chaque concept = théorie + exemple simple ET complexe + analogie bornée
  + support visuel ; jamais de fait non sourcé : `.claude/rules/contenu-pedagogique.md`.
- **Design anti-AI-slop** : direction **« Moniteur ambre »** (rétro-arcade + Matrix, sombre seul en
  phase 1) + garde-fous **G1–G11** : `docs/design/direction-visuelle.md`. ⚠️ La direction
  « Carnet de laboratoire » est **abandonnée depuis le 2026-08-17** mais **encore en production**
  jusqu'à E6 — le code que tu lis peut être en retard sur le document, jamais l'inverse.

## Système d'agents (guide complet : `.claude/README.md`)

Trois boucles, coordonnées par le **fil principal** (les sous-agents ne s'appellent pas entre eux) :

1. **Livraison** (`/feature-cycle`) : `solution-architect` (fable/medium) → `devils-advocate`
   (conditionnel, opus) → `feature-developer` (opus) → `code-reviewer` (opus, read-only) →
   `mentor` (sonnet). Plomberie git/PR/docs → `git-ops` (sonnet).
2. **Contenu** (`/lecon <module>`) : `professeur-web` (opus) écrit UNE leçon depuis les fiches KB
   pointées par le backlog → `verificateur-theorie` (opus, adversarial, peut corriger la KB si
   erreur certaine) → correctifs par agent **frais**. `content/**` appartient à cette boucle, pas
   à feature-cycle.
3. **Sécurité** (`/security-audit`) : `security-auditor` → `security-reviewer` sur tout diff
   sensible → `security-mentor` (leçons S-0xx).

Principes non négociables : brief = **pointeur de section** du backlog, jamais l'epic entier ;
correctifs de revue → agent frais (jamais `SendMessage` à un agent saturé) ; gates lourds → agent
de vérification jetable ; `.claude/lessons/lessons-learned.md` injecté à chaque session par le
hook `SessionStart`.

**À quelle échelle convoquer qui** (règle du propriétaire, 2026-08-04 — barème complet dans
[`.claude/README.md`](.claude/README.md) §6a) : `solution-architect` et surtout `devils-advocate`
sont pour un **début d'epic** ou une **grosse tâche** (recherche à faire, large surface, enjeux
importants, décision peu réversible). **Toute sous-tâche ne les mérite pas** : si le backlog dit
déjà *quoi, où, avec quels gates*, le plan existe — on implémente. Dans l'autre sens, ne pas
déléguer ce que le fil principal fait sans se saturer : un sous-agent repart d'un cache froid et
son rapport doit être revérifié. Restent toujours rentables : le **volumineux** et le **regard neuf
indépendant** (`code-reviewer`, `security-reviewer` sur un diff).

## Après chaque tâche

Mettre à jour le statut (⬜→✅) dans `docs/agile/backlog-phase-1.md` (via `git-ops`). Après chaque
epic : passe d'entretien du harnais (`.claude/README.md` §10).
