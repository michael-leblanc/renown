#!/usr/bin/env node
// Task graph tool for docs/plan/tasks.yaml
//
//   node scripts/plan.mjs              -> summary: ready now, in progress, warnings
//   node scripts/plan.mjs validate     -> errors exit 1 (cycles, missing deps, bad values)
//   node scripts/plan.mjs graph        -> writes docs/plan/graph.md (Mermaid) + graph.json
//   node scripts/plan.mjs set <id> <status>   -> todo | in_progress | qa | code_review | pr_open | needs_human | done
//   node scripts/plan.mjs add <id> touches|acceptance <value>   -> append one item, layout kept
//   node scripts/plan.mjs show <id>    -> one task + its parents/children (what an agent reads)
//
// Output is short on purpose: agents read it, so every line costs tokens.

import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'docs/plan/tasks.yaml');
// D55: `review` is gone; qa, code_review and pr_open say where a task stands.
const STATUSES = ['todo', 'in_progress', 'qa', 'code_review', 'pr_open', 'needs_human', 'done'];
const LIVE = ['in_progress', 'qa', 'code_review', 'pr_open']; // statuses with a live worker or open PR
const GONE_STATUS = 'review';
// Mermaid colors and legend words per computed state (graph.md).
const GRAPH_STYLE = [
  ['done', 'green', '#d1fae5', '#059669', '#064e3b'],
  ['in_progress', 'blue', '#dbeafe', '#2563eb', '#1e3a8a'],
  ['qa', 'teal', '#ccfbf1', '#0d9488', '#134e4a'],
  ['code_review', 'purple', '#ede9fe', '#7c3aed', '#4c1d95'],
  ['pr_open', 'pink', '#fce7f3', '#db2777', '#831843'],
  ['ready', 'yellow', '#fef3c7', '#d97706', '#78350f'],
  ['blocked', 'gray', '#f3f4f6', '#9ca3af', '#4b5563'],
  ['needs_human', 'red', '#fee2e2', '#dc2626', '#7f1d1d'],
];
// D58: fields every open (needs_human) HUM task carries.
const HUM_PREFIX = 'HUM-';
const HUM_REQUIRED = ['ask', 'why', 'options', 'effort', 'kind'];
const RECOMMENDED = ' (recommended)';
const DECISIONS_FILE = path.join(ROOT, 'docs/decisions.md');
const SIZE_WEIGHT = { S: 1, M: 2, L: 3 };

function load() {
  const tasks = yaml.load(fs.readFileSync(FILE, 'utf8')) ?? [];
  const byId = new Map();
  const errors = [];
  for (const t of tasks) {
    t.depends_on ??= [];
    t.touches ??= [];
    if (byId.has(t.id)) errors.push(`duplicate id ${t.id}`);
    byId.set(t.id, t);
    if (!STATUSES.includes(t.status)) errors.push(badStatus(t));
    if (t.size && !SIZE_WEIGHT[t.size]) errors.push(`${t.id}: bad size "${t.size}"`);
  }
  for (const t of tasks)
    for (const d of t.depends_on)
      if (!byId.has(d)) errors.push(`${t.id}: depends on missing task ${d}`);
  errors.push(...humErrors(tasks));
  return { tasks, byId, errors };
}

function humErrors(tasks) {
  const open = tasks.filter((t) => t.id.startsWith(HUM_PREFIX) && t.status === 'needs_human');
  if (!open.length) return [];
  const headings = decisionHeadings();
  return open.flatMap((t) => humTaskErrors(t, headings).map((e) => `${t.id}: ${e}`));
}

function humTaskErrors(t, headings) {
  const missing = HUM_REQUIRED.filter((f) => !present(t[f]));
  if (missing.length) return [`missing ${missing.join(', ')} (D58)`];
  return [...optionsErrors(t.options), ...kindErrors(t, headings)];
}

const present = (v) => v !== undefined && v !== null && v !== '';

function optionsErrors(options) {
  if (!Array.isArray(options) || options.length < 2 || options.length > 3 || !options.every((o) => typeof o === 'string'))
    return ['options must be 2-3 strings'];
  if (options.filter((o) => o.endsWith(RECOMMENDED)).length !== 1)
    return [`options need exactly one ending in "${RECOMMENDED}"`];
  return [];
}

function kindErrors(t, headings) {
  if (t.kind === 'decision') return decisionErrors(t.decision, headings);
  if (t.kind === 'action') return actionErrors(t);
  return [`kind must be decision or action, got "${t.kind}"`];
}

function decisionErrors(id, headings) {
  if (typeof id !== 'string' || !/^D\d+$/.test(id)) return ['kind decision needs decision: Dnn'];
  if (headings && !headings.has(id)) return [`decision ${id} has no "## ${id}" heading in docs/decisions.md`];
  return [];
}

function actionErrors(t) {
  const errs = [];
  if (!Array.isArray(t.steps) || !t.steps.length) errs.push('kind action needs a non-empty steps list');
  if (typeof t.check !== 'string' || !t.check.trim()) errs.push('kind action needs a check string');
  return errs;
}

// null = no decisions.md in this tree (a copied tasks.yaml in a temp dir): the heading check is skipped.
function decisionHeadings() {
  if (!fs.existsSync(DECISIONS_FILE)) return null;
  const text = fs.readFileSync(DECISIONS_FILE, 'utf8');
  return new Set([...text.matchAll(/^## (D\d+)\b/gm)].map((m) => m[1]));
}

function badStatus(t) {
  if (t.status !== GONE_STATUS) return `${t.id}: bad status "${t.status}"`;
  return `${t.id}: status "review" no longer exists (D55); run: node scripts/plan.mjs set ${t.id} <qa|code_review|pr_open|in_progress>`;
}

function children(tasks) {
  const kids = new Map(tasks.map((t) => [t.id, []]));
  for (const t of tasks) for (const d of t.depends_on) kids.get(d)?.push(t.id);
  return kids;
}

function findCycle(tasks, byId) {
  const state = new Map(); // 1 = visiting, 2 = done
  const stack = [];
  const visit = (id) => {
    if (state.get(id) === 2) return null;
    if (state.get(id) === 1) return [...stack.slice(stack.indexOf(id)), id];
    state.set(id, 1);
    stack.push(id);
    for (const d of byId.get(id)?.depends_on ?? []) {
      const c = visit(d);
      if (c) return c;
    }
    stack.pop();
    state.set(id, 2);
    return null;
  };
  for (const t of tasks) {
    const c = visit(t.id);
    if (c) return c;
  }
  return null;
}

// All ancestors of a task (everything that must be done before it).
function ancestors(id, byId, memo = new Map()) {
  if (memo.has(id)) return memo.get(id);
  const out = new Set();
  for (const d of byId.get(id).depends_on) {
    out.add(d);
    for (const a of ancestors(d, byId, memo)) out.add(a);
  }
  memo.set(id, out);
  return out;
}

function computed(tasks, byId) {
  const memo = new Map();
  const state = new Map();
  for (const t of tasks) {
    if (t.status !== 'todo') state.set(t.id, t.status);
    else state.set(t.id, t.depends_on.every((d) => byId.get(d).status === 'done') ? 'ready' : 'blocked');
  }
  // wave = longest chain of dependencies above the task
  const wave = new Map();
  const w = (id) => {
    if (wave.has(id)) return wave.get(id);
    const v = Math.max(0, ...byId.get(id).depends_on.map((d) => w(d) + 1));
    wave.set(id, v);
    return v;
  };
  tasks.forEach((t) => w(t.id));
  // critical path over REMAINING work (done tasks weigh 0)
  const best = new Map();
  const cp = (id) => {
    if (best.has(id)) return best.get(id);
    const t = byId.get(id);
    const own = t.status === 'done' ? 0 : SIZE_WEIGHT[t.size ?? 'M'];
    let prev = { len: 0, path: [] };
    for (const d of t.depends_on) {
      const c = cp(d);
      if (c.len > prev.len) prev = c;
    }
    const r = { len: prev.len + own, path: [...prev.path, id] };
    best.set(id, r);
    return r;
  };
  let critical = { len: 0, path: [] };
  for (const t of tasks) {
    const c = cp(t.id);
    if (c.len > critical.len) critical = c;
  }
  critical.path = critical.path.filter((id) => byId.get(id).status !== 'done');
  return { state, wave, critical, anc: (id) => ancestors(id, byId, memo) };
}

const norm = (p) => p.replace(/\/\*\*?$/, '').replace(/\/$/, '');
const overlaps = (a, b) => {
  const x = norm(a), y = norm(b);
  return x === y || x.startsWith(y + '/') || y.startsWith(x + '/');
};

function warnings(tasks, byId, c) {
  const out = [];
  // Redundant edges: dependency already reachable through another dependency.
  for (const t of tasks)
    for (const d of t.depends_on)
      if (t.depends_on.some((o) => o !== d && c.anc(o).has(d)))
        out.push(`${t.id}: depends_on ${d} is redundant (already implied)`);
  // File conflicts among tasks that can run at the same time right now.
  const live = tasks.filter((t) => ['ready', ...LIVE].includes(c.state.get(t.id)));
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length; j++) {
      const a = live[i], b = live[j];
      const hit = a.touches.flatMap((x) => b.touches.filter((y) => overlaps(x, y)).map((y) => norm(x).length < norm(y).length ? y : x));
      if (hit.length) out.push(`${a.id} + ${b.id} both touch ${[...new Set(hit)].join(', ')} — don't run in parallel`);
    }
  return out;
}

function check() {
  const { tasks, byId, errors } = load();
  if (!errors.length) {
    const cyc = findCycle(tasks, byId);
    if (cyc) errors.push(`cycle: ${cyc.join(' -> ')}`);
  }
  return { tasks, byId, errors };
}

const SUMMARY_GROUPS = [
  ['Needs a human', 'needs_human'], ['In progress', 'in_progress'], ['QA', 'qa'], ['Code review', 'code_review'],
  ['PR open', 'pr_open'], ['Ready now (can run in parallel)', 'ready'],
];

function summary() {
  const { tasks, byId, errors } = check();
  if (errors.length) return fail(errors);
  const c = computed(tasks, byId);
  const group = (s) => tasks.filter((t) => c.state.get(t.id) === s);
  const line = (t) => `  ${t.id}  ${t.title}${c.critical.path.includes(t.id) ? '  [critical]' : ''}`;
  const done = group('done').length;
  console.log(`Progress: ${done}/${tasks.length} done`);
  for (const [label, s] of SUMMARY_GROUPS) {
    const g = group(s);
    if (g.length) console.log(`\n${label}:\n${g.map(line).join('\n')}`);
  }
  console.log(`\nBlocked: ${group('blocked').length}`);
  console.log(`Critical path (remaining): ${c.critical.path.join(' -> ') || 'none'}`);
  const w = warnings(tasks, byId, c);
  if (w.length) console.log(`\nWarnings:\n${w.map((x) => '  ! ' + x).join('\n')}`);
}

function validate() {
  const { tasks, byId, errors } = check();
  if (errors.length) return fail(errors);
  const w = warnings(tasks, byId, computed(tasks, byId));
  console.log(w.length ? `OK with ${w.length} warning(s):\n${w.map((x) => '  ! ' + x).join('\n')}` : 'OK');
}

function graph() {
  const { tasks, byId, errors } = check();
  if (errors.length) return fail(errors);
  const c = computed(tasks, byId);
  const sid = (id) => id.replace(/[^A-Za-z0-9]/g, '_');
  const lines = ['flowchart LR'];
  for (const t of tasks) lines.push(`  ${sid(t.id)}["${t.id}<br/>${t.title.replace(/"/g, "'")}"]:::${c.state.get(t.id)}`);
  const crit = new Set(c.critical.path);
  let i = 0;
  const critEdges = [];
  for (const t of tasks)
    for (const d of t.depends_on) {
      lines.push(`  ${sid(d)} --> ${sid(t.id)}`);
      if (crit.has(d) && crit.has(t.id)) critEdges.push(i);
      i++;
    }
  lines.push(...GRAPH_STYLE.map(([name, , fill, stroke, color]) => `  classDef ${name} fill:${fill},stroke:${stroke},color:${color}`));
  if (critEdges.length) lines.push(`  linkStyle ${critEdges.join(',')} stroke:#dc2626,stroke-width:3px`);
  const md = `# Task graph\n\nGenerated by \`scripts/plan.mjs graph\` — do not edit by hand.\n\n` +
    `Legend: ${legend()}, red edges = critical path.\n\n` +
    '```mermaid\n' + lines.join('\n') + '\n```\n';
  fs.writeFileSync(path.join(ROOT, 'docs/plan/graph.md'), md);
  fs.writeFileSync(path.join(ROOT, 'docs/plan/graph.json'), JSON.stringify(tasks, null, 2));
  console.log('Wrote docs/plan/graph.md and docs/plan/graph.json');
}

function legend() {
  return GRAPH_STYLE.map(([name, color]) => `${color} = ${name.replace(/_/g, ' ')}`).join(', ');
}

function set(id, status) {
  if (!STATUSES.includes(status)) return fail([`status must be one of ${STATUSES.join(', ')}`]);
  const src = fs.readFileSync(FILE, 'utf8');
  // Literal id only, and exactly one task with it, checked before anything is written.
  const count = src.split('\n').filter((l) => l.trim() === `- id: ${id}`).length;
  if (count !== 1) return fail([count === 0 ? `task ${id} not found` : `task id ${id} appears ${count} times`]);
  // Edit only the status line inside this task's block, keeping comments and layout.
  const re = new RegExp(`(- id: ${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n(?:(?!- id:)[\\s\\S])*?\\n\\s+status: )\\w+`);
  if (!re.test(src)) return fail([`task ${id} has no status line`]);
  fs.writeFileSync(FILE, src.replace(re, `$1${status}`));
  const { tasks, byId } = load();
  const c = computed(tasks, byId);
  const unlocked = tasks.filter((t) => t.depends_on.includes(id) && c.state.get(t.id) === 'ready');
  console.log(`${id} -> ${status}` + (unlocked.length ? `\nNow ready: ${unlocked.map((t) => t.id).join(', ')}` : ''));
}

function add(id, field, value) {
  if (!['touches', 'acceptance'].includes(field) || !value) return fail(['usage: add <id> touches|acceptance <value>']);
  const lines = fs.readFileSync(FILE, 'utf8').split('\n');
  const starts = lines.flatMap((l, i) => (l.trim() === `- id: ${id}` ? [i] : []));
  if (starts.length !== 1) return fail([starts.length === 0 ? `task ${id} not found` : `task id ${id} appears ${starts.length} times`]);
  if (load().byId.get(id)[field].includes(value)) return fail([`${id} ${field} already has: ${value}`]);
  // Edit only this task's block-style list: insert after its last item, keeping comments and layout.
  let i = starts[0] + 1;
  while (i < lines.length && !lines[i].trim().startsWith('- id:') && lines[i].trim() !== `${field}:`) i++;
  if (lines[i]?.trim() !== `${field}:`) return fail([`task ${id} has no block-style ${field} list`]);
  const head = lines[i].match(/^\s*/)[0].length;
  let end = i + 1;
  while (end < lines.length && lines[end].trim() && lines[end].match(/^\s*/)[0].length > head) end++;
  const indent = lines[i + 1]?.match(/^\s*(?=- )/)?.[0] ?? ' '.repeat(head + 2);
  const plain = (() => { try { return yaml.load(`- ${value}`)?.[0] === value; } catch { return false; } })();
  lines.splice(end, 0, `${indent}- ${plain ? value : JSON.stringify(value)}`);
  fs.writeFileSync(FILE, lines.join('\n'));
  console.log(`${id} ${field} += ${value}`);
}

function show(id) {
  const { tasks, byId, errors } = check();
  if (errors.length) return fail(errors);
  const t = byId.get(id);
  if (!t) return fail([`task ${id} not found`]);
  const c = computed(tasks, byId);
  const kids = children(tasks).get(id);
  console.log(yaml.dump({ ...t, state: c.state.get(id), wave: c.wave.get(id), unlocks: kids }).trim());
}

function fail(errors) {
  console.error(`ERRORS:\n${errors.map((e) => '  x ' + e).join('\n')}`);
  process.exitCode = 1;
}

const [cmd, ...args] = process.argv.slice(2);
({ validate, graph, set: () => set(...args), add: () => add(...args), show: () => show(...args) }[cmd] ?? summary)();
