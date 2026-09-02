// =============================================================================
// LES CHEMINS QU'UN .pptx DICTE SONT-ILS BORNÉS AU DOSSIER D'EXTRACTION ?
// -----------------------------------------------------------------------------
// POURQUOI CE SPEC EXISTE.
// `tools/supports-cours/extraire-diapositives.mjs` déballe un .pptx dans un dossier
// temporaire, puis relit chaque diapositive à l'adresse que l'archive lui indique :
// `ppt/_rels/presentation.xml.rels` associe chaque `rId` à une `Target`. Cette
// `Target` est une ENTRÉE — le .pptx est téléchargé depuis le site de l'enseignant,
// son XML est écrit par un tiers, pas par le dépôt.
//
// CE QUE LA VERSION PRÉCÉDENTE EN FAISAIT — mesuré, pas supposé.
// Elle écrivait `join(dossier, 'ppt', cible.replace(/^\.\.\//, ''))`. Un motif ne
// retire QU'UN segment. Rejouées contre cette version, sur ce poste :
//   ../../../../etc/passwd      → C:\Users\phili\AppData\Local\etc\passwd  (HORS dossier)
//   slides/../presentation.xml  → …\ppt\presentation.xml   (pas une diapositive)
//   C:/Windows/win.ini          → …\ppt\C:\Windows\win.ini (recollé sous ppt/)
// Le contenu du fichier lu était ensuite imprimé dans l'extrait. Aucune erreur, aucun
// message : trois lectures arbitraires en silence. Sans cette mesure préalable, les
// `it` ci-dessous seraient verts sans rien prouver — c'est la faute S-003 du dépôt,
// « un contrôle positif qu'aucun runner n'exécute est une intention, pas un gate ».
//
// CE QUE LE CORRECTIF SÉPARE, ET QUI EST LE VRAI SUJET.
// La normalisation (retirer les `..` de TÊTE, pour les producteurs qui écrivent
// `../slides/slideN.xml`) ne décide plus rien : elle est suivie de trois gardes —
// refus des cibles absolues, confinement STRUCTUREL sous le dossier temporaire, et
// liste blanche NOMINATIVE sur le nom de fichier (`slideN.xml`). Famille S-021(c) de
// `.claude/rules/security.md` : apparier un motif sur un chemin SÉRIALISÉ n'est pas
// analyser une structure de chemin.
//
// POURQUOI UN PROCESSUS FILS plutôt qu'un `await import()` : le module est un outil
// en ligne de commande. Le charger dans le processus de test l'exposerait aux
// `process.argv` de Vitest ; le fils prouve en plus que le bloc CLI est bien gardé,
// puisque l'import seul ne doit produire ni usage ni `process.exit`.
// =============================================================================

import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';

const CHEMIN_OUTIL = join(process.cwd(), 'tools', 'supports-cours', 'extraire-diapositives.mjs');
const MODULE = pathToFileURL(CHEMIN_OUTIL).href;

/** Un dossier d'extraction plausible ET INEXISTANT : rien n'est lu, seul le chemin compte. */
const DOSSIER = join(process.cwd(), 'node_modules', '.cache', 'pptx-temoin-inexistant');

interface Verdict {
  admis: boolean;
  /** Le chemin rendu si admis, le message de refus sinon. */
  detail: string;
  /** La sortie standard du fils : elle doit rester vide de tout usage CLI. */
  bruit: string;
}

/**
 * Exécute un `try { … }` contre le module importé dans un vrai processus Node, et rend
 * son verdict. Le fils prouve au passage que le bloc CLI est gardé : le seul import ne
 * doit produire ni usage ni `process.exit`.
 */
function executer(corpsTry: string): Verdict {
  const script =
    `const m = await import(${JSON.stringify(MODULE)});` +
    corpsTry +
    `catch (e) { console.log('REFUS' + '\\u0000' + e.message); }`;
  const fils = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    cwd: process.cwd(),
  });
  const lignes = (fils.stdout ?? '').split('\n').filter((l) => l.includes('\u0000'));
  const derniere = lignes.at(-1) ?? '';
  const [verdict, detail] = derniere.split('\u0000');
  return {
    admis: verdict === 'ADMIS',
    detail: detail ?? `${fils.stderr ?? ''}`,
    bruit: (fils.stdout ?? '').split('\n').filter((l) => !l.includes('\u0000')).join('\n').trim(),
  };
}

/** Passe une `Target` de relation à `cheminDeDiapositive`, dans un vrai processus Node. */
function resoudre(cible: string): Verdict {
  return executer(
    `try { console.log('ADMIS' + '\\u0000' + m.cheminDeDiapositive(${JSON.stringify(DOSSIER)}, ${JSON.stringify(cible)})); }`,
  );
}

describe('`extraire-diapositives.mjs` — les chemins dictés par le .pptx', () => {
  // ---------------------------------------------------------------------------
  // LE TÉMOIN — sans lui, une fonction qui refuse TOUT serait verte de bout en bout
  // ---------------------------------------------------------------------------
  describe('sur les cibles LÉGITIMES', () => {
    it('admet `slides/slideN.xml`, et ne se laisse pas piéger par slide10 vs slide2', () => {
      for (const cible of ['slides/slide1.xml', 'slides/slide2.xml', 'slides/slide10.xml']) {
        const verdict = resoudre(cible);
        expect(verdict.admis, `${cible} → ${verdict.detail}`).toBe(true);
        expect(verdict.detail).toContain(join('ppt', 'slides'));
      }
    });

    it('ramène `../slides/slideN.xml` sous `ppt/`, comme le faisait l’ancien `replace`', () => {
      // Compatibilité explicite : certains producteurs écrivent la cible avec un `../`.
      // Ce n'est PAS une garde — c'est la normalisation que les gardes suivent.
      const verdict = resoudre('../slides/slide2.xml');
      expect(verdict.admis, verdict.detail).toBe(true);
      expect(verdict.detail).toContain(join('ppt', 'slides', 'slide2.xml'));
    });

    it('n’imprime AUCUN usage CLI : le bloc en ligne de commande est bien gardé', () => {
      // Sans le garde `import.meta.url === pathToFileURL(process.argv[1]).href`, le seul
      // import déclencherait l'usage puis `process.exit(1)` — le module serait intestable,
      // donc non gardé, et ce fichier entier ne mesurerait rien.
      expect(resoudre('slides/slide1.xml').bruit).toBe('');
    });
  });

  // ---------------------------------------------------------------------------
  // LES CHARGES — chacune traversait la version précédente, en silence
  // ---------------------------------------------------------------------------
  describe('sur les cibles HOSTILES', () => {
    /** Chaque charge doit être refusée, et le refus doit NOMMER la garde qui a mordu. */
    function exigerRefus(cibles: readonly string[], motif: string): void {
      for (const cible of cibles) {
        const verdict = resoudre(cible);
        expect(verdict.admis, `${cible} a été ADMIS → ${verdict.detail}`).toBe(false);
        expect(verdict.detail, `${cible} refusé, mais pas pour « ${motif} »`).toContain(motif);
      }
    }

    it('refuse une remontée qui sort du dossier d’extraction', () => {
      exigerRefus(['../../../../etc/passwd', 'slides/../../../etc/passwd'], 'refusée');
    });

    it('refuse une cible absolue, POSIX comme Windows', () => {
      exigerRefus(['/etc/passwd', 'C:/Windows/win.ini', 'C:\\Windows\\win.ini'], 'absolue');
    });

    it('refuse une partie du .pptx qui n’est PAS une diapositive', () => {
      // Ces trois-là restent SOUS le dossier : le confinement seul ne suffit donc pas,
      // c'est la liste blanche nominative `slideN.xml` qui mord ici.
      exigerRefus(
        ['slides/../presentation.xml', 'slides/notes.xml', 'slides/slide.xml'],
        'nominative',
      );
    });
  });

  // ---------------------------------------------------------------------------
  // LA LIGNE DE COMMANDE — `process.argv` est une entrée comme une autre
  // ---------------------------------------------------------------------------
  describe('les chemins reçus en ligne de commande', () => {
    /** Passe une valeur à `cheminSousLeDepot`, dans un vrai processus Node. */
    function contenir(valeur: string): Verdict {
      return executer(
        `try { console.log('ADMIS' + '\\u0000' + m.cheminSousLeDepot(${JSON.stringify(valeur)}, 'Support')); }`,
      );
    }

    it('admet un support versionné du dépôt', () => {
      const verdict = contenir('securite-app-web-2026/Cours01.pptx');
      expect(verdict.admis, verdict.detail).toBe(true);
    });

    it('refuse tout chemin hors du dépôt', () => {
      // L'outil n'a qu'un terrain légitime : les supports versionnés et leurs extraits.
      // Sans cette garde, un argument mal formé fait lire — ou ÉCRASER — n'importe où.
      for (const valeur of ['../../secrets.txt', '/etc/passwd']) {
        const verdict = contenir(valeur);
        expect(verdict.admis, `${valeur} a été ADMIS → ${verdict.detail}`).toBe(false);
        expect(verdict.detail).toContain('hors du dépôt');
      }
    });

    it('refuse un préfixe de lecteur SUR TOUTE PLATEFORME, pas seulement sous Windows', () => {
      // 🔴 CE `it` EST NÉ D'UN ÉCHEC DE RUNNER, PAS D'UNE PRÉCAUTION (CI 33527351852).
      // `isAbsolute` dépend de l'OS : sous Linux, `C:/Windows/win.ini` est un chemin
      // RELATIF vers un dossier nommé `C:`, donc il aboutit sous le dépôt et le
      // confinement l'admettait. La garde rendait deux verdicts selon l'hôte — verte
      // ici, rouge sur le runner. Un test vert sur un seul OS ne prouve rien d'une
      // garde de chemin ; celui-ci fixe le verdict des deux côtés.
      for (const valeur of ['C:/Windows/win.ini', 'C:\\Windows\\win.ini', 'd:/x/y.pptx']) {
        const verdict = contenir(valeur);
        expect(verdict.admis, `${valeur} a été ADMIS → ${verdict.detail}`).toBe(false);
        expect(verdict.detail).toContain('chemin de lecteur');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // LE TRIPWIRE — le binaire ne doit jamais redevenir une recherche par PATH
  // ---------------------------------------------------------------------------
  describe('le binaire `unzip`', () => {
    const source = readFileSync(CHEMIN_OUTIL, 'utf8');
    // 🔴 LE TRIPWIRE PORTE SUR LE CODE, JAMAIS SUR LES COMMENTAIRES — payé ici même.
    // Écrit d'abord contre la source entière, il rougissait sur le commentaire de
    // l'outil qui EXPLIQUE pourquoi la forme fautive est interdite : le garde-fou se
    // trouvait lui-même, et l'unique façon de le verdir aurait été d'effacer
    // l'explication. Un contrôle qui punit sa propre documentation apprend à ne plus
    // documenter.
    const codeSeul = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

    it('n’est JAMAIS invoqué par son nom nu', () => {
      // `execFileSync` sur un nom nu laisse le système choisir le programme : un dossier
      // inscriptible placé avant /usr/bin dans le PATH suffit à faire exécuter un faux
      // binaire avec les droits du développeur.
      expect(codeSeul).not.toMatch(/execFileSync\(\s*['"`]unzip/);
      expect(codeSeul).toContain('execFileSync(resoudreUnzip()');
    });

    it('ancre CHAQUE liste sur la règle de SA plateforme', () => {
      // 🔴 MESURÉ, ET C'EST TOUT LE POINT : `resolve('/usr/bin/unzip')` rend
      // `C:\usr\bin\unzip` sous Windows — donc `existsSync` interroge la racine du
      // lecteur courant, que les « Utilisateurs authentifiés » peuvent peupler. Un
      // chemin POSIX n'est ancré que sous POSIX. Le tripwire précédent appariait
      // `^(\/|[a-zA-Z]:\/)` sur la liste UNIQUE et certifiait donc « absolu » un chemin
      // qui ne l'était pas sur la plateforme où il allait servir : il donnait
      // l'assurance qu'il ne mesurait pas.
      //
      // Les deux listes sont jugées ICI, quelle que soit la plateforme du runner :
      // la CI (Linux) est ainsi le seul endroit qui vérifie l'ancrage de la liste
      // Windows, et ce poste-ci le seul à vérifier l'autre.
      const liste = (nom: string): string[] =>
        JSON.parse(
          executer(`try { console.log('ADMIS' + '\\u0000' + JSON.stringify(m.${nom})); }`).detail,
        ) as string[];

      const posix = liste('CANDIDATS_UNZIP_POSIX');
      const win32 = liste('CANDIDATS_UNZIP_WIN32');
      expect(posix.length).toBeGreaterThan(0);
      expect(win32.length).toBeGreaterThan(0);
      for (const c of posix) expect(c, `${c} n’est pas ancré à la racine POSIX`).toMatch(/^\//);
      for (const c of win32) {
        expect(c, `${c} n’est pas ancré sur une lettre de lecteur`).toMatch(/^[a-zA-Z]:\//);
      }
    });

    it('choisit la liste PAR LA PLATEFORME, sans jamais concaténer les deux', () => {
      // Concaténer rouvrirait la faille en entier : les chemins POSIX redeviendraient
      // des cibles sous `C:\` et reprendraient la tête du `find`.
      expect(codeSeul).toMatch(
        /process\.platform === 'win32'\s*\?\s*CANDIDATS_UNZIP_WIN32\s*:\s*CANDIDATS_UNZIP_POSIX/,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // LE TYPE DE L'ENTRÉE — un chemin admis ne dit rien de ce qu'il DÉSIGNE
  // ---------------------------------------------------------------------------
  describe('le type du membre relu', () => {
    const BAC = join(process.cwd(), 'node_modules', '.cache', 'pptx-membres-temoin');
    const REGULIER = join(BAC, 'slide1.xml');
    const DOSSIER_PIEGE = join(BAC, 'slide2.xml');
    const LIEN = join(BAC, 'slide3.xml');
    const SECRET = join(BAC, 'secret.txt');
    /** Windows refuse `symlink` sans privilège ni mode développeur : on le constate. */
    let lienCree = false;

    beforeAll(() => {
      rmSync(BAC, { recursive: true, force: true });
      mkdirSync(BAC, { recursive: true });
      writeFileSync(REGULIER, '<a:t>Bonjour</a:t>', 'utf8');
      writeFileSync(SECRET, 'CLEF-PRIVEE-TEMOIN', 'utf8');
      mkdirSync(DOSSIER_PIEGE);
      try {
        symlinkSync(SECRET, LIEN);
        lienCree = true;
      } catch {
        lienCree = false;
      }
    });

    afterAll(() => rmSync(BAC, { recursive: true, force: true }));

    const lire = (chemin: string): Verdict =>
      executer(
        `try { console.log('ADMIS' + '\\u0000' + m.lireMembreRegulier(${JSON.stringify(chemin)})); }`,
      );

    // LE TÉMOIN — sans lui, une fonction qui refuse TOUT serait verte partout ailleurs.
    it('admet un fichier régulier, et rend son contenu', () => {
      const v = lire(REGULIER);
      expect(v.admis).toBe(true);
      expect(v.detail).toBe('<a:t>Bonjour</a:t>');
    });

    it('refuse un DOSSIER portant un nom de diapositive admis', () => {
      const v = lire(DOSSIER_PIEGE);
      expect(v.admis).toBe(false);
      expect(v.detail).toContain('non régulier');
    });

    // 🔴 LE CŒUR DU CONSTAT. `slide3.xml` passe les TROIS gardes de chemin — il est
    // relatif, il résout sous le dossier d'extraction, son basename est nominatif — et
    // pointe pourtant hors de l'archive. Sans contrôle de type, `readFileSync` suit le
    // lien et le secret part dans l'extrait que l'opérateur lit et recopie.
    it.skipIf(!lienCree)('refuse un LIEN symbolique portant un nom admis', () => {
      const v = lire(LIEN);
      expect(v.admis).toBe(false);
      expect(v.detail).toContain('non régulier');
      expect(v.detail).not.toContain('CLEF-PRIVEE-TEMOIN');
    });

    it('constate si la plateforme a permis de poser le lien', () => {
      // ⚠️ Ce test ne juge RIEN — il IMPRIME. Sans lui, un `skipIf` silencieux laisserait
      // croire que le cas hostile a été mesuré alors qu'il a été sauté, et le vert
      // vaudrait pour la plateforme au lieu de valoir pour la garde. C'est le contraire
      // de la garde elle-même, qui, elle, ne dépend d'aucun OS.
      console.log(
        lienCree
          ? '[type de membre] lien symbolique posé : le cas hostile est MESURÉ'
          : '[type de membre] lien symbolique impossible ici (privilège Windows) : cas SAUTÉ',
      );
      expect(typeof lienCree).toBe('boolean');
    });
  });

  // ---------------------------------------------------------------------------
  // LE CHEMIN RÉELLEMENT EXÉCUTÉ — S-003 : un garde débranché reste vert
  // ---------------------------------------------------------------------------
  describe('les deux gardes sont sur le chemin d’exécution', () => {
    // ⚠️ POURQUOI CES DEUX-LÀ SONT DES TRIPWIRES DE SOURCE, ET NON DES APPELS.
    // `extraire()` et `ordreDesDiapositives()` exigent un vrai .pptx ; aucun n'est
    // versionné (ils sont téléchargés et gitignorés), et en fabriquer un au test
    // demanderait un écrivain ZIP que le dépôt n'a pas. Sans ces deux contrôles, un
    // retour à `join(dossier, 'ppt', cible.replace(/^\.\.\//, ''))` laisserait TOUS les
    // autres tests verts : les gardes existeraient, débranchées. C'est exactement la
    // faute S-003 — « un garde-fou doit vivre sur le chemin réellement exécuté ».
    const codeSeul = readFileSync(CHEMIN_OUTIL, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    it('ne relit AUCUN membre par un `readFileSync` nu', () => {
      const horsGarde = codeSeul.replace(/export function lireMembreRegulier[\s\S]*?\n}/, '');
      expect(horsGarde).not.toMatch(/readFileSync\(/);
    });

    it('dérive CHAQUE chemin de diapositive par `cheminDeDiapositive`', () => {
      const corps = /function ordreDesDiapositives\([\s\S]*?\n}/.exec(codeSeul)?.[0] ?? '';
      expect(corps).not.toBe('');
      expect(corps).toContain('cheminDeDiapositive(');
      expect(corps).not.toMatch(/\.replace\(/);
    });
  });
});
