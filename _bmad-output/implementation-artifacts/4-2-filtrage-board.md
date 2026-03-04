# Story 4.2: Filtrage par Epic sur le Board

Status: ready-for-dev

## Story

En tant qu'utilisateur de Mira, je veux filtrer les cartes du Board par Epic
afin de me concentrer sur les stories d'un Epic spécifique sans être distrait par les autres.

## Acceptance Criteria

1. Une barre de filtres apparaît au-dessus du Board avec un bouton par Epic ("Tous" + un par Epic)
2. Cliquer sur un Epic masque les cartes des autres Epics dans toutes les colonnes
3. Le filtre actif est visuellement mis en évidence
4. "Tous" réaffiche toutes les cartes
5. Le filtre est réinitialisé quand on change d'onglet
6. Si un Epic n'a aucune story dans le Board, son bouton est grisé

## Tasks / Subtasks

- [ ] Ajouter `filterEpicId` dans le state de `app.js`
- [ ] Créer le composant de filtres (pills/boutons) au-dessus de `.board-columns`
- [ ] Modifier `renderBoard()` pour filtrer les stories selon `state.filterEpicId`
- [ ] Ajouter les styles pour la barre de filtres dans `styles.css`
- [ ] Réinitialiser le filtre lors du changement d'onglet

## Dev Notes

Les filtres doivent être générés dynamiquement depuis `state.data.epics`.
Utiliser `dataset.epicId` sur les boutons pour identifier l'Epic sélectionné.
Pas de modification côté serveur — c'est un filtre purement frontend.

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
