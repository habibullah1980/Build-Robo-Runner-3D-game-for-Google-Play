// Downloads free CC0 asset packs into public/kits (run by the "Fetch free 3D assets" workflow,
// which has full internet access). Kenney kits: https://kenney.nl  Poly Haven: https://polyhaven.com
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, cpSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = join(ROOT, 'public', 'kits');
const TMP = join(ROOT, 'asset-work');
const src = JSON.parse(readFileSync(join(ROOT, 'tools', 'assets', 'sources.json'), 'utf8'));
mkdirSync(OUT, { recursive: true }); mkdirSync(TMP, { recursive: true });
const UA = 'Mozilla/5.0 (X11; Linux x86_64) RoboRunnerAssetFetch/1.0';
const sh = cmd => execSync(cmd, { stdio: ['ignore', 'pipe', 'inherit'], encoding: 'utf8', maxBuffer: 1 << 28 });
const get = async (url, as = 'text') => { const r = await fetch(url, { headers: { 'User-Agent': UA } }); if (!r.ok) throw new Error(`${r.status} ${url}`); return as === 'json' ? r.json() : as === 'buf' ? Buffer.from(await r.arrayBuffer()) : r.text(); };
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const log = [];

for (const slug of src.kenney) {
  const dest = join(OUT, slug);
  if (existsSync(dest)) { console.log(`skip ${slug} (already here)`); continue; }
  try {
    const html = await get(`https://kenney.nl/assets/${slug}`);
    const m = html.match(/href="([^"]+\.zip)"/i) || html.match(/(https?:\/\/[^"'\s]+\.zip)/i);
    if (!m) throw new Error('no zip link on the page');
    const zipUrl = new URL(m[1].replace(/&amp;/g, '&'), 'https://kenney.nl').href;
    console.log(`${slug}: ${zipUrl}`);
    const zip = join(TMP, `${slug}.zip`);
    writeFileSync(zip, await get(zipUrl, 'buf'));
    const ex = join(TMP, slug); rmSync(ex, { recursive: true, force: true }); mkdirSync(ex);
    sh(`unzip -q -o "${zip}" -d "${ex}"`);
    // keep the GLB models (plus the textures they reference) and the licence
    const files = walk(ex);
    const glbs = files.filter(f => f.toLowerCase().endsWith('.glb'));
    if (!glbs.length) throw new Error('no .glb files in the pack');
    const glbDir = dirname(glbs[0]);
    mkdirSync(dest, { recursive: true });
    cpSync(glbDir, dest, { recursive: true });
    const lic = files.find(f => /licen[cs]e/i.test(f));
    if (lic) cpSync(lic, join(dest, 'License.txt'));
    log.push({ pack: slug, source: `https://kenney.nl/assets/${slug}`, files: walk(dest).map(f => relative(dest, f)) });
  } catch (e) { console.warn(`!! ${slug}: ${e.message}`); log.push({ pack: slug, error: e.message }); }
}

const ph = join(OUT, 'polyhaven');
mkdirSync(ph, { recursive: true });
for (const id of src.polyhaven.hdri) {
  try {
    const files = await get(`https://api.polyhaven.com/files/${id}`, 'json');
    const url = files.hdri['1k'].hdr.url;
    writeFileSync(join(ph, `${id}_1k.hdr`), await get(url, 'buf'));
    log.push({ pack: `polyhaven hdri ${id}`, source: `https://polyhaven.com/a/${id}`, files: [`${id}_1k.hdr`] });
  } catch (e) { console.warn(`!! hdri ${id}: ${e.message}`); log.push({ pack: id, error: e.message }); }
}
for (const id of src.polyhaven.textures) {
  try {
    const files = await get(`https://api.polyhaven.com/files/${id}`, 'json');
    const saved = [];
    for (const [map, key] of [['diff', 'Diffuse'], ['nor', 'nor_gl'], ['rough', 'Rough'], ['arm', 'arm']]) {
      const f = files[key]?.['1k']?.jpg?.url;
      if (!f) continue;
      const name = `${id}_${map}_1k.jpg`;
      writeFileSync(join(ph, name), await get(f, 'buf')); saved.push(name);
    }
    log.push({ pack: `polyhaven texture ${id}`, source: `https://polyhaven.com/a/${id}`, files: saved });
  } catch (e) { console.warn(`!! texture ${id}: ${e.message}`); log.push({ pack: id, error: e.message }); }
}

writeFileSync(join(OUT, 'index.json'), JSON.stringify(log, null, 1) + '\n');
console.log(JSON.stringify(log.map(l => ({ pack: l.pack, n: l.files?.length, error: l.error })), null, 1));
