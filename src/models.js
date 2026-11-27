// Procedural models and shared materials for Robo Runner.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const LANES = [-2.6, 0, 2.6];
export const TRAM_LEN = 14;
export const TRAM_ROOF = 3.3;
export const RAMP_LEN = 7;

const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.1, ...o });

function canvasTex(w, h, draw, repeat = false) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/* ---------- shared materials ---------- */
export const M = {};
export function initMaterials() {
  M.tramBody = std(0xf4f7ff, { roughness: 0.25, metalness: 0.35 });
  M.tramStripe = std(0x2f7dff, { roughness: 0.3, metalness: 0.4, emissive: 0x0a2a80, emissiveIntensity: 0.5 });
  M.tramStripe2 = std(0xff5fa8, { roughness: 0.3, metalness: 0.4, emissive: 0x801040, emissiveIntensity: 0.5 });
  M.window = new THREE.MeshStandardMaterial({ color: 0x0b1636, emissive: 0x7ef0ff, emissiveIntensity: 0.9, roughness: 0.1, metalness: 0.6 });
  M.glow = new THREE.MeshBasicMaterial({ color: 0x7ef0ff, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  M.headlight = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  M.redlight = new THREE.MeshBasicMaterial({ color: 0xff3b5c });
  M.dark = std(0x23284a, { roughness: 0.5, metalness: 0.6 });

  const stripes = canvasTex(128, 64, (g, w, h) => {
    g.fillStyle = '#ff6b2d'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ffffff';
    for (let x = -h; x < w + h; x += 32) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 16, h); g.lineTo(x + 16 + h, 0); g.lineTo(x + h, 0); g.fill(); }
  });
  M.barrier = std(0xffffff, { map: stripes, roughness: 0.35, emissive: 0xff4a10, emissiveIntensity: 0.15 });
  M.ramp = std(0xffffff, { map: stripes.clone(), roughness: 0.5 });
  M.ramp.map.wrapS = M.ramp.map.wrapT = THREE.RepeatWrapping; M.ramp.map.repeat.set(1, 3);
  M.post = std(0x3a3f66, { metalness: 0.7, roughness: 0.3 });

  M.gear = std(0xffc83d, { metalness: 0.9, roughness: 0.22, emissive: 0xb07000, emissiveIntensity: 0.45 });
  M.drone = std(0xe8eefc, { metalness: 0.5, roughness: 0.25 });

  // road texture: dark asphalt with glowing lane separators
  const road = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = '#1a1d3d'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.04})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    const sep = [w * 0.333, w * 0.667];
    sep.forEach(x => { g.fillStyle = '#5a7bff'; g.fillRect(x - 3, 0, 6, h * 0.55); });
    g.fillStyle = '#7ef0ff'; g.fillRect(0, 0, 8, h); g.fillRect(w - 8, 0, 8, h);
  }, true);
  road.repeat.set(1, 18);
  M.road = new THREE.MeshStandardMaterial({ map: road, roughness: 0.35, metalness: 0.4, emissiveMap: road, emissive: 0xffffff, emissiveIntensity: 0.35 });

  M.buildingTex = ['#7ef0ff', '#ff5fa8', '#ffd84d', '#b08cff'].map(c => canvasTex(128, 256, (g, w, h) => {
    g.fillStyle = '#1d2456'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 16) for (let x = 8; x < w; x += 18) {
      const r = Math.random();
      g.fillStyle = r < 0.35 ? c : r < 0.55 ? '#ffe7a8' : '#28306a';
      g.fillRect(x, y, 10, 9);
    }
  }, true));
  M.sidewalk = std(0x3b2f7a, { roughness: 0.8 });
  M.neon = [0xff5fa8, 0x7ef0ff, 0xffd84d, 0x9b8cff].map(c => new THREE.MeshBasicMaterial({ color: c }));

  M.power = {
    magnet: std(0xff3b5c, { emissive: 0xff1040, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.4 }),
    boots: std(0xff8a2b, { emissive: 0xff6000, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.4 }),
    shield: std(0x4dc9ff, { emissive: 0x2090ff, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.4 }),
    double: std(0xffd84d, { emissive: 0xffb000, emissiveIntensity: 0.8, roughness: 0.2, metalness: 0.4 }),
  };
}

/* ---------- geometries ---------- */
export const G = {};
export function initGeometries() {
  // gear: disc + teeth + hub hole look, merged into one geometry
  const parts = [];
  const disc = new THREE.CylinderGeometry(0.38, 0.38, 0.14, 24); disc.rotateX(Math.PI / 2); parts.push(disc);
  for (let i = 0; i < 8; i++) {
    const t = new THREE.BoxGeometry(0.16, 0.16, 0.14);
    const a = (i / 8) * Math.PI * 2;
    t.rotateZ(a); t.translate(Math.cos(a) * 0.43, Math.sin(a) * 0.43, 0);
    parts.push(t);
  }
  const hub = new THREE.TorusGeometry(0.16, 0.05, 8, 20); hub.translate(0, 0, 0.08); parts.push(hub);
  G.gear = mergeGeometries(parts.map(p => p.toNonIndexed()));
  G.gear.computeVertexNormals();
  G.tramBody = new RoundedBoxGeometry(2.2, 2.6, TRAM_LEN, 4, 0.5);
  G.tramStripe = new RoundedBoxGeometry(2.24, 0.3, TRAM_LEN - 0.8, 2, 0.12);
  G.tramWin = new RoundedBoxGeometry(2.26, 0.7, 1.6, 2, 0.15);
  G.tramFrontWin = new RoundedBoxGeometry(1.7, 0.9, 0.1, 2, 0.08);
  G.glow = new THREE.PlaneGeometry(2.4, TRAM_LEN + 1);
  G.light = new THREE.SphereGeometry(0.16, 12, 8);
  G.barrier = new RoundedBoxGeometry(2.2, 0.55, 0.3, 2, 0.08);
  G.post = new THREE.CylinderGeometry(0.07, 0.07, 1, 8);
  G.bar = new RoundedBoxGeometry(2.3, 0.45, 0.35, 2, 0.1);
  G.powerCore = new THREE.IcosahedronGeometry(0.42, 1);
  G.powerRing = new THREE.TorusGeometry(0.62, 0.06, 8, 32);
}

/* ---------- builders ---------- */
export function makeTram() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(G.tramBody, M.tramBody); body.position.y = 0.55 + 1.3; body.castShadow = true; body.receiveShadow = true;
  const stripe = new THREE.Mesh(G.tramStripe, Math.random() < 0.5 ? M.tramStripe : M.tramStripe2); stripe.position.y = 1.05;
  g.add(body, stripe);
  for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(G.tramWin, M.window);
    w.position.set(0, 2.25, -TRAM_LEN / 2 + 2 + i * 3.3);
    g.add(w);
  }
  const fw = new THREE.Mesh(G.tramFrontWin, M.window); fw.position.set(0, 2.35, TRAM_LEN / 2 - 0.02); g.add(fw);
  [-0.7, 0.7].forEach(x => {
    const l = new THREE.Mesh(G.light, M.headlight); l.position.set(x, 1.05, TRAM_LEN / 2 - 0.05); g.add(l);
  });
  const glow = new THREE.Mesh(G.glow, M.glow); glow.rotation.x = -Math.PI / 2; glow.position.y = 0.04; g.add(glow);
  return g;
}

export function makeBarrier() {
  // low barrier: jump over it
  const g = new THREE.Group();
  const b = new THREE.Mesh(G.barrier, M.barrier); b.position.y = 0.75; b.castShadow = true; g.add(b);
  [-0.9, 0.9].forEach(x => {
    const p = new THREE.Mesh(G.post, M.post); p.scale.y = 0.6; p.position.set(x, 0.3, 0); g.add(p);
    const l = new THREE.Mesh(G.light, M.redlight); l.scale.setScalar(0.6); l.position.set(x, 1.1, 0); g.add(l);
  });
  return g;
}

export function makeBar() {
  // overhead bar: slide under it
  const g = new THREE.Group();
  const b = new THREE.Mesh(G.bar, M.barrier); b.position.y = 1.75; b.castShadow = true; g.add(b);
  [-1.05, 1.05].forEach(x => {
    const p = new THREE.Mesh(G.post, M.post); p.scale.y = 2.0; p.position.set(x, 1.0, 0); g.add(p);
  });
  return g;
}

export function makeRamp() {
  const g = new THREE.Group();
  const len = Math.hypot(RAMP_LEN, TRAM_ROOF);
  const geo = new THREE.BoxGeometry(2.2, 0.2, len);
  const r = new THREE.Mesh(geo, M.ramp);
  r.rotation.x = Math.atan2(TRAM_ROOF, RAMP_LEN);
  r.position.y = TRAM_ROOF / 2;
  r.castShadow = true; r.receiveShadow = true;
  g.add(r);
  return g;
}

export function makeGear() {
  const m = new THREE.Mesh(G.gear, M.gear);
  m.castShadow = false;
  return m;
}

export function makePower(kind) {
  const g = new THREE.Group();
  const core = new THREE.Mesh(G.powerCore, M.power[kind]);
  const ring = new THREE.Mesh(G.powerRing, M.power[kind]);
  g.add(core, ring);
  g.userData.ring = ring;
  return g;
}

export function makeDrone() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), M.drone); body.scale.y = 0.75; body.castShadow = true;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), M.redlight); eye.position.set(0, 0, -0.48);
  g.add(body, eye);
  const rotors = [];
  [[-0.7, -0.7], [0.7, -0.7], [-0.7, 0.7], [0.7, 0.7]].forEach(([x, z]) => {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.7), M.dark); arm.position.set(x / 2, 0.15, z / 2); arm.lookAt(0, 0.15, 0); g.add(arm);
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.03, 16), new THREE.MeshBasicMaterial({ color: 0xbff8ff, transparent: true, opacity: 0.5 }));
    rotor.position.set(x, 0.25, z); g.add(rotor); rotors.push(rotor);
  });
  const lamp = new THREE.PointLight(0xff3b5c, 2.5, 5, 2); lamp.position.set(0, -0.2, -0.6); g.add(lamp);
  g.userData.rotors = rotors;
  g.scale.setScalar(0.75);
  return g;
}

export function makeBuilding(side) {
  const w = 4 + Math.random() * 4, h = 8 + Math.random() * 30, d = 5 + Math.random() * 6;
  const tex = M.buildingTex[(Math.random() * M.buildingTex.length) | 0].clone();
  tex.needsUpdate = true; tex.repeat.set(w / 6, h / 10);
  const mat = new THREE.MeshStandardMaterial({ color: 0x8a90d0, map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.85, roughness: 0.7 });
  const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  b.position.y = h / 2;
  const g = new THREE.Group(); g.add(b);
  if (Math.random() < 0.6) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.25, Math.min(6, h * 0.4), 1.2), M.neon[(Math.random() * 4) | 0]);
    sign.position.set(-side * (w / 2 + 0.2), h * 0.55, 0); g.add(sign);
  }
  if (Math.random() < 0.5) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.3, d * 0.9), M.neon[(Math.random() * 4) | 0]);
    roof.position.y = h + 0.15; g.add(roof);
  }
  g.userData.w = w;
  return g;
}
