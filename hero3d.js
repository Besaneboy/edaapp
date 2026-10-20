// 3D-сцена приветствия онбординга: мама обнимает малыша, малыш грызёт брокколи, вокруг летают продукты.
// Загружается лениво только на первом шаге опроса. Без WebGL остаётся SVG-картинка.
import * as THREE from "./vendor/three.module.min.js";

const C = {
  skin: 0xf6cfaf, skinBaby: 0xf8d4b6, blush: 0xf2a39a,
  sweater: 0xe9a9a0, sweaterDark: 0xdb948a, hair: 0x5e3b29, hairBaby: 0xb07a52,
  romper: 0xa9c4de, white: 0xffffff, eye: 0x2b2024, mouth: 0x9a4e5c,
  ground: 0xdfe8d2, leaf: 0x6fa255, leafLight: 0x8dbb6e, carrot: 0xf08c3c,
  apple: 0xe4574a, strawberry: 0xe34b4b, seed: 0xf6d36b, stem: 0x7a5636,
  bowl: 0xfdfbf6, puree: 0xf3c25f, spoon: 0x77896a, heart: 0xf28f96, pea: 0xa8d38a
};

const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o });
function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
const sphere = (r, seg = 32) => new THREE.SphereGeometry(r, seg, Math.round(seg * 0.75));
const capsule = (r, len) => new THREE.CapsuleGeometry(r, len, 10, 24);

// дуга-«улыбка» или закрытый глаз
function arc(r, tube, color, flip = false) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, 24, Math.PI), mat(color, { roughness: 0.4 }));
  m.rotation.z = flip ? 0 : Math.PI;
  return m;
}
// толстая «рука» по кривой
function limb(points, r, color) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, r, 16, false), mat(color));
  m.castShadow = true;
  const capA = mesh(sphere(r, 20), m.material, ...points[0]);
  const g = new THREE.Group(); g.add(m, capA);
  return g;
}

function buildMom() {
  const g = new THREE.Group();
  // туловище — свитер, выточенный по профилю
  const prof = [[0, 0], [1.05, 0], [1.02, 0.4], [0.9, 1.2], [0.78, 1.8], [0.62, 2.1], [0.3, 2.25], [0, 2.27]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const body = mesh(new THREE.LatheGeometry(prof, 48), mat(C.sweater));
  body.scale.z = 0.75;
  g.add(body);
  g.add(mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.3, 24), mat(C.skin), 0, 2.32, 0));

  // голова, чуть наклонена к малышу
  const head = new THREE.Group();
  head.position.set(0.05, 2.85, 0.05);
  head.rotation.set(0.12, 0.35, -0.28);
  head.add(mesh(sphere(0.56, 48), mat(C.skin)));
  const hairCap = mesh(new THREE.SphereGeometry(0.6, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.52), mat(C.hair, { roughness: 0.8 }));
  hairCap.rotation.x = -0.55; hairCap.position.set(0, 0.04, -0.06);
  head.add(hairCap);
  head.add(mesh(sphere(0.27), mat(C.hair, { roughness: 0.8 }), 0, 0.5, -0.42));
  const eyeL = arc(0.075, 0.022, C.eye); eyeL.position.set(-0.19, 0.04, 0.52); head.add(eyeL);
  const eyeR = arc(0.075, 0.022, C.eye); eyeR.position.set(0.19, 0.04, 0.52); head.add(eyeR);
  const smile = arc(0.12, 0.025, C.mouth); smile.position.set(0, -0.2, 0.53); head.add(smile);
  [-0.3, 0.3].forEach(x => { const c = mesh(sphere(0.1), mat(C.blush, { roughness: 0.9 }), x, -0.1, 0.46); c.scale.set(1, 0.7, 0.4); head.add(c); });
  g.add(head);
  return { g, head };
}

function buildBroccoli() {
  const g = new THREE.Group();
  g.add(mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.3, 14), mat(0x9bc47a), 0, -0.12, 0));
  [[0, 0.08, 0, 0.13], [-0.1, 0.03, 0.03, 0.1], [0.1, 0.04, 0.02, 0.1], [0.02, 0.05, 0.1, 0.1], [0, 0.04, -0.08, 0.1]]
    .forEach(([x, y, z, r], i) => g.add(mesh(sphere(r, 20), mat(i ? C.leaf : C.leafLight, { roughness: 0.85 }), x, y, z)));
  return g;
}

function buildBaby() {
  const g = new THREE.Group();
  const body = mesh(capsule(0.34, 0.42), mat(C.romper));
  g.add(body);
  [0.12, -0.08].forEach(y => g.add(mesh(sphere(0.035, 12), mat(C.white), 0, y, 0.34)));

  // ножки
  const legs = [];
  [-0.15, 0.15].forEach((x, i) => {
    const pivot = new THREE.Group(); pivot.position.set(x, -0.42, 0.08);
    pivot.add(mesh(capsule(0.11, 0.28), mat(C.skinBaby), 0, -0.2, 0));
    pivot.add(mesh(sphere(0.13), mat(C.skinBaby), 0, -0.42, 0.06));
    g.add(pivot); legs.push(pivot);
  });

  // голова
  const head = new THREE.Group(); head.position.set(0, 0.72, 0.05);
  head.add(mesh(sphere(0.44, 48), mat(C.skinBaby)));
  [-0.43, 0.43].forEach(x => head.add(mesh(sphere(0.09), mat(C.skinBaby), x, 0, -0.02)));
  const curl = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.03, 10, 24, Math.PI * 1.4), mat(C.hairBaby));
  curl.position.set(0.02, 0.46, 0.05); curl.rotation.set(0, 0.3, 0.6); head.add(curl);
  const fringe = mesh(new THREE.SphereGeometry(0.45, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.28), mat(C.hairBaby, { roughness: 0.85 }));
  fringe.rotation.x = -0.25; head.add(fringe);
  [-0.15, 0.15].forEach(x => {
    head.add(mesh(sphere(0.055, 16), mat(C.eye, { roughness: 0.25 }), x, 0.06, 0.4));
    head.add(mesh(sphere(0.018, 8), mat(C.white, { emissive: 0xffffff, emissiveIntensity: 0.6 }), x + 0.018, 0.085, 0.45));
    const c = mesh(sphere(0.085), mat(C.blush, { roughness: 0.9 }), x * 1.75, -0.08, 0.36); c.scale.set(1, 0.7, 0.4); head.add(c);
  });
  const mouth = mesh(sphere(0.06, 20), mat(C.mouth, { roughness: 0.4 }), 0, -0.15, 0.41);
  mouth.scale.set(1.1, 0.4, 0.5); head.add(mouth);
  g.add(head);

  // ручка с брокколи
  const arm = new THREE.Group(); arm.position.set(0.3, 0.2, 0.28);
  arm.add(mesh(capsule(0.09, 0.28), mat(C.skinBaby), 0, 0.18, 0.08));
  const hand = mesh(sphere(0.11), mat(C.skinBaby), 0, 0.38, 0.16); arm.add(hand);
  const broc = buildBroccoli(); broc.position.set(-0.04, 0.55, 0.2); broc.rotation.z = 0.5; broc.scale.setScalar(1.15); arm.add(broc);
  g.add(arm);
  return { g, head, mouth, arm, legs };
}

function heartShape() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.3);
  s.bezierCurveTo(-0.5, 0.05, -0.32, 0.42, 0, 0.2);
  s.bezierCurveTo(0.32, 0.42, 0.5, 0.05, 0, -0.3);
  return s;
}

function buildFoods() {
  const items = [];
  // морковь
  const carrot = new THREE.Group();
  const cone = mesh(new THREE.ConeGeometry(0.17, 0.75, 24), mat(C.carrot)); cone.rotation.z = Math.PI; carrot.add(cone);
  [-0.35, 0, 0.35].forEach(a => { const l = mesh(capsule(0.04, 0.22), mat(C.leaf)); l.position.set(Math.sin(a) * 0.08, 0.5, 0); l.rotation.z = a; carrot.add(l); });
  items.push({ obj: carrot, x: -2.0, y: 3.5, z: 0, spin: 0.6, tilt: 0.5 });
  // яблоко
  const apple = new THREE.Group();
  const ab = mesh(sphere(0.3, 40), mat(C.apple, { roughness: 0.35 })); ab.scale.set(1.05, 0.92, 1.05); apple.add(ab);
  apple.add(mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.18, 10), mat(C.stem), 0, 0.33, 0));
  const leaf = mesh(sphere(0.09), mat(C.leaf)); leaf.scale.set(1.6, 0.35, 0.8); leaf.position.set(0.12, 0.36, 0); leaf.rotation.z = 0.4; apple.add(leaf);
  items.push({ obj: apple, x: 1.95, y: 3.55, z: -0.2, spin: 0.4, tilt: 0.2 });
  // клубника
  const straw = new THREE.Group();
  const sp = [[0, -0.32], [0.12, -0.22], [0.24, 0.02], [0.25, 0.16], [0.16, 0.24], [0, 0.26]].map(([x, y]) => new THREE.Vector2(x, y));
  straw.add(mesh(new THREE.LatheGeometry(sp, 32), mat(C.strawberry, { roughness: 0.4 })));
  for (let i = 0; i < 14; i++) { const a = i * 2.4, h = -0.18 + (i % 5) * 0.08, rr = 0.2 - Math.abs(h) * 0.3; straw.add(mesh(sphere(0.018, 8), mat(C.seed), Math.cos(a) * rr, h, Math.sin(a) * rr)); }
  for (let i = 0; i < 5; i++) { const l = mesh(new THREE.ConeGeometry(0.05, 0.16, 8), mat(C.leaf)); const a = i / 5 * Math.PI * 2; l.position.set(Math.cos(a) * 0.1, 0.27, Math.sin(a) * 0.1); l.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); straw.add(l); }
  items.push({ obj: straw, x: 2.15, y: 2.0, z: 0.4, spin: 0.7, tilt: 0.3 });
  // стручок горошка
  const pod = new THREE.Group();
  const shell = mesh(capsule(0.13, 0.6), mat(0x86b867)); shell.rotation.z = Math.PI / 2; shell.scale.set(1, 1, 0.7); pod.add(shell);
  [-0.22, 0, 0.22].forEach(x => pod.add(mesh(sphere(0.1), mat(C.pea, { roughness: 0.5 }), x, 0.04, 0.06)));
  items.push({ obj: pod, x: -1.1, y: 4.15, z: -0.6, spin: 0.5, tilt: 0.6 });
  // тарелочка с пюре и ложкой
  const bowl = new THREE.Group();
  const bp = [[0, -0.14], [0.2, -0.14], [0.32, -0.04], [0.36, 0.12], [0.33, 0.12], [0.29, -0.01], [0.18, -0.1], [0, -0.1]].map(([x, y]) => new THREE.Vector2(x, y));
  bowl.add(mesh(new THREE.LatheGeometry(bp, 40), mat(C.bowl, { roughness: 0.3, side: THREE.DoubleSide })));
  bowl.add(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 32), mat(C.puree, { roughness: 0.5 }), 0, 0.07, 0));
  const spoon = new THREE.Group();
  spoon.add(mesh(capsule(0.02, 0.45), mat(C.spoon)));
  const head = mesh(sphere(0.07), mat(C.spoon)); head.scale.set(1, 0.4, 1.4); head.position.y = -0.27; spoon.add(head);
  spoon.position.set(0.18, 0.25, 0); spoon.rotation.z = -0.6; bowl.add(spoon);
  items.push({ obj: bowl, x: -2.15, y: 1.9, z: 0.4, spin: 0.3, tilt: 0.25 });
  return items;
}

export function mount(canvas, { still = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const target = new THREE.Vector3(0, 1.95, 0);

  scene.add(new THREE.HemisphereLight(0xfff6ee, 0xb9c9a8, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1e0, 1.7);
  sun.position.set(2.5, 7, 7); sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.radius = 6; sun.shadow.bias = -0.0005;
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 5, bottom: -2, near: 1, far: 20 });
  scene.add(sun);
  const rim = new THREE.DirectionalLight(0xdfe9ff, 0.8); rim.position.set(-4, 4, -3); scene.add(rim);

  // площадка
  const ground = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 0.16, 64), mat(C.ground, { roughness: 0.9 }));
  ground.position.y = -0.08; ground.receiveShadow = true; scene.add(ground);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(1.9, 0.05, 10, 96), mat(0xd3dec6));
  rimRing.rotation.x = Math.PI / 2; scene.add(rimRing);

  // мама с малышом
  const family = new THREE.Group(); scene.add(family);
  const mom = buildMom(); mom.g.position.set(-0.25, 0, -0.1); family.add(mom.g);
  const baby = buildBaby(); baby.g.position.set(0.32, 1.72, 0.62); baby.g.rotation.y = -0.25; family.add(baby.g);
  // руки мамы обнимают малыша
  family.add(limb([[-0.85, 2.0, 0.1], [-0.75, 1.45, 0.65], [-0.1, 1.2, 1.05], [0.55, 1.35, 0.95]], 0.15, C.sweaterDark));
  family.add(mesh(sphere(0.15), mat(C.skin), 0.62, 1.4, 0.9));
  family.add(limb([[0.35, 2.05, 0.15], [0.8, 1.9, 0.45], [0.8, 1.75, 0.75]], 0.14, C.sweaterDark));
  family.add(mesh(sphere(0.14), mat(C.skin), 0.74, 1.72, 0.86));

  const foods = buildFoods(); foods.forEach(f => scene.add(f.obj));

  // сердечки
  const hGeo = new THREE.ExtrudeGeometry(heartShape(), { depth: 0.08, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 4, curveSegments: 16 });
  hGeo.center();
  const hearts = [0, 1, 2].map(i => {
    const m = new THREE.Mesh(hGeo, mat(C.heart, { transparent: true, roughness: 0.35 }));
    m.scale.setScalar(0.45); scene.add(m);
    return { m, off: i / 3 };
  });

  let w = 0, h = 0;
  function resize() {
    const r = canvas.getBoundingClientRect();
    if (!r.width || (r.width === w && r.height === h)) return;
    w = r.width; h = r.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }

  // лёгкий параллакс от пальца
  let px = 0, py = 0;
  const onMove = e => { const r = canvas.getBoundingClientRect(); px = ((e.clientX - r.left) / r.width - 0.5); py = ((e.clientY - r.top) / r.height - 0.5); };
  canvas.addEventListener("pointermove", onMove);

  function frame(t) {
    resize();
    const s = t / 1000;
    // камера медленно плавает
    const ca = Math.sin(s * 0.35) * 0.22 + px * 0.4;
    camera.position.set(Math.sin(ca) * 9.4, 3.6 + Math.sin(s * 0.5) * 0.12 - py * 0.6, Math.cos(ca) * 9.4);
    camera.lookAt(target);

    // покачивание и дыхание
    family.rotation.z = Math.sin(s * 1.4) * 0.025;
    family.rotation.y = Math.sin(s * 0.7) * 0.06;
    mom.g.scale.y = 1 + Math.sin(s * 2.2) * 0.008;
    mom.head.rotation.z = -0.28 + Math.sin(s * 1.4 + 0.6) * 0.04;

    // малыш: брокколи ко рту и жевание
    const cyc = (s % 1.8) / 1.8;
    const lift = cyc < 0.3 ? Math.sin(cyc / 0.3 * Math.PI / 2) : Math.cos((cyc - 0.3) / 0.7 * Math.PI / 2);
    baby.arm.rotation.z = 0.15 + lift * 0.95;
    baby.arm.rotation.x = -lift * 0.35;
    baby.mouth.scale.y = 0.3 + (cyc > 0.22 && cyc < 0.4 ? 0.9 : Math.abs(Math.sin(s * 9)) * 0.35);
    baby.head.rotation.z = Math.sin(s * 2) * 0.05;
    baby.legs.forEach((l, i) => { l.rotation.x = Math.sin(s * 4 + i * Math.PI) * 0.35; });

    // продукты летают вокруг
    foods.forEach((f, i) => {
      f.obj.position.set(f.x + Math.sin(s * 0.6 + i * 2) * 0.08, f.y + Math.sin(s * 1.3 + i * 1.7) * 0.16, f.z);
      f.obj.rotation.set(Math.sin(s * 0.8 + i) * f.tilt, s * f.spin, Math.cos(s * 0.7 + i) * f.tilt * 0.6);
    });

    // сердечки поднимаются и тают
    hearts.forEach(hh => {
      const k = ((s / 3.2) + hh.off) % 1;
      hh.m.position.set(0.95 + Math.sin(k * 6 + hh.off * 9) * 0.22, 3.2 + k * 1.3, 0.9);
      hh.m.rotation.y = Math.sin(s * 2 + hh.off * 6) * 0.5;
      hh.m.material.opacity = k < 0.2 ? k / 0.2 : 1 - (k - 0.2) / 0.8;
      hh.m.scale.setScalar(0.3 + k * 0.25);
    });

    renderer.render(scene, camera);
  }

  let raf = 0, running = false;
  const loop = t => { frame(t); raf = requestAnimationFrame(loop); };
  const api = {
    start() { if (running) return; running = true; if (still) frame(2600); else raf = requestAnimationFrame(loop); },
    stop() { running = false; cancelAnimationFrame(raf); },
    dispose() {
      api.stop(); canvas.removeEventListener("pointermove", onMove);
      scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      renderer.dispose();
    }
  };
  api.start();
  return api;
}
