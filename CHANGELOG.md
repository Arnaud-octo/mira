# Changelog

Toutes les modifications notables sont documentées dans ce fichier.

Format inspiré de [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/).
Ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

---

## [0.1.0] — 2026-03-02

### Ajouté

- **Vue Epics** — liste des epics avec barre de progression et stories dépliables
- **Vue Board** — kanban 4 colonnes : Backlog · Ready for dev · In Progress · Done
- **Vue Sprint** — affichage du sprint courant avec goal, dates et stories
- **Modal story** — détail avec description, AC, tasks (checkboxes), dev notes
- **Édition inline des Epics** — titre + objectif → sauvegarde dans `epics.md`
- **Édition inline des Stories** — titre, description, AC, dev notes → sauvegarde dans le fichier story (créé automatiquement si absent)
- **Changement de statut** — sauvegarde immédiate dans `epics.md` et le fichier story
- **Description sous le titre** — visible dans le tableau Epics et les cartes Board
- **Commande `npx mira`** — lance le dashboard avec options `--port` et `--output`
- **Commande `npx mira-install`** — helper d'initialisation de la structure de dossiers
- Parser BMAD : `epics.md`, fichiers story individuels, `sprint-{N}-planning-{date}.md`
- Serveur HTTP natif Node.js (sans framework)
- UI vanilla JS — sans dépendance côté client
