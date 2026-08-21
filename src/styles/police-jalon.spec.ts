// =============================================================================
// GARDE-FOU — Press Start 2P a un rôle FERMÉ à trois emplois
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE. Press Start 2P est une police pixel : sa chasse
// vaut environ le double de celle d'IBM Plex Mono, elle n'a ni italique ni
// graisse, et son dessin ne supporte pas les tailles intermédiaires. Employée
// « juste pour ce titre-là », elle casse la mesure de ligne de la page entière et
// devient illisible dès qu'un lecteur zoome ou impose son interlignage. Le
// propriétaire lui a donc fermé le rôle à TROIS emplois, et une décision de ce
// genre ne survit pas dans un commentaire : elle survit dans un test.
//
//   1. le numéro de module dans la pastille du cartouche de leçon ;
//   2. le verdict d'un quiz réussi ;
//   3. le code d'erreur de la page 404.
//
// 🔴 LISTE BLANCHE NOMINATIVE, JAMAIS UNE LISTE NOIRE DE MOTIFS. C'est le patron
// systémique du dépôt (S-001, S-003, S-009, S-014) : une liste noire ne refuse
// que ce que son auteur a imaginé. Ici, tout couple (fichier, sélecteur) ABSENT
// de `EMPLOIS_ADMIS` fait échouer en se nommant.
//
// 🔴 LES COMMENTAIRES SONT RETIRÉS D'ABORD, et ce n'est pas une commodité de
// lecture : sans ça, l'ENTRÉE fabrique la preuve que le garde exige (famille
// S-014). Un commentaire citant `--police-jalon` — celui de `_primitives.scss`,
// par exemple — suffirait à déclencher le garde à faux ; et un commentaire posé
// au-dessus d'une déclaration fautive pourrait, dans l'autre sens, décaler
// l'appariement. On analyse donc la SOURCE DÉCOMMENTÉE, jamais le texte brut.
//
// CE QUE CE FICHIER NE FAIT PAS. Il ne compile pas le SCSS (contrairement à
// `design-system.spec.ts`) : la question n'est pas « quel CSS sort » mais
// « quel AUTEUR a écrit cette déclaration, et où ». Le CSS émis a perdu le
// fichier d'origine, qui est précisément la moitié de la liste blanche.
// =============================================================================

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const RACINE = process.cwd();
const RACINE_SRC = join(RACINE, 'src');
const PRIMITIVES = join(RACINE_SRC, 'styles', '_primitives.scss');

// -----------------------------------------------------------------------------
// La liste blanche — un couple (fichier, sélecteur) par emploi admis
// -----------------------------------------------------------------------------
/** Emplois de la police de jalon autorisés, en chemins POSIX depuis la racine. */
const EMPLOIS_ADMIS: readonly { fichier: string; selecteur: string; role: string }[] = [
  {
    fichier: 'src/app/features/cours/lecon/lecon.scss',
    selecteur: '.cartouche-module .pastille',
    role: 'numéro de module dans la pastille du cartouche',
  },
  {
    fichier: 'src/app/features/cours/quiz/quiz.scss',
    selecteur: '.verdict-reussite',
    role: 'verdict d’un quiz réussi',
  },
  {
    fichier: 'src/app/core/layout/page-introuvable/page-introuvable.scss',
    selecteur: '.code-erreur',
    role: 'code d’erreur de la page 404',
  },
];

/**
 * Exceptions STRUCTURELLES — les trois endroits où la police se DÉCLARE au lieu
 * de s'employer. Elles ne sont pas des emplois : aucun élément n'est stylé par
 * elles, et leur imposer un `line-height` n'aurait aucun sens.
 */
const FICHIERS_DE_DECLARATION = [
  'src/styles/_primitives.scss', // la pile de polices (couche 1)
  'src/styles/_themes.scss', // le jeton `--police-jalon` (couche 2)
  'src/styles/_polices.scss', // le bloc `@font-face`
];

/** Interlignage minimal — WCAG 1.4.12 : le lecteur peut imposer le sien. */
const INTERLIGNE_MIN = 1.5;

/**
 * Palier au-delà duquel un emploi de la police de jalon est refusé.
 *
 * La chasse et la hauteur d'œil de Press Start 2P valent environ le DOUBLE de
 * celles d'IBM Plex Mono à `font-size` égal : un `$taille-l` en Press Start 2P
 * occupe à peu près la place d'un `$taille-xxl` en police de titres. Les deux
 * paliers d'affichage (`xl`, `xxl`) lui sont donc fermés — c'est ce que veut
 * dire « taille explicitement réduite », et c'est mesurable plutôt que
 * subjectif. Le seuil est RÉSOLU depuis `_primitives.scss`, pas recopié : il
 * suit l'échelle si elle bouge.
 */
const TAILLE_MAX_JETON = 'taille-l';
const BASE_REM_PX = 16;

// -----------------------------------------------------------------------------
// Analyse — décommenter, puis parcourir les règles par appariement d'accolades
// -----------------------------------------------------------------------------

/**
 * Retire les commentaires SCSS (`//` jusqu'à la fin de ligne, `/* … *\/`) en
 * respectant les chaînes : un `//` dans `url('https://…')` n'ouvre pas un
 * commentaire. Les caractères retirés sont remplacés par des espaces plutôt que
 * supprimés, pour que les positions restantes ne bougent pas.
 */
export function retirerCommentaires(source: string): string {
  // 🔴 `split('')` ET NON `[...source]`, et ça s'est payé en direct. Le spread
  // découpe par POINTS DE CODE : un emoji (les commentaires de ce dépôt en sont
  // pleins — « 🔴 », « ⚠️ ») compte pour un élément là où `source[i]` l'indexe
  // sur DEUX unités UTF-16. Les deux index se désalignent dès le premier
  // caractère astral, et le décommentage laisse alors traîner des fragments —
  // mesuré : un sélecteur reconstitué en « / / / / .code-erreur ». Le contrôle
  // positif ci-dessous est ce qui l'a attrapé.
  const sortie = source.split('');
  let i = 0;
  let guillemet: string | null = null;

  while (i < source.length) {
    const c = source[i];
    const suivant = source[i + 1];

    if (guillemet) {
      if (c === '\\') i += 2;
      else {
        if (c === guillemet) guillemet = null;
        i += 1;
      }
      continue;
    }

    if (c === '"' || c === "'") {
      guillemet = c;
      i += 1;
      continue;
    }

    if (c === '/' && suivant === '/') {
      while (i < source.length && source[i] !== '\n') {
        sortie[i] = ' ';
        i += 1;
      }
      continue;
    }

    if (c === '/' && suivant === '*') {
      const fin = source.indexOf('*/', i + 2);
      const borne = fin === -1 ? source.length : fin + 2;
      for (let j = i; j < borne; j += 1) if (sortie[j] !== '\n') sortie[j] = ' ';
      i = borne;
      continue;
    }

    i += 1;
  }

  return sortie.join('');
}

interface Regle {
  /** Sélecteur reconstitué par la chaîne d'imbrication (`&` recollé). */
  selecteur: string;
  /** Déclarations `propriété: valeur` propres à cette règle (hors imbrication). */
  declarations: { propriete: string; valeur: string }[];
}

/** Recompose un sélecteur imbriqué : `&`-préfixé se recolle, sinon on descend. */
function composer(parent: string, segment: string): string {
  const net = segment.replace(/\s+/g, ' ').trim();
  if (!parent) return net.replaceAll('&', '').trim();
  if (net.startsWith('&')) return parent + net.slice(1);
  return `${parent} ${net}`;
}

/**
 * Parcourt une source SCSS DÉCOMMENTÉE et rend une règle par bloc, avec son
 * sélecteur complet. Les at-rules (`@media`, `@include`, `@font-face`…) sont
 * traversées sans contribuer au sélecteur : un `@media` ne change pas QUI est
 * stylé, et un emploi caché sous un `@media` reste un emploi.
 */
export function analyserRegles(source: string): Regle[] {
  const regles: Regle[] = [];
  const pile: Regle[] = [];
  let tampon = '';

  const declarer = (texte: string): void => {
    const courante = pile[pile.length - 1];
    if (!courante) return;
    const net = texte.trim();
    if (net.length === 0 || net.startsWith('@')) return;
    const coupe = net.indexOf(':');
    if (coupe === -1) return;
    courante.declarations.push({
      propriete: net.slice(0, coupe).trim(),
      valeur: net.slice(coupe + 1).trim(),
    });
  };

  for (const c of source) {
    if (c === '{') {
      const brut = tampon.trim();
      const parent = pile.at(-1)?.selecteur ?? '';
      // Une at-rule n'apporte pas de sélecteur : `@media` ne change pas QUI est
      // stylé, et un emploi caché sous elle reste un emploi.
      const selecteur = brut.startsWith('@') ? parent : composer(parent, brut);
      const regle: Regle = { selecteur, declarations: [] };
      regles.push(regle);
      pile.push(regle);
      tampon = '';
    } else if (c === '}') {
      declarer(tampon);
      pile.pop();
      tampon = '';
    } else if (c === ';') {
      declarer(tampon);
      tampon = '';
    } else {
      tampon += c;
    }
  }

  return regles;
}

/** Une déclaration invoque-t-elle la police de jalon, sous l'une ou l'autre forme ? */
function invoqueLeJalon(valeur: string): boolean {
  return valeur.includes('var(--police-jalon)') || valeur.includes('Press Start 2P');
}

/** Tous les `.scss` de `src/`, en chemins POSIX relatifs à la racine du dépôt. */
function feuillesDuDepot(): string[] {
  const trouvees: string[] = [];
  const descendre = (dossier: string): void => {
    for (const entree of readdirSync(dossier, { withFileTypes: true })) {
      const chemin = join(dossier, entree.name);
      if (entree.isDirectory()) descendre(chemin);
      else if (entree.name.endsWith('.scss')) {
        trouvees.push(relative(RACINE, chemin).split(sep).join('/'));
      }
    }
  };
  descendre(RACINE_SRC);
  return trouvees.sort();
}

/** Emplois relevés dans une source : (sélecteur, déclarations de la règle). */
export function emploisDansLaSource(source: string): Regle[] {
  return analyserRegles(retirerCommentaires(source)).filter((r) =>
    r.declarations.some((d) => invoqueLeJalon(d.valeur)),
  );
}

// -----------------------------------------------------------------------------
// Résolution numérique des jetons — on MESURE, on ne fait pas confiance au nom
// -----------------------------------------------------------------------------
const sourcePrimitives = readFileSync(PRIMITIVES, 'utf8');

/** `$nom: valeur;` de la couche primitives. */
function primitive(nom: string): string | null {
  const m = new RegExp(`^[ \\t]*\\$${nom}[ \\t]*:[ \\t]*([^;]+);`, 'm').exec(sourcePrimitives);
  return m?.[1]?.trim() ?? null;
}

/** Résout `var(--interligne-corps)` ou un nombre nu en interlignage numérique. */
export function interligneNumerique(valeur: string): number | null {
  const nomJeton = /^var\(\s*--([\w-]+)\s*\)$/.exec(valeur.trim())?.[1];
  const brut = nomJeton === undefined ? valeur.trim() : primitive(nomJeton);
  if (brut === null) return null;
  const nombre = Number.parseFloat(brut);
  return Number.isFinite(nombre) && /^[\d.]+$/.test(brut) ? nombre : null;
}

/** Résout `var(--taille-xs)`, `0.75rem` ou `12px` en pixels (base 16). */
export function taillePx(valeur: string): number | null {
  const nomJeton = /^var\(\s*--([\w-]+)\s*\)$/.exec(valeur.trim())?.[1];
  const brut = nomJeton === undefined ? valeur.trim() : primitive(nomJeton);
  if (brut === null) return null;
  const rem = /^(-?[\d.]+)rem$/.exec(brut)?.[1];
  if (rem !== undefined) return Number.parseFloat(rem) * BASE_REM_PX;
  const px = /^(-?[\d.]+)px$/.exec(brut)?.[1];
  if (px !== undefined) return Number.parseFloat(px);
  return null;
}

/** Le plafond, RÉSOLU depuis l'échelle plutôt que recopié (voir `TAILLE_MAX_JETON`). */
const TAILLE_MAX_PX = taillePx(`var(--${TAILLE_MAX_JETON})`);

// =============================================================================
// Les tests
// =============================================================================

describe('Police du jalon — liste blanche nominative (E6)', () => {
  const feuilles = feuillesDuDepot();

  it('balaye vraiment toutes les feuilles de `src/`, sinon le garde ne garde rien', () => {
    // Un garde-fou qui ne lit qu'un dossier est un garde-fou qu'on contourne en
    // créant un fichier ailleurs. On épingle donc le fait qu'il y a bien un
    // corpus, et que les trois fichiers de la liste blanche en font partie.
    expect(feuilles.length).toBeGreaterThan(10);
    for (const emploi of EMPLOIS_ADMIS) {
      expect(feuilles, `${emploi.fichier} doit exister pour porter ${emploi.role}`).toContain(
        emploi.fichier,
      );
    }
  });

  it('n’admet AUCUN emploi hors de la liste blanche', () => {
    const admis = new Set(EMPLOIS_ADMIS.map((e) => `${e.fichier} → ${e.selecteur}`));
    const intrus: string[] = [];

    for (const fichier of feuilles) {
      if (FICHIERS_DE_DECLARATION.includes(fichier)) continue;
      for (const regle of emploisDansLaSource(readFileSync(join(RACINE, fichier), 'utf8'))) {
        const cle = `${fichier} → ${regle.selecteur}`;
        if (!admis.has(cle)) intrus.push(cle);
      }
    }

    expect(
      intrus,
      'Press Start 2P a un rôle FERMÉ à trois emplois (pastille de module, verdict de quiz ' +
        'réussi, code d’erreur 404). Tout autre emploi — et surtout de la prose — est refusé : ' +
        'sa chasse vaut ~2× celle d’IBM Plex Mono. Élargir le rôle est une décision du ' +
        'propriétaire, pas un ajout de ligne à `EMPLOIS_ADMIS`.',
    ).toEqual([]);
  });

  it('exige de chaque emploi admis un interlignage ≥ 1.5 et une taille réduite', () => {
    const manquements: string[] = [];

    for (const emploi of EMPLOIS_ADMIS) {
      const source = readFileSync(join(RACINE, emploi.fichier), 'utf8');
      const toutes = analyserRegles(retirerCommentaires(source));
      const estUnEmploi = toutes.some(
        (r) => r.selecteur === emploi.selecteur && r.declarations.some((d) => invoqueLeJalon(d.valeur)),
      );
      if (!estUnEmploi) continue; // absence : contrôle d'exhaustivité ci-dessous.

      // TOUTES les règles portant ce sélecteur, pas seulement celle qui invoque la
      // police : un auteur peut poser la police dans un bloc et l'interlignage dans
      // un autre, et ne regarder qu'un des deux refuserait un emploi conforme.
      const declarations = toutes
        .filter((r) => r.selecteur === emploi.selecteur)
        .flatMap((r) => r.declarations);

      const lu = (propriete: string): string | null => {
        for (let i = declarations.length - 1; i >= 0; i -= 1) {
          const declaration = declarations[i];
          if (declaration?.propriete === propriete) return declaration.valeur;
        }
        return null;
      };

      const interligne = lu('line-height');
      const resolu = interligne === null ? null : interligneNumerique(interligne);
      if (resolu === null || resolu < INTERLIGNE_MIN) {
        manquements.push(
          `${emploi.fichier} → ${emploi.selecteur} : line-height « ${interligne ?? 'absent'} » ` +
            `— WCAG 1.4.12 exige ≥ ${INTERLIGNE_MIN}, et un lecteur peut l’imposer lui-même.`,
        );
      }

      const taille = lu('font-size');
      const px = taille === null ? null : taillePx(taille);
      if (px === null || TAILLE_MAX_PX === null || px > TAILLE_MAX_PX) {
        manquements.push(
          `${emploi.fichier} → ${emploi.selecteur} : font-size « ${taille ?? 'absent'} » ` +
            `— la chasse de Press Start 2P vaut ~2× celle d’IBM Plex Mono, la taille doit être ` +
            `explicitement réduite (≤ $${TAILLE_MAX_JETON}, soit ${TAILLE_MAX_PX ?? '?'}px) et ` +
            `résoluble par ce test.`,
        );
      }
    }

    expect(manquements).toEqual([]);
  });

  // Le contrôle d'exhaustivité est le PENDANT de la liste blanche : une entrée
  // qui ne correspond à aucune règle réelle est une exemption obsolète, et le
  // recensement se met alors à mentir dans l'autre sens (il décrit un emploi
  // qui n'existe plus, donc il rassure à tort).
  //
  // ✅ IL EST ACTIF, et les trois emplois qu'il exige EXISTENT : la pastille du
  // cartouche de leçon, le verdict de quiz réussi et le code d'erreur 404 sont
  // posés dans les trois feuilles nommées par `EMPLOIS_ADMIS`. Un garde-fou
  // livré éteint ne garde rien — si l'un des trois emplois disparaît ou change
  // de sélecteur, c'est ici que ça rougit, et l'entrée devenue fausse doit être
  // retirée de la liste plutôt que réécrite au hasard.
  it('exige que CHAQUE entrée de la liste blanche soit réellement atteinte', () => {
    const orphelines: string[] = [];
    for (const emploi of EMPLOIS_ADMIS) {
      const source = readFileSync(join(RACINE, emploi.fichier), 'utf8');
      const trouvee = emploisDansLaSource(source).some((r) => r.selecteur === emploi.selecteur);
      if (!trouvee) orphelines.push(`${emploi.fichier} → ${emploi.selecteur} (${emploi.role})`);
    }
    expect(orphelines).toEqual([]);
  });
});

// -----------------------------------------------------------------------------
// CONTRÔLES POSITIFS — un garde-fou que rien n'exerce est une intention
// -----------------------------------------------------------------------------
// Les trois emplois admis existent désormais, et le contrôle d'exhaustivité
// ci-dessus l'exige : les tests du bloc précédent mesurent donc un corpus RÉEL.
// Ces contrôles restent nécessaires pour une autre raison — ils valident
// l'ANALYSEUR lui-même, pas le corpus. Un `emploisDansLaSource` qui cesserait de
// voir une déclaration sous une at-rule, ou qui se mettrait à compter un
// commentaire, rendrait la liste blanche verte en n'inspectant plus rien : c'est
// le mode d'échec de S-003 (un garde qui n'exerce plus son propre instrument),
// et il ne se détecte que par des entrées connues, positives ET négatives.
describe('Police du jalon — contrôles positifs de l’analyseur', () => {
  it('VOIT un emploi sauvage, y compris sous une at-rule et une imbrication', () => {
    const scss = `
      .prose {
        color: red;

        @media (min-width: 40em) {
          p { font-family: var(--police-jalon); }
        }
      }
    `;
    const emplois = emploisDansLaSource(scss);
    expect(emplois.map((r) => r.selecteur)).toEqual(['.prose p']);
  });

  it('VOIT la forme littérale autant que la forme jetonnée', () => {
    const scss = `.badge { font-family: 'Press Start 2P', monospace; }`;
    expect(emploisDansLaSource(scss).map((r) => r.selecteur)).toEqual(['.badge']);
  });

  it('NE voit PAS un commentaire qui cite la police — l’entrée ne fabrique pas la preuve', () => {
    // C'est le contrôle de la famille S-014, et il compte double : sans le
    // décommentage, `_primitives.scss` — dont le commentaire cite nommément
    // `--police-jalon` et « Press Start 2P » — déclencherait le garde à faux, et
    // la parade évidente (exempter `_primitives.scss`) masquerait un vrai emploi.
    const scss = `
      // Press Start 2P sert ici : var(--police-jalon)
      /* et là aussi : var(--police-jalon) */
      .prose { font-family: var(--police-corps); }
    `;
    expect(emploisDansLaSource(scss)).toEqual([]);
  });

  it('ne se laisse pas couper par un « // » qui vit dans une chaîne', () => {
    const scss = `.f { background: url('https://exemple.invalide/x.png'); font-family: var(--police-jalon); }`;
    expect(emploisDansLaSource(scss).map((r) => r.selecteur)).toEqual(['.f']);
  });

  it('recolle `&` au parent plutôt que de créer un sélecteur fantôme', () => {
    const scss = `.pastille { &.reussie { font-family: var(--police-jalon); } }`;
    expect(emploisDansLaSource(scss).map((r) => r.selecteur)).toEqual(['.pastille.reussie']);
  });

  it('résout les jetons NUMÉRIQUEMENT — un nom ne prouve pas une valeur', () => {
    // `--interligne-corps` vaut 1.6 et `--interligne-titre` 1.15 : le second est
    // sous le seuil de 1.4.12, et seule la mesure le dit.
    expect(interligneNumerique('var(--interligne-corps)')).toBeGreaterThanOrEqual(INTERLIGNE_MIN);
    expect(interligneNumerique('var(--interligne-titre)')).toBeLessThan(INTERLIGNE_MIN);
    expect(interligneNumerique('1.5')).toBe(1.5);
    expect(interligneNumerique('normal')).toBeNull();

    // Le plafond est `$taille-l` (25 px) : les deux paliers d'AFFICHAGE au-dessus
    // lui sont fermés, parce qu'un `l` en Press Start 2P occupe déjà la place
    // visuelle d'un `xxl` en police de titres.
    expect(TAILLE_MAX_PX).toBe(25);
    expect(taillePx('var(--taille-s)')).toBeLessThan(TAILLE_MAX_PX as number);
    expect(taillePx('var(--taille-xl)')).toBeGreaterThan(TAILLE_MAX_PX as number);
    expect(taillePx('var(--police-jalon)')).toBeNull();
  });
});
