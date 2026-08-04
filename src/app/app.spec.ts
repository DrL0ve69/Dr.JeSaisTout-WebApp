import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    }).compileComponents();
  });

  it('crée le composant racine', () => {
    const fixture = TestBed.createComponent(App);
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('affiche la page « bientôt » en français', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const rendu = fixture.nativeElement as HTMLElement;

    expect(rendu.querySelector('h1')?.textContent).toContain('Dr. Je-Sais-Tout');
    expect(rendu.textContent).toContain('sécurité des applications web');
  });

  // WCAG 2.2 — 1.3.1 : une seule structure de titre de premier niveau par page.
  // Garde-fou posé dès maintenant pour qu'il casse si E1 en ajoute un second par accident.
  it("n'expose qu'un seul h1", async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const rendu = fixture.nativeElement as HTMLElement;

    expect(rendu.querySelectorAll('h1').length).toBe(1);
  });
});
