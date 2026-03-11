# Story 4.5: Liens d'ouverture VS Code sur les items du dashboard

Status: done

## Story

En tant qu'utilisateur de Mira, je veux pouvoir ouvrir directement le fichier Markdown d'une story ou d'un epic dans VS Code depuis le dashboard, afin de consulter ou modifier le fichier source sans quitter mon environnement de travail.

## Acceptance Criteria

1. Chaque carte story sur le Board affiche un lien ⎇ qui ouvre le fichier .md correspondant dans VS Code
2. Chaque ligne story dans la vue Epics affiche un lien ⎇ vers son fichier .md
3. Chaque header d'epic affiche un lien ⎇ vers epics.md
4. Les liens utilisent le protocole `vscode://file/<absolutePath>`
5. Le lien n'est visible que au hover de la carte / ligne pour ne pas encombrer l'UI
6. Cliquer le lien n'ouvre pas le modal story ni ne toggle l'epic (stopPropagation)
7. Si une story n'a pas de fichier individuel, le lien n'est pas affiché

## Tasks / Subtasks

- [x] Exposer `outputDir` dans `meta` de `/api/data` (server.js)
- [x] Ajouter helper `vscodeLinkBtn(absolutePath)` dans app.js
- [x] Ajouter helper `storyVscodePath(story)` et `epicVscodePath()` dans app.js
- [x] Afficher le lien sur les board cards (layout `.board-card-top`)
- [x] Afficher le lien sur les story rows de la vue Epics
- [x] Afficher le lien sur les epic headers
- [x] CSS : `.vscode-link` visible uniquement au hover, avec transition douce
- [x] Lint clean

## Completion Notes List

- Implémenté en 2026-03-11
- Le lien ⎇ s'affiche en opacity 0 et passe à 0.5 au hover de la carte, 1 au hover direct du lien
- `story.file` est déjà calculé par le parser (relatif à outputDir) — null si pas de fichier individuel
- `outputDir` ajouté dans `data.meta.outputDir` côté serveur pour que le front puisse reconstruire le chemin absolu
- Lint validé, aucun test cassé
