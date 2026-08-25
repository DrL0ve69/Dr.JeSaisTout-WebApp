# Ancrage au cours — séances, diapositives et portée d'examen

> **Ce que c'est.** Le contrat qui relie chaque module publié à la **séance du cours réel** qu'il
> couvre, et chaque affirmation de cours à la **diapositive** qui la porte. Décidé par le
> propriétaire le **2026-08-25**, après le constat que les 13 modules planifiés suivaient l'ordre
> OWASP d'une **édition antérieure** du cours et non l'horaire du millésime 2026.
>
> Cousin : [`pipeline-contenu.md`](pipeline-contenu.md) (le contrat de compilation) et
> `.claude/rules/contenu-pedagogique.md` §6 (la règle de provenance 📘 / 🧩 / ⚠️).

## 0 · Le constat qui a rendu ce contrat nécessaire

Le cours **420-B10-HU « Sécurisation des applications web »** (automne 2026, Alexandre
Mageau-Pétrin, Cégep de l'Outaouais) est un cours **serveur et système** avant d'être un cours
OWASP : ses séances 2 à 5 traitent Linux, SSH/UFW, `cron` et les comptes utilisateurs. Les six
premiers modules du site ont pourtant été écrits dans l'ordre OWASP (injection → XSS → CSRF →
contrôle d'accès), qui est l'ordre d'une **édition antérieure**.

Conséquence mesurée : au 2026-08-25, **aucun** des trois modules de l'examen 1 n'existait, et ils
étaient planifiés **en dernier** au backlog (E3-ST14 à ST16).

**La portée de l'examen 1 est fixée par le cours lui-même** : `Cours05_Securite_utilisateurs.pptx`,
diapositive 21 — « *Au prochain cours, ce sera l'examen 1. Celui-ci couvrira la matière des cours
1 à 4.* » La séance 5 n'y est **pas**.

⚠️ **Contradiction relevée dans les documents de l'enseignant, non tranchée.** L'horaire publié
annonce **Examen 1 : 20 % · Projet : 20 % · Examen final : 60 %** ; la diapositive 6 du Cours 1
annonce **25 % · 15 % · 60 %**. `horaire.json` retient les valeurs de **l'horaire**, qui est le
document contractuel. À faire confirmer par le propriétaire auprès de l'enseignant.

## 1 · `content/cours/<sujet>/horaire.json` — la source unique de vérité

Un fichier par sujet, à côté des dossiers de modules. Il porte l'horaire réel du cours et **rien
d'autre** ; aucun module ne recopie son contenu.

```jsonc
{
  "sujet": "securite-web",
  "cours": {
    "code": "420-B10-HU",
    "titre": "Sécurisation des applications web",
    "enseignant": "Alexandre Mageau-Pétrin",
    "etablissement": "Cégep de l'Outaouais",
    "session": "Automne 2026"
  },
  "seances": [
    { "numero": 1, "date": "2026-08-07", "titre": "Introduction à la sécurité des applications web" },
    { "numero": 2, "date": "2026-08-14", "titre": "Gestion d'environnement infonuagique" },
    { "numero": 3, "date": "2026-08-21", "titre": "Sécurité de la communication serveur" },
    { "numero": 4, "date": "2026-08-28", "titre": "Automatisation des tâches de surveillance et nettoyage" },
    { "numero": 5, "date": "2026-09-04", "titre": "Sécurité des utilisateurs" },
    { "numero": 6, "date": "2026-09-11", "titre": "Examen 1",
      "evaluation": { "libelle": "Examen 1", "ponderation": 20, "portee": [1, 2, 3, 4] } },
    { "numero": 7, "date": "2026-09-18", "titre": "Sécurité du code" },
    { "numero": 8, "date": "2026-09-25", "titre": "Sécurité des services web et certificat HTTPS" },
    { "numero": 9, "date": "2026-10-02", "titre": "Sécurité des bases de données" },
    { "numero": 10, "date": "2026-10-09", "titre": "Sécurité des mécanismes d'authentification et autorisation" },
    { "numero": 11, "date": "2026-10-16", "titre": "Projet de session",
      "evaluation": { "libelle": "Projet de session", "ponderation": 20 } },
    { "numero": 12, "date": "2026-10-23", "titre": "Révision" },
    { "numero": 13, "date": "2026-10-30", "titre": "Examen final",
      "evaluation": { "libelle": "Examen final", "ponderation": 60,
                      "portee": [1, 2, 3, 4, 5, 7, 8, 9, 10] } }
  ]
}
```

**Pourquoi un fichier et pas des champs recopiés dans chaque frontmatter.** Le titre d'une séance
et sa date sont la **même information pour cinq modules** quand une séance en donne cinq. Recopiée,
elle diverge — et rien ne le signalerait. C'est le mode d'échec « deux sources disent deux fois la
même chose » que `valider.mjs` §3 existe déjà pour attraper sur le couple dossier ↔ frontmatter.

## 2 · `seance` — le seul champ neuf du frontmatter

```yaml
seance: 2      # entier 1-13, OPTIONNEL
```

- **Absent** = module **complémentaire, hors cours**. Il s'affiche « Complément · hors cours » et
  n'apparaît dans la portée d'aucun examen. C'est le cas de `evaluation-cvss`, `jwt` et
  `en-tetes-securite-http`, mesurés à **0 📘** au recensement de provenance du 2026-08-19.
- **Présent** : le numéro DOIT exister dans `horaire.json`, et cette séance **ne doit pas porter
  d'`evaluation`** — il n'y a pas de module « Examen 1 ».
- **Plusieurs modules peuvent partager une même séance.** La séance 7 « Sécurité du code » en donne
  cinq. Le rang dans la séance (« 1/5 ») est **dérivé** par le compilateur depuis `ordre`, jamais
  écrit à la main.

🔴 **`ordre` ne devient PAS le numéro de séance.** `ordre` reste la position de lecture, unique, et
égale au préfixe `nn` du dossier — c'est déjà le contrat de `valider.mjs` §3, et une séance à cinq
modules le rendrait insatisfiable. L'alignement 01→05 = séances 1→5 est un **heureux hasard**
d'ordonnancement, pas une règle : ne bâtis rien qui en dépende.

## 3 · Le renvoi de diapositives sur les encadrés

```markdown
::: cours {diapos="13, 17"}
Le modèle en couches de la responsabilité partagée…
:::

::: cours {seance="5" diapos="45-50"}
Un module peut citer la diapositive d'une AUTRE séance que la sienne.
:::

::: correction-du-cours {source="NIST SP 800-63B rév. 4, §3.1.1" diapos="92"}
La diapositive 92 impose quatre classes de caractères ; la doctrine 2026 les proscrit.
:::
```

| Variante | `source` | `diapos` / `seance` |
|---|---|---|
| `cours` | **refusé** | **autorisés** |
| `complement` | **refusé** | **refusés** — un complément ne vient pas du cours |
| `correction-du-cours` | **obligatoire** | **autorisés** — c'est là que se compare la méthode du cours à la pratique moderne |
| `attention`, `note`, `a-retenir`, `vulnerable`, `corrige`, `comparaison` | refusé | refusés |

**Grammaire de `diapos`** : numéros et plages séparés par des virgules, `"13"`, `"13, 17"`,
`"45-50"`, `"13, 17, 45-50"`. Entiers ≥ 1, strictement croissants d'un jeton au suivant, bornes de
plage croissantes. Toute autre forme fait **échouer le build** en nommant le jeton fautif — un
renvoi faux envoie l'étudiant réviser la mauvaise diapositive, en silence.

**`seance` sur l'encadré** : optionnel, vaut par défaut le `seance` du frontmatter. **Obligatoire**
si le frontmatter n'en a pas — sans quoi le renvoi ne désigne rien.

## 4 · Ce que le contrat compilé gagne

```ts
// BlocContenu, variante encadre
| {
    type: 'encadre';
    variante: VarianteEncadre;
    source?: string;
    /** Renseigné UNIQUEMENT sur `cours` et `correction-du-cours`. Plages déjà dépliées. */
    renvoiCours?: { seance: number; diapos: number[] };
    blocs: BlocContenu[];
  }
```

`LeconCompilee['frontmatter']` gagne `seance?: number`.
`EntreeManifesteRoutes` gagne `seance?: number`.
Le manifeste de routes gagne, **une fois par sujet**, l'horaire compilé — le sommaire en a besoin
pour intercaler les jalons d'évaluation sans relire `content/` au runtime.

## 5 · Ce que le lecteur voit

**(a) Étiquette d'encadré.** « 📘 COURS · Séance 2 · diapos 13, 17 ». Sans renvoi, l'étiquette
reste « 📘 COURS » — le contrat n'oblige personne à renseigner des diapositives.

**(b) En-tête de page de leçon.** « Séance 2 · Gestion d'environnement infonuagique », et la
pastille **« À l'examen 1 »** quand la séance est dans la `portee` d'une évaluation à venir. Un
module sans `seance` porte « Complément · hors cours ».

**(c) Sommaire du cours.** Les modules dans l'ordre de lecture, chacun annonçant sa séance, et les
**jalons d'évaluation intercalés** à leur position d'horaire : « ── Examen 1 · 11 septembre ·
séances 1 à 4 ── ».

⚠️ **WCAG 2.2 AA — la pastille ne peut pas être qu'une couleur** (1.4.1, l'information ne doit pas
passer par la seule couleur). Elle porte un **texte explicite**, et son contraste se mesure comme
toute paire du design system. Même exigence pour la séance : c'est un mot, pas une teinte.
