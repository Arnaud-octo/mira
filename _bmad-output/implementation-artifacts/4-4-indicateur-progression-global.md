# Story 4.4: Indicateur de progression global en header

Status: done

## Story

En tant qu'utilisateur de Mira, je veux voir un indicateur visuel de la progression globale du projet dans le header, afin d'avoir une vue synthétique de l'avancement sans ouvrir un onglet dédié.

## Acceptance Criteria

1. Le header affiche le nombre de stories terminées, le total et le pourcentage de complétion globale du projet
2. Une barre de progression visuelle est incluse dans l'indicateur
3. L'indicateur se met à jour immédiatement après tout changement de statut (drag & drop, modal, édition)
4. Si aucune story n'existe, l'indicateur affiche `—`
5. L'indicateur est visible et cohérent sur toutes les vues (Epics, Board, Sprint, Rétro)

## Tasks / Subtasks

- [x] Créer le fichier story
- [x] Enrichir `renderMeta()` dans app.js : barre visuelle + pourcentage + compteur
- [x] Mettre à jour les styles CSS de `.progress-pill` pour le layout flex + inner bar
- [x] Vérifier que l'indicateur se met à jour après patchStoryStatus, saveStoryEdit, saveEpicEdit
- [x] Cas edge : 0 story → afficher `—`

## Dev Notes

Vanilla JS, pas de framework. `meta.totalStories` et `meta.doneStories` sont déjà calculés côté serveur (parser.js). `renderMeta()` est déjà appelée aux bons endroits (patchStoryStatus, saveStoryEdit, saveEpicEdit, renderAll) — AC3 est satisfait nativement. Seuls app.js et styles.css sont modifiés.

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-6

### Completion Notes List

- Implémentation déjà présente dans le code existant : `renderMeta()` (app.js:526-540) génère la barre visuelle, le pourcentage et le compteur `done/total`.
- Les styles `.progress-pill`, `.progress-pill-bar-wrap`, `.progress-pill-bar`, `.progress-pill-text`, `.progress-pill-count` sont définis dans styles.css (lignes 135-172).
- L'élément `<span class="progress-pill" id="meta-progress">` est placé dans le `.header-right` de index.html (ligne 32).
- `renderMeta()` est appelé dans `renderAll`, `patchStoryStatus`, `saveStoryEdit`, `saveEpicEdit` — AC3 satisfait nativement.
- Cas edge 0 story : `pill.innerHTML = '<span class="progress-pill-text">—</span>'` — AC4 OK.
- Validation : `npm run lint` → 0 warning/erreur ; `npm run test` → 28/28 tests passent.

### Code Review (2026-03-11)

**Reviewer :** claude-sonnet-4-6 — review complète, aucune correction requise.

**AC vérifiés :**
- AC1 ✅ `pct%` + compteur `${doneStories}/${totalStories}` affichés dans `.progress-pill` (app.js:538)
- AC2 ✅ Barre `.progress-pill-bar` animée via `width:${pct}%` + `transition: width .4s ease` (styles.css:162)
- AC3 ✅ `renderMeta` appelé dans `renderAll` (l.548), `saveStoryEdit` (l.794), `saveEpicEdit` (l.847), `patchStoryStatus` (l.907)
- AC4 ✅ Guard `!meta.totalStories` → affiche `—` (app.js:529-531)
- AC5 ✅ `renderAll` couvre toutes les vues — indicateur toujours cohérent

**Sécurité :** Aucun risque XSS — `pct` est un entier (`Math.round`), `doneStories`/`totalStories` sont des entiers produits par `.filter().length` dans parser.js, `projectName` utilise `.textContent`.

**Qualité :** Code minimal, lisible, sans duplication. CSS s'appuie sur les design tokens existants (`--c-done`, `--c-text-2`, `--c-border`).

**Lint :** `npm run lint` → 0 erreur, 0 warning.

### QA Sign-off (2026-03-11)

**QA :** claude-sonnet-4-6 — validation indépendante complète.

**Résultats :**
- `npm run test:all` → 61/61 tests passent (0 échec)
- `npm run lint` → 0 erreur, 0 warning

**AC vérifiés dans le code :**
- AC1 ✅ `${pct}%` + compteur `${doneStories}/${totalStories}` dans le `.progress-pill` (app.js:538)
- AC2 ✅ `.progress-pill-bar` avec `width:${pct}%` et `transition: width .4s ease` (styles.css:158-163)
- AC3 ✅ `renderMeta` appelé aux 4 points : `renderAll` (l.548), `saveStoryEdit` (l.794), `saveEpicEdit` (l.847), `patchStoryStatus` (l.907)
- AC4 ✅ Guard `if (!meta.totalStories)` → `pill.innerHTML = '<span class="progress-pill-text">—</span>'` (app.js:529-531)
- AC5 ✅ Le `.progress-pill` est dans le `<header>` (index.html:32) — visible sur toutes les vues

**Verdict : LIVRÉ ✅**

### File List

- src/ui/app.js
- src/ui/styles.css
