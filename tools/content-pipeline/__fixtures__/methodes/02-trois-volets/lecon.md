---
titre: "Le conteneur d'onglets à TROIS volets"
slug: trois-volets
sujet: securite-web
ordre: 2
niveau: cegep                 # maternelle | primaire | secondaire | cegep | universite
duree-estimee: 5
objectifs:
  - "Prouver que le compilateur accepte un conteneur d'onglets à trois volets"
  - "Servir de contrôle positif à la borne haute du contrat (3 volets)"
  - "Prouver qu'un volet admet du contenu de bloc général, pas seulement du code"
prerequis: []
fiches-sources:
  - web/securite/fondamentaux-securite-web.md
cree: 2026-09-06
maj: 2026-09-06
statut: brouillon
---

# Le conteneur d'onglets à TROIS volets

## L'idée en une image

Trois volets d'un conteneur d'onglets se comportent comme trois portes d'un même hall :
elles mènent toutes à la salle, et le visiteur n'en pousse qu'une. L'analogie casse ici :
une porte condamnée reste visible, alors qu'un volet non choisi disparaît du texte servi.

## Les trois chemins vers la même tâche

Le conteneur ci-dessous est la forme la plus longue que le contrat admette. Le premier volet
montre en outre qu'un volet accepte du contenu de bloc GÉNÉRAL — de la prose et une liste —
et pas seulement un bloc de code.

:::: methodes

::: methode {libelle="La méthode du cours"}

Le cours installe le gestionnaire de dépendances depuis le dépôt de la distribution.

- l'installation est courte à énoncer ;
- la version livrée est celle que la distribution a figée.

```bash
apt install composer
```

:::

::: methode {libelle="L'installeur amont" defaut}

L'installeur publié par le projet donne la dernière version, indépendante de la distribution.

```bash
php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"
```

:::

::: methode {libelle="Le conteneur jetable"}

Une image jetable rend le même résultat sans rien installer sur la machine hôte.

```bash
docker run --rm -v "$PWD:/app" composer install
```

:::

::::

## Exemple simple

Le frontmatter ci-dessus est l'exemple le plus court qui satisfasse le schéma : douze champs,
aucun de plus (`additionalProperties: false`), aucun de moins.

## Exemple complet

Un bloc de code est EXEMPTÉ des règles typographiques et de la liste fermée de conteneurs.
Le bloc qui suit contient les deux transgressions, et cette leçon reste pourtant valide —
c'est le contrôle positif de l'exemption :

```bash
# Une espace fine insécable (U+202F) dans du code d'exemple : tolérée.
# ::: conteneur-inventé  ← toléré aussi, parce que ce sont des données, pas du balisage.
echo 'la langue de la cloture appartient a la liste fermee du contrat'
```

## À toi de jouer

Le quiz de cette leçon vit dans `quiz.json`, à côté de ce fichier. Le marqueur ci-dessous dit au
compilateur OÙ l'insérer dans la page (bloc `ancre-quiz` du contrat).

[[quiz]]

## À retenir

- Le marqueur `defaut` n'est pas tenu de porter sur le PREMIER volet : ici, il porte sur le second.
- Un volet admet du contenu de bloc général, encadré compris — comme un encadré en admet.
- Trois volets est la borne haute ; un quatrième serait un sommaire déguisé.

## Aller plus loin

- `docs/contenu/pipeline-contenu.md` — le contrat dont ce fichier exerce la borne haute.
- `.claude/rules/contenu-pedagogique.md` — la barre de qualité, que ce témoin ne prétend pas franchir.
