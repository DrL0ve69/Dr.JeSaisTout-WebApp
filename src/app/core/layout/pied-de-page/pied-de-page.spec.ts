// =============================================================================
// Tests de PiedDePage
// -----------------------------------------------------------------------------
// Un pied de page est presque impossible à « casser » fonctionnellement : ce que
// ces tests protègent, c'est ce qu'il ne doit PAS devenir. Les trois choses qui
// s'ajoutent dans un pied de page sans que personne ne le décide vraiment — un
// champ d'infolettre, un traceur, une adresse de contact — sont interdites en
// phase 1 (`.claude/rules/security.md` §4 : aucune PII incidentelle). D'où les
// assertions négatives : elles n'ont l'air de rien aujourd'hui, elles sont là
// pour le jour où quelqu'un « ajoute juste un petit formulaire ».
// =============================================================================

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { TestBed } from '@angular/core/testing';

import { PiedDePage } from './pied-de-page';

const DEPOT = 'https://github.com/DrL0ve69/Dr.JeSaisTout-WebApp';

async function rendre(): Promise<HTMLElement> {
  const fixture = TestBed.createComponent(PiedDePage);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

function sourceDuComposant(): string {
  return readFileSync(
    join(process.cwd(), 'src', 'app', 'core', 'layout', 'pied-de-page', 'pied-de-page.ts'),
    'utf8',
  );
}

describe('PiedDePage', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('rend un `footer` porteur du repère `contentinfo`', async () => {
    const rendu = await rendre();

    const pied = rendu.querySelector('footer');
    expect(pied).not.toBeNull();
    // Le rôle est explicite : `<footer>` ne mappe sur `contentinfo` que hors de
    // tout `<article>`/`<section>`, condition que ce composant ne contrôle pas.
    expect(pied?.getAttribute('role')).toBe('contentinfo');
  });

  it('nomme le site et son sujet', async () => {
    const rendu = await rendre();

    expect(rendu.textContent).toContain('Dr. Je-Sais-Tout');
    expect(rendu.textContent).toContain('sécurité des applications web');
  });

  it('pointe vers le dépôt public, en HTTPS, avec un intitulé qui se lit seul', async () => {
    const rendu = await rendre();

    expect(rendu.querySelectorAll('a').length).toBe(1);
    const lien = rendu.querySelector<HTMLAnchorElement>('a');
    expect(lien?.getAttribute('href')).toBe(DEPOT);
    // WCAG 2.4.4 : « ici » ou « lien » ne dit rien hors contexte.
    expect(lien?.textContent?.trim()).toBe('dépôt public sur GitHub');
  });

  it('n’ouvre pas de nouvel onglet — ou alors avec `rel` complet', async () => {
    // Un `target="_blank"` sans `rel="noopener"` donne à la page ouverte une
    // référence vers la nôtre. Le pied n'en ouvre aucun ; la règle est écrite
    // pour rester vraie si quelqu'un en ajoute un.
    const rendu = await rendre();

    for (const lien of rendu.querySelectorAll('a')) {
      if (lien.getAttribute('target') === '_blank') {
        expect(lien.getAttribute('rel')).toContain('noopener');
      }
    }
  });

  it('ne collecte RIEN : aucun formulaire, aucun champ, aucune adresse de contact', async () => {
    const rendu = await rendre();

    expect(rendu.querySelector('form')).toBeNull();
    expect(rendu.querySelector('input, textarea, select, button')).toBeNull();
    expect(rendu.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('ne contacte aucun tiers en dehors du dépôt du projet', async () => {
    // Une balise `<img>`/`<iframe>`/`<script>` vers un hôte externe est un
    // traceur, qu'elle soit présentée comme tel ou non — et elle casserait la CSP.
    const rendu = await rendre();

    expect(rendu.querySelector('img, iframe, script, link[rel="stylesheet"]')).toBeNull();
    for (const lien of rendu.querySelectorAll('a')) {
      expect(lien.getAttribute('href')).toBe(DEPOT);
    }
  });

  it('n’affiche aucune année, et ne consulte donc pas l’horloge', async () => {
    // `new Date()` dans un gabarit est interdit par les conventions Angular du
    // dépôt (aucune globale supposée), et une année en dur dans un site prerendu
    // devient fausse au 1er janvier suivant, silencieusement.
    expect(sourceDuComposant()).not.toContain('new Date');

    const rendu = await rendre();
    expect(rendu.textContent).not.toMatch(/\b(19|20)\d{2}\b/);
    expect(rendu.textContent).not.toContain('©');
  });

  it('ne fait AUCUN rendu HTML brut ni contournement de la sécurité Angular', () => {
    const source = sourceDuComposant();

    expect(source).not.toContain('innerHTML');
    expect(source).not.toContain('bypassSecurityTrust');
  });
});
