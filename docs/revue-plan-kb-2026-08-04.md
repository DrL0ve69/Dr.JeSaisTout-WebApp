# Revue critique du plan face à la KnowledgeBase — 2026-08-04

> **Périmètre.** Confrontation des décisions **non encore implémentées** (E1 design system, barre
> d'accessibilité, composants E2, règle de contenu pédagogique) aux fiches KB que le plan n'avait
> jamais ouvertes. **Les ADR tranchés en E0-ST1 ne sont pas rouverts** — S-01, S-02 et S-03 restent
> acquis.
>
> Méthode : lecture intégrale de `KnowledgeBase/INDEX.md` (263 fiches, 10 domaines), puis lecture
> complète des fiches décisives. Table de routage durable : [`kb-map.md`](kb-map.md).
>
> Sévérité — **Bloquant** : le plan décrit un gate impossible à satisfaire · **Majeur** : le plan
> conduirait à un défaut réel (accessibilité, budget, régression) · **Mineur** : précision manquante.

---

## C1 · Bloquant — le skill `frontend-design` n'existe pas

**Constat.** Le plan appelle un skill `frontend-design` à **cinq endroits** :
`docs/agile/backlog-phase-1.md:138` (E1-ST3, « Maquette via le skill `frontend-design` d'abord »),
`docs/agile/roadmap.md:46`, `docs/design/direction-visuelle.md:10, 69, 98`.

Skills réellement installés : `feature-cycle`, `lecon`, `security-audit` (projet) ; `angular`,
`archiviste`, `solid-review` (utilisateur). **`frontend-design` n'est nulle part.** E1-ST3 porte donc
un préalable que rien ne peut satisfaire, et `direction-visuelle.md` renvoie la moitié de sa mise en
œuvre à un outil inexistant.

**Pourquoi ça compte.** Ce n'est pas une coquille : c'est le seul endroit du plan qui décrit
*comment* on passe de la direction visuelle à une maquette. Sans lui, E1-ST3 n'a pas de méthode.

**Correctif retenu.** Remplacer l'appel au skill par une **méthode explicite ancrée sur deux fiches
KB**, sans créer de dépendance à un outil :
- `web/frontend/principes-design-visuel.md` — anchor font, star of the show, visual rhyming,
  hiérarchie, et surtout la discipline d'**itérer largement avant de converger** (l'auteur signale
  que sa version retenue était la 12ᵉ).
- `ai/agents/claude-code/design-ui.md` — la boucle génération/critique et la « bibliothèque de
  goût » injectée en contexte, c'est-à-dire précisément l'anti-AI-slop que vise ce projet.

---

## C2 · Majeur — les échelles d'E1-ST1 sont nommées, jamais définies

**Constat.** E1-ST1 demande des « échelles typo/espacement ». Aucun ratio, aucune unité de base,
aucun critère d'acceptation. Un gate qui dit « il y aura une échelle » ne peut pas échouer.

**Ce que la KB donne.** `web/frontend/principes-design-visuel.md` §Fondamentaux :
- **Échelle typographique** : un jeu **fixe** de tailles, espacées d'au moins **~25 %** pour que
  chaque saut soit perceptible et volontaire (référence *Refactoring UI*, Wathan & Schoger).
- **Espacement 8pt** : marges, paddings et gaps alignés sur des multiples de 8 (8, 16, 24, 32, 48,
  64), sous-grille en multiples de 4.

La fiche insiste sur un point que le plan inverse : ces fondamentaux ne sont **pas** des détails
d'implémentation, ce sont le préalable. « Sans cette base, appliquer ces six tips revient à décorer
une structure bancale. » Or E1-ST1 traite l'échelle comme un livrable parmi d'autres.

---

## C3 · Majeur — la hiérarchie par opacité est un piège d'accessibilité, et la direction visuelle y mène droit

**Constat.** La direction « carnet de laboratoire » repose sur des textes secondaires : marginalia,
« note du Dr. », annotations, exergues. Le réflexe pour les hiérarchiser est l'opacité — c'est la
technique n°5 de la fiche KB, empruntée à Material Design (87 % / 60 %).

**Le piège, documenté dans la fiche elle-même :** « baisser l'opacité du texte réduit mécaniquement
son ratio de contraste. Un gris clair à 60 % d'opacité sur fond blanc peut tomber sous 4.5:1. »

C'est une collision frontale avec le garde-fou **G8** (AA partout, AAA visé pour le corps) et avec la
barre projet « zéro violation AXE ». Et c'est insidieux : l'opacité s'applique souvent au niveau
composant, donc échappe à la revue des jetons.

**Règle à inscrire dans E1-ST1 :** **aucune opacité sur un jeton de texte.** Chaque niveau
d'emphase est une **couleur pleine**, avec son ratio mesuré et consigné. L'opacité reste permise sur
les décors (règlure, filets), jamais sur du texte. *(Déjà appliqué dans la page « bientôt » d'E0-ST4 :
`--encre-attenuee` est une couleur pleine, pas une opacité.)*

---

## C4 · Majeur — aucune ligne du plan ne dit que les polices doivent être auto-hébergées

**Constat.** G3 exige une « serif à caractère » en display (Fraunces ou équivalent). La CSP du site
est `font-src 'self'` et n'autorise **aucun hôte externe** — pas de Google Fonts. Donc les polices
doivent être **auto-hébergées**. E1-ST1 ne le mentionne nulle part : ni fichiers `woff2`, ni
sous-ensemble de glyphes, ni `font-display`, ni `@font-face`.

Le sujet n'est pas théorique : la page « bientôt » d'E0-ST4 a dû assumer un **écart à G3** (pile
système) faute de police disponible, et ça restera vrai tant qu'E1-ST1 ne traite pas la question.

**Piège spécifique au français, à ne pas rater.** Un sous-ensemble « latin » standard suffit rarement :
il faut vérifier la présence des accents (é è ê ë à â ç î ï ô û ù), de la ligature **œ**, et des
**guillemets français « »** — le site en est truffé. Un sous-ensemble trop agressif les remplacerait
par des glyphes de repli, en silence.

**Point validé au passage.** La méthode de la fiche — choisir l'**anchor font sur le titre**, pas sur
le corps, puis chercher un support qui contraste — confirme le couple proposé par
`direction-visuelle.md` (Fraunces serif + Inter/Source Sans). Le piège qu'elle signale, deux polices
trop proches perçues comme une erreur (« Georgia et Times New Roman »), ne s'applique pas ici.

---

## C5 · Majeur — les onglets de langage d'E2-ST4 sont un sous-projet, pas une option d'affichage

**Constat.** E2-ST4 (`CodeCompareComponent`) prévoit des « onglets de langage (PHP/C#/TS) » en une
demi-ligne, avec pour gate « G-axe (annotations accessibles, pas de sens porté par la couleur seule) ».

**Ce que dit la KB.** `web/html/html-semantique-accessibilite.md` est net : le HTML n'a **pas** de
balise `tabs` native — c'est un des rares cas où ARIA est légitime. Mais le coût réel est
« réimplémenter la navigation clavier (flèches, Home/End, Échap), le piège du focus, les rôles ARIA
corrects, et les tester avec un vrai lecteur d'écran. **Ce n'est pas un détail cosmétique, c'est un
sous-projet.** »

La même fiche rappelle l'étude WebAIM : les pages qui utilisent ARIA affichent en moyenne **plus**
d'erreurs d'accessibilité que celles qui n'en utilisent pas. Des onglets mal posés dégraderaient
l'accessibilité du composant le plus emblématique du site.

**La KB a déjà le patron** : `web/css/composant-tabs.md` — `tablist`/`tab`/`tabpanel`, **roving
tabindex**, navigation clavier, et les alternatives (`details`/`name`, headless). À citer dans
E2-ST4, et à traduire en gates vérifiables (flèches gauche/droite, Home/End, un seul `tabindex="0"`
dans le `tablist`).

---

## C6 · Majeur — « zéro violation AXE » n'est pas « WCAG 2.2 AA »

**Constat.** La barre dure du projet est formulée « WCAG 2.2 AA, zéro violation AXE » — les deux
traités comme équivalents. Les gates E1-ST2 et E2-ST3/4/5 se réduisent à `G-axe`, avec une parenthèse
« navigation clavier complète » qu'axe **ne teste pas**.

**Pourquoi c'est un vrai trou.** Un outil automatisé ne couvre qu'une fraction des critères WCAG :
l'ordre de tabulation, le piège du focus, la pertinence d'un nom accessible, la cohérence de l'annonce
au lecteur d'écran ne sont pas décidables par machine. Et le point central de la fiche KB — *no ARIA
is better than bad ARIA* — décrit exactement une classe de défauts qu'axe ne voit pas : un `role`
syntaxiquement valide mais sémantiquement faux passe le test automatique.

**Correctif.** Garder `G-axe` comme plancher automatisé, et lui adjoindre une **checklist manuelle**
sur tout composant interactif (E1-ST2, E2-ST3, E2-ST4, E2-ST5) : parcours au clavier seul, focus
visible à chaque étape, ordre de tabulation logique, et une passe lecteur d'écran. Sans quoi la
« barre dure » est plus basse que ce que le projet croit.

---

## C7 · Majeur (pédagogie) — la règle de contenu ignore le « moment mémorable », et 4 modules sur 13 n'en ont aucun

**Constat.** `.claude/rules/contenu-pedagogique.md` §2 exige par concept : théorie + exemple simple
et complexe + analogie bornée + support visuel. C'est solide, mais ça décrit une **structure**, pas un
**ancrage**.

**Ce qu'apporte `divers/pedagogie/enseigner-informatique-ere-ia.md`** (David Malan, CS50) : la
pédagogie du **« moment mémorable »** — au moins un par cours, placé **en début ou milieu de séance
plutôt qu'à la fin**, qui ancre un concept abstrait dans une expérience partagée (déchirer un
annuaire pour la recherche binaire, faire trier des étudiants sur scène). Malan assume le coût :
10-15 minutes qui paraissent disproportionnées aux plus avancés, investies délibérément pour motiver
la majorité avant 5 à 20 h de travail.

Pour ce site, le moment mémorable **existe déjà sous un autre nom** : c'est la
`SimulationComponent`. Mais le backlog le traite comme un agrément (« Simulation : oui/non ») plutôt
que comme une exigence pédagogique.

**Le trou concret :** **4 modules sur 13 n'ont aucune simulation prévue** — E3-ST1
(`01-fondamentaux`), E3-ST2 (`02-evaluation-cvss`), E3-ST8 (`08-cryptographie`), E3-ST13
(`13-durcissement-serveur`). Leur seul support est « diagrammes statiques ». Ce sont pourtant les
modules les plus abstraits du cours — précisément ceux qui en auraient le plus besoin. Chacun devrait
**nommer explicitement son moment mémorable**, même sans simulation interactive.

*Note : le module 13 en a un tout trouvé, déjà inscrit au plan — « les en-têtes réels de CE site
comme étude de cas ». C'est exactement la bonne forme. Les trois autres n'ont rien.*

**Point validé.** Le choix du format long (13 modules substantiels plutôt que des capsules) est
soutenu par la même fiche : le découpage court augmente l'engagement mesuré mais pas nécessairement
les résultats d'apprentissage, et le format long tient en ligne parce que le lecteur contrôle son
rythme. Ce n'était jusqu'ici qu'une préférence ; c'est maintenant un choix documenté.

---

## C8 · Mineur — les prérequis réseau du cours ne sont adossés à rien

**Constat.** `.claude/rules/contenu-pedagogique.md` exige des « prérequis explicites ». Les 13 modules
présupposent HTTP, TLS, cookies, DNS — et aucun ne pointe de source pour ces prérequis, parce que le
plan ne connaissait que `web/securite/`.

**Disponible dans la KB** : `cs/reseaux/parcours-requete-web.md` (DNS, TCP, HTTP/2, HTTP/3-QUIC, CDN,
rendu navigateur), `cs/reseaux/https-tls.md` (handshake, certificats, HSTS, ACME/Let's Encrypt,
révocation, durée de vie des certificats 398→47 j), `web/backend/cors.md` (CORS ≠ CSRF ≠ SOP —
distinction que le module 05 doit faire).

Modules directement concernés : **01** (prérequis généraux), **05** (CSRF vs CORS), **11**
(sessions/cookies), **13** (HSTS, TLS, en-têtes).

---

## Ce qui n'est pas remis en cause

- **S-01 / S-02 / S-03** — tranchés en E0-ST1, hors périmètre de cette revue.
- **La direction « carnet de laboratoire »** — la KB la conforte plutôt qu'elle ne la conteste. Le
  garde-fou **G2** (pas de glassmorphism) contredit en apparence la technique « depth » de la fiche
  KB, mais la fiche elle-même tranche dans le même sens : sur un produit « où la clarté et la vitesse
  de scan priment », texture et glassmorphism « ajoutent une charge cognitive contre-productive ». Un
  site de cours est un produit de lecture. **G2 est fondé, pas seulement affaire de goût.**
- **Le choix Angular / SSG** — hors périmètre (ADR tranché).

## Suites

Correctifs C1 à C5 appliqués au plan le 2026-08-04 (backlog E1-ST1, E1-ST3, E2-ST4 ;
`direction-visuelle.md`). **C6, C7 et C8 restent ouverts** : ils touchent
`.claude/rules/contenu-pedagogique.md` et la définition des gates d'accessibilité, deux documents
dont la modification mérite une décision du propriétaire plutôt qu'une édition d'office.
