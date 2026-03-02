'use strict';

/**
 * Unit tests — parser.js
 * Covers: normalizeStatus, statusMeta, parseEpicsContent, parseStoryFile, replaceSection
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeStatus,
  statusMeta,
  parseEpicsContent,
  parseStoryFile,
  replaceSection,
} = require('../../src/parser');

// ─────────────────────────────────────────────────────────────────────────────
// normalizeStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('normalizeStatus', () => {
  it('retourne "backlog" pour une valeur vide', () => {
    assert.equal(normalizeStatus(''), 'backlog');
    assert.equal(normalizeStatus(null), 'backlog');
    assert.equal(normalizeStatus(undefined), 'backlog');
  });

  it('détecte "done" (emoji ✅ ou mot)', () => {
    assert.equal(normalizeStatus('✅ Done'), 'done');
    assert.equal(normalizeStatus('done'), 'done');
    assert.equal(normalizeStatus('Done'), 'done');
    assert.equal(normalizeStatus('  ✅  '), 'done');
  });

  it('détecte "ready-for-dev"', () => {
    assert.equal(normalizeStatus('ready-for-dev'), 'ready-for-dev');
    assert.equal(normalizeStatus('Ready for dev'), 'ready-for-dev');
    assert.equal(normalizeStatus('🔵 ready-for-dev'), 'ready-for-dev');
  });

  it('détecte "in-progress"', () => {
    assert.equal(normalizeStatus('in-progress'), 'in-progress');
    assert.equal(normalizeStatus('In Progress'), 'in-progress');
    assert.equal(normalizeStatus('🟡 in-progress'), 'in-progress');
  });

  it('retourne "backlog" pour les valeurs inconnues', () => {
    assert.equal(normalizeStatus('something random'), 'backlog');
    assert.equal(normalizeStatus('backlog'), 'backlog');
    assert.equal(normalizeStatus('TODO'), 'backlog');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// statusMeta
// ─────────────────────────────────────────────────────────────────────────────

describe('statusMeta', () => {
  it('retourne le bon label et css pour chaque statut', () => {
    assert.equal(statusMeta('done').css, 'done');
    assert.equal(statusMeta('ready-for-dev').css, 'ready');
    assert.equal(statusMeta('in-progress').css, 'in-progress');
    assert.equal(statusMeta('backlog').css, 'backlog');
    assert.equal(statusMeta('unknown').css, 'backlog');
  });

  it('retourne un objet avec label et css', () => {
    const meta = statusMeta('done');
    assert.ok(meta.label, 'label présent');
    assert.ok(meta.css, 'css présent');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseEpicsContent
// ─────────────────────────────────────────────────────────────────────────────

describe('parseEpicsContent', () => {
  it('retourne un tableau vide pour un contenu vide', () => {
    assert.deepEqual(parseEpicsContent(''), []);
    assert.deepEqual(parseEpicsContent('# Pas d\'epic ici\n\nJuste du texte.'), []);
  });

  it('parse un epic simple sans stories', () => {
    const content = '## Epic 1: Mon premier epic\n**Objectif :** Objectif de test\n';
    const epics = parseEpicsContent(content);
    assert.equal(epics.length, 1);
    assert.equal(epics[0].id, '1');
    assert.equal(epics[0].title, 'Mon premier epic');
    assert.equal(epics[0].objective, 'Objectif de test');
    assert.deepEqual(epics[0].stories, []);
  });

  it('parse les stories avec leur statut', () => {
    const content = [
      '## Epic 1: Epic de test',
      '**Objectif :** Faire des tests',
      '',
      '### Story 1.1: Première story',
      '**Statut [Sprint 1] :** ✅ Done',
      '',
      '### Story 1.2: Deuxième story',
      '**Statut [Sprint 2] :** ready-for-dev',
    ].join('\n');

    const epics = parseEpicsContent(content);
    assert.equal(epics.length, 1);
    assert.equal(epics[0].stories.length, 2);

    const [s1, s2] = epics[0].stories;
    assert.equal(s1.id, '1.1');
    assert.equal(s1.title, 'Première story');
    assert.equal(s1.status, 'done');

    assert.equal(s2.id, '1.2');
    assert.equal(s2.status, 'ready-for-dev');
  });

  it('parse plusieurs epics', () => {
    const content = [
      '## Epic 1: Premier',
      '### Story 1.1: Story A',
      '**Statut :** backlog',
      '',
      '## Epic 2: Deuxième',
      '### Story 2.1: Story B',
      '**Statut :** done',
    ].join('\n');

    const epics = parseEpicsContent(content);
    assert.equal(epics.length, 2);
    assert.equal(epics[0].id, '1');
    assert.equal(epics[1].id, '2');
    assert.equal(epics[1].stories[0].status, 'done');
  });

  it('chaque story a un epicId', () => {
    const content = '## Epic 3: Test\n### Story 3.1: Ma story\n';
    const epics = parseEpicsContent(content);
    assert.equal(epics[0].stories[0].epicId, '3');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// parseStoryFile
// ─────────────────────────────────────────────────────────────────────────────

describe('parseStoryFile', () => {
  const sampleFile = [
    '# Story 1.1: Ma story',
    '',
    'Status: in-progress',
    '',
    '## Story',
    '',
    'En tant qu\'utilisateur, je veux pouvoir me connecter.',
    '',
    '## Acceptance Criteria',
    '',
    '1. Le formulaire est accessible',
    '2. Les erreurs sont affichées',
    '',
    '## Tasks / Subtasks',
    '',
    '- [x] Créer le composant',
    '- [ ] Ajouter les tests',
    '',
    '## Dev Notes',
    '',
    'Utiliser le hook useAuth.',
  ].join('\n');

  it('parse le statut', () => {
    const result = parseStoryFile(sampleFile);
    assert.equal(result.status, 'in-progress');
  });

  it('parse la description (section ## Story)', () => {
    const result = parseStoryFile(sampleFile);
    assert.ok(result.description.includes('En tant qu\'utilisateur'));
  });

  it('parse les acceptance criteria (liste numérotée)', () => {
    const result = parseStoryFile(sampleFile);
    assert.equal(result.ac.length, 2);
    assert.ok(result.ac[0].includes('formulaire'));
    assert.ok(result.ac[1].includes('erreurs'));
  });

  it('parse les tasks avec leur état done/pending', () => {
    const result = parseStoryFile(sampleFile);
    assert.equal(result.tasks.length, 2);
    assert.equal(result.tasks[0].done, true);
    assert.equal(result.tasks[1].done, false);
    assert.ok(result.tasks[0].text.includes('Créer'));
  });

  it('parse les dev notes', () => {
    const result = parseStoryFile(sampleFile);
    assert.ok(result.devNotes.includes('useAuth'));
  });

  it('retourne des valeurs par défaut pour un fichier vide', () => {
    const result = parseStoryFile('');
    assert.equal(result.status, null);
    assert.equal(result.description, '');
    assert.deepEqual(result.ac, []);
    assert.deepEqual(result.tasks, []);
    assert.equal(result.devNotes, '');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// replaceSection
// ─────────────────────────────────────────────────────────────────────────────

describe('replaceSection', () => {
  const baseContent = [
    '# Story 1.1: Test',
    '',
    '## Story',
    '',
    'Ancien contenu de la story.',
    '',
    '## Acceptance Criteria',
    '',
    '1. Critère existant',
    '',
    '## Dev Notes',
    '',
    'Notes existantes.',
  ].join('\n');

  it('remplace le contenu d\'une section existante', () => {
    const result = replaceSection(baseContent, '## Story', 'Nouveau contenu.');
    assert.ok(result.includes('Nouveau contenu.'));
    assert.ok(!result.includes('Ancien contenu'));
  });

  it('préserve les autres sections', () => {
    const result = replaceSection(baseContent, '## Story', 'Nouveau contenu.');
    assert.ok(result.includes('## Acceptance Criteria'));
    assert.ok(result.includes('Critère existant'));
    assert.ok(result.includes('## Dev Notes'));
  });

  it('retourne le contenu inchangé si la section est introuvable', () => {
    const result = replaceSection(baseContent, '## Section inexistante', 'Contenu');
    assert.equal(result, baseContent);
  });

  it('remplace la section AC', () => {
    const newAc = '1. Nouveau critère\n2. Autre critère';
    const result = replaceSection(baseContent, '## Acceptance Criteria', newAc);
    assert.ok(result.includes('Nouveau critère'));
    assert.ok(!result.includes('Critère existant'));
  });
});
