# Polices auto-hébergées — décisions, écarts et procédure

> Premiers fichiers versés au dépôt le **2026-08-04** (E1-ST1 · ST1-B), corpus **recomposé le
> 2026-08-20** par la bascule **E6 « Moniteur ambre »** (décision D-1,
> [`direction-visuelle.md`](direction-visuelle.md)). Ce document existe pour qu'on puisse **refaire**
> l'opération et **comprendre** ce qui a été tranché, sans avoir à se souvenir de quoi que ce soit.
> Les commentaires de `src/styles/_polices.scss` disent *pourquoi* ; celui-ci dit *ce qui a été
> décidé et mesuré*.
>
> 🔴 **La source d'autorité sur les FICHIERS — URL exacte, SHA-256, taille, procédure de
> retéléchargement — est [`public/polices/PROVENANCE.md`](../../public/polices/PROVENANCE.md)**, posé
> à côté des `.woff2`. Ce fichier-ci n'en tient pas une seconde copie, délibérément : deux tables
> d'empreintes dérivent, et celle qu'on oublie de mettre à jour est celle qui ment.

## Les quatre familles et leur rôle

| Rôle | Famille | Jeton | Fichiers |
|---|---|---|---|
| Corps de texte et interface | **Inter** 100-900 (variable) | `--police-corps` | 2 (`latin`, `latin-ext`) |
| Titres | **IBM Plex Mono** 700 | `--police-titres` | 2 |
| Blocs de code | **IBM Plex Mono** 400 | `--police-code` | 2 |
| Micro-étiquettes en capitales | **Silkscreen** 400 | `--police-micro` | 2 |
| Jalons (rôle fermé) | **Press Start 2P** 400 | `--police-jalon` | 2 |

**Fraunces est retirée** avec le « Carnet de laboratoire » : une serif à graisses optiques est
l'opposé d'un moniteur ambre.

## Pourquoi ces fichiers sont dans le dépôt

La CSP du site est `font-src 'self'` (`config/staticwebapp.config.source.json`) : **aucun hôte
externe n'est joignable**, par construction. Ce n'est pas une contrainte subie — un cours qui
enseigne la sécurité des applications web ne peut pas appeler un CDN tiers pour ses polices. Effet
de bord voulu : aucune adresse IP de lecteur n'est transmise à Google au chargement d'une page.

## Licences

Les quatre familles sont sous **SIL Open Font License 1.1**, qui autorise explicitement
l'auto-hébergement et la redistribution. Textes intégraux versés à côté des fichiers :

| Famille | Licence | Auteurs |
|---|---|---|
| Inter | [`LICENCE-inter-OFL.txt`](../../public/polices/LICENCE-inter-OFL.txt) | The Inter Project Authors |
| IBM Plex Mono | [`LICENCE-ibm-plex-mono-OFL.txt`](../../public/polices/LICENCE-ibm-plex-mono-OFL.txt) | IBM Corp. |
| Silkscreen | [`LICENCE-silkscreen-OFL.txt`](../../public/polices/LICENCE-silkscreen-OFL.txt) | Jason Kottke |
| Press Start 2P | [`LICENCE-press-start-2p-OFL.txt`](../../public/polices/LICENCE-press-start-2p-OFL.txt) | Cody « CodeMan38 » Boisclair |

L'OFL impose de conserver l'avis de droit d'auteur et interdit de vendre les fichiers seuls — les
deux sont respectés. Elle interdit aussi d'employer les **noms réservés** ; nous ne renommons ni ne
modifions les fontes, nous les servons telles quelles.

## Bilan de poids — LIVRÉ et CHARGÉ ne vont pas dans le même sens

Mesuré le 2026-08-20 (`wc -c`, Fraunces relue depuis git avant suppression) :

| | Avant | Après | Delta |
|---|---:|---:|---:|
| **Livré** (tous fichiers) | 201 140 o | 223 876 o | **+22 736 o** |
| **Chargé** sur une page de leçon complète (5 sous-ensembles `latin`) | 83 768 o | 98 788 o | **+15 020 o** |

**La bascule COÛTE du poids chargé, elle n'en fait pas gagner** — et le poste responsable est la
**police de code** (+14 708 o), assumé plus bas. Le reste s'équilibre presque : IBM Plex Mono 700
`latin` (14 908 o) remplace Fraunces `latin` (35 512 o). Le chiffre ci-dessus est le **cas le plus
chargé** : une page qui ne porterait ni pastille de jalon ni micro-étiquette ne chargerait que
77 872 o, soit moins qu'avant la bascule. Une page française ne télécharge que les sous-ensembles
`latin` : les `latin-ext` ne sont récupérés que si un caractère de leur `unicode-range` apparaît
réellement.

⚠️ `direction-visuelle.md` et le backlog §E6-ST2 annonçaient « ~113 Ko livrés en moins » au retrait
de Fraunces. **Les deux fichiers pesaient 67 816 o** ; le chiffre du plan était faux et a été corrigé
dans les deux documents le 2026-08-20.

### Trois choix chiffrés, pas devinés

- **Inter : un seul fichier par sous-ensemble.** Demander `wght@400` puis `wght@700` au fournisseur
  renvoie deux URL différentes mais des octets **rigoureusement identiques** (même SHA-256, même
  taille) : Inter est servie en police **variable**. Livrer les deux graisses aurait ajouté **133 Kio
  de doublon pur**. D'où `font-weight: 100 900` dans `_polices.scss` — c'est l'intervalle réellement
  porté par le fichier.
- **IBM Plex Mono : deux fichiers par sous-ensemble, et c'est inévitable.** Contrairement à Inter,
  elle n'est **pas** servie en variable par le fournisseur : la 400 et la 700 ont des SHA-256
  distincts. Chaque graisse coûte donc son fichier — vérifié, pas supposé.
- **Le code passe d'une pile SYSTÈME à une police servie** (décision du propriétaire, 2026-08-20).
  C'est **+14 708 o** sur une page qui contient du code, assumés : le cours ancre des annotations *à
  la ligne* et oppose des paires vulnérable/corrigé où l'alignement vertical porte du sens. Une pile
  système rendait le même extrait en Consolas chez l'un et en SF Mono chez l'autre — deux chasses,
  deux découpes de lignes longues, deux lectures d'une même figure.

## Préchargement — deux fichiers, pas cinq

`src/index.html` ne précharge que **Inter `latin`** et **IBM Plex Mono 700 `latin`** : les seuls que
le premier écran touche à coup sûr. IBM Plex Mono 400 (code, plus bas dans la page), Silkscreen et
Press Start 2P (emplois rares) ne le sont **pas** — `preload` est prioritaire, et précharger une
police dont le premier écran n'a pas besoin vole de la bande passante au contenu. `crossorigin` reste
**obligatoire** même en même origine : une police est toujours récupérée en mode CORS, et sans cet
attribut le fichier est téléchargé **deux fois**.

## Noms versionnés — obligatoire, pas cosmétique

`public/**` est copié dans l'artéfact **sans empreinte de contenu**, alors que
`staticwebapp.config.source.json` sert les `.woff2` en `Cache-Control: immutable` pendant **un an**.
Un fichier remplacé sous le même nom resterait donc en cache chez les lecteurs jusqu'en 2027. La
version du fournisseur (`v20`, `v16`, `v6`) est portée par le **nom** : la changer, c'est changer
l'URL.

Trois endroits pointent ces noms et doivent bouger **ensemble** : `src/styles/_polices.scss` ·
`src/index.html` (les deux `<link rel="preload">`) · `public/polices/PROVENANCE.md`.

## Couverture mesurée, et écarts assumés

Vérifiés, pas supposés — le gate `tools/design/verifier-glyphes.mjs` ouvre les `.woff2` et lit leur
table `cmap` à chaque exécution. Relevé du **2026-08-20** : **4 familles · 10 fichiers · 40
caractères exigés · 160 vérifications · 40/40 pour chacune des quatre familles.**

⚠️ **Une réputation ne remplace pas une mesure.** `direction-visuelle.md` affirmait que « les polices
pixel couvrent notoirement mal le français ». C'est **faux pour les deux retenues** : Silkscreen et
Press Start 2P portent `œ Œ « » ’` et U+00A0 comme les autres. L'exigence qui accompagnait cette
crainte — *aucune police n'entre sans passer le gate D'ABORD* — reste entière, et c'est elle qui a
permis de le savoir.

- **U+202F, espace fine insécable — absente des QUATRE familles.** La typographie française la veut
  avant `; : ! ?` et à l'intérieur des guillemets `« »`, mais le fournisseur ne la livre dans aucun
  de ses sous-ensembles, et tailler un sous-ensemble maison est exclu (il casserait `œ`, `« »` et
  `’` en silence, c'est précisément le risque que ST1-B devait fermer).
  **→ Consigne de rédaction, INCHANGÉE : le contenu emploie U+00A0**, seule blanche insécable
  réellement couverte par les quatre familles. **U+2009 n'est pas une issue** : mesuré le
  2026-08-20, **seule Inter la porte** — ni IBM Plex Mono, ni Silkscreen, ni Press Start 2P — donc
  corps, titres et code ne s'espaceraient pas pareil.
- **U+2192 (`→`) — hors du sous-ensemble latin**, qui ne retient que U+2191 et U+2193. Sans
  conséquence : les flèches du cours vivent dans les diagrammes Mermaid, qui portent leur propre
  rendu. Une flèche isolée en pleine prose tomberait sur la police de repli — c'est un symbole, pas
  une lettre.

Le gate **échoue** si l'un de ces deux caractères devenait couvert : la consigne de rédaction
ci-dessus serait alors fausse, et doit être corrigée plutôt que dériver en silence.

## Le rôle FERMÉ de Press Start 2P

Trois emplois, décidés par le propriétaire, et **tenus par un test** —
`src/styles/police-jalon.spec.ts`, liste blanche nominative `(fichier, sélecteur)` :

1. le numéro de module dans la pastille du cartouche de leçon ;
2. le verdict d'un quiz réussi ;
3. le code d'erreur de la page 404.

Chaque emploi doit porter un `line-height` ≥ **1.5** (WCAG 1.4.12 — le lecteur peut imposer son
interlignage) et une taille explicitement réduite : la chasse de Press Start 2P vaut ~2× celle d'IBM
Plex Mono. **Jamais en prose.** Élargir ce rôle est une décision du propriétaire, pas une ligne
ajoutée à la liste blanche.

## Refaire l'opération (mise à jour de version, ou ajout d'une graisse)

La procédure complète — requête au fournisseur avec agent utilisateur moderne, relevé des
`unicode-range`, nommage versionné, empreintes — vit dans
[`public/polices/PROVENANCE.md`](../../public/polices/PROVENANCE.md), au contact des fichiers
qu'elle décrit. Deux points ne s'y trouvent pas et valent d'être rappelés ici :

- **Recopier les `unicode-range` verbatim** dans `src/styles/_polices.scss`. **Ne jamais les
  retailler à la main** — c'est ce qui casse `œ`, `« »` et `’` en silence, au milieu d'un mot.
- Passer le gate — c'est lui qui fait foi, pas la lecture du diff :

   ```powershell
   npm run design:glyphes
   ```
