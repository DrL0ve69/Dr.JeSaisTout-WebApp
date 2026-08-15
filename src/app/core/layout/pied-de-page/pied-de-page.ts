import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Pied de page du site — identique sur toutes les routes.
 *
 * Volontairement MINUSCULE, et c'est une décision de sécurité autant que de
 * design : en phase 1 le site n'a ni compte, ni formulaire, ni traceur
 * (`.claude/rules/security.md` §4). Un pied de page est l'endroit où ces trois
 * choses s'installent par habitude (« infolettre », « nous joindre », « analytics
 * juste pour voir »). Il n'y a donc ici que du texte et UN lien sortant, vers le
 * dépôt public du projet.
 *
 * Pas de mention de droit d'auteur datée : le dépôt interdit de supposer les
 * globales dans un gabarit (donc aucune lecture de l'horloge du navigateur), et
 * une année écrite en dur dans un site prerendu devient fausse au 1er janvier
 * suivant, silencieusement. La mention se passe d'année — elle n'en a pas besoin.
 * Le test `pied-de-page.spec.ts` interdit les deux, sur le source ET sur le rendu.
 *
 * Le `role="contentinfo"` est REDONDANT avec `<footer>`… à une condition que ce
 * composant ne contrôle pas : `<footer>` ne mappe sur `contentinfo` que s'il
 * n'est imbriqué dans aucun `<article>`/`<section>`/`<aside>`/`<nav>`. Le rôle
 * explicite rend donc l'intention vraie quel que soit le point de montage, sans
 * rien coûter. Le pied est monté à la racine de la coquille applicative.
 */
@Component({
  selector: 'app-pied-de-page',
  styleUrl: './pied-de-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <footer class="pied" role="contentinfo">
      <hr class="filet" />

      <p class="mention">
        <strong>Dr. Je-Sais-Tout</strong> — un cours public et gratuit sur la sécurité des
        applications web.
      </p>

      <p class="depot">
        Code et contenu du site&nbsp;:
        <a href="https://github.com/DrL0ve69/Dr.JeSaisTout-WebApp">dépôt public sur GitHub</a>.
      </p>
    </footer>
  `,
})
export class PiedDePage {}
