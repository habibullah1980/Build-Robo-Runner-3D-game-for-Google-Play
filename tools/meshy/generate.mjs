// Generates Robo Runner's 3D models with the Meshy CLI (run by the "Generate 3D models" workflow).
//
//   node tools/meshy/generate.mjs estimate          -> prints the credit estimate and balance, spends nothing
//   node tools/meshy/generate.mjs generate [names]  -> generates missing models into src/assets/models/
//
// Needs MESHY_API_KEY in the environment. Models that already exist are skipped, so re-running
// only pays for what is missing. Delete a model file to regenerate it.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const MODELS = join(ROOT, 'src', 'assets', 'models');
const PREVIEWS = join(ROOT, 'tools', 'meshy', 'previews');
const WORK = join(ROOT, 'meshy-work');
const REPORT = join(ROOT, 'tools', 'meshy', 'report.json');
const config = JSON.parse(readFileSync(join(ROOT, 'tools', 'meshy', 'assets.json'), 'utf8'));
[MODELS, PREVIEWS, WORK].forEach(d => mkdirSync(d, { recursive: true }));

const report = existsSync(REPORT) ? JSON.parse(readFileSync(REPORT, 'utf8')) : { runs: [] };
const run = { at: new Date().toISOString(), steps: [] };
report.runs.push(run);
const saveReport = () => writeFileSync(REPORT, JSON.stringify(report, null, 2) + '\n');

function meshy(args, { allowFail = false } = {}) {
  const full = ['exec', '--yes', '--package=meshy-cli@0.4.0', '--', 'meshy', ...args, '--output-schema', 'v1', '--format', 'json', '--no-update-check'];
  console.log('\n$ meshy ' + args.filter(a => !String(a).includes('\n')).map(a => (/\s/.test(a) ? JSON.stringify(a.slice(0, 60) + (a.length > 60 ? '…' : '')) : a)).join(' '));
  const r = spawnSync('npm', full, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, env: process.env });
  let out = null;
  try { out = JSON.parse(r.stdout); } catch { /* not JSON */ }
  if (!out || out.ok === false || r.status !== 0) {
    console.error(r.stdout?.slice(0, 4000));
    console.error(r.stderr?.slice(0, 4000));
    if (allowFail) return null;
    throw new Error(`meshy ${args[0]} ${args[1] || ''} failed (exit ${r.status})`);
  }
  return out;
}

// Pull the task id and credits from whatever shape the CLI returned.
function taskInfo(out, jsonFile) {
  const r = out?.result || {};
  let task = r.task || r;
  if (jsonFile && existsSync(jsonFile)) { try { task = JSON.parse(readFileSync(jsonFile, 'utf8')); } catch { /* keep */ } }
  const raw = task.raw || task;
  const id = raw.id || task.id || r.submission?.task_id || r.task_id;
  const credits = raw.consumed_credits ?? task.consumed_credits ?? null;
  const status = raw.status || task.status;
  return { id, credits, status };
}

function step(label, args, jsonFile) {
  if (existsSync(jsonFile)) rmSync(jsonFile);
  const out = meshy([...args, '--save-json', jsonFile, '--timeout', '1800']);
  const info = taskInfo(out, jsonFile);
  console.log(`  -> ${label}: task ${info.id} ${info.status || ''} credits ${info.credits ?? 'unknown'}`);
  run.steps.push({ label, ...info });
  saveReport();
  if (!info.id) throw new Error(`${label}: no task id in the response`);
  return info;
}

function download(jsonFile, selector, output) {
  const out = meshy(['download', '--task-json', jsonFile, ...selector, '--output', output, '--overwrite'], { allowFail: true });
  if (!out) console.warn(`  could not download ${selector.join(' ')} -> ${output}`);
  return !!out && existsSync(output);
}

function textModel(a, extra = []) {
  const pj = join(WORK, `${a.name}-preview.json`);
  const preview = step(`${a.name} preview`, ['text-to-3d', 'create', '--mode', 'preview', '--prompt', a.prompt, ...extra, '--target-formats', 'glb'], pj);
  const rj = join(WORK, `${a.name}-refine.json`);
  const refine = step(`${a.name} refine`, ['text-to-3d', 'create', '--mode', 'refine', '--preview-task-id', preview.id,
    '--texture-prompt', a.texturePrompt, '--enable-pbr', 'true', '--texture-resolution', config.textureResolution, '--target-formats', 'glb'], rj);
  download(rj, ['--asset', 'thumbnail.primary'], join(PREVIEWS, `${a.name}.png`));
  return { refine, rj };
}

function prop(a) {
  const { refine, rj } = textModel(a);
  const full = join(WORK, `${a.name}-full.glb`);
  download(rj, ['--model-format', 'glb'], full);
  // a lighter mesh for phones; if the remesh fails we keep the full model
  const mj = join(WORK, `${a.name}-remesh.json`);
  let light = null;
  try {
    step(`${a.name} remesh`, ['remesh', 'create', '--input-task-id', refine.id, '--topology', 'triangle', '--target-polycount', String(a.polycount), '--target-formats', 'glb'], mj);
    light = join(WORK, `${a.name}-light.glb`);
    if (!download(mj, ['--model-format', 'glb'], light)) light = null;
  } catch (e) { console.warn('  remesh skipped: ' + e.message); }
  copyFileSync(full, join(MODELS, `${a.name}-full.glb`));
  if (light) copyFileSync(light, join(MODELS, `${a.name}.glb`));
  else copyFileSync(full, join(MODELS, `${a.name}.glb`));
}

function character(a) {
  const { refine } = textModel(a, ['--pose-mode', 'a-pose']);
  const gj = join(WORK, `${a.name}-rig.json`);
  const rig = step(`${a.name} rigging`, ['rigging', 'create', '--input-task-id', refine.id, '--height-meters', String(a.heightMeters)], gj);
  download(gj, ['--asset', 'result.rigged_character_glb_url'], join(MODELS, `${a.name}.glb`));
  download(gj, ['--asset', 'result.basic_animations.running_glb_url'], join(MODELS, `${a.name}-run.glb`));
  download(gj, ['--asset', 'result.basic_animations.walking_glb_url'], join(MODELS, `${a.name}-walk.glb`));
  // extra clips from Meshy's public animation catalog
  const catalog = meshy(['animation-catalog', 'list'], { allowFail: true });
  const actions = catalog?.result?.actions || catalog?.result?.items || catalog?.result || [];
  const list = Array.isArray(actions) ? actions : [];
  writeFileSync(join(ROOT, 'tools', 'meshy', 'animation-catalog.json'), JSON.stringify(list, null, 1));
  for (const want of a.animations || []) {
    const hit = list.find(x => JSON.stringify(x).toLowerCase().includes(want));
    const id = hit && (hit.action_id ?? hit.id ?? hit.actionId);
    if (id == null) { console.warn(`  no catalog action for "${want}"`); continue; }
    const aj = join(WORK, `${a.name}-anim-${want}.json`);
    try {
      step(`${a.name} animation ${want} (${hit.name || id})`, ['animate', 'create', '--rig-task-id', rig.id, '--action-id', String(id)], aj);
      download(aj, ['--asset', 'result.animation_glb_url'], join(MODELS, `${a.name}-${want}.glb`));
    } catch (e) { console.warn(`  animation ${want} failed: ${e.message}`); }
  }
}

const mode = process.argv[2] || 'estimate';
const only = process.argv.slice(3).join(',').split(',').filter(Boolean);
const todo = config.assets.filter(a => (!only.length || only.includes(a.name)) && !existsSync(join(MODELS, `${a.name}.glb`)));

if (mode === 'estimate') {
  let total = 0;
  for (const a of todo) {
    const out = meshy(['make', a.prompt, '--dry-run']);
    console.log(`  ${a.name}: about ${out.result.estimated_credits} credits for the textured model`);
    total += out.result.estimated_credits;
  }
  console.log(`\nTextured models: about ${total} credits. Remeshing, rigging and animations cost extra; see https://docs.meshy.ai/en/api/pricing`);
  const bal = meshy(['balance'], { allowFail: true });
  console.log('Balance:', JSON.stringify(bal?.result ?? 'unknown'));
} else {
  if (!process.env.MESHY_API_KEY) throw new Error('MESHY_API_KEY is not set');
  for (const a of todo) {
    console.log(`\n===== ${a.name} =====`);
    try { a.kind === 'character' ? character(a) : prop(a); }
    catch (e) { console.error(`${a.name} failed: ${e.message}`); run.steps.push({ label: `${a.name} failed`, error: e.message }); saveReport(); }
  }
  const bal = meshy(['balance'], { allowFail: true });
  run.balanceAfter = bal?.result ?? null;
  saveReport();
  console.log('\nDone. Models are in src/assets/models/, previews in tools/meshy/previews/.');
}
