/*
 * Centro Deportivo — site around the new building (prototype).
 * Built from emplazamiento.json, measured on sheet 02 (PDF page 74, aerial
 * view at 1:200) and registered on the building roof:
 *   documented: tennis and padel court centres / orientation, platform,
 *               lawns, planted strip, pool + deck, plaza, gravel band
 *   standard:   ITF tennis (23,77 × 10,97 m) and padel (20 × 10 m) geometry,
 *               fences, net heights, glass and mesh enclosures
 *   concept:    plant species and positions (inside the documented green
 *               areas), benches, bollards, floodlight masts
 * Vegetation and fence posts are instanced.
 */
import * as THREE from "three";

export function buildEnvironment({ K, MAT, TEX, renderer, data, mesh, lowPower }) {
  const env = new THREE.Group();
  env.name = "EMPLAZAMIENTO";
  const kit = K.createModelKit();
  const rnd = seeded(42);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const T = makeTextures(maxAniso);

  const flat = (poly, y, mat) => {
    const g = new THREE.ShapeGeometry(new THREE.Shape(poly.map(([x, z]) => new THREE.Vector2(x, -z))));
    g.rotateX(-Math.PI / 2);
    const m = mesh(g, mat, { cast: false });
    m.position.y = y;
    env.add(m);
    return m;
  };
  const surface = (tex, color, rough, rep) => { const m = new THREE.MeshStandardMaterial({ color, roughness: rough }); if (tex) { m.map = tex.clone(); m.map.needsUpdate = true; m.map.repeat.set(rep, rep); } m.envMapIntensity = 0.4; return m; };

  // ---------- documented surfaces (sheet 02) ----------
  const MATS = {
    gravel: surface(T.gravel, 0xffffff, 1, 0.45),
    garden: surface(T.grass, 0xd9e0c8, 0.95, 0.35),
    plantedStrip: surface(T.grass, 0xb9c7a8, 0.95, 0.35),
    hedge: surface(T.grass, 0xc9d4b4, 0.95, 0.35),
    courtGreen: surface(T.acrylic, 0x5d9a6c, 0.7, 0.3),
    platformBlue: surface(T.acrylic, 0x3f7fc0, 0.7, 0.3),
    deck: surface(T.acrylic, 0xc96b5f, 0.8, 0.3),
    plaza: surface(TEX.tile, 0xd9d2c4, 0.85, 0.5),
  };
  const ORDER = { gravel: -0.142, plaza: -0.14, garden: -0.138, plantedStrip: -0.136, hedge: -0.136, courtGreen: -0.134, platformBlue: -0.13, deck: -0.128 };
  data.surfaces.forEach((s) => { if (s.kind !== "pool") flat(s.poly, ORDER[s.kind] ?? -0.135, MATS[s.kind] || MATS.plaza); });
  // pool: water inside a stone coping
  data.surfaces.filter((s) => s.kind === "pool").forEach((s) => {
    const cx = s.poly.reduce((a, p) => a + p[0], 0) / s.poly.length, cz = s.poly.reduce((a, p) => a + p[1], 0) / s.poly.length;
    const inset = s.poly.map(([x, z]) => [cx + (x - cx) * 0.92, cz + (z - cz) * 0.95]);
    flat(s.poly, -0.124, surface(null, 0xe9e4da, 0.6));
    const w = flat(inset, -0.118, new THREE.MeshStandardMaterial({ color: 0x4fb3d6, roughness: 0.05, metalness: 0.1, emissive: 0x0c4a66, emissiveIntensity: 0.35 }));
    w.material.envMapIntensity = 1.2;
  });

  // ---------- shared materials ----------
  const courtTex = courtTexture(maxAniso);
  const courtMat = new THREE.MeshStandardMaterial({ map: courtTex, roughness: 0.75 }); courtMat.envMapIntensity = 0.3;
  const fenceMat = new THREE.MeshStandardMaterial({ map: T.chain, alphaTest: 0.45, side: THREE.DoubleSide, color: 0x2f3d33, roughness: 0.6, metalness: 0.3 });
  const steelGreen = new THREE.MeshStandardMaterial({ color: 0x2c3a31, roughness: 0.45, metalness: 0.5 });
  const steelBlack = new THREE.MeshStandardMaterial({ color: 0x1f2124, roughness: 0.45, metalness: 0.5 });
  const netMat = new THREE.MeshStandardMaterial({ map: T.net, alphaTest: 0.4, side: THREE.DoubleSide, color: 0x1b1b1b, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xcfe3ea, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }); glassMat.envMapIntensity = 1.3;
  const white = MAT.shared("white");
  const lampHead = new THREE.MeshStandardMaterial({ color: 0x2b2e31, roughness: 0.4, metalness: 0.6 });
  const lampLens = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xf4f6ff, emissiveIntensity: 1.6 });
  const meshPanel = (len, h, color = 0x2f3d33, cell = 0.6) => { const fm = fenceMat.clone(); fm.map = fenceMat.map.clone(); fm.map.needsUpdate = true; fm.map.repeat.set(len / cell, h / cell); fm.color.setHex(color); return new THREE.Mesh(new THREE.PlaneGeometry(len, h), fm); };
  const posts = [];
  const placeGroup = (g, c, rotDeg) => { g.position.set(c[0], -0.125, c[1]); g.rotation.y = -THREE.MathUtils.degToRad(rotDeg); env.add(g); g.updateMatrixWorld(true); };
  const mast = (g, x, z) => {
    const pole = mesh(new THREE.CylinderGeometry(0.07, 0.11, 8, 10), steelGreen); pole.position.set(x, 4, z); g.add(pole);
    const head = mesh(new THREE.BoxGeometry(0.9, 0.12, 0.5), lampHead); head.position.set(x, 8.05, z - Math.sign(z) * 0.25); head.rotation.x = Math.sign(z) * 0.45; g.add(head);
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.02, 0.4), lampLens); lens.position.set(x, 7.98, z - Math.sign(z) * 0.28); lens.rotation.x = Math.sign(z) * 0.45; g.add(lens);
  };
  const fence = (g, FW, FD, H, gate) => {
    const sides = [["n", [-FW / 2, -FD / 2], [FW / 2, -FD / 2]], ["s", [-FW / 2, FD / 2], [FW / 2, FD / 2]], ["w", [-FW / 2, -FD / 2], [-FW / 2, FD / 2]], ["e", [FW / 2, -FD / 2], [FW / 2, FD / 2]]];
    sides.forEach(([side, a, b]) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]), horiz = a[1] === b[1];
      const segs = side === gate ? [[0, len / 2 - 0.65], [len / 2 + 0.65, len]] : [[0, len]];
      segs.forEach(([t0, t1]) => {
        const L = t1 - t0, mid = t0 + L / 2;
        const pl = meshPanel(L, H);
        pl.position.set(horiz ? a[0] + mid : a[0], H / 2, horiz ? a[1] : a[1] + mid);
        if (!horiz) pl.rotation.y = Math.PI / 2;
        g.add(pl);
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, L, 8).rotateZ(Math.PI / 2), steelGreen);
        rail.position.copy(pl.position).setY(H); if (!horiz) rail.rotation.y = Math.PI / 2;
        g.add(rail);
      });
      const n = Math.round(len / 3);
      for (let i = 0; i <= n; i++) { const t = (len * i) / n; posts.push(new THREE.Vector3(horiz ? a[0] + t : a[0], 0, horiz ? a[1] : a[1] + t).applyMatrix4(g.matrixWorld)); }
      if (side === gate) {
        const gx = horiz ? a[0] + len / 2 : a[0], gz = horiz ? a[1] : a[1] + len / 2;
        const head = mesh(new THREE.BoxGeometry(horiz ? 1.4 : 0.06, 0.06, horiz ? 0.06 : 1.4), steelGreen); head.position.set(gx, 2.3, gz); g.add(head);
        const leaf = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), fenceMat);
        leaf.position.set(gx + (horiz ? -0.6 : 0.42), 1.12, gz + (horiz ? 0.42 : -0.6)); leaf.rotation.y = horiz ? Math.PI / 2 - 0.9 : -0.9; g.add(leaf);
      }
    });
  };
  const gateTowardsBuilding = (g, c) => {
    const v = new THREE.Vector3(10, 0, 9).sub(new THREE.Vector3(c.center[0], 0, c.center[1])).applyQuaternion(g.quaternion.clone().invert());
    return Math.abs(v.x) > Math.abs(v.z) ? (v.x > 0 ? "e" : "w") : (v.z > 0 ? "s" : "n");
  };

  // ---------- tennis courts: documented centre / orientation, ITF dimensions ----------
  data.tennis.forEach((c) => {
    const g = new THREE.Group();
    placeGroup(g, c.center, 90 + (c.axisDeg || 0));     // local x = long axis = plan north-south
    const FW = 36.6, FD = 18.0, H = 3.0;
    const s = new THREE.Mesh(new THREE.BoxGeometry(FW, 0.03, FD), courtMat); s.position.y = 0.015; s.receiveShadow = renderer.shadowMap.enabled; g.add(s);
    const half = 10.97 / 2 + 0.914;
    [-half, half].forEach((z) => { const p = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.07, 12), steelGreen); p.position.set(0, 0.03 + 0.535, z); g.add(p); });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(2 * half, 0.95), netMat); net.rotation.y = Math.PI / 2; net.position.set(0, 0.03 + 0.5, 0); g.add(net);
    const band = mesh(new THREE.BoxGeometry(0.02, 0.06, 2 * half), white, { cast: false }); band.position.set(0, 0.03 + 0.99, 0); g.add(band);
    fence(g, FW, FD, H, gateTowardsBuilding(g, c));
    [[-FW / 4, -FD / 2 - 0.4], [FW / 4, -FD / 2 - 0.4], [-FW / 4, FD / 2 + 0.4], [FW / 4, FD / 2 + 0.4]].forEach(([x, z]) => mast(g, x, z));
  });

  // ---------- padel courts: 20 × 10 m, glass back walls and returns, mesh sides ----------
  const padelMat = new THREE.MeshStandardMaterial({ map: padelTexture(maxAniso), roughness: 0.9 });
  data.padel.forEach((c) => {
    const g = new THREE.Group();
    placeGroup(g, c.center, 90 + (c.axisDeg || 0));
    const L = 20, Wd = 10;
    const s = new THREE.Mesh(new THREE.BoxGeometry(L, 0.03, Wd), padelMat); s.position.y = 0.015; s.receiveShadow = renderer.shadowMap.enabled; g.add(s);
    [-Wd / 2 - 0.02, Wd / 2 + 0.02].forEach((z) => { const p = mesh(new THREE.BoxGeometry(0.08, 0.95, 0.08), steelBlack); p.position.set(0, 0.5, z); g.add(p); });
    const net = new THREE.Mesh(new THREE.PlaneGeometry(Wd, 0.88), netMat); net.rotation.y = Math.PI / 2; net.position.set(0, 0.47, 0); g.add(net);
    const band = mesh(new THREE.BoxGeometry(0.02, 0.05, Wd), white, { cast: false }); band.position.set(0, 0.9, 0); g.add(band);
    [-1, 1].forEach((e) => {
      const x = e * L / 2;
      const gl = new THREE.Mesh(new THREE.PlaneGeometry(Wd, 3.0), glassMat); gl.rotation.y = Math.PI / 2; gl.position.set(x, 1.53, 0); gl.renderOrder = 3; g.add(gl);
      const top = meshPanel(Wd, 1.0, 0x111111, 0.5); top.rotation.y = Math.PI / 2; top.position.set(x, 3.53, 0); g.add(top);
      [-Wd / 2, Wd / 2].forEach((z) => {
        const r1 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 3.0), glassMat); r1.position.set(x - e * 1.0, 1.53, z); r1.renderOrder = 3; g.add(r1);
        const r2 = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 2.0), glassMat); r2.position.set(x - e * 3.0, 1.03, z); r2.renderOrder = 3; g.add(r2);
        const m1 = meshPanel(2.0, 1.0, 0x111111, 0.5); m1.position.set(x - e * 3.0, 2.53, z); g.add(m1);
      });
    });
    [-Wd / 2, Wd / 2].forEach((z) => {
      [[-2.5, 3], [2.5, 3]].forEach(([cx, len]) => { const m = meshPanel(len, 3.0, 0x111111, 0.5); m.position.set(cx, 1.53, z); g.add(m); });   // door openings at ±5 m left open
      for (let i = -5; i <= 5; i++) { const h = Math.abs(i) === 5 ? 4.0 : 3.0; const p = mesh(new THREE.BoxGeometry(0.08, h, 0.08), steelBlack); p.position.set(i * 2, h / 2, z); g.add(p); }
    });
    [-1, 1].forEach((e) => { const t = mesh(new THREE.BoxGeometry(0.06, 0.06, Wd), steelBlack); t.position.set(e * L / 2, 4.0, 0); g.add(t); });
    [[-L / 2 - 0.3, -Wd / 2 - 0.3], [L / 2 + 0.3, Wd / 2 + 0.3]].forEach(([x, z]) => mast(g, x, z));
  });

  // fence posts (instanced)
  const postGeo = new THREE.CylinderGeometry(0.035, 0.035, 3.0, 8); postGeo.translate(0, 1.5, 0);
  const pim = new THREE.InstancedMesh(postGeo, steelGreen, posts.length);
  posts.forEach((p, i) => pim.setMatrixAt(i, new THREE.Matrix4().makeTranslation(p.x, -0.12, p.z)));
  pim.castShadow = renderer.shadowMap.enabled; env.add(pim);

  // ---------- vegetation: conceptual Mediterranean planting inside the documented green areas ----------
  definePlants(kit);
  const placements = {};
  const put = (key, x, z, s = 1, yaw = rnd() * Math.PI * 2) => { (placements[key] = placements[key] || []).push({ x, z, s, yaw }); };
  const zone = (kind) => data.surfaces.filter((s) => s.kind === kind).map((s) => s.poly);
  const avoid = [];
  data.tennis.forEach((c) => avoid.push(rectAround(c.center, 18.6, 9.3)));
  data.padel.forEach((c) => avoid.push(rectAround(c.center, 10.8, 5.8)));
  data.surfaces.filter((s) => s.kind === "pool" || s.kind === "deck").forEach((s) => avoid.push(s.poly));
  avoid.push([[-0.8, -0.8], [21.4, -0.8], [21.4, 18.9], [-0.8, 18.9]]);
  const free = (x, z) => !avoid.some((p) => inPoly(x, z, p));
  zone("plantedStrip").forEach((p) => scatter(p, 14, 2.6, rnd).forEach(([x, z], i) => free(x, z) && put(i % 3 === 0 ? "cypress" : (i % 2 ? "olive_a" : "olive_b"), x, z, 0.8 + rnd() * 0.3)));
  zone("garden").forEach((p) => {
    scatter(p, 9, 5.5, rnd).forEach(([x, z], i) => free(x, z) && put(["olive_a", "washingtonia_a", "olive_b", "phoenix"][i % 4], x, z, 0.85 + rnd() * 0.35));
    scatter(p, 60, 1.1, rnd).forEach(([x, z]) => { if (!free(x, z)) return; const q = rnd(); put(q < 0.4 ? "lavender" : q < 0.6 ? "rosemary" : q < 0.85 ? "grass_a" : "agave", x, z, 0.75 + rnd() * 0.5); });
  });
  zone("hedge").forEach((p) => scatter(p, 26, 0.9, rnd).forEach(([x, z], i) => put(i % 4 === 0 ? "olive_b" : (i % 2 ? "rosemary" : "grass_b"), x, z, 0.8 + rnd() * 0.4)));
  zone("gravel").forEach((p) => scatter(p, 12, 4.5, rnd).forEach(([x, z], i) => free(x, z) && put(i % 3 ? "olive_a" : "washingtonia_b", x, z, 0.85 + rnd() * 0.3)));
  zone("courtGreen").forEach((p) => scatter(p, 40, 2.2, rnd).forEach(([x, z]) => {
    if (!free(x, z) || x > -1 || z < 0) return;
    const q = rnd(); put(q < 0.25 ? "phoenix" : q < 0.55 ? "lavender" : "grass_a", x, z, 0.8 + rnd() * 0.4);
  }));
  [[22.5, 4], [22.5, 14], [26.5, 9], [27.0, 19.5]].forEach(([x, z], i) => free(x, z) && put(i % 2 ? "washingtonia_a" : "washingtonia_b", x, z, 0.9 + rnd() * 0.2));
  [[24.6, 6.2, 90], [24.6, 12.8, 90], [12, 19.6, 180]].forEach(([x, z, d]) => put("bench", x, z, 1, THREE.MathUtils.degToRad(d)));
  [[22.2, 1], [22.2, 7], [22.2, 13], [22.2, 19]].forEach(([x, z]) => put("bollard", x, z, 1, 0));

  const NO_CAST = new Set(["lightWarm", "grassStraw", "grassGreen"]);
  Object.entries(placements).forEach(([key, list]) => {
    kit.get(key).forEach(({ mat, geometry }) => {
      const im = new THREE.InstancedMesh(geometry, MAT.shared(mat), list.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
      list.forEach((p, i) => {
        q.setFromAxisAngle(up, p.yaw);
        m4.compose(new THREE.Vector3(p.x, -0.13, p.z), q, new THREE.Vector3(p.s, p.s * (0.9 + (i % 5) * 0.05), p.s));
        im.setMatrixAt(i, m4);
      });
      im.castShadow = renderer.shadowMap.enabled && !NO_CAST.has(mat) && !lowPower;
      im.receiveShadow = renderer.shadowMap.enabled;
      im.userData.vegetation = key !== "bench" && key !== "bollard";
      im.userData.places = list;   // plan positions (used to thin planting around the building in close-up views)
      env.add(im);
    });
  });
  return env;
}

function rectAround([cx, cz], hx, hz) { return [[cx - hz, cz - hx], [cx + hz, cz - hx], [cx + hz, cz + hx], [cx - hz, cz + hx]]; }

// padel court 20 × 10 m: green artificial turf, white lines (service lines 6,95 m from the net, centre line)
function padelTexture(maxAniso) {
  const PX = 64, L = 20, W = 10;
  return canvasTex(L * PX, W * PX, (g, w, h) => {
    const r = seeded(9);
    g.fillStyle = "#3b8a5f"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60000; i++) { const v = (r() - 0.5) * 30; g.fillStyle = `rgb(${59 + v},${138 + v},${95 + v})`; g.fillRect(r() * w, r() * h, 1, 2); }
    g.fillStyle = "#f4f4ee";
    const X = (m) => (L / 2 + m) * PX, Y = (m) => (W / 2 + m) * PX, lw = 0.05 * PX;
    g.fillRect(X(-6.95) - lw / 2, 0, lw, h); g.fillRect(X(6.95) - lw / 2, 0, lw, h);
    g.fillRect(X(-6.95), Y(0) - lw / 2, 13.9 * PX, lw);
  }, maxAniso, { repeat: false });
}

// ---------------------------------------------------------------------------
// plant and site-furniture models (procedural, several variants each)
// ---------------------------------------------------------------------------
function definePlants(kit) {
  const D = kit.define;
  // Washingtonia robusta: tall slim trunk, fan fronds
  const washingtonia = (H, lean, seed) => ({ CY, T, G, add }) => {
    const r = seeded(seed);
    let x = 0, z = 0;
    const segs = 14;
    for (let i = 0; i < segs; i++) {
      const y0 = (i / segs) * H, y1 = ((i + 1) / segs) * H;
      const nx = Math.sin(i * 0.2) * lean, nz = lean * (i / segs);
      T([x, y0, z], [nx, y1, nz], 0.2 - 0.07 * (i / segs), i % 2 ? "palmTrunk" : "palmTrunkDark", 8);
      x = nx; z = nz;
    }
    CY(0.32, 0.9, "palmSkirt", x, H - 0.4, z, "y", 10, 0.2);           // dry skirt of old fronds
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2 + r() * 0.2, tilt = 0.3 + r() * 0.9;
      G(x, H, z, 0, a, 0, () => G(0, 0, 0, -tilt, 0, 0, () => {
        T([0, 0, 0], [0, 0.15, 1.0], 0.025, "palmFrond", 5);
        // fan blade: flattened half disc at the end of the petiole
        const fan = new THREE.CircleGeometry(0.7, 12, -Math.PI / 2 - 0.9, 1.8 + Math.PI / 2);
        fan.rotateX(-Math.PI / 2 + 0.25); fan.translate(0, 0.2, 1.55);
        add(i % 3 ? "palmFrond" : "palmFrondLight", fan);
      }));
    }
  };
  // Phoenix canariensis: thick trunk, dense pinnate crown
  const phoenix = (H, seed) => ({ CY, T, G, B }) => {
    const r = seeded(seed);
    for (let i = 0; i < 10; i++) CY(0.38 - i * 0.004, H / 10, i % 2 ? "palmTrunk" : "palmTrunkDark", 0, (i + 0.5) * (H / 10), 0, "y", 10, 0.4 - i * 0.004);
    CY(0.5, 0.5, "palmSkirt", 0, H - 0.1, 0, "y", 12, 0.38);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + r() * 0.15, tilt = 0.2 + (i % 3) * 0.35 + r() * 0.2, L = 2.6 + r() * 0.6;
      G(0, H + 0.1, 0, 0, a, 0, () => G(0, 0, 0, -tilt, 0, 0, () => {
        const pts = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6; pts.push([0, Math.sin(t * Math.PI * 0.6) * 0.5 - t * t * 1.1, t * L]); }
        for (let k = 0; k < 6; k++) T(pts[k], pts[k + 1], 0.02, "palmFrond", 4);
        for (let k = 1; k < 14; k++) {
          const t = k / 14, y = Math.sin(t * Math.PI * 0.6) * 0.5 - t * t * 1.1, zz = t * L, len = 0.55 * Math.sin(t * Math.PI) + 0.15;
          B(len, 0.01, 0.05, k % 2 ? "palmFrond" : "palmFrondLight", len / 2 + 0.02, y, zz, 0, 0.5, -0.3);
          B(len, 0.01, 0.05, k % 2 ? "palmFrondLight" : "palmFrond", -len / 2 - 0.02, y, zz, 0, -0.5, 0.3);
        }
      }));
    }
  };
  // olive tree: twisted trunk, silvery clustered canopy
  const olive = (seed) => ({ T, S }) => {
    const r = seeded(seed);
    T([0, 0, 0], [0.15, 1.0, 0.05], 0.16, "oliveTrunk", 8);
    T([0.15, 1.0, 0.05], [0.6, 1.9, 0.3], 0.1, "oliveTrunk", 7);
    T([0.15, 1.0, 0.05], [-0.4, 1.8, -0.2], 0.09, "oliveTrunk", 7);
    T([0.1, 1.2, 0], [0.1, 2.1, -0.5], 0.08, "oliveTrunk", 7);
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = r() * 1.3, y = 1.9 + r() * 1.1;
      S(0.42 + r() * 0.35, i % 3 ? "oliveLeaf" : "oliveLeafLight", Math.cos(a) * d, y, Math.sin(a) * d, 1, 0.75, 1, 7);
    }
  };
  // Mediterranean cypress: slim column
  const cypress = ({ S, T }) => {
    T([0, 0, 0], [0, 0.6, 0], 0.08, "oliveTrunk", 6);
    for (let i = 0; i < 12; i++) { const y = 0.6 + i * 0.5, w = 0.55 * Math.sin(Math.PI * (0.15 + 0.85 * (i / 12))) + 0.1; S(w, i % 2 ? "cypressLeaf" : "cypressLeafLight", (i % 3 - 1) * 0.05, y, ((i + 1) % 3 - 1) * 0.05, 1, 1.4, 1, 8); }
  };
  D("washingtonia_a", washingtonia(9.5, 0.35, 3));
  D("washingtonia_b", washingtonia(7.5, -0.5, 7));
  D("phoenix", phoenix(4.2, 11));
  D("olive_a", olive(5));
  D("olive_b", olive(9));
  D("cypress", cypress);
  D("lavender", ({ S, T }) => {
    const r = seeded(13);
    for (let i = 0; i < 9; i++) { const a = r() * 6.28, d = r() * 0.3; S(0.2, "lavenderLeaf", Math.cos(a) * d, 0.18, Math.sin(a) * d, 1, 0.8, 1, 6); }
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = r() * 0.38, x = Math.cos(a) * d, z = Math.sin(a) * d; T([x * 0.6, 0.25, z * 0.6], [x, 0.58 + r() * 0.12, z], 0.008, "lavenderLeaf", 3); S(0.03, "lavenderFlower", x, 0.62 + r() * 0.12, z, 1, 2.2, 1, 5); }
  });
  D("rosemary", ({ S }) => { const r = seeded(17); for (let i = 0; i < 12; i++) { const a = r() * 6.28, d = r() * 0.4; S(0.22 + r() * 0.1, i % 2 ? "rosemaryLeaf" : "oliveLeaf", Math.cos(a) * d, 0.22 + r() * 0.15, Math.sin(a) * d, 1, 0.7, 1, 6); } });
  const grass = (mat, seed) => ({ B }) => { const r = seeded(seed); for (let i = 0; i < 36; i++) { const a = r() * 6.28, lean = 0.2 + r() * 0.5, h = 0.5 + r() * 0.45; B(0.025, h, 0.008, mat, Math.cos(a) * 0.05, h / 2 * Math.cos(lean), Math.sin(a) * 0.05, Math.sin(a) * lean, a, Math.cos(a) * lean); } };
  D("grass_a", grass("grassStraw", 19));
  D("grass_b", grass("grassGreen", 23));
  D("agave", ({ B }) => { const r = seeded(29); for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28 + r() * 0.3, t = 0.4 + (i % 3) * 0.3; B(0.12, 0.7, 0.03, "agaveLeaf", Math.cos(a) * 0.15, 0.3, Math.sin(a) * 0.15, Math.sin(a) * t, a, -Math.cos(a) * t); } });
  D("bench", ({ RB, mirrorX }) => {
    for (let i = 0; i < 4; i++) RB(1.8, 0.04, 0.1, 0.01, "oak", 0, 0.45, -0.16 + i * 0.11);
    RB(1.8, 0.35, 0.06, 0.02, "oak", 0, 0.68, -0.24, -0.15);
    mirrorX((s) => RB(0.08, 0.45, 0.5, 0.02, "steelPaint", s * 0.75, 0.225, -0.02));
  });
  D("bollard", ({ CY }) => { CY(0.06, 0.7, "steelPaint", 0, 0.35, 0, "y", 12); CY(0.05, 0.08, "lightWarm", 0, 0.62, 0, "y", 12); });
}

// ---------------------------------------------------------------------------
function scatter(poly, n, spacing, rnd) {
  const b = poly.reduce((a, [x, z]) => [Math.min(a[0], x), Math.min(a[1], z), Math.max(a[2], x), Math.max(a[3], z)], [1e9, 1e9, -1e9, -1e9]);
  const out = [];
  for (let tries = 0; out.length < n && tries < n * 40; tries++) {
    const x = b[0] + rnd() * (b[2] - b[0]), z = b[1] + rnd() * (b[3] - b[1]);
    if (!inPoly(x, z, poly)) continue;
    if (out.some(([px, pz]) => Math.hypot(px - x, pz - z) < spacing)) continue;
    out.push([x, z]);
  }
  return out;
}
function inPoly(x, y, p) { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; }
function seeded(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function canvasTex(w, h, draw, maxAniso, { repeat = true, srgb = true } = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = Math.min(8, maxAniso);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function makeTextures(maxAniso) {
  const r = seeded(77);
  return {
    grass: canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#6f8a46"; g.fillRect(0, 0, w, h); for (let i = 0; i < 26000; i++) { const v = (r() - 0.5) * 40; g.fillStyle = `rgb(${105 + v},${135 + v},${70 + v * 0.6})`; g.fillRect(r() * w, r() * h, 1, 2 + r() * 2); } }, maxAniso),
    gravel: canvasTex(512, 512, (g, w, h) => { g.fillStyle = "#cfc4ae"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { const v = 170 + r() * 70; g.fillStyle = `rgb(${v},${v - 8},${v - 22})`; g.beginPath(); g.arc(r() * w, r() * h, 0.8 + r() * 2.2, 0, 7); g.fill(); } }, maxAniso),
    chain: canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 3; g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w / 2, 0); g.lineTo(w, h / 2); g.lineTo(w / 2, h); g.closePath(); g.stroke(); }, maxAniso, { srgb: false }),
    acrylic: canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h); for (let i = 0; i < 9000; i++) { g.fillStyle = r() > 0.5 ? "rgba(0,0,0,.05)" : "rgba(255,255,255,.08)"; g.fillRect(r() * w, r() * h, 1.5, 1.5); } }, maxAniso),
    net: canvasTex(64, 64, (g, w, h) => { g.clearRect(0, 0, w, h); g.strokeStyle = "#fff"; g.lineWidth = 4; g.strokeRect(0, 0, w, h); }, maxAniso, { srgb: false }),
  };
}
// ITF court: 23,77 × 10,97 m (singles 8,23), service line 6,40 m from the net,
// lines 5 cm (baselines 10 cm); blue playing area inside a green run-off
function courtTexture(maxAniso) {
  const PX = 56, W = 36.6, D = 18.3;
  const t = canvasTex(Math.round(W * PX), Math.round(D * PX), (g, w, h) => {
    const r = seeded(5);
    g.fillStyle = "#3d7a55"; g.fillRect(0, 0, w, h);
    const X = (m) => (W / 2 + m) * PX, Y = (m) => (D / 2 + m) * PX;
    g.fillStyle = "#2f5f8f"; g.fillRect(X(-11.885), Y(-5.485), 23.77 * PX, 10.97 * PX);
    for (let i = 0; i < 40000; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,.035)" : "rgba(0,0,0,.05)"; g.fillRect(r() * w, r() * h, 2, 2); }
    g.fillStyle = "#f5f5f0";
    const line = (x0, y0, x1, y1, wm = 0.05) => { const lw = wm * PX; if (y0 === y1) g.fillRect(X(x0), Y(y0) - lw / 2, (x1 - x0) * PX, lw); else g.fillRect(X(x0) - lw / 2, Y(y0), lw, (y1 - y0) * PX); };
    line(-11.885, -5.485, 11.885, -5.485); line(-11.885, 5.485, 11.885, 5.485);           // doubles sidelines
    line(-11.885, -4.115, 11.885, -4.115); line(-11.885, 4.115, 11.885, 4.115);           // singles sidelines
    line(-11.885, -5.485, -11.885, 5.485, 0.1); line(11.885, -5.485, 11.885, 5.485, 0.1); // baselines
    line(-6.4, -4.115, -6.4, 4.115); line(6.4, -4.115, 6.4, 4.115);                       // service lines
    line(-6.4, 0, 6.4, 0);                                                                  // centre service line
    line(-11.885, 0, -11.785, 0, 0.05); line(11.785, 0, 11.885, 0, 0.05);                  // centre marks
    g.fillStyle = "rgba(20,20,20,.45)"; g.fillRect(X(-0.02), Y(-6.4), 0.04 * PX, 12.8 * PX); // net shadow line
  }, maxAniso, { repeat: false });
  return t;
}
