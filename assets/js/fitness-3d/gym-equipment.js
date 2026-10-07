/*
 * Fitness planner — simplified, recognisable equipment (procedural, low-poly).
 *
 * Each equipment key from assets/data/gym-zones.json maps to a builder that
 * composes a few primitives. The parts of one model are merged into ONE
 * geometry per material, built once and cached, so the scene can draw every
 * copy of it with a single InstancedMesh per material (see gym-scene.js).
 *
 * Conventions: metres; origin at the footprint centre on the floor (y = 0);
 * the user side / console faces +Z. Footprints match ITEM sizes in gym-scene.js.
 *
 * To use real assets later, replace a builder with a GLB mesh of the same key
 * (see the "equipment" naming notes in the planner report / README).
 */
export function createEquipmentLibrary(THREE, mergeGeometries) {
  const cache = new Map();
  let parts = null; // [matKey, geometry][] collected by the current builder

  // ---------- primitive helpers (y = centre height) ----------
  const add = (mat, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => {
    if (rx) g.rotateX(rx);
    if (ry) g.rotateY(ry);
    if (rz) g.rotateZ(rz);
    g.translate(x, y, z);
    parts.push([mat, g]);
  };
  const B = (w, h, d, mat, x, y, z, rx, ry, rz) => add(mat, new THREE.BoxGeometry(w, h, d), x, y, z, rx, ry, rz);
  const C = (r, len, mat, x, y, z, axis = "y", seg = 18) => {
    const g = new THREE.CylinderGeometry(r, r, len, seg);
    if (axis === "x") g.rotateZ(Math.PI / 2);
    if (axis === "z") g.rotateX(Math.PI / 2);
    add(mat, g, x, y, z);
  };
  const S = (r, mat, x, y, z) => add(mat, new THREE.SphereGeometry(r, 14, 10), x, y, z);
  const ARC = (r, tube, mat, x, y, z) => add(mat, new THREE.TorusGeometry(r, tube, 6, 14, Math.PI), x, y, z);

  // ---------- reusable sub-assemblies ----------
  const barbellAlongX = (y, z, len = 2.2, plateR = 0.225) => {
    C(0.022, len, "steel", 0, y, z, "x", 10);
    C(plateR, 0.06, "rubber", -len / 2 + 0.25, y, z, "x");
    C(plateR, 0.06, "rubber", len / 2 - 0.25, y, z, "x");
  };
  const dumbbellAlongX = (x, y, z, size = 1) => {
    C(0.016, 0.3 * size, "steel", x, y, z, "x", 8);
    C(0.055 * size, 0.07, "rubber", x - 0.11 * size, y, z, "x", 6);
    C(0.055 * size, 0.07, "rubber", x + 0.11 * size, y, z, "x", 6);
  };
  const legs4 = (w, d, h, mat = "steel", t = 0.05) => {
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => B(t, h, t, mat, sx * (w / 2 - t), h / 2, sz * (d / 2 - t)));
  };
  // selectorised strength machine: base, weight-stack tower at the back
  const stackMachine = (w, d, h) => {
    B(w * 0.9, 0.06, d * 0.9, "frame", 0, 0.03, 0);
    const tz = -d / 2 + 0.2;
    B(0.06, h, 0.06, "frame", -0.18, h / 2, tz);
    B(0.06, h, 0.06, "frame", 0.18, h / 2, tz);
    B(0.42, 0.07, 0.3, "frame", 0, h - 0.04, tz);
    B(0.26, h * 0.32, 0.12, "steel", 0, 0.12 + h * 0.16, tz);   // weight stack
    B(0.36, h * 0.55, 0.02, "glass", 0, h * 0.42, tz + 0.17);   // stack shroud
  };
  const spinBike = (oy = 0) => {
    B(0.5, 0.05, 0.08, "frame", 0, oy + 0.03, -0.48);
    B(0.5, 0.05, 0.08, "frame", 0, oy + 0.03, 0.48);
    B(0.07, 0.07, 1.0, "frame", 0, oy + 0.1, 0);
    B(0.05, 0.48, 0.48, "frame", 0, oy + 0.36, 0.3);          // flywheel guard
    C(0.22, 0.03, "steel", 0.05, oy + 0.36, 0.3, "x");         // flywheel
    B(0.06, 0.78, 0.06, "frame", 0, oy + 0.5, -0.22, 0.32);    // seat tube
    B(0.17, 0.06, 0.27, "pad", 0, oy + 0.9, -0.36);            // saddle
    B(0.06, 0.72, 0.06, "frame", 0, oy + 0.55, 0.22, -0.3);    // handle tube
    B(0.44, 0.04, 0.2, "steel", 0, oy + 0.98, 0.36);           // handlebar
  };

  // ---------- builders (front = +Z) ----------
  const BUILD = {
    // RECEPTION
    reception_desk() {
      B(4.2, 1.0, 0.08, "wood", 0, 0.5, 0.41);
      B(4.2, 0.05, 0.9, "stone", 0, 1.05, 0);
      B(0.06, 1.0, 0.9, "wood", -2.07, 0.5, 0); B(0.06, 1.0, 0.9, "wood", 2.07, 0.5, 0);
      B(3.9, 0.04, 0.55, "wood", 0, 0.75, -0.12);
      B(0.5, 0.32, 0.03, "screen", -0.9, 1.25, -0.15, -0.1);
      B(0.5, 0.32, 0.03, "screen", 0.9, 1.25, -0.15, -0.1);
    },
    access_gate() {
      B(0.22, 1.0, 1.15, "steel", 0, 0.5, 0);
      B(0.02, 0.75, 0.55, "glass", 0.32, 0.65, 0.1);
    },
    waiting_bench() {
      B(1.8, 0.12, 0.5, "pad", 0, 0.42, 0);
      B(1.8, 0.4, 0.1, "pad", 0, 0.68, -0.22, -0.15);
      B(0.05, 0.36, 0.45, "frame", -0.85, 0.18, 0); B(0.05, 0.36, 0.45, "frame", 0.85, 0.18, 0);
    },
    retail_wall() {
      B(2.4, 2.0, 0.05, "wood", 0, 1.0, -0.17);
      [0.45, 0.95, 1.45].forEach((y) => {
        B(2.4, 0.03, 0.34, "wood", 0, y, 0);
        for (let i = 0; i < 6; i++) C(0.035, 0.2, i % 2 ? "accent" : "screen", -1.0 + i * 0.4, y + 0.115, 0.02, "y", 8);
      });
    },

    // CARDIO
    treadmill() {
      B(0.84, 0.16, 1.95, "frame", 0, 0.08, -0.02);
      B(0.56, 0.02, 1.62, "rubber", 0, 0.17, -0.1);
      B(0.84, 0.16, 0.24, "frame", 0, 0.24, 0.84);                // motor hood
      B(0.07, 1.15, 0.07, "frame", -0.38, 0.75, 0.8, -0.15);
      B(0.07, 1.15, 0.07, "frame", 0.38, 0.75, 0.8, -0.15);
      B(0.8, 0.045, 0.045, "steel", 0, 1.12, 0.72);
      B(0.62, 0.3, 0.07, "screen", 0, 1.33, 0.9, -0.55);
    },
    elliptical() {
      B(0.22, 0.1, 1.9, "frame", 0, 0.05, 0);
      B(0.42, 0.6, 0.46, "frame", 0, 0.4, 0.74);
      B(0.14, 0.05, 0.42, "pad", -0.15, 0.4, -0.3, 0.12);
      B(0.14, 0.05, 0.42, "pad", 0.15, 0.4, -0.3, -0.12);
      B(0.045, 1.35, 0.045, "steel", -0.27, 1.0, 0.36, 0.38);
      B(0.045, 1.35, 0.045, "steel", 0.27, 1.0, 0.36, 0.38);
      B(0.06, 1.25, 0.06, "frame", 0, 1.05, 0.86, -0.15);
      B(0.42, 0.24, 0.06, "screen", 0, 1.62, 0.92, -0.5);
    },
    upright_bike() {
      B(0.55, 0.05, 0.9, "frame", 0, 0.03, 0);
      B(0.12, 0.5, 0.5, "frame", 0, 0.33, 0.22);
      B(0.07, 0.9, 0.07, "frame", 0, 0.52, -0.12, 0.35);
      B(0.26, 0.07, 0.3, "pad", 0, 0.97, -0.32);
      B(0.07, 0.62, 0.07, "frame", 0, 0.84, 0.36, -0.2);
      B(0.5, 0.04, 0.05, "steel", 0, 1.14, 0.44);
      B(0.3, 0.18, 0.05, "screen", 0, 1.25, 0.42, -0.5);
    },
    rower() {
      B(0.11, 0.07, 2.2, "steel", 0, 0.33, -0.08);
      C(0.26, 0.2, "frame", 0, 0.3, 0.98, "x");
      B(0.32, 0.08, 0.34, "pad", 0, 0.41, -0.35);
      B(0.5, 0.06, 0.12, "frame", 0, 0.03, -1.1);
      B(0.5, 0.06, 0.12, "frame", 0, 0.03, 0.9);
      B(0.42, 0.04, 0.16, "rubber", 0, 0.36, 0.62, -0.6);
      B(0.04, 0.42, 0.04, "frame", 0, 0.55, 1.0);
      B(0.3, 0.15, 0.04, "screen", 0, 0.78, 0.98, -0.4);
    },
    stair_climber() {
      B(0.8, 0.2, 1.5, "frame", 0, 0.1, -0.05);
      for (let i = 0; i < 5; i++) B(0.6, 0.05, 0.28, "rubber", 0, 0.3 + i * 0.24, -0.45 + i * 0.2);
      B(0.7, 1.3, 0.06, "frame", 0, 0.85, 0.42, -0.65);
      B(0.06, 1.6, 0.06, "steel", -0.38, 1.0, 0.5);
      B(0.06, 1.6, 0.06, "steel", 0.38, 1.0, 0.5);
      B(0.76, 0.05, 0.05, "steel", 0, 1.78, 0.5);
      B(0.4, 0.22, 0.06, "screen", 0, 1.9, 0.58, -0.4);
    },

    // STRENGTH (selectorised)
    chest_press() {
      stackMachine(1.3, 1.5, 1.6);
      B(0.42, 0.08, 0.42, "pad", 0, 0.48, 0.08);
      B(0.42, 0.66, 0.08, "pad", 0, 0.88, -0.16, 0.1);
      B(0.05, 0.05, 0.5, "steel", -0.45, 1.05, 0.25); B(0.05, 0.05, 0.5, "steel", 0.45, 1.05, 0.25);
      B(0.04, 0.22, 0.04, "steel", -0.45, 1.0, 0.5); B(0.04, 0.22, 0.04, "steel", 0.45, 1.0, 0.5);
    },
    shoulder_press() {
      stackMachine(1.3, 1.5, 1.6);
      B(0.42, 0.08, 0.42, "pad", 0, 0.48, 0.1);
      B(0.42, 0.72, 0.08, "pad", 0, 0.92, -0.14, 0.04);
      B(0.05, 0.4, 0.05, "steel", -0.38, 1.35, 0.1); B(0.05, 0.4, 0.05, "steel", 0.38, 1.35, 0.1);
      B(0.86, 0.04, 0.04, "steel", 0, 1.55, 0.12);
    },
    lat_pulldown() {
      stackMachine(1.2, 1.5, 2.2);
      B(0.4, 0.08, 0.36, "pad", 0, 0.5, 0.32);
      C(0.07, 0.45, "pad", 0, 0.74, 0.5, "x");
      B(0.06, 0.06, 0.6, "frame", 0, 2.15, -0.15);
      B(1.1, 0.04, 0.04, "steel", 0, 1.85, 0.42);
      B(0.012, 0.32, 0.012, "steel", 0, 2.02, 0.42);
    },
    seated_row() {
      stackMachine(1.2, 1.6, 1.6);
      B(0.4, 0.08, 0.5, "pad", 0, 0.45, -0.02);
      B(0.36, 0.48, 0.08, "pad", 0, 0.82, 0.44);
      B(0.52, 0.04, 0.04, "steel", 0, 0.95, 0.6);
      B(0.06, 0.6, 0.06, "frame", 0, 0.42, 0.44);
    },
    leg_press() {
      B(1.3, 0.06, 2.1, "frame", 0, 0.03, 0);
      B(0.05, 0.05, 1.9, "steel", -0.34, 0.55, 0, -0.28); B(0.05, 0.05, 1.9, "steel", 0.34, 0.55, 0, -0.28);
      B(0.55, 0.08, 0.5, "pad", 0, 0.42, -0.1);
      B(0.55, 0.08, 0.7, "pad", 0, 0.68, -0.55, -0.75);
      B(0.72, 0.62, 0.06, "steel", 0, 0.82, 0.86, 0.3);
      C(0.22, 0.05, "rubber", -0.55, 0.62, -0.75, "x"); C(0.22, 0.05, "rubber", 0.55, 0.62, -0.75, "x");
    },
    leg_extension() {
      stackMachine(1.1, 1.4, 1.5);
      B(0.42, 0.08, 0.45, "pad", 0, 0.5, 0.05);
      B(0.42, 0.6, 0.08, "pad", 0, 0.85, -0.18, 0.12);
      C(0.07, 0.42, "pad", 0, 0.3, 0.42, "x");
      B(0.05, 0.35, 0.05, "steel", 0.25, 0.42, 0.34);
    },
    leg_curl() {
      stackMachine(1.1, 1.6, 1.5);
      B(0.4, 0.1, 1.15, "pad", 0, 0.78, 0.12, 0.1);
      B(0.08, 0.7, 0.08, "frame", 0, 0.38, 0.12);
      C(0.07, 0.42, "pad", 0, 0.68, 0.72, "x");
      B(0.3, 0.06, 0.3, "pad", 0, 0.98, -0.36);
    },
    cable_crossover() {
      [-1.85, 1.85].forEach((x) => {
        B(0.4, 2.3, 0.35, "frame", x, 1.15, 0);
        B(0.22, 0.9, 0.04, "steel", x, 0.6, 0.19);
        C(0.05, 0.04, "steel", x * 0.92, 2.15, 0.2, "z", 10);
      });
      B(4.1, 0.09, 0.12, "frame", 0, 2.27, 0);
      B(1.2, 0.05, 0.05, "steel", 0, 2.1, 0.05);
    },

    // FREE WEIGHTS
    power_rack() {
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => B(0.075, 2.3, 0.075, "frame", sx * 0.62, 1.15, sz * 0.62));
      B(1.32, 0.07, 0.07, "frame", 0, 2.27, -0.62); B(1.32, 0.07, 0.07, "frame", 0, 2.27, 0.62);
      B(0.07, 0.07, 1.32, "frame", -0.62, 2.27, 0); B(0.07, 0.07, 1.32, "frame", 0.62, 2.27, 0);
      B(0.06, 0.06, 1.3, "frame", -0.62, 0.45, 0); B(0.06, 0.06, 1.3, "frame", 0.62, 0.45, 0); // safeties
      barbellAlongX(1.35, 0.62);
      B(1.4, 0.03, 1.4, "rubber", 0, 0.015, 0);
    },
    adjustable_bench() {
      B(0.06, 0.06, 1.25, "frame", 0, 0.12, 0);
      B(0.48, 0.06, 0.06, "frame", 0, 0.03, -0.6); B(0.48, 0.06, 0.06, "frame", 0, 0.03, 0.6);
      B(0.3, 0.08, 0.42, "pad", 0, 0.45, 0.38);
      B(0.3, 0.08, 0.85, "pad", 0, 0.6, -0.2, 0.42);
      B(0.06, 0.4, 0.06, "frame", 0, 0.27, 0.35);
    },
    dumbbell_rack() {
      B(0.06, 0.85, 0.7, "frame", -1.2, 0.43, 0); B(0.06, 0.85, 0.7, "frame", 1.2, 0.43, 0);
      B(2.4, 0.04, 0.3, "frame", 0, 0.42, 0.16, 0.25);
      B(2.4, 0.04, 0.3, "frame", 0, 0.8, -0.12, 0.25);
      for (let i = 0; i < 7; i++) {
        dumbbellAlongX(-1.02 + i * 0.34, 0.5, 0.16, 1.0 + i * 0.05);
        dumbbellAlongX(-1.02 + i * 0.34, 0.88, -0.12, 0.8 + i * 0.04);
      }
    },
    plate_storage() {
      B(0.6, 0.05, 0.5, "frame", 0, 0.03, 0);
      C(0.03, 1.15, "steel", 0, 0.6, 0);
      [[0.3, 0.225], [0.62, 0.18], [0.92, 0.13]].forEach(([y, r]) => {
        C(0.02, 0.32, "steel", 0, y, 0.12, "z", 8);
        C(r, 0.05, "rubber", 0, y, 0.2, "z");
        C(r, 0.05, "rubber", 0, y, -0.2, "z");
      });
    },
    lifting_platform() {
      B(1.2, 0.05, 2.4, "wood", 0, 0.025, 0);
      B(0.9, 0.05, 2.4, "rubber", -1.05, 0.025, 0);
      B(0.9, 0.05, 2.4, "rubber", 1.05, 0.025, 0);
      barbellAlongX(0.275, 0.2);
    },

    // FUNCTIONAL
    functional_rig() {
      [-2.9, -1.45, 0, 1.45, 2.9].forEach((x) => {
        B(0.08, 2.8, 0.08, "frame", x, 1.4, -0.85);
        B(0.08, 2.8, 0.08, "frame", x, 1.4, 0.85);
        B(0.08, 0.08, 1.7, "frame", x, 2.76, 0);
      });
      B(5.9, 0.08, 0.08, "frame", 0, 2.76, -0.85);
      B(5.9, 0.08, 0.08, "frame", 0, 2.76, 0.85);
      [-2.175, -0.725, 0.725, 2.175].forEach((x) => C(0.02, 1.45, "steel", x, 2.45, 0.85, "x", 8)); // pull-up bars
      [-0.725, 2.175].forEach((x) => {                                                              // suspension straps
        B(0.03, 1.25, 0.012, "accent", x - 0.08, 1.95, 0); B(0.03, 1.25, 0.012, "accent", x + 0.08, 1.95, 0);
      });
    },
    kettlebell_set() {
      B(1.2, 0.04, 0.4, "frame", 0, 0.2, 0);
      legs4(1.2, 0.4, 0.2, "frame", 0.04);
      for (let i = 0; i < 5; i++) {
        const x = -0.48 + i * 0.24, r = 0.06 + i * 0.008;
        S(r, "frame", x, 0.22 + r, 0);
        ARC(r * 0.7, 0.012, "frame", x, 0.22 + r * 1.75, 0);
      }
    },
    medicine_ball() { S(0.17, "pad", 0, 0.17, 0); },
    plyo_box() {
      B(0.75, 0.6, 0.6, "wood", 0, 0.3, 0);
      B(0.76, 0.02, 0.61, "rubber", 0, 0.6, 0);
    },
    sled_lane() {
      B(11, 0.012, 1.4, "turf", 0, 0.006, 0);
      B(11, 0.014, 0.05, "line", 0, 0.008, -0.66); B(11, 0.014, 0.05, "line", 0, 0.008, 0.66);
      B(0.6, 0.08, 0.5, "frame", 4.6, 0.06, 0);
      B(0.05, 0.75, 0.05, "frame", 4.45, 0.45, -0.15, 0, 0, 0.35);
      B(0.05, 0.75, 0.05, "frame", 4.45, 0.45, 0.15, 0, 0, 0.35);
      C(0.18, 0.05, "rubber", 4.7, 0.18, 0, "y");
    },
    suspension_point() {
      B(0.12, 2.6, 0.12, "frame", 0, 1.3, 0);
      B(0.03, 1.2, 0.012, "accent", -0.04, 1.75, 0.08);
      B(0.03, 1.2, 0.012, "accent", 0.04, 1.75, 0.08);
    },

    // MOBILITY
    mat() { B(0.6, 0.015, 1.8, "mat", 0, 0.008, 0); },
    foam_roller() { C(0.075, 0.9, "matDark", 0, 0.075, 0, "x", 14); },
    stretch_station() {
      [[-0.75, -0.5], [0.75, -0.5]].forEach(([x, z]) => B(0.07, 1.6, 0.07, "frame", x, 0.8, z));
      [0.5, 0.9, 1.3].forEach((y) => C(0.02, 1.5, "steel", 0, y, -0.5, "x", 8));
      B(1.4, 0.08, 0.6, "pad", 0, 0.45, 0.1);
      legs4(1.4, 0.6, 0.42, "frame", 0.05);
    },

    // GROUP STUDIO
    training_position() {
      B(0.65, 0.012, 1.5, "mat", 0, 0.006, 0);
      B(0.5, 0.12, 0.26, "frame", 0, 0.06, -0.6);
      dumbbellAlongX(0.22, 0.06, 0.55, 0.6);
    },
    storage_wall() {
      B(4.0, 2.2, 0.5, "wood", 0, 1.1, 0);
      [0.55, 1.1, 1.65].forEach((y) => B(3.9, 0.02, 0.02, "frame", 0, y, 0.255));
      for (let i = 0; i < 4; i++) B(0.012, 2.1, 0.02, "frame", -1.5 + i, 1.1, 0.255);
    },
    mirror_wall() {
      B(8.0, 2.2, 0.04, "mirror", 0, 1.15, 0);
      B(8.0, 0.06, 0.08, "frame", 0, 0.03, 0);
    },
    audio_system() {
      B(0.55, 1.0, 0.4, "frame", 0, 0.5, 0);
      C(0.16, 0.02, "steel", 0, 0.68, 0.21, "z");
      C(0.07, 0.02, "steel", 0, 0.32, 0.21, "z");
    },

    // CYCLING
    spin_bike() { spinBike(0); },
    instructor_platform() {
      B(2.0, 0.3, 1.6, "wood", 0, 0.15, 0);
      spinBike(0.3);
    },
    lighting_control() {
      B(0.4, 1.2, 0.12, "frame", 0, 0.6, 0);
      B(0.3, 0.2, 0.02, "screen", 0, 1.0, 0.07);
    },

    // CHANGING
    locker() {
      B(0.4, 1.9, 0.5, "wood", 0, 0.95, 0);
      B(0.02, 0.12, 0.02, "steel", 0.14, 1.0, 0.26);
      B(0.38, 0.008, 0.008, "frame", 0, 0.95, 0.252);
    },
    shower() {
      B(1.0, 0.05, 1.0, "stone", 0, 0.025, 0);
      B(1.0, 2.0, 0.02, "glass", 0, 1.05, 0.49);
      B(0.02, 2.0, 1.0, "glass", 0.49, 1.05, 0);
      B(0.03, 2.0, 0.03, "steel", -0.45, 1.0, -0.45);
      C(0.1, 0.02, "steel", -0.35, 2.0, -0.35, "y");
    },
    changing_bench() {
      B(1.6, 0.06, 0.45, "wood", 0, 0.45, 0);
      B(0.06, 0.42, 0.4, "frame", -0.7, 0.21, 0); B(0.06, 0.42, 0.4, "frame", 0.7, 0.21, 0);
    },
    vanity_station() {
      B(0.9, 0.8, 0.45, "wood", 0, 0.42, 0);
      B(1.0, 0.06, 0.5, "stone", 0, 0.88, 0);
      B(0.9, 0.8, 0.02, "mirror", 0, 1.4, -0.24);
    },

    // RECOVERY
    stretch_bench() {
      B(0.75, 0.1, 1.9, "pad", 0, 0.58, 0);
      legs4(0.75, 1.9, 0.53, "steel");
    },
    recovery_station() {
      B(0.8, 0.35, 1.0, "frame", 0, 0.18, 0.2);
      B(0.75, 0.12, 0.75, "pad", 0, 0.42, 0.15);
      B(0.75, 0.12, 0.85, "pad", 0, 0.7, -0.5, 0.75);
      B(0.75, 0.1, 0.6, "pad", 0, 0.32, 0.72, -0.45);
    },
    massage_table() {
      B(0.7, 0.1, 1.9, "pad", 0, 0.72, 0);
      C(0.07, 0.1, "matDark", 0, 0.72, 1.0, "y");
      legs4(0.7, 1.8, 0.67, "steel");
    },
  };

  // Fallback for unknown keys: a neutral block of the footprint
  const fallback = (spec) => () => B(spec.w, spec.h, spec.d, "frame", 0, spec.h / 2, 0);

  /** Returns [{ mat, geometry }] — one merged geometry per material. */
  function get(key, spec) {
    if (cache.has(key)) return cache.get(key);
    parts = [];
    (BUILD[key] || fallback(spec))();
    const byMat = new Map();
    parts.forEach(([mat, g]) => {
      if (!byMat.has(mat)) byMat.set(mat, []);
      byMat.get(mat).push(g.index ? g : g); // all primitives are indexed
    });
    const result = [...byMat].map(([mat, list]) => {
      const geometry = list.length === 1 ? list[0] : mergeGeometries(list, false);
      list.forEach((g) => { if (g !== geometry) g.dispose(); });
      geometry.computeBoundingSphere();
      return { mat, geometry };
    });
    parts = null;
    cache.set(key, result);
    return result;
  }

  return { get, has: (key) => key in BUILD };
}
