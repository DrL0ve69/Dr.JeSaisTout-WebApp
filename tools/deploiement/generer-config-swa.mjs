#!/usr/bin/env node
/**
 * Génère le `staticwebapp.config.json` de l'artéfact de déploiement.
 *
 * Pourquoi ce script existe (voir addendum S-02, `docs/architecture/stack-et-architecture.md` §9) :
 * chaque page prerendue porte un bloc `<style ng-app-id>` produit par Angular. Une CSP stricte
 * (sans `unsafe-inline`) ne peut l'autoriser que par **hachage**, et ce hachage change à chaque
 * modification de style. Une CSP recopiée à la main se désynchronise donc au premier changement —
 * d'où la génération.
 *
 * `config/staticwebapp.config.source.json` est la SOURCE : elle contient tout sauf les hachages,
 * marqués par le jeton `__HACHAGES_STYLE__`. Ce script la résout et écrit le résultat dans `dist/`,
 * qui est l'artéfact réellement déployé sur Azure Static Web Apps.
 *
 * ⚠️ La source ne s'appelle **pas** `staticwebapp.config.json` et ne vit **pas** à la racine, à
 * dessein : `swa start` (et potentiellement le déploiement) résout ce nom depuis le répertoire
 * courant, pas depuis le dossier servi. Un fichier portant ce nom à la racine serait donc servi tel
 * quel — jeton non résolu compris, ce qui produit un `style-src` invalide et un site sans styles.
 * Constaté en local le 2026-08-03.
 *
 * Il sert aussi de GARDE-FOU : il échoue si la sortie contient un gestionnaire d'événement inline
 * ou un script inline exécutable, deux choses que la CSP bloquerait *silencieusement* en production.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative } from 'node:path';

const RACINE = process.cwd();
const SOURCE = join(RACINE, 'config', 'staticwebapp.config.source.json');
const ARTEFACT = join(RACINE, 'dist', 'dr-je-sais-tout', 'browser');
const JETON = '__HACHAGES_STYLE__';

/** Liste récursivement les fichiers `.html` de l'artéfact. */
function fichiersHtml(dossier) {
  const sortie = [];
  for (const entree of readdirSync(dossier)) {
    const chemin = join(dossier, entree);
    if (statSync(chemin).isDirectory()) sortie.push(...fichiersHtml(chemin));
    else if (entree.endsWith('.html')) sortie.push(chemin);
  }
  return sortie;
}

function echec(message, details = []) {
  console.error(`\n✖ generer-config-swa : ${message}`);
  for (const d of details) console.error(`   · ${d}`);
  console.error('');
  process.exit(1);
}

// --- 1. Vérifications préalables ---------------------------------------------
let source;
try {
  source = readFileSync(SOURCE, 'utf8');
} catch {
  echec(`source introuvable : ${relative(RACINE, SOURCE)}`);
}
if (!source.includes(JETON)) {
  echec(`le jeton ${JETON} est absent de la source`, [
    'La directive style-src doit contenir ce jeton pour que les hachages y soient injectés.',
  ]);
}

let pages;
try {
  pages = fichiersHtml(ARTEFACT);
} catch {
  echec(`artéfact introuvable : ${relative(RACINE, ARTEFACT)}`, ['Lancer `ng build` avant ce script.']);
}
if (pages.length === 0) echec('aucune page HTML dans l’artéfact — le prerender a-t-il tourné ?');

// --- 2. Garde-fou : rien que la CSP casserait en silence ----------------------
const infractions = [];
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  const nom = relative(ARTEFACT, page);

  for (const m of html.matchAll(/ (on[a-z]+)="/g)) {
    infractions.push(`${nom} : gestionnaire d’événement inline « ${m[1]} » — bloqué par script-src`);
  }
  for (const m of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    const corps = m[2].trim();
    const estDonnees = /type\s*=\s*"(application\/json|application\/ld\+json|importmap|speculationrules)"/.test(attrs);
    if (corps && !/\bsrc\s*=/.test(attrs) && !estDonnees) {
      infractions.push(`${nom} : script inline exécutable (${corps.length} o) — bloqué par script-src`);
    }
  }
  if (/ style="/.test(html)) {
    const n = (html.match(/ style="/g) || []).length;
    infractions.push(`${nom} : ${n} attribut(s) style inline — bloqué(s) par style-src (les hachages ne couvrent pas les attributs)`);
  }
}
if (infractions.length) {
  echec('la sortie prerendue est incompatible avec la CSP stricte', [
    ...infractions.slice(0, 15),
    ...(infractions.length > 15 ? [`… et ${infractions.length - 15} autre(s)`] : []),
    'Piste la plus fréquente : `optimization.styles.inlineCritical` doit rester à false (addendum S-02).',
  ]);
}

// --- 3. Hachages des blocs <style> --------------------------------------------
const hachages = new Set();
for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const m of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)) {
    hachages.add(`'sha256-${createHash('sha256').update(m[1], 'utf8').digest('base64')}'`);
  }
}

// --- 4. Écriture de l'artéfact -------------------------------------------------
const resolu = source.replaceAll(JETON, [...hachages].join(' ')).replace(/\s+style-src 'self' ;/, " style-src 'self';");
JSON.parse(resolu); // garde-fou : la substitution doit laisser un JSON valide
writeFileSync(join(ARTEFACT, 'staticwebapp.config.json'), resolu);

console.log(`✔ staticwebapp.config.json généré dans ${relative(RACINE, ARTEFACT)}`);
console.log(`  ${pages.length} page(s) inspectée(s), ${hachages.size} hachage(s) de style distinct(s)`);
if (hachages.size === 0) console.log('  (aucun bloc <style> inline — style-src reste à \'self\')');
