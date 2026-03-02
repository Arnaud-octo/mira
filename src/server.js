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
 *   PATCH /api/story        → { id, status } → updates Markdown files on disk
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const { parseProject, updateStoryStatus, updateEpic, updateStoryContent } = require('./parser');

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
// Request handler factory
// ---------------------------------------------------------------------------

function createHandler(outputDir) {
  // Parse once at startup; individual requests can trigger a refresh
  let cache = null;

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
        return json(res, 200, data);
      } catch (err) {
        return json(res, 500, { error: err.message });
      }
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
          const allowed = ['backlog', 'ready-for-dev', 'in-progress', 'done'];
          if (!allowed.includes(status)) {
            return json(res, 400, { error: `status must be one of: ${allowed.join(', ')}` });
          }
          updateStoryStatus(id, status, outputDir);
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
 * @param {{ port: number, outputDir: string }} options
 */
function startServer({ port = 4242, outputDir }) {
  const chalk = require('chalk');
  const handler = createHandler(outputDir);
  const server  = http.createServer(handler);

  server.listen(port, '127.0.0.1', () => {
    const url = `http://localhost:${port}`;
    console.log(chalk.bold('\n🪩  Mira\n'));
    console.log(chalk.green('  ✅ Dashboard →'), chalk.cyan.underline(url));
    console.log(chalk.gray('  📂 Artifacts →'), chalk.gray(outputDir));
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
    server.close(() => process.exit(0));
  });
}

module.exports = { startServer, createHandler };
