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

## Thème Clair — « papier ivoire »

| Premier plan | Fond | Usage | Seuil | Ratio | Verdict |
|---|---|---|---|---|---|
| `--couleur-encre`<br>`#1c2433` | `--couleur-surface`<br>`#f7f4ec` | Corps de texte sur la page | 4.5:1 | **14.15:1** | ✅ AAA |
| `--couleur-encre`<br>`#1c2433` | `--couleur-surface-creuse`<br>`#eee8da` | Corps de texte dans un encart | 4.5:1 | **12.73:1** | ✅ AAA |
| `--couleur-encre`<br>`#1c2433` | `--couleur-surface-elevee`<br>`#fffdf7` | Corps de texte sur un feuillet | 4.5:1 | **15.29:1** | ✅ AAA |
| `--couleur-encre-secondaire`<br>`#39435a` | `--couleur-surface`<br>`#f7f4ec` | Texte secondaire (chapô, intertitre) | 4.5:1 | **8.99:1** | ✅ AA |
| `--couleur-encre-secondaire`<br>`#39435a` | `--couleur-surface-creuse`<br>`#eee8da` | Texte secondaire dans un encart | 4.5:1 | **8.09:1** | ✅ AA |
| `--couleur-encre-tertiaire`<br>`#4e586e` | `--couleur-surface`<br>`#f7f4ec` | Légende, méta, note de bas de page | 4.5:1 | **6.48:1** | ✅ AA |
| `--couleur-encre-tertiaire`<br>`#4e586e` | `--couleur-surface-creuse`<br>`#eee8da` | Légende dans un encart | 4.5:1 | **5.83:1** | ✅ AA |
| `--couleur-encre-filigrane`<br>`#6d778c` | `--couleur-surface`<br>`#f7f4ec` | Numéro de module en filigrane (≥ 31.25 px) | 3:1 | **4.09:1** | ✅ AA |
| `--couleur-encre-filigrane`<br>`#6d778c` | `--couleur-surface-creuse`<br>`#eee8da` | Numéro de module en filigrane sur encart | 3:1 | **3.68:1** | ✅ AA |
| `--couleur-accent`<br>`#10508f` | `--couleur-surface`<br>`#f7f4ec` | Lien dans le corps de texte | 4.5:1 | **7.44:1** | ✅ AA |
| `--couleur-accent`<br>`#10508f` | `--couleur-surface-creuse`<br>`#eee8da` | Lien dans un encart | 4.5:1 | **6.69:1** | ✅ AA |
| `--couleur-accent-survol`<br>`#0a3c6d` | `--couleur-surface`<br>`#f7f4ec` | Lien survolé | 4.5:1 | **10.16:1** | ✅ AA |
| `--couleur-sur-accent`<br>`#fffdf7` | `--couleur-accent`<br>`#10508f` | Libellé d’un bouton plein | 4.5:1 | **8.04:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#a02020` | `--couleur-surface`<br>`#f7f4ec` | Étiquette « vulnérable » sur la page | 4.5:1 | **7.01:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#a02020` | `--couleur-danger-vuln-surface`<br>`#fbeeeb` | Texte d’un bloc de code vulnérable | 4.5:1 | **6.80:1** | ✅ AA |
| `--couleur-encre`<br>`#1c2433` | `--couleur-danger-vuln-surface`<br>`#fbeeeb` | Commentaire dans un bloc vulnérable | 4.5:1 | **13.73:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#1a6444` | `--couleur-surface`<br>`#f7f4ec` | Étiquette « corrigé » sur la page | 4.5:1 | **6.47:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#1a6444` | `--couleur-ok-corrige-surface`<br>`#e8f2ea` | Texte d’un bloc de code corrigé | 4.5:1 | **6.20:1** | ✅ AA |
| `--couleur-encre`<br>`#1c2433` | `--couleur-ok-corrige-surface`<br>`#e8f2ea` | Commentaire dans un bloc corrigé | 4.5:1 | **13.57:1** | ✅ AA |
| `--couleur-attention`<br>`#7d5203` | `--couleur-surface`<br>`#f7f4ec` | Étiquette « cours vs état de l’art » | 4.5:1 | **6.20:1** | ✅ AA |
| `--couleur-attention`<br>`#7d5203` | `--couleur-attention-surface`<br>`#f7efdb` | Texte d’un encadré d’avertissement | 4.5:1 | **5.94:1** | ✅ AA |
| `--couleur-encre`<br>`#1c2433` | `--couleur-attention-surface`<br>`#f7efdb` | Corps d’un encadré d’avertissement | 4.5:1 | **13.57:1** | ✅ AA |
| `--couleur-provenance-cours`<br>`#10508f` | `--couleur-provenance-cours-surface`<br>`#eee8da` | Titre / étiquette d’un encadré « au programme du cours » | 4.5:1 | **6.69:1** | ✅ AA |
| `--couleur-encre`<br>`#1c2433` | `--couleur-provenance-cours-surface`<br>`#eee8da` | Corps d’un encadré « au programme du cours » | 4.5:1 | **12.73:1** | ✅ AA |
| `--couleur-provenance-complement`<br>`#4e586e` | `--couleur-provenance-complement-surface`<br>`#fffdf7` | Titre / étiquette d’un encadré « complément hors cours » | 4.5:1 | **7.01:1** | ✅ AA |
| `--couleur-encre`<br>`#1c2433` | `--couleur-provenance-complement-surface`<br>`#fffdf7` | Corps d’un encadré « complément hors cours » | 4.5:1 | **15.29:1** | ✅ AA |
| `--couleur-attention`<br>`#7d5203` | `--couleur-surface`<br>`#f7f4ec` | Filet / cadre d’un encadré d’avertissement ou de correction, sur la page | 3:1 | **6.20:1** | ✅ AA |
| `--couleur-provenance-cours`<br>`#10508f` | `--couleur-surface`<br>`#f7f4ec` | Cadre d’un encadré « au programme du cours » sur la page | 3:1 | **7.44:1** | ✅ AA |
| `--couleur-provenance-complement`<br>`#4e586e` | `--couleur-surface`<br>`#f7f4ec` | Filet d’un encadré « complément hors cours » sur la page | 3:1 | **6.48:1** | ✅ AA |
| `--couleur-code-encre`<br>`#1c2433` | `--couleur-code-surface`<br>`#eee8da` | Code source (bloc et incise) | 4.5:1 | **12.73:1** | ✅ AA |
| `--couleur-selection-encre`<br>`#141a24` | `--couleur-selection-fond`<br>`#f6e08a` | Texte sélectionné à la souris | 4.5:1 | **13.25:1** | ✅ AA |
| `--couleur-filet`<br>`#877f6e` | `--couleur-surface`<br>`#f7f4ec` | Bordure d’encart / séparateur sur la page | 3:1 | **3.61:1** | ✅ AA |
| `--couleur-filet`<br>`#877f6e` | `--couleur-surface-creuse`<br>`#eee8da` | Bordure interne d’un encart | 3:1 | **3.24:1** | ✅ AA |
| `--couleur-filet-fort`<br>`#6f6858` | `--couleur-surface`<br>`#f7f4ec` | Bordure appuyée (champ de saisie, tableau) | 3:1 | **5.03:1** | ✅ AA |
| `--couleur-filet-fort`<br>`#6f6858` | `--couleur-surface-creuse`<br>`#eee8da` | Bordure appuyée dans un encart | 3:1 | **4.52:1** | ✅ AA |
| `--couleur-focus`<br>`#10508f` | `--couleur-surface`<br>`#f7f4ec` | Anneau de focus sur la page (2.4.7 / 1.4.11) | 3:1 | **7.44:1** | ✅ AA |
| `--couleur-focus`<br>`#10508f` | `--couleur-surface-creuse`<br>`#eee8da` | Anneau de focus dans un encart | 3:1 | **6.69:1** | ✅ AA |
| `--couleur-focus`<br>`#10508f` | `--couleur-surface-elevee`<br>`#fffdf7` | Anneau de focus sur un feuillet | 3:1 | **8.04:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#a02020` | `--couleur-surface-creuse`<br>`#eee8da` | Tampon « vulnérable » et trait de marque dans un encart | 4.5:1 | **6.31:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#1a6444` | `--couleur-surface-creuse`<br>`#eee8da` | Tampon « corrigé » et trait de marque dans un encart | 4.5:1 | **5.82:1** | ✅ AA |

Ratio le plus bas du thème : **3.24:1** (`--couleur-filet` sur `--couleur-surface-creuse`).

## Thème Sombre — « ardoise encrée »

| Premier plan | Fond | Usage | Seuil | Ratio | Verdict |
|---|---|---|---|---|---|
| `--couleur-encre`<br>`#ece8dd` | `--couleur-surface`<br>`#171c25` | Corps de texte sur la page | 4.5:1 | **13.95:1** | ✅ AAA |
| `--couleur-encre`<br>`#ece8dd` | `--couleur-surface-creuse`<br>`#1f2531` | Corps de texte dans un encart | 4.5:1 | **12.54:1** | ✅ AAA |
| `--couleur-encre`<br>`#ece8dd` | `--couleur-surface-elevee`<br>`#262e3c` | Corps de texte sur un feuillet | 4.5:1 | **11.14:1** | ✅ AAA |
| `--couleur-encre-secondaire`<br>`#c3cad7` | `--couleur-surface`<br>`#171c25` | Texte secondaire (chapô, intertitre) | 4.5:1 | **10.37:1** | ✅ AA |
| `--couleur-encre-secondaire`<br>`#c3cad7` | `--couleur-surface-creuse`<br>`#1f2531` | Texte secondaire dans un encart | 4.5:1 | **9.32:1** | ✅ AA |
| `--couleur-encre-tertiaire`<br>`#a3abbb` | `--couleur-surface`<br>`#171c25` | Légende, méta, note de bas de page | 4.5:1 | **7.40:1** | ✅ AA |
| `--couleur-encre-tertiaire`<br>`#a3abbb` | `--couleur-surface-creuse`<br>`#1f2531` | Légende dans un encart | 4.5:1 | **6.65:1** | ✅ AA |
| `--couleur-encre-filigrane`<br>`#7b8598` | `--couleur-surface`<br>`#171c25` | Numéro de module en filigrane (≥ 31.25 px) | 3:1 | **4.59:1** | ✅ AA |
| `--couleur-encre-filigrane`<br>`#7b8598` | `--couleur-surface-creuse`<br>`#1f2531` | Numéro de module en filigrane sur encart | 3:1 | **4.13:1** | ✅ AA |
| `--couleur-accent`<br>`#94bdf0` | `--couleur-surface`<br>`#171c25` | Lien dans le corps de texte | 4.5:1 | **8.78:1** | ✅ AA |
| `--couleur-accent`<br>`#94bdf0` | `--couleur-surface-creuse`<br>`#1f2531` | Lien dans un encart | 4.5:1 | **7.89:1** | ✅ AA |
| `--couleur-accent-survol`<br>`#b9d5f7` | `--couleur-surface`<br>`#171c25` | Lien survolé | 4.5:1 | **11.32:1** | ✅ AA |
| `--couleur-sur-accent`<br>`#11151c` | `--couleur-accent`<br>`#94bdf0` | Libellé d’un bouton plein | 4.5:1 | **9.40:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#f19a92` | `--couleur-surface`<br>`#171c25` | Étiquette « vulnérable » sur la page | 4.5:1 | **7.95:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#f19a92` | `--couleur-danger-vuln-surface`<br>`#3a2020` | Texte d’un bloc de code vulnérable | 4.5:1 | **6.94:1** | ✅ AA |
| `--couleur-encre`<br>`#ece8dd` | `--couleur-danger-vuln-surface`<br>`#3a2020` | Commentaire dans un bloc vulnérable | 4.5:1 | **12.18:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#74c69a` | `--couleur-surface`<br>`#171c25` | Étiquette « corrigé » sur la page | 4.5:1 | **8.36:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#74c69a` | `--couleur-ok-corrige-surface`<br>`#17301f` | Texte d’un bloc de code corrigé | 4.5:1 | **6.95:1** | ✅ AA |
| `--couleur-encre`<br>`#ece8dd` | `--couleur-ok-corrige-surface`<br>`#17301f` | Commentaire dans un bloc corrigé | 4.5:1 | **11.59:1** | ✅ AA |
| `--couleur-attention`<br>`#dcb063` | `--couleur-surface`<br>`#171c25` | Étiquette « cours vs état de l’art » | 4.5:1 | **8.48:1** | ✅ AA |
| `--couleur-attention`<br>`#dcb063` | `--couleur-attention-surface`<br>`#33280f` | Texte d’un encadré d’avertissement | 4.5:1 | **7.18:1** | ✅ AA |
| `--couleur-encre`<br>`#ece8dd` | `--couleur-attention-surface`<br>`#33280f` | Corps d’un encadré d’avertissement | 4.5:1 | **11.82:1** | ✅ AA |
| `--couleur-provenance-cours`<br>`#94bdf0` | `--couleur-provenance-cours-surface`<br>`#1f2531` | Titre / étiquette d’un encadré « au programme du cours » | 4.5:1 | **7.89:1** | ✅ AA |
| `--couleur-encre`<br>`#ece8dd` | `--couleur-provenance-cours-surface`<br>`#1f2531` | Corps d’un encadré « au programme du cours » | 4.5:1 | **12.54:1** | ✅ AA |
| `--couleur-provenance-complement`<br>`#a3abbb` | `--couleur-provenance-complement-surface`<br>`#262e3c` | Titre / étiquette d’un encadré « complément hors cours » | 4.5:1 | **5.91:1** | ✅ AA |
| `--couleur-encre`<br>`#ece8dd` | `--couleur-provenance-complement-surface`<br>`#262e3c` | Corps d’un encadré « complément hors cours » | 4.5:1 | **11.14:1** | ✅ AA |
| `--couleur-attention`<br>`#dcb063` | `--couleur-surface`<br>`#171c25` | Filet / cadre d’un encadré d’avertissement ou de correction, sur la page | 3:1 | **8.48:1** | ✅ AA |
| `--couleur-provenance-cours`<br>`#94bdf0` | `--couleur-surface`<br>`#171c25` | Cadre d’un encadré « au programme du cours » sur la page | 3:1 | **8.78:1** | ✅ AA |
| `--couleur-provenance-complement`<br>`#a3abbb` | `--couleur-surface`<br>`#171c25` | Filet d’un encadré « complément hors cours » sur la page | 3:1 | **7.40:1** | ✅ AA |
| `--couleur-code-encre`<br>`#ece8dd` | `--couleur-code-surface`<br>`#11151c` | Code source (bloc et incise) | 4.5:1 | **14.94:1** | ✅ AA |
| `--couleur-selection-encre`<br>`#ece8dd` | `--couleur-selection-fond`<br>`#4a4324` | Texte sélectionné à la souris | 4.5:1 | **8.09:1** | ✅ AA |
| `--couleur-filet`<br>`#6a778d` | `--couleur-surface`<br>`#171c25` | Bordure d’encart / séparateur sur la page | 3:1 | **3.77:1** | ✅ AA |
| `--couleur-filet`<br>`#6a778d` | `--couleur-surface-creuse`<br>`#1f2531` | Bordure interne d’un encart | 3:1 | **3.39:1** | ✅ AA |
| `--couleur-filet-fort`<br>`#8d97a8` | `--couleur-surface`<br>`#171c25` | Bordure appuyée (champ de saisie, tableau) | 3:1 | **5.79:1** | ✅ AA |
| `--couleur-filet-fort`<br>`#8d97a8` | `--couleur-surface-creuse`<br>`#1f2531` | Bordure appuyée dans un encart | 3:1 | **5.21:1** | ✅ AA |
| `--couleur-focus`<br>`#94bdf0` | `--couleur-surface`<br>`#171c25` | Anneau de focus sur la page (2.4.7 / 1.4.11) | 3:1 | **8.78:1** | ✅ AA |
| `--couleur-focus`<br>`#94bdf0` | `--couleur-surface-creuse`<br>`#1f2531` | Anneau de focus dans un encart | 3:1 | **7.89:1** | ✅ AA |
| `--couleur-focus`<br>`#94bdf0` | `--couleur-surface-elevee`<br>`#262e3c` | Anneau de focus sur un feuillet | 3:1 | **7.01:1** | ✅ AA |
| `--couleur-danger-vuln`<br>`#f19a92` | `--couleur-surface-creuse`<br>`#1f2531` | Tampon « vulnérable » et trait de marque dans un encart | 4.5:1 | **7.15:1** | ✅ AA |
| `--couleur-ok-corrige`<br>`#74c69a` | `--couleur-surface-creuse`<br>`#1f2531` | Tampon « corrigé » et trait de marque dans un encart | 4.5:1 | **7.52:1** | ✅ AA |

Ratio le plus bas du thème : **3.39:1** (`--couleur-filet` sur `--couleur-surface-creuse`).

## Jetons exemptés de mesure

| Jeton | Justification |
|---|---|
| `--couleur-reglure` | Décor pur (règlure de carnet). Ne porte aucune information et n’est pas un composant d’interface : hors champ de 1.4.11, qui exempte explicitement le décoratif. Elle est d’ailleurs masquée en `forced-colors: active` (mixin `reglure`). |

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
- Le critère **1.4.12** (espacement du texte) et **1.4.4** (zoom 200 %), qui relèvent des
  échelles typographiques, pas des couleurs.

