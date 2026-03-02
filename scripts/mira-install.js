#!/usr/bin/env node

/**
 * mira-install
 * Optional setup helper for Mira in a BMAD project.
 *
 * Usage:
 *   npx mira-install [--project-root <path>]
 *
 * What it does:
 *   1. Checks that _bmad/ exists (BMAD project guard)
 *   2. Creates _bmad-output/planning-artifacts/ and _bmad-output/implementation-artifacts/
 *      if they don't already exist
 *   3. Copies a starter config to _bmad/bme/_mira/config.yaml (skips if already present)
 *   4. Prints a getting-started guide
 */

const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

const PKG_ROOT = path.join(__dirname, '..');
const CONFIG_TEMPLATE = path.join(PKG_ROOT, '_bmad', 'bme', '_mira', 'config.yaml');

async function main() {
  // Resolve target project root (default: cwd)
  const args = process.argv.slice(2);
  const rootFlagIdx = args.indexOf('--project-root');
  const projectRoot = rootFlagIdx !== -1
    ? path.resolve(args[rootFlagIdx + 1])
    : process.cwd();

  console.log(chalk.bold('\n🪩  mira-bmad — Setup\n'));

  // Guard: check _bmad/ exists
  const bmadDir = path.join(projectRoot, '_bmad');
  if (!fs.existsSync(bmadDir)) {
    console.log(chalk.yellow('⚠️  Aucun dossier _bmad/ trouvé dans', projectRoot));
    console.log(chalk.gray('   Ce projet utilise-t-il BMAD Method ? Mira lit _bmad-output/ pour fonctionner.'));
    console.log(chalk.gray('   Continue — les dossiers seront créés, mais sans artifacts BMAD rien ne s\'affichera.\n'));
  }

  // Create output directories
  const planningDir = path.join(projectRoot, '_bmad-output', 'planning-artifacts');
  const implDir = path.join(projectRoot, '_bmad-output', 'implementation-artifacts');

  await fs.ensureDir(planningDir);
  console.log(chalk.green('✅ Dossier prêt →'), chalk.gray(planningDir));

  await fs.ensureDir(implDir);
  console.log(chalk.green('✅ Dossier prêt →'), chalk.gray(implDir));

  // Copy config (don't overwrite existing)
  const configDst = path.join(bmadDir, 'bme', '_mira', 'config.yaml');
  if (!fs.existsSync(configDst)) {
    await fs.ensureDir(path.dirname(configDst));
    await fs.copy(CONFIG_TEMPLATE, configDst);
    console.log(chalk.green('✅ Config créée →'), chalk.gray(configDst));
  } else {
    console.log(chalk.gray('ℹ️  config.yaml existant conservé (non écrasé)'));
  }

  console.log(chalk.bold('\n🎉 Mira est prêt !\n'));
  console.log(chalk.cyan('Prochaines étapes :'));
  console.log('  1. Lance tes agents BMAD pour générer des artifacts dans', chalk.bold('_bmad-output/'));
  console.log('  2. Lance', chalk.bold('npx mira'), '— ouvre http://localhost:4242');
  console.log('  3. Epics · Board · Sprint — tout est là\n');
  console.log(chalk.gray('Option : édite _bmad/bme/_mira/config.yaml pour changer le port (défaut: 4242)\n'));
}

main().catch(err => {
  const chalk = require('chalk');
  console.error(chalk.red('❌ Erreur :'), err.message);
  process.exit(1);
});
