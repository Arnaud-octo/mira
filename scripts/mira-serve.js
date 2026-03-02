#!/usr/bin/env node

/**
 * mira-serve.js
 * Entry point for `npx mira`.
 * Resolves project root, reads optional config, then starts the server.
 *
 * Usage:
 *   npx mira
 *   npx mira --port 4242
 *   npx mira --output path/to/_bmad-output
 */

const path = require('path');
const fs = require('fs');
const chalk = require('chalk');

// Parse CLI flags
const args = process.argv.slice(2);

function flag(name) {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : null;
}

// Resolve _bmad-output directory (defaults to cwd/_bmad-output)
const outputArg = flag('--output');
const outputDir = outputArg
  ? path.resolve(outputArg)
  : path.join(process.cwd(), '_bmad-output');

// Read optional config for port override: _bmad/bme/_mira/config.yaml
let configPort = 4242;
const configPath = path.join(process.cwd(), '_bmad', 'bme', '_mira', 'config.yaml');
if (fs.existsSync(configPath)) {
  const raw = fs.readFileSync(configPath, 'utf8');
  const portLine = raw.match(/^port:\s*(\d+)/m);
  if (portLine) configPort = parseInt(portLine[1], 10);
}

const portArg = flag('--port');
const port = portArg ? parseInt(portArg, 10) : configPort;

// Warn if no _bmad-output found
if (!fs.existsSync(outputDir)) {
  console.log(chalk.yellow(`\n⚠️  Dossier _bmad-output introuvable : ${outputDir}`));
  console.log(chalk.gray('   Lance d\'abord tes agents BMAD pour générer des artifacts.'));
  console.log(chalk.gray('   Mira démarre quand même — rafraîchis la page après avoir créé les fichiers.\n'));
}

// Start server
const { startServer } = require('../src/server');
startServer({ port, outputDir });
