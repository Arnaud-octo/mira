# Sprint Rétrospective — Sprint 1

**Date :** 2026-03-04
**Sprint :** Sprint 1 — Fondations
**Participants :** Équipe Mira

## Ce qui a bien marché

- Toutes les 13 stories livrées en 1 semaine — objectif 100% atteint
- Parser BMAD opérationnel dès la story 1.1, base solide pour tout le reste
- 53 tests (22 unit + 31 E2E) mis en place dès le Sprint 1 — qualité ancrée tôt
- CI GitHub Actions verte sur Node 18/20/22 en une seule itération
- ESLint flat config bien structurée, zéro dette technique dès le départ
- Vue Board Kanban fonctionnelle avec drag & drop et sauvegarde auto dans les Markdown

## Ce qui peut être amélioré

- Les 6 colonnes Kanban (Backlog → Done) n'étaient pas prévues dès le départ — ajout tardif
- Pas de feedback visuel sur les cards pendant les opérations
- Pas de pipeline automatisé pour les agents BMAD — actions manuelles uniquement
- Le serveur ne redémarre pas automatiquement en mode dev (pas de nodemon)

## Actions pour le prochain sprint

- Ajouter un file watcher pour rechargement auto (→ Story 5.1)
- Enrichir les vues Sprint et Rétro (→ Epic 4)
- Explorer l'automatisation des agents BMAD via pipeline Claude CLI
