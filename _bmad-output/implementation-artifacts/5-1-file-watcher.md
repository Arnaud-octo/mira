# Story 5.1: File watcher — rechargement automatique

Status: ready-for-dev

## Story

En tant que développeur utilisant Mira, je veux que le dashboard se recharge automatiquement
quand je modifie un fichier Markdown dans `_bmad-output/`
afin de voir mes changements en temps réel sans avoir à cliquer sur "Rafraîchir".

## Acceptance Criteria

1. Quand un fichier `.md` dans `_bmad-output/` est modifié, le dashboard se met à jour en moins de 2 secondes
2. Le rechargement est partiel (pas de refresh de page — juste un appel à `/api/refresh`)
3. Un toast discret informe l'utilisateur du rechargement ("↻ Mis à jour")
4. Le file watcher ne démarre que si le flag `--watch` est passé à `npx mira` (ou activé par défaut)
5. Le watcher s'arrête proprement quand le serveur est arrêté (Ctrl+C)

## Tasks / Subtasks

- [ ] Ajouter la surveillance des fichiers dans `server.js` avec `fs.watch()` (natif Node.js)
- [ ] Implémenter un endpoint SSE `GET /api/events` pour notifier le front
- [ ] Dans `app.js`, s'abonner à `/api/events` avec `EventSource`
- [ ] Déclencher `fetchData('/api/refresh')` à chaque événement reçu
- [ ] Afficher un toast "↻ Mis à jour" discret
- [ ] Ajouter `--watch` comme flag CLI dans `mira-serve.js`
- [ ] Écrire le test E2E du watcher (simuler une modification de fichier)

## Dev Notes

Utiliser `fs.watch()` natif (Node.js 18+) plutôt que `chokidar` pour éviter une dépendance.
`fs.watch()` peut émettre des événements en double sur macOS — dédupliquer avec un debounce de 300ms.

Implémentation SSE côté serveur :
```js
// GET /api/events
res.writeHead(200, {
  'Content-Type': 'text/event-stream',
  'Cache-Control': 'no-cache',
  'Connection': 'keep-alive',
});
// Quand un fichier change :
res.write('data: refresh\n\n');
```

Côté client :
```js
const evtSource = new EventSource('/api/events');
evtSource.onmessage = () => fetchData('/api/refresh');
```

## Dev Agent Record

### Agent Model Used

### Completion Notes List

### File List
