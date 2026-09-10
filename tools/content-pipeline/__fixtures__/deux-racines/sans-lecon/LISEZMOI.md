# Racine témoin PRÉSENTE mais VIDE

Ce dossier ne porte **aucune leçon** et **aucun `horaire.json`** — c'est tout ce qu'on lui
demande. Il reproduit l'état réel de `content/cours/php` avant sa première leçon : une racine
qu'on compile, qui rend zéro leçon, et qui ne doit faire échouer personne.

Ce fichier n'existe que pour que git puisse suivre le dossier : git ne versionne pas les
dossiers vides, et une racine « vide » qui disparaîtrait du dépôt ferait échouer sa fixture
sur une cause (racine introuvable) qui n'est pas celle qu'elle mesure.
