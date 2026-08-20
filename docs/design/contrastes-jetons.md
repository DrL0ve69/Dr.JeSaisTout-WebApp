# Table des contrastes des jetons sémantiques

> **Fichier généré — ne pas modifier à la main.**
> Produit par `tools/design/verifier-contrastes.mjs` (`npm run design:contrastes`).
> Toute modification manuelle est écrasée à la prochaine passe, et
> `npm run design:contrastes:check` (gate **G-contraste** en CI) échoue si la version
> commitée diverge de ce que le script régénère. La date de dernière mise à jour est
> celle du commit : la sortie est **déterministe**, sans horodatage.
>
> Le contraste est une propriété de **paires**, pas de jetons : la table des paires
> autorisées vit en tête du script et fait foi. Une paire absente de cette table est une
> combinaison **non autorisée** — l’ajouter au script avant de l’employer dans un composant.
>
> Méthode : luminance relative **WCAG 2** (pas d’APCA — non normatif). Ratios arrondis
> **vers le bas** au centième, pour qu’un 4,4999 ne s’affiche jamais « 4,50 ».

## Seuils appliqués

| Seuil | Minimum | Critère |
|---|---|---|
| `texte-normal` | 4.5:1 | WCAG 1.4.3 AA — texte normal |
| `grand-texte` | 3:1 | WCAG 1.4.3 AA — grand texte (≥ 24 px, ou ≥ 18.66 px gras) |
| `non-texte` | 3:1 | WCAG 1.4.11 AA — composant d’interface ou objet graphique |

Cible haute informative : **7:1 (AAA)** sur le corps de texte — signalée, non bloquante.

## Thème Sombre — « Moniteur ambre »

| Premier plan | Fond | Usage | Seuil | Ratio | Verdict |
|---|---|---|---|---|---|
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-surface`<br>`#06080a` | Corps de texte sur la page | 4.5:1 | **15.16:1** | ✅ AAA |
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-surface-creuse`<br>`#0b1114` | Corps de texte dans un encart | 4.5:1 | **14.37:1** | ✅ AAA |
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-surface-elevee`<br>`#0f1619` | Corps de texte sur un feuillet | 4.5:1 | **13.81:1** | ✅ AAA |
| `--couleur-encre-secondaire`<br>`#b3c4cb` | `--couleur-surface`<br>`#06080a` | Texte secondaire (chapô, intertitre) | 4.5:1 | **11.15:1** | ✅ AA |
| `--couleur-encre-secondaire`<br>`#b3c4cb` | `--couleur-surface-creuse`<br>`#0b1114` | Texte secondaire dans un encart | 4.5:1 | **10.57:1** | ✅ AA |
| `--couleur-encre-tertiaire`<br>`#8ca1aa` | `--couleur-surface`<br>`#06080a` | Légende, méta, note de bas de page | 4.5:1 | **7.44:1** | ✅ AA |
| `--couleur-encre-tertiaire`<br>`#8ca1aa` | `--couleur-surface-creuse`<br>`#0b1114` | Légende dans un encart | 4.5:1 | **7.05:1** | ✅ AA |
| `--couleur-encre-filigrane`<br>`#63757d` | `--couleur-surface`<br>`#06080a` | Numéro de module en filigrane (≥ 31.25 px) | 3:1 | **4.17:1** | ✅ AA |
| `--couleur-encre-filigrane`<br>`#63757d` | `--couleur-surface-creuse`<br>`#0b1114` | Numéro de module en filigrane sur encart | 3:1 | **3.95:1** | ✅ AA |
| `--couleur-accent`<br>`#ffb454` | `--couleur-surface`<br>`#06080a` | Lien dans le corps de texte | 4.5:1 | **11.37:1** | ✅ AA |
| `--couleur-accent`<br>`#ffb454` | `--couleur-surface-creuse`<br>`#0b1114` | Lien dans un encart | 4.5:1 | **10.78:1** | ✅ AA |
| `--couleur-accent-survol`<br>`#ffc97e` | `--couleur-surface`<br>`#06080a` | Lien survolé | 4.5:1 | **13.28:1** | ✅ AA |
| `--couleur-sur-accent`<br>`#06080a` | `--couleur-accent`<br>`#ffb454` | Libellé d’un bouton plein | 4.5:1 | **11.37:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#ff5c57` | `--couleur-surface`<br>`#06080a` | Étiquette « vulnérable » sur la page | 4.5:1 | **6.61:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#ff5c57` | `--couleur-danger-vuln-surface`<br>`#2a0e0d` | Texte d’un bloc de code vulnérable | 4.5:1 | **5.92:1** | ✅ AA |
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-danger-vuln-surface`<br>`#2a0e0d` | Commentaire dans un bloc vulnérable | 4.5:1 | **13.60:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#4ade80` | `--couleur-surface`<br>`#06080a` | Étiquette « corrigé » sur la page | 4.5:1 | **11.51:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#4ade80` | `--couleur-ok-corrige-surface`<br>`#0d2417` | Texte d’un bloc de code corrigé | 4.5:1 | **9.40:1** | ✅ AA |
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-ok-corrige-surface`<br>`#0d2417` | Commentaire dans un bloc corrigé | 4.5:1 | **12.38:1** | ✅ AA |
| `--couleur-attention`<br>`#ffb454` | `--couleur-surface`<br>`#06080a` | Étiquette « cours vs état de l’art » | 4.5:1 | **11.37:1** | ✅ AA |
| `--couleur-attention`<br>`#ffb454` | `--couleur-attention-surface`<br>`#2a1c08` | Texte d’un encadré d’avertissement | 4.5:1 | **9.39:1** | ✅ AA |
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-attention-surface`<br>`#2a1c08` | Corps d’un encadré d’avertissement | 4.5:1 | **12.52:1** | ✅ AA |
| `--couleur-provenance-cours`<br>`#5bc8e8` | `--couleur-provenance-cours-surface`<br>`#0a1e26` | Titre / étiquette d’un encadré « au programme du cours » | 4.5:1 | **8.86:1** | ✅ AA |
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-provenance-cours-surface`<br>`#0a1e26` | Corps d’un encadré « au programme du cours » | 4.5:1 | **12.94:1** | ✅ AA |
| `--couleur-provenance-complement`<br>`#8ca1aa` | `--couleur-provenance-complement-surface`<br>`#0f1619` | Titre / étiquette d’un encadré « complément hors cours » | 4.5:1 | **6.78:1** | ✅ AA |
| `--couleur-encre`<br>`#d6e2e6` | `--couleur-provenance-complement-surface`<br>`#0f1619` | Corps d’un encadré « complément hors cours » | 4.5:1 | **13.81:1** | ✅ AA |
| `--couleur-attention`<br>`#ffb454` | `--couleur-surface`<br>`#06080a` | Filet / cadre d’un encadré d’avertissement ou de correction, sur la page | 3:1 | **11.37:1** | ✅ AA |
| `--couleur-provenance-cours`<br>`#5bc8e8` | `--couleur-surface`<br>`#06080a` | Cadre d’un encadré « au programme du cours » sur la page | 3:1 | **10.38:1** | ✅ AA |
| `--couleur-provenance-complement`<br>`#8ca1aa` | `--couleur-surface`<br>`#06080a` | Filet d’un encadré « complément hors cours » sur la page | 3:1 | **7.44:1** | ✅ AA |
| `--couleur-code-encre`<br>`#d6e2e6` | `--couleur-code-surface`<br>`#0b1114` | Code source (bloc et incise) | 4.5:1 | **14.37:1** | ✅ AA |
| `--couleur-selection-encre`<br>`#ffddae` | `--couleur-selection-fond`<br>`#4a3410` | Texte sélectionné à la souris | 4.5:1 | **9.05:1** | ✅ AA |
| `--couleur-filet`<br>`#5e6a70` | `--couleur-surface`<br>`#06080a` | Bordure d’encart / séparateur sur la page | 3:1 | **3.60:1** | ✅ AA |
| `--couleur-filet`<br>`#5e6a70` | `--couleur-surface-creuse`<br>`#0b1114` | Bordure interne d’un encart | 3:1 | **3.41:1** | ✅ AA |
| `--couleur-filet-fort`<br>`#8aa0a8` | `--couleur-surface`<br>`#06080a` | Bordure appuyée (champ de saisie, tableau) | 3:1 | **7.33:1** | ✅ AA |
| `--couleur-filet-fort`<br>`#8aa0a8` | `--couleur-surface-creuse`<br>`#0b1114` | Bordure appuyée dans un encart | 3:1 | **6.94:1** | ✅ AA |
| `--couleur-focus`<br>`#ffb454` | `--couleur-surface`<br>`#06080a` | Anneau de focus sur la page (2.4.7 / 1.4.11) | 3:1 | **11.37:1** | ✅ AA |
| `--couleur-focus`<br>`#ffb454` | `--couleur-surface-creuse`<br>`#0b1114` | Anneau de focus dans un encart | 3:1 | **10.78:1** | ✅ AA |
| `--couleur-focus`<br>`#ffb454` | `--couleur-surface-elevee`<br>`#0f1619` | Anneau de focus sur un feuillet | 3:1 | **10.36:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#ff5c57` | `--couleur-surface-creuse`<br>`#0b1114` | Tampon « vulnérable » et trait de marque dans un encart | 4.5:1 | **6.26:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#4ade80` | `--couleur-surface-creuse`<br>`#0b1114` | Tampon « corrigé » et trait de marque dans un encart | 4.5:1 | **10.91:1** | ✅ AA |

Ratio le plus bas du thème : **3.41:1** (`--couleur-filet` sur `--couleur-surface-creuse`).

## Jetons exemptés de mesure

| Jeton | Justification |
|---|---|
| `--couleur-reglure` | Décor pur (teinte des SCANLINES du moniteur — le jeton garde son nom d’origine, sa justification a changé avec la bascule E6, pas son rôle). Ne porte aucune information et n’est pas un composant d’interface : hors champ de 1.4.11, qui exempte explicitement le décoratif. Elle est d’ailleurs masquée en `forced-colors: active` (mixin `reglure`). |

Un jeton listé ici ne doit apparaître dans **aucune** paire ci-dessus : le gate refuse une
exemption redondante autant qu’une exemption obsolète.

## Échelles — typographie et espacement

Le contraste n’est pas la seule règle chiffrée du design system : ces deux échelles sont
mesurées par le même gate, et un palier hors règle le fait sortir en code 1.

### Typographie — ratio minimal exigé : **1.25** entre paliers consécutifs

| Palier | Valeur | px (base 16) | Ratio vs palier précédent |
|---|---|---|---|
| `$taille-xs` | `0.8rem` | 12.8 | — |
| `$taille-s` | `1rem` | 16 | 1.2500 |
| `$taille-m` | `1.25rem` | 20 | 1.2500 |
| `$taille-l` | `1.5625rem` | 25 | 1.2500 |
| `$taille-xl` | `1.9531rem` | 31.2496 | 1.2500 |
| `$taille-xxl` | `2.4414rem` | 39.0624 | 1.2500 |

### Espacement — tout palier est un multiple de **4 px** (grille 8pt)

| Palier | Valeur | px (base 16) |
|---|---|---|
| `$espace-0-5` | `0.25rem` | 4 |
| `$espace-1` | `0.5rem` | 8 |
| `$espace-2` | `1rem` | 16 |
| `$espace-3` | `1.5rem` | 24 |
| `$espace-4` | `2rem` | 32 |
| `$espace-6` | `3rem` | 48 |
| `$espace-8` | `4rem` | 64 |

## Ce que ce gate ne couvre pas

- Le contraste **réellement rendu** : un composant qui empilerait une opacité, une ombre
  ou un fond intermédiaire sortirait de cette mesure. C’est le rôle de **G-axe** (E1-ST2),
  qui teste les pages ; les deux gates sont complémentaires, aucun ne remplace l’autre.
- Les images et diagrammes (Mermaid, SVG de leçon) — hors jetons.
- Le DÉTAIL des **encres de coloration syntaxique** (`--shiki-dark`) : elles sont bel et bien
  mesurées par ce gate contre `--couleur-code-surface`, et une encre sous son seuil le fait
  sortir en **code 1** — mais elles ne sont pas tabulées ici. Elles viennent d’un fichier
  **généré et non versionné** (`src/styles/_coloration-syntaxique-generee.scss`, produit par
  `content:build`) dont le jeu de classes dépend du **contenu publié** : les tabuler rendrait
  ce rapport non déterministe, donc `--check` rouge sur un clone frais et à chaque leçon
  nouvelle. Le détail s’affiche sur la **console** du gate.
- Le critère **1.4.12** (espacement du texte) et **1.4.4** (zoom 200 %), qui relèvent des
  échelles typographiques, pas des couleurs.

