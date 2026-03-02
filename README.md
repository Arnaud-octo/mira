# Mira 🪩

> Tableau de bord local pour visualiser et éditer les artefacts BMAD

Mira lit tes fichiers `_bmad-output/` et affiche un dashboard web local avec tes Epics, ton Board Kanban et ton Sprint — avec édition inline qui sauvegarde directement dans les fichiers Markdown sur le disque.

**Aucun cloud. Aucun compte. Juste `npx mira`.**

---

## Prérequis

- **Node.js ≥ 18**
- Un projet BMAD avec des artefacts dans `_bmad-output/`

---

## Installation

```bash
# Dans ton répertoire de projet BMAD :
npx mira
```

C'est tout. Mira fonctionne sans configuration.

**Ou installation globale :**

```bash
npm install -g mira-bmad
mira
```

**Sortie attendue au démarrage :**

```
🪩  Mira

  ✅ Dashboard → http://localhost:4242
  📂 Artifacts → /chemin/vers/_bmad-output

  Ctrl+C pour arrêter
```

---

## Structure des fichiers lus

Mira s'appuie sur les conventions de nommage BMAD :

```
mon-projet/
└── _bmad-output/
    ├── planning-artifacts/
    │   └── epics.md                          ← Epics, Stories et statuts
    └── implementation-artifacts/
        ├── {epic}-{story}-{slug}.md          ← Détail d'une story
        ├── sprint-{N}-planning-{date}.md     ← Planning de sprint
        └── sprint-{N}-retro-{date}.md        ← Rétrospective (futur)
```

### Format epics.md attendu

```markdown
## Epic 1: Authentification utilisateur
**Objectif :** Permettre aux utilisateurs de se connecter de façon sécurisée

### Story 1.1: Formulaire de connexion
**Statut [Sprint 1] :** ✅ Done

### Story 1.2: Réinitialisation du mot de passe
**Statut [Sprint 2] :** 🔵 ready-for-dev
```

### Format story individuelle attendu

```markdown
# Story 1.2: Réinitialisation du mot de passe

Status: ready-for-dev

## Story

En tant qu'utilisateur, je veux pouvoir réinitialiser mon mot de passe
afin de récupérer l'accès à mon compte.

## Acceptance Criteria

1. L'utilisateur reçoit un e-mail avec un lien de réinitialisation
2. Le lien expire après 24h
3. Le nouveau mot de passe doit faire au moins 8 caractères

## Tasks / Subtasks

- [ ] Créer l'endpoint POST /auth/reset-password
- [ ] Envoyer l'e-mail via le service mail
- [x] Définir le schéma de base de données

## Dev Notes

Utiliser le token JWT pour sécuriser le lien.
```

---

## Vues disponibles

### Vue Epics

Affiche tous les Epics avec leur progression et les stories associées.

```
┌─────────────────────────────────────────────────────────────────┐
│  Epic 1  Authentification utilisateur                            │
│  ─ Permettre aux utilisateurs de se connecter de façon sécurisée│
│                                          ████░░ 2/3  [›]        │
├─────────────────────────────────────────────────────────────────┤
│  ID      Story                              Statut               │
│  1.1     Formulaire de connexion            ✅ Done              │
│          En tant qu'utilisateur, je veux…                       │
│  1.2     Réinitialisation mot de passe      🔵 Ready             │
│          En tant qu'utilisateur, je veux…                       │
│  1.3     Session persistante                ○ Backlog            │
└─────────────────────────────────────────────────────────────────┘
```

### Vue Board (Kanban)

```
┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
│  ○ Backlog │  │ 🔵 Ready   │  │ 🟡 In Prog │  │ ✅ Done    │
├────────────┤  ├────────────┤  ├────────────┤  ├────────────┤
│ ┌────────┐ │  │ ┌────────┐ │  │ ┌────────┐ │  │ ┌────────┐ │
│ │ 1.3    │ │  │ │ 1.2    │ │  │ │ 2.1    │ │  │ │ 1.1    │ │
│ │Session │ │  │ │Reset   │ │  │ │Login   │ │  │ │Form    │ │
│ │persist.│ │  │ │MDP     │ │  │ │social  │ │  │ │connexio│ │
│ └────────┘ │  │ └────────┘ │  │ └────────┘ │  │ └────────┘ │
└────────────┘  └────────────┘  └────────────┘  └────────────┘
```

### Vue Sprint

```
┌─────────────────────────────────────────────────────────────────┐
│  Sprint 3                      2026-03-01                       │
│  "Finaliser le module d'authentification"                       │
├────┬────────┬──────────────────────────────┬─────────┬─────────┤
│  # │  Ref   │  Story                       │ Priorité│ Statut  │
├────┼────────┼──────────────────────────────┼─────────┼─────────┤
│  1 │  1-2   │  Réinitialisation MDP        │ 🔴 Haute│ 🔵 Ready│
│  2 │  2-1   │  Login social                │ 🟠 Moy  │ 🟡 WIP  │
└────┴────────┴──────────────────────────────┴─────────┴─────────┘
```

### Modal story

Cliquer sur une story ouvre un panneau détaillé :

```
┌─────────────────────────────────────────────┐
│  Story 1.2                           [✏️][✕] │
│  Réinitialisation du mot de passe           │
├─────────────────────────────────────────────┤
│  Statut  [🔵 Ready for dev ▾]    ✅ Sauvé   │
├─────────────────────────────────────────────┤
│  STORY                                      │
│  En tant qu'utilisateur, je veux…           │
│                                             │
│  ACCEPTANCE CRITERIA                        │
│  1. L'utilisateur reçoit un e-mail…         │
│  2. Le lien expire après 24h                │
│                                             │
│  TASKS                                      │
│  ☑ Schéma de base de données               │
│  ☐ Endpoint POST /auth/reset-password       │
│  ☐ Envoi e-mail                             │
│                                             │
│  DEV NOTES                                  │
│  Utiliser le token JWT…                     │
└─────────────────────────────────────────────┘
```

---

## Édition inline

Clique sur ✏️ pour éditer directement depuis le dashboard.

| Champ | Editable | Fichier cible |
|---|:---:|---|
| Titre de l'Epic | ✅ | `epics.md` |
| Objectif de l'Epic | ✅ | `epics.md` |
| Titre de la Story | ✅ | `epics.md` + fichier story |
| Description (user story) | ✅ | fichier story |
| Acceptance Criteria | ✅ | fichier story |
| Dev Notes | ✅ | fichier story |
| Statut | ✅ | `epics.md` + fichier story |

> Si la story n'a pas encore de fichier individuel, Mira le crée automatiquement au format BMAD.

---

## Options CLI

```bash
# Port personnalisé
npx mira --port 3000

# Répertoire d'artefacts personnalisé
npx mira --output chemin/vers/_bmad-output

# Helper d'initialisation (crée la structure de dossiers)
npx mira-install
```

| Option | Défaut | Description |
|---|---|---|
| `--port <n>` | `4242` | Port HTTP |
| `--output <chemin>` | `./_bmad-output` | Chemin vers les artefacts BMAD |

---

## Configuration optionnelle

Crée `_bmad/bme/_mira/config.yaml` pour persister ta configuration :

```yaml
port: 4242
```

---

## Compatibilité

- BMAD Method ≥ 6.0 (recommandé)
- [BMAD-Enhanced](https://github.com/amalik/BMAD-Enhanced) compatible
- Node.js ≥ 18

---

## Contribution

Voir [CONTRIBUTING.md](CONTRIBUTING.md).

## Changelog

Voir [CHANGELOG.md](CHANGELOG.md).

## Licence

MIT — voir [LICENSE](LICENSE).
