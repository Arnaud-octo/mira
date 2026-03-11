# Sprint Planning — Sprint 4

**Date :** 2026-03-18
**Sprint Goal :** "Finaliser la distribution, polish DX et ouverture vers de nouveaux projets BMAD"
**Épics :** Epic 6 + Epic 7 (nouveau)
**Durée :** 1 semaine

## Stories du Sprint

| # | **REF** — Story | Fichier | Priorité |
|---|---|---|---|
| 1 | **6.2** — Badge CI + version dans le README | 6-2-badge-ci.md | 🟡 Faible |
| 2 | **6.4** — Commande mira-doctor | 6-4-mira-doctor.md | 🟠 Moyenne |
| 3 | **7.1** — Support multi-projets (--dir) | 7-1-multi-projets.md | 🔴 Haute |
| 4 | **7.2** — Page de configuration dans le dashboard | 7-2-page-config.md | 🟠 Moyenne |
| 5 | **7.3** — Thème sombre / clair (toggle) | 7-3-theme-toggle.md | 🟡 Faible |

## Contexte technique

### Story 6.2 — Badge CI + version README
Ajouter dans le README :
- Badge GitHub Actions (`passing` / `failing`)
- Badge npm version
- Badge Node.js compatible

### Story 6.4 — mira-doctor
Commande `mira doctor` qui vérifie l'environnement :
- Dossier `_bmad-output/` trouvé ?
- `epics.md` présent ?
- Fichiers stories parsables ?
- Version Node.js compatible ?
- Affiche un rapport avec ✅ / ❌ par vérification

### Story 7.1 — Support multi-projets
Ajouter `--dir <path>` pour pointer vers un répertoire projet différent du CWD.
```
mira --dir ~/projets/mon-autre-projet
```
Permet d'utiliser Mira sur plusieurs projets BMAD sans changer de répertoire.

### Story 7.2 — Page de configuration
Onglet "Config" dans le dashboard :
- Affiche le chemin du projet courant
- Permet de changer le port
- Permet de toggle le file watcher
- Sauvegarde dans `_bmad-output/mira-config.json`

### Story 7.3 — Thème sombre / clair
Bouton toggle dans le header pour switcher entre thème clair (actuel) et sombre.
Persistance dans `localStorage`.

## Epic 7 — Multi-projets & Configuration (nouveau)

**Objectif :** Permettre à Mira d'être utilisé sur plusieurs projets BMAD différents et d'offrir une configuration persistante.

## Critères de succès du Sprint

- [ ] `mira doctor` diagnostique l'environnement et affiche un rapport clair
- [ ] Le README affiche les badges CI et npm à jour
- [ ] `mira --dir ~/autre-projet` pointe sur le bon répertoire
- [ ] L'onglet Config affiche et sauvegarde la configuration
- [ ] Le thème sombre est activable depuis le header
- [ ] `npm run test:all` reste vert
- [ ] `npm run lint` sans erreur
