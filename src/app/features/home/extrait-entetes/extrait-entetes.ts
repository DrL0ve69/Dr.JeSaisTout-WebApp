// =============================================================================
// ExtraitEntetes — la pièce à conviction de l'accueil
// -----------------------------------------------------------------------------
// LE PARTI PRIS DE LA PAGE, EN UN BLOC : ce site ne se vend pas, il DÉMONTRE
// qu'il s'applique le cours qu'il enseigne. La vedette de l'accueil est donc un
// extrait des en-têtes de sécurité réellement servis, annoté en marge, suivi de
// « vérifiez vous-même ». Elle rime avec E3-ST13 (« les en-têtes réels de CE site
// comme étude de cas ») et n'est dessinée qu'en TYPE ET FILETS : aucun dessin, donc
// aucun pari sur la qualité d'un SVG produit par un agent.
//
// ⚠️ LE TEXTE DE L'EXTRAIT EST EN DUR, ET C'EST UNE DÉRIVE ASSUMÉE POUR E1 (plan
// arrêté d'E1-ST3). Le générer au build depuis `config/staticwebapp.config.source.json`
// est du niveau E2 — c'est dit, pas promis. Ce qui EST promis en attendant :
// `extrait-entetes.spec.ts` relit ce fichier de configuration et exige que chaque
// ligne affichée y existe encore, en directive de CSP ou en nom d'en-tête. Le jour
// où la configuration change, le test rougit — le site ne peut pas se mettre à
// afficher une preuve périmée en silence.
//
// POURQUOI CES QUATRE LIGNES-LÀ. Ce sont les plus STABLES : aucune ne porte de
// jeton `__HACHAGES_*__` (contrairement à `script-src` et `style-src`, réécrites à
// chaque build), et le nom de l'en-tête HSTS est montré SANS sa valeur — figer un
// `max-age` dans une page serait promettre une durée qu'on changera.
//
// ⚠️ STRUCTURE IMPOSÉE (décision 3 du plan) : `<figure>` → `<pre><code>` +
// `<figcaption>`, `aria-label` sur la figure, et `overflow-x: auto` posé SUR LE
// `<pre>` — jamais sur un ancêtre, sans quoi c'est la PAGE entière qui déborderait
// à 360 px au lieu du seul bloc (WCAG 1.4.10). Cette dernière règle n'est pas qu'un
// commentaire : `extrait-entetes.spec.ts` compile la feuille du composant et
// vérifie que la seule règle portant un `overflow` s'applique bien au `<pre>` rendu.
//
// LES LIGNES SONT COURTES EXPRÈS (25 caractères au plus). À 360 px de large, le
// bloc ne défile donc PAS : une zone qui défile vraiment devrait devenir
// focalisable au clavier (règle axe `scrollable-region-focusable`, WCAG 2.1.1), ce
// qui ajouterait un second arrêt de tabulation à une page qui n'en veut qu'un.
// L'`overflow-x` reste le filet de sécurité pour un zoom extrême ou une future
// ligne plus longue — pas le mode de lecture normal.
//
// ⚠️ RÉDACTION : blanches insécables U+00A0 UNIQUEMENT, écrites `&nbsp;` pour
// qu'on les VOIE à la relecture (jamais U+202F ni U+2009, absentes de Fraunces
// comme d'Inter) — `.claude/rules/contenu-pedagogique.md` §3.
// =============================================================================

import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-extrait-entetes',
  styleUrl: './extrait-entetes.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <figure class="piece" aria-label="Extrait des en-têtes de sécurité servis par ce site">
      <pre class="extrait"><code>Content-Security-Policy:
  default-src 'self'
  object-src 'none'
  frame-ancestors 'none'

Strict-Transport-Security</code></pre>

      <p class="marginalia">
        En clair&nbsp;: la page ne charge que ce qui vient de ce domaine, aucun greffon ne s’y
        exécute, aucun autre site ne peut l’encadrer à votre insu, et le navigateur refuse d’y
        revenir en HTTP clair. Chacune ferme une porte par défaut, avant qu’une faille ait eu
        l’occasion d’exister.
      </p>

      <figcaption class="cartel">
        Ouvrez les outils de développement de votre navigateur, onglet Réseau&nbsp;: vérifiez
        vous-même.
      </figcaption>
    </figure>
  `,
})
export class ExtraitEntetes {}
