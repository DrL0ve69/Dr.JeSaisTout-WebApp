---
titre: "Banc de mesure — les grammaires HTML et JavaScript"
slug: langages-web
sujet: securite-web
ordre: 1
niveau: cegep                 # maternelle | primaire | secondaire | cegep | universite
duree-estimee: 5
objectifs:
  - "Forcer l'émission de toutes les encres de coloration des grammaires html et javascript"
  - "Servir de banc au garde-fou de contraste des encres de coloration"
  - "Documenter les constructions qui font naître une portée de coloration distincte"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-08-24
maj: 2026-08-24
statut: brouillon
---

# Banc de mesure — les grammaires HTML et JavaScript

## L'idée en une image

Une grammaire de coloration se comporte comme un jeu de surligneurs : chaque construction du
langage reçoit sa propre teinte. L'analogie casse ici : le surligneur humain n'invente pas de
couleur nouvelle, alors qu'une grammaire nouvelle en fait apparaître autant que de portées
qu'elle sait distinguer — et chacune est une paire de contraste à mesurer.

## Ce que ce banc exerce

Ce dossier n'est pas une leçon et ne prétend à aucune qualité pédagogique. Il existe pour que la
feuille de coloration générée porte toutes les classes des deux grammaires entrées au contrat le
2026-08-24, afin qu'un test puisse les mesurer avant qu'une leçon les emploie.

## Exemple simple

Le bloc JavaScript ci-dessous porte, à dessein, un commentaire de ligne, un commentaire de bloc,
une chaîne simple, une chaîne à gabarit, une expression régulière, des nombres, des mots-clefs,
un appel de méthode et une propriété d'objet.

```javascript
/* Commentaire de bloc : chaque construction ci-dessous vise une portée distincte. */
import { créerJeton } from './jetons.js';

const MOTIF_IDENTIFIANT = /^[a-z0-9]+(-[a-z0-9]+)*$/iu;
const LIMITE = 0x1f;
const SEUIL = 4.5;

export class RegistreDeLecons extends Map {
  #secret = null;

  constructor(source = 'defaut') {
    super();
    this.source = `registre:${source}`;
    this.#secret = Symbol('interne');
  }

  static async depuisReseau(url, { delai = 3_000 } = {}) {
    // Commentaire de ligne : l'attente est volontairement courte.
    const reponse = await fetch(url, { signal: AbortSignal.timeout(delai) });
    if (!reponse.ok) throw new Error(`échec HTTP ${reponse.status}`);
    return new RegistreDeLecons(await reponse.json());
  }

  ajouter(identifiant, valeur) {
    if (typeof identifiant !== 'string' || !MOTIF_IDENTIFIANT.test(identifiant)) {
      return false;
    }
    this.set(identifiant, valeur ?? { poids: LIMITE, ratio: SEUIL });
    return true;
  }
}

const registre = new RegistreDeLecons();
for (const [clef, valeur] of Object.entries({ a: 1, b: 2 })) {
  registre.ajouter(clef, valeur);
}
console.log(registre.size > 0 ? 'rempli' : 'vide');
```

## Exemple complet

Le bloc HTML ci-dessous imbrique une feuille de style et un script : la grammaire HTML de Shiki
délègue alors aux grammaires CSS et JavaScript, ce qui fait entrer d'un coup des portées que le
bloc précédent n'exerce pas.

```html
<!doctype html>
<!-- Commentaire HTML : le doctype et ce commentaire portent chacun leur portée. -->
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Banc de mesure &mdash; coloration</title>
    <style>
      /* Feuille imbriquée : sélecteurs, propriétés, unités, couleurs, requête média. */
      :root {
        --encre: #e1e4e8;
        --fond: #0b1114;
      }

      .lecon > p:first-child::after {
        content: '\2192';
        color: var(--encre);
        margin-block: 0.5rem 1.25em;
      }

      @media (prefers-reduced-motion: reduce) {
        .lecon {
          transition: none !important;
        }
      }
    </style>
  </head>
  <body class="lecon" data-sujet="securite-web">
    <h1 id="titre">Un titre</h1>
    <p>Un paragraphe avec une entit&eacute; et un <a href="/cours/">lien</a>.</p>
    <input type="text" name="recherche" value="42" disabled />
    <script type="module">
      const cible = document.querySelector('#titre');
      cible.textContent = `mis à jour à ${new Date().toISOString()}`;
      // Un puits DOM, montré ici uniquement pour exercer la portée « propriété ».
      cible.dataset.horodatage = String(Date.now());
    </script>
  </body>
</html>
```

## À toi de jouer

Le quiz de ce banc vit dans `quiz.json`, à côté de ce fichier.

[[quiz]]

## À retenir

- Une langue ajoutée au contrat fait naître des encres neuves, donc des paires de contraste neuves.
- La feuille générée n'émet que les classes du contenu compilé : ce qu'aucun fichier n'emploie
  n'est jamais mesuré.
- La grammaire HTML imbrique celles de CSS et de JavaScript.

## Aller plus loin

- `docs/contenu/pipeline-contenu.md` — le gabarit dont ce banc emprunte la forme.
- `src/coloration-encres-contraste.spec.ts` — le test qui compile ce dossier et mesure ses encres.
