# Story 4.6: Ordonnancement des tickets dans Backlog et Ready for dev

Status: backlog

## Story

En tant qu'utilisateur de Mira, je veux pouvoir réordonner les tickets dans les colonnes Backlog et Ready for dev par glisser-déposer vertical, afin de prioriser visuellement les stories à traiter en premier.

## Acceptance Criteria

1. Uniquement dans les colonnes Backlog et Ready for dev, les cartes sont réordonnables par drag & drop vertical
2. L'ordre est persisté dans un fichier `_bmad-output/board-order.json`
3. Au rechargement du dashboard, l'ordre sauvegardé est conservé
4. Les colonnes Dev in progress, Review, QA et Done ne sont pas rmodifiable (ordre naturel)
5. Le drag & drop existant (changement de colonne) continue de fonctionner normalement

## Tasks / Subtasks

- [ ] Créer le fichier story
- [ ] Implémenter la persistance de l'ordre dans `board-order.json` (server.js — GET/PATCH /api/board-order)
- [ ] Ajouter la logique de tri dans le rendu des colonnes Backlog et Ready for dev (app.js)
- [ ] Implémenter le drag & drop vertical intra-colonne (app.js)
- [ ] Sauvegarder l'ordre après chaque drop via PATCH /api/board-order
- [ ] Tests et lint
