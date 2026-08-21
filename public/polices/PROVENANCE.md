# Provenance des polices auto-hébergées

> **Ce fichier était PROMIS et ABSENT.** `src/styles/_polices.scss` le référence depuis E1-ST1-B
> (« Le détail — URL exacte, empreintes, procédure de mise à jour — vit dans
> `public/polices/PROVENANCE.md` »), mais le fichier n'a jamais été créé. Constaté le 2026-08-20 en
> préparant la bascule E6. Un commentaire qui pointe vers un document inexistant est une dette
> silencieuse : il donne l'apparence d'une procédure documentée là où il n'y en a pas.

**Pourquoi auto-hébergé.** La CSP du site déclare `font-src 'self'` : aucun hôte externe n'est
joignable, par construction. Ce n'est pas une contrainte subie — un cours de sécurité web qui
appellerait un CDN tiers pour ses polices se contredirait à sa première page. Aucune requête vers
Google au chargement, donc aucune adresse IP de lecteur transmise à un tiers.

**Pourquoi les noms portent la version.** `public/**` est copié **sans empreinte de contenu**, alors
que les `.woff2` sont servis `immutable` pendant un an. Un fichier remplacé sous le même nom
resterait en cache chez les lecteurs jusqu'à expiration. La version du fournisseur (`v20`, `v6`,
`v16`) est donc portée par le NOM : la changer, c'est changer l'URL.

**Pourquoi on ne retaille JAMAIS un sous-ensemble à la main.** Un sous-ensemble maison casse `œ`,
`« »` et `’` en silence, au milieu d'un mot. Les `unicode-range` sont **recopiés verbatim** du
fournisseur, et `tools/design/verifier-glyphes.mjs` vérifie les deux moitiés : le caractère tombe
dans un `unicode-range` déclaré ET le `.woff2` contient vraiment son glyphe.

## Procédure de mise à jour

1. Demander la famille à l'API Google Fonts **avec un User-Agent de navigateur moderne** (sans quoi
   elle sert du `.ttf` au lieu du `.woff2`) :
   `https://fonts.googleapis.com/css2?family=<Famille>:wght@<graisse>&display=swap`
2. Ne retenir que les blocs `/* latin */` et `/* latin-ext */`.
3. **Une graisse par téléchargement, explicitement.** Piège mesuré le 2026-08-20 : un script qui
   prend « le premier bloc par sous-ensemble » écrase la graisse 400 par la 700 sans le dire — on
   pèse et on teste alors un fichier qui n'est pas celui qu'on livre.
4. Renommer `<famille>-<graisse>-<sous-ensemble>-v<version>.woff2`.
5. Recopier l'`unicode-range` **verbatim** dans `_polices.scss`.
6. Relever le SHA-256 et l'inscrire ici.
7. `npm run design:glyphes` — doit passer avant le commit.

## Fichiers livrés — bascule « Moniteur ambre » (E6, 2026-08-20)

| Fichier | Rôle | Octets | SHA-256 |
|---|---|---:|---|
| `ibm-plex-mono-700-latin-v20.woff2` | Titres / affichage | 14 908 | `4f84d86cfd060f4ded334358ff8a4c81d4db2ed5addd568359d693f44a87765a` |
| `ibm-plex-mono-700-latin-ext-v20.woff2` | Titres / affichage | 13 380 | `5b9b81f54dd69635c7adcaacd4c4545a73fe4809c528e22734b238a83a74135f` |
| `ibm-plex-mono-400-latin-v20.woff2` | Blocs de code | 14 708 | `08949f728dc52d528e69b1667d15c89a5686a4ee9a296ff90983985f99c380f7` |
| `ibm-plex-mono-400-latin-ext-v20.woff2` | Blocs de code | 13 348 | `6bc0f226a5b7884a8170e3f62c63d7675609d4631bdc5931b5cdab81821f00eb` |
| `silkscreen-400-latin-v6.woff2` | Micro-étiquettes | 8 404 | `e6c72ea4702249202bcdd79d3343057e4e25ef1f04e3fcffd8602ab53b40b4cc` |
| `silkscreen-400-latin-ext-v6.woff2` | Micro-étiquettes | 3 436 | `1006c6fc608892267eebc2a4d5ab4d3c1f56bc1f86cbe1615b521993bca8c375` |
| `press-start-2p-400-latin-v16.woff2` | Police du jalon | 12 512 | `afec86997fdaf54af1f59358fa2c1e2a0f1d04146edad18e5cd141d0384a7548` |
| `press-start-2p-400-latin-ext-v16.woff2` | Police du jalon | 9 856 | `3c7df3a15e173b8fa04ec9191171e72c314ddbac1b395e2b2e2092bb4f47cc8c` |
| `inter-latin-v20.woff2` | Corps — **conservée** | 48 256 | *(inchangée depuis E1-ST1-B)* |
| `inter-latin-ext-v20.woff2` | Corps — **conservée** | 85 068 | *(inchangée depuis E1-ST1-B)* |

**Retiré :** `fraunces-700-latin-v38.woff2` (35 512 o) et `fraunces-700-latin-ext-v38.woff2`
(32 304 o), plus `LICENCE-fraunces-OFL.txt`.

### URL exactes du fournisseur

```
ibm-plex-mono-700-latin      https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3pQPwlBFgg.woff2
ibm-plex-mono-700-latin-ext  https://fonts.gstatic.com/s/ibmplexmono/v20/-F6qfjptAgt5VM-kVkqdyU8n3pQPwl5FgtIU.woff2
ibm-plex-mono-400-latin      https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n1i8q1w.woff2
ibm-plex-mono-400-latin-ext  https://fonts.gstatic.com/s/ibmplexmono/v20/-F63fjptAgt5VM-kVkqdyU8n1iEq129k.woff2
silkscreen-400-latin         https://fonts.gstatic.com/s/silkscreen/v6/m8JXjfVPf62XiF7kO-i9YLNlaw.woff2
silkscreen-400-latin-ext     https://fonts.gstatic.com/s/silkscreen/v6/m8JXjfVPf62XiF7kO-i9YL1la1OD.woff2
press-start-2p-400-latin     https://fonts.gstatic.com/s/pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nVivM.woff2
press-start-2p-400-latin-ext https://fonts.gstatic.com/s/pressstart2p/v16/e3t4euO8T-267oIAQAu6jDQyK3nbivN04w.woff2
```

## Licences

Les trois familles sont sous **SIL Open Font License 1.1**, qui autorise l'auto-hébergement et la
redistribution. Les textes intégraux sont versés à côté des fichiers :
`LICENCE-ibm-plex-mono-OFL.txt`, `LICENCE-silkscreen-OFL.txt`, `LICENCE-press-start-2p-OFL.txt`.

- **IBM Plex Mono** — Copyright © 2017 IBM Corp., nom réservé « Plex ».
- **Silkscreen** — Copyright 2001 The Silkscreen Project Authors.
- **Press Start 2P** — Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net).

## Couverture française — mesurée le 2026-08-20

`tools/design/verifier-glyphes.mjs` exige 40 caractères (dont `œ`, `Œ`, `«`, `»`, `’`, U+00A0).
Mesure sur les graisses **réellement retenues** :

| Famille | Résultat |
|---|---|
| IBM Plex Mono 700 | **40/40** |
| IBM Plex Mono 400 | **40/40** |
| Silkscreen 400 | **40/40** |
| Press Start 2P 400 | **40/40** |

⚠️ Ce résultat **réfute** l'hypothèse écrite dans `docs/design/direction-visuelle.md` § Typographie
(« les polices pixel couvrent notoirement mal le français »). Sur ces trois-là, elle est fausse — et
c'est la mesure qui tranche, pas la réputation. Le document doit être corrigé.

## Bilan de poids — mesuré, et il corrige un chiffre du plan

`docs/design/direction-visuelle.md` et `docs/agile/backlog-phase-1.md` §E6-ST2 annoncent tous deux
« ~113 Ko livrés en moins » au retrait de Fraunces. **Les deux fichiers pèsent 67 816 o.** Le bilan
réel de la bascule :

| | Livré (tous fichiers) | Chargé (page française, sous-ensemble `latin`) |
|---|---:|---:|
| Avant | 201 140 o | 83 768 o |
| Après, sans police de code | 195 820 o | 84 080 o |
| **Après, décision retenue** | **223 876 o** | **98 788 o** |
| **Delta** | **+22 736 o** | **+15 020 o** |

**La bascule typographique ne fait PAS gagner de poids — elle en coûte.** Décision du propriétaire du
2026-08-20 : les blocs de code passent d'une pile monospace **système** à **IBM Plex Mono 400**, ce
qui ajoute 14 708 o chargés sur une page de leçon. Le motif est pédagogique, pas esthétique : avec une
pile système, un même extrait PHP s'affiche en Consolas chez un lecteur et en SF Mono chez un autre,
alors que le cours ancre des annotations **à la ligne** et oppose des paires vulnérable/corrigé où
l'alignement porte du sens.

⚠️ **Ce que ce choix engage** : `--police-code` devient une police **auto-hébergée**, donc les
`<link rel="preload">` d'`index.html` et le budget de feuille de `quiz.scss` sont à revoir, et
toute page portant du code télécharge désormais un fichier de plus.
