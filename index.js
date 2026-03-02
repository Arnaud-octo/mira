/**
 * mira-bmad
 * Local visualization dashboard for BMAD projects.
 *
 * Usage:
 *   npx mira                  — start the local dashboard
 *   npx mira-install          — optional setup check for a BMAD project
 *
 * Reads _bmad-output/ from the current working directory and serves
 * a local web UI at http://localhost:4242
 */

const path = require('path');

module.exports = {
  version: require('./package.json').version,
  startServer: require('./src/server').startServer,
  parseProject: require('./src/parser').parseProject,
  configTemplate: path.join(__dirname, '_bmad', 'bme', '_mira', 'config.yaml'),
};
