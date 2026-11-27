// Particle effects: sparkles, dust puffs, speed lines and floating motes.
import * as THREE from 'three';
import { M } from './models.js';

export function createEffects(scene) {
  /* sparkles and dust share one sprite pool */
  const pool = [];
  for (let i = 0; i < 90; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: M.glowTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.visible = false; s.userData = { v: new THREE.Vector3(), life: 0, max: 1, size: 1, grow: 0, grav: 0 };
    scene.add(s); pool.push(s);
  }
  let next = 0;
  function emit(pos, { n = 10, color = 0xffd84d, speed = 4, life = 0.5, size = 0.35, grow = 0, grav = -6, up = 2, additive = true }) {
    for (let i = 0; i < n; i++) {
      const s = pool[next]; next = (next + 1) % pool.length;
      const u = s.userData;
      s.visible = true; s.position.copy(pos);
      s.material.color.set(color);
      s.material.blending = additive ? THREE.AdditiveBlending : THREE.NormalBlending;
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2;
      u.v.set(Math.cos(a) * Math.cos(e) * speed, Math.abs(Math.sin(e)) * speed * 0.6 + up, Math.sin(a) * Math.cos(e) * speed);
      u.life = u.max = life * (0.7 + Math.random() * 0.6); u.size = size * (0.7 + Math.random() * 0.6); u.grow = grow; u.grav = grav;
    }
  }

  /* speed lines streaming past the camera */
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const lineGeo = new THREE.PlaneGeometry(0.03, 3.5); lineGeo.rotateX(-Math.PI / 2);
  const lines = [];
  for (let i = 0; i < 36; i++) {
    const l = new THREE.Mesh(lineGeo, lineMat);
    const a = Math.random() * Math.PI * 2, r = 3 + Math.random() * 4;
    l.userData = { ox: Math.cos(a) * r, oy: Math.sin(a) * r * 0.7 + 2.5, oz: -Math.random() * 40 };
    l.rotation.z = a; scene.add(l); lines.push(l);
  }

  /* floating glowing motes give the air depth */
  const N = 260;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { pos[i * 3] = (Math.random() - 0.5) * 40; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = -Math.random() * 120; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.18, map: M.glowTex, color: 0xffc8f0, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }));
  motes.frustumCulled = false;
  scene.add(motes);

  function update(dt, playerPos, speed, running) {
    for (const s of pool) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      u.v.y += u.grav * dt;
      s.position.addScaledVector(u.v, dt);
      const k = u.life / u.max;
      s.material.opacity = k;
      s.scale.setScalar(u.size * (1 + u.grow * (1 - k)));
    }
    const fast = running ? Math.max(0, (speed - 17) / 15) : 0;
    lineMat.opacity = fast * 0.35;
    for (const l of lines) {
      const u = l.userData;
      u.oz += speed * 1.6 * dt;
      if (u.oz > 6) u.oz -= 46;
      l.position.set(playerPos.x * 0.6 + u.ox, u.oy, playerPos.z + u.oz);
      l.visible = fast > 0.02;
    }
    // motes stay in a box around the player
    const p = pg.attributes.position.array;
    for (let i = 0; i < N; i++) {
      let z = p[i * 3 + 2];
      if (z > playerPos.z + 10) z -= 130;
      if (z < playerPos.z - 120) z += 130;
      p[i * 3 + 2] = z;
      p[i * 3 + 1] += Math.sin((i + z) * 0.3) * dt * 0.2;
    }
    pg.attributes.position.needsUpdate = true;
  }

  return {
    update,
    sparkle: (p, color = 0xffd84d) => emit(p, { n: 7, color, speed: 3, life: 0.35, size: 0.5, grav: 0, up: 0.5 }),
    burst: (p, color) => emit(p, { n: 26, color, speed: 7, life: 0.7, size: 0.7, grav: -4, up: 2 }),
    dust: p => emit(p, { n: 10, color: 0xd8c8ff, speed: 2.5, life: 0.5, size: 0.6, grow: 2, grav: 1, up: 0.3, additive: false }),
    crash: p => emit(p, { n: 34, color: 0xff8a2b, speed: 9, life: 0.8, size: 0.9, grav: -8, up: 4 }),
  };
}
