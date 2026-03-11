# Sprint Rétrospective — Sprint 2

**Date :** 2026-03-11
**Sprint :** Sprint 2 — Enrichissement & DX
**Participants :** Équipe Mira

## Ce qui a bien marché

- Pipeline BMAD automatisé opérationnel : Dev → Review → QA → Done sans intervention
- File watcher (Story 5.1) livré — rechargement auto du dashboard en temps réel
- Recherche globale (Story 4.3) fonctionnelle sur toutes les vues
- Filtrage par Epic sur le Board (Story 4.2) fluide et intégré
- Vue Rétrospective parsée et affichée dans le dashboard (Story 4.1)
- Liens VS Code directs sur les cards et lignes — workflow dev accéléré

## Ce qui peut être amélioré

- Pipeline déclenché en parallèle plusieurs fois si ticket bougé rapidement — guard ajouté en fin de sprint
- Subprocesses Claude orphelins lors des redémarrages serveur — manque de nettoyage
- Pas d'ordonnancement des tickets dans Backlog / Ready for dev
- 4.4 (indicateur progression header) non livrée — bloquée par les doublons pipeline

## Actions pour le prochain sprint

- Ajouter guard anti-doublon sur le pipeline (✅ fait)
- Livrer Story 4.4 — indicateur de progression en header
- Implémenter ordonnancement des tickets dans Backlog & Ready for dev
- Préparer Epic 6 — publication npm
