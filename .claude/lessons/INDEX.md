# Index des leçons — lire CECI, pas les corpus entiers

> ⚠️ **Généré. Ne pas éditer à la main.** Régénéré par `npm run lecons:index` et à chaque
> `SessionStart`. Les agents `mentor`/`security-mentor` le régénèrent après toute édition.

**Comment s’en servir.** Repère les 2-4 entrées dont le sujet touche TON lot, puis ouvre-les
une par une avec un `Read` borné : `Read(<fichier>, offset=<début>, limit=<fin − début>)`.
Ouvrir un corpus en entier coûte 18 000 à 33 600 tokens pour deux entrées utiles — c’est
exactement le gaspillage que `.claude/rules/agent-context-budget.md` interdit.

## Leçons générales (L-0xx) — conception, tests, CI, méthode

Fichier : `.claude/lessons/lessons-learned.md`

| Entrée | Lignes | Sujet |
|---|---|---|
| L-001 | 31–60 | Le plan du projet vit dans `docs/agile/backlog-phase-1.md` — pointeur, jamais l'epic entier |
| L-002 | 61–81 | Toute commande destinée au propriétaire s'écrit en **PowerShell**, jamais en bash |
| L-003 | 82–100 | Entrer dans la KnowledgeBase par `docs/kb-map.md`, jamais par le dossier au nom évident |
| L-004 | 101–119 | Une vérification post-déploiement doit attendre l'**effet**, pas le code de retour |
| L-005 | 120–153 | Un run **vert** ne prouve pas qu'une vérification a **tourné** |
| L-006 | 154–173 | Les annotations jaunes d'un run se traitent, elles ne se tolèrent pas |
| L-007 | 174–206 | Un gate livré n'est pas un gate câblé — il lui faut son étape CI, dans le même diff, dans tous les workflows |
| L-008 | 207–224 | Une contrepartie de conception qui n'existe que dans un commentaire de code ne protège rien |
| L-009 | 225–239 | Un artéfact généré et commité doit être reproductible octet pour octet, avec un mode `--check` |
| L-010 | 240–265 | Un test de mutation doit vérifier que la mutation a frappé sa cible |
| L-011 | 266–283 | Les commentaires de `src/index.html` sont servis à chaque visiteur |
| L-012 | 284–307 | Un test qui importe la constante qu'il vérifie ne vérifie rien du contrat |
| L-013 | 308–337 | Une option de configuration absente du fichier n'est pas prouvée inactive — seule une sonde bidirectionnelle fait foi |
| L-014 | 338–357 | Un gate de typage peut sortir vert en n'ayant vérifié **aucun** fichier |
| L-015 | 358–449 | Sur ce poste, `.yml`/`.json` sont en CRLF — ça casse une mutation en écriture ET une regex ancrée en lecture |
| L-016 | 450–501 | Un commentaire qui cite un fichier, une section ou une checklist doit pointer vers du réel — sinon c'est [[L-008]] avec une signature en plus |
| L-017 | 502–538 | Un octet NUL dans un fichier source le rend « binaire » pour grep/ripgrep, qui le sautent EN SILENCE |
| L-018 | 539–558 | Une assertion de « non-lecture » (ex. aucun paramètre d'URL lu) ne prouve que ce que le gabarit rend, pas ce que le code lit |
| L-019 | 559–586 | Une sonde qui COLLECTE des événements a besoin d'un contrôle POSITIF, pas seulement d'un tableau vide |
| L-020 | 587–603 | L-014 s'applique à **chaque nouveau programme TypeScript**, pas qu'à celui qui l'a fait naître |
| L-021 | 604–619 | `prefers-reduced-motion` + `transition-duration: 0.01ms !important` sur `*` transforme tout changement de style en micro-transition — lire un `getComputedStyle` sec ment |
| L-022 | 620–635 | Une option d'outil déplacée d'une version à l'autre ne produit AUCUN avertissement à l'exécution — seule la vérification de types l'attrape |
| L-023 | 636–693 | ⚠️ RÉPÉTÉE DEUX FOIS (E2-ST2, E2-ST4 lot B) — la leçon écrite ne suffit plus, il faut un garde-fou exécutable |
| L-030 | 694–717 | Un fragment nu (`href="#ancre"`) se résout contre `<base href>`, jamais contre l'URL courante — un test qui compare la CHAÎNE d'un `href` ne prouve rien de la navigation |
| L-031 | 718–734 | Un module GÉNÉRÉ (`content-generated/`) doit être injectable, pas importé en dur — `vi.mock` refuse un import relatif sous Angular 22 |
| L-024 | 735–751 | Le nom accessible d'éléments inline adjacents ne porte pas l'espace visuel qui vient du `gap` CSS |
| L-025 | 752–795 | Une marge automatique fait tomber un élément sans contenu à une largeur de ZÉRO dès qu'il est item de grille ou de flexbox — il occupe sa place et ne peint rien |
| L-026 | 796–816 | Une clef de cache indexée sur le CONTENU ne peut pas servir de préfixe d'identifiant — elle se répète dès que le contenu se répète |
| L-027 | 817–846 | Un workflow GitHub illisible ne produit pas une erreur de syntaxe — il produit un run en échec de 0 s, sur un déclencheur qui n'aurait pas dû s'appliquer |
| L-028 | 847–873 | Un outil d'analyse ne connaît pas la VIVACITÉ d'une collection DOM |
| L-029 | 874–900 | Une règle appliquée PAR ACCIDENT disparaît sans bruit quand on refactorise l'accident |
| L-032 | 901–938 | Une redirection sur un fichier JS déplace la BASE de ses imports relatifs — et l'émulateur qui ignore la directive rend le gate vert |
| L-033 | 939–998 | Entre la peinture prerendue et l'hydratation, le DOM natif accepte la saisie — et sans rejeu d'événements, la première détection l'écrase |
| L-034 | 999–1034 | Mutualiser une VÉRIFICATION déplace le risque vers le module mutualisé — il hérite du pouvoir de rendre tous ses appelants verts |
| L-035 | 1035–1091 | Un chiffre mesuré dans un périmètre ne se réemploie pas dans un autre périmètre sans être remesuré — et un test qui exige une sortie doit d'abord vérifier que l'entrée choisie la PRODUIT |
| L-036 | 1092–1139 | Un contrôle positif du CORRECTIF doit APPELER l'outil corrigé — un test qui compile transformateur branché mesure sa propre lecture, pas la capacité de refus qu'on vient de réparer |
| L-037 | 1140–1196 | « UNE définition, N appelants, dette PAYÉE » n'est vrai que si les N appelants ont été RECENSÉS — pas seulement ceux qui vivent dans le même dossier que l'outil |
| L-038 | 1197–1213 | Défaire une mutation de test par `git checkout -- <fichier>` sur un arbre SALE efface aussi le travail non commité de ce fichier |
| L-039 | 1214–1236 | Un test de mutation à une valeur NEUTRE mesure l'identité, pas le mécanisme qu'il prétend couvrir — et un commentaire `🔴` peut nommer le mauvais défaut voisin |
| L-040 | 1237–1258 | Le titre d'un test est lu par la CI, l'en-tête ne l'est par personne — un titre qui affirme un ABSOLU ne peut pas se contenter d'une condition structurelle |
| L-041 | 1259–1311 | Sous la CSP servie, l'écriture CSSOM de propriété par propriété (`.style.top`, `.setProperty`, `.cssText`) est APPLIQUÉE sans violation — seuls `setAttribute('style', …)` et un `<style>` inline non haché sont refusés, et ces deux-là sont rapportés. Dans un spec de ce dépôt, on ne déplace RIEN par une écriture d'attribut/bloc `style`, mais l'écriture CSSOM reste un canal ouvert |
| L-042 | 1312–1330 | Un test qui lance un processus fils sans délai explicite hérite du délai par défaut du runner — une marge qui rétrécit à chaque test ajouté ailleurs, et le lot qui la fait déborder n'est pas celui qui l'a écrite |
| L-043 | 1331–1366 | Un garde-fou qui balaie du texte source ne distingue pas un USAGE d'une MENTION — nommer l'interdiction dans un commentaire déclenche l'interdiction |
| L-044 | 1367–1388 | Une garde d'exhaustivité `satisfies never` se pose sur le DISCRIMINANT, jamais sur l'objet — une interface à champ union n'est pas une union d'interfaces |
| L-045 | 1389–1411 | Un périmètre de lot qui EXCLUT un gate ne peut pas voir les régressions que ce gate attrape ailleurs sur la page |
| L-046 | 1412–1433 | Un contrôle d'exhaustivité ne vaut que pour le CORPUS qu'on lui a donné — il conclura à l'absence chaque fois qu'une source légitime manque, même sur un fait exact |
| L-047 | 1434–1483 | Le budget de contexte d'une passe de fusion/synthèse se dimensionne au VOLUME DE SOURCE à lire, jamais au nombre de livrables promis |
| L-048 | 1484–1504 | Un job CI sans `timeout-minutes` ne rougit jamais quand il pend — il court jusqu'au plafond de six heures, et le mode d'échec est le SILENCE, pas le rouge |
| L-049 | 1505–1529 | Une étape CI qui fait DEUX choses sous un seul nom est indiagnosticable quand elle pend — scinder est un acte de diagnostic, et le journal de la panne peut contenir sa propre parade |
| L-050 | 1530–1557 | Un gate d'architecture livré ROUGE dans le même lot qui crée la première violation reste rouge en silence tant que chaque agent ne lance que SON spec |
| L-051 | 1558–1579 | `ng test --include=<glob>` restreint les specs exécutées, jamais le TYPECHECK — un lot qui change une signature publique ne compile son propre spec qu'une fois les appelants du lot suivant compilent aussi |
| L-052 | 1580–1592 | Isoler un spec Angular hors du builder officiel exige `--globals` — les globals de test viennent du builder, pas d'un `vitest.config.ts` |
| L-053 | 1593–1611 | Une fixture partagée entre specs est un contrat implicite — ajouter une donnée peut casser des assertions hors du périmètre du lot qui l'ajoute |
| L-054 | 1612–1639 | Une fixture de test qui alimente un champ soumis à une ÉNUMÉRATION de schéma avec une valeur HORS CONTRAT certifie l'inverse de la réalité |
| L-055 | 1640–1676 | `PLATFORM_ID: 'server'` NE FERME PLUS `afterNextRender` depuis Angular ≥ 19 — le drapeau consulté est le global `ngServerMode`, pas le jeton de plateforme |
| L-056 | 1677–1740 | Le lot de dette sécurité pré-E3-ST1 (4 PR, 2 Critiques + 8 Majeurs) : AUCUN défaut n'était de logique — tous étaient des défauts de PREUVE. Une question unique les couvre tous : « ce test/cette mesure aurait-il échoué dans les conditions exactes où l'échec doit se produire ? » |
| L-057 | 1741–1775 | Une assertion sur une VALEUR lue par une `page.evaluate` unique n'est jamais réessayée — c'est la vraie cause de l'intermittence e2e, pas l'hydratation |
| L-058 | 1776–1797 | Ajouter un nom accessible à un `<aside>` ne le nomme pas — ça le PROMEUT en repère, et un gabarit répétable fabrique alors des repères homonymes |
| L-059 | 1798–1817 | Une fixture « un exemplaire de chaque » ne peut JAMAIS exercer une règle d'UNICITÉ — le contrôle positif d'une telle règle exige un DOUBLON |
| L-060 | 1818–1839 | Un garde-fou de COLLECTION neuf frappe d'abord les données EXISTANTES — recenser les racines déjà porteuses du statut avant d'écrire la règle |
| L-061 | 1840–1860 | Deux agents ne partagent pas un arbre de travail quand l'un lance des gates — un `content:build` concurrent purge `src/content-generated/` |
| L-062 | 1861–1890 | L'instrument accuse le produit — deux cas neufs : une feuille racine-absolue en `file://`, et un harnais de MUTATION muet sur CRLF |
| L-063 | 1891–1921 | Un invariant que rien n'observe n'est pas vrai — il est INDÉTERMINÉ |
| L-064 | 1922–1942 | Un gate qui remplace un littéral par une mesure doit mesurer LE MÊME PRÉDICAT que le garde qu'il protège — pas un proxy voisin |
| L-065 | 1943–1961 | Un spec e2e calibré sur une fixture peut épingler un inventaire ÉDITORIAL — préférer une égalité DOM ↔ source de contenu à un compte en dur |
| L-066 | 1962–1980 | `toContainText(chaîne)` normalise les blancs (`\s+` → espace, U+00A0 inclus) — une insécable ne se prouve qu'en RegExp |
| L-067 | 1981–2000 | Une anti-vacuité peut être TAUTOLOGIQUE — `toBe(SOURCE.length)` après une boucle qui pousse un élément par itération de SOURCE ne peut jamais échouer |
| L-068 | 2001–2020 | Une règle DUPLIQUÉE par une frontière structurelle (tsconfig, e2e isolé) doit couvrir TOUTES ses copies dans son contrôle de parité, pas seulement les plus accessibles |
| L-069 | 2021–2056 | `CLAUDE.md` est capturé au démarrage de session — un sous-agent lancé ensuite hérite de cet instantané, pas du fichier au disque |
| L-070 | 2057–2078 | Un commentaire qui promet « hors périmètre » ou « pas encore » ment dès que le MÊME lot fait le travail qu'il annonçait comme futur |
| L-071 | 2079–2102 | Une propriété CSS DÉCLARÉE deux fois (une base, une surcharge) ne prouve rien sur laquelle GAGNE — et un garde-fou qui compte un motif dans une source compte aussi ses commentaires |
| L-072 | 2103–2123 | jsdom 28 n'expose plus `matchMedia`/`requestAnimationFrame`/`ResizeObserver` — un test qui les pose sans doublure lève sur l'INSTRUMENT, jamais sur le produit |
| L-073 | 2124–2147 | Un compte dérivé d'un champ OPTIONNEL du schéma hérite de son optionalité — un `if` qui retire une assertion sur une valeur à zéro ne laisse AUCUNE trace dans la sortie du run |
| L-074 | 2148–2176 | Un commentaire de correctif qui affirme une CAUSE doit l'avoir MESURÉE par retrait, pas inférée du symptôme |
| L-075 | 2177–2197 | Un bloc de commentaire dont l'en-tête annonce qu'il a été RÉÉCRIT ne doit laisser AUCUN inventaire périmé en dessous |
| L-076 | 2198–2223 | Un coin de tableau comparatif laissé vide est le défaut que la bascule `verifiee` → `publiee` révèle, TROIS FOIS SUR TROIS |
| L-077 | 2224–2256 | Intervertir « chemin principal » et « variante » dans un document laisse la PROSE EN AVAL décrire l'ancien chemin, sans qu'aucun diff ne la signale |
| L-078 | 2257–2280 | La partie « CONTRAT » d'un livrable découpé entre plusieurs agents n'appartient à aucune moitié — elle disparaît si personne ne la recopie |
| L-079 | 2281–2304 | Une vérification en ligne qui CONFIRME l'hypothèse de départ doit être relancée verbatim avant d'être crue |
| L-080 | 2305–2336 | Une liste blanche fermée sur le CORPUS a une date de péremption ; fermée sur le CONTRAT de l'outil, elle n'en a pas |
| L-081 | 2337–2363 | Une leçon peut être fausse sans qu'aucune de ses phrases le soit — la faute se répartit, elle ne se localise pas |
| L-082 | 2364–2387 | Une commande présentée comme une PREUVE doit être confrontée à « que mesure-t-elle exactement ? » — sinon elle enseigne un instrument faux |
| L-083 | 2388–2411 | Un garde-fou de contenu qui sort dès qu'AUCUN attribut n'est fourni transforme une obligation en option — c'est le cas par défaut qui passe |
| L-084 | 2412–2445 | Assouplir une règle exige de recenser aussi ce qui en DÉPEND sans la tester — pas seulement ce qui l'applique |
| L-085 | 2446–2480 | Une garde de CHEMIN dont le verdict dépend de l'OS est DEUX gardes — `path` change de sémantique sous elle, et le vert local ne prouve alors rien |
| L-086 | 2481–2516 | Une fixture d'intégration où le paramètre vaut `undefined` ne distingue pas « câblé » de « jamais passé » |

## Leçons de sécurité (S-0xx) — CSP, assainissement, chaîne de build

Fichier : `.claude/lessons/security-lessons.md`

| Entrée | Lignes | Sujet |
|---|---|---|
| S-001 | 23–41 | Un garde-fou qui se met à autoriser doit apparier des jetons structurels, jamais des sous-chaînes (A05 · WSTG-CONF) |
| S-002 | 42–116 | Une autorisation CSP se compare à une valeur revue épinglée, jamais ne se dérive de l'artéfact (A05/A08) |
| S-003 | 117–158 | Un garde-fou fail-closed doit prouver qu'il a TOUT vu, pas seulement bien refuser ce qu'il voit (A05 · WSTG-CONF) |
| S-004 | 159–174 | Une config de déploiement qui NOMME un chemin doit prouver qu'il existe dans l'artéfact (A05 · fail-open) |
| S-005 | 175–217 | Un défaut de framework peut injecter des scripts inline sous une CSP stricte, et seulement quand la page devient interactive (A05 · fail-open de portée) |
| S-006 | 218–234 | Tout fichier présent dans l'artéfact est servable, qu'un plan de routage le mentionne ou non (A05 · exclusion d'audit sur motif faux) |
| S-007 | 235–253 | Isoler un secret protège le jeton, pas l'artéfact — ce sont deux mesures distinctes (A08 · chaîne d'approvisionnement CI/CD) |
| S-008 | 254–274 | Un `exit 0` sur chemin d'erreur rend une vérification verte sans qu'elle ait tourné (A05 · fail-open assumé dans le code) |
| S-009 | 275–325 | Une liste NOIRE de motifs sur un format structuré (SVG/HTML/XML) n'est pas un garde-fou, et un texte de justification ne doit jamais promettre plus que le code n'applique (A03/A08 · CWE-79/CWE-116) |
| S-010 | 326–440 | Un garde-fou doit couvrir exactement le périmètre que sa promesse énonce, avec un contrôle positif prouvant qu'il l'a réellement lu (A05 · WSTG-CONF) |
| S-025 | 441–462 | Un instrument d'énumération LIVE d'une directive DÉRIVÉE ne couvre que les formes de page déjà visitées par un test — jamais toutes les formes qui contribuent à la directive (A05 · trou de couverture non signalé, croisement [[S-010]]/[[S-016]]) |
| S-011 | 463–571 | Un garde-fou qui balaie la SORTIE rencontre un jour le contenu qui enseigne le motif qu'il refuse (A05 · pression d'assouplissement) |
| S-012 | 572–588 | `npx` dans un job de CI qui produit l'artéfact publié est une résolution de code NON ÉPINGLÉE au moment de l'exécution (A08 · CICD-SEC) |
| S-013 | 589–604 | Un aléa faible dans un INSTRUMENT DE MESURE de sécurité ne crée pas une faille, il crée un FAUX NÉGATIF (A05 · CWE-330 appliqué à un gate) |
| S-014 | 605–635 | La règle « analyser, jamais apparier par motif » vaut pour TOUTE chaîne qui contient une entrée — même un contrôle de conservation, même sur une sortie d'outil réputée sûre (A03/A05 · CWE-116, quatrième occurrence de la famille [[S-001]]/[[S-003]]/[[S-009]]) |
| S-015 | 636–661 | Un garde-fou par motif peut échouer par SUR-refus — et sur ce dépôt, le contenu le plus certain de le déclencher est la leçon qui enseigne le motif surveillé, sans parade éditoriale possible (A05/CWE-116 · sur-refus, axe neuf sur la famille [[S-001]]/[[S-003]]/[[S-009]]/[[S-014]]) |
| S-016 | 662–742 | Un collecteur de `securitypolicyviolation` mesure « rien d'observable par CET événement », pas « rien de bloqué » — et la portée réelle de `style-src` n'est pas celle qu'on croit (A05 · faux négatif d'instrument, cousin de [[S-005]]/[[S-013]]) |
| S-018 | 743–787 | Scinder/renommer une étape de CI CRÉE une affirmation de sécurité — sans contrôle sur le CORPS de ce qui s'exécute, le nom est une intention, pas un garde-fou (A08 · CICD-SEC, croisement [[S-002]]/[[S-009]]) |
| S-019 | 788–824 | Sur un site prerendu, « ne pas prerendre » n'est PAS « ne pas publier » — un filtre de visibilité doit couvrir génération, mise en artéfact ET rendu client (A01/A05 · croisement [[S-006]]/[[S-010]]) |
| S-017 | 825–852 | Une clé venue du contenu (`JSON.parse`) qui indexe un objet PAR CROCHETS peut remonter `Object.prototype` — un motif kebab-case ne l'exclut pas (A03 · CWE-1321, troisième occurrence sur ce dépôt) |
| S-020 | 853–879 | Sur une liste blanche NOMINATIVE, un nom d'attribut admis n'est pas une VALEUR admise — cinquième occurrence de la famille [[S-001]]/[[S-003]]/[[S-009]]/[[S-014]] (A03 · CWE-116, CWE-79) |
| S-021 | 880–909 | Un artéfact transféré entre jobs de CI EST une entrée non fiable — existence des chemins attendus ne suffit ni contre un membre EN PLUS, ni contre un chemin `..`, ni contre un lien symbolique (A08 · CICD-SEC, CWE-22) |
| S-022 | 910–960 | Un garde-fou qui balaie la SOURCE d'un format qui DÉCODE se contourne par ce que le compilateur ajoute — la COUCHE d'observation est un choix de sécurité (A03/A05 · CWE-116, axe neuf sur la famille [[S-003]]/[[S-009]]/[[S-014]]) |
| S-023 | 961–1001 | Retirer une permission CSP nominative devenue sans besoin est un DURCISSEMENT — à condition que le garde-fou qui la comptait reste capable de rougir (A05 · patron réussi, à réemployer) |
| S-024 | 1002–1035 | Fermer une leçon de sécurité exige de mesurer le RÉSIDU sur l'artéfact du lot, jamais de le raisonner de mémoire — le mécanisme et l'état du produit sont deux régimes de preuve distincts (A05 · discipline de clôture) |
| S-026 | 1036–1077 | Un `echec()` temporaire n'est PAS une validation — un champ d'auteur sans grammaire, aujourd'hui injoignable, est une dette DATÉE au commit qui lèvera le refus, sixième occurrence de la famille [[S-001]]/[[S-003]]/[[S-009]]/[[S-014]]/[[S-020]] (A03 · CWE-116/CWE-79, prévention datée) |

_112 entrées indexées._
