// =============================================================================
// Le comparateur de CSP servie MORD-IL ? (dette pré-E3-ST1, lot B)
// -----------------------------------------------------------------------------
// POURQUOI CE FICHIER EXISTE.
// `tools/deploiement/verifier-csp-servie.mjs` ne s'exécute QU'EN LIGNE, dans le job
// `publication` de `deploy.yml`, après un déploiement réel. Aucun développeur ne le
// lance, aucun gate local ne l'appelle : sans ce spec, il serait exactement ce que la
// dette S-003 décrit — un garde-fou exact, exécutable à la main, lancé par personne,
// donc invisible à toute régression (L-019, axe CÂBLAGE). Le lot qui PAIE cette dette
// ne peut pas la recréer d'un cran plus loin.
//
// LES DEUX MOITIÉS DE LA PINCE, dont aucune ne suffit seule :
//   1. Les politiques FAUTIVES sont refusées, chacune sur un message qui NOMME la
//      directive et le delta. Seul, ce constat est compatible avec un script qui
//      refuserait tout.
//   2. La politique CONFORME est acceptée, et son journal ÉNUMÈRE les directives
//      comparées. C'est l'autre moitié : un « OK » muet ne distinguerait pas une
//      comparaison réussie d'une comparaison qui n'a rien lu (L-005).
//
// LA RÉFÉRENCE EST LA VRAIE SOURCE VERSIONNÉE, pas une copie inventée ici. Si
// `config/staticwebapp.config.source.json` perdait ses jetons `__HACHAGES_*__`, ce
// fichier rougirait — une fixture recopiée ne le verrait pas (même choix que
// `config-swa-provenance-style.spec.ts`).
//
// POURQUOI PAR PROCESSUS FILS. Le script est un `.mjs` du TROISIÈME programme
// TypeScript (`tsconfig.tools.json`, Node pur) : l'importer le ferait entrer dans
// `tsconfig.spec.json`, qui n'a ni `allowJs` ni les types Node de l'outillage. On
// exécute donc la ligne de commande RÉELLE, celle que `deploy.yml` lance.
//
// ⚠️ LES CAPTURES D'EN-TÊTES SONT ÉCRITES EN CRLF, délibérément. `curl -D -` rend les
// en-têtes HTTP tels quels, terminés par CRLF ; un `\r` non retiré collerait un
// caractère invisible à la dernière source de la politique et ferait échouer TOUTE
// comparaison exacte sur un delta illisible (famille L-015).
// =============================================================================

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const SCRIPT = resolve('tools/deploiement/verifier-csp-servie.mjs');

/** La VRAIE source de configuration — voir l'en-tête. */
const CSP_SOURCE: string = ((): string => {
  const brut: unknown = JSON.parse(
    readFileSync(resolve('config/staticwebapp.config.source.json'), 'utf8'),
  );
  const entetes = (brut as { globalHeaders?: Record<string, string> }).globalHeaders ?? {};
  return entetes['Content-Security-Policy'] ?? '';
})();

/** Deux hachages plausibles, distincts, de forme réelle (`'sha256-' + base64`). */
const HACHAGE_A = "'sha256-47DEQpj8HBSa+/TImW+5JCeuQeRkm5NMpJWZG3hSuFU='";
const HACHAGE_B = "'sha256-K7gNU3sdo+OL0wNhqoVWhr3g6s1xYv72ol/pe/Unols='";
const HACHAGE_C = "'sha256-uU0nuZNNPgilLlLX2n2r+sSE7+N6U4DukIj3rOLvzek='";

/** La CSP telle que `generer-config-swa.mjs` l'écrirait : les deux jetons résolus. */
const CSP_ARTEFACT = CSP_SOURCE.replace('__HACHAGES_STYLE__', `${HACHAGE_A} ${HACHAGE_B}`).replace(
  '__HACHAGES_SCRIPT__',
  HACHAGE_C,
);

interface Resultat {
  readonly code: number;
  readonly sortie: string;
}

/** Écrit les trois documents dans un dossier jetable, lance le script réel, rend code + journal. */
function verifier(options: {
  readonly servie?: string | readonly string[];
  readonly artefact?: string;
  readonly source?: string;
}): Resultat {
  const dossier = mkdtempSync(join(tmpdir(), 'csp-servie-'));
  try {
    const politiquesServies =
      options.servie === undefined
        ? [CSP_ARTEFACT]
        : typeof options.servie === 'string'
          ? [options.servie]
          : options.servie;

    const lignes = ['HTTP/2 200', 'content-type: text/html; charset=utf-8'];
    for (const politique of politiquesServies) {
      lignes.push(`content-security-policy: ${politique}`);
    }
    const capture = join(dossier, 'entetes.txt');
    writeFileSync(capture, `${lignes.join('\r\n')}\r\n\r\n`, 'utf8');

    const artefact = join(dossier, 'artefact.json');
    writeFileSync(
      artefact,
      JSON.stringify({
        globalHeaders: { 'Content-Security-Policy': options.artefact ?? CSP_ARTEFACT },
      }),
      'utf8',
    );

    const source = join(dossier, 'source.json');
    writeFileSync(
      source,
      JSON.stringify({
        globalHeaders: { 'Content-Security-Policy': options.source ?? CSP_SOURCE },
      }),
      'utf8',
    );

    try {
      const stdout = execFileSync(
        process.execPath,
        [SCRIPT, '--entetes', capture, '--artefact', artefact, '--source', source],
        { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
      );
      return { code: 0, sortie: stdout };
    } catch (cause) {
      const echec = cause as { status?: number; stdout?: string; stderr?: string };
      return { code: echec.status ?? -1, sortie: `${echec.stdout ?? ''}${echec.stderr ?? ''}` };
    }
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
}

describe('CSP servie — comparaison structurelle (tools/deploiement/verifier-csp-servie.mjs)', () => {
  describe('la référence employée par ce spec est bien la source versionnée', () => {
    it('porte encore les deux jetons de hachages', () => {
      // Si la source cessait d'employer les jetons, tous les cas « jeton résolu en autre
      // chose qu'un hachage » ci-dessous testeraient le vide — verts pour rien (L-005).
      expect(CSP_SOURCE).toContain('__HACHAGES_STYLE__');
      expect(CSP_SOURCE).toContain('__HACHAGES_SCRIPT__');
      expect(CSP_ARTEFACT).not.toContain('__HACHAGES_');
    });
  });

  describe('la moitié qui ACCEPTE', () => {
    it('sort en 0 et ÉNUMÈRE les directives comparées quand les trois documents concordent', () => {
      const { code, sortie } = verifier({});
      expect(code).toBe(0);
      // Le journal fait foi : il doit nommer les directives, pas se contenter d'un « OK ».
      expect(sortie).toContain('directives comparées une à une');
      expect(sortie).toContain('default-src');
      expect(sortie).toContain('frame-ancestors');
      expect(sortie).toContain(HACHAGE_A);
    });

    it("accepte un ORDRE DE SOURCES différent — l'ordre n'a aucun sens en CSP", () => {
      const permutee = CSP_ARTEFACT.replace(
        `style-src 'self' ${HACHAGE_A} ${HACHAGE_B}`,
        `style-src ${HACHAGE_B} 'self' ${HACHAGE_A}`,
      );
      expect(permutee).not.toBe(CSP_ARTEFACT);
      expect(verifier({ servie: permutee }).code).toBe(0);
    });
  });

  describe('la moitié qui REFUSE — chaque refus NOMME la directive et le delta', () => {
    it('refuse une directive AFFAIBLIE côté servi, en la nommant', () => {
      // Le cas que les contrôles par motifs laissaient passer : `img-src` reste présente,
      // la CSP porte toujours `'self'`, `sha256-` et aucun `unsafe-*` — et pourtant elle
      // autorise désormais n'importe quelle image tierce.
      const affaiblie = CSP_ARTEFACT.replace("img-src 'self' data:", 'img-src * data:');
      const { code, sortie } = verifier({ servie: affaiblie });
      expect(code).toBe(1);
      expect(sortie).toContain('img-src');
      expect(sortie).toContain('DIFFÉRENTE');
      expect(sortie).toContain('sources en TROP');
    });

    it('refuse une directive ABSENTE de la CSP servie, en la nommant', () => {
      const amputee = CSP_ARTEFACT.replace("; object-src 'none'", '');
      expect(amputee).not.toBe(CSP_ARTEFACT);
      const { code, sortie } = verifier({ servie: amputee });
      expect(code).toBe(1);
      expect(sortie).toContain('Directive MANQUANTE');
      expect(sortie).toContain('object-src');
    });

    it('refuse une directive EXCÉDENTAIRE dans la CSP servie, en la nommant', () => {
      const { code, sortie } = verifier({
        servie: `${CSP_ARTEFACT}; frame-src https://exemple.invalide`,
      });
      expect(code).toBe(1);
      expect(sortie).toContain('Directive EXCÉDENTAIRE');
      expect(sortie).toContain('frame-src');
    });

    it('refuse une directive RÉPÉTÉE — les navigateurs ignorent la seconde occurrence', () => {
      const { code, sortie } = verifier({ servie: `${CSP_ARTEFACT}; script-src *` });
      expect(code).toBe(1);
      expect(sortie).toContain('PLUSIEURS FOIS');
      expect(sortie).toContain('script-src');
    });

    it("refuse un jeton résolu en un hachage MALFORMÉ — l'ancre du motif est ce qui garde", () => {
      // ⚠️ CE CAS EXISTE POUR L'ANCRE, pas pour le refus. Le contre-exemple
      // `'unsafe-inline'` juste en dessous ne contient pas `sha256-` : il resterait
      // refusé même si `SOURCE_HACHAGE` était relâché en `/sha256-/`, qui autoriserait
      // pourtant `https://malveillant.invalide/sha256-x`. Ici la valeur PORTE `sha256-`
      // et doit malgré tout être refusée, parce que `!!` n'appartient pas au base64.
      const artefactFautif = CSP_SOURCE.replace('__HACHAGES_STYLE__', "'sha256-abc!!'").replace(
        '__HACHAGES_SCRIPT__',
        HACHAGE_C,
      );
      const { code, sortie } = verifier({ servie: artefactFautif, artefact: artefactFautif });
      expect(code).toBe(1);
      expect(sortie).toContain('style-src');
      expect(sortie).toContain("n'est PAS un hachage");
      expect(sortie).toContain('sha256-abc!!');
    });

    it("refuse un hachage SANS APOSTROPHES — `sha256-…` nu n'est pas une source de hachage", () => {
      // L'autre moitié de l'ancre. Une CSP ne reconnaît un hachage QUE cité ; `sha256-…`
      // nu est lu comme un nom d'hôte, donc comme une source tierce autorisée en silence.
      const artefactFautif = CSP_SOURCE.replace(
        '__HACHAGES_STYLE__',
        HACHAGE_A.replaceAll("'", ''),
      ).replace('__HACHAGES_SCRIPT__', HACHAGE_C);
      const { code, sortie } = verifier({ servie: artefactFautif, artefact: artefactFautif });
      expect(code).toBe(1);
      expect(sortie).toContain('style-src');
      expect(sortie).toContain("n'est PAS un hachage");
    });

    it("refuse un jeton `__HACHAGES_*__` résolu en autre chose qu'un hachage", () => {
      // Le cœur de S-005 : la liste blanche reste NOMINATIVE. Un jeton ne résout que des
      // `'sha256-…'` — jamais un `'unsafe-inline'` glissé par une génération fautive.
      const artefactFautif = CSP_SOURCE.replace('__HACHAGES_STYLE__', "'unsafe-inline'").replace(
        '__HACHAGES_SCRIPT__',
        HACHAGE_C,
      );
      const { code, sortie } = verifier({ servie: artefactFautif, artefact: artefactFautif });
      expect(code).toBe(1);
      expect(sortie).toContain('style-src');
      expect(sortie).toContain("n'est PAS un hachage");
      expect(sortie).toContain('unsafe-inline');
    });

    it("refuse une source ajoutée sur une directive que la source versionnée ne marque d'AUCUN jeton", () => {
      const artefactFautif = CSP_ARTEFACT.replace(
        "connect-src 'self'",
        "connect-src 'self' https://exemple.invalide",
      );
      const { code, sortie } = verifier({ servie: artefactFautif, artefact: artefactFautif });
      expect(code).toBe(1);
      expect(sortie).toContain('connect-src');
      expect(sortie).toContain('AUCUN jeton');
    });

    it('refuse une directive que la génération a PERDUE par rapport à la source versionnée', () => {
      const artefactFautif = CSP_ARTEFACT.replace("; base-uri 'self'", '');
      const { code, sortie } = verifier({ servie: artefactFautif, artefact: artefactFautif });
      expect(code).toBe(1);
      expect(sortie).toContain("MANQUANTE dans la CSP de l'artéfact");
      expect(sortie).toContain('base-uri');
    });

    it('refuse une SOURCE perdue sur une directive que la génération a par ailleurs conservée', () => {
      // ⚠️ CE CAS N'EST PAS UN DOUBLON DU PRÉCÉDENT, et c'est le point. Retirer une
      // directive ENTIÈRE emprunte le chemin « Directive MANQUANTE » ; la branche
      // « a PERDU des sources » ne s'ouvre que si la directive SURVIT en ayant maigri.
      // Ici `style-src` garde ses deux hachages et perd son `'self'` : la politique
      // reste plausible à l'œil, et le site cesse pourtant de charger sa propre feuille.
      const artefactFautif = CSP_ARTEFACT.replace(
        `style-src 'self' ${HACHAGE_A} ${HACHAGE_B}`,
        `style-src ${HACHAGE_A} ${HACHAGE_B}`,
      );
      expect(artefactFautif).not.toBe(CSP_ARTEFACT);
      const { code, sortie } = verifier({ servie: artefactFautif, artefact: artefactFautif });
      expect(code).toBe(1);
      expect(sortie).toContain('PERDU des sources');
      expect(sortie).toContain('style-src');
      expect(sortie).toContain("'self'");
    });
  });

  describe("la moitié qui prouve qu'on a VU quelque chose (S-003)", () => {
    it('refuse une capture SANS en-tête `Content-Security-Policy`', () => {
      const { code, sortie } = verifier({ servie: [] });
      expect(code).toBe(1);
      expect(sortie).toContain('Aucun en-tête');
    });

    it('refuse DEUX en-têtes CSP servis — la politique effective est leur intersection', () => {
      const { code, sortie } = verifier({ servie: [CSP_ARTEFACT, "default-src 'none'"] });
      expect(code).toBe(1);
      expect(sortie).toContain('INTERSECTION');
    });

    it("refuse une configuration d'artéfact sans `globalHeaders` exploitable", () => {
      const { code, sortie } = verifier({ artefact: '   ' });
      expect(code).toBe(1);
      expect(sortie).toContain('Content-Security-Policy');
      expect(sortie).toContain('IMPOSSIBLE');
      // L'ÉTIQUETTE, pas seulement le refus : les deux documents traversent la même
      // fonction, et intervertir leurs deux étiquettes au point d'appel produirait un
      // message qui accuse la SOURCE pour une faute de l'ARTÉFACT — un refus juste sur un
      // coupable faux, c'est-à-dire une heure perdue à relire le mauvais fichier.
      expect(sortie).toContain("l'artéfact déployé");
    });

    it('refuse une SOURCE VERSIONNÉE sans `globalHeaders` exploitable, et nomme bien la source', () => {
      // Le miroir du cas ci-dessus. Sans lui, `lireCspDeConfig` n'était exercée que par le
      // chemin « artéfact » : l'interversion des étiquettes restait invisible.
      const { code, sortie } = verifier({ source: '   ' });
      expect(code).toBe(1);
      expect(sortie).toContain('IMPOSSIBLE');
      expect(sortie).toContain('source versionnée');
    });

    it('refuse une CSP servie à valeur BLANCHE — un en-tête présent mais creux', () => {
      // Le garde-fou anti-politique-vide, celui qui invoque S-003 nommément. L'en-tête
      // EXISTE (« aucun en-tête » mentirait), sa valeur ne porte aucune directive : sans
      // ce garde, l'analyse rendrait 0 directive et « deux ensembles vides sont égaux »
      // serait un vert qui ne prouve rien. On assertionne le MESSAGE et pas seulement le
      // code : neutraliser le garde laisserait le code à 1 par d'autres erreurs.
      const { code, sortie } = verifier({ servie: ' ' });
      expect(code).toBe(1);
      expect(sortie).toContain('Politique VIDE');
    });

    it("refuse une CSP de PONCTUATION SEULE côté artéfact — `lireCspDeConfig` ne l'arrête pas", () => {
      // La preuve que la clause `artefact.size === 0` du garde n'est PAS du code mort :
      // `lireCspDeConfig` ne refuse en amont que la chaîne vide ou blanche, et `";"` n'est
      // ni l'une ni l'autre. Elle traverse intacte et n'analyse en zéro directive qu'ici.
      const { code, sortie } = verifier({ artefact: ';' });
      expect(code).toBe(1);
      expect(sortie).toContain('Politique VIDE');
    });
  });
});
