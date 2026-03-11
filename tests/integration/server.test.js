'use strict';

/**
 * Tests E2E — server.js
 *
 * Démarre un vrai serveur HTTP sur un port aléatoire avec des fixtures BMAD,
 * puis teste tous les endpoints de l'API et le serving de fichiers statiques.
 *
 * Couverture :
 *   - GET  /api/data        → parsing complet des fixtures
 *   - GET  /api/refresh     → re-parsing et cohérence des données
 *   - PATCH /api/story      → mise à jour statut + contenu
 *   - PATCH /api/epic       → mise à jour titre + objectif
 *   - Fichiers statiques    → index.html, styles.css, app.js, 404, traversal path
 *   - CORS                  → headers + preflight OPTIONS
 *   - Erreurs               → body invalide, id manquant, statut invalide
 */

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http   = require('node:http');
const fs     = require('node:fs');
const path   = require('node:path');
const os     = require('node:os');

const { createHandler } = require('../../src/server');

// ── Chemins ───────────────────────────────────────────────────────────────────

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

// ── Helpers HTTP ──────────────────────────────────────────────────────────────

let baseUrl;

function httpRequest(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: '127.0.0.1',
      port:     new URL(baseUrl).port,
      path:     urlPath,
      method,
      headers: payload
        ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        : {},
    };

    const req = http.request(options, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        let parsedBody;
        try { parsedBody = JSON.parse(raw); } catch (_e) { parsedBody = raw; }
        resolve({ status: res.statusCode, headers: res.headers, body: parsedBody });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

const get   = urlPath        => httpRequest('GET',     urlPath);
const patch = (urlPath, body) => httpRequest('PATCH',   urlPath, body);
const opts  = urlPath        => httpRequest('OPTIONS',  urlPath);

// ── Lifecycle ─────────────────────────────────────────────────────────────────

let server;
let tmpDir;

before(async () => {
  // Copier les fixtures dans un répertoire temporaire (pour les tests en écriture)
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mira-e2e-'));

  const planDir = path.join(tmpDir, 'planning-artifacts');
  const implDir = path.join(tmpDir, 'implementation-artifacts');
  fs.mkdirSync(planDir, { recursive: true });
  fs.mkdirSync(implDir, { recursive: true });

  // Copier epics.md
  fs.copyFileSync(
    path.join(FIXTURES_DIR, 'planning-artifacts', 'epics.md'),
    path.join(planDir, 'epics.md'),
  );

  // Copier les fichiers d'implémentation
  for (const f of fs.readdirSync(path.join(FIXTURES_DIR, 'implementation-artifacts'))) {
    fs.copyFileSync(
      path.join(FIXTURES_DIR, 'implementation-artifacts', f),
      path.join(implDir, f),
    );
  }

  // Démarrer le serveur sur un port aléatoire
  const handler = createHandler(tmpDir);
  server = http.createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise(resolve => server.close(resolve));
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── GET /api/data ─────────────────────────────────────────────────────────────

describe('GET /api/data', () => {
  it('retourne 200', async () => {
    const { status } = await get('/api/data');
    assert.equal(status, 200);
  });

  it('retourne les champs epics, sprints, currentSprint, meta', async () => {
    const { body } = await get('/api/data');
    assert.ok(Array.isArray(body.epics),   'epics doit être un tableau');
    assert.ok(Array.isArray(body.sprints), 'sprints doit être un tableau');
    assert.ok('meta' in body,              'meta doit être présent');
  });

  it('parse correctement les 2 epics des fixtures', async () => {
    const { body } = await get('/api/data');
    assert.equal(body.epics.length, 2);
    assert.equal(body.epics[0].id, '1');
    assert.equal(body.epics[0].title, 'Authentification utilisateur');
    assert.equal(body.epics[1].id, '2');
  });

  it('parse les objectives des epics', async () => {
    const { body } = await get('/api/data');
    assert.ok(body.epics[0].objective.includes('connect'));
  });

  it('parse les 3 stories au total', async () => {
    const { body } = await get('/api/data');
    const total = body.epics.reduce((n, e) => n + e.stories.length, 0);
    assert.equal(total, 3);
  });

  it('enrichit story 1.1 avec les données du fichier individuel', async () => {
    const { body } = await get('/api/data');
    const story = body.epics[0].stories.find(s => s.id === '1.1');
    assert.ok(story, 'story 1.1 introuvable');
    assert.equal(story.status, 'done');
    assert.ok(story.description.includes('email'));
    assert.equal(story.ac.length, 3);
    assert.equal(story.tasks.length, 3);
    assert.ok(story.devNotes.includes('JWT'));
  });

  it('retourne le statut normalisé pour chaque story', async () => {
    const { body } = await get('/api/data');
    const statuses = body.epics.flatMap(e => e.stories.map(s => s.status));
    const valid = ['done', 'ready-for-dev', 'in-progress', 'backlog'];
    for (const s of statuses) {
      assert.ok(valid.includes(s), `statut invalide : ${s}`);
    }
  });

  it('parse le sprint courant', async () => {
    const { body } = await get('/api/data');
    assert.ok(body.currentSprint, 'currentSprint doit être présent');
    assert.equal(body.currentSprint.number, 1);
    assert.ok(body.currentSprint.goal.includes('authentification'));
    assert.equal(body.currentSprint.stories.length, 2);
  });

  it('calcule le meta correctement (3 stories, 1 done)', async () => {
    const { body } = await get('/api/data');
    assert.equal(body.meta.totalStories, 3);
    assert.equal(body.meta.doneStories, 1);
  });

  it('renvoie les headers CORS', async () => {
    const { headers } = await get('/api/data');
    assert.equal(headers['access-control-allow-origin'], '*');
  });
});

// ── GET /api/refresh ──────────────────────────────────────────────────────────

describe('GET /api/refresh', () => {
  it('retourne 200 et les mêmes données que /api/data', async () => {
    const [r1, r2] = await Promise.all([get('/api/data'), get('/api/refresh')]);
    assert.equal(r2.status, 200);
    assert.equal(r2.body.meta.totalStories, r1.body.meta.totalStories);
    assert.equal(r2.body.epics.length, r1.body.epics.length);
  });
});

// ── PATCH /api/story (statut) ─────────────────────────────────────────────────

describe('PATCH /api/story — mise à jour du statut', () => {
  it('change le statut de 1.2 de ready-for-dev à in-progress', async () => {
    const res = await patch('/api/story', { id: '1.2', status: 'in-progress' });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);

    const story = res.body.data.epics[0].stories.find(s => s.id === '1.2');
    assert.equal(story.status, 'in-progress');
  });

  it('sauvegarde le statut dans epics.md sur le disque', async () => {
    await patch('/api/story', { id: '1.2', status: 'done' });
    const content = fs.readFileSync(
      path.join(tmpDir, 'planning-artifacts', 'epics.md'), 'utf8'
    );
    assert.ok(content.includes('Done') || content.includes('done'));
  });

  it('retourne 400 si id est absent', async () => {
    const { status, body } = await patch('/api/story', { status: 'done' });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  it('retourne 400 pour un statut invalide', async () => {
    const { status, body } = await patch('/api/story', { id: '1.1', status: 'invalid' });
    assert.equal(status, 400);
    assert.ok(body.error.includes('status'));
  });

  it('retourne 400 pour un body JSON invalide', async () => {
    const res = await new Promise((resolve, reject) => {
      const req = http.request({
        hostname: '127.0.0.1',
        port:     server.address().port,
        path:     '/api/story',
        method:   'PATCH',
        headers:  { 'Content-Type': 'application/json' },
      }, res => {
        let raw = '';
        res.on('data', c => { raw += c; });
        res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
      });
      req.on('error', reject);
      req.write('NOT_JSON');
      req.end();
    });
    assert.equal(res.status, 400);
  });
});

// ── PATCH /api/story (contenu) ────────────────────────────────────────────────

describe('PATCH /api/story — mise à jour du contenu', () => {
  it('met à jour le titre dans epics.md', async () => {
    const res = await patch('/api/story', {
      id:    '1.1',
      title: 'Formulaire de connexion modifié',
    });
    assert.equal(res.status, 200);

    const story = res.body.data.epics[0].stories.find(s => s.id === '1.1');
    assert.equal(story.title, 'Formulaire de connexion modifié');

    const epicsMd = fs.readFileSync(
      path.join(tmpDir, 'planning-artifacts', 'epics.md'), 'utf8'
    );
    assert.ok(epicsMd.includes('Formulaire de connexion modifié'));
  });

  it('met à jour la description dans le fichier story', async () => {
    const newDesc = 'En tant qu\'admin, je veux auditer les connexions.';
    const res = await patch('/api/story', {
      id:          '1.1',
      description: newDesc,
    });
    assert.equal(res.status, 200);

    const storyFile = fs.readFileSync(
      path.join(tmpDir, 'implementation-artifacts', '1-1-formulaire-de-connexion.md'), 'utf8'
    );
    assert.ok(storyFile.includes('admin'));
  });

  it('met à jour les acceptance criteria', async () => {
    const res = await patch('/api/story', {
      id: '1.1',
      ac: ['Critère A', 'Critère B'],
    });
    assert.equal(res.status, 200);

    const storyFile = fs.readFileSync(
      path.join(tmpDir, 'implementation-artifacts', '1-1-formulaire-de-connexion.md'), 'utf8'
    );
    assert.ok(storyFile.includes('Critère A'));
    assert.ok(storyFile.includes('Critère B'));
  });

  it('crée le fichier story manquant si _snapshot fourni', async () => {
    // story 1.2 n'a pas de fichier individuel dans les fixtures
    const dataRes = await get('/api/data');
    const snapshot = dataRes.body.epics[0].stories.find(s => s.id === '1.2');

    const res = await patch('/api/story', {
      id:          '1.2',
      description: 'Nouvelle description via snapshot.',
      _snapshot:   snapshot,
    });
    assert.equal(res.status, 200);

    // Le fichier doit avoir été créé
    const implDir = path.join(tmpDir, 'implementation-artifacts');
    const files = fs.readdirSync(implDir);
    const created = files.some(f => f.startsWith('1-2-'));
    assert.ok(created, 'le fichier 1-2-*.md doit avoir été créé');
  });
});

// ── PATCH /api/epic ───────────────────────────────────────────────────────────

describe('PATCH /api/epic', () => {
  it('met à jour le titre de l\'epic', async () => {
    const res = await patch('/api/epic', {
      id:    '2',
      title: 'Tableau de bord analytique',
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);

    const epic = res.body.data.epics.find(e => e.id === '2');
    assert.equal(epic.title, 'Tableau de bord analytique');
  });

  it('met à jour l\'objectif de l\'epic', async () => {
    const res = await patch('/api/epic', {
      id:        '1',
      objective: 'Nouvel objectif de test.',
    });
    assert.equal(res.status, 200);

    const epic = res.body.data.epics.find(e => e.id === '1');
    assert.ok(epic.objective.includes('Nouvel objectif'));
  });

  it('retourne 400 si id est absent', async () => {
    const { status, body } = await patch('/api/epic', { title: 'Test' });
    assert.equal(status, 400);
    assert.ok(body.error);
  });

  it('retourne 400 si ni title ni objective ne sont fournis', async () => {
    const { status, body } = await patch('/api/epic', { id: '1' });
    assert.equal(status, 400);
    assert.ok(body.error);
  });
});

// ── Fichiers statiques ────────────────────────────────────────────────────────

describe('Fichiers statiques', () => {
  it('GET / renvoie index.html (200)', async () => {
    const { status, body } = await get('/');
    assert.equal(status, 200);
    assert.ok(typeof body === 'string' && body.includes('<!DOCTYPE html>'));
  });

  it('GET /styles.css renvoie du CSS (200)', async () => {
    const { status, headers } = await get('/styles.css');
    assert.equal(status, 200);
    assert.ok(headers['content-type'].includes('text/css'));
  });

  it('GET /app.js renvoie du JavaScript (200)', async () => {
    const { status, headers } = await get('/app.js');
    assert.equal(status, 200);
    assert.ok(headers['content-type'].includes('javascript'));
  });

  it('GET /inexistant.html renvoie 404', async () => {
    const { status } = await get('/inexistant.html');
    assert.equal(status, 404);
  });

  it('path traversal (/../) renvoie 403', async () => {
    const { status } = await get('/../../../etc/passwd');
    assert.equal(status, 403);
  });
});

// ── CORS ──────────────────────────────────────────────────────────────────────

describe('CORS', () => {
  it('OPTIONS renvoie 204 avec les bons headers', async () => {
    const { status, headers } = await opts('/api/data');
    assert.equal(status, 204);
    assert.equal(headers['access-control-allow-origin'], '*');
    assert.ok(headers['access-control-allow-methods'].includes('PATCH'));
  });

  it('tous les endpoints API renvoient Access-Control-Allow-Origin', async () => {
    const endpoints = ['/api/data', '/api/refresh'];
    for (const ep of endpoints) {
      const { headers } = await get(ep);
      assert.equal(headers['access-control-allow-origin'], '*', `Manquant sur ${ep}`);
    }
  });
});

// ── Retros ────────────────────────────────────────────────────────────────────

describe('GET /api/data — retros', () => {
  it('retros est un tableau dans la réponse', async () => {
    const { status, body } = await get('/api/data');
    assert.equal(status, 200);
    assert.ok(Array.isArray(body.retros), 'retros should be an array');
  });

  it('retros contient la fixture sprint-1-retro', async () => {
    const { body } = await get('/api/data');
    assert.ok(body.retros.length >= 1, 'at least one retro expected');
    const retro = body.retros[0];
    assert.equal(retro.sprintNumber, 1);
    assert.equal(retro.date, '2026-03-07');
    assert.ok(retro.wentWell.length >= 1);
    assert.ok(retro.improve.length >= 1);
    assert.ok(retro.actions.length >= 1);
  });
});
