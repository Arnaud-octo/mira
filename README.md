# mira-bmad 🪩

**Local visualization dashboard for BMAD projects.**

Mira reads your `_bmad-output/` artifacts and serves a local web UI
showing your Epics, Board, and Sprint — with inline status editing.

## Install

```bash
npm install mira-bmad
```

Then in your BMAD project:

```bash
npx mira
```

Opens `http://localhost:4242` automatically.

## Usage

```bash
# Start the dashboard (reads ./_bmad-output/)
npx mira

# Custom port
npx mira --port 3000

# Custom output directory
npx mira --output path/to/_bmad-output

# Optional setup helper (creates folders, copies config)
npx mira-install
```

## What Mira reads

```
_bmad-output/
├── planning-artifacts/
│   └── epics.md                          ← Epics + Stories + statuts
└── implementation-artifacts/
    ├── {epic}-{story}-{slug}.md          ← Détail story individuel
    ├── sprint-{N}-planning-{date}.md     ← Sprint planning
    └── sprint-{N}-retro-{date}.md        ← (ignoré pour l'instant)
```

## Features — v0.1

| Vue | Description |
|---|---|
| **Epics** | Liste des Epics avec progression, stories dépliables |
| **Board** | Kanban 4 colonnes : Backlog · Ready · In Progress · Done |
| **Sprint** | Dernier sprint planning avec goal et stories |
| **Modal** | Détail story : description, AC, tasks, dev notes |
| **Édition** | Changement de statut → sauvegarde dans les .md sur le disque |

## Compatibility

- BMAD Method ≥ 6.0 (recommended)
- [BMAD-Enhanced](https://github.com/amalik/BMAD-Enhanced) compatible
- Node.js ≥ 18

## License

MIT
