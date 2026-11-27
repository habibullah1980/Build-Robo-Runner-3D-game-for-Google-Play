// Robo Runner: an original 3-lane endless runner.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import '@fontsource/lilita-one/400.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import {
  LANES, TRAM_LEN, TRAM_ROOF, RAMP_LEN, M, initMaterials, initGeometries,
  makeTram, makeBarrier, makeBar, makeRamp, makeGear, makePower, makeDrone, makeBuilding, makeLamp, makeTree, makeBench, setTemplate,
} from './models.js';
import { sfx, unlockAudio, setMuted } from './audio.js';
import { createEffects } from './effects.js';
import robotUrl from './assets/robot.glb?url';

// Meshy-generated models (src/assets/models/*.glb) are picked up automatically when present.
const MODEL_URLS = Object.fromEntries(Object.entries(import.meta.glob('./assets/models/*.glb', { query: '?url', import: 'default', eager: true }))
  .map(([p, url]) => [p.split('/').pop().replace('.glb', ''), url]));

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];
const store = {
  get(k, d) { try { const v = localStorage.getItem('rr_' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('rr_' + k, JSON.stringify(v)); } catch { /* storage unavailable */ } },
};

/* ================= renderer & scene ================= */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
const MOBILE = /Android|iPhone|iPad/i.test(navigator.userAgent);
const DPR = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.75 : 2);
renderer.setPixelRatio(DPR);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xc58ad8, 45, 175);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 700);

// canvas textures draw text, so wait (briefly) for the display font first
await Promise.race([document.fonts.load('48px "Lilita One"'), new Promise(r => setTimeout(r, 1500))]).catch(() => {});
initMaterials();
initGeometries();

// sky dome with sunset gradient
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(500, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x24166e) }, mid: { value: new THREE.Color(0x8a4fe0) }, hor: { value: new THREE.Color(0xff8fb8) }, low: { value: new THREE.Color(0xffc48a) } },
    vertexShader: 'varying vec3 vp; void main(){ vp = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
    fragmentShader: `uniform vec3 top, mid, hor, low; varying vec3 vp;
      void main(){ float y = vp.y; vec3 c = y > .25 ? mix(mid, top, smoothstep(.25,.8,y)) : y > .02 ? mix(hor, mid, smoothstep(.02,.25,y)) : mix(low, hor, smoothstep(-.15,.02,y));
      gl_FragColor = vec4(c,1.); }`,
  }));
sky.renderOrder = -1;
scene.add(sky);
const sunDisk = new THREE.Mesh(new THREE.CircleGeometry(30, 48), new THREE.MeshBasicMaterial({ color: 0xfff0b0, fog: false }));
scene.add(sunDisk);

{
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(sky.geometry, sky.material));
  const sunE = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8), new THREE.MeshBasicMaterial({ color: 0xfff0c0 })); sunE.position.set(-60, 40, -420); envScene.add(sunE);
  [[0xff5fa8, -200, 0], [0x7ef0ff, 200, 0], [0x7ef0ff, -200, -200], [0xff5fa8, 200, -200]].forEach(([c, x, z]) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(60, 160), new THREE.MeshBasicMaterial({ color: c, side: THREE.DoubleSide })); p.position.set(x, 60, z); p.lookAt(0, 60, 0); envScene.add(p);
  });
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(envScene, 0.02).texture;
  scene.environmentIntensity = 0.85;
  pmrem.dispose();
}
scene.add(new THREE.HemisphereLight(0xd8ccff, 0x6a3a8a, 0.8));
const sun = new THREE.DirectionalLight(0xffe2c0, 2.4);
sun.castShadow = true;
sun.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 14, bottom: -14, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);
const rim = new THREE.DirectionalLight(0xff7ab8, 1.0);
scene.add(rim, rim.target);

// road and ground that follow the player
const ROAD_LEN = 320;
const road = new THREE.Mesh(new THREE.PlaneGeometry(8.6, ROAD_LEN), M.road);
road.rotation.x = -Math.PI / 2; road.receiveShadow = true; scene.add(road);
const walks = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.PlaneGeometry(7, ROAD_LEN), M.walk); m.rotation.x = -Math.PI / 2; m.position.set(s * 7.8, 0.25, 0); m.receiveShadow = true; scene.add(m); return m; });
const curbs = [-1, 1].flatMap(s => {
  const c = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, ROAD_LEN), M.curb); c.position.set(s * 4.42, 0.125, 0); c.receiveShadow = true;
  const gl = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, ROAD_LEN), M.curbGlow); gl.position.set(s * 4.26, 0.2, 0);
  scene.add(c, gl); return [c, gl];
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, ROAD_LEN + 200), new THREE.MeshStandardMaterial({ color: 0x2a1f5c, roughness: 1 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; scene.add(ground);

// post-processing glow
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.5, 0.8);
composer.addPass(bloom);
// colour grade: a touch more saturation and a soft vignette
composer.addPass(new ShaderPass({
  uniforms: { tDiffuse: { value: null } },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
  fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv;
    void main(){ vec4 c = texture2D(tDiffuse, vUv); float l = dot(c.rgb, vec3(.299,.587,.114));
      c.rgb = mix(vec3(l), c.rgb, 1.18); vec2 d = vUv - .5; c.rgb *= 1. - dot(d,d) * .55; gl_FragColor = c; }`,
}));
composer.addPass(new OutputPass());

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(DPR);
  composer.setSize(w, h);
  bloom.resolution.set(w / 2, h / 2);
  camera.aspect = w / h;
  camera.fov = w < h ? 70 : 58;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ================= player ================= */
const player = new THREE.Group();
scene.add(player);
const body = new THREE.Group(); // holds the model; squashed for slides
player.add(body);
const shieldBubble = new THREE.Mesh(new THREE.SphereGeometry(1.35, 32, 20), new THREE.MeshBasicMaterial({ color: 0x4dc9ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
shieldBubble.position.y = 1; shieldBubble.visible = false; player.add(shieldBubble);
const flames = [-0.28, 0.28].map(x => {
  const f = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.1, 12), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
  f.rotation.x = Math.PI; f.position.set(x, -0.45, 0); f.visible = false; player.add(f); return f;
});
let mixer = null;
const actions = {};
let current = null;
function play(name, fade = 0.15, once = false, timeScale = 1) {
  const a = actions[name];
  if (!a || current === a) return;
  a.reset();
  a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
  a.clampWhenFinished = once;
  a.timeScale = timeScale;
  a.play();
  if (current) current.crossFadeTo(a, fade, false);
  current = a;
}

const drone = makeDrone();
scene.add(drone);
const fx = createEffects(scene);

/* ================= world objects ================= */
const obstacles = []; // {kind, lane, mesh, zFront, zBack, z, vz}
const gears = [];
const powers = [];
const decor = [];
const CHUNK = 36;
let spawnZ = 0;
let lastTramLanes = [];
let chunksSincePower = 0;

function addObstacle(kind, lane, z, vz = 0) {
  let mesh, len;
  if (kind === 'tram') { mesh = makeTram(); len = TRAM_LEN; }
  else if (kind === 'ramp') { mesh = makeRamp(); len = RAMP_LEN; }
  else if (kind === 'barrier') { mesh = makeBarrier(); len = 0.5; }
  else { mesh = makeBar(); len = 0.5; }
  // tram/ramp z is the centre; ramp geometry rises toward -z
  mesh.position.set(LANES[lane], kind === 'tram' ? 0.12 : 0, z);
  scene.add(mesh);
  const o = { kind, lane, mesh, len, z, vz, zFront: z + len / 2, zBack: z - len / 2 };
  obstacles.push(o);
  return o;
}
function addGear(x, y, z) {
  const g = makeGear();
  g.position.set(x, y, z);
  g.rotation.y = rand(0, 6);
  scene.add(g);
  gears.push(g);
}
function gearLine(lane, z0, n, y = 0.9, gap = 2.2) { for (let i = 0; i < n; i++) addGear(LANES[lane], y, z0 - i * gap); }
function gearArc(lane, zc, n = 7, base = 0.9, h = 2.0) {
  for (let i = 0; i < n; i++) { const t = i / (n - 1); addGear(LANES[lane], base + Math.sin(t * Math.PI) * h, zc + 5 - t * 10); }
}
function addPower(kind, lane, z) {
  const p = makePower(kind);
  p.position.set(LANES[lane], 1.2, z);
  p.userData.kind = kind;
  scene.add(p);
  powers.push(p);
}
function addDecor(z0) {
  [-1, 1].forEach(side => {
    let z = z0 - rand(0, 4);
    while (z > z0 - CHUNK) {
      const b = makeBuilding(side);
      b.position.set(side * (11.6 + b.userData.w / 2 + rand(0, 2)), 0.25, z);
      scene.add(b); decor.push(b);
      z -= rand(9, 13);
    }
    const lamp = makeLamp(side); lamp.position.set(side * 4.95, 0.25, z0 - 6); scene.add(lamp); decor.push(lamp);
    const tree = makeTree(); tree.position.set(side * rand(6.5, 8.5), 0.25, z0 - rand(14, 22)); tree.rotation.y = rand(0, 6); scene.add(tree); decor.push(tree);
    if (Math.random() < 0.5) { const b = makeBench(side); b.position.set(side * 6.2, 0.25, z0 - rand(26, 32)); scene.add(b); decor.push(b); }
  });
}

function spawnChunk(zs, dist) {
  addDecor(zs);
  const easy = dist < 250;
  chunksSincePower++;
  const r = Math.random();
  let tramLanes = [];
  if (easy || r < 0.4) {
    // gates: barriers and overhead bars
    const zc = zs - 18;
    const kinds = [0, 1, 2].map(() => (Math.random() < (easy ? 0.35 : 0.6) ? pick(['barrier', 'bar']) : null));
    if (kinds.every(k => k === null)) kinds[(Math.random() * 3) | 0] = pick(['barrier', 'bar']);
    if (easy) { let n = 0; kinds.forEach((k, i) => { if (k && ++n > 1) kinds[i] = null; }); }
    kinds.forEach((k, lane) => {
      if (k) addObstacle(k, lane, zc);
      if (k === 'barrier') gearArc(lane, zc);
      else if (k === 'bar') gearLine(lane, zc + 5, 5, 0.55);
      else if (Math.random() < 0.6) gearLine(lane, zc + 8, 7);
    });
  } else if (r < 0.78) {
    // parked hover-trams, sometimes with a ramp to the roof
    const n = Math.random() < 0.55 ? 1 : 2;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    tramLanes = lanes.slice(0, n);
    const tramFront = zs - 10;
    tramLanes.forEach((lane, i) => {
      addObstacle('tram', lane, tramFront - TRAM_LEN / 2);
      if (i === 0 && Math.random() < 0.65) {
        addObstacle('ramp', lane, tramFront + RAMP_LEN / 2);
        gearLine(lane, tramFront + RAMP_LEN - 1, 3, 1.0 + 0.5, 2.3);
      }
      gearLine(lane, tramFront - 1.5, 5, TRAM_ROOF + 0.9, 2.4);
    });
    const free = lanes[n];
    if (n === 1 && Math.random() < 0.5) { addObstacle(pick(['barrier', 'bar']), lanes[2], zs - 20); }
    gearLine(free, zs - 4, 6);
  } else {
    // oncoming tram in a lane that had no parked tram in the previous chunk
    const options = [0, 1, 2].filter(l => !lastTramLanes.includes(l));
    const lane = pick(options.length ? options : [1]);
    addObstacle('tram', lane, zs - 28, 9);
    tramLanes = [lane];
    const others = [0, 1, 2].filter(l => l !== lane);
    if (Math.random() < 0.6) addObstacle(pick(['barrier', 'bar']), pick(others), zs - 16);
    gearLine(pick(others), zs - 6, 6);
  }
  if (chunksSincePower > 4 && Math.random() < 0.45) {
    chunksSincePower = 0;
    const lane = [0, 1, 2].find(l => !tramLanes.includes(l)) ?? 1;
    addPower(pick(['magnet', 'boots', 'shield', 'double']), lane, zs - 2);
  }
  lastTramLanes = tramLanes;
}

function clearWorld() {
  [...obstacles.map(o => o.mesh), ...gears, ...powers, ...decor].forEach(m => scene.remove(m));
  obstacles.length = gears.length = powers.length = decor.length = 0;
}

/* ================= game state ================= */
const S = {
  mode: 'loading', lane: 1, x: 0, y: 0, vy: 0, z: 0, speed: 15, dist: 0, score: 0, gearsRun: 0,
  slide: 0, flying: 0, magnet: 0, double: 0, shield: false, invuln: 0, droneT: 0, deadT: 0, shake: 0,
  best: store.get('best', 0), bank: store.get('gears', 0), time: 0,
};
const POWER_TIME = { magnet: 10, boots: 7, double: 12 };
const POWER_LABEL = { magnet: 'Magnet', boots: 'Rocket boots', shield: 'Shield', double: 'Double gears' };
const POWER_COLOR = { magnet: '#ff3b5c', boots: '#ff8a2b', shield: '#4dc9ff', double: '#ffd84d' };

function showScreen(id) {
  ['loading', 'menu', 'hud', 'pause', 'over'].forEach(s => { $(s).hidden = s !== id && !(id === 'pause' && s === 'hud'); });
}
function updateMenu() { $('menu-gears').textContent = S.bank.toLocaleString(); $('menu-best').textContent = Math.floor(S.best).toLocaleString(); }

function resetRun() {
  clearWorld();
  Object.assign(S, { lane: 1, x: 0, y: 0, vy: 0, z: 0, speed: 15, dist: 0, score: 0, gearsRun: 0, slide: 0, flying: 0, magnet: 0, double: 0, shield: false, invuln: 0, droneT: 1.5, deadT: 0, shake: 0 });
  spawnZ = -30; lastTramLanes = []; chunksSincePower = 2;
  gearLine(1, -8, 8);
  player.position.set(0, 0, 0);
  body.scale.set(1, 1, 1); body.rotation.set(0, 0, 0);
  while (spawnZ > -170) { spawnChunk(spawnZ, 0); spawnZ -= CHUNK; }
  $('powers').innerHTML = '';
  $('hud-gears').textContent = '0';
  drone.position.set(0, 2.6, 6);
}

function startRun() {
  unlockAudio();
  resetRun();
  S.mode = 'run';
  play('Running', 0.2, false, 1.25);
  showScreen('hud');
}
function toMenu() {
  resetRun();
  S.mode = 'menu';
  camPos.set(0, 2.3, S.z + 5);
  play('Idle', 0.3);
  updateMenu();
  showScreen('menu');
}

let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('on'); toastTimer = 1.2; }

function activatePower(kind) {
  sfx.power();
  toast(POWER_LABEL[kind].toUpperCase() + '!');
  if (kind === 'shield') { S.shield = true; renderPowers(); return; }
  if (kind === 'boots') {
    S.flying = POWER_TIME.boots;
    // a trail of gears in the sky
    for (let i = 0; i < 26; i++) addGear(LANES[[1, 1, 0, 0, 1, 2, 2, 1][Math.floor(i / 4) % 8]], 9.2, S.z - 14 - i * 3.2);
  } else S[kind] = POWER_TIME[kind];
  renderPowers();
}
function renderPowers() {
  const wrap = $('powers');
  const active = ['magnet', 'boots', 'double', 'shield'].filter(k => (k === 'shield' ? S.shield : k === 'boots' ? S.flying > 0 : S[k] > 0));
  wrap.innerHTML = active.map(k => `<div class="power" data-k="${k}"><span class="dot" style="background:${POWER_COLOR[k]}"></span><span>${POWER_LABEL[k]}</span>${k === 'shield' ? '' : `<div class="bar"><i style="background:${POWER_COLOR[k]}"></i></div>`}</div>`).join('');
}
function tickPowerBars() {
  document.querySelectorAll('.power').forEach(el => {
    const k = el.dataset.k; const i = el.querySelector('i'); if (!i) return;
    const left = k === 'boots' ? S.flying : S[k];
    i.style.width = Math.max(0, (left / POWER_TIME[k]) * 100) + '%';
  });
}

function crash(reason) {
  if (S.invuln > 0 || S.flying > 0) return;
  if (S.shield) {
    S.shield = false; S.invuln = 1.6; sfx.shield(); fx.burst(new THREE.Vector3(S.x, S.y + 1, S.z), 0x4dc9ff); toast('SHIELD SAVED YOU!'); renderPowers();
    return;
  }
  S.mode = 'dead'; S.deadT = 0; S.shake = 0.5;
  fx.crash(new THREE.Vector3(S.x, S.y + 1, S.z - 0.5));
  sfx.crash();
  play('Death', 0.1, true);
  $('over-title').textContent = reason === 'caught' ? 'Caught!' : 'Crash!';
  document.body.classList.remove('flash'); void document.body.offsetWidth; document.body.classList.add('flash');
}
function stumble() {
  sfx.stumble(); S.shake = 0.3;
  document.body.classList.remove('flash'); void document.body.offsetWidth; document.body.classList.add('flash');
  if (S.droneT > 0) { crash('caught'); return; }
  S.droneT = 6;
}
function gameOver() {
  S.mode = 'over';
  const final = Math.floor(S.score);
  const isBest = final > S.best;
  if (isBest) { S.best = final; store.set('best', final); }
  S.bank += S.gearsRun; store.set('gears', S.bank);
  $('over-score').textContent = final.toLocaleString();
  $('over-gears').textContent = '+' + S.gearsRun;
  $('over-best').textContent = Math.floor(S.best).toLocaleString();
  $('over-new').hidden = !isBest;
  showScreen('over');
}

/* ================= controls ================= */
function laneTrams(lane, z, y) {
  return obstacles.some(o => o.kind === 'tram' && o.lane === lane && z <= o.zFront + 0.4 && z >= o.zBack - 0.4 && y < TRAM_ROOF - 0.6);
}
function move(dir) {
  if (S.mode !== 'run') return;
  const nl = S.lane + dir;
  if (nl < 0 || nl > 2) { stumble(); return; }
  if (S.flying <= 0 && laneTrams(nl, S.z, S.y)) { stumble(); return; }
  S.lane = nl; sfx.lane();
}
function jump() {
  if (S.mode !== 'run' || S.flying > 0) return;
  if (S.y <= groundHeight() + 0.05) {
    S.vy = 13.2; S.slide = 0; sfx.jump();
    play('Jump', 0.08, true, 1.6);
  }
}
function slide() {
  if (S.mode !== 'run' || S.flying > 0) return;
  if (S.y > groundHeight() + 0.1) S.vy = -26;
  S.slide = 0.75; sfx.slide();
  if (actions.Slide) play('Slide', 0.08, true, 1.3); else play('Running', 0.1, false, 1.25);
}

let touch = null;
canvas.addEventListener('pointerdown', e => { touch = { x: e.clientX, y: e.clientY, done: false }; unlockAudio(); });
canvas.addEventListener('pointermove', e => {
  if (!touch || touch.done) return;
  const dx = e.clientX - touch.x, dy = e.clientY - touch.y;
  if (Math.hypot(dx, dy) < 28) return;
  touch.done = true;
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1); else if (dy < 0) jump(); else slide();
});
window.addEventListener('pointerup', () => { touch = null; });
window.addEventListener('keydown', e => {
  const k = e.key;
  if (k === 'ArrowLeft' || k === 'a') move(-1);
  else if (k === 'ArrowRight' || k === 'd') move(1);
  else if (k === 'ArrowUp' || k === 'w' || k === ' ') jump();
  else if (k === 'ArrowDown' || k === 's') slide();
  else if (k === 'Escape' || k === 'p') togglePause();
  else return;
  e.preventDefault();
});
function togglePause() {
  if (S.mode === 'run') { S.mode = 'paused'; showScreen('pause'); }
  else if (S.mode === 'paused') { S.mode = 'run'; showScreen('hud'); }
}
document.addEventListener('visibilitychange', () => { if (document.hidden && S.mode === 'run') togglePause(); });
$('btn-play').addEventListener('click', startRun);
$('btn-again').addEventListener('click', startRun);
$('btn-home').addEventListener('click', toMenu);
$('btn-quit').addEventListener('click', toMenu);
$('btn-pause').addEventListener('click', togglePause);
$('btn-resume').addEventListener('click', togglePause);
let soundOn = store.get('sound', true);
function applySound() { setMuted(!soundOn); $('ic-waves').style.display = soundOn ? '' : 'none'; }
$('btn-sound').addEventListener('click', () => { soundOn = !soundOn; store.set('sound', soundOn); unlockAudio(); applySound(); sfx.lane(); });
applySound();

/* ================= simulation ================= */
function groundHeight() {
  let g = 0;
  const lane = S.lane;
  for (const o of obstacles) {
    if (o.lane !== lane || Math.abs(S.x - LANES[lane]) > 1.2) continue;
    if (S.z > o.zFront || S.z < o.zBack) continue;
    if (o.kind === 'tram' && S.y >= TRAM_ROOF - 0.7) g = Math.max(g, TRAM_ROOF);
    else if (o.kind === 'ramp') {
      const h = ((o.zFront - S.z) / RAMP_LEN) * TRAM_ROOF;
      if (S.y >= h - 0.9) g = Math.max(g, h);
    }
  }
  return g;
}

const GRAV = -38;
function stepRun(dt) {
  S.time += dt;
  S.speed = Math.min(32, 15 + S.dist / 110);
  const dz = S.speed * dt;
  S.z -= dz; S.dist += dz;
  const mult = 1 + Math.min(4, Math.floor(S.dist / 600));
  S.score += dz * mult;
  $('hud-score').textContent = Math.floor(S.score).toLocaleString();
  $('hud-mult').textContent = 'x' + mult;

  // timers
  S.slide = Math.max(0, S.slide - dt);
  S.invuln = Math.max(0, S.invuln - dt);
  const hadFly = S.flying > 0;
  ['magnet', 'double'].forEach(k => { if (S[k] > 0) { S[k] -= dt; if (S[k] <= 0) renderPowers(); } });
  if (S.flying > 0) { S.flying -= dt; if (S.flying <= 0) { S.invuln = 1.2; renderPowers(); } }
  tickPowerBars();

  // horizontal
  S.x += (LANES[S.lane] - S.x) * Math.min(1, dt * 14);

  // vertical
  const gH = groundHeight();
  if (S.flying > 0) {
    S.y += (9 - S.y) * Math.min(1, dt * 3); S.vy = 0;
  } else {
    S.vy += GRAV * dt;
    S.y += S.vy * dt;
    if (S.y <= gH) {
      const wasAir = S.vy < -2;
      S.y = gH; S.vy = 0;
      if (wasAir) fx.dust(player.position);
      if (wasAir && current === actions.Jump) play('Running', 0.12, false, 1.25);
      if (hadFly && current !== actions.Running) play('Running', 0.12, false, 1.25);
    }
  }

  // moving obstacles
  for (const o of obstacles) {
    if (o.vz) { o.z += o.vz * dt; o.mesh.position.z = o.z; o.zFront = o.z + o.len / 2; o.zBack = o.z - o.len / 2; }
  }

  // collisions
  if (S.flying <= 0 && S.invuln <= 0) {
    for (const o of obstacles) {
      if (Math.abs(S.x - LANES[o.lane]) > 1.15) continue;
      if (o.kind === 'tram') {
        if (S.y < TRAM_ROOF - 0.7 && S.z <= o.zFront + 0.25 && S.z > o.zFront - 1.6) { crash('crash'); break; }
      } else if (o.kind === 'barrier') {
        if (Math.abs(S.z - o.z) < 0.45 && S.y < 0.95) { crash('crash'); break; }
      } else if (o.kind === 'bar') {
        if (Math.abs(S.z - o.z) < 0.45 && S.slide <= 0 && S.y < 2.0) { crash('crash'); break; }
      }
    }
  }
  if (S.mode !== 'run') return;

  // gears
  const px = S.x, py = S.y + 1, pz = S.z;
  for (let i = gears.length - 1; i >= 0; i--) {
    const g = gears[i];
    g.rotation.y += dt * 4;
    if (S.magnet > 0 && g.position.z < pz + 2 && g.position.z > pz - 16) {
      g.position.x += (px - g.position.x) * Math.min(1, dt * 8);
      g.position.y += (py - g.position.y) * Math.min(1, dt * 8);
      g.position.z += (pz - g.position.z) * Math.min(1, dt * 8);
    }
    const d2 = (g.position.x - px) ** 2 + (g.position.y - py) ** 2 + (g.position.z - pz) ** 2;
    if (d2 < 1.3) {
      scene.remove(g); gears.splice(i, 1);
      S.gearsRun += S.double > 0 ? 2 : 1; sfx.gear(); fx.sparkle(g.position);
      $('hud-gears').textContent = S.gearsRun;
    } else if (g.position.z > pz + 12) { scene.remove(g); gears.splice(i, 1); }
  }
  // power-ups
  for (let i = powers.length - 1; i >= 0; i--) {
    const p = powers[i];
    p.rotation.y += dt * 2; p.userData.ring.rotation.x += dt * 3; p.userData.ring2.rotation.z += dt * 2;
    p.position.y = 1.2 + Math.sin(S.time * 3 + i) * 0.15;
    const d2 = (p.position.x - px) ** 2 + (p.position.y - py) ** 2 + (p.position.z - pz) ** 2;
    if (d2 < 2.2) { scene.remove(p); powers.splice(i, 1); fx.burst(p.position, { magnet: 0xff3b5c, boots: 0xff8a2b, shield: 0x4dc9ff, double: 0xffd84d }[p.userData.kind]); activatePower(p.userData.kind); }
    else if (p.position.z > pz + 12) { scene.remove(p); powers.splice(i, 1); }
  }

  // spawn ahead, clean up behind
  while (spawnZ > S.z - 170) { spawnChunk(spawnZ, S.dist); spawnZ -= CHUNK; }
  for (let i = obstacles.length - 1; i >= 0; i--) if (obstacles[i].zBack > S.z + 15) { scene.remove(obstacles[i].mesh); obstacles.splice(i, 1); }
  for (let i = decor.length - 1; i >= 0; i--) if (decor[i].position.z > S.z + 40) { scene.remove(decor[i]); decor.splice(i, 1); }

  // drone chases after a stumble
  if (S.droneT > 0) S.droneT -= dt;
}

/* ================= visuals per frame ================= */
const camPos = new THREE.Vector3(0, 5, 9);
const camLook = new THREE.Vector3();
const tmp = new THREE.Vector3();
function updateVisuals(dt, t) {
  player.position.set(S.x, S.y, S.z);
  // lean into lane changes
  body.rotation.z = (S.x - LANES[S.lane]) * 0.12;
  // face the camera on the menu, face down the track while running
  body.rotation.y += ((S.mode === 'menu' ? Math.PI : 0) - body.rotation.y) * Math.min(1, dt * 8);
  // slide squash
  const sl = S.slide > 0 ? 1 : 0;
  body.scale.y += ((sl && !actions.Slide ? 0.5 : 1) - body.scale.y) * Math.min(1, dt * 18);
  body.rotation.x += ((sl ? -0.35 : 0) - body.rotation.x) * Math.min(1, dt * 18);
  shieldBubble.visible = S.shield || S.invuln > 0;
  shieldBubble.material.opacity = S.invuln > 0 && !S.shield ? (Math.sin(t * 30) > 0 ? 0.25 : 0.05) : 0.22;
  flames.forEach(f => { f.visible = S.flying > 0; f.scale.y = 0.8 + Math.random() * 0.5; });

  // drone
  const chasing = S.mode === 'run' && S.droneT > 0;
  const caught = S.mode === 'dead' || S.mode === 'over';
  if (chasing || caught) tmp.set(S.x + (caught ? 0 : 1.5) + Math.sin(t * 2) * 0.3, S.y + (caught ? 2.6 : 3.3) + Math.sin(t * 3) * 0.2, S.z + (caught ? 1.4 : 1.2));
  else tmp.set(S.x, S.y + 6, S.z + 16);
  drone.position.lerp(tmp, Math.min(1, dt * (chasing || caught ? 4 : 1.5)));
  drone.lookAt(S.x, S.y + 1, S.z - 10);
  drone.userData.rotors.forEach((r, i) => { r.rotation.y += dt * 40 * (i % 2 ? 1 : -1); });

  // camera
  const portrait = window.innerWidth < window.innerHeight;
  if (S.mode === 'menu') {
    const a = Math.sin(t * 0.3) * 0.35;
    tmp.set(Math.sin(a) * 5, 2.3, S.z + Math.cos(a) * 5);
    camPos.lerp(tmp, Math.min(1, dt * 2));
    camLook.set(0, 1.5, S.z);
  } else {
    tmp.set(S.x * 0.55, S.y * 0.55 + (portrait ? 4.6 : 4.2), S.z + (portrait ? 8.6 : 7.6));
    camPos.lerp(tmp, Math.min(1, dt * 6));
    camLook.set(S.x * 0.45, S.y * 0.55 + 1.0, S.z - 14);
  }
  camera.position.copy(camPos);
  if (S.shake > 0) { S.shake -= dt; camera.position.x += (Math.random() - 0.5) * S.shake; camera.position.y += (Math.random() - 0.5) * S.shake; }
  camera.lookAt(camLook);

  // keep the environment around the player
  sky.position.copy(camera.position);
  sunDisk.position.set(camera.position.x - 40, 30, camera.position.z - 420);
  sunDisk.lookAt(camera.position);
  road.position.set(0, 0, S.z - ROAD_LEN / 2 + 40);
  M.road.map.offset.y = -road.position.z * 16 / ROAD_LEN;
  M.walk.map.offset.y = -road.position.z * 40 / ROAD_LEN;
  walks.forEach(w => { w.position.z = road.position.z; });
  curbs.forEach(c => { c.position.z = road.position.z; });
  ground.position.z = road.position.z;
  sun.position.set(S.x - 6, S.y + 16, S.z + 8);
  sun.target.position.set(S.x, S.y, S.z - 4);
  rim.position.set(S.x + 6, 5, S.z - 12); rim.target.position.set(S.x, 1, S.z);

  fx.update(dt, player.position, S.speed, S.mode === 'run');
  if (S.flying > 0 && Math.random() < 0.6) fx.sparkle(new THREE.Vector3(S.x, S.y - 0.3, S.z + 0.3), 0xff8a2b);
  if (toastTimer > 0) { toastTimer -= dt; if (toastTimer <= 0) $('toast').classList.remove('on'); }
}

/* ================= main loop ================= */
const timer = new THREE.Timer();
let T = 0;
function frame() {
  requestAnimationFrame(frame);
  timer.update();
  const dt = Math.min(timer.getDelta(), 1 / 30);
  T += dt;
  if (S.mode === 'run') stepRun(dt);
  if (S.mode === 'dead') { S.deadT += dt; if (S.deadT > 1.6) gameOver(); }
  if (S.mode !== 'paused' && mixer) mixer.update(dt);
  if (S.mode !== 'loading') updateVisuals(S.mode === 'paused' ? 0 : dt, T);
  composer.render();
}

/* ================= boot ================= */
const loader = new GLTFLoader();
const loadGLB = url => new Promise((res, rej) => loader.load(url, res, undefined, rej));
const progress = p => { $('loadfill').style.width = Math.round(p * 100) + '%'; };

function addHero(model, clips, fromMeshy) {
  const box = new THREE.Box3().setFromObject(model);
  const h = box.max.y - box.min.y;
  model.scale.setScalar(1.9 / h);
  model.position.y = -box.min.y * (1.9 / h);
  model.rotation.y = Math.PI; // face down the track (-z)
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    if (fromMeshy) return;
    // repaint the stand-in robot in Bolt's colours: white shell, sky-blue joints, glowing visor accents
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach(m => {
      if (m.name === 'Main') { m.color.set(0xeef3ff); m.roughness = 0.3; m.metalness = 0.25; }
      else if (m.name === 'Grey') { m.color.set(0x3a8dff); m.roughness = 0.35; m.metalness = 0.4; }
      else if (m.name === 'Black') { m.color.set(0x141a3a); m.emissive = new THREE.Color(0x1a6fff); m.emissiveIntensity = 0.25; }
    });
  });
  body.add(model);
  mixer = new THREE.AnimationMixer(model);
  Object.entries(clips).forEach(([name, clip]) => { if (clip) actions[name] = mixer.clipAction(clip); });
  // fall back to the running clip for anything the character lacks
  ['Idle', 'Jump', 'Death'].forEach(n => { if (!actions[n] && actions.Running) actions[n] = actions.Running; });
  mixer.addEventListener('finished', e => { if ((e.action === actions.Jump || e.action === actions.Slide) && S.mode === 'run') play('Running', 0.15, false, 1.25); });
}

async function boot() {
  const props = [
    ['tram', { x: 2.3, y: 2.9, z: TRAM_LEN }, { longAxis: 'z', shadow: true }],
    ['drone', { x: 1.3, y: 0.9, z: 1.3 }, { uniform: true }],
    ['barrier', { x: 2.2, y: 1.15, z: 0.45 }, { longAxis: 'x', shadow: true }],
    ['gear', { x: 0.95, y: 0.95, z: 0.2 }, { flatAxis: 'z', uniform: true }],
  ].filter(([n]) => MODEL_URLS[n]);
  const total = props.length + 1;
  let done = 0;
  for (const [name, size, opts] of props) {
    try { const g = await loadGLB(MODEL_URLS[name]); setTemplate(name, g.scene, size, opts); }
    catch (e) { console.warn('model failed, using the built-in one:', name, e); }
    progress(++done / total * 0.9);
  }
  // the Meshy drone replaces the built-in one
  if (MODEL_URLS.drone) { const d2 = makeDrone(); drone.children.slice().forEach(c => drone.remove(c)); d2.children.slice().forEach(c => drone.add(c)); drone.userData = d2.userData; }

  let heroDone = false;
  if (MODEL_URLS.bolt) {
    try {
      const rig = await loadGLB(MODEL_URLS.bolt);
      const clip = async (n) => (MODEL_URLS[n] ? (await loadGLB(MODEL_URLS[n])).animations[0] : null);
      const clips = {
        Running: await clip('bolt-run'), Jump: await clip('bolt-jump'), Death: await clip('bolt-death'),
        Idle: (await clip('bolt-idle')) || (await clip('bolt-wave')), Wave: await clip('bolt-wave'), Slide: await clip('bolt-slide'),
      };
      addHero(rig.scene, clips, true);
      heroDone = !!actions.Running;
    } catch (e) { console.warn('Meshy hero failed, using the stand-in robot', e); }
  }
  if (!heroDone) {
    const g = await loadGLB(robotUrl);
    const byName = Object.fromEntries(g.animations.map(c => [c.name, c]));
    addHero(g.scene, byName, false);
  }
  progress(1);
  setTimeout(toMenu, 250);
}
boot().catch(err => { console.error(err); $('loadfill').style.background = '#ff3b5c'; });

requestAnimationFrame(frame);
window.__rr = { S, startRun, move, jump, slide };
