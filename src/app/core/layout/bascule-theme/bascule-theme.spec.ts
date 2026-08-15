// =============================================================================
// Tests de BasculeTheme — le contrôle visible du thème
// -----------------------------------------------------------------------------
// Ce que ces tests protègent, et qu'une relecture ne protège pas :
//
//  · LE GROUPE. Trois radios ne forment un groupe que par leur `name` commun.
//    Le jour où quelqu'un « nettoie » ce name (ou le rend unique par option pour
//    faire taire un doublon imaginaire), le contrôle continue de s'afficher
//    exactement pareil — mais devient trois cases à cocher indépendantes, sans
//    flèches, sans « 2 sur 3 » annoncé, et cochables toutes les trois.
//  · LE NOM DU GROUPE. Le `<legend>` est ce qu'un lecteur d'écran annonce avant
//    chaque option. Sans lui, on entend « Clair, bouton radio » sans savoir de
//    quoi il s'agit.
//  · L'ÉTAT AFFICHÉ. `checked` doit suivre `choix()` — y compris quand le thème
//    change AILLEURS (le service est un singleton).
//  · LE DÉCALAGE DE PRERENDER, qui est un constat assumé et non un bug : voir le
//    groupe du même nom, en bas.
//
// ⚠️ L-012 (« un test qui importe la constante qu'il vérifie ne vérifie rien du
// contrat »). Les libellés sont donc écrits EN CLAIR ici, jamais importés du
// composant : renommer « Système » en « Auto » doit sortir rouge. À l'inverse, on
// itère bien sur `THEMES` importé du SERVICE pour les VALEURS — c'est l'autre
// extrémité du contrat, celle que `definir()` accepte.
//
// L'élément `<html>` et `localStorage` sont PARTAGÉS par tout le run : remis à
// zéro avant ET après chaque test, sinon un test qui épingle « sombre » fait
// échouer le suivant (même précaution que `theme.spec.ts`).
// =============================================================================

import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ATTRIBUT_THEME, CLE_THEME, THEMES, ThemeService } from '../../theme/theme';
import { BasculeTheme } from './bascule-theme';

/** Le libellé attendu de chaque état, écrit à la main — cf. L-012 ci-dessus. */
const LIBELLES_ATTENDUS = ['Clair', 'Sombre', 'Système'] as const;

function racine(): HTMLElement {
  return document.documentElement;
}

function stockage(): Storage {
  const vue = document.defaultView;
  if (!vue) {
    throw new Error('Aucune fenêtre : ces tests exigent un environnement DOM.');
  }
  return vue.localStorage;
}

function radios(fixture: ComponentFixture<BasculeTheme>): HTMLInputElement[] {
  const hote = fixture.nativeElement as HTMLElement;
  return [...hote.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
}

/** La valeur de l'unique radio coché, ou `undefined` si aucun ne l'est. */
function valeurCochee(fixture: ComponentFixture<BasculeTheme>): string | undefined {
  const coches = radios(fixture).filter((radio) => radio.checked);
  expect(coches.length, 'un groupe de radios n’a jamais plus d’un coché').toBeLessThanOrEqual(1);
  return coches[0]?.value;
}

async function creer(): Promise<ComponentFixture<BasculeTheme>> {
  const fixture = TestBed.createComponent(BasculeTheme);
  await fixture.whenStable();
  return fixture;
}

describe('BasculeTheme', () => {
  beforeEach(() => {
    stockage().clear();
    racine().removeAttribute(ATTRIBUT_THEME);
    TestBed.configureTestingModule({ imports: [BasculeTheme] });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    stockage().clear();
    racine().removeAttribute(ATTRIBUT_THEME);
  });

  describe('rendu du groupe', () => {
    it('rend une option par état du service, avec son libellé français', async () => {
      const fixture = await creer();

      const valeurs = radios(fixture).map((radio) => radio.value);
      const libelles = radios(fixture).map((radio) =>
        (radio.closest('label')?.textContent ?? '').trim(),
      );

      expect(valeurs).toEqual([...THEMES]);
      expect(libelles).toEqual([...LIBELLES_ATTENDUS]);
    });

    it('groupe les trois radios sous UN SEUL `name`', async () => {
      // Sans `name` commun, ce ne sont plus des boutons radio : trois cases
      // cochables ensemble, sans navigation aux flèches ni annonce « n sur 3 ».
      // Le rendu, lui, serait identique — d'où ce test.
      const fixture = await creer();

      const noms = new Set(radios(fixture).map((radio) => radio.name));

      expect(noms.size).toBe(1);
      expect([...noms][0]).not.toBe('');
    });

    it('donne au groupe un nom accessible porté par son `<legend>`', async () => {
      // Le `<legend>` d'un `<fieldset>` EST le nom accessible du groupe. Le
      // remplacer par un `<p>` stylé pareil laisserait le contrôle anonyme.
      const fixture = await creer();
      const hote = fixture.nativeElement as HTMLElement;

      const groupe = hote.querySelector('fieldset');
      const legende = groupe?.querySelector(':scope > legend');

      expect(groupe).not.toBeNull();
      // Apostrophe typographique U+2019, comme partout ailleurs dans le texte
      // visible du site : une apostrophe ASCII ici sortirait rouge, et c'est
      // voulu — le libellé est du texte de produit, pas du code.
      expect(legende?.textContent?.trim()).toBe('Thème d’affichage');
    });
  });

  describe('état affiché', () => {
    it('coche « Système » quand rien n’est épinglé', async () => {
      const fixture = await creer();

      expect(valeurCochee(fixture)).toBe('systeme');
    });

    it('coche l’état RELU du stockage, et lui seul', async () => {
      // Le service lit `localStorage` à l'injection : la bascule doit donc
      // s'afficher déjà juste au premier rendu, sans clic.
      stockage().setItem(CLE_THEME, 'sombre');

      const fixture = await creer();

      expect(valeurCochee(fixture)).toBe('sombre');
    });

    it('suit un changement de `choix()` survenu AILLEURS', async () => {
      // Le service est un singleton : un autre écran (ou un futur second
      // contrôle) peut changer le thème. L'affichage doit suivre le signal, pas
      // seulement les clics reçus.
      const fixture = await creer();
      const service = TestBed.inject(ThemeService);
      expect(valeurCochee(fixture)).toBe('systeme');

      service.definir('clair');
      await fixture.whenStable();

      expect(valeurCochee(fixture)).toBe('clair');
    });
  });

  describe('interaction', () => {
    it('épingle l’état de l’option activée, pour chacune des trois', async () => {
      for (const attendu of THEMES) {
        // On part TOUJOURS d'un autre état que celui visé : un radio déjà coché
        // n'émet pas d'événement `change` quand on le réactive (comportement
        // natif, pas un défaut du composant). Sans ce décalage de départ, le cas
        // « systeme » — l'état initial — ne testerait rien du tout.
        const depart = attendu === 'clair' ? 'sombre' : 'clair';

        TestBed.resetTestingModule();
        racine().removeAttribute(ATTRIBUT_THEME);
        stockage().setItem(CLE_THEME, depart);
        TestBed.configureTestingModule({ imports: [BasculeTheme] });

        const fixture = await creer();
        expect(valeurCochee(fixture), `état de départ pour « ${attendu} »`).toBe(depart);

        const service = TestBed.inject(ThemeService);
        const definir = vi.spyOn(service, 'definir');
        const cible = radios(fixture).find((radio) => radio.value === attendu);

        // `click()` plutôt qu'un `change` fabriqué : c'est le navigateur qui
        // coche le radio ET émet l'événement, exactement comme en vrai.
        cible?.click();
        await fixture.whenStable();

        expect(definir, `option « ${attendu} »`).toHaveBeenCalledExactlyOnceWith(attendu);
        expect(service.choix()).toBe(attendu);
        expect(valeurCochee(fixture)).toBe(attendu);
      }
    });

    it('n’appelle `definir` sur AUCUN autre état que celui activé', async () => {
      const fixture = await creer();
      const service = TestBed.inject(ThemeService);
      const definir = vi.spyOn(service, 'definir');

      radios(fixture)
        .find((radio) => radio.value === 'sombre')
        ?.click();
      await fixture.whenStable();

      expect(definir).toHaveBeenCalledTimes(1);
      expect(definir).not.toHaveBeenCalledWith('clair');
      expect(definir).not.toHaveBeenCalledWith('systeme');
    });
  });

  // ===========================================================================
  // LE DÉCALAGE DE PRERENDER — un constat ASSUMÉ, écrit ici pour qu'il ne soit
  // pas « corrigé » par accident.
  // ---------------------------------------------------------------------------
  // `outputMode: "static"` prerend toutes les routes dans Node : le fichier HTML
  // livré coche donc TOUJOURS « Système », même pour un visiteur qui a épinglé
  // « sombre » — le script anti-flash a déjà peint la page en sombre, mais le
  // balisage, lui, sort de la construction et est le MÊME pour tout le monde.
  //
  // La tentation, en découvrant ça, est d'écrire l'état du visiteur dans le HTML
  // prerendu. Ce serait épingler le choix d'UNE personne sur la page servie à
  // TOUTES, jusqu'à la reconstruction suivante. Le décalage est corrigé à
  // l'hydratation ; sans JavaScript, la bascule affiche un état qu'elle ne peut
  // pas changer, ce qui est acceptable puisque rien d'autre sur le site ne dépend
  // de JS pour être lu.
  // ===========================================================================
  describe('prerender (Node, `PLATFORM_ID` serveur)', () => {
    it('coche « Système » même quand un thème est épinglé — et ne touche à rien', async () => {
      const lecture = vi.spyOn(Storage.prototype, 'getItem');
      stockage().setItem(CLE_THEME, 'sombre');
      lecture.mockClear();

      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        imports: [BasculeTheme],
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      });
      const fixture = await creer();

      expect(valeurCochee(fixture)).toBe('systeme');
      // Le HTML prerendu ne doit épingler AUCUN thème sur `<html>`…
      expect(racine().hasAttribute(ATTRIBUT_THEME)).toBe(false);
      // …et le rendu serveur ne doit même pas TENTER de lire le stockage : dans
      // Node il n'existe pas, l'accès casserait le prerender de toutes les routes.
      expect(lecture).not.toHaveBeenCalled();
    });
  });
});
