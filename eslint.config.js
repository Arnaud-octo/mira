'use strict';

const js = require('@eslint/js');

const nodeGlobals = {
  require:      'readonly',
  module:       'writable',
  exports:      'writable',
  __dirname:    'readonly',
  __filename:   'readonly',
  process:      'readonly',
  console:      'readonly',
  Buffer:       'readonly',
  setTimeout:    'readonly',
  clearTimeout:  'readonly',
  setImmediate:  'readonly',
  URL:           'readonly',
};

const testGlobals = {
  describe:   'readonly',
  it:         'readonly',
  before:     'readonly',
  after:      'readonly',
  beforeEach: 'readonly',
  afterEach:  'readonly',
};

const noUnusedVarsRule = ['error', {
  varsIgnorePattern:        '^_',
  argsIgnorePattern:        '^_',
  caughtErrorsIgnorePattern: '^_',
}];

module.exports = [
  js.configs.recommended,

  // Source files — Node.js (server, parser, scripts)
  {
    files: ['src/server.js', 'src/parser.js', 'src/bmad-pipeline.js', 'scripts/**/*.js', 'index.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType:  'commonjs',
      globals: nodeGlobals,
    },
    rules: {
      'no-unused-vars': noUnusedVarsRule,
      'no-console':     'off',
      'no-var':         'error',
      'prefer-const':   'error',
    },
  },

  // Browser files — vanilla JS SPA
  {
    files: ['src/ui/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType:  'script',
      globals: {
        document:     'readonly',
        window:       'readonly',
        fetch:        'readonly',
        setTimeout:   'readonly',
        clearTimeout: 'readonly',
        console:      'readonly',
        EventSource:  'readonly',
      },
    },
    rules: {
      'no-unused-vars': noUnusedVarsRule,
      'no-console':     'off',
    },
  },

  // Test files
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType:  'commonjs',
      globals: { ...nodeGlobals, ...testGlobals },
    },
    rules: {
      'no-unused-vars': noUnusedVarsRule,
      'no-console':     'off',
    },
  },

  // Ignored paths
  {
    ignores: ['node_modules/**', 'coverage/**'],
  },
];
