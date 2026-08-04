# Polices auto-hébergées — provenance et procédure

> Fichiers versés au dépôt le **2026-08-04** (E1-ST1 · ST1-B). Ce document existe pour qu'on puisse
> **refaire** l'opération et **vérifier** que rien n'a bougé, sans avoir à se souvenir de quoi que ce
> soit. Les commentaires de `src/styles/_polices.scss` disent *pourquoi* ; ce fichier dit *d'où*.

## Pourquoi ces fichiers sont dans le dépôt

La CSP du site est `font-src 'self'` (`config/staticwebapp.config.source.json`) : **aucun hôte
externe n'est joignable**, par construction. Ce n'est pas une contrainte subie — un cours qui
enseigne la sécurité des applications web ne peut pas appeler un CDN tiers pour ses polices. Effet
de bord voulu : aucune adresse IP de lecteur n'est transmise à Google au chargement d'une page.

## Licences

Les deux familles sont sous **SIL Open Font License 1.1**, qui autorise explicitement
l'auto-hébergement et la redistribution. Textes intégraux versés à côté des fichiers, dans `public/polices/` :

| Famille | Licence | Auteurs |
|---|---|---|
| Fraunces | [`public/polices/LICENCE-fraunces-OFL.txt`](../../public/polices/LICENCE-fraunces-OFL.txt) | The Fraunces Project Authors |
| Inter | [`public/polices/LICENCE-inter-OFL.txt`](../../public/polices/LICENCE-inter-OFL.txt) | The Inter Project Authors |

L'OFL impose de conserver l'avis de droit d'auteur et interdit de vendre les fichiers seuls — les
deux sont respectés. Elle interdit aussi d'employer les **noms réservés** ; nous ne renommons ni ne
modifions les fontes, nous les servons telles quelles.

## Ce qui est livré

| Fichier | Taille | SHA-256 |
|---|---|---|
| `fraunces-700-latin-v38.woff2` | 35 512 o | `3f3e815263760b8a9c9d149a0cdfd69d05744a15829a6079fdb57480b50e4c51` |
| `fraunces-700-latin-ext-v38.woff2` | 32 304 o | `65499769ebe7e20e95b2a15d6e7ae609837b347d7a916e677582a1d79f030af5` |
| `inter-latin-v20.woff2` | 48 256 o | `3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62` |
| `inter-latin-ext-v20.woff2` | 85 068 o | `34b9c504cab7a73e37b746343a449132e56cf7b5481af2cb81dc74dcff25c956` |

**196,4 Kio au total**, mais une page française n'en télécharge que les deux `latin` — **83 Kio** :
les `latin-ext` ne sont récupérés que si un caractère de leur `unicode-range` apparaît réellement.

### Deux choix chiffrés, pas devinés

- **Inter : un seul fichier par sous-ensemble.** Demander `wght@400` puis `wght@700` au fournisseur
  renvoie deux URL différentes mais des octets **rigoureusement identiques** (même SHA-256, même
  taille) : Inter est servie en police **variable**. Livrer les deux graisses aurait ajouté **133 Kio
  de doublon pur**. D'où `font-weight: 100 900` dans `_polices.scss` — c'est l'intervalle réellement
  porté par le fichier.
- **Fraunces : graisse 700 fixe.** La graisse variable `100..900` pèse **67 304 o** contre
  **35 512 o** en 700 fixe sur le seul sous-ensemble latin, soit **+32 Ko** pour des graisses
  qu'aucun jeton du design system n'utilise (`$graisse-titre: 700` est la seule déclarée). L'axe
  `opsz` (9→144) reste variable dans le fichier retenu : le dessin s'adapte encore à la taille.

## Noms versionnés — obligatoire, pas cosmétique

`public/**` est copié dans l'artéfact **sans empreinte de contenu**, alors que
`staticwebapp.config.source.json` sert les `.woff2` en `Cache-Control: immutable` pendant **un an**.
Un fichier remplacé sous le même nom resterait donc en cache chez les lecteurs jusqu'en 2027. La
version du fournisseur (`v20`, `v38`) est portée par le **nom** : la changer, c'est changer l'URL.

Trois endroits pointent ces noms et doivent bouger **ensemble** :
`src/styles/_polices.scss` · `src/index.html` (les deux `<link rel="preload">`) · ce fichier.

## Écarts de couverture assumés

Vérifiés, pas supposés — le gate `tools/design/verifier-glyphes.mjs` ouvre les `.woff2` et lit leur
table `cmap` à chaque exécution.

- **U+202F, espace fine insécable — absente des deux familles.** La typographie française la veut
  avant `; : ! ?` et à l'intérieur des guillemets `« »`, mais le fournisseur ne la livre dans aucun
  de ses sous-ensembles, et tailler un sous-ensemble maison est exclu (il casserait `œ`, `« »` et
  `’` en silence, c'est précisément le risque que ST1-B devait fermer).
  **→ Consigne de rédaction : le contenu emploie U+00A0**, seule blanche insécable réellement
  couverte par les deux familles. U+2009 n'est pas une issue : Inter la porte, Fraunces non — titres
  et corps ne s'espaceraient pas pareil.
- **U+2192 (`→`) — hors du sous-ensemble latin**, qui ne retient que U+2191 et U+2193. Sans
  conséquence : les flèches du cours vivent dans les diagrammes Mermaid, qui portent leur propre
  rendu. Une flèche isolée en pleine prose tomberait sur la police de repli — c'est un symbole, pas
  une lettre.

Le gate **échoue** si l'un de ces deux caractères devenait couvert : la consigne de rédaction
ci-dessus serait alors fausse, et doit être corrigée plutôt que dériver en silence.

## Refaire l'opération (mise à jour de version, ou ajout d'une graisse)

Commandes **PowerShell**, à exécuter depuis `public/polices/` sauf mention contraire.

1. Demander au fournisseur la feuille de style, **avec un agent utilisateur moderne** — sans lui,
   l'API renvoie du `ttf` au lieu du `woff2` :

   ```powershell
   $ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
   $req = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,700&family=Inter:wght@100..900&display=swap'
   Invoke-WebRequest -Uri $req -Headers @{ 'User-Agent' = $ua } -OutFile polices.css
   ```

2. Dans `polices.css`, ne garder que les blocs commentés `/* latin */` et `/* latin-ext */`.
   Y relever, pour chaque bloc : l'URL du `.woff2`, le numéro de version (`/v38/`, `/v20/` dans le
   chemin) et le `unicode-range`.

3. Télécharger chaque `.woff2` sous le nom versionné
   `<famille>[-<graisse>]-<sous-ensemble>-v<N>.woff2` dans ce dossier. La graisse ne figure au nom
   que si elle est **fixe** (Fraunces) ; une police variable n'en porte pas (Inter).

4. **Recopier les `unicode-range` verbatim** dans `src/styles/_polices.scss`. Ne jamais les retailler
   à la main.

5. Mettre à jour les deux `<link rel="preload">` de `src/index.html` et le tableau de ce fichier
   (empreintes comprises) :

   ```powershell
   Get-FileHash -Algorithm SHA256 *.woff2 | Format-List Path, Hash
   ```

6. Passer le gate — c'est lui qui fait foi, pas la lecture du diff :

   ```powershell
   npm run design:glyphes
   ```
