# Fixture — le conteneur `marche-a-suivre` (décision D-A, 2026-08-31)

Une racine **valide** à deux modules, écrite pour exercer les deux formes de renvoi d’une étape.
C’est le contrôle **positif** du lot 3 ; les deux contrôles **négatifs** vivent dans
`../invalides/voir-titre-ambigu` et `../invalides/voir-module-non-publiee`, qui sont des copies de
cette racine à une faute près.

| Module | `statut` | Rôle |
|---|---|---|
| `01-cible` | `publiee` | la **cible** d’un `{voir="module:cible"}` — son seul rôle est d’être réellement prerendue |
| `02-guide` | `brouillon` | porte le `:::: marche-a-suivre`, ses trois étapes et ses deux renvois |

**Pourquoi DEUX modules.** Un `{voir="module:<slug>"}` se juge contre les **autres** leçons du
sujet : la règle vit dans `validerRacine` et dans `compilerRacine`, seules à les voir toutes. Une
racine d’un seul module ne pourrait exercer que le refus, jamais l’acceptation.

**Ce que `02-guide` couvre, étape par étape** — chacune ajoute exactement une chose :

1. `{voir="Ce que le validateur regarde"}` **+ un bloc de code** — la section visée est **plus bas
   dans le document que la marche elle-même**. C’est ce qui prouve que la résolution se fait en
   **second temps** : au fil de l’eau, le titre n’existe pas encore.
2. `{voir="module:cible"}` — la forme inter-modules, dont le statut de la cible est confronté.
3. Ni renvoi ni code — les deux sont optionnels, et une étape nue doit rester légale.

⚠️ **Ne pas renommer « Ce que le validateur regarde » sans corriger les trois racines.** Le renvoi
cite ce titre par son **texte**, et les deux fixtures invalides en sont des copies.
