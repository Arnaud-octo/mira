# Story 4.1: Vue rétrospective de sprint

Status: done

## Story

En tant qu'utilisateur de Mira, je veux voir les rétrospectives de sprint dans le dashboard
afin de garder une trace des apprentissages de l'équipe sans ouvrir les fichiers Markdown manuellement.

## Acceptance Criteria

1. Un nouvel onglet "Rétro" apparaît dans la navigation si au moins un fichier `sprint-{N}-retro-*.md` existe
2. La rétrospective du sprint le plus récent est affichée par défaut
3. Les sections "Ce qui a bien marché", "Ce qui peut être amélioré" et "Actions" sont affichées séparément
4. Si aucun fichier de rétro n'existe, un état vide explicatif est affiché
5. La vue s'intègre visuellement avec les autres onglets (même design system)

## Tasks / Subtasks

- [ ] Ajouter le parsing des fichiers `sprint-{N}-retro-*.md` dans `parser.js`
- [ ] Ajouter `retros` dans le retour de `parseProject()`
- [ ] Ajouter l'endpoint dans `server.js` (ou inclure dans `/api/data`)
- [ ] Ajouter l'onglet "Rétro" dans `index.html`
- [ ] Implémenter `renderRetro()` dans `app.js`
- [ ] Ajouter les styles dans `styles.css`
- [ ] Écrire les tests unitaires (parseRetroContent)
- [ ] Écrire les tests E2E (GET /api/data inclut les rétros)

## Dev Notes

Format de fichier attendu (`sprint-2-retro-2026-03-10.md`) :

```markdown
# Sprint Rétrospective — Sprint 2

**Date :** 2026-03-10

## Ce qui a bien marché

- Point positif 1
- Point positif 2

## Ce qui peut être amélioré

- Point d'amélioration 1

## Actions pour le prochain sprint

- [ ] Action concrète 1
- [ ] Action concrète 2
```

Parser avec la même approche ligne par ligne que `parseStoryFile()`.

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
