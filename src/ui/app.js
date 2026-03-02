/**
 * app.js — Mira Dashboard (vanilla JS, no framework)
 *
 * Responsibilities:
 *   - Fetch project data from /api/data
 *   - Render 3 tabs: Epics, Board, Sprint
 *   - Open story modal on click
 *   - PATCH /api/story when status changes → reflect update immediately
 *   - Refresh button: re-fetch and re-render
 */

'use strict';

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const state = {
  data: null,          // { epics, sprints, currentSprint, meta }
  activeTab: 'epics',
  openStory: null,     // currently displayed story object
  openEpic: null,      // currently edited epic
  storyEditMode: false,// true when story modal is in edit mode
};

// ---------------------------------------------------------------------------
// DOM refs
// ---------------------------------------------------------------------------

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

/** Map canonical status → display label + CSS class */
const STATUS = {
  'done':          { label: '✅ Done',        css: 'done' },
  'ready-for-dev': { label: '🔵 Ready',       css: 'ready' },
  'in-progress':   { label: '🟡 In progress', css: 'in-progress' },
  'backlog':       { label: '○ Backlog',      css: 'backlog' },
};

function statusBadge(status) {
  const s = STATUS[status] || STATUS['backlog'];
  return `<span class="status-badge ${s.css}">${s.label}</span>`;
}

function priorityBadge(priority) {
  const map = { high: '🔴 Haute', medium: '🟠 Moyenne', low: '🟡 Faible' };
  return `<span class="priority-badge ${priority}">${map[priority] || priority}</span>`;
}

// ---------------------------------------------------------------------------
// Flat story list (across all epics)
// ---------------------------------------------------------------------------

function allStories(epics) {
  return epics.flatMap(e => e.stories);
}

function findStory(epics, id) {
  for (const epic of epics) {
    const s = epic.stories.find(s => s.id === id);
    if (s) return s;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Render: Epics tab
// ---------------------------------------------------------------------------

function renderEpics(epics) {
  const container = $('epics-list');
  if (!epics.length) {
    container.innerHTML = emptyState('Aucun epic trouvé', 'Lance tes agents BMAD pour générer planning-artifacts/epics.md');
    return;
  }

  container.innerHTML = epics.map(epic => {
    const total = epic.stories.length;
    const done  = epic.stories.filter(s => s.status === 'done').length;
    const pct   = total > 0 ? Math.round((done / total) * 100) : 0;

    const storiesRows = epic.stories.map(story => `
      <tr class="story-row" data-story-id="${esc(story.id)}" tabindex="0" role="button" aria-label="Voir story ${esc(story.id)}">
        <td><span class="story-id-badge">${esc(story.id)}</span></td>
        <td>
          <div>${esc(story.title)}</div>
          ${story.description ? `<div class="story-subtitle">${esc(story.description)}</div>` : ''}
        </td>
        <td>${statusBadge(story.status)}</td>
      </tr>
    `).join('');

    return `
      <div class="epic-card" data-epic-id="${esc(epic.id)}">
        <div class="epic-header" data-toggle="${esc(epic.id)}">
          <div class="epic-header-main">
            <div class="epic-header-top">
              <span class="epic-num">Epic ${esc(epic.id)}</span>
              <span class="epic-title">${esc(epic.title)}</span>
            </div>
            ${epic.objective ? `<p class="epic-objective">${esc(epic.objective)}</p>` : ''}
          </div>
          <div class="epic-header-right">
            <div class="epic-progress-bar-wrap" title="${done}/${total} done">
              <div class="epic-progress-bar" style="width:${pct}%"></div>
            </div>
            <span class="epic-progress-label">${done}/${total}</span>
            <button class="btn-icon btn-edit-epic" data-epic-id="${esc(epic.id)}" title="Modifier l'epic">✏️</button>
            <span class="epic-chevron">›</span>
          </div>
        </div>
        <div class="epic-body">
          <table class="stories-table">
            <thead>
              <tr>
                <th style="width:60px">ID</th>
                <th>Story</th>
                <th style="width:140px">Statut</th>
              </tr>
            </thead>
            <tbody>${storiesRows}</tbody>
          </table>
        </div>
      </div>
    `;
  }).join('');

  // Toggle epic open/close (but not when clicking the edit button)
  container.querySelectorAll('.epic-header').forEach(header => {
    header.addEventListener('click', e => {
      if (e.target.closest('.btn-edit-epic')) return;
      const card = header.closest('.epic-card');
      card.classList.toggle('open');
    });
  });

  // ✏️ Edit epic button
  container.querySelectorAll('.btn-edit-epic').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const epic = state.data.epics.find(ep => ep.id === btn.dataset.epicId);
      if (epic) openEpicEditModal(epic);
    });
  });

  // Open story modal on row click
  bindStoryRows(container);
}

// ---------------------------------------------------------------------------
// Render: Board tab
// ---------------------------------------------------------------------------

function renderBoard(epics) {
  const cols = {
    'backlog':       $('col-backlog'),
    'ready-for-dev': $('col-ready'),
    'in-progress':   $('col-in-progress'),
    'done':          $('col-done'),
  };

  // Clear
  Object.values(cols).forEach(c => { c.innerHTML = ''; });

  const stories = allStories(epics);
  if (!stories.length) {
    Object.values(cols).forEach(c => { c.innerHTML = '<div style="padding:10px;color:var(--c-text-3);font-size:12px">—</div>'; });
    return;
  }

  for (const story of stories) {
    const col = cols[story.status] || cols['backlog'];
    const epic = epics.find(e => e.id === story.epicId);

    const card = document.createElement('div');
    card.className = 'board-card';
    card.dataset.storyId = story.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.innerHTML = `
      <div class="board-card-id">${esc(story.id)}</div>
      <div class="board-card-title">${esc(story.title)}</div>
      ${story.description ? `<div class="board-card-desc">${esc(story.description)}</div>` : ''}
      ${epic ? `<div class="board-card-epic">Epic ${esc(epic.id)}</div>` : ''}
    `;

    card.addEventListener('click', () => openModal(story));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(story); });
    col.appendChild(card);
  }
}

// ---------------------------------------------------------------------------
// Render: Sprint tab
// ---------------------------------------------------------------------------

function renderSprint(currentSprint, epics) {
  const container = $('sprint-view');

  if (!currentSprint) {
    container.innerHTML = emptyState('Aucun sprint trouvé', 'Lance ton agent BMAD pour générer implementation-artifacts/sprint-N-planning-*.md');
    return;
  }

  // Build a map of all stories for status lookup
  const storyMap = new Map(allStories(epics).map(s => [s.id, s]));

  const rows = currentSprint.stories.map((ss, i) => {
    // ss.ref = "5-2" → try to find as story "5.2"
    const storyId = ss.ref.replace('-', '.');
    const story   = storyMap.get(storyId);
    const status  = story ? statusBadge(story.status) : '<span class="status-badge backlog">—</span>';
    const clickable = story ? `data-story-id="${esc(storyId)}"` : '';

    return `
      <tr class="${story ? 'sprint-story-row' : ''}" ${clickable} tabindex="${story ? 0 : -1}">
        <td style="width:32px;color:var(--c-text-3)">${i + 1}</td>
        <td><strong style="font-family:var(--font-mono);font-size:11px;color:var(--c-text-2)">${esc(ss.ref)}</strong></td>
        <td>${esc(ss.title)}</td>
        <td>${priorityBadge(ss.priority)}</td>
        <td>${status}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="sprint-header">
      <div class="sprint-meta">
        <span class="sprint-badge">Sprint ${currentSprint.number}</span>
        ${currentSprint.date ? `<span class="sprint-date">${esc(currentSprint.date)}</span>` : ''}
      </div>
      ${currentSprint.goal ? `<div class="sprint-goal">"${esc(currentSprint.goal)}"</div>` : ''}
    </div>

    <div class="sprint-table-wrap">
      <table class="sprint-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ref</th>
            <th>Story</th>
            <th style="width:110px">Priorité</th>
            <th style="width:140px">Statut</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  bindStoryRows(container);
}

// ---------------------------------------------------------------------------
// Render: Meta (header progress pill)
// ---------------------------------------------------------------------------

function renderMeta(meta) {
  $('project-name').textContent = meta.projectName || '—';
  $('meta-progress').textContent = `${meta.doneStories}/${meta.totalStories} done`;
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

function renderAll(data) {
  state.data = data;
  renderMeta(data.meta);
  if (state.activeTab === 'epics')  renderEpics(data.epics);
  if (state.activeTab === 'board')  renderBoard(data.epics);
  if (state.activeTab === 'sprint') renderSprint(data.currentSprint, data.epics);
}

function renderCurrentTab() {
  if (!state.data) return;
  if (state.activeTab === 'epics')  renderEpics(state.data.epics);
  if (state.activeTab === 'board')  renderBoard(state.data.epics);
  if (state.activeTab === 'sprint') renderSprint(state.data.currentSprint, state.data.epics);
}

// ---------------------------------------------------------------------------
// Story modal
// ---------------------------------------------------------------------------

function openModal(story) {
  state.openStory = story;

  $('modal-story-id').textContent = `Story ${story.id}`;
  $('modal-title').textContent = story.title;

  // Status select
  const select = $('modal-status');
  select.value = story.status;
  $('save-indicator').textContent = '';
  $('save-indicator').classList.remove('visible');

  // Build body
  const body = $('modal-body');
  body.innerHTML = '';

  // Description (user story)
  if (story.description) {
    const sec = section('Story');
    const desc = document.createElement('p');
    desc.className = 'modal-description';
    desc.textContent = story.description;
    sec.appendChild(desc);
    body.appendChild(sec);
  }

  // Acceptance Criteria
  if (story.ac && story.ac.length) {
    const sec = section('Acceptance Criteria');
    const ul = document.createElement('ul');
    ul.className = 'modal-ac-list';
    story.ac.forEach((item, i) => {
      const li = document.createElement('li');
      li.className = 'modal-ac-item';
      li.innerHTML = `<span class="modal-ac-num">${i + 1}.</span><span>${esc(item)}</span>`;
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    body.appendChild(sec);
  }

  // Tasks
  if (story.tasks && story.tasks.length) {
    const sec = section('Tasks');
    const ul = document.createElement('ul');
    ul.className = 'modal-tasks-list';
    story.tasks.forEach(task => {
      const li = document.createElement('li');
      li.className = `modal-task ${task.done ? 'done-task' : ''}`;
      li.innerHTML = `
        <span class="modal-task-check">${task.done ? '☑' : '☐'}</span>
        <span>${esc(task.text)}</span>
      `;
      ul.appendChild(li);
    });
    sec.appendChild(ul);
    body.appendChild(sec);
  }

  // Dev Notes
  if (story.devNotes) {
    const sec = section('Dev Notes');
    const pre = document.createElement('pre');
    pre.className = 'modal-dev-notes';
    pre.textContent = story.devNotes;
    sec.appendChild(pre);
    body.appendChild(sec);
  }

  $('modal').classList.remove('hidden');
  $('modal-close').focus();
}

function section(title) {
  const div = document.createElement('div');
  div.className = 'modal-section';
  const h = document.createElement('div');
  h.className = 'modal-section-title';
  h.textContent = title;
  div.appendChild(h);
  return div;
}

function closeModal() {
  $('modal').classList.add('hidden');
  state.openStory = null;
  state.storyEditMode = false;
  $('btn-story-edit').textContent = '✏️';
}

// ---------------------------------------------------------------------------
// Story modal — edit mode
// ---------------------------------------------------------------------------

function enterStoryEditMode() {
  const story = state.openStory;
  if (!story) return;

  state.storyEditMode = true;
  $('btn-story-edit').textContent = '👁';
  $('btn-story-edit').title = 'Mode lecture';

  const body = $('modal-body');
  const hasFile = !!story.file;

  body.innerHTML = `
    <div class="edit-form">
      <div class="edit-field">
        <label class="edit-label" for="edit-story-title">Titre</label>
        <input class="edit-input" type="text" id="edit-story-title" value="${esc(story.title)}" />
      </div>
      <div class="edit-field">
        <label class="edit-label" for="edit-story-desc">
          User story
          ${!hasFile ? '<span class="edit-hint">(fichier individuel requis pour sauvegarder)</span>' : ''}
        </label>
        <textarea class="edit-textarea" id="edit-story-desc" rows="4" ${!hasFile ? 'disabled' : ''}>${esc(story.description || '')}</textarea>
      </div>
      <div class="edit-field">
        <label class="edit-label">
          Acceptance Criteria
          ${!hasFile ? '<span class="edit-hint">(fichier individuel requis)</span>' : ''}
        </label>
        <ul class="ac-edit-list" id="ac-edit-list">
          ${(story.ac || []).map((item, i) => acEditItem(item, i)).join('')}
        </ul>
        ${hasFile ? `<button class="btn-add-ac" id="btn-add-ac">+ Ajouter un critère</button>` : ''}
      </div>
      <div class="edit-field">
        <label class="edit-label" for="edit-story-notes">
          Dev Notes
          ${!hasFile ? '<span class="edit-hint">(fichier individuel requis)</span>' : ''}
        </label>
        <textarea class="edit-textarea edit-textarea-mono" id="edit-story-notes" rows="5" ${!hasFile ? 'disabled' : ''}>${esc(story.devNotes || '')}</textarea>
      </div>
      <div class="edit-actions">
        <button class="btn-save" id="btn-story-save">💾 Enregistrer</button>
        <button class="btn-cancel" id="btn-story-cancel">Annuler</button>
        <span class="save-indicator" id="story-edit-indicator"></span>
      </div>
    </div>
  `;

  // Add AC item button
  if (hasFile) {
    $('btn-add-ac') && $('btn-add-ac').addEventListener('click', () => {
      const list = $('ac-edit-list');
      const idx = list.children.length;
      const li = document.createElement('li');
      li.innerHTML = acEditItem('', idx);
      list.appendChild(li);
      li.querySelector('input').focus();
    });

    // Remove AC item buttons (delegated)
    $('ac-edit-list').addEventListener('click', e => {
      if (e.target.closest('.btn-remove-ac')) {
        e.target.closest('li').remove();
        // Re-number labels
        $('ac-edit-list').querySelectorAll('.ac-num').forEach((span, i) => {
          span.textContent = i + 1;
        });
      }
    });
  }

  // Save button
  $('btn-story-save').addEventListener('click', saveStoryEdit);

  // Cancel → back to view mode
  $('btn-story-cancel').addEventListener('click', () => {
    exitStoryEditMode();
  });
}

function acEditItem(text, idx) {
  return `
    <li class="ac-edit-item">
      <span class="ac-num">${idx + 1}</span>
      <input class="ac-input" type="text" value="${esc(text)}" placeholder="Critère d'acceptance…" />
      <button class="btn-remove-ac" title="Supprimer">×</button>
    </li>
  `;
}

function exitStoryEditMode() {
  state.storyEditMode = false;
  $('btn-story-edit').textContent = '✏️';
  $('btn-story-edit').title = 'Modifier la story';
  // Re-render the story in view mode
  const story = findStory(state.data.epics, state.openStory.id);
  if (story) openModal(story);
}

async function saveStoryEdit() {
  const story = state.openStory;
  const indicator = $('story-edit-indicator');
  indicator.textContent = '…';
  indicator.classList.add('visible');

  const fields = {
    id: story.id,
    title: $('edit-story-title').value.trim(),
    _snapshot: story,
  };

  if (story.file) {
    fields.description = $('edit-story-desc').value.trim();
    fields.devNotes    = $('edit-story-notes').value.trim();
    fields.ac = Array.from($('ac-edit-list').querySelectorAll('.ac-input'))
      .map(inp => inp.value.trim())
      .filter(Boolean);
  }

  try {
    const res = await fetch('/api/story', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
    const { data } = await res.json();

    state.data = data;
    renderMeta(data.meta);
    renderCurrentTab();

    indicator.textContent = '✅ Sauvegardé';
    setTimeout(() => exitStoryEditMode(), 800);

  } catch (err) {
    indicator.textContent = '❌ ' + err.message;
    showToast(err.message, true);
  }
}

// ---------------------------------------------------------------------------
// Epic edit modal
// ---------------------------------------------------------------------------

function openEpicEditModal(epic) {
  state.openEpic = epic;
  $('epic-modal-id').textContent = `Epic ${epic.id}`;
  $('edit-epic-title').value = epic.title || '';
  $('edit-epic-objective').value = epic.objective || '';
  $('epic-save-indicator').textContent = '';
  $('epic-save-indicator').classList.remove('visible');
  $('epic-modal').classList.remove('hidden');
  $('edit-epic-title').focus();
}

function closeEpicModal() {
  $('epic-modal').classList.add('hidden');
  state.openEpic = null;
}

async function saveEpicEdit() {
  const epic = state.openEpic;
  if (!epic) return;

  const indicator = $('epic-save-indicator');
  indicator.textContent = '…';
  indicator.classList.add('visible');

  const title     = $('edit-epic-title').value.trim();
  const objective = $('edit-epic-objective').value.trim();

  try {
    const res = await fetch('/api/epic', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: epic.id, title, objective }),
    });
    if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
    const { data } = await res.json();

    state.data = data;
    renderMeta(data.meta);
    renderCurrentTab();

    indicator.textContent = '✅ Sauvegardé';
    setTimeout(() => closeEpicModal(), 600);

  } catch (err) {
    indicator.textContent = '❌ ' + err.message;
    showToast(err.message, true);
  }
}

// ---------------------------------------------------------------------------
// Story rows click binding (shared by epics + sprint tables)
// ---------------------------------------------------------------------------

function bindStoryRows(container) {
  container.querySelectorAll('[data-story-id]').forEach(el => {
    el.addEventListener('click', () => {
      const story = findStory(state.data.epics, el.dataset.storyId);
      if (story) openModal(story);
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        const story = findStory(state.data.epics, el.dataset.storyId);
        if (story) openModal(story);
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Status change → PATCH API → re-render
// ---------------------------------------------------------------------------

async function patchStoryStatus(storyId, newStatus) {
  const indicator = $('save-indicator');
  indicator.textContent = '…';
  indicator.classList.add('visible');

  try {
    const res = await fetch('/api/story', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: storyId, status: newStatus }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Erreur serveur' }));
      throw new Error(err.error || 'Erreur');
    }

    const { data } = await res.json();
    state.data = data;

    // Update the open story object in-place
    const updated = findStory(data.epics, storyId);
    if (updated) state.openStory = updated;

    renderMeta(data.meta);
    renderCurrentTab();

    indicator.textContent = '✅ Sauvegardé';
    setTimeout(() => indicator.classList.remove('visible'), 2000);

  } catch (err) {
    indicator.textContent = '❌ Erreur';
    showToast(err.message, true);
    setTimeout(() => indicator.classList.remove('visible'), 3000);
  }
}

// ---------------------------------------------------------------------------
// Data fetch
// ---------------------------------------------------------------------------

async function fetchData(url = '/api/data') {
  const btn = $('btn-refresh');
  btn.classList.add('spinning');
  try {
    const res  = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    renderAll(data);
  } catch (err) {
    showToast('Impossible de charger les données : ' + err.message, true);
  } finally {
    btn.classList.remove('spinning');
  }
}

// ---------------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------------

let toastTimer = null;

function showToast(msg, isError = false) {
  const el = $('toast');
  el.textContent = msg;
  el.className = `toast ${isError ? 'error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.add('hidden'); }, 3000);
}

// ---------------------------------------------------------------------------
// Utility: safe HTML escape
// ---------------------------------------------------------------------------

function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// Empty state template
// ---------------------------------------------------------------------------

function emptyState(title, desc) {
  return `
    <div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-title">${esc(title)}</div>
      <div class="empty-state-desc">${esc(desc)}</div>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Event bindings
// ---------------------------------------------------------------------------

function bindEvents() {
  // Tab switching
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');

      const tabId = btn.dataset.tab;
      state.activeTab = tabId;

      $$('.tab-content').forEach(c => c.classList.remove('active'));
      $(`tab-${tabId}`).classList.add('active');

      renderCurrentTab();
    });
  });

  // Refresh button
  $('btn-refresh').addEventListener('click', () => fetchData('/api/refresh'));

  // Story modal: close
  $('modal-overlay').addEventListener('click', closeModal);
  $('modal-close').addEventListener('click', closeModal);

  // Story modal: toggle edit mode
  $('btn-story-edit').addEventListener('click', () => {
    state.storyEditMode ? exitStoryEditMode() : enterStoryEditMode();
  });

  // Story modal: status change → auto-save
  $('modal-status').addEventListener('change', e => {
    if (state.openStory) patchStoryStatus(state.openStory.id, e.target.value);
  });

  // Epic modal: close
  $('epic-modal-overlay').addEventListener('click', closeEpicModal);
  $('epic-modal-close').addEventListener('click', closeEpicModal);

  // Epic modal: save
  $('btn-epic-save').addEventListener('click', saveEpicEdit);
  $('btn-epic-cancel').addEventListener('click', closeEpicModal);

  // Epic modal: save on Enter in title field
  $('edit-epic-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveEpicEdit();
  });

  // Close on Escape (both modals)
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeModal();
      closeEpicModal();
    }
  });
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  fetchData();
});
