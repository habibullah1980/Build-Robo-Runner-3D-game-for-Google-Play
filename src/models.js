// Procedural models, textures and shared materials for Robo Runner.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const LANES = [-2.6, 0, 2.6];
export const TRAM_LEN = 14;
export const TRAM_ROOF = 3.3;
export const RAMP_LEN = 7;

const DISPLAY = '"Lilita One", "Arial Black", sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const pick = a => a[(Math.random() * a.length) | 0];
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, ...o });

function canvasTex(w, h, draw, { repeat = false, srgb = true } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }

/* ---------------- textures ---------------- */
function tramSideTex(accent, accent2, number) {
  return canvasTex(1024, 256, (g, w, h) => {
    // pearl white body with soft vertical shading
    const bg = g.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.55, '#eef2fb'); bg.addColorStop(1, '#c9d2ea');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    // lower livery band
    const band = g.createLinearGradient(0, 150, 0, 230);
    band.addColorStop(0, accent); band.addColorStop(1, accent2);
    g.fillStyle = band; g.fillRect(0, 168, w, 62);
    g.fillStyle = '#ffd84d'; g.fillRect(0, 160, w, 6);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 172, w, 4);
    // windows with frames and reflections
    const doors = [250, 720];
    for (let x = 40; x < w - 60; x += 118) {
      if (doors.some(d => Math.abs(x + 45 - d) < 70)) continue;
      rr(g, x, 34, 96, 92, 18); g.fillStyle = '#26305e'; g.fill();
      rr(g, x + 6, 40, 84, 80, 14);
      const gl = g.createLinearGradient(x, 40, x + 84, 120);
      gl.addColorStop(0, '#9ff4ff'); gl.addColorStop(0.35, '#3b6fd8'); gl.addColorStop(1, '#141a44');
      g.fillStyle = gl; g.fill();
      g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(x + 18, 40); g.lineTo(x + 40, 40); g.lineTo(x + 14, 120); g.lineTo(x + 6, 120); g.lineTo(x + 6, 70); g.fill();
      // passengers' silhouettes
      if (Math.random() < 0.5) { g.fillStyle = 'rgba(10,14,40,.55)'; g.beginPath(); g.arc(x + 60, 96, 14, 0, 7); g.fill(); g.fillRect(x + 44, 106, 32, 14); }
    }
    // doors
    doors.forEach(d => {
      rr(g, d - 52, 26, 104, 196, 14); g.fillStyle = '#ffd84d'; g.fill();
      rr(g, d - 46, 32, 44, 184, 10); g.fillStyle = '#dfe6f7'; g.fill();
      rr(g, d + 2, 32, 44, 184, 10); g.fill();
      [d - 40, d + 8].forEach(x => { rr(g, x, 44, 32, 70, 8); const gl = g.createLinearGradient(x, 44, x + 32, 114); gl.addColorStop(0, '#9ff4ff'); gl.addColorStop(1, '#1d2a66'); g.fillStyle = gl; g.fill(); });
      g.fillStyle = '#26305e'; g.fillRect(d - 1, 32, 2, 184);
    });
    // branding
    g.font = `48px ${DISPLAY}`; g.fillStyle = '#ffffff'; g.textBaseline = 'middle';
    g.fillText('ROBO METRO', 380, 200);
    g.font = `30px ${DISPLAY}`; g.fillStyle = accent; g.fillText(number, 900, 16 + 10);
    // panel seams and rivets
    g.strokeStyle = 'rgba(40,50,90,.25)'; g.lineWidth = 2;
    for (let x = 0; x < w; x += 170) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 160); g.stroke(); }
    g.fillStyle = 'rgba(40,50,90,.35)';
    for (let x = 10; x < w; x += 22) { g.beginPath(); g.arc(x, 146, 2, 0, 7); g.fill(); }
  });
}
function tramFrontTex(accent) {
  return canvasTex(256, 320, (g, w, h) => {
    g.fillStyle = '#f4f7ff'; g.fillRect(0, 0, w, h);
    // windshield
    rr(g, 16, 18, w - 32, 140, 30); g.fillStyle = '#1b2350'; g.fill();
    rr(g, 24, 26, w - 48, 124, 24);
    const gl = g.createLinearGradient(0, 26, w, 150); gl.addColorStop(0, '#a8f6ff'); gl.addColorStop(0.4, '#3d62d0'); gl.addColorStop(1, '#0f1336');
    g.fillStyle = gl; g.fill();
    g.fillStyle = 'rgba(255,255,255,.5)'; g.beginPath(); g.moveTo(40, 26); g.lineTo(90, 26); g.lineTo(46, 150); g.lineTo(28, 150); g.fill();
    // destination display
    rr(g, 48, 32, 160, 30, 6); g.fillStyle = '#120a00'; g.fill();
    g.font = `24px ${DISPLAY}`; g.fillStyle = '#ffae2b'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('EXPRESS 7', 128, 48);
    // livery band and grille
    g.fillStyle = accent; g.fillRect(0, 190, w, 70);
    g.fillStyle = '#ffd84d'; g.fillRect(0, 182, w, 8);
    g.fillStyle = '#26305e'; for (let i = 0; i < 5; i++) rr(g, 78, 204 + i * 10, 100, 5, 2), g.fill();
    // headlights (painted base, real glowing spheres sit in front)
    [52, 204].forEach(x => { g.fillStyle = '#26305e'; g.beginPath(); g.arc(x, 222, 26, 0, 7); g.fill(); g.fillStyle = '#fffbe0'; g.beginPath(); g.arc(x, 222, 18, 0, 7); g.fill(); });
    g.fillStyle = '#26305e'; g.fillRect(0, 280, w, 40);
  });
}
function stripeTex() {
  return canvasTex(256, 64, (g, w, h) => {
    g.fillStyle = '#ff6b2d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (let x = -h; x < w + h; x += 48) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 24, h); g.lineTo(x + 24 + h, 0); g.lineTo(x + h, 0); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(0, 4, w, 6);
    g.fillStyle = 'rgba(0,0,0,.2)'; g.fillRect(0, h - 8, w, 8);
  });
}
function signTex(text, sub, color) {
  return canvasTex(256, 128, (g, w, h) => {
    rr(g, 4, 4, w - 8, h - 8, 18); g.fillStyle = '#1b1240'; g.fill();
    g.lineWidth = 6; g.strokeStyle = color; g.stroke();
    g.fillStyle = color; g.font = `54px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, w / 2, 52);
    if (sub) { g.font = `26px ${DISPLAY}`; g.fillStyle = '#ffffff'; g.fillText(sub, w / 2, 100); }
  });
}
function rampTex() {
  return canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#2b3160'; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 8) { g.fillStyle = y % 16 ? '#323a70' : '#2a3062'; g.fillRect(0, y, w, 4); }
    g.fillStyle = '#ffd84d';
    for (let y = 20; y < h; y += 80) { g.beginPath(); g.moveTo(24, y + 40); g.lineTo(64, y); g.lineTo(104, y + 40); g.lineTo(104, y + 58); g.lineTo(64, y + 18); g.lineTo(24, y + 58); g.fill(); }
    g.fillStyle = '#7ef0ff'; g.fillRect(0, 0, 6, h); g.fillRect(w - 6, 0, 6, h);
  }, { repeat: true });
}
function facadeTex(accent, style) {
  return canvasTex(256, 512, (g, w, h) => {
    const base = pick(['#232a63', '#2b2266', '#1d2f5e', '#33256b']);
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    // vertical pilasters
    g.fillStyle = 'rgba(255,255,255,.06)';
    for (let x = 0; x < w; x += 64) g.fillRect(x, 0, 6, h);
    const fh = 32;
    for (let y = 0; y < h; y += fh) {
      // floor ledge
      g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0, y + fh - 4, w, 3);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, y + fh - 1, w, 2);
      for (let x = 10; x < w; x += 32) {
        const r = Math.random();
        const lit = r < 0.28 ? accent : r < 0.5 ? '#ffe6a6' : r < 0.58 ? '#ffffff' : null;
        g.fillStyle = '#121638'; g.fillRect(x - 1, y + 5, 22, 20);
        if (lit) {
          const gr = g.createLinearGradient(0, y + 6, 0, y + 24); gr.addColorStop(0, lit); gr.addColorStop(1, 'rgba(0,0,0,.25)');
          g.fillStyle = gr; g.fillRect(x, y + 6, 20, 18);
          if (Math.random() < 0.3) { g.fillStyle = 'rgba(20,20,50,.6)'; g.fillRect(x, y + 6, 20, 6); } // blinds
        } else { g.fillStyle = '#1b2150'; g.fillRect(x, y + 6, 20, 18); g.fillStyle = 'rgba(150,180,255,.12)'; g.fillRect(x, y + 6, 6, 18); }
        g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(x - 1, y + 24, 22, 2); // sill
      }
      if (style === 1 && Math.random() < 0.15) { g.fillStyle = '#8a92c0'; g.fillRect(rand(10, w - 40), y + 18, 22, 10); } // AC unit
    }
  }, { repeat: true });
}
function billboardTex() {
  const ads = [
    ['GEARZ', 'COLLECT THEM ALL', '#ffd84d', '#ff5fa8'],
    ['ZAP SODA', 'FIZZY VOLTS', '#7ef0ff', '#5b3bff'],
    ['NEO PIZZA', 'HOT IN 3 MIN', '#ff8a2b', '#ff3b5c'],
    ['BOLT', 'RUN FASTER', '#ffffff', '#2f7dff'],
    ['SKY TRAM', 'RIDE THE FUTURE', '#b6ff6b', '#1aa58a'],
  ];
  const [t, s, c1, c2] = pick(ads);
  return canvasTex(512, 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, c2); bg.addColorStop(1, '#1b1240');
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = c1; g.lineWidth = 10; g.strokeRect(8, 8, w - 16, h - 16);
    g.font = `110px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(t, w / 2 + 5, h / 2 - 15);
    g.fillStyle = c1; g.fillText(t, w / 2, h / 2 - 20);
    g.font = `40px ${DISPLAY}`; g.fillStyle = '#ffffff'; g.fillText(s, w / 2, h - 50);
  });
}
function verticalSignTex(word, color) {
  return canvasTex(64, 64 * word.length, (g, w, h) => {
    g.fillStyle = '#140d33'; g.fillRect(0, 0, w, h);
    g.font = `52px ${DISPLAY}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.shadowColor = color; g.shadowBlur = 12; g.fillStyle = color;
    [...word].forEach((ch, i) => g.fillText(ch, w / 2, i * 64 + 34));
  });
}
function roadTex() {
  return canvasTex(512, 1024, (g, w, h) => {
    g.fillStyle = '#20234a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { const v = Math.random(); g.fillStyle = `rgba(${v < .5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.08})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // tyre wear in each lane
    [w / 6, w / 2, (5 * w) / 6].forEach(cx => { const gr = g.createLinearGradient(cx - 60, 0, cx + 60, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(0,0,0,.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(cx - 60, 0, 120, h); });
    // lane dashes
    [w / 3, (2 * w) / 3].forEach(x => { for (let y = 0; y < h; y += 256) { g.fillStyle = '#6f8dff'; rr(g, x - 5, y, 10, 150, 5); g.fill(); } });
    // edge lines
    g.fillStyle = '#ffd84d'; g.fillRect(14, 0, 8, h); g.fillRect(w - 22, 0, 8, h);
    // manhole and arrow details
    g.fillStyle = '#2c3060'; g.beginPath(); g.arc(w / 6, 700, 26, 0, 7); g.fill();
    g.strokeStyle = '#3a3f78'; g.lineWidth = 3; for (let r = 8; r < 26; r += 7) { g.beginPath(); g.arc(w / 6, 700, r, 0, 7); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.moveTo(w / 2, 380); g.lineTo(w / 2 + 26, 430); g.lineTo(w / 2 + 9, 430); g.lineTo(w / 2 + 9, 480); g.lineTo(w / 2 - 9, 480); g.lineTo(w / 2 - 9, 430); g.lineTo(w / 2 - 26, 430); g.fill();
  }, { repeat: true });
}
function walkTex() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#4a3f8a'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a3070'; g.lineWidth = 4;
    for (let i = 0; i <= w; i += 64) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
  }, { repeat: true });
}
export function glowTex(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  return canvasTex(128, 128, (g, w) => {
    const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, inner); gr.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.6)')); gr.addColorStop(1, outer);
    g.fillStyle = gr; g.fillRect(0, 0, w, w);
  });
}

/* ---------------- materials ---------------- */
export const M = {};
export function initMaterials(art = {}) {
  const liveries = [['#2f7dff', '#1b4fd0'], ['#ff5fa8', '#c2307a'], ['#22b573', '#127a4b'], ['#7b5cff', '#4a2fd0']];
  M.tramSkins = liveries.map(([a, b], i) => {
    const side = tramSideTex(a, b, 'RM-' + (10 + i * 7));
    const front = tramFrontTex(a);
    return {
      side: new THREE.MeshStandardMaterial({ map: side, roughness: 0.25, metalness: 0.35, emissiveMap: side, emissive: 0x223355, emissiveIntensity: 0.35 }),
      front: new THREE.MeshStandardMaterial({ map: front, roughness: 0.2, metalness: 0.3 }),
      accent: std(new THREE.Color(a), { roughness: 0.3, metalness: 0.5 }),
    };
  });
  if (art.tramSide) {
    // painted ROBO METRO livery; it is used for most trams, the drawn liveries add variety
    const t = art.tramSide; t.repeat.set(1.9, 1);
    const ai = {
      side: new THREE.MeshStandardMaterial({ map: t, roughness: 0.2, metalness: 0.25, emissiveMap: t, emissive: 0xffffff, emissiveIntensity: 0.12 }),
      front: M.tramSkins[0].front,
      accent: std(0x2f6dff, { roughness: 0.3, metalness: 0.5 }),
    };
    M.tramSkins.push(ai, ai, ai, ai);
  }
  M.tramBody = std(0xf4f7ff, { roughness: 0.22, metalness: 0.45 });
  M.dark = std(0x23284a, { roughness: 0.4, metalness: 0.7 });
  M.chrome = std(0xdfe6f7, { roughness: 0.12, metalness: 1 });
  M.thruster = new THREE.MeshBasicMaterial({ color: 0x7ef0ff });
  M.glowTex = glowTex();
  M.glow = new THREE.MeshBasicMaterial({ color: 0x7ef0ff, map: M.glowTex, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
  M.headlight = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  M.redlight = new THREE.MeshBasicMaterial({ color: 0xff3b5c });
  M.amber = new THREE.MeshBasicMaterial({ color: 0xffb02b });

  const stripes = stripeTex();
  M.barrier = std(0xffffff, { map: stripes, roughness: 0.3, metalness: 0.2, emissive: 0xff4a10, emissiveIntensity: 0.12 });
  M.post = std(0x3a3f66, { metalness: 0.85, roughness: 0.25 });
  M.foot = std(0x2a2f4a, { metalness: 0.6, roughness: 0.4 });
  M.signDuck = new THREE.MeshStandardMaterial({ map: signTex('DUCK!', 'SLIDE UNDER', '#ffd84d'), emissiveMap: null, roughness: 0.4, emissive: 0x000000 });
  M.signJump = new THREE.MeshStandardMaterial({ map: signTex('JUMP!', '', '#7ef0ff'), roughness: 0.4 });
  M.ramp = std(0xffffff, { map: rampTex(), roughness: 0.35, metalness: 0.6 });
  M.ramp.map.repeat.set(1, 2);

  M.gear = std(0xffc83d, { metalness: 1, roughness: 0.18, emissive: 0x8a5200, emissiveIntensity: 0.35, envMapIntensity: 1.6 });
  M.drone = std(0xe8eefc, { metalness: 0.6, roughness: 0.2 });

  M.road = new THREE.MeshStandardMaterial({ map: roadTex(), roughness: 0.55, metalness: 0.25 });
  M.road.map.repeat.set(1, 16);
  if (art.asphaltNor) {
    // real asphalt bumps and roughness from Poly Haven under the painted markings
    M.road.normalMap = art.asphaltNor; M.road.normalScale.set(0.8, 0.8); art.asphaltNor.repeat.set(3, 110);
    if (art.asphaltRough) { M.road.roughnessMap = art.asphaltRough; M.road.roughness = 1; art.asphaltRough.repeat.set(3, 110); }
  }
  M.walk = new THREE.MeshStandardMaterial({ map: walkTex(), roughness: 0.8 });
  M.walk.map.repeat.set(2, 40);
  M.curb = std(0x8f86c8, { roughness: 0.6 });
  M.curbGlow = new THREE.MeshBasicMaterial({ color: 0x7ef0ff });

  const accents = ['#7ef0ff', '#ff5fa8', '#ffd84d', '#b08cff'];
  M.facades = [];
  for (let i = 0; i < 8; i++) M.facades.push(facadeTex(accents[i % 4], i % 2));
  // painted facades: each texture covers about 12 m by 21 m of wall
  M.aiFacades = [art.facadeOffice, art.facadeResidential].filter(Boolean).map(t => ({ tex: t, tile: [12, 21] }));
  M.neon = [0xff5fa8, 0x7ef0ff, 0xffd84d, 0x9b8cff].map(c => new THREE.MeshBasicMaterial({ color: c }));
  M.billboards = Array.from({ length: 6 }, () => new THREE.MeshBasicMaterial({ map: billboardTex() }));
  M.vsigns = [['HOTEL', '#ff5fa8'], ['ROBO', '#7ef0ff'], ['ARCADE', '#ffd84d'], ['NOODLE', '#b6ff6b'], ['VOLT', '#ff8a2b']]
    .map(([w, c]) => ({ mat: new THREE.MeshBasicMaterial({ map: verticalSignTex(w, c) }), len: w.length }));
  M.tank = std(0x6b5ca8, { roughness: 0.6, metalness: 0.3 });
  M.leaf = [0xff8fc8, 0x7be0a4, 0xffc0e0].map(c => std(c, { roughness: 0.7, flatShading: true }));
  M.trunk = std(0x5a3a2a);
  M.planter = std(0xdfe6f7, { roughness: 0.35, metalness: 0.2 });

  M.power = {
    magnet: std(0xff3b5c, { emissive: 0xff1040, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.5 }),
    boots: std(0xff8a2b, { emissive: 0xff6000, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.5 }),
    shield: std(0x4dc9ff, { emissive: 0x2090ff, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.5 }),
    double: std(0xffd84d, { emissive: 0xffb000, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.5 }),
  };
  M.powerGlow = Object.fromEntries(Object.entries({ magnet: 0xff3b5c, boots: 0xff8a2b, shield: 0x4dc9ff, double: 0xffd84d })
    .map(([k, c]) => [k, new THREE.SpriteMaterial({ map: M.glowTex, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })]));
}

/* ---------------- geometries ---------------- */
export const G = {};
export function initGeometries() {
  const parts = [];
  const disc = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 28); disc.rotateX(Math.PI / 2); parts.push(disc);
  for (let i = 0; i < 10; i++) {
    const t = new RoundedBoxGeometry(0.16, 0.17, 0.14, 1, 0.03);
    const a = (i / 10) * Math.PI * 2;
    t.rotateZ(a); t.translate(Math.cos(a) * 0.41, Math.sin(a) * 0.41, 0);
    parts.push(t);
  }
  const hub = new THREE.TorusGeometry(0.15, 0.06, 10, 24); hub.translate(0, 0, 0.07); parts.push(hub);
  const hub2 = hub.clone(); hub2.translate(0, 0, -0.14); parts.push(hub2);
  G.gear = mergeGeometries(parts.map(p => (p.index ? p.toNonIndexed() : p)));
  G.gear.computeVertexNormals();

  G.tramBody = new RoundedBoxGeometry(2.3, 2.7, TRAM_LEN, 5, 0.55);
  G.tramSide = new THREE.PlaneGeometry(TRAM_LEN - 1.4, 2.2);
  G.tramFront = new THREE.PlaneGeometry(1.75, 2.2);
  G.tramSkirt = new RoundedBoxGeometry(2.1, 0.35, TRAM_LEN - 0.6, 2, 0.12);
  G.thruster = new THREE.CylinderGeometry(0.32, 0.4, 0.3, 16);
  G.thrusterGlow = new THREE.CircleGeometry(0.3, 16);
  G.roofRail = new RoundedBoxGeometry(0.16, 0.14, TRAM_LEN - 2, 1, 0.05);
  G.roofUnit = new RoundedBoxGeometry(0.7, 0.22, 1.6, 2, 0.08);
  G.bumper = new RoundedBoxGeometry(2.0, 0.35, 0.3, 2, 0.12);
  G.glowPlane = new THREE.PlaneGeometry(3.4, TRAM_LEN + 2.5);
  G.light = new THREE.SphereGeometry(0.15, 14, 10);

  G.barrierPanel = new RoundedBoxGeometry(2.2, 0.5, 0.18, 2, 0.06);
  G.post = new THREE.CylinderGeometry(0.06, 0.07, 1, 10);
  G.foot = new RoundedBoxGeometry(0.22, 0.08, 0.7, 1, 0.03);
  G.bar = new RoundedBoxGeometry(2.35, 0.42, 0.32, 2, 0.1);
  G.sign = new THREE.PlaneGeometry(1.1, 0.55);

  G.powerCore = new THREE.IcosahedronGeometry(0.4, 2);
  G.powerRing = new THREE.TorusGeometry(0.62, 0.055, 10, 40);
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.cyl = new THREE.CylinderGeometry(0.5, 0.5, 1, 14);
  G.blob = new THREE.IcosahedronGeometry(1, 1);
}

/* ---------------- Meshy model templates ---------------- */
// When a generated model is available it replaces the procedural one. Each template is
// rotated so its long side runs down the track, then scaled to the gameplay size.
export const T = {};
export function setTemplate(name, object, size, opts = {}) {
  const root = new THREE.Group();
  const inner = object;
  inner.traverse(o => { if (o.isMesh) { o.castShadow = !!opts.shadow; o.receiveShadow = false; } });
  let box = new THREE.Box3().setFromObject(inner);
  let d = box.getSize(new THREE.Vector3());
  if (opts.longAxis === 'z' && d.x > d.z * 1.2) inner.rotation.y = Math.PI / 2;
  if (opts.longAxis === 'x' && d.z > d.x * 1.2) inner.rotation.y = Math.PI / 2;
  if (opts.flatAxis === 'z') { // thinnest side faces the player
    if (d.y < d.x && d.y < d.z) inner.rotation.x = Math.PI / 2;
    else if (d.x < d.y && d.x < d.z) inner.rotation.y = Math.PI / 2;
  }
  inner.updateMatrixWorld(true);
  box = new THREE.Box3().setFromObject(inner);
  d = box.getSize(new THREE.Vector3());
  const c = box.getCenter(new THREE.Vector3());
  const k = new THREE.Vector3(size.x / d.x, size.y / d.y, size.z / d.z);
  if (opts.uniform) { const u = Math.min(k.x, k.y, k.z); k.set(u, u, u); }
  const pivot = new THREE.Group();
  pivot.add(inner);
  inner.position.set(-c.x, -box.min.y, -c.z);
  pivot.scale.copy(k);
  root.add(pivot);
  if (opts.y) root.position.y = opts.y;
  T[name] = root;
}
const fromTemplate = name => T[name].clone(true);

/* ---------------- builders ---------------- */
export function makeTram() {
  if (T.tram) {
    const g = new THREE.Group();
    const m = fromTemplate('tram'); m.position.y = 0.45; g.add(m);
    [-TRAM_LEN / 2 + 2, TRAM_LEN / 2 - 2].forEach(z => [-0.7, 0.7].forEach(x => {
      const gl = new THREE.Mesh(G.thrusterGlow, M.thruster); gl.rotation.x = Math.PI / 2; gl.position.set(x, 0.3, z); g.add(gl);
    }));
    const glow = new THREE.Mesh(G.glowPlane, M.glow); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; g.add(glow);
    return g;
  }
  const g = new THREE.Group();
  const skin = pick(M.tramSkins);
  const by = 0.6 + 1.35;
  const body = new THREE.Mesh(G.tramBody, M.tramBody); body.position.y = by; body.castShadow = true; g.add(body);
  [-1, 1].forEach(s => {
    const side = new THREE.Mesh(G.tramSide, skin.side);
    side.position.set(s * 1.157, by - 0.05, 0); side.rotation.y = s * Math.PI / 2; g.add(side);
    const rail = new THREE.Mesh(G.roofRail, M.chrome); rail.position.set(s * 0.92, by + 1.38, 0); g.add(rail);
  });
  const front = new THREE.Mesh(G.tramFront, skin.front); front.position.set(0, by - 0.05, TRAM_LEN / 2 + 0.005); g.add(front);
  const back = new THREE.Mesh(G.tramFront, skin.front); back.position.set(0, by - 0.05, -TRAM_LEN / 2 - 0.005); back.rotation.y = Math.PI; g.add(back);
  const skirt = new THREE.Mesh(G.tramSkirt, skin.accent); skirt.position.y = 0.62; g.add(skirt);
  const bumper = new THREE.Mesh(G.bumper, M.dark); bumper.position.set(0, 0.75, TRAM_LEN / 2 - 0.05); g.add(bumper);
  [-0.62, 0.62].forEach(x => {
    const l = new THREE.Mesh(G.light, M.headlight); l.position.set(x, 0.95, TRAM_LEN / 2 + 0.06); l.scale.set(1.1, 0.8, 0.4); g.add(l);
    const r = new THREE.Mesh(G.light, M.redlight); r.position.set(x, 0.95, -TRAM_LEN / 2 - 0.06); r.scale.set(1, 0.6, 0.4); g.add(r);
  });
  // roof units at the back so runners stay clear in the middle
  [-0.65, 0.65].forEach(x => { const u = new THREE.Mesh(G.roofUnit, M.tramBody); u.position.set(x, by + 1.42, -TRAM_LEN / 2 + 1.6); g.add(u); });
  const beacon = new THREE.Mesh(G.light, M.amber); beacon.position.set(0, by + 1.42, TRAM_LEN / 2 - 1.2); beacon.scale.set(1.4, 0.7, 1.4); g.add(beacon);
  // hover thrusters
  [-TRAM_LEN / 2 + 2, TRAM_LEN / 2 - 2].forEach(z => [-0.7, 0.7].forEach(x => {
    const t = new THREE.Mesh(G.thruster, M.dark); t.position.set(x, 0.42, z); g.add(t);
    const gl = new THREE.Mesh(G.thrusterGlow, M.thruster); gl.rotation.x = Math.PI / 2; gl.position.set(x, 0.26, z); g.add(gl);
  }));
  const glow = new THREE.Mesh(G.glowPlane, M.glow); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.03; g.add(glow);
  return g;
}

export function makeBarrier() {
  if (T.barrier) { const g = fromTemplate('barrier'); g.userData.blink = []; return g; }
  const g = new THREE.Group();
  const b = new THREE.Mesh(G.barrierPanel, M.barrier); b.position.y = 0.72; b.castShadow = true; g.add(b);
  const b2 = new THREE.Mesh(G.barrierPanel, M.barrier); b2.scale.set(1, 0.5, 1); b2.position.y = 0.28; g.add(b2);
  [-0.92, 0.92].forEach(x => {
    const p = new THREE.Mesh(G.post, M.post); p.scale.y = 1.0; p.position.set(x, 0.5, 0); g.add(p);
    const f = new THREE.Mesh(G.foot, M.foot); f.position.set(x, 0.04, 0); g.add(f);
    const l = new THREE.Mesh(G.light, M.amber); l.scale.setScalar(0.7); l.position.set(x, 1.08, 0); g.add(l);
  });
  const sign = new THREE.Mesh(G.sign, M.signJump); sign.scale.setScalar(0.7); sign.position.set(0, 0.72, 0.1); g.add(sign);
  g.userData.blink = g.children.filter(c => c.material === M.amber);
  return g;
}

export function makeBar() {
  const g = new THREE.Group();
  const b = new THREE.Mesh(G.bar, M.barrier); b.position.y = 1.78; b.castShadow = true; g.add(b);
  const top = new THREE.Mesh(G.bar, M.dark); top.scale.set(1.02, 0.3, 1.1); top.position.y = 2.05; g.add(top);
  [-1.1, 1.1].forEach(x => {
    const p = new THREE.Mesh(G.post, M.post); p.scale.y = 2.15; p.position.set(x, 1.07, 0); g.add(p);
    const f = new THREE.Mesh(G.foot, M.foot); f.position.set(x, 0.04, 0); g.add(f);
    const l = new THREE.Mesh(G.light, M.redlight); l.scale.setScalar(0.6); l.position.set(x, 2.25, 0); g.add(l);
  });
  const sign = new THREE.Mesh(G.sign, M.signDuck); sign.position.set(0, 2.55, 0.05); g.add(sign);
  return g;
}

export function makeRamp() {
  const g = new THREE.Group();
  const len = Math.hypot(RAMP_LEN, TRAM_ROOF);
  const ang = Math.atan2(TRAM_ROOF, RAMP_LEN);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, len), M.ramp);
  deck.rotation.x = ang; deck.position.y = TRAM_ROOF / 2; deck.castShadow = true; deck.receiveShadow = true; g.add(deck);
  [-1.08, 1.08].forEach(x => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, len), M.curbGlow);
    rail.rotation.x = ang; rail.position.set(x, TRAM_ROOF / 2 + 0.25, 0); g.add(rail);
    // support legs
    [0.25, 0.6].forEach(t => {
      const h = TRAM_ROOF * t;
      const leg = new THREE.Mesh(G.post, M.post); leg.scale.y = h; leg.position.set(x * 0.85, h / 2, RAMP_LEN / 2 - RAMP_LEN * t); g.add(leg);
    });
  });
  return g;
}

export function makeGear() { return T.gear ? fromTemplate('gear') : new THREE.Mesh(G.gear, M.gear); }

export function makePower(kind) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(G.powerCore, M.power[kind]);
  const ring = new THREE.Mesh(G.powerRing, M.power[kind]);
  const ring2 = new THREE.Mesh(G.powerRing, M.power[kind]); ring2.scale.setScalar(0.8); ring2.rotation.y = Math.PI / 2;
  const halo = new THREE.Sprite(M.powerGlow[kind]); halo.scale.setScalar(2.6);
  g.add(halo, core, ring, ring2);
  g.userData.ring = ring; g.userData.ring2 = ring2;
  return g;
}

export function makeDrone() {
  if (T.drone) {
    const g = new THREE.Group();
    const m = fromTemplate('drone'); m.position.y = -0.5; m.rotation.y = Math.PI; g.add(m);
    const lamp = new THREE.PointLight(0xff3b5c, 2.5, 5, 2); lamp.position.set(0, -0.2, -0.7); g.add(lamp);
    g.userData.rotors = [];
    return g;
  }
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 20), M.drone); body.scale.y = 0.72; body.castShadow = true;
  const belly = new THREE.Mesh(new THREE.SphereGeometry(0.4, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.dark); belly.position.y = -0.05;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 32), new THREE.MeshBasicMaterial({ color: 0xff3b5c })); band.rotation.x = Math.PI / 2;
  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 14), M.dark); lens.position.set(0, -0.02, -0.46);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), M.redlight); eye.position.set(0, -0.02, -0.6);
  const ant = new THREE.Mesh(G.post, M.chrome); ant.scale.set(0.5, 0.5, 0.5); ant.position.set(0.2, 0.5, 0.1);
  g.add(body, belly, band, lens, eye, ant);
  const rotors = [];
  [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]].forEach(([x, z]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.8), M.dark); arm.position.set(x / 2, 0.12, z / 2); arm.lookAt(0, 0.12, 0); g.add(arm);
    const guard = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 8, 28), M.drone); guard.rotation.x = Math.PI / 2; guard.position.set(x, 0.2, z); g.add(guard);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.02, 20), new THREE.MeshBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0.45 }));
    rotor.position.set(x, 0.22, z); g.add(rotor); rotors.push(rotor);
  });
  const lamp = new THREE.PointLight(0xff3b5c, 2.5, 5, 2); lamp.position.set(0, -0.2, -0.7); g.add(lamp);
  g.userData.rotors = rotors;
  g.scale.setScalar(0.75);
  return g;
}

export function makeBuilding(side) {
  const w = rand(4.5, 8), h = rand(10, 40), d = rand(6, 11);
  const g = new THREE.Group();
  let mat;
  if (M.aiFacades.length && Math.random() < 0.75) {
    const f = pick(M.aiFacades);
    const tex = f.tex.clone(); tex.needsUpdate = true; tex.repeat.set(Math.max(1, Math.round(w / f.tile[0] * 2)) / 2, h / f.tile[1]);
    mat = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.2, roughness: 0.4, metalness: 0.1, color: 0xd8d4ec });
  } else {
    const tex = pick(M.facades).clone(); tex.needsUpdate = true; tex.repeat.set(w / 7, h / 14);
    mat = new THREE.MeshStandardMaterial({ color: 0x9a9ee0, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.55, metalness: 0.2 });
  }
  const b = new THREE.Mesh(G.box, mat); b.scale.set(w, h, d); b.position.y = h / 2; g.add(b);
  const face = -side; // the side facing the road
  // storefront band at street level
  const store = new THREE.Mesh(G.box, pick(M.neon)); store.scale.set(0.08, 0.25, d * 0.9); store.position.set(face * (w / 2 + 0.05), 3.2, 0); g.add(store);
  const awning = new THREE.Mesh(G.box, M.tank); awning.scale.set(1.2, 0.12, d * 0.85); awning.position.set(face * (w / 2 + 0.6), 3.0, 0); g.add(awning);
  // setback crown
  if (h > 22 && Math.random() < 0.7) {
    const c = new THREE.Mesh(G.box, mat); const ch = rand(3, 8); c.scale.set(w * 0.7, ch, d * 0.7); c.position.y = h + ch / 2; g.add(c);
    const ring = new THREE.Mesh(G.box, pick(M.neon)); ring.scale.set(w * 0.72, 0.18, d * 0.72); ring.position.y = h + ch; g.add(ring);
  }
  // rooftop props
  if (Math.random() < 0.5) {
    const tank = new THREE.Mesh(G.cyl, M.tank); tank.scale.set(1.6, 1.8, 1.6); tank.position.set(rand(-w / 4, w / 4), h + 0.9, rand(-d / 4, d / 4)); g.add(tank);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.9, 0.7, 14), M.tank); cap.position.copy(tank.position); cap.position.y += 1.25; g.add(cap);
  }
  if (Math.random() < 0.6) {
    const ant = new THREE.Mesh(G.post, M.post); const ah = rand(3, 7); ant.scale.y = ah; ant.position.set(rand(-w / 4, w / 4), h + ah / 2, 0); g.add(ant);
    const lt = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M.redlight); lt.position.set(ant.position.x, h + ah, 0); g.add(lt);
  }
  // billboard on the roof or a vertical neon sign on the facade
  if (Math.random() < 0.45) {
    const bb = new THREE.Mesh(new THREE.PlaneGeometry(6, 3), pick(M.billboards));
    bb.position.set(face * (w / 2 - 0.5), h + 2.6, 0); bb.rotation.y = face * Math.PI / 2 + face * -0.35; g.add(bb);
    [-1.8, 1.8].forEach(o => { const leg = new THREE.Mesh(G.post, M.post); leg.scale.y = 1.2; leg.position.set(bb.position.x, h + 0.6, o); g.add(leg); });
  } else if (Math.random() < 0.7) {
    const vs = pick(M.vsigns);
    const s = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1 * vs.len), vs.mat);
    s.position.set(face * (w / 2 + 0.9), Math.min(h - 1, 6 + 0.55 * vs.len + rand(0, 4)), rand(-d / 4, d / 4));
    s.rotation.y = face > 0 ? Math.PI / 2 : -Math.PI / 2;
    const frame = new THREE.Mesh(G.box, M.dark); frame.scale.set(0.15, 1.1 * vs.len + 0.2, 1.25); frame.position.copy(s.position); frame.position.x -= face * 0.09;
    g.add(frame, s);
  }
  g.userData.w = w;
  return g;
}

export function makeLamp(side) {
  const g = new THREE.Group();
  const pole = new THREE.Mesh(G.post, M.post); pole.scale.y = 5; pole.position.y = 2.5; g.add(pole);
  const arm = new THREE.Mesh(G.post, M.post); arm.scale.y = 1.4; arm.rotation.z = Math.PI / 2; arm.position.set(-side * 0.65, 4.95, 0); g.add(arm);
  const head = new THREE.Mesh(new RoundedBoxGeometry(0.6, 0.16, 0.36, 2, 0.06), M.dark); head.position.set(-side * 1.3, 4.9, 0); g.add(head);
  const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.26), M.neon[side > 0 ? 1 : 0]); bulb.position.set(-side * 1.3, 4.8, 0); g.add(bulb);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshBasicMaterial({ color: side > 0 ? 0x7ef0ff : 0xff5fa8, map: M.glowTex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  pool.rotation.x = -Math.PI / 2; pool.position.set(-side * 1.3, 0.04, 0); g.add(pool);
  return g;
}

export function makeTree() {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.45, 0.6, 16), M.planter); pot.position.y = 0.3; g.add(pot);
  const trunk = new THREE.Mesh(G.post, M.trunk); trunk.scale.set(1.6, 1.8, 1.6); trunk.position.y = 1.4; g.add(trunk);
  const leaf = pick(M.leaf);
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(G.blob, leaf); b.scale.setScalar(rand(0.55, 0.8)); b.position.set(rand(-0.4, 0.4), 2.5 + rand(0, 0.6), rand(-0.4, 0.4)); b.castShadow = true; g.add(b);
  }
  return g;
}

export function makeBench(side) {
  const g = new THREE.Group();
  const seat = new THREE.Mesh(new RoundedBoxGeometry(0.5, 0.1, 1.6, 1, 0.04), M.planter); seat.position.y = 0.5; g.add(seat);
  const back = new THREE.Mesh(new RoundedBoxGeometry(0.08, 0.45, 1.6, 1, 0.03), M.planter); back.position.set(side * 0.22, 0.8, 0); g.add(back);
  [-0.6, 0.6].forEach(z => { const l = new THREE.Mesh(G.box, M.post); l.scale.set(0.4, 0.5, 0.08); l.position.set(0, 0.25, z); g.add(l); });
  return g;
}
