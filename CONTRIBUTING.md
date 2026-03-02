# Contribuer à Mira

Merci de ton intérêt pour Mira ! Voici comment contribuer.

## Prérequis

- Node.js ≥ 18
- Un projet BMAD pour tester (ou utiliser les fixtures de `tests/`)

## Mise en place

```bash
git clone https://github.com/Arnaud-octo/mira.git
cd mira
npm install
```

## Développement

```bash
# Lancer le dashboard sur un projet BMAD
node scripts/mira-serve.js --output /chemin/vers/_bmad-output

# Lancer les tests
npm test

# Lancer le linter
npm run lint

# Tests + couverture
npm run test:coverage
```

## Architecture

```
mira/
├── index.js                  ← Point d'entrée du module npm
├── scripts/
│   ├── mira-serve.js         ← CLI : npx mira
│   ├── mira-install.js       ← CLI : npx mira-install
│   └── postinstall.js        ← Hook npm install
├── src/
│   ├── parser.js             ← Parsing des fichiers Markdown BMAD
│   ├── server.js             ← Serveur HTTP + API JSON
│   └── ui/
│       ├── index.html        ← SPA (Single Page App)
│       ├── app.js            ← Logique frontend (vanilla JS)
│       └── styles.css        ← Design system (CSS variables)
└── tests/
    └── unit/
        └── parser.test.js    ← Tests unitaires du parser
```

## Flux de données

```
_bmad-output/           parser.js           server.js          ui/app.js
     │                      │                   │                  │
     │  epics.md            │                   │                  │
     │─────────────────────▶│  parseProject()   │                  │
     │  story files         │──────────────────▶│  GET /api/data   │
     │  sprint files        │                   │─────────────────▶│
     │                      │                   │  { epics,        │
     │                      │                   │    sprints,      │
     │                      │                   │    meta }        │
     │                      │                   │◀─────────────────│
     │◀─────────────────────│  updateStory()    │  PATCH /api/story│
     │  (fichier mis à jour)│◀──────────────────│◀─────────────────│
```

## Guidelines

- **Pas de framework** côté serveur (pas d'Express, pas de Fastify)
- **Pas de framework** côté client (pas de React, Vue, etc.)
- **CSS variables** pour tout le theming, pas de classes utilitaires
- Les changements de statut doivent toujours être reflétés dans **les deux fichiers** (`epics.md` + fichier story)
- Ajouter un test pour toute nouvelle logique dans `parser.js`

## Soumettre une PR

1. Fork le repo
2. Crée une branche : `git checkout -b feat/ma-fonctionnalite`
3. Commit : `git commit -m "feat: description courte"`
4. Push : `git push origin feat/ma-fonctionnalite`
5. Ouvre une Pull Request sur GitHub

## Convention de commit

```
feat: nouvelle fonctionnalité
fix: correction de bug
docs: documentation uniquement
refactor: refactoring sans changement de comportement
test: ajout ou modification de tests
chore: maintenance (dépendances, CI, etc.)
```

## Signaler un bug

Ouvre une [issue GitHub](https://github.com/Arnaud-octo/mira/issues) avec :
- La version de Mira (`npx mira --version`)
- La version de Node.js (`node --version`)
- Les étapes pour reproduire
- Le comportement attendu vs observé
