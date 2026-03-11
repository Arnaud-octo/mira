# Sprint Planning — Sprint 3

**Date :** 2026-03-11
**Sprint Goal :** "Finaliser l'Epic 4, enrichir la DX et préparer la distribution npm"
**Épics :** Epic 4 + Epic 5 + Epic 6
**Durée :** 1 semaine

## Stories du Sprint

| # | **REF** — Story | Fichier | Priorité |
|---|---|---|---|
| 1 | **4.6** — Ordonnancement Backlog & Ready for dev | 4-6-ordonnancement-backlog.md | 🔴 Haute |
| 2 | **5.2** — Flag --watch pour activer la surveillance | 5-2-flag-watch.md | 🟠 Moyenne |
| 3 | **5.3** — Toast de notification au rechargement | 5-3-toast-notification.md | 🟡 Faible |
| 4 | **6.1** — Publication sur le registre npm public | 6-1-publication-npm.md | 🔴 Haute |
| 5 | **6.3** — Commande mira --version | 6-3-mira-version.md | 🟠 Moyenne |

## Contexte technique

### Story 4.6 — Ordonnancement Backlog & Ready for dev
Ajouter le drag & drop vertical intra-colonne sur les colonnes Backlog et Ready for dev.
- Persister l'ordre dans `_bmad-output/board-order.json`
- API : `GET /api/board-order` + `PATCH /api/board-order`
- Les autres colonnes (Dev, Review, QA, Done) restent en ordre naturel

### Story 5.2 — Flag --watch
Ajouter `--watch` comme flag CLI de `mira-serve.js` pour activer le file watcher.
Sans ce flag, le watcher est désactivé (mode CI/test).

### Story 5.3 — Toast de notification
Afficher un toast discret en bas de l'écran quand le dashboard se recharge automatiquement.
- Durée : 2 secondes, fade out
- Message : "Dashboard mis à jour"

### Story 6.1 — Publication npm
Préparer le package pour publication publique :
- `package.json` : `name`, `bin`, `files`, `engines`
- Commande `mira` dans le PATH après `npm install -g mira-bmad`
- README complet avec installation et usage
- `npm publish --dry-run` pour validation

### Story 6.3 — mira --version
Ajouter `mira --version` / `mira -v` qui affiche la version depuis `package.json`.

## Critères de succès du Sprint

- [ ] Les tickets Backlog et Ready for dev sont réordonnables par drag & drop
- [ ] L'ordre est conservé au rechargement du dashboard
- [ ] `mira --watch` active le file watcher, sans le flag il est off
- [ ] Un toast apparaît à chaque rechargement automatique
- [ ] `npm install -g mira-bmad && mira` fonctionne sur une machine vierge
- [ ] `mira --version` affiche la version correcte
- [ ] `npm run test:all` reste vert
- [ ] `npm run lint` sans erreur
