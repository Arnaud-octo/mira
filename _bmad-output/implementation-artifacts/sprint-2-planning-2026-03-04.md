# Sprint Planning — Sprint 2

**Date :** 2026-03-04
**Sprint Goal :** "Enrichir l'expérience utilisateur — rétrospective, filtrage Board, et rechargement automatique"
**Épics :** Epic 4 + Epic 5
**Durée :** 1 semaine

## Stories du Sprint

| # | **REF** — Story | Fichier | Priorité |
|---|---|---|---|
| 1 | **4-1** — Vue rétrospective de sprint | 4-1-vue-retrospective.md | 🔴 Haute |
| 2 | **4-2** — Filtrage par Epic sur le Board | 4-2-filtrage-board.md | 🟠 Moyenne |
| 3 | **5-1** — File watcher — rechargement auto | 5-1-file-watcher.md | 🔴 Haute |

## Contexte technique

### Story 4.1 — Rétrospective
Lire les fichiers `sprint-{N}-retro-{date}.md` dans `implementation-artifacts/`.
Format attendu (à définir avec l'équipe) :
- `**Ce qui a bien marché :**`
- `**Ce qui peut être amélioré :**`
- `**Actions pour le prochain sprint :**`

Afficher dans un nouvel onglet "Rétro" ou intégré à la vue Sprint.

### Story 4.2 — Filtrage Board
Ajouter une barre de filtres au-dessus du Board :
- Filtre par Epic (dropdown ou pills)
- Filtre par statut (déjà disponible via les colonnes)

### Story 5.1 — File watcher
Utiliser `fs.watch()` ou `chokidar` pour surveiller `_bmad-output/`.
Notifier le front via Server-Sent Events (SSE) ou polling léger.
Déclencher un refresh automatique du dashboard sans rechargement de page.

## Critères de succès du Sprint

- [ ] L'onglet Rétro (ou section) affiche les données d'une rétrospective existante
- [ ] Le Board peut être filtré par Epic
- [ ] Les modifications de fichiers .md relancent automatiquement le parsing
- [ ] `npm run test:all` reste vert (53+ tests)
- [ ] `npm run lint` sans erreur
