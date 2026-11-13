#!/usr/bin/env node
// Task graph tool for docs/plan/tasks.yaml
//
//   node scripts/plan.mjs              -> summary: ready now, in progress, warnings
//   node scripts/plan.mjs validate     -> errors exit 1 (cycles, missing deps, bad values)
//   node scripts/plan.mjs graph        -> writes docs/plan/graph.md (Mermaid) + graph.json
//   node scripts/plan.mjs set <id> <status>   -> todo | in_progress | review | needs_human | done
//   node scripts/plan.mjs show <id>    -> one task + its parents/children (what an agent reads)
//
// Output is short on purpose: agents read it, so every line costs tokens.

import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'js-yaml';

const ROOT = process.cwd();
const FILE = path.join(ROOT, 'docs/plan/tasks.yaml');
const STATUSES = ['todo', 'in_progress', 'review', 'needs_human', 'done'];
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
    if (!STATUSES.includes(t.status)) errors.push(`${t.id}: bad status "${t.status}"`);
    if (t.size && !SIZE_WEIGHT[t.size]) errors.push(`${t.id}: bad size "${t.size}"`);
  }
  for (const t of tasks)
    for (const d of t.depends_on)
      if (!byId.has(d)) errors.push(`${t.id}: depends on missing task ${d}`);
  return { tasks, byId, errors };
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
  const live = tasks.filter((t) => ['ready', 'in_progress', 'review'].includes(c.state.get(t.id)));
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

function summary() {
  const { tasks, byId, errors } = check();
  if (errors.length) return fail(errors);
  const c = computed(tasks, byId);
  const group = (s) => tasks.filter((t) => c.state.get(t.id) === s);
  const line = (t) => `  ${t.id}  ${t.title}${c.critical.path.includes(t.id) ? '  [critical]' : ''}`;
  const done = group('done').length;
  console.log(`Progress: ${done}/${tasks.length} done`);
  for (const [label, s] of [['Needs a human', 'needs_human'], ['In progress', 'in_progress'], ['In review', 'review'], ['Ready now (can run in parallel)', 'ready']]) {
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
  lines.push(
    '  classDef done fill:#d1fae5,stroke:#059669,color:#064e3b',
    '  classDef in_progress fill:#dbeafe,stroke:#2563eb,color:#1e3a8a',
    '  classDef review fill:#ede9fe,stroke:#7c3aed,color:#4c1d95',
    '  classDef ready fill:#fef3c7,stroke:#d97706,color:#78350f',
    '  classDef blocked fill:#f3f4f6,stroke:#9ca3af,color:#4b5563',
    '  classDef needs_human fill:#fee2e2,stroke:#dc2626,color:#7f1d1d',
  );
  if (critEdges.length) lines.push(`  linkStyle ${critEdges.join(',')} stroke:#dc2626,stroke-width:3px`);
  const md = `# Task graph\n\nGenerated by \`scripts/plan.mjs graph\` — do not edit by hand.\n\n` +
    `Legend: green = done, blue = in progress, purple = review, yellow = ready, gray = blocked, red edges = critical path.\n\n` +
    '```mermaid\n' + lines.join('\n') + '\n```\n';
  fs.writeFileSync(path.join(ROOT, 'docs/plan/graph.md'), md);
  fs.writeFileSync(path.join(ROOT, 'docs/plan/graph.json'), JSON.stringify(tasks, null, 2));
  console.log('Wrote docs/plan/graph.md and docs/plan/graph.json');
}

function set(id, status) {
  if (!STATUSES.includes(status)) return fail([`status must be one of ${STATUSES.join(', ')}`]);
  const src = fs.readFileSync(FILE, 'utf8');
  // Edit only the status line inside this task's block, keeping comments and layout.
  const re = new RegExp(`(- id: ${id}\\n(?:(?!- id:)[\\s\\S])*?\\n\\s+status: )\\w+`);
  if (!re.test(src)) return fail([`task ${id} not found`]);
  fs.writeFileSync(FILE, src.replace(re, `$1${status}`));
  const { tasks, byId } = load();
  const c = computed(tasks, byId);
  const unlocked = tasks.filter((t) => t.depends_on.includes(id) && c.state.get(t.id) === 'ready');
  console.log(`${id} -> ${status}` + (unlocked.length ? `\nNow ready: ${unlocked.map((t) => t.id).join(', ')}` : ''));
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
({ validate, graph, set: () => set(...args), show: () => show(...args) }[cmd] ?? summary)();
