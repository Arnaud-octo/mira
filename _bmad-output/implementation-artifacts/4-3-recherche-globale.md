# Story 4.3: Recherche globale (stories, epics)

Status: done

## Story

En tant qu'utilisateur de Mira, je veux pouvoir rechercher des stories et des epics depuis n'importe quelle vue, afin de trouver rapidement un élément sans parcourir toutes les colonnes ou tous les epics.

## Acceptance Criteria

1. Une barre de recherche est accessible depuis toutes les vues (header)
2. La recherche filtre en temps réel les stories (titre, description) et les epics (titre, objectif)
3. Les résultats s'affichent dans un panneau déroulant sous la barre de recherche
4. Cliquer sur un résultat story ouvre le modal story
5. La recherche se vide et se ferme avec Escape ou en cliquant ailleurs
6. La recherche fonctionne sur toutes les vues (Epics, Board, Sprint)

## Tasks / Subtasks

- [x] Créer le fichier story
- [x] Ajouter input de recherche dans le header (index.html)
- [x] Implémenter renderSearch() dans app.js
- [x] Filtrage temps réel sur title + description + epic title
- [x] Panel de résultats avec click → openModal
- [x] Fermeture au clic extérieur / Escape
- [x] Styles CSS

## Dev Notes

Vanilla JS, pas de framework. La recherche opère sur `state.data.epics` déjà chargé en mémoire — pas d'appel API supplémentaire. Résultats groupés par Epic.

## Dev Agent Record

### Agent Model Used
claude-sonnet-4-6

### Completion Notes List
- Implémentation complète : barre de recherche header, résultats dropdown, highlight, fermeture Escape/clic extérieur
- Bug corrigé en review (implémentation) : `highlight()` appliquait `esc()` sur le texte mais pas sur la query → mismatch sur caractères spéciaux (`&`, `<`, `>`). Fix : `esc(query)` avant construction du regex.
- Bug corrigé en code review (AC5) : Escape ne fermait pas la recherche quand le focus était sur un item de résultat (`tabindex="0"`). Fix : ajout de `closeSearch()` dans le handler Escape global (`app.js:1096`).
- Bug pré-existant corrigé (hors scope 4.3) : `renderCurrentTab()` appelait `renderSprint(state.data.currentSprint, state.data.epics)` avec 2 args au lieu de 3 — fix : `renderSprint(state.data.sprints, state.data.currentSprint, state.data.epics)`.
- Lint : 0 erreur/warning.
- Tous les AC vérifiés et conformes.
- QA (2026-03-11) : 61/61 tests pass (exit 0), lint 0 erreur. AC1–AC6 vérifiés dans le code. Story promue `done`.

### File List
- src/ui/index.html
- src/ui/app.js
- src/ui/styles.css
