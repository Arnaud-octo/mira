/**
 * server.js — Mira HTTP Server
 *
 * Lightweight Node.js HTTP server (no framework) that:
 *   - Serves the static UI from src/ui/
 *   - Exposes a small JSON API to read and update BMAD artifacts
 *
 * API:
 *   GET  /api/data          → { epics, sprints, currentSprint, meta }
 *   GET  /api/refresh       → re-parse files and return fresh data
 *   GET  /api/events        → SSE stream — emits "refresh" when .md files change
 *   PATCH /api/story        → { id, status } → updates Markdown files on disk
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { parseProject, updateStoryStatus, updateEpic, updateStoryContent } = require('./parser');
const { runPipeline } = require('./bmad-pipeline');

// ---------------------------------------------------------------------------
// BMAD workflow hints — printed to terminal on status transitions
// ---------------------------------------------------------------------------

const BMAD_HINTS = {
  'backlog->ready-for-dev': (story) => [
    `\n📋  Story ${story.id} — "${story.title}"`,
    `    Statut : backlog → 🔵 ready-for-dev`,
    ``,
    `    ▶  Lance l'agent BMAD SM pour affiner la story :`,
    `       @sm "Affiner et préparer la story ${story.id} pour le développement"`,
    ``,
  ],
  'ready-for-dev->in-progress': (story) => [
    `\n🛠   Story ${story.id} — "${story.title}"`,
    `    Statut : ready-for-dev → 🟡 dev in progress`,
    ``,
    `    ▶  Lance l'agent BMAD Dev pour implémenter la story :`,
    `       @dev "Implémenter la story ${story.id} : ${story.title}"`,
    ``,
  ],
  'in-progress->review': (story) => [
    `\n🔍  Story ${story.id} — "${story.title}"`,
    `    Statut : dev in progress → 🟣 review`,
    ``,
    `    ▶  Lance l'agent BMAD pour la code review :`,
    `       @reviewer "Code review de la story ${story.id} : ${story.title}"`,
    ``,
  ],
  'review->qa': (story) => [
    `\n🧪  Story ${story.id} — "${story.title}"`,
    `    Statut : review → 🟠 QA`,
    ``,
    `    ▶  Lance l'agent BMAD QA pour valider la story :`,
    `       @qa "Valider la story ${story.id} : ${story.title}"`,
    ``,
  ],
  'qa->done': (story) => [
    `\n✅  Story ${story.id} — "${story.title}"`,
    `    Statut : QA → ✅ done`,
    ``,
    `    Story livrée. Pense à mettre à jour le sprint planning si nécessaire.`,
    ``,
  ],
};

function printBmadHint(fromStatus, toStatus, story) {
  const key = `${fromStatus}->${toStatus}`;
  const hint = BMAD_HINTS[key];
  if (!hint) return;
  const chalk = require('chalk');
  const lines = hint(story);
  const colored = lines.map(l => {
    if (l.includes('▶')) return chalk.cyan(l);
    if (l.includes('@')) return chalk.yellow(l);
    if (l.startsWith('\n')) return chalk.bold(l);
    return chalk.gray(l);
  });
  console.log(colored.join('\n'));
}

// ---------------------------------------------------------------------------
// MIME types for static file serving
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

const UI_DIR = path.join(__dirname, 'ui');

// ---------------------------------------------------------------------------
// Helper: send a JSON response
// ---------------------------------------------------------------------------

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type':  'application/json; charset=utf-8',
    'Cache-Control': 'no-cache',
  });
  res.end(payload);
}

// ---------------------------------------------------------------------------
// Helper: read request body as parsed JSON
// ---------------------------------------------------------------------------

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => { raw += chunk; });
    req.on('end',  () => {
      try { resolve(JSON.parse(raw)); }
      catch (_e) { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Helper: serve a static file from UI_DIR
// ---------------------------------------------------------------------------

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext  = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

// ---------------------------------------------------------------------------
// SSE: connected clients registry
// ---------------------------------------------------------------------------

const sseClients = new Set();

function broadcastRefresh() {
  for (const res of sseClients) {
    try { res.write('data: refresh\n\n'); } catch (_) { sseClients.delete(res); }
  }
}

function broadcastPipeline(data) {
  const payload = JSON.stringify(data);
  for (const res of sseClients) {
    try { res.write(`event: pipeline\ndata: ${payload}\n\n`); } catch (_) { sseClients.delete(res); }
  }
}

// ---------------------------------------------------------------------------
// File watcher (fs.watch with 300ms debounce, macOS-safe)
// ---------------------------------------------------------------------------

/**
 * Watch _bmad-output/ for .md changes and broadcast SSE refresh events.
 * Returns a cleanup function.
 *
 * @param {string} outputDir
 * @returns {() => void}
 */
function startWatcher(outputDir) {
  if (!fs.existsSync(outputDir)) return () => {};

  let debounceTimer = null;

  const watcher = fs.watch(outputDir, { recursive: true }, (_eventType, filename) => {
    if (!filename || !filename.endsWith('.md')) return;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(broadcastRefresh, 300);
  });

  watcher.on('error', () => {}); // ignore watcher errors silently

  return () => {
    clearTimeout(debounceTimer);
    watcher.close();
  };
}

// ---------------------------------------------------------------------------
// Request handler factory
// ---------------------------------------------------------------------------

function createHandler(outputDir) {
  // Parse once at startup; individual requests can trigger a refresh
  let cache = null;
  const runningPipelines = new Set(); // storyIds currently being processed

  function getProjectData() {
    cache = parseProject(outputDir);
    return cache;
  }

  // Initial parse (best-effort — outputDir may not exist yet)
  try { getProjectData(); } catch (_err) { cache = { epics: [], sprints: [], currentSprint: null, meta: { totalStories: 0, doneStories: 0, projectName: '' } }; }

  return async function handler(req, res) {
    const { method, url } = req;

    // ── CORS headers (localhost only) ───────────────────────────────────────
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

    // ── API: GET /api/data ──────────────────────────────────────────────────
    if (url === '/api/data' && method === 'GET') {
      try {
        const data = getProjectData();
        data.meta.outputDir = outputDir;
        return json(res, 200, data);
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
    }

    // ── API: GET /api/events (SSE) ──────────────────────────────────────────
    if (url === '/api/events' && method === 'GET') {
      res.writeHead(200, {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      });
      res.write(': connected\n\n'); // initial comment to open the stream
      sseClients.add(res);
      req.on('close', () => sseClients.delete(res));
      return; // keep connection open
    }

    // ── API: GET /api/refresh ───────────────────────────────────────────────
    if (url === '/api/refresh' && method === 'GET') {
      try {
        const data = getProjectData();
        return json(res, 200, data);
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
    }

    // ── API: PATCH /api/epic ─────────────────────────────────────────────────
    if (url === '/api/epic' && method === 'PATCH') {
      try {
        const body = await readBody(req);
        const { id, title, objective } = body;

        if (!id) return json(res, 400, { error: 'id is required' });
        if (title === undefined && objective === undefined) {
          return json(res, 400, { error: 'title or objective is required' });
        }

        updateEpic(id, { title, objective }, outputDir);

        const data = getProjectData();
        return json(res, 200, { ok: true, id, data });

      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    }

    // ── API: PATCH /api/story ────────────────────────────────────────────────
    if (url === '/api/story' && method === 'PATCH') {
      try {
        const body = await readBody(req);
        const { id, status, title, description, ac, devNotes, _snapshot } = body;

        if (!id) return json(res, 400, { error: 'id is required' });

        // Status update
        if (status !== undefined) {
          const allowed = ['backlog', 'ready-for-dev', 'in-progress', 'review', 'qa', 'done'];
          if (!allowed.includes(status)) {
            return json(res, 400, { error: `status must be one of: ${allowed.join(', ')}` });
          }
          // Capture previous status for BMAD workflow hint
          const prevData = cache;
          let prevStory = null;
          if (prevData) {
            for (const epic of prevData.epics) {
              const found = epic.stories.find(s => s.id === id);
              if (found) { prevStory = found; break; }
            }
          }
          const prevStatus = prevStory ? prevStory.status : null;

          updateStoryStatus(id, status, outputDir);

          // Print BMAD workflow hint in terminal
          if (prevStory && prevStatus && prevStatus !== status) {
            printBmadHint(prevStatus, status, prevStory);
          }

          // Auto-pipeline : lance le pipeline complet si la story passe en in-progress
          if (status === 'in-progress' && prevStory && prevStatus !== 'in-progress') {
            if (runningPipelines.has(id)) {
              console.log(`⚠️  Pipeline déjà en cours pour story ${id} — ignoré.`);
            } else {
              const projectRoot = path.dirname(outputDir);
              const implDir     = path.join(outputDir, 'implementation-artifacts');
              const storyPrefix = id.replace('.', '-') + '-';
              const storyFile   = require('fs').readdirSync(implDir).find(f => f.startsWith(storyPrefix) && f.endsWith('.md'));
              const storyFilePath = storyFile ? path.join(implDir, storyFile) : null;

              runningPipelines.add(id);
              setImmediate(() => {
                runPipeline({
                  storyId:       id,
                  storyTitle:    prevStory.title,
                  storyFilePath: storyFilePath || path.join(implDir, storyPrefix + 'story.md'),
                  projectRoot,
                  outputDir,
                  updateStatus: (sid, s, dir) => {
                    updateStoryStatus(sid, s, dir);
                    cache = parseProject(dir);
                    broadcastRefresh();
                  },
                  broadcast:         broadcastRefresh,
                  broadcastPipeline: broadcastPipeline,
                  log:               console.log,
                }).finally(() => runningPipelines.delete(id));
              });
            }
          }
        }

        // Content update (title, description, ac, devNotes)
        const hasContent = title !== undefined || description !== undefined
                        || ac !== undefined || devNotes !== undefined;
        if (hasContent) {
          updateStoryContent(id, { title, description, ac, devNotes }, outputDir, _snapshot);
        }

        const data = getProjectData();
        return json(res, 200, { ok: true, id, data });

      } catch (err) {
        return json(res, 400, { error: err.message });
      }
    }

    // ── Static files ─────────────────────────────────────────────────────────
    let filePath = url === '/' ? '/index.html' : url;
    // Strip query strings
    filePath = filePath.split('?')[0];
    const target = path.join(UI_DIR, filePath);

    // Security: prevent path traversal outside UI_DIR
    if (!target.startsWith(UI_DIR)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    serveStatic(res, target);
  };
}

// ---------------------------------------------------------------------------
// Open browser (macOS / Linux / Windows)
// ---------------------------------------------------------------------------

function openBrowser(url) {
  const { exec } = require('child_process');
  const cmd =
    process.platform === 'darwin' ? `open ${url}` :
    process.platform === 'win32'  ? `start ${url}` :
                                    `xdg-open ${url}`;
  exec(cmd);
}

// ---------------------------------------------------------------------------
// Public API: startServer
// ---------------------------------------------------------------------------

/**
 * Start the Mira HTTP server.
 *
 * @param {{ port: number, outputDir: string, watchMode?: boolean }} options
 */
function startServer({ port = 4242, outputDir, watchMode = false }) {
  const chalk = require('chalk');
  const handler = createHandler(outputDir);
  const server  = http.createServer(handler);

  let stopWatcher = () => {};
  if (watchMode) stopWatcher = startWatcher(outputDir);

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.bold('\n🪩  Mira\n'));
    console.log(chalk.green('  ✅ Dashboard →'), chalk.cyan.underline(url));
    console.log(chalk.gray('  📂 Artifacts →'), chalk.gray(outputDir));
    if (watchMode) console.log(chalk.gray('  👁  Watch mode →'), chalk.gray('actif'));
    console.log(chalk.gray('\n  Ctrl+C pour arrêter\n'));
    openBrowser(url);
  });

  server.on('error', err => {
    const chalk = require('chalk');
    if (err.code === 'EADDRINUSE') {
      console.error(chalk.red(`\n❌ Port ${port} déjà utilisé.`));
      console.error(chalk.gray(`   Lance avec un autre port : npx mira --port ${port + 1}\n`));
    } else {
      console.error(chalk.red('❌ Erreur serveur :'), err.message);
    }
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    const chalk = require('chalk');
    console.log(chalk.gray('\n  Mira arrêté.\n'));
    stopWatcher();
    server.close(() => process.exit(0));
  });
}

module.exports = { startServer, createHandler };
