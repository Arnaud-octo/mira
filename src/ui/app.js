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
  activeTab: 'board',
  openStory: null,     // currently displayed story object
  openEpic: null,      // currently edited epic
  storyEditMode: false,// true when story modal is in edit mode
  filterEpicId: null,  // active epic filter on Board tab (null = all)
  pipeline: {},        // storyId → { phase, label } — active pipeline indicators
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
  'done':          { label: '✅ Done',            css: 'done' },
  'ready-for-dev': { label: '🔵 Ready for dev',   css: 'ready' },
  'in-progress':   { label: '🟡 Dev in progress', css: 'in-progress' },
  'review':        { label: '🟣 Review',          css: 'review' },
  'qa':            { label: '🟠 QA',              css: 'qa' },
  'backlog':       { label: '○ Backlog',          css: 'backlog' },
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
// VS Code file link helper
// ---------------------------------------------------------------------------

function vscodeLinkBtn(absolutePath) {
  if (!absolutePath) return '';
  const uri = 'vscode://file/' + absolutePath;
  // Stop propagation so clicking the link doesn't open the modal/toggle
  return `<a class="vscode-link" href="${uri}" title="Ouvrir dans VS Code" onclick="event.stopPropagation()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></a>`;
}

function storyVscodePath(story) {
  const outputDir = state.data && state.data.meta && state.data.meta.outputDir;
  if (!outputDir || !story.file) return null;
  return outputDir + '/' + story.file;
}

function epicVscodePath() {
  const outputDir = state.data && state.data.meta && state.data.meta.outputDir;
  if (!outputDir) return null;
  return outputDir + '/planning-artifacts/epics.md';
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
          <div>${esc(story.title)} ${vscodeLinkBtn(storyVscodePath(story))}</div>
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
            ${vscodeLinkBtn(epicVscodePath())}
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

function renderBoardFilter(epics) {
  // Remove previous filter bar if any
  const existing = document.querySelector('.board-filter-bar');
  if (existing) existing.remove();

  const boardSection = $('tab-board');
  const bar = document.createElement('div');
  bar.className = 'board-filter-bar';

  // "Tous" button
  const allBtn = document.createElement('button');
  allBtn.className = 'board-filter-pill' + (state.filterEpicId === null ? ' active' : '');
  allBtn.textContent = 'Tous';
  allBtn.addEventListener('click', () => {
    state.filterEpicId = null;
    renderBoard(state.data.epics);
  });
  bar.appendChild(allBtn);

  // One pill per epic
  for (const epic of epics) {
    const hasStories = epic.stories.length > 0;
    const btn = document.createElement('button');
    btn.className = 'board-filter-pill' +
      (state.filterEpicId === epic.id ? ' active' : '') +
      (!hasStories ? ' disabled' : '');
    btn.dataset.epicId = epic.id;
    btn.textContent = `Epic ${epic.id}`;
    btn.title = epic.title;
    btn.disabled = !hasStories;
    btn.addEventListener('click', () => {
      state.filterEpicId = epic.id;
      renderBoard(state.data.epics);
    });
    bar.appendChild(btn);
  }

  boardSection.insertBefore(bar, boardSection.firstChild);
}

function renderBoard(epics) {
  renderBoardFilter(epics);

  const cols = {
    'backlog':       $('col-backlog'),
    'ready-for-dev': $('col-ready'),
    'in-progress':   $('col-in-progress'),
    'review':        $('col-review'),
    'qa':            $('col-qa'),
    'done':          $('col-done'),
  };

  // Clear
  Object.values(cols).forEach(c => { c.innerHTML = ''; });

  const stories = allStories(epics).filter(s =>
    state.filterEpicId === null || s.epicId === state.filterEpicId
  );

  if (!allStories(epics).length) {
    Object.values(cols).forEach(c => { c.innerHTML = '<div style="padding:10px;color:var(--c-text-3);font-size:12px">—</div>'; });
    return;
  }

  // Drop zones
  Object.entries(cols).forEach(([status, colEl]) => {
    colEl.addEventListener('dragover', e => {
      e.preventDefault();
      colEl.classList.add('drag-over');
    });
    colEl.addEventListener('dragleave', () => colEl.classList.remove('drag-over'));
    colEl.addEventListener('drop', async e => {
      e.preventDefault();
      colEl.classList.remove('drag-over');
      const storyId = e.dataTransfer.getData('text/plain');
      if (!storyId) return;
      const story = findStory(state.data.epics, storyId);
      if (!story || story.status === status) return;
      await patchStoryStatus(storyId, status);
    });
  });

  for (const story of stories) {
    const col = cols[story.status] || cols['backlog'];
    const epic = epics.find(e => e.id === story.epicId);

    const card = document.createElement('div');
    const pl = state.pipeline[story.id];
    card.className = 'board-card' + (pl && pl.phase === 'running' ? ' pipeline-running' : '');
    card.dataset.storyId = story.id;
    card.setAttribute('role', 'button');
    card.setAttribute('tabindex', '0');
    card.setAttribute('draggable', 'true');
    card.innerHTML = `
      <div class="board-card-top">
        <div class="board-card-id">${esc(story.id)}</div>
        ${vscodeLinkBtn(storyVscodePath(story))}
      </div>
      <div class="board-card-title">${esc(story.title)}</div>
      ${story.description ? `<div class="board-card-desc">${esc(story.description)}</div>` : ''}
      ${epic ? `<div class="board-card-epic">Epic ${esc(epic.id)}</div>` : ''}
      ${pl ? `<div class="pipeline-indicator ${pl.phase}">
        <span class="pipeline-dot"></span>
        <span class="pipeline-label">${esc(pl.label)}</span>
      </div>` : ''}
    `;

    card.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', story.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('click', () => openModal(story));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') openModal(story); });
    col.appendChild(card);
  }
}

// ---------------------------------------------------------------------------
// Render: Sprint tab
// ---------------------------------------------------------------------------

function renderSprint(sprints, currentSprint, epics) {
  const container = $('sprint-view');

  if (!sprints || !sprints.length) {
    container.innerHTML = emptyState('Aucun sprint trouvé', 'Lance ton agent BMAD pour générer implementation-artifacts/sprint-N-planning-*.md');
    return;
  }

  const storyMap = new Map(allStories(epics).map(s => [s.id, s]));

  // Sprints sorted ascending for timeline (Sprint 1, Sprint 2, …)
  const sorted = [...sprints].sort((a, b) => a.number - b.number);
  const active = currentSprint || sorted[sorted.length - 1];

  // Format date: "2026-03-04" → "4 mars 2026"
  function fmtDate(d) {
    if (!d) return '?';
    const [y, m, day] = d.split('-');
    const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sep.','oct.','nov.','déc.'];
    return `${parseInt(day, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
  }

  // Render stories table for a given sprint
  function storiesTable(sprint) {
    if (!sprint.stories.length) return '<p style="padding:16px;color:var(--c-text-3)">Aucune story dans ce sprint.</p>';
    const rows = sprint.stories.map((ss, i) => {
      const storyId   = ss.ref.replace('-', '.');
      const story     = storyMap.get(storyId);
      const status    = story ? statusBadge(story.status) : '<span class="status-badge backlog">—</span>';
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
    return `
      <table class="sprint-table">
        <thead>
          <tr>
            <th>#</th><th>Ref</th><th>Story</th>
            <th style="width:110px">Priorité</th>
            <th style="width:140px">Statut</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  // Render sprint detail card
  function detailHtml(sprint) {
    const dates = sprint.startDate
      ? `<span class="sprint-date">${fmtDate(sprint.startDate)} → ${fmtDate(sprint.endDate)}</span>`
      : (sprint.date ? `<span class="sprint-date">${esc(sprint.date)}</span>` : '');
    const pct     = sprint.progress || 0;
    const done    = sprint.doneStories  || 0;
    const total   = sprint.totalStories || sprint.stories.length;
    const statusLabel = sprint.sprintStatus === 'past'    ? '✅ Terminé'
                      : sprint.sprintStatus === 'current' ? '🔵 En cours'
                      : '🕐 À venir';
    return `
      <div class="sprint-header">
        <div class="sprint-meta">
          <span class="sprint-badge">Sprint ${sprint.number}</span>
          ${dates}
          <span class="sprint-lifecycle-badge ${sprint.sprintStatus || 'current'}">${statusLabel}</span>
        </div>
        ${sprint.goal ? `<div class="sprint-goal">"${esc(sprint.goal)}"</div>` : ''}
        <div class="sprint-progress-wrap">
          <div class="sprint-progress-bar">
            <div class="sprint-progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="sprint-progress-label">${pct}% — ${done}/${total} stories terminées</span>
        </div>
      </div>
      <div class="sprint-table-wrap">
        ${storiesTable(sprint)}
      </div>
    `;
  }

  // Sprint timeline cards
  const timelineCards = sorted.map(sprint => {
    const isCurrent = active && sprint.number === active.number;
    const statusCls = sprint.sprintStatus || 'current';
    const pct       = sprint.progress || 0;
    const done      = sprint.doneStories  || 0;
    const total     = sprint.totalStories || sprint.stories.length;
    return `
      <div class="sprint-tc ${statusCls}${isCurrent ? ' active' : ''}"
           data-sprint-num="${sprint.number}" role="button" tabindex="0">
        <div class="sprint-tc-top">
          <span class="sprint-tc-num">Sprint ${sprint.number}</span>
          <span class="sprint-tc-status ${statusCls}">
            ${statusCls === 'past' ? '✅' : statusCls === 'current' ? '🔵' : '🕐'}
          </span>
        </div>
        ${sprint.startDate ? `
          <div class="sprint-tc-dates">${fmtDate(sprint.startDate)}<br>${fmtDate(sprint.endDate)}</div>
        ` : ''}
        <div class="sprint-tc-bar-wrap">
          <div class="sprint-tc-bar">
            <div class="sprint-tc-fill" style="width:${pct}%"></div>
          </div>
          <span class="sprint-tc-count">${done}/${total}</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="sprint-timeline">${timelineCards}</div>
    <div id="sprint-detail">${detailHtml(active)}</div>
  `;

  bindStoryRows(container);

  // Click on timeline card → update detail panel
  container.querySelectorAll('.sprint-tc').forEach(card => {
    function activate() {
      const num    = parseInt(card.dataset.sprintNum, 10);
      const sprint = sprints.find(s => s.number === num);
      if (!sprint) return;
      container.querySelectorAll('.sprint-tc').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      const detail = $('sprint-detail');
      detail.innerHTML = detailHtml(sprint);
      bindStoryRows(detail);
    }
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') activate(); });
  });
}

// ---------------------------------------------------------------------------
// Render: Retro tab
// ---------------------------------------------------------------------------

function renderRetro(retros) {
  const container = $('retro-view');

  if (!retros || !retros.length) {
    container.innerHTML = emptyState(
      'Aucune rétrospective trouvée',
      'Crée un fichier sprint-{N}-retro-{date}.md dans implementation-artifacts/'
    );
    return;
  }

  const retro = retros[0]; // most recent first

  const selectorHtml = retros.length > 1
    ? `<div class="retro-selector">
        ${retros.map((r, i) => `
          <button class="retro-selector-btn${i === 0 ? ' active' : ''}" data-retro-idx="${i}">
            Sprint ${r.sprintNumber}
          </button>
        `).join('')}
       </div>`
    : '';

  function retroHtml(r) {
    function listSection(title, items) {
      if (!items.length) return '';
      return `
        <div class="retro-section">
          <div class="retro-section-title">${esc(title)}</div>
          <ul class="retro-list">
            ${items.map(item => `<li>${esc(item)}</li>`).join('')}
          </ul>
        </div>
      `;
    }
    return `
      <div class="retro-header">
        <span class="sprint-badge">Sprint ${r.sprintNumber}</span>
        ${r.date ? `<span class="sprint-date">${esc(r.date)}</span>` : ''}
      </div>
      <div class="retro-body">
        ${listSection('Ce qui a bien marché ✅', r.wentWell)}
        ${listSection('Ce qui peut être amélioré 🔧', r.improve)}
        ${listSection('Actions pour le prochain sprint 🎯', r.actions)}
        ${!r.wentWell.length && !r.improve.length && !r.actions.length
          ? `<p style="color:var(--c-text-3);font-size:13px">Fichier vide ou format non reconnu.</p>`
          : ''}
      </div>
    `;
  }

  container.innerHTML = `
    ${selectorHtml}
    <div class="retro-card" id="retro-content">
      ${retroHtml(retro)}
    </div>
  `;

  // Selector buttons (only when multiple retros exist)
  if (retros.length > 1) {
    container.querySelectorAll('.retro-selector-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        container.querySelectorAll('.retro-selector-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        $('retro-content').innerHTML = retroHtml(retros[parseInt(btn.dataset.retroIdx, 10)]);
      });
    });
  }
}

// ---------------------------------------------------------------------------
// Render: Meta (header progress pill)
// ---------------------------------------------------------------------------

function renderMeta(meta) {
  $('project-name').textContent = meta.projectName || '—';
  const pill = $('meta-progress');
  if (!meta.totalStories) {
    pill.innerHTML = '<span class="progress-pill-text">—</span>';
    return;
  }
  const pct = Math.round((meta.doneStories / meta.totalStories) * 100);
  pill.innerHTML = `
    <div class="progress-pill-bar-wrap" title="${meta.doneStories}/${meta.totalStories} stories terminées">
      <div class="progress-pill-bar" style="width:${pct}%"></div>
    </div>
    <span class="progress-pill-text">${pct}%&thinsp;<span class="progress-pill-count">${meta.doneStories}/${meta.totalStories}</span></span>
  `;
}

// ---------------------------------------------------------------------------
// Full render
// ---------------------------------------------------------------------------

function renderAll(data) {
  state.data = data;
  renderMeta(data.meta);
  // Show retro tab only when retros exist
  const retroBtn = $('tab-btn-retro');
  if (retroBtn) retroBtn.style.display = (data.retros && data.retros.length) ? '' : 'none';
  if (state.activeTab === 'epics')  renderEpics(data.epics);
  if (state.activeTab === 'board')  renderBoard(data.epics);
  if (state.activeTab === 'sprint') renderSprint(data.sprints, data.currentSprint, data.epics);
  if (state.activeTab === 'retro')  renderRetro(data.retros);
}

function renderCurrentTab() {
  if (!state.data) return;
  if (state.activeTab === 'epics')  renderEpics(state.data.epics);
  if (state.activeTab === 'board')  renderBoard(state.data.epics);
  if (state.activeTab === 'sprint') renderSprint(state.data.sprints, state.data.currentSprint, state.data.epics);
  if (state.activeTab === 'retro')  renderRetro(state.data.retros);
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
// Search
// ---------------------------------------------------------------------------

function renderSearchResults(query) {
  const results = $('search-results');
  if (!query || !state.data) {
    results.classList.add('hidden');
    results.innerHTML = '';
    return;
  }

  const q = query.toLowerCase();
  const matches = [];

  for (const epic of state.data.epics) {
    // Epic match
    const epicMatch =
      epic.title.toLowerCase().includes(q) ||
      (epic.objective && epic.objective.toLowerCase().includes(q));

    for (const story of epic.stories) {
      const storyMatch =
        story.title.toLowerCase().includes(q) ||
        (story.description && story.description.toLowerCase().includes(q));

      if (storyMatch || epicMatch) {
        matches.push({ story, epic });
      }
    }
  }

  if (!matches.length) {
    results.innerHTML = '<div class="search-empty">Aucun résultat</div>';
    results.classList.remove('hidden');
    return;
  }

  results.innerHTML = matches.map(({ story, epic }) => `
    <div class="search-item" data-story-id="${esc(story.id)}" role="option" tabindex="0">
      <div class="search-item-top">
        <span class="search-item-id">${esc(story.id)}</span>
        <span class="search-item-title">${highlight(story.title, q)}</span>
      </div>
      <div class="search-item-meta">
        <span class="search-item-epic">Epic ${esc(epic.id)} — ${esc(epic.title)}</span>
        ${statusBadge(story.status)}
      </div>
    </div>
  `).join('');

  results.querySelectorAll('.search-item').forEach(el => {
    el.addEventListener('click', () => {
      const story = findStory(state.data.epics, el.dataset.storyId);
      if (story) {
        closeSearch();
        openModal(story);
      }
    });
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        el.click();
      }
    });
  });

  results.classList.remove('hidden');
}

function highlight(text, query) {
  const escaped = esc(text);
  const escapedQuery = esc(query);
  const re = new RegExp(`(${escapedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return escaped.replace(re, '<mark>$1</mark>');
}

function closeSearch() {
  $('search-input').value = '';
  $('search-results').classList.add('hidden');
  $('search-results').innerHTML = '';
}

function bindSearch() {
  const input = $('search-input');
  const wrap  = $('search-wrap');

  input.addEventListener('input', () => renderSearchResults(input.value.trim()));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });

  // Close when clicking outside
  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) closeSearch();
  });
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

      // Reset board filter when leaving the board tab
      if (tabId !== 'board') state.filterEpicId = null;

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
      closeSearch();
      closeModal();
      closeEpicModal();
    }
  });
}

// ---------------------------------------------------------------------------
// SSE — file watcher auto-refresh
// ---------------------------------------------------------------------------

function connectEventSource() {
  const evtSource = new EventSource('/api/events');

  evtSource.onmessage = async () => {
    await fetchData('/api/refresh');
    showToast('↻ Mis à jour');
  };

  // Pipeline visual feedback (named SSE event)
  evtSource.addEventListener('pipeline', e => {
    const d = JSON.parse(e.data);
    if (d.phase === 'done' || d.phase === 'error') {
      delete state.pipeline[d.storyId];
    } else {
      state.pipeline[d.storyId] = { phase: d.phase, label: d.label || d.step || '…' };
    }
    // Refresh board immediately without a full data refetch
    if (state.activeTab === 'board' && state.data) renderBoard(state.data.epics);
  });

  // Reconnect silently if the server restarts
  evtSource.onerror = () => {
    evtSource.close();
    setTimeout(connectEventSource, 3000);
  };
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  bindSearch();
  fetchData();
  connectEventSource();
});
