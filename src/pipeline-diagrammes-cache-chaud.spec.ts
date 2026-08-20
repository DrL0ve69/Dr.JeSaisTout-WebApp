// =============================================================================
// LE PIPELINE N'EXIGE CHROMIUM QUE S'IL A QUELQUE CHOSE À RENDRE
// =============================================================================
// 🔴 CE QUE CE FICHIER FERME, et pourquoi il a existé trop tard.
// `creerRendeurMermaid()` localisait `mmdc` ET le Chromium de Playwright À LA
// CONSTRUCTION — donc AVANT toute consultation du cache. Une leçon à diagrammes
// dont les socles SVG étaient déjà en cache exigeait quand même un navigateur, et
// sortait en code 1 sans avoir rien eu à rendre.
//
// Ce n'est pas une gêne théorique : le job `gates` de `deploy.yml` exécute G-test
// AVANT d'installer le navigateur. Le déploiement serait rouge à chaque fois, et
// son message d'échec ordonnerait d'installer Chromium — c'est-à-dire de rétablir
// exactement la régression que ce lot supprime.
//
// 🔴 CE QUE LA PREMIÈRE ÉCRITURE DE CE FICHIER FAISAIT DE FAUX, et c'était la faute
// même qu'il dénonce. Il fabriquait son socle chaud par un run de « chauffage »
// avec un VRAI Chromium — donc le spec qui prouve que `gates` n'a plus besoin de
// navigateur en exigeait un, dans le job qui n'en a pas. `ci.yml` l'installe AVANT
// G-test, `deploy.yml` APRÈS : vert en CI, rouge sur `main` (L-007, le précédent
// exact de la PR #17). Le commentaire ci-dessus énonçait déjà le fait qui
// invalidait le code d'en dessous (S-009).
//
// LA PARADE, ET ELLE REPRODUIT `gates` À L'IDENTIQUE : le socle chaud est AMORCÉ
// PAR COPIE de `.cache/mermaid` — exactement ce que le job `contenu` préchauffe,
// empaquette et transmet, et que `gates` déballe AVANT G-test (`deploy.yml`, étape
// « Déballer les sorties compilées », minimum `attendu=<n>` comparé aux deux
// bouts). Copier n'est pas rendre : aucun navigateur n'entre dans cette voie.
//
// ⚠️ UN REPLI EXISTE, POUR LE SEUL CAS QUE `gates` NE CONNAÎT PAS — un poste dont
// `.cache/mermaid` est vide ou périmé (clone frais, cache purgé, règles de
// nettoyage changées depuis) : on fabrique alors le socle par un vrai rendu, puis
// on REMESURE sans navigateur. Il ne s'arme QUE si l'état chaud a échoué, il est
// donc hors des conditions de `gates` — et il n'escamote rien : toutes les
// assertions portent sur l'exécution SANS navigateur et courent dans les deux cas,
// dont une qui NOMME la voie empruntée. Ce fichier ne peut pas se sauter.
//
// ⚠️ POURQUOI LA MESURE INITIALE N'AVAIT RIEN VU. Elle avait vérifié que `mmdc`
// n'était pas invoqué (vrai) en croyant vérifier que « ça marche sans Chromium »
// (faux) — sur une machine où Chromium était installé. La seule preuve qui vaut
// est celle-ci : un environnement où le navigateur est RÉELLEMENT introuvable.
// D'où `PLAYWRIGHT_BROWSERS_PATH` pointé sur un dossier VIDE.
//
// LES DEUX SENS SONT TESTÉS, ET C'EST INDISSOCIABLE :
//   · cache CHAUD  + aucun navigateur ⇒ code 0 (le correctif) ;
//   · cache FROID  + aucun navigateur ⇒ code 1, message nommant Chromium (la
//     preuve que l'outil n'est pas devenu optionnel — on l'a seulement réclamé au
//     bon moment), qui sert aussi de CONTRÔLE POSITIF : sans lui, un `code 0`
//     obtenu parce que Playwright aurait ignoré `PLAYWRIGHT_BROWSERS_PATH` se
//     lirait comme un succès (L-019).
//
// POURQUOI `--cache-diagrammes`. Les deux états doivent être exercés sans se
// marcher dessus NI polluer le cache partagé du poste, que d'autres specs
// supposent intact : `.cache/mermaid` est LU ici, jamais écrit. Chaque exécution
// reçoit donc son propre dossier de cache. Le bac vit dans `.cache/` (gitignoré),
// et la sortie se nomme « content-generated » parce que le garde-fou du `rmSync`
// de `build.mjs` l'exige.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ORCHESTRATEUR = 'tools/content-pipeline/build.mjs';

/** Fixture à diagrammes : 3 occurrences pour 2 sources distinctes. */
const RACINE_DIAGRAMMES = 'tools/content-pipeline/__fixtures__/mermaid-deux-diagrammes';

/** Le cache du poste — `DOSSIER_CACHE` de `rendre-mermaid.mjs`, celui que `gates` reçoit. */
const CACHE_DU_POSTE = '.cache/mermaid';

const BAC = '.cache/tests-cache-chaud';
/** Dossier VIDE présenté à Playwright comme sa racine de navigateurs. */
const SANS_NAVIGATEUR = join(BAC, 'navigateurs-vides');

/** Le repli — et lui seul — peut démarrer un vrai Chromium : c'est lent, une seule fois. */
const DELAI = 240_000;

interface Execution {
  code: number;
  journal: string;
}

/**
 * Lance l'orchestrateur sur la fixture à diagrammes, avec SON cache et SON
 * environnement. `navigateur: false` remplace la racine des navigateurs de
 * Playwright par un dossier vide — l'exécution n'a alors AUCUN Chromium.
 */
function lancer(nom: string, options: { cache: string; navigateur: boolean }): Execution {
  const sortie = join(BAC, nom, 'content-generated');
  const css = join(BAC, nom, '_coloration.scss');
  const resultat = spawnSync(
    process.execPath,
    [
      ORCHESTRATEUR,
      '--racine',
      RACINE_DIAGRAMMES,
      '--sortie',
      sortie,
      '--css',
      css,
      '--cache-diagrammes',
      options.cache,
    ],
    {
      encoding: 'utf8',
      cwd: process.cwd(),
      env: options.navigateur
        ? process.env
        : { ...process.env, PLAYWRIGHT_BROWSERS_PATH: resolve(SANS_NAVIGATEUR) },
    },
  );
  return {
    code: resultat.status ?? -1,
    journal: `${resultat.stdout ?? ''}\n${resultat.stderr ?? ''}`,
  };
}

/**
 * Amorce `destination` avec les socles du cache du poste. La COPIE est le geste de
 * `gates` (déballer un `.cache/mermaid` transféré) et elle ne rend rien.
 *
 * @returns le nombre de socles copiés
 */
function amorcerParCopie(destination: string): number {
  mkdirSync(destination, { recursive: true });
  if (!existsSync(CACHE_DU_POSTE)) return 0;
  const socles = readdirSync(CACHE_DU_POSTE).filter((nom) => nom.endsWith('.svg'));
  for (const nom of socles) copyFileSync(join(CACHE_DU_POSTE, nom), join(destination, nom));
  return socles.length;
}

/** Les 12 dernières lignes utiles d'un journal — pour que l'échec dise sa cause. */
function extrait(execution: Execution): string {
  return execution.journal
    .trim()
    .split('\n')
    .filter((ligne) => ligne.trim() !== '')
    .slice(-12)
    .join('\n');
}

describe('le rendu des diagrammes face à un Chromium absent', () => {
  const CACHE_FROID = join(BAC, 'cache-froid');
  const CACHE_PARTAGE = join(BAC, 'cache-chaud');

  let froid: Execution;
  let chaud: Execution;
  /** 'copie' = le geste de `gates` a suffi ; 'repli' = un vrai rendu a dû fabriquer le socle. */
  let provenance: 'copie' | 'repli' = 'copie';
  let soclesCopies = 0;

  beforeAll(() => {
    rmSync(BAC, { recursive: true, force: true });
    mkdirSync(SANS_NAVIGATEUR, { recursive: true });

    // 1 · Cache FROID, aucun navigateur : il y a un rendu à faire, l'outil manque.
    froid = lancer('froid', { cache: CACHE_FROID, navigateur: false });

    // 2 · Cache CHAUD amorcé PAR COPIE, aucun navigateur : plus rien à rendre, donc
    //     plus rien à exiger. C'est la séquence exacte du job `gates`.
    soclesCopies = amorcerParCopie(CACHE_PARTAGE);
    chaud = lancer('chaud', { cache: CACHE_PARTAGE, navigateur: false });

    // 3 · Repli, HORS des conditions de `gates` : le cache du poste ne portait pas ces
    //     socles-là. Un vrai rendu les fabrique, puis on remesure sans navigateur —
    //     l'assertion mesurée reste la même, seule sa préparation a changé.
    if (chaud.code !== 0) {
      lancer('repli-chauffage', { cache: CACHE_PARTAGE, navigateur: true });
      chaud = lancer('chaud-apres-repli', { cache: CACHE_PARTAGE, navigateur: false });
      provenance = 'repli';
    }
  }, DELAI);

  afterAll(() => {
    rmSync(BAC, { recursive: true, force: true });
  });

  describe('cache FROID — l’exigence reste entière', () => {
    it('le dossier de navigateurs présenté à Playwright est bien VIDE (contrôle positif)', () => {
      expect(existsSync(SANS_NAVIGATEUR)).toBe(true);
      expect(readdirSync(SANS_NAVIGATEUR)).toEqual([]);
    });

    it('échoue en code 1 plutôt que de compiler une leçon sans ses diagrammes', () => {
      expect(froid.code).toBe(1);
    });

    it('NOMME Chromium et la commande à lancer — pas de repli silencieux', () => {
      expect(froid.journal).toMatch(/Chromium/);
      expect(froid.journal).toMatch(/e2e:install/);
    });

    it('n’a écrit aucun socle : le cache froid est resté froid', () => {
      const socles = existsSync(CACHE_FROID) ? readdirSync(CACHE_FROID) : [];
      expect(socles).toEqual([]);
    });
  });

  describe('cache CHAUD — plus rien à rendre, donc rien à exiger', () => {
    it('a amorcé le socle PAR COPIE, comme `gates` — et le dit, plutôt que de se sauter', () => {
      expect(
        soclesCopies,
        'aucun socle n’a été copié : `.cache/mermaid` est absent ou vide sur ce poste. Le job ' +
          '`gates` le reçoit du job `contenu` ; en local, `npm run content:mermaid:prechauffer` ' +
          'le remplit',
      ).toBeGreaterThan(0);
      expect(
        provenance,
        'la copie du cache du poste n’a PAS suffi : le repli a dû fabriquer le socle par un vrai ' +
          'rendu. Dans les conditions de `gates`, cela signifierait un `.cache/mermaid` transféré ' +
          'incomplet — donc `mmdc` rappelé dans un job SANS Chromium. Rejouer ' +
          '`npm run content:mermaid:prechauffer`',
      ).toBe('copie');
    });

    it('🔴 LA RÉGRESSION : compile en code 0 SANS aucun Chromium', () => {
      expect(extrait(chaud)).toContain('rendre-mermaid');
      expect(chaud.code).toBe(0);
    });

    it('et il n’a rien rendu du tout — les 2 sources viennent du cache', () => {
      expect(chaud.journal).toContain('0 source(s) rendue(s), 2 relue(s) du cache');
    });

    it('n’a même pas NOMMÉ Chromium — l’outil n’a jamais été réclamé', () => {
      // La localisation est PARESSEUSE : si elle remontait à la construction du rendeur,
      // cette exécution réclamerait le navigateur. C'est ce mot-là qu'on guette, et c'est
      // lui qui rougit si la régression revient.
      expect(chaud.journal).not.toMatch(/Chromium/);
    });

    it('les SVG relus repassent par le contrôle final — le cache ne court-circuite rien', () => {
      // La revérification (`verifierSvgNettoye` à la relecture, `controlerSvgCompiles`
      // sur l'AST) est ce qui interdit qu'un cache chaud devienne une source de
      // confiance : un garde-fou hors du chemin exécuté ne garde rien (S-003).
      expect(chaud.journal).toMatch(/3 SVG contrôlé\(s\)/);
    });
  });
});
