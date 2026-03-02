/**
 * parser.js — BMAD Markdown Parser
 *
 * Reads BMAD project artifacts from _bmad-output/ and returns a structured
 * data object ready for the Mira dashboard.
 *
 * Supported file conventions (detected from real BMAD projects):
 *
 *   planning-artifacts/epics.md
 *     ## Epic N: Title
 *     **Objectif :** ...
 *     ### Story N.M: Title
 *     **Statut [Sprint N] :** ✅ Done | ready-for-dev | backlog
 *
 *   implementation-artifacts/{epic}-{story}-{slug}.md
 *     # Story N.M: Title
 *     Status: ready-for-dev
 *     ## Story / ## Acceptance Criteria / ## Tasks / ## Dev Notes
 *
 *   implementation-artifacts/sprint-{N}-planning-{date}.md
 *     # Sprint Planning — Sprint N
 *     **Date :** YYYY-MM-DD
 *     **Sprint Goal :** "..."
 *     | # | **REF** — Title | file | 🔴 Haute |
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Status normalization
// ---------------------------------------------------------------------------

/**
 * Normalize raw status string to a canonical value.
 * Handles all BMAD status formats: "✅ Done", "ready-for-dev", "backlog", etc.
 *
 * @param {string} raw
 * @returns {'done' | 'ready-for-dev' | 'in-progress' | 'backlog'}
 */
function normalizeStatus(raw) {
  if (!raw) return 'backlog';
  const s = raw.trim().toLowerCase();
  if (s.includes('done') || s.includes('✅')) return 'done';
  if (s.includes('ready-for-dev') || s.includes('ready for dev')) return 'ready-for-dev';
  if (s.includes('in-progress') || s.includes('in progress')) return 'in-progress';
  return 'backlog';
}

/**
 * Return a human-readable label and CSS class for a canonical status.
 *
 * @param {string} status
 * @returns {{ label: string, css: string }}
 */
function statusMeta(status) {
  switch (status) {
    case 'done':          return { label: '✅ Done',          css: 'done' };
    case 'ready-for-dev': return { label: '🔵 Ready',         css: 'ready' };
    case 'in-progress':   return { label: '🟡 In Progress',   css: 'in-progress' };
    default:              return { label: '○ Backlog',        css: 'backlog' };
  }
}

// ---------------------------------------------------------------------------
// Epic + Story parsing (from epics.md)
// ---------------------------------------------------------------------------

/**
 * Parse epics.md content into an array of Epic objects with nested Stories.
 *
 * @param {string} content  — raw content of epics.md
 * @returns {Epic[]}
 */
function parseEpicsContent(content) {
  const epics = [];
  let currentEpic = null;
  let currentStory = null;
  let inStoryBlock = false;

  const lines = content.split('\n');

  for (const line of lines) {
    // ── Epic heading: ## Epic N: Title ──────────────────────────────────────
    const epicMatch = line.match(/^## Epic (\d+)[:.]\s*(.+)/);
    if (epicMatch) {
      if (currentStory) { currentEpic.stories.push(currentStory); currentStory = null; }
      if (currentEpic) epics.push(currentEpic);
      currentEpic = {
        id: epicMatch[1],
        title: epicMatch[2].trim(),
        objective: '',
        stories: [],
      };
      inStoryBlock = false;
      continue;
    }

    // ── Epic objective: **Objectif :** ─────────────────────────────────────
    if (currentEpic && !inStoryBlock) {
      const objMatch = line.match(/^\*\*Objectif\s*:\*\*\s*(.+)/);
      if (objMatch) { currentEpic.objective = objMatch[1].trim(); continue; }
    }

    // ── Story heading: ### Story N.M: Title ────────────────────────────────
    const storyMatch = line.match(/^### Story ([\d.]+)[:.]\s*(.+)/);
    if (storyMatch && currentEpic) {
      if (currentStory) currentEpic.stories.push(currentStory);
      currentStory = {
        id: storyMatch[1].trim(),
        epicId: currentEpic.id,
        title: storyMatch[2].trim(),
        status: 'backlog',
        description: '',
        ac: [],
        tasks: [],
        devNotes: '',
        file: null,
      };
      inStoryBlock = true;
      continue;
    }

    // ── Story status: **Statut [Sprint N] :** value ─────────────────────────
    if (currentStory) {
      const statusMatch = line.match(/^\*\*Statut(?:\s+Sprint\s+\d+)?\s*:\*\*\s*(.+)/);
      if (statusMatch) {
        currentStory.status = normalizeStatus(statusMatch[1]);
        continue;
      }
    }
  }

  // Flush last objects
  if (currentStory && currentEpic) currentEpic.stories.push(currentStory);
  if (currentEpic) epics.push(currentEpic);

  return epics;
}

// ---------------------------------------------------------------------------
// Individual story file parsing (e.g., 3-2-dashboard-ventes.md)
// ---------------------------------------------------------------------------

/**
 * Parse a single story file and return enrichment data.
 * The individual file is authoritative for status (more up to date than epics.md).
 *
 * @param {string} content  — raw content of the story file
 * @returns {{ status: string|null, description: string, ac: string[], tasks: Task[], devNotes: string }}
 */
function parseStoryFile(content) {
  const result = { status: null, description: '', ac: [], tasks: [], devNotes: '' };

  // Status line: "Status: ready-for-dev" (near top of file)
  const statusMatch = content.match(/^Status:\s*(.+)$/m);
  if (statusMatch) result.status = normalizeStatus(statusMatch[1]);

  // ## Story → user story (as-a / I-want / so-that)
  const storySection = content.match(/^## Story\s*\n+([\s\S]+?)(?=\n^##|\n^#[^#]|\Z)/m);
  if (storySection) result.description = storySection[1].trim();

  // ## Acceptance Criteria → numbered list items
  const acSection = content.match(/^## Acceptance Criteria\s*\n+([\s\S]+?)(?=\n^##|\n^#[^#]|\Z)/m);
  if (acSection) {
    result.ac = acSection[1]
      .split('\n')
      .filter(l => /^\d+\./.test(l))
      .map(l => l.replace(/^\d+\.\s*/, '').trim())
      .filter(Boolean);
  }

  // ## Tasks / Subtasks → checkbox items (- [ ] or - [x])
  const tasksSection = content.match(/^## Tasks[^\n]*\n+([\s\S]+?)(?=\n^##|\n^#[^#]|\Z)/m);
  if (tasksSection) {
    result.tasks = tasksSection[1]
      .split('\n')
      .filter(l => /^(\s*)- \[[ x]\]/.test(l))
      .map(l => ({
        done: /- \[x\]/i.test(l),
        text: l.replace(/^(\s*)- \[[ x]\]\s*/i, '').trim(),
        indent: (l.match(/^(\s*)/)[1].length > 0),
      }))
      .filter(t => t.text);
  }

  // ## Dev Notes → raw text block
  const devSection = content.match(/^## Dev Notes\s*\n+([\s\S]+?)(?=\n^##|\n^#[^#]|\Z)/m);
  if (devSection) result.devNotes = devSection[1].trim();

  return result;
}

/**
 * Find the individual story file for a given story id (e.g., "3.2").
 * BMAD naming convention: {epic}-{story}-{slug}.md  →  3-2-dashboard-ventes.md
 *
 * @param {string} storyId   — e.g. "3.2"
 * @param {string} implDir   — path to implementation-artifacts/
 * @returns {string|null}    — absolute path to the file, or null
 */
function findStoryFile(storyId, implDir) {
  if (!fs.existsSync(implDir)) return null;
  const prefix = storyId.replace('.', '-') + '-';
  const files = fs.readdirSync(implDir);
  const match = files.find(f => f.startsWith(prefix) && f.endsWith('.md'));
  return match ? path.join(implDir, match) : null;
}

// ---------------------------------------------------------------------------
// Sprint planning parsing
// ---------------------------------------------------------------------------

/**
 * Parse all sprint planning files in implementation-artifacts/.
 * Files matched: sprint-{N}-planning-*.md
 *
 * @param {string} implDir
 * @returns {Sprint[]}  — sorted by sprint number descending (latest first)
 */
function parseSprints(implDir) {
  if (!fs.existsSync(implDir)) return [];

  const sprintFiles = fs.readdirSync(implDir)
    .filter(f => /^sprint-\d+-planning-/.test(f))
    .sort()
    .reverse(); // latest first

  return sprintFiles.map(filename => {
    const content = fs.readFileSync(path.join(implDir, filename), 'utf8');
    const sprint = {
      number: 0,
      date: '',
      goal: '',
      epics: [],
      stories: [],
      file: filename,
    };

    // Sprint number
    const numMatch = content.match(/^# Sprint Planning\s*[—–-]\s*Sprint\s*(\d+)/m);
    if (numMatch) sprint.number = parseInt(numMatch[1], 10);

    // Date
    const dateMatch = content.match(/^\*\*Date\s*:\*\*\s*(.+)$/m);
    if (dateMatch) sprint.date = dateMatch[1].trim();

    // Sprint goal (quoted)
    const goalMatch = content.match(/^\*\*Sprint Goal\s*:\*\*\s*"(.+)"/m);
    if (goalMatch) sprint.goal = goalMatch[1].trim();

    // Epics referenced
    const epicsMatch = content.match(/^\*\*Épics\s*:\*\*\s*(.+)$/m);
    if (epicsMatch) {
      sprint.epics = epicsMatch[1].split(/[,+]/).map(s => s.trim()).filter(Boolean);
    }

    // Stories table: | N | **REF** — Description | file | 🔴 Haute |
    const tableRe = /^\|\s*\d+\s*\|\s*\*\*([^*]+)\*\*\s*[—–-]\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]*?)\s*\|/gm;
    for (const m of content.matchAll(tableRe)) {
      const priorityRaw = m[4].trim();
      sprint.stories.push({
        ref: m[1].trim(),
        title: m[2].trim(),
        file: m[3].trim(),
        priority: priorityRaw.includes('🔴') ? 'high'
                : priorityRaw.includes('🟠') ? 'medium'
                : 'low',
      });
    }

    return sprint;
  }).filter(s => s.number > 0);
}

// ---------------------------------------------------------------------------
// Main entry: parse full project
// ---------------------------------------------------------------------------

/**
 * Parse the full BMAD project from _bmad-output/ and return all data
 * needed by the Mira dashboard.
 *
 * @param {string} outputDir  — absolute path to _bmad-output/
 * @returns {ProjectData}
 */
function parseProject(outputDir) {
  const planningDir = path.join(outputDir, 'planning-artifacts');
  const implDir = path.join(outputDir, 'implementation-artifacts');

  // ── Epics ────────────────────────────────────────────────────────────────
  let epics = [];
  const epicsFile = path.join(planningDir, 'epics.md');

  if (fs.existsSync(epicsFile)) {
    const content = fs.readFileSync(epicsFile, 'utf8');
    epics = parseEpicsContent(content);

    // Enrich each story with its individual file (if it exists)
    for (const epic of epics) {
      for (const story of epic.stories) {
        const storyFilePath = findStoryFile(story.id, implDir);
        if (storyFilePath) {
          story.file = path.relative(outputDir, storyFilePath);
          const enrichment = parseStoryFile(fs.readFileSync(storyFilePath, 'utf8'));
          // Individual file status is authoritative (latest)
          if (enrichment.status) story.status = enrichment.status;
          story.description = enrichment.description;
          story.ac = enrichment.ac;
          story.tasks = enrichment.tasks;
          story.devNotes = enrichment.devNotes;
        }
      }
    }
  }

  // ── Sprints ───────────────────────────────────────────────────────────────
  const sprints = parseSprints(implDir);
  const currentSprint = sprints.length > 0 ? sprints[0] : null;

  // Enrich sprint stories with actual status from parsed epics
  if (currentSprint) {
    const storyMap = new Map();
    for (const epic of epics) {
      for (const story of epic.stories) storyMap.set(story.id, story);
    }
    for (const ss of currentSprint.stories) {
      // ss.ref looks like "5-2" → story id "5.2"
      const id = ss.ref.replace('-', '.');
      const story = storyMap.get(id);
      if (story) ss.status = story.status;
    }
  }

  // ── Meta ─────────────────────────────────────────────────────────────────
  const totalStories = epics.reduce((n, e) => n + e.stories.length, 0);
  const doneStories  = epics.reduce((n, e) => n + e.stories.filter(s => s.status === 'done').length, 0);
  const projectName  = path.basename(path.dirname(outputDir));

  return { epics, sprints, currentSprint, meta: { totalStories, doneStories, projectName } };
}

// ---------------------------------------------------------------------------
// Status update (write-back to Markdown files)
// ---------------------------------------------------------------------------

/**
 * Update a story's status line inside epics.md.
 * Finds the story block by heading, replaces only its **Statut :** line.
 *
 * @param {string} storyId      — e.g. "3.2"
 * @param {string} newStatus    — canonical status
 * @param {string} epicsFile    — absolute path to epics.md
 * @returns {boolean}
 */
function updateStatusInEpics(storyId, newStatus, epicsFile) {
  if (!fs.existsSync(epicsFile)) return false;

  let content = fs.readFileSync(epicsFile, 'utf8');
  const statusDisplay = newStatus === 'done' ? '✅ Done' : newStatus;
  const escapedId = storyId.replace('.', '\\.');

  // Find the story heading
  const headingRe = new RegExp(`^### Story ${escapedId}[:.].+$`, 'm');
  const headingMatch = headingRe.exec(content);
  if (!headingMatch) return false;

  // Slice the block between this heading and the next ###
  const afterHeading = content.slice(headingMatch.index + headingMatch[0].length);
  const nextIdx = afterHeading.search(/^###/m);
  const storyBlock = nextIdx >= 0 ? afterHeading.slice(0, nextIdx) : afterHeading;

  // Replace the **Statut ... :** line within this block only
  const newBlock = storyBlock.replace(
    /\*\*Statut(?:\s+Sprint\s+\d+)?\s*:\*\*[^\n]+/,
    `**Statut :** ${statusDisplay}`
  );

  if (newBlock === storyBlock) return false; // Nothing to replace

  content =
    content.slice(0, headingMatch.index + headingMatch[0].length) +
    newBlock +
    (nextIdx >= 0 ? afterHeading.slice(nextIdx) : '');

  fs.writeFileSync(epicsFile, content, 'utf8');
  return true;
}

/**
 * Update the Status: field in an individual story file.
 *
 * @param {string} storyFilePath  — absolute path
 * @param {string} newStatus
 * @returns {boolean}
 */
function updateStatusInFile(storyFilePath, newStatus) {
  if (!fs.existsSync(storyFilePath)) return false;
  let content = fs.readFileSync(storyFilePath, 'utf8');
  content = content.replace(/^Status:\s*.+$/m, `Status: ${newStatus}`);
  fs.writeFileSync(storyFilePath, content, 'utf8');
  return true;
}

/**
 * Update a story's status in both epics.md and its individual file.
 * Safe to call even if one of the files doesn't exist.
 *
 * @param {string} storyId    — e.g. "3.2"
 * @param {string} newStatus  — canonical status string
 * @param {string} outputDir  — absolute path to _bmad-output/
 */
function updateStoryStatus(storyId, newStatus, outputDir) {
  const epicsFile = path.join(outputDir, 'planning-artifacts', 'epics.md');
  const implDir   = path.join(outputDir, 'implementation-artifacts');

  updateStatusInEpics(storyId, newStatus, epicsFile);

  const storyFilePath = findStoryFile(storyId, implDir);
  if (storyFilePath) updateStatusInFile(storyFilePath, newStatus);
}

// ---------------------------------------------------------------------------
// Content write-back (epic + story fields)
// ---------------------------------------------------------------------------

/**
 * Replace a Markdown section's content between its heading and the next ## heading.
 * Uses a line-by-line approach for reliability with arbitrary content.
 *
 * @param {string} content       — full file content
 * @param {string} headingText   — exact heading line, e.g. "## Story"
 * @param {string} newContent    — replacement content (raw text)
 * @returns {string}             — updated content
 */
function replaceSection(content, headingText, newContent) {
  const lines = content.split('\n');
  let start = -1;
  let end = lines.length;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === headingText.trim() && start === -1) {
      start = i;
    } else if (start !== -1 && i > start + 1 && /^## /.test(lines[i])) {
      end = i;
      break;
    }
  }

  if (start === -1) return content; // Section not found — leave unchanged

  return [
    ...lines.slice(0, start + 1),
    '',
    newContent,
    '',
    ...lines.slice(end),
  ].join('\n');
}

/**
 * Create a minimal individual story file when none exists.
 * Follows BMAD story file conventions so future agents can enrich it.
 *
 * @param {object} story   — story object from parseProject
 * @param {string} implDir — path to implementation-artifacts/
 * @returns {string}       — absolute path to the created file
 */
function createStoryFile(story, implDir) {
  fs.mkdirSync(implDir, { recursive: true });
  const slug = story.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const filename = `${story.id.replace('.', '-')}-${slug}.md`;
  const filepath = path.join(implDir, filename);

  const acText  = (story.ac  || []).map((item, i) => `${i + 1}. ${item}`).join('\n');
  const content = [
    `# Story ${story.id}: ${story.title}`,
    '',
    `Status: ${story.status}`,
    '',
    '## Story',
    '',
    story.description || '',
    '',
    '## Acceptance Criteria',
    '',
    acText,
    '',
    '## Tasks / Subtasks',
    '',
    '## Dev Notes',
    '',
    story.devNotes || '',
    '',
    '## Dev Agent Record',
    '',
    '### Agent Model Used',
    '',
    '### Completion Notes List',
    '',
    '### File List',
    '',
  ].join('\n');

  fs.writeFileSync(filepath, content, 'utf8');
  return filepath;
}

/**
 * Update epic fields (title and/or objective) in epics.md.
 *
 * @param {string} epicId   — e.g. "3"
 * @param {{ title?: string, objective?: string }} fields
 * @param {string} outputDir
 */
function updateEpic(epicId, fields, outputDir) {
  const epicsFile = path.join(outputDir, 'planning-artifacts', 'epics.md');
  if (!fs.existsSync(epicsFile)) return false;

  let content = fs.readFileSync(epicsFile, 'utf8');

  // Update epic heading title
  if (fields.title !== undefined) {
    const re = new RegExp(`^(## Epic ${epicId}[:.])\\s*.+$`, 'm');
    content = content.replace(re, `## Epic ${epicId}: ${fields.title}`);
  }

  // Update **Objectif :** line (first occurrence after this epic's heading)
  if (fields.objective !== undefined) {
    const escapedId = epicId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const headingRe = new RegExp(`^## Epic ${escapedId}[:.].+$`, 'm');
    const headingMatch = headingRe.exec(content);
    if (headingMatch) {
      const afterHeading = content.slice(headingMatch.index + headingMatch[0].length);
      const nextEpicIdx  = afterHeading.search(/^## Epic /m);
      const epicBlock    = nextEpicIdx >= 0 ? afterHeading.slice(0, nextEpicIdx) : afterHeading;

      const updatedBlock = epicBlock.includes('**Objectif :')
        ? epicBlock.replace(/^\*\*Objectif\s*:\*\*\s*.+$/m, `**Objectif :** ${fields.objective}`)
        : '\n**Objectif :** ' + fields.objective + '\n' + epicBlock;

      content =
        content.slice(0, headingMatch.index + headingMatch[0].length) +
        updatedBlock +
        (nextEpicIdx >= 0 ? afterHeading.slice(nextEpicIdx) : '');
    }
  }

  fs.writeFileSync(epicsFile, content, 'utf8');
  return true;
}

/**
 * Update story content fields.
 * - title   → updated in epics.md (heading) and story file (heading)
 * - description, ac, devNotes → updated in the individual story file
 *   (file is created if missing)
 *
 * @param {string} storyId
 * @param {{ title?: string, description?: string, ac?: string[], devNotes?: string }} fields
 * @param {string} outputDir
 * @param {object} storySnapshot — current story object (needed if file must be created)
 */
function updateStoryContent(storyId, fields, outputDir, storySnapshot) {
  const epicsFile = path.join(outputDir, 'planning-artifacts', 'epics.md');
  const implDir   = path.join(outputDir, 'implementation-artifacts');

  // ── Title in epics.md ──────────────────────────────────────────────────
  if (fields.title !== undefined && fs.existsSync(epicsFile)) {
    const escapedId = storyId.replace('.', '\\.');
    let content = fs.readFileSync(epicsFile, 'utf8');
    content = content.replace(
      new RegExp(`^(### Story ${escapedId}[:.])\\s*.+$`, 'm'),
      `$1 ${fields.title}`
    );
    fs.writeFileSync(epicsFile, content, 'utf8');
  }

  // ── Individual story file ──────────────────────────────────────────────
  const hasRichFields =
    fields.title !== undefined ||
    fields.description !== undefined ||
    fields.ac !== undefined ||
    fields.devNotes !== undefined;

  if (!hasRichFields) return true;

  let storyFilePath = findStoryFile(storyId, implDir);

  // Create file if missing (uses current story snapshot as base)
  if (!storyFilePath && storySnapshot) {
    storyFilePath = createStoryFile(storySnapshot, implDir);
  }

  if (!storyFilePath) return false;

  let content = fs.readFileSync(storyFilePath, 'utf8');

  // Update # Story N.M: Title heading
  if (fields.title !== undefined) {
    const escapedId = storyId.replace('.', '\\.');
    content = content.replace(
      new RegExp(`^(# Story ${escapedId}[:.])\\s*.+$`, 'm'),
      `$1 ${fields.title}`
    );
  }

  // Update ## Story section (user story description)
  if (fields.description !== undefined) {
    content = replaceSection(content, '## Story', fields.description);
  }

  // Update ## Acceptance Criteria section (numbered list)
  if (fields.ac !== undefined) {
    const acText = fields.ac.map((item, i) => `${i + 1}. ${item}`).join('\n');
    content = replaceSection(content, '## Acceptance Criteria', acText);
  }

  // Update ## Dev Notes section
  if (fields.devNotes !== undefined) {
    content = replaceSection(content, '## Dev Notes', fields.devNotes);
  }

  fs.writeFileSync(storyFilePath, content, 'utf8');
  return true;
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseProject,
  updateStoryStatus,
  updateEpic,
  updateStoryContent,
  normalizeStatus,
  statusMeta,
};
