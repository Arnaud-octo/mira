# Epics — Mira (mira-bmad)

> Tableau de bord local pour visualiser et éditer les artefacts BMAD.
> Package npm · Node.js ≥ 18 · Vanilla JS · Pas de framework

---

## Epic 1: Fondations — lecture et visualisation
**Objectif :** Lire les artefacts BMAD depuis le disque et les afficher dans une UI claire et utilisable

### Story 1.1: Parser les fichiers BMAD (epics.md + stories + sprints)
**Statut [Sprint 1] :** ✅ Done

### Story 1.2: Vue Epics avec progression et stories dépliables
**Statut [Sprint 1] :** ✅ Done

### Story 1.3: Vue Board Kanban 4 colonnes
**Statut [Sprint 1] :** ✅ Done

### Story 1.4: Vue Sprint courant (goal, dates, stories)
**Statut [Sprint 1] :** ✅ Done

### Story 1.5: Modal story — description, AC, tasks, dev notes
**Statut [Sprint 1] :** ✅ Done

---

## Epic 2: Édition inline — sauvegarde dans les Markdown
**Objectif :** Permettre la modification des epics et stories directement depuis le dashboard, sans quitter le navigateur

### Story 2.1: Changement de statut → sauvegarde dans epics.md et fichier story
**Statut [Sprint 1] :** ✅ Done

### Story 2.2: Édition Epic (titre + objectif)
**Statut [Sprint 1] :** ✅ Done

### Story 2.3: Édition Story (titre, description, AC, dev notes)
**Statut [Sprint 1] :** ✅ Done

### Story 2.4: Création automatique du fichier story si absent
**Statut [Sprint 1] :** ✅ Done

---

## Epic 3: Qualité & infrastructure
**Objectif :** Garantir la fiabilité du package avec des tests, du linting et une CI automatisée

### Story 3.1: ESLint — config flat avec règles Node.js + Browser séparées
**Statut [Sprint 1] :** ✅ Done

### Story 3.2: Tests unitaires — parser (22 tests)
**Statut [Sprint 1] :** ✅ Done

### Story 3.3: Tests E2E — serveur HTTP complet (31 tests)
**Statut [Sprint 1] :** ✅ Done

### Story 3.4: GitHub Actions CI — lint, tests Node 18/20/22, coverage, audit
**Statut [Sprint 1] :** ✅ Done

---

## Epic 4: Enrichissement des vues
**Objectif :** Compléter l'expérience utilisateur avec les vues manquantes et améliorer la lisibilité

### Story 4.1: Vue rétrospective de sprint
**Statut [Sprint 2] :** 🔵 ready-for-dev

### Story 4.2: Filtrage par Epic sur le Board
**Statut [Sprint 2] :** 🔵 ready-for-dev

### Story 4.3: Recherche globale (stories, epics)
**Statut [Sprint 2] :** backlog

### Story 4.4: Indicateur de progression global en header
**Statut [Sprint 2] :** backlog

---

## Epic 5: Expérience développeur — live & DX
**Objectif :** Améliorer le flux de travail avec le rechargement automatique et une meilleure DX

### Story 5.1: File watcher — rechargement auto quand les .md changent
**Statut [Sprint 2] :** 🔵 ready-for-dev

### Story 5.2: Flag --watch pour activer le mode surveillance
**Statut [Sprint 2] :** backlog

### Story 5.3: Toast de notification au rechargement
**Statut [Sprint 2] :** backlog

---

## Epic 6: Distribution & publication
**Objectif :** Publier Mira sur le registre npm et faciliter l'adoption dans les projets BMAD

### Story 6.1: Publication sur le registre npm public
**Statut [Sprint 3] :** backlog

### Story 6.2: Badge CI + version dans le README
**Statut [Sprint 3] :** backlog

### Story 6.3: Commande mira --version
**Statut [Sprint 3] :** backlog

### Story 6.4: Commande mira-doctor — diagnostic d'installation
**Statut [Sprint 3] :** backlog
