/*
 * Fitness club 3D — procedural equipment and furniture library.
 *
 * Every model key used in assets/data/fitness-club.json has a builder that
 * composes rounded boxes, tubes, swept rails, lathes and tori at real-world
 * proportions (metres). The parts of one model are merged into ONE geometry
 * per material, built once and cached; club-scene.js then bakes every placed
 * copy into one merged mesh per zone and material (a few draw calls per zone).
 *
 * Conventions: origin at the footprint centre on the floor (y = 0); the user
 * / front side faces +Z. Material keys are resolved by club-scene.js.
 *
 * These are conceptual models, not manufacturer products. To use authored
 * assets instead, export a GLB (see "model" in fitness-club.json).
 */
export function createClubEquipment(THREE, { RoundedBoxGeometry, mergeGeometries }) {
  const cache = new Map();
  let parts = null;              // [matKey, geometry][] of the model being built
  const frames = [new THREE.Matrix4()];
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const tmpM = new THREE.Matrix4();
  const tmpQ = new THREE.Quaternion();
  const UP = V(0, 1, 0);

  function add(mat, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    if (rx || ry || rz) g.applyMatrix4(tmpM.makeRotationFromEuler(new THREE.Euler(rx, ry, rz, "YXZ")));
    g.translate(x, y, z);
    g.applyMatrix4(frames[frames.length - 1]);
    if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
    parts.push([mat, g]);
  }
  // run fn with a local frame (position + rotation) on top of the current one
  function G(x, y, z, rx, ry, rz, fn) {
    const m = new THREE.Matrix4().compose(V(x, y, z), tmpQ.setFromEuler(new THREE.Euler(rx || 0, ry || 0, rz || 0, "YXZ")).clone(), V(1, 1, 1));
    frames.push(frames[frames.length - 1].clone().multiply(m));
    fn();
    frames.pop();
  }

  // ---------- primitives (x, y, z = centre) ----------
  const B = (w, h, d, mat, x, y, z, rx, ry, rz) => add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
  const RB = (w, h, d, r, mat, x, y, z, rx, ry, rz) => {
    const rr = Math.max(0.002, Math.min(r, Math.min(w, h, d) / 2 - 0.001));
    add(mat, new RoundedBoxGeometry(w, h, d, 2, rr), x, y, z, rx, ry, rz);
  };
  const CY = (r, len, mat, x, y, z, axis = "y", seg = 16, r2 = r) => {
    const g = new THREE.CylinderGeometry(r2, r, len, seg);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    if (axis === "z") g.rotateX(Math.PI / 2);
    add(mat, g, x, y, z);
  };
  const S = (r, mat, x, y, z, sx = 1, sy = 1, sz = 1, seg = 14) => {
    const g = new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.7 | 0));
    if (sx !== 1 || sy !== 1 || sz !== 1) g.scale(sx, sy, sz);
    add(mat, g, x, y, z);
  };
  const TOR = (r, tube, mat, x, y, z, rx = 0, ry = 0, arc = Math.PI * 2, seg = 20) =>
    add(mat, new THREE.TorusGeometry(r, tube, 6, seg, arc), x, y, z, rx, ry);
  // straight tube between two points
  const T = (a, b, r, mat, seg = 10) => {
    const A = V(...a), Bv = V(...b);
    const dir = Bv.clone().sub(A);
    const len = dir.length();
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    g.applyQuaternion(tmpQ.setFromUnitVectors(UP, dir.normalize()));
    g.translate((A.x + Bv.x) / 2, (A.y + Bv.y) / 2, (A.z + Bv.z) / 2);
    add(mat, g);
  };
  // smooth swept rail through points
  const P = (pts, r, mat, seg = 8, steps = 28) => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => V(...p)), false, "centripetal");
    add(mat, new THREE.TubeGeometry(curve, steps, r, seg, false));
  };
  const LATHE = (pts, mat, x, y, z, seg = 20) => add(mat, new THREE.LatheGeometry(pts.map(([px, py]) => new THREE.Vector2(px, py)), seg), x, y, z);
  const mirrorX = (fn) => { fn(1); fn(-1); };

  // ---------- reusable sub-assemblies ----------
  // console: tilted housing with a glowing screen on the user (-z) side
  const consoleUnit = (x, y, z, w = 0.62, h = 0.36, tilt = 0.45) => G(x, y, z, tilt, 0, 0, () => {
    RB(w, h, 0.07, 0.03, "frame", 0, 0, 0);
    B(w - 0.1, h - 0.1, 0.008, "screen", 0, 0.01, -0.037);
    B(w * 0.5, 0.02, 0.01, "ledBlue", 0, -h / 2 + 0.03, -0.037);
  });
  const plate = (r, w, x, y, z, axis = "x") => {
    CY(r, w, "plate", x, y, z, axis, 26);
    CY(r * 0.32, w + 0.006, "chrome", x, y, z, axis, 14);
  };
  const barbellX = (y, z, len = 2.2, plates = [0.225, 0.225]) => {
    CY(0.014, len, "chrome", 0, y, z, "x", 10);
    mirrorX((s) => {
      CY(0.025, 0.42, "chrome", s * (len / 2 - 0.21), y, z, "x", 12);
      CY(0.04, 0.03, "chrome", s * (len / 2 - 0.44), y, z, "x", 14);
      plates.forEach((r, i) => plate(r, 0.05, s * (len / 2 - 0.4 + i * 0.055), y, z));
    });
  };
  const dumbbell = (x, y, z, kg = 10, axis = "x") => {
    const r = 0.05 + kg * 0.0018, w = 0.05 + kg * 0.0022;
    const off = 0.075 + w / 2;
    const at = (o) => (axis === "x" ? [x + o, y, z] : [x, y, z + o]);
    CY(0.016, 0.16, "chrome", ...at(0), axis, 8);
    CY(r, w, "plate", ...at(-off), axis, 6);
    CY(r, w, "plate", ...at(off), axis, 6);
  };
  const kettlebell = (x, z, r = 0.08, y = 0, mat = "plate") => {
    S(r, mat, x, y + r * 0.95, z, 1, 0.95, 1, 16);
    B(r * 1.1, 0.012, r * 1.1, mat, x, y + 0.006, z);
    TOR(r * 0.62, r * 0.13, mat, x, y + r * 1.9, z, 0, 0, Math.PI, 14);
    CY(r * 0.13, r * 0.5, mat, x - r * 0.62, y + r * 1.72, z, "y", 8);
    CY(r * 0.13, r * 0.5, mat, x + r * 0.62, y + r * 1.72, z, "y", 8);
  };
  // selectorised weight stack centred at (0, z0)
  const stack = (h, z0, w = 0.56) => {
    RB(w + 0.2, 0.06, 0.62, 0.02, "frame", 0, 0.03, z0);
    mirrorX((s) => RB(0.08, h, 0.08, 0.02, "frame", s * (w / 2), h / 2, z0));
    RB(w + 0.08, 0.1, 0.16, 0.03, "frame", 0, h - 0.05, z0);
    mirrorX((s) => CY(0.011, h - 0.32, "chrome", s * 0.11, h / 2 - 0.02, z0, "y", 8));
    for (let i = 0; i < 15; i++) B(0.3, 0.042, 0.13, "plate", 0, 0.1 + i * 0.047, z0);
    B(0.12, 0.05, 0.1, "chrome", 0, 0.1 + 15 * 0.047 + 0.02, z0);
    CY(0.007, h - 0.9, "rubber", 0, 0.82 + (h - 0.9) / 2, z0, "y", 6);
    // shroud: graphite sides, smoked glass front
    mirrorX((s) => B(0.02, h * 0.72, 0.2, "frame", s * 0.19, 0.08 + h * 0.36, z0));
    B(0.36, h * 0.66, 0.01, "glass", 0, 0.1 + h * 0.33, z0 + 0.105);
    B(0.36, 0.04, 0.012, "ledBlue", 0, 0.12 + h * 0.66, z0 + 0.105);
    CY(0.06, 0.04, "steel", 0, h - 0.16, z0 + 0.09, "x", 16);
  };
  const seat = (y, z, w = 0.42, d = 0.42, tilt = 0) => {
    T([0, 0.06, z], [0, y - 0.05, z], 0.035, "frame");
    RB(w, 0.09, d, 0.04, "pad", 0, y, z, tilt);
  };
  const backPad = (y, z, h = 0.68, tilt = 0.12, w = 0.42) => RB(w, h, 0.09, 0.04, "pad", 0, y, z, tilt);
  const grip = (x, y, z, axis = "y", len = 0.14) => CY(0.022, len, "rubber", x, y, z, axis, 10);
  const spinBike = (oy = 0) => {
    RB(0.56, 0.05, 0.08, 0.02, "frame", 0, oy + 0.03, -0.5);
    RB(0.56, 0.05, 0.08, 0.02, "frame", 0, oy + 0.03, 0.46);
    P([[0, oy + 0.05, -0.48], [0, oy + 0.32, -0.15], [0, oy + 0.62, 0.22]], 0.04, "frame", 8, 16);
    T([0, oy + 0.05, 0.44], [0, oy + 0.6, 0.24], 0.04, "frame");
    CY(0.24, 0.035, "chrome", 0, oy + 0.32, 0.3, "x", 30);
    RB(0.07, 0.5, 0.5, 0.2, "frame", 0.045, oy + 0.32, 0.3);
    CY(0.06, 0.12, "frame", 0, oy + 0.3, -0.05, "x", 14);
    mirrorX((s) => { T([s * 0.07, oy + 0.3, -0.05], [s * 0.1, oy + 0.18, 0.08], 0.012, "chrome"); B(0.1, 0.02, 0.06, "rubber", s * 0.15, oy + 0.18, 0.08); });
    T([0, oy + 0.5, -0.24], [0, oy + 0.88, -0.36], 0.026, "chrome");
    RB(0.17, 0.06, 0.27, 0.025, "pad", 0, oy + 0.92, -0.38);
    T([0, oy + 0.6, 0.24], [0, oy + 0.96, 0.3], 0.026, "chrome");
    P([[-0.22, oy + 1.0, 0.18], [-0.24, oy + 1.0, 0.38], [0, oy + 1.04, 0.44], [0.24, oy + 1.0, 0.38], [0.22, oy + 1.0, 0.18]], 0.016, "rubber", 6, 20);
    T([-0.2, oy + 0.98, 0.32], [0.2, oy + 0.98, 0.32], 0.016, "frame");
    B(0.14, 0.09, 0.02, "screen", 0, oy + 1.08, 0.36, 0.5);
    CY(0.025, 0.05, "accent", 0, oy + 0.66, 0.2, "y", 10);
  };

  // ---------- builders (front / user side = +Z) ----------
  const BUILD = {
    // ===== 01 RECEPTION =====
    slat_wall() {
      RB(5.4, 3.0, 0.08, 0.01, "walnut", 0, 1.5, -0.04);
      for (let i = 0; i < 46; i++) B(0.045, 2.92, 0.06, "oak", -2.6 + i * (5.2 / 45), 1.5, 0.03);
      [-1.82, 1.82].forEach((x) => B(0.02, 2.7, 0.01, "ledWarm", x, 1.5, 0.002));
      B(5.4, 0.03, 0.04, "ledWarm", 0, 2.98, 0.04);
      // brand plate (blank, backlit)
      RB(1.6, 0.36, 0.03, 0.01, "white", 0, 2.05, 0.08);
    },
    reception_desk() {
      // customer side +z: slatted front, high transaction ledge
      RB(4.2, 1.02, 0.12, 0.02, "walnut", 0, 0.53, 0.38);
      for (let i = 0; i < 40; i++) B(0.05, 0.94, 0.03, "oak", -2.0 + i * (4.0 / 39), 0.53, 0.455);
      RB(4.3, 0.05, 0.42, 0.012, "stone", 0, 1.08, 0.3);
      B(4.1, 0.012, 0.02, "ledWarm", 0, 1.045, 0.5);
      mirrorX((s) => RB(0.1, 1.02, 0.9, 0.02, "walnut", s * 2.05, 0.53, 0));
      RB(4.0, 0.04, 0.6, 0.01, "oak", 0, 0.76, -0.15);
      RB(3.9, 0.7, 0.04, 0.01, "frame", 0, 0.4, 0.3);
      // monitors and card terminal (staff side)
      [-1.0, 0.9].forEach((x) => {
        RB(0.56, 0.34, 0.03, 0.01, "frame", x, 1.12, 0.12, -0.12);
        B(0.52, 0.3, 0.005, "screen", x, 1.12, 0.1, -0.12);
        T([x, 0.78, 0.18], [x, 0.98, 0.15], 0.015, "frame");
        B(0.18, 0.012, 0.14, "frame", x, 0.785, 0.18);
      });
      RB(0.08, 0.12, 0.05, 0.01, "frame", 1.6, 1.16, 0.32, -0.4);
      CY(0.06, 0.25, "glass", -1.75, 1.23, 0.32, "y", 14);
      S(0.08, "leaf", -1.75, 1.42, 0.32, 1, 1.2, 1);
    },
    speed_gate() {
      RB(0.2, 1.0, 1.15, 0.05, "frame", 0, 0.5, 0);
      RB(0.22, 0.03, 1.17, 0.012, "stone", 0, 1.015, 0);
      B(0.012, 0.02, 1.0, "ledBlue", 0.11, 0.98, 0);
      B(0.012, 0.02, 1.0, "ledBlue", -0.11, 0.98, 0);
      B(0.08, 0.06, 0.08, "screen", 0, 1.06, 0.4);
      // glass flaps on both sides
      mirrorX((s) => RB(0.26, 0.62, 0.015, 0.06, "glass", s * 0.23, 0.7, 0.02, 0, Math.PI / 2));
    },
    rug() { RB(2.6, 0.012, 3.2, 0.005, "rug", 0, 0.006, 0); },
    sofa() {
      RB(2.3, 0.1, 0.92, 0.02, "walnut", 0, 0.11, 0);
      mirrorX((s) => [[-0.4], [0.35]].forEach(([z]) => CY(0.02, 0.06, "frame", s * 1.05, 0.03, z, "y", 8)));
      for (let i = 0; i < 3; i++) RB(0.72, 0.17, 0.66, 0.06, "fabric", -0.73 + i * 0.73, 0.24, 0.08);
      RB(2.3, 0.42, 0.2, 0.06, "fabric", 0, 0.36, -0.35);
      for (let i = 0; i < 3; i++) RB(0.7, 0.38, 0.16, 0.07, "fabricLight", -0.73 + i * 0.73, 0.5, -0.23, -0.12);
      mirrorX((s) => RB(0.16, 0.42, 0.9, 0.06, "fabric", s * 1.13, 0.36, 0));
      RB(0.42, 0.3, 0.12, 0.06, "leather", -0.6, 0.48, -0.06, -0.2, 0.2);
    },
    lounge_chair() {
      RB(0.8, 0.12, 0.76, 0.04, "leather", 0, 0.32, 0.02);
      RB(0.8, 0.44, 0.12, 0.05, "leather", 0, 0.55, -0.32, -0.18);
      mirrorX((s) => RB(0.1, 0.3, 0.72, 0.04, "leather", s * 0.37, 0.42, 0));
      mirrorX((s) => { T([s * 0.32, 0, 0.3], [s * 0.3, 0.26, 0.26], 0.015, "frame"); T([s * 0.32, 0, -0.3], [s * 0.3, 0.26, -0.26], 0.015, "frame"); });
    },
    coffee_table() {
      CY(0.55, 0.04, "stone", 0, 0.38, 0, "y", 36);
      CY(0.2, 0.34, "frame", 0, 0.18, 0, "y", 24, 0.12);
      RB(0.24, 0.03, 0.17, 0.005, "white", 0.15, 0.415, 0.05);
      RB(0.22, 0.02, 0.16, 0.005, "frame", 0.15, 0.44, 0.05, 0, 0.2);
      CY(0.06, 0.12, "pot", -0.2, 0.46, -0.1, "y", 12, 0.05);
    },
    shake_bar() {
      RB(3.2, 1.0, 0.6, 0.02, "walnut", 0, 0.5, -0.05);
      for (let i = 0; i < 30; i++) CY(0.05, 0.96, "oak", -1.5 + i * (3.0 / 29), 0.5, 0.26, "y", 8);
      RB(3.3, 0.05, 0.72, 0.015, "stone", 0, 1.03, 0);
      B(3.1, 0.012, 0.02, "ledWarm", 0, 0.995, 0.34);
      [-1.0, -0.6, 0.9].forEach((x) => {
        RB(0.16, 0.16, 0.16, 0.02, "frame", x, 1.13, -0.12);
        CY(0.07, 0.24, "glass", x, 1.33, -0.12, "y", 14, 0.06);
      });
      [0.2, 0.4].forEach((x) => CY(0.05, 0.16, "white", x, 1.14, -0.1, "y", 12));
    },
    bar_stool() {
      CY(0.2, 0.012, "frame", 0, 0.006, 0, "y", 24);
      CY(0.022, 0.7, "chrome", 0, 0.36, 0, "y", 10);
      TOR(0.17, 0.01, "chrome", 0, 0.28, 0, Math.PI / 2);
      CY(0.2, 0.07, "leather", 0, 0.74, 0, "y", 24);
    },
    back_bar() {
      RB(3.2, 0.9, 0.5, 0.02, "walnut", 0, 0.45, 0);
      RB(3.25, 0.04, 0.55, 0.01, "stone", 0, 0.92, 0);
      RB(3.2, 1.6, 0.06, 0.01, "frame", 0, 1.74, -0.22);
      [1.3, 1.7, 2.1].forEach((y) => {
        B(3.0, 0.03, 0.3, "oak", 0, y, -0.06);
        B(3.0, 0.01, 0.01, "ledWarm", 0, y - 0.02, 0.08);
        for (let i = 0; i < 12; i++) CY(0.035, 0.2, i % 3 ? "glass" : "white", -1.35 + i * 0.245, y + 0.115, -0.06, "y", 10);
      });
      // drinks fridge (lit)
      RB(0.6, 0.8, 0.04, 0.01, "glass", 1.15, 0.45, 0.25);
      B(0.54, 0.7, 0.01, "ledWarm", 1.15, 0.45, 0.22);
      B(1.0, 0.5, 0.03, "screen", -0.8, 2.55, -0.18);
    },
    retail_unit() {
      RB(2.0, 2.0, 0.4, 0.01, "oak", 0, 1.0, 0);
      B(1.9, 1.84, 0.01, "ledWarm", 0, 1.02, -0.18);
      [0.15, 0.6, 1.05, 1.5].forEach((y, r) => {
        B(1.92, 0.03, 0.36, "oak", 0, y, 0.01);
        for (let i = 0; i < 8; i++) {
          const mat = ["frame", "white", "accent", "white"][(i + r) % 4];
          if (r === 0) RB(0.18, 0.24, 0.24, 0.02, mat, -0.82 + i * 0.235, y + 0.135, 0.02);
          else CY(0.045, 0.2, mat, -0.82 + i * 0.235, y + 0.115, 0.02, "y", 12);
        }
      });
    },
    planter() {
      CY(0.26, 0.6, "pot", 0, 0.3, 0, "y", 24, 0.2);
      CY(0.24, 0.02, "rock", 0, 0.6, 0, "y", 20);
      T([0, 0.55, 0], [0.05, 1.3, 0.02], 0.025, "trunk");
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4, h = 1.0 + (i % 5) * 0.16, r = 0.18 + (i % 3) * 0.08;
        G(Math.cos(a) * r * 0.5, h, Math.sin(a) * r * 0.5, 0.5 + (i % 3) * 0.2, a, 0, () => S(0.13, "leaf", 0, 0.08, 0.1, 0.45, 0.12, 1.4, 10));
      }
    },

    // ===== 02 CARDIO =====
    treadmill() {
      RB(0.86, 0.18, 1.92, 0.05, "frame", 0, 0.13, -0.06);
      B(0.58, 0.02, 1.68, "rubber", 0, 0.23, -0.12);
      mirrorX((s) => RB(0.12, 0.035, 1.76, 0.012, "rubberGrip", s * 0.36, 0.235, -0.1));
      CY(0.045, 0.86, "steel", 0, 0.13, -1.0, "x", 14);
      RB(0.86, 0.28, 0.38, 0.09, "frame", 0, 0.24, 0.78);
      B(0.5, 0.012, 0.012, "ledBlue", 0, 0.3, 0.97);
      mirrorX((s) => {
        P([[s * 0.38, 0.32, 0.86], [s * 0.37, 0.8, 0.8], [s * 0.33, 1.22, 0.72]], 0.038, "frame", 10, 14);
        P([[s * 0.34, 1.06, 0.66], [s * 0.4, 1.1, 0.42], [s * 0.4, 1.02, 0.22]], 0.02, "chrome", 8, 14);
        grip(s * 0.4, 1.04, 0.3, "z", 0.18);
      });
      T([-0.3, 1.18, 0.64], [0.3, 1.18, 0.64], 0.018, "chrome");
      consoleUnit(0, 1.38, 0.74, 0.7, 0.4, 0.45);
    },
    elliptical() {
      RB(0.2, 0.1, 1.9, 0.03, "frame", 0, 0.06, -0.05);
      RB(0.66, 0.06, 0.14, 0.02, "frame", 0, 0.03, 0.85);
      RB(0.6, 0.06, 0.14, 0.02, "frame", 0, 0.03, -0.92);
      RB(0.44, 0.58, 0.56, 0.16, "frame", 0, 0.38, -0.72);
      mirrorX((s) => CY(0.2, 0.02, "steel", s * 0.225, 0.38, -0.72, "x", 28));
      mirrorX((s) => {
        RB(0.08, 0.05, 0.9, 0.02, "frame", s * 0.13, 0.34, -0.12, 0.12);
        RB(0.15, 0.04, 0.38, 0.015, "rubberGrip", s * 0.15, 0.4, 0.18, 0.06);
        P([[s * 0.13, 0.42, 0.4], [s * 0.26, 0.9, 0.52], [s * 0.3, 1.45, 0.42], [s * 0.28, 1.72, 0.3]], 0.022, "chrome", 8, 20);
        grip(s * 0.28, 1.6, 0.36, "y", 0.22);
      });
      T([0, 0.1, 0.82], [0, 1.25, 0.66], 0.045, "frame");
      T([-0.14, 1.18, 0.6], [0.14, 1.18, 0.6], 0.018, "chrome");
      consoleUnit(0, 1.42, 0.64, 0.46, 0.3, 0.5);
    },
    stair_climber() {
      RB(0.84, 0.22, 1.56, 0.05, "frame", 0, 0.11, -0.05);
      for (let i = 0; i < 6; i++) {
        B(0.6, 0.035, 0.27, "rubberGrip", 0, 0.34 + i * 0.2, -0.55 + i * 0.19);
        B(0.6, 0.2, 0.02, "frame", 0, 0.24 + i * 0.2, -0.42 + i * 0.19);
      }
      mirrorX((s) => RB(0.05, 1.5, 1.42, 0.02, "frame", s * 0.33, 0.85, -0.05, -0.82));
      RB(0.72, 1.6, 0.28, 0.08, "frame", 0, 1.0, 0.6);
      mirrorX((s) => P([[s * 0.42, 0.9, -0.4], [s * 0.43, 1.45, 0.05], [s * 0.4, 1.85, 0.42]], 0.022, "chrome", 8, 18));
      consoleUnit(0, 1.92, 0.55, 0.5, 0.3, 0.55);
    },
    upright_bike() {
      RB(0.56, 0.05, 0.1, 0.02, "frame", 0, 0.03, -0.42);
      RB(0.56, 0.05, 0.1, 0.02, "frame", 0, 0.03, 0.42);
      P([[0, 0.06, -0.4], [0, 0.32, -0.12], [0, 0.55, 0.2], [0, 0.62, 0.38]], 0.05, "frame", 10, 16);
      RB(0.15, 0.56, 0.5, 0.18, "frame", 0, 0.36, 0.2);
      CY(0.07, 0.17, "frame", 0, 0.34, 0.05, "x", 16);
      mirrorX((s) => { T([s * 0.09, 0.34, 0.05], [s * 0.11, 0.2, -0.06], 0.012, "chrome"); B(0.1, 0.022, 0.06, "rubber", s * 0.16, 0.2, -0.06); });
      T([0, 0.4, -0.12], [0, 0.85, -0.3], 0.03, "chrome");
      RB(0.26, 0.08, 0.3, 0.035, "pad", 0, 0.9, -0.34);
      T([0, 0.6, 0.36], [0, 1.12, 0.42], 0.04, "frame");
      P([[-0.24, 1.08, 0.3], [-0.24, 1.16, 0.46], [0, 1.18, 0.5], [0.24, 1.16, 0.46], [0.24, 1.08, 0.3]], 0.016, "rubber", 6, 18);
      consoleUnit(0, 1.28, 0.44, 0.32, 0.2, 0.5);
    },
    rower() {
      P([[0, 0.12, -1.12], [0, 0.42, -0.6], [0, 0.48, 0.2], [0, 0.48, 0.62]], 0.04, "steel", 10, 18);
      RB(0.12, 0.03, 1.5, 0.012, "chrome", 0, 0.47, -0.25, -0.05);
      RB(0.5, 0.05, 0.12, 0.02, "frame", 0, 0.03, -1.12);
      CY(0.32, 0.24, "frame", 0, 0.48, 0.86, "x", 32);
      TOR(0.32, 0.02, "steel", 0.125, 0.48, 0.86, 0, Math.PI / 2, Math.PI * 2, 32);
      TOR(0.32, 0.02, "steel", -0.125, 0.48, 0.86, 0, Math.PI / 2, Math.PI * 2, 32);
      CY(0.1, 0.25, "chrome", 0, 0.48, 0.86, "x", 16);
      mirrorX((s) => T([s * 0.12, 0.38, 0.86], [s * 0.24, 0.02, 0.86], 0.03, "frame"));
      RB(0.6, 0.05, 0.12, 0.02, "frame", 0, 0.03, 0.86);
      RB(0.3, 0.08, 0.34, 0.035, "pad", 0, 0.54, -0.4);
      mirrorX((s) => RB(0.13, 0.03, 0.28, 0.01, "rubberGrip", s * 0.09, 0.42, 0.42, -0.75));
      B(0.48, 0.035, 0.035, "rubber", 0, 0.6, 0.62);
      T([0, 0.62, 0.78], [0, 0.98, 0.7], 0.018, "frame");
      consoleUnit(0, 1.02, 0.68, 0.28, 0.2, 0.3);
    },
    air_bike() {
      RB(0.62, 0.05, 0.1, 0.02, "frame", 0, 0.03, -0.5);
      RB(0.62, 0.05, 0.1, 0.02, "frame", 0, 0.03, 0.5);
      CY(0.34, 0.2, "frame", 0, 0.52, 0.38, "x", 36);
      mirrorX((s) => TOR(0.34, 0.018, "steel", s * 0.105, 0.52, 0.38, 0, Math.PI / 2, Math.PI * 2, 36));
      CY(0.08, 0.22, "chrome", 0, 0.52, 0.38, "x", 16);
      P([[0, 0.05, -0.48], [0, 0.42, -0.12], [0, 0.5, 0.12]], 0.045, "frame", 10, 14);
      T([0, 0.42, -0.12], [0, 0.88, -0.3], 0.03, "chrome");
      RB(0.26, 0.08, 0.3, 0.035, "pad", 0, 0.92, -0.34);
      mirrorX((s) => {
        P([[s * 0.16, 0.36, 0.1], [s * 0.24, 0.9, 0.08], [s * 0.26, 1.42, -0.02]], 0.024, "frame", 8, 16);
        grip(s * 0.26, 1.36, -0.01, "y", 0.24);
        RB(0.12, 0.03, 0.06, 0.01, "rubber", s * 0.18, 0.3, -0.1);
      });
      T([0, 0.86, 0.3], [0, 1.18, 0.2], 0.02, "frame");
      consoleUnit(0, 1.24, 0.2, 0.2, 0.14, 0.4);
    },
    towel_station() {
      RB(0.9, 0.9, 0.45, 0.02, "walnut", 0, 0.45, 0);
      RB(0.92, 0.03, 0.47, 0.01, "stone", 0, 0.915, 0);
      for (let i = 0; i < 5; i++) CY(0.05, 0.36, "white", -0.3 + i * 0.15, 0.98, -0.06, "z", 12);
      CY(0.03, 0.18, "white", 0.3, 1.02, 0.12, "y", 10);
      B(0.8, 0.012, 0.012, "ledWarm", 0, 0.88, 0.23);
    },

    // ===== 03 STRENGTH MACHINES =====
    chest_press() {
      stack(1.62, -0.62);
      seat(0.48, 0.02);
      backPad(0.9, -0.22, 0.66, 0.12);
      T([0, 0.08, -0.3], [0, 0.6, -0.26], 0.035, "frame");
      mirrorX((s) => {
        P([[s * 0.3, 1.55, -0.5], [s * 0.38, 1.4, -0.1], [s * 0.38, 1.12, 0.3]], 0.035, "frame", 10, 16);
        grip(s * 0.38, 1.04, 0.32, "y", 0.2);
      });
      RB(0.7, 0.07, 0.07, 0.02, "frame", 0, 1.56, -0.5);
    },
    pec_fly() {
      stack(1.62, -0.62);
      seat(0.48, 0.0);
      backPad(0.9, -0.2, 0.72, 0.06);
      RB(0.7, 0.07, 0.07, 0.02, "frame", 0, 1.62, -0.42);
      mirrorX((s) => {
        P([[s * 0.2, 1.62, -0.42], [s * 0.5, 1.58, -0.22], [s * 0.58, 1.45, 0.02]], 0.03, "frame", 8, 16);
        T([s * 0.58, 1.45, 0.02], [s * 0.58, 0.85, 0.04], 0.03, "frame");
        RB(0.08, 0.36, 0.14, 0.04, "pad", s * 0.55, 1.15, 0.12);
      });
    },
    shoulder_press() {
      stack(1.62, -0.62);
      seat(0.48, 0.08);
      backPad(0.95, -0.14, 0.76, 0.05);
      mirrorX((s) => {
        P([[s * 0.24, 1.6, -0.52], [s * 0.3, 1.62, -0.2], [s * 0.32, 1.42, 0.02]], 0.035, "frame", 10, 14);
        grip(s * 0.36, 1.42, 0.06, "z", 0.18);
      });
      RB(0.62, 0.07, 0.07, 0.02, "frame", 0, 1.6, -0.52);
    },
    lat_pulldown() {
      stack(2.2, -0.62);
      seat(0.5, 0.3, 0.4, 0.38);
      T([0, 0.06, 0.55], [0, 0.72, 0.5], 0.035, "frame");
      CY(0.07, 0.5, "pad", 0, 0.74, 0.48, "x", 14);
      RB(0.08, 0.08, 1.1, 0.02, "frame", 0, 2.17, -0.1);
      CY(0.05, 0.04, "steel", 0, 2.1, 0.42, "x", 14);
      CY(0.005, 0.38, "rubber", 0, 1.9, 0.42, "y", 6);
      P([[-0.55, 1.62, 0.42], [-0.45, 1.7, 0.42], [0, 1.72, 0.42], [0.45, 1.7, 0.42], [0.55, 1.62, 0.42]], 0.015, "chrome", 6, 18);
      mirrorX((s) => grip(s * 0.5, 1.66, 0.42, "x", 0.14));
    },
    seated_row() {
      stack(1.62, -0.66);
      seat(0.46, -0.05, 0.4, 0.5);
      T([0, 0.06, 0.45], [0, 1.0, 0.45], 0.04, "frame");
      RB(0.36, 0.5, 0.1, 0.04, "pad", 0, 0.98, 0.4);
      mirrorX((s) => {
        P([[s * 0.15, 1.55, -0.55], [s * 0.3, 1.4, 0.0], [s * 0.3, 1.05, 0.62]], 0.03, "frame", 8, 16);
        grip(s * 0.3, 1.0, 0.66, "y", 0.18);
      });
      B(0.5, 0.03, 0.22, "rubberGrip", 0, 0.22, 0.55, -0.5);
    },
    leg_extension() {
      stack(1.5, -0.6);
      seat(0.52, 0.05, 0.42, 0.46);
      backPad(0.86, -0.18, 0.6, 0.18);
      mirrorX((s) => { RB(0.08, 0.26, 0.24, 0.04, "pad", s * 0.28, 0.66, 0.05); grip(s * 0.3, 0.62, 0.28, "z", 0.14); });
      T([0.24, 0.52, 0.26], [0.24, 0.3, 0.42], 0.03, "frame");
      CY(0.07, 0.44, "pad", 0, 0.28, 0.44, "x", 14);
      CY(0.06, 0.06, "accent", 0.27, 0.52, 0.26, "x", 14);
    },
    leg_curl() {
      stack(1.5, -0.62);
      seat(0.52, 0.02, 0.42, 0.46);
      backPad(0.88, -0.22, 0.62, 0.14);
      CY(0.07, 0.44, "pad", 0, 0.68, 0.34, "x", 14);
      CY(0.07, 0.44, "pad", 0, 0.42, 0.52, "x", 14);
      T([0.25, 0.68, 0.2], [0.25, 0.42, 0.52], 0.03, "frame");
      T([0.25, 0.3, 0.0], [0.25, 0.9, 0.24], 0.03, "frame");
    },
    hip_abductor() {
      stack(1.5, -0.66);
      seat(0.5, 0.05, 0.44, 0.5, -0.08);
      backPad(0.88, -0.22, 0.66, 0.3);
      mirrorX((s) => {
        RB(0.07, 0.3, 0.42, 0.03, "pad", s * 0.2, 0.62, 0.36);
        RB(0.2, 0.04, 0.34, 0.01, "rubberGrip", s * 0.2, 0.32, 0.5);
        T([s * 0.2, 0.3, 0.2], [s * 0.2, 0.08, 0.05], 0.03, "frame");
        grip(s * 0.3, 0.72, 0.02, "z", 0.16);
      });
    },
    leg_press() {
      RB(1.2, 0.08, 2.2, 0.02, "frame", 0, 0.04, 0);
      // inclined rails (45°) from the seat (-z, low) to the front (+z, high)
      mirrorX((s) => T([s * 0.3, 0.12, -0.3], [s * 0.3, 1.55, 1.0], 0.045, "chrome"));
      mirrorX((s) => T([s * 0.3, 0.06, 0.95], [s * 0.3, 1.55, 1.0], 0.05, "frame"));
      RB(0.56, 0.1, 0.5, 0.04, "pad", 0, 0.42, -0.62, 0.15);
      RB(0.56, 0.75, 0.1, 0.04, "pad", 0, 0.75, -0.92, 0.5);
      T([0, 0.06, -0.62], [0, 0.36, -0.62], 0.04, "frame");
      G(0, 0.95, 0.42, -0.79, 0, 0, () => {
        RB(0.78, 0.66, 0.05, 0.02, "steel", 0, 0, 0);
        RB(0.7, 0.58, 0.012, 0.01, "rubberGrip", 0, 0, -0.03);
      });
      mirrorX((s) => {
        CY(0.026, 0.3, "chrome", s * 0.56, 0.9, 0.62, "x", 10);
        [0, 1, 2].forEach((i) => plate(0.225 - i * 0.03, 0.05, s * (0.48 + i * 0.055), 0.9, 0.62));
        grip(s * 0.38, 0.5, -0.5, "z", 0.16);
      });
    },
    hack_squat() {
      RB(1.2, 0.08, 2.0, 0.02, "frame", 0, 0.04, 0);
      mirrorX((s) => T([s * 0.28, 0.1, 0.45], [s * 0.28, 1.95, -0.7], 0.045, "chrome"));
      mirrorX((s) => T([s * 0.28, 0.06, -0.72], [s * 0.28, 1.95, -0.7], 0.05, "frame"));
      G(0, 0.62, 0.62, 0.35, 0, 0, () => { RB(0.62, 0.05, 0.62, 0.02, "steel", 0, 0, 0); B(0.56, 0.01, 0.56, "rubberGrip", 0, 0.03, 0); });
      G(0, 1.2, 0.0, -0.55, 0, 0, () => {
        RB(0.42, 0.86, 0.1, 0.04, "pad", 0, 0, 0);
        mirrorX((s) => RB(0.12, 0.1, 0.28, 0.04, "pad", s * 0.16, 0.5, 0.1));
      });
      mirrorX((s) => { CY(0.026, 0.3, "chrome", s * 0.48, 1.1, -0.1, "x", 10); plate(0.225, 0.05, s * 0.44, 1.1, -0.1); plate(0.19, 0.05, s * 0.5, 1.1, -0.1); });
    },
    smith_machine() {
      RB(2.2, 0.06, 1.6, 0.02, "frame", 0, 0.03, 0);
      mirrorX((s) => {
        [-0.62, 0.62].forEach((z) => RB(0.09, 2.25, 0.09, 0.02, "frame", s * 1.0, 1.125, z));
        RB(0.09, 0.09, 1.33, 0.02, "frame", s * 1.0, 2.2, 0);
        CY(0.016, 2.0, "chrome", s * 0.82, 1.1, 0.0, "y", 8);
        [0.3, 0.6].forEach((y) => CY(0.026, 0.25, "chrome", s * 0.93, y, -0.62, "z", 10));
        plate(0.225, 0.05, s * 0.93, 0.3, -0.7, "z");
      });
      RB(2.09, 0.09, 0.09, 0.02, "frame", 0, 2.2, -0.62);
      RB(2.09, 0.09, 0.09, 0.02, "frame", 0, 2.2, 0.62);
      CY(0.016, 2.1, "chrome", 0, 1.35, 0.0, "x", 10);
      mirrorX((s) => { B(0.1, 0.12, 0.1, "steel", s * 0.82, 1.35, 0); plate(0.225, 0.05, s * 0.95, 1.35, 0); plate(0.19, 0.05, s * 1.01, 1.35, 0); });
      RB(0.3, 0.08, 1.2, 0.03, "pad", 0, 0.45, 0.1);
      T([0, 0.06, 0.1], [0, 0.4, 0.1], 0.04, "frame");
    },
    dip_chin() {
      stack(2.1, -0.55);
      RB(0.7, 0.08, 0.5, 0.02, "frame", 0, 0.04, 0.15);
      mirrorX((s) => T([s * 0.3, 0.06, -0.3], [s * 0.3, 2.2, -0.3], 0.04, "frame"));
      T([-0.3, 2.2, -0.3], [0.3, 2.2, -0.3], 0.04, "frame");
      mirrorX((s) => {
        P([[s * 0.3, 2.1, -0.3], [s * 0.4, 2.15, 0.0], [s * 0.3, 2.12, 0.22]], 0.018, "chrome", 6, 14);
        grip(s * 0.3, 2.12, 0.2, "z", 0.18);
        P([[s * 0.3, 1.25, -0.3], [s * 0.3, 1.28, 0.05], [s * 0.26, 1.28, 0.3]], 0.022, "chrome", 6, 14);
        grip(s * 0.26, 1.28, 0.24, "z", 0.18);
      });
      G(0, 0.62, 0.12, -0.2, 0, 0, () => RB(0.46, 0.08, 0.42, 0.04, "pad", 0, 0, 0));
      T([0, 0.06, 0.0], [0, 0.6, 0.1], 0.04, "frame");
      RB(0.4, 0.05, 0.22, 0.01, "rubberGrip", 0, 0.9, -0.08);
    },
    cable_crossover() {
      RB(4.2, 0.05, 1.0, 0.02, "frame", 0, 0.025, 0);
      B(2.6, 0.012, 0.8, "rubberGrip", 0, 0.056, 0.05);
      mirrorX((s) => {
        G(s * 1.85, 0, 0, 0, 0, 0, () => {
          stack(2.4, -0.15, 0.48);
          mirrorX((t) => RB(0.06, 2.2, 0.06, 0.015, "chrome", t * 0.12, 1.15, 0.28));
          RB(0.2, 0.12, 0.12, 0.03, "frame", 0, 1.6, 0.3);
          CY(0.045, 0.04, "steel", 0, 1.55, 0.38, "x", 14);
          P([[0, 1.55, 0.42], [-s * 0.15, 1.3, 0.55], [-s * 0.28, 1.1, 0.6]], 0.006, "rubber", 4, 10);
          grip(-s * 0.3, 1.04, 0.6, "y", 0.14);
        });
      });
      RB(3.8, 0.1, 0.1, 0.02, "frame", 0, 2.42, -0.15);
      P([[-0.7, 2.25, 0.1], [-0.5, 2.3, 0.1], [0.5, 2.3, 0.1], [0.7, 2.25, 0.1]], 0.016, "chrome", 6, 16);
      mirrorX((s) => T([s * 0.6, 2.3, 0.1], [s * 0.6, 2.42, -0.12], 0.02, "frame"));
    },

    // ===== 04 FREE WEIGHTS =====
    mirror_partition() {
      RB(9.4, 2.2, 0.12, 0.01, "frame", 0, 1.1, -0.06);
      B(9.2, 2.0, 0.012, "mirror", 0, 1.15, 0.006);
      B(9.4, 0.025, 0.03, "ledBlue", 0, 2.215, 0.02);
      B(9.4, 0.12, 0.03, "frame", 0, 0.06, 0.02);
    },
    dumbbell_rack() {
      mirrorX((s) => {
        RB(0.07, 0.95, 0.72, 0.02, "frame", s * 1.22, 0.475, 0);
        RB(0.06, 0.06, 0.78, 0.02, "frame", s * 1.22, 0.03, 0);
      });
      RB(0.06, 0.9, 0.06, 0.02, "frame", 0, 0.45, -0.1);
      G(0, 0.48, 0.16, 0.22, 0, 0, () => B(2.42, 0.035, 0.32, "frame", 0, 0, 0));
      G(0, 0.86, -0.14, 0.22, 0, 0, () => B(2.42, 0.035, 0.3, "frame", 0, 0, 0));
      for (let i = 0; i < 6; i++) {
        const x = -0.98 + i * 0.39;
        dumbbell(x - 0.09, 0.56, 0.2, 24 + i * 4, "z");
        dumbbell(x + 0.09, 0.56, 0.2, 24 + i * 4, "z");
        dumbbell(x - 0.08, 0.93, -0.1, 4 + i * 3, "z");
        dumbbell(x + 0.08, 0.93, -0.1, 4 + i * 3, "z");
      }
    },
    plate_tree() {
      RB(0.62, 0.05, 0.62, 0.02, "frame", 0, 0.025, 0);
      CY(0.035, 1.2, "frame", 0, 0.62, 0, "y", 12);
      [[0.32, 0.225, 0], [0.32, 0.225, Math.PI], [0.7, 0.19, Math.PI / 2], [0.7, 0.19, -Math.PI / 2], [1.02, 0.13, 0], [1.02, 0.13, Math.PI]].forEach(([y, r, a]) => {
        G(0, y, 0, 0, a, 0, () => {
          CY(0.022, 0.24, "chrome", 0, 0, 0.12, "z", 8);
          [0, 1, 2].forEach((i) => plate(r, 0.04, 0, 0, 0.08 + i * 0.045, "z"));
        });
      });
    },
    adjustable_bench() {
      RB(0.07, 0.07, 1.25, 0.02, "frame", 0, 0.16, 0);
      RB(0.5, 0.06, 0.08, 0.02, "frame", 0, 0.04, -0.58);
      RB(0.4, 0.06, 0.08, 0.02, "frame", 0, 0.04, 0.58);
      mirrorX((s) => CY(0.04, 0.03, "rubber", s * 0.15, 0.05, 0.62, "x", 12));
      T([0, 0.06, -0.58], [0, 0.16, -0.5], 0.03, "frame");
      T([0, 0.06, 0.58], [0, 0.16, 0.5], 0.03, "frame");
      RB(0.3, 0.09, 0.4, 0.035, "pad", 0, 0.45, 0.36);
      T([0, 0.18, 0.36], [0, 0.4, 0.36], 0.03, "frame");
      G(0, 0.58, -0.18, 0.38, 0, 0, () => RB(0.3, 0.09, 0.82, 0.035, "pad", 0, 0, 0));
      T([0, 0.18, -0.15], [0, 0.48, -0.3], 0.025, "frame");
    },
    lifting_platform() {
      RB(3.0, 0.05, 2.4, 0.01, "frame", 0, 0.025, 0);
      B(1.2, 0.012, 2.36, "oak", 0, 0.056, 0);
      mirrorX((s) => B(0.86, 0.012, 2.36, "rubber", s * 1.05, 0.056, 0));
    },
    power_rack() {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        RB(0.075, 2.3, 0.075, 0.012, "frame", sx * 0.6, 1.2, sz * 0.55);
        for (let i = 0; i < 14; i++) B(0.012, 0.03, 0.002, "rubber", sx * 0.6, 0.5 + i * 0.1, sz * 0.55 + sz * 0.0385);
      });
      mirrorX((s) => {
        RB(0.075, 0.075, 1.18, 0.012, "frame", s * 0.6, 2.32, 0);
        RB(0.075, 0.06, 1.25, 0.012, "frame", s * 0.6, 0.06, 0);
        RB(0.05, 0.05, 1.25, 0.01, "steel", s * 0.6, 0.62, 0.0);
        B(0.08, 0.1, 0.08, "steel", s * 0.6, 1.36, 0.6);
        // plate storage horns on the back uprights
        CY(0.026, 0.3, "chrome", s * 0.78, 0.4, -0.55, "x", 10);
        [0, 1].forEach((i) => plate(0.225, 0.05, s * (0.72 + i * 0.055), 0.4, -0.55));
      });
      RB(1.28, 0.075, 0.075, 0.012, "frame", 0, 2.32, -0.55);
      RB(1.28, 0.075, 0.075, 0.012, "frame", 0, 2.32, 0.55);
      P([[-0.55, 2.25, 0.55], [-0.4, 2.3, 0.6], [0.4, 2.3, 0.6], [0.55, 2.25, 0.55]], 0.016, "chrome", 6, 14);
      barbellX(1.4, 0.6, 2.2, [0.225, 0.225, 0.19]);
    },

    // ===== 05 FUNCTIONAL =====
    functional_rig() {
      const xs = [-2.9, -1.45, 0, 1.45, 2.9];
      xs.forEach((x) => {
        [-0.85, 0.85].forEach((z) => RB(0.085, 2.8, 0.085, 0.012, "frame", x, 1.4, z));
        RB(0.085, 0.085, 1.78, 0.012, "frame", x, 2.76, 0);
      });
      [-0.85, 0.85].forEach((z) => RB(5.88, 0.085, 0.085, 0.012, "frame", 0, 2.76, z));
      // monkey bars + pull-up bars
      for (let i = 0; i < 9; i++) CY(0.016, 1.62, "chrome", -2.2 + i * 0.55, 2.68, 0, "z", 8);
      [-2.175, -0.725, 0.725, 2.175].forEach((x) => CY(0.016, 1.38, "chrome", x, 2.45, 0.85, "x", 8));
      // suspension straps
      [-0.725, 2.175].forEach((x) => mirrorX((s) => {
        B(0.035, 1.3, 0.012, "accent", x + s * 0.07, 1.98, 0.4);
        grip(x + s * 0.07, 1.3, 0.4, "x", 0.12);
      }));
      // heavy bag
      T([-2.175, 2.72, -0.3], [-2.175, 2.0, -0.3], 0.006, "steel");
      CY(0.17, 1.0, "leather", -2.175, 1.45, -0.3, "y", 18);
      // lower storage: medicine balls and plates
      RB(5.8, 0.05, 0.4, 0.01, "frame", 0, 0.35, -0.65);
      for (let i = 0; i < 8; i++) S(0.14, i % 3 ? "rubber" : "accent", -2.4 + i * 0.68, 0.53, -0.65, 1, 1, 1, 14);
      // wall-ball target
      RB(0.4, 0.4, 0.04, 0.02, "white", 1.45, 2.3, -0.88);
    },
    sled_lane() {
      // plane facing up: canvas top -> away from the street, so the marks read from the default view
      add("track", new THREE.PlaneGeometry(10, 1.4).rotateX(-Math.PI / 2), 0, 0.008, 0);
      B(10.04, 0.006, 1.44, "rubber", 0, 0.003, 0);
      G(4.0, 0, 0, 0, Math.PI / 2, 0, () => {
        RB(0.6, 0.04, 0.9, 0.02, "steel", 0, 0.05, 0);
        mirrorX((s) => RB(0.05, 0.05, 1.0, 0.02, "frame", s * 0.26, 0.025, 0));
        mirrorX((s) => {
          T([s * 0.22, 0.06, -0.3], [s * 0.22, 1.05, -0.48], 0.022, "frame");
          grip(s * 0.22, 1.0, -0.47, "y", 0.2);
        });
        CY(0.026, 0.35, "chrome", 0, 0.24, 0.15, "y", 10);
        [0, 1].forEach((i) => plate(0.225, 0.05, 0, 0.1 + i * 0.055, 0.15, "y"));
      });
    },
    battle_ropes() {
      RB(0.3, 0.06, 0.3, 0.02, "frame", 0, 0.03, 0);
      TOR(0.06, 0.012, "steel", 0, 0.12, 0, 0, 0);
      mirrorX((s) => {
        const pts = [];
        for (let i = 0; i <= 12; i++) {
          const t = i / 12;
          pts.push([s * (0.05 + t * 0.35) + Math.sin(t * 9 + (s > 0 ? 0 : 1.5)) * 0.06 * t, 0.05 + Math.abs(Math.sin(t * 7)) * 0.08 * t, 0.1 + t * 3.3]);
        }
        P(pts, 0.022, "rubber", 6, 60);
      });
    },
    plyo_box() {
      RB(0.76, 0.6, 0.6, 0.03, "oak", 0, 0.3, 0);
      RB(0.74, 0.012, 0.58, 0.004, "rubberGrip", 0, 0.605, 0);
      B(0.4, 0.08, 0.006, "frame", 0, 0.4, 0.3);
    },
    kettlebell_rack() {
      mirrorX((s) => RB(0.05, 0.6, 0.45, 0.01, "frame", s * 0.6, 0.3, 0));
      [0.12, 0.52].forEach((y) => B(1.2, 0.03, 0.45, "frame", 0, y, 0));
      [0.08, 0.1, 0.12, 0.14].forEach((r, i) => kettlebell(-0.42 + i * 0.28, 0.0, r * 0.85, 0.135, i === 2 ? "accent" : "plate"));
      [0.07, 0.08, 0.09, 0.1].forEach((r, i) => kettlebell(-0.42 + i * 0.28, 0.0, r * 0.85, 0.535, "plate"));
    },
    medicine_ball() {
      S(0.17, "rubber", 0, 0.17, 0, 1, 1, 1, 18);
      TOR(0.17, 0.006, "accent", 0, 0.17, 0, Math.PI / 2, 0, Math.PI * 2, 28);
    },

    // ===== 06 MOBILITY =====
    wall_bars() {
      mirrorX((s) => RB(0.07, 2.5, 0.06, 0.01, "oak", s * 0.42, 1.25, 0.06));
      for (let i = 0; i < 15; i++) CY(0.018, 0.84, "oak", 0, 0.16 + i * 0.155, 0.06, "x", 10);
    },
    mirror_panel() {
      RB(3.0, 2.0, 0.03, 0.005, "frame", 0, 1.2, -0.01);
      B(2.94, 1.94, 0.01, "mirror", 0, 1.2, 0.01);
    },
    mat() { RB(0.62, 0.012, 1.82, 0.005, "mat", 0, 0.006, 0); },
    stability_ball() { S(0.32, "matLight", 0, 0.32, 0, 1, 0.97, 1, 20); },
    mobility_shelf() {
      RB(1.6, 1.4, 0.4, 0.01, "oak", 0, 0.7, -0.02);
      [0.06, 0.5, 0.94].forEach((y, r) => {
        B(1.52, 0.02, 0.36, "walnut", 0, y + 0.02, 0.0);
        if (r === 0) for (let i = 0; i < 4; i++) CY(0.075, 0.34, i % 2 ? "mat" : "matLight", -0.55 + i * 0.36, y + 0.11, 0.0, "z", 14);
        if (r === 1) for (let i = 0; i < 6; i++) RB(0.22, 0.12, 0.15, 0.02, "mat", -0.6 + i * 0.24, y + 0.09, 0.0);
        if (r === 2) for (let i = 0; i < 5; i++) TOR(0.08, 0.012, i % 2 ? "accent" : "mat", -0.56 + i * 0.28, y + 0.12, 0.0, 0, 0);
      });
    },
    stretch_station() {
      RB(1.4, 0.09, 0.62, 0.04, "pad", 0, 0.48, 0.12);
      mirrorX((s) => { RB(0.06, 0.43, 0.06, 0.01, "frame", s * 0.62, 0.215, 0.36); RB(0.06, 0.43, 0.06, 0.01, "frame", s * 0.62, 0.215, -0.12); });
      mirrorX((s) => RB(0.07, 1.65, 0.07, 0.015, "frame", s * 0.74, 0.825, -0.42));
      [0.6, 1.0, 1.4].forEach((y) => CY(0.018, 1.48, "chrome", 0, y, -0.42, "x", 8));
      RB(1.55, 0.07, 0.07, 0.015, "frame", 0, 1.65, -0.42);
    },

    // ===== 07 GROUP STUDIO =====
    mirror_wall() {
      B(8.0, 2.3, 0.02, "mirror", 0, 1.3, 0);
      B(8.0, 0.12, 0.04, "walnut", 0, 0.06, 0.01);
      CY(0.022, 7.8, "oak", 0, 1.02, 0.18, "x", 10);
      for (let i = 0; i < 5; i++) T([-3.6 + i * 1.8, 1.02, 0.18], [-3.6 + i * 1.8, 1.02, 0.01], 0.012, "chrome");
      B(8.0, 0.025, 0.03, "ledWarm", 0, 2.47, 0.02);
    },
    podium() {
      RB(2.0, 0.24, 1.2, 0.02, "walnut", 0, 0.12, 0);
      B(2.0, 0.015, 0.02, "ledWarm", 0, 0.06, 0.61);
      RB(0.65, 0.012, 1.0, 0.005, "mat", 0, 0.246, 0);
      CY(0.02, 1.1, "frame", 0.8, 0.79, -0.4, "y", 8);
      RB(0.26, 0.18, 0.04, 0.01, "screen", 0.8, 1.38, -0.4, 0.3);
    },
    training_position() {
      // mat along z, step beside it, light dumbbells at the head of the mat
      RB(0.6, 0.012, 1.2, 0.005, "mat", -0.12, 0.006, 0);
      G(0.42, 0, 0, 0, Math.PI / 2, 0, () => {
        RB(0.8, 0.12, 0.3, 0.03, "frame", 0, 0.08, 0);
        RB(0.78, 0.015, 0.28, 0.005, "rubberGrip", 0, 0.145, 0);
        mirrorX((s) => RB(0.06, 0.08, 0.32, 0.01, "rubber", s * 0.3, 0.04, 0));
      });
      dumbbell(-0.24, 0.05, 0.5, 3, "x");
      dumbbell(0.0, 0.05, 0.5, 3, "x");
    },
    storage_wall() {
      RB(4.0, 2.2, 0.5, 0.01, "oak", 0, 1.1, 0);
      for (let c = 0; c < 4; c++) for (let r = 0; r < 3; r++) {
        const x = -1.5 + c, y = 0.42 + r * 0.66;
        B(0.9, 0.56, 0.02, "walnut", x, y, -0.2);
        if (r === 0) for (let i = 0; i < 4; i++) RB(0.8, 0.1, 0.3, 0.02, "frame", x, y - 0.22 + i * 0.11, 0.0);
        if (r === 1) for (let i = 0; i < 3; i++) S(0.12, c % 2 ? "rubber" : "accent", x - 0.28 + i * 0.28, y - 0.15, 0.0, 1, 1, 1, 12);
        if (r === 2) for (let i = 0; i < 4; i++) CY(0.07, 0.4, "mat", x - 0.3 + i * 0.2, y - 0.18, 0.0, "z", 12);
      }
    },
    speaker() {
      RB(0.32, 0.5, 0.28, 0.03, "frame", 0, 2.45, 0);
      CY(0.1, 0.02, "rubber", 0, 2.38, 0.14, "z", 18);
      CY(0.04, 0.02, "rubber", 0, 2.6, 0.14, "z", 14);
    },

    // ===== 08 INDOOR CYCLING =====
    led_screen() {
      RB(6.2, 2.1, 0.08, 0.01, "frame", 0, 1.95, -0.02);
      B(6.0, 1.9, 0.01, "screenBright", 0, 1.95, 0.025);
      B(6.4, 0.03, 0.03, "ledBlue", 0, 0.8, 0.02);
    },
    instructor_bike() {
      RB(2.0, 0.34, 1.6, 0.03, "frame", 0, 0.17, 0);
      B(2.0, 0.02, 0.02, "ledBlue", 0, 0.33, 0.8);
      B(0.02, 0.02, 1.6, "ledBlue", 1.0, 0.33, 0);
      B(0.02, 0.02, 1.6, "ledBlue", -1.0, 0.33, 0);
      G(0, 0, 0, 0, Math.PI, 0, () => spinBike(0.34));
    },
    riser() {
      RB(9.8, 0.2, 1.5, 0.01, "darkStep", 0, 0.1, 0);
      B(9.8, 0.02, 0.03, "ledBlue", 0, 0.19, -0.75);
    },
    riser_high() {
      RB(9.8, 0.4, 1.5, 0.01, "darkStep", 0, 0.2, 0);
      B(9.8, 0.02, 0.03, "ledBlue", 0, 0.39, -0.75);
    },
    spin_bike() { spinBike(0); },

    // ===== 09 CHANGING ROOMS =====
    locker() {
      RB(0.4, 1.86, 0.5, 0.006, "oakLocker", 0, 1.0, 0);
      B(0.4, 0.08, 0.46, "frame", 0, 0.04, -0.01);
      B(0.39, 0.006, 0.006, "frame", 0, 1.0, 0.252);
      [0.55, 1.45].forEach((y) => { B(0.05, 0.06, 0.01, "screen", 0.12, y + 0.15, 0.254); B(0.012, 0.18, 0.012, "frame", -0.14, y, 0.256); });
    },
    shower() {
      RB(1.0, 0.04, 1.0, 0.01, "stone", 0, 0.02, 0);
      B(0.7, 0.006, 0.08, "steel", 0, 0.043, -0.38);
      B(1.0, 2.05, 0.015, "glass", 0, 1.07, 0.49);
      B(0.015, 2.05, 1.0, "glass", 0.49, 1.07, 0);
      B(0.03, 2.05, 0.03, "frame", 0.49, 1.07, 0.49);
      B(1.0, 0.03, 0.03, "frame", 0, 2.1, 0.49);
      T([0, 2.1, -0.48], [0, 2.12, -0.28], 0.012, "chrome");
      CY(0.13, 0.015, "chrome", 0, 2.11, -0.22, "y", 24);
      B(0.08, 0.16, 0.05, "chrome", 0.25, 1.1, -0.47);
      B(0.4, 0.25, 0.08, "tile", -0.2, 1.3, -0.46);
    },
    changing_bench() {
      for (let i = 0; i < 5; i++) RB(1.6, 0.03, 0.075, 0.01, "oak", 0, 0.45, -0.17 + i * 0.085);
      mirrorX((s) => { RB(0.05, 0.43, 0.38, 0.01, "frame", s * 0.68, 0.215, 0); });
      B(1.36, 0.03, 0.03, "frame", 0, 0.12, 0);
    },
    vanity() {
      RB(1.0, 0.45, 0.5, 0.01, "oakLocker", 0, 0.62, 0);
      RB(1.04, 0.05, 0.52, 0.01, "stone", 0, 0.86, 0);
      CY(0.17, 0.02, "white", 0, 0.88, 0.02, "y", 24);
      T([0, 0.86, -0.2], [0, 1.05, -0.18], 0.012, "chrome");
      T([0, 1.05, -0.18], [0, 1.03, -0.06], 0.01, "chrome");
      RB(0.9, 0.9, 0.03, 0.02, "mirror", 0, 1.5, -0.235);
      B(0.92, 0.02, 0.02, "ledWarm", 0, 1.96, -0.22);
      B(0.92, 0.02, 0.02, "ledWarm", 0, 1.04, -0.22);
    },

    // ===== 10 RECOVERY =====
    sauna() {
      const w = 2.4, d = 2.0, h = 2.1;
      for (let i = 0; i < 14; i++) {
        const y = 0.08 + i * 0.145;
        B(w, 0.13, 0.06, "sauna", 0, y, -d / 2 + 0.03);
        mirrorX((s) => B(0.06, 0.13, d - 0.06, "sauna", s * (w / 2 - 0.03), y, 0.0));
      }
      B(w, 0.04, d, "saunaDark", 0, 0.02, 0);
      RB(w - 0.04, 0.06, 0.06, 0.01, "frame", 0, h - 0.03, d / 2 - 0.03);
      RB(0.06, h, 0.06, 0.01, "frame", -w / 2 + 0.03, h / 2, d / 2 - 0.03);
      RB(0.06, h, 0.06, 0.01, "frame", w / 2 - 0.03, h / 2, d / 2 - 0.03);
      B(w - 0.1, h - 0.1, 0.012, "glass", 0, h / 2, d / 2 - 0.03);
      B(0.03, 0.4, 0.03, "sauna", -0.3, 1.0, d / 2 + 0.01);
      // two bench tiers
      [[0.45, -0.25, 0.55], [0.9, -0.7, 0.5]].forEach(([y, z, dd]) => {
        for (let i = 0; i < 5; i++) B(w - 0.14, 0.03, dd / 5 - 0.015, "sauna", 0, y, z - dd / 2 + (i + 0.5) * (dd / 5));
        B(w - 0.14, y - 0.03, 0.03, "saunaDark", 0, (y - 0.03) / 2, z + dd / 2);
        B(w - 0.14, 0.012, 0.02, "ledWarm", 0, y - 0.04, z + dd / 2 + 0.02);
      });
      RB(0.42, 0.62, 0.36, 0.02, "frame", w / 2 - 0.35, 0.31, d / 2 - 0.4);
      for (let i = 0; i < 9; i++) S(0.055, "rock", w / 2 - 0.47 + (i % 3) * 0.12, 0.66 + Math.floor(i / 3) * 0.03, d / 2 - 0.5 + Math.floor(i / 3) * 0.1, 1, 0.8, 1, 8);
    },
    cold_plunge() {
      RB(2.0, 0.9, 1.1, 0.06, "frame", 0, 0.45, 0);
      // stone rim (open in the middle) around the water
      mirrorX((t) => { B(2.04, 0.045, 0.12, "stone", 0, 0.92, t * 0.51); B(0.12, 0.045, 0.9, "stone", t * 0.96, 0.92, 0); });
      B(1.82, 0.012, 0.92, "water", 0, 0.906, 0);
      B(1.8, 0.02, 0.02, "ledBlue", 0, 0.9, 0.455);
      P([[0.8, 0.92, 0.45], [0.8, 1.2, 0.5], [0.8, 1.2, 0.68], [0.8, 0.3, 0.72]], 0.016, "chrome", 6, 18);
      RB(0.6, 0.18, 0.35, 0.02, "stone", 0.55, 0.09, 0.75);
      RB(0.5, 0.6, 0.4, 0.03, "frame", -1.3, 0.3, -0.3);
    },
    massage_table() {
      RB(0.72, 0.1, 1.9, 0.04, "fabricLight", 0, 0.72, 0);
      CY(0.06, 0.11, "frame", 0, 0.72, 0.85, "y", 14);
      mirrorX((s) => [[-0.75], [0.75]].forEach(([z]) => T([s * 0.3, 0.0, z], [s * 0.3, 0.67, z], 0.025, "oak")));
      mirrorX((s) => T([s * 0.3, 0.2, -0.75], [s * 0.3, 0.2, 0.75], 0.015, "oak"));
      CY(0.07, 0.6, "white", 0, 0.82, -0.6, "x", 12);
    },
    compression_lounger() {
      G(0, 0.42, 0, 0, 0, 0, () => {
        RB(0.7, 0.1, 0.62, 0.04, "leather", 0, 0, -0.05, -0.1);
        RB(0.7, 0.72, 0.1, 0.04, "leather", 0, 0.32, -0.5, -0.45);
        RB(0.64, 0.08, 0.7, 0.04, "leather", 0, 0.08, 0.55, 0.3);
      });
      mirrorX((s) => P([[s * 0.32, 0.02, -0.7], [s * 0.34, 0.36, -0.2], [s * 0.34, 0.4, 0.4], [s * 0.32, 0.02, 0.8]], 0.02, "chrome", 6, 18));
      mirrorX((s) => CY(0.09, 0.6, "fabricDark", s * 0.13, 0.62, 0.6, "z", 14));
      RB(0.26, 0.18, 0.12, 0.03, "frame", 0.5, 0.09, 0.2);
    },
    stretch_bench() {
      RB(0.8, 0.1, 2.0, 0.04, "pad", 0, 0.6, 0);
      mirrorX((s) => [[-0.85], [0.85]].forEach(([z]) => RB(0.06, 0.55, 0.06, 0.01, "frame", s * 0.33, 0.275, z)));
      B(0.7, 0.03, 1.8, "frame", 0, 0.2, 0);
      for (let i = 0; i < 3; i++) RB(0.5, 0.06, 0.3, 0.02, "white", 0, 0.24, -0.5 + i * 0.4);
    },
  };

  const fallback = () => RB(0.6, 0.8, 0.6, 0.04, "frame", 0, 0.4, 0);

  /** [{ mat, geometry }] — one merged geometry per material, cached per key. */
  function get(key) {
    if (cache.has(key)) return cache.get(key);
    parts = [];
    (BUILD[key] || fallback)();
    const byMat = new Map();
    parts.forEach(([mat, g]) => {
      ["uv2", "uv1"].forEach((a) => g.deleteAttribute && g.getAttribute(a) && g.deleteAttribute(a));
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push(g.index ? g : g);
    });
    const result = [...byMat].map(([mat, list]) => {
      const geometry = list.length === 1 ? list[0] : mergeGeometries(list, false);
      list.forEach((g) => { if (g !== geometry) g.dispose(); });
      return { mat, geometry };
    });
    parts = null;
    cache.set(key, result);
    return result;
  }

  return { get, has: (key) => key in BUILD };
}
