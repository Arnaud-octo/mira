/**
 * bmad-pipeline.js — Orchestrateur BMAD avec Claude AI
 *
 * Déclenché quand une story passe en `in-progress`.
 * Utilise le binaire Claude Code pour exécuter chaque étape BMAD :
 *   in-progress → Dev (implémentation) → review
 *   review      → Reviewer (code review) → qa
 *   qa          → QA (validation) → done
 */

'use strict';

const { spawn } = require('child_process');
const { readdirSync, existsSync } = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Locate Claude binary (VS Code extension or PATH)
// ---------------------------------------------------------------------------

function findClaudeBin() {
  // 1. Try PATH first
  try {
    const { execFileSync } = require('child_process');
    const bin = execFileSync('which', ['claude'], { encoding: 'utf8' }).trim();
    if (bin) return bin;
  } catch (_e) { /* not in PATH */ }

  // 2. VS Code extension binary (macOS)
  const extBase = path.join(process.env.HOME || '', '.vscode', 'extensions');
  if (existsSync(extBase)) {
    try {
      const entries = readdirSync(extBase)
        .filter(e => e.startsWith('anthropic.claude-code-'))
        .sort()
        .reverse(); // latest version first
      if (entries.length > 0) {
        const bin = path.join(extBase, entries[0], 'resources', 'native-binary', 'claude');
        if (existsSync(bin)) return bin;
      }
    } catch (_e) { /* ignore */ }
  }

  return null;
}

const CLAUDE_BIN = findClaudeBin();

// ---------------------------------------------------------------------------
// BMAD prompts per pipeline step
// ---------------------------------------------------------------------------

const PIPELINE_STEPS = [
  {
    name:     '🛠  Dev — implémentation',
    toStatus: 'review',
    prompt: ({ storyId, storyTitle, storyFilePath, projectRoot }) =>
      `Tu es un développeur expert qui travaille sur le projet Mira (dashboard BMAD en Node.js + Vanilla JS).

Story à implémenter : ${storyId} — "${storyTitle}"
Fichier story      : ${storyFilePath}

Instructions :
1. Lis le fichier story pour comprendre la description, les AC et les tâches.
2. Implémente la solution complète dans les fichiers du projet (src/ui/index.html, src/ui/app.js, src/ui/styles.css, src/server.js, src/parser.js selon besoin).
3. Coche toutes les tâches [x] dans le fichier story une fois réalisées.
4. Exécute \`npm run lint\` et \`npm run test\` pour valider.
5. Note tes observations dans la section "Completion Notes List" du fichier story.

Projet root : ${projectRoot}`,
  },
  {
    name:     '🔍 Review — code review',
    toStatus: 'qa',
    prompt: ({ storyId, storyTitle, storyFilePath, projectRoot }) =>
      `Tu es un code reviewer expert sur le projet Mira.

Story à reviewer : ${storyId} — "${storyTitle}"
Fichier story    : ${storyFilePath}

Instructions :
1. Lis le fichier story pour connaître les AC et les fichiers modifiés.
2. Inspecte le code implémenté — qualité, lisibilité, sécurité, bonnes pratiques.
3. Vérifie que chaque AC est bien respecté.
4. Corrige directement tout problème trouvé.
5. Exécute \`npm run lint\` pour confirmer le style.
6. Documente ta review dans "Completion Notes List" du fichier story.

Projet root : ${projectRoot}`,
  },
  {
    name:     '🧪 QA — validation finale',
    toStatus: 'done',
    prompt: ({ storyId, storyTitle, storyFilePath, projectRoot }) =>
      `Tu es un QA engineer expert sur le projet Mira.

Story à valider : ${storyId} — "${storyTitle}"
Fichier story   : ${storyFilePath}

Instructions :
1. Lis le fichier story pour connaître les AC.
2. Exécute \`npm run test:all\` et vérifie que tous les tests passent.
3. Exécute \`npm run lint\` pour confirmer la qualité.
4. Vérifie manuellement chaque AC dans le code.
5. Corrige tout problème bloquant.
6. Confirme la livraison dans "Completion Notes List" du fichier story.

Projet root : ${projectRoot}`,
  },
];

// ---------------------------------------------------------------------------
// Run a single Claude step (streaming output)
// ---------------------------------------------------------------------------

function runClaudeStep(prompt, projectRoot, onLine) {
  return new Promise((resolve, reject) => {
    if (!CLAUDE_BIN) {
      reject({ stdout: '', stderr: 'Claude binary not found', code: 1 });
      return;
    }

    // Pass prompt via stdin to avoid --add-dir greedy arg parsing issues
    const args = [
      '--print',
      '--dangerously-skip-permissions',
    ];

    // Unset CLAUDECODE so Claude can run outside an active Claude Code session
    const env = { ...process.env, FORCE_COLOR: '0' };
    delete env.CLAUDECODE;

    const proc = spawn(CLAUDE_BIN, args, {
      cwd: projectRoot,
      env,
      stdio: 'pipe',
    });
    proc.stdin.write(prompt);
    proc.stdin.end();

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', chunk => {
      const text = chunk.toString();
      stdout += text;
      text.split('\n').forEach(line => { if (line.trim()) onLine(line); });
    });

    proc.stderr.on('data', chunk => { stderr += chunk.toString(); });

    proc.on('close', code => {
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject({ stdout, stderr, code });
      }
    });

    proc.on('error', err => {
      reject({ stdout, stderr, code: err.code || 1 });
    });
  });
}

// ---------------------------------------------------------------------------
// Main pipeline runner
// ---------------------------------------------------------------------------

/**
 * Run the full BMAD pipeline for a story.
 *
 * @param {object} options
 * @param {string}   options.storyId        — e.g. "4.3"
 * @param {string}   options.storyTitle
 * @param {string}   options.storyFilePath  — absolute path to the story .md file
 * @param {string}   options.projectRoot    — absolute path to project root
 * @param {string}   options.outputDir      — absolute path to _bmad-output/
 * @param {Function} options.updateStatus   — (storyId, status, outputDir) → void
 * @param {Function} options.broadcast          — () → void  (SSE refresh)
 * @param {Function} options.broadcastPipeline  — (data) → void  (SSE pipeline event)
 * @param {Function} options.log                — (msg) → void
 */
async function runPipeline({ storyId, storyTitle, storyFilePath, projectRoot, outputDir, updateStatus, broadcast, broadcastPipeline, log }) {
  const chalk = require('chalk');
  const bp = broadcastPipeline || (() => {});

  if (!CLAUDE_BIN) {
    log(chalk.red('\n❌ Binaire Claude introuvable — pipeline impossible.'));
    log(chalk.gray('   Installe Claude Code CLI ou assure-toi que le binaire est accessible.\n'));
    bp({ storyId, phase: 'error', step: null, label: 'Claude introuvable' });
    return;
  }

  log(chalk.bold(`\n🚀  Pipeline BMAD — Story ${storyId} "${storyTitle}"`));
  log(chalk.gray(`   Claude : ${CLAUDE_BIN}\n`));

  bp({ storyId, phase: 'start', step: PIPELINE_STEPS[0].name, label: PIPELINE_STEPS[0].name });

  for (const step of PIPELINE_STEPS) {
    log(chalk.cyan(`  ▶  ${step.name}…`));
    bp({ storyId, phase: 'running', step: step.name, label: step.name });

    const prompt = step.prompt({ storyId, storyTitle, storyFilePath, projectRoot });

    try {
      await runClaudeStep(prompt, projectRoot, line => {
        log(chalk.gray(`     ${line}`));
      });

      log(chalk.green(`  ✅  ${step.name} — OK\n`));

      updateStatus(storyId, step.toStatus, outputDir);
      broadcast();
      bp({ storyId, phase: 'step-done', step: step.name, toStatus: step.toStatus });

    } catch ({ stdout, stderr, code }) {
      log(chalk.red(`  ❌  ${step.name} — ÉCHEC (code ${code})`));

      const output = (stdout + '\n' + stderr).trim();
      if (output) output.split('\n').slice(-15).forEach(l => log(chalk.gray(`     ${l}`)));

      log(chalk.yellow(`\n  ⚠️   Pipeline arrêté. Story ${storyId} reste à l'étape précédente.`));
      log(chalk.gray(`       Corrige les erreurs et repasse le ticket en "in-progress".\n`));
      bp({ storyId, phase: 'error', step: step.name, label: `Échec : ${step.name}` });
      return;
    }
  }

  log(chalk.bold.green(`\n🎉  Story ${storyId} livrée ! Pipeline BMAD complet.\n`));
  bp({ storyId, phase: 'done' });
}

module.exports = { runPipeline, CLAUDE_BIN };
