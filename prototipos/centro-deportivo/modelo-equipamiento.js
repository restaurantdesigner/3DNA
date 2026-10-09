/*
 * Centro Deportivo · multipurpose building — fixtures and furniture.
 * Built with the shared kit (assets/js/shared-3d/archviz.js). Each builder
 * takes the item from plan-furniture.json, so drawn sizes ("size") are used
 * as given. Convention: origin = footprint centre on the floor, front = +z
 * (plan south before rotation), metres.
 */
export function buildFixture(h, it) {
  const { B, RB, CY, S, T, TOR, P, G, mirrorX } = h;
  const [W, D] = it.size || [0, 0];
  switch (it.k) {
    // ---------- plant room ----------
    case "water_tank": {
      CY(0.6, 1.7, "whiteMetal", 0, 0.95, 0, "y", 40);
      CY(0.6, 0.06, "steel", 0, 1.83, 0, "y", 40, 0.5);
      CY(0.62, 0.04, "steel", 0, 1.2, 0, "y", 40);
      [0, 2.1, 4.2].forEach((a) => T([Math.sin(a) * 0.45, 0, Math.cos(a) * 0.45], [Math.sin(a) * 0.5, 0.12, Math.cos(a) * 0.5], 0.03, "steel"));
      T([0.45, 0.6, 0.35], [0.45, 2.3, 0.35], 0.025, "copper"); T([-0.45, 1.5, 0.35], [-0.45, 2.3, 0.35], 0.025, "copper");
      RB(0.22, 0.3, 0.12, 0.02, "white", 0.0, 1.4, 0.62);
      break;
    }
    case "tech_cabinet": {
      RB(0.67, 1.9, 0.3, 0.01, "greyPanel", 0, 0.95, 0);
      B(0.004, 1.8, 0.01, "dark", 0, 0.95, 0.152);
      B(0.5, 0.25, 0.01, "dark", 0, 1.5, 0.153);
      [0.4, 0.5, 0.6].forEach((y) => B(0.08, 0.04, 0.01, "accentGreen", -0.2, y + 1.0, 0.155));
      break;
    }
    // ---------- sanitary ----------
    case "washbasin": {
      RB(0.55, 0.16, 0.45, 0.06, "ceramic", 0, 0.8, 0.0);
      B(0.4, 0.02, 0.28, "ceramicShadow", 0, 0.89, 0.04);
      CY(0.025, 0.36, "chrome", 0, 0.62, -0.08, "y", 10);
      T([0, 0.88, -0.17], [0, 1.02, -0.17], 0.012, "chrome"); T([0, 1.02, -0.17], [0, 1.0, -0.05], 0.01, "chrome");
      RB(0.5, 0.7, 0.01, 0.005, "mirror", 0, 1.45, -0.222);
      break;
    }
    case "wc": {
      RB(0.36, 0.06, 0.2, 0.02, "ceramic", 0, 0.75, -0.3);           // flush plate / cistern
      B(0.18, 0.12, 0.01, "chrome", 0, 1.0, -0.214);
      RB(0.38, 0.36, 0.54, 0.16, "ceramic", 0, 0.22, 0.02);           // bowl
      RB(0.37, 0.03, 0.46, 0.12, "white", 0, 0.42, 0.05);             // seat
      RB(0.4, 0.5, 0.1, 0.03, "ceramic", 0, 0.62, -0.3);
      T([0.32, 0.7, -0.3], [0.32, 0.7, 0.25], 0.017, "chrome");       // grab rail
      break;
    }
    case "cubicles": {
      // two WC cubicles: a partition between them (along x) and a front board with doors
      const front = it.front === "west" ? -1 : 1;
      const fx = front * (W / 2 - 0.02);
      B(W - 0.04, 2.0, 0.025, "laminate", 0, 1.1, 0);                        // partition between the two cubicles
      // front line: fixed panel + door (slightly open) per cubicle
      const half = D / 2, door = 0.72, panel = half - door - 0.05;
      [-1, 1].forEach((s) => {
        B(0.025, 2.0, panel, "laminate", fx, 1.1, s * (half - panel / 2));
        G(fx, 0, s * (0.05 + door / 2), 0, front * s * 0.4, 0, () => {
          B(0.025, 1.85, door, "laminate", 0, 1.08, 0);
          B(0.03, 0.03, 0.08, "chrome", -front * 0.02, 1.0, s * (door / 2 - 0.06));
        });
      });
      B(0.04, 0.04, D - 0.1, "chrome", fx, 2.1, 0);
      break;
    }
    // ---------- medical room ----------
    case "shelving": {
      RB(W, 1.9, D, 0.01, "white", 0, 0.95, 0);
      [0.35, 0.75, 1.15, 1.55].forEach((y, r) => {
        B(W - 0.06, 0.02, D - 0.04, "whiteSoft", 0, y, 0.01);
        for (let i = 0; i < 5; i++) RB(0.14, 0.2, D * 0.6, 0.02, ["accentGreen", "white", "blueSoft"][(i + r) % 3], -W / 2 + 0.12 + i * (W - 0.2) / 4.2, y + 0.11, 0.0);
      });
      break;
    }
    case "exam_couch": {
      RB(0.62, 0.5, 1.85, 0.02, "white", 0, 0.3, 0);
      RB(0.6, 0.1, 1.3, 0.04, "upholsteryTeal", 0, 0.6, 0.25);
      G(0, 0.64, -0.42, -0.35, 0, 0, () => RB(0.6, 0.1, 0.55, 0.04, "upholsteryTeal", 0, 0, -0.25));
      B(0.48, 0.004, 1.6, "paper", 0, 0.655, 0.1);
      CY(0.06, 0.54, "paper", 0, 0.66, 0.95, "x", 14);
      RB(0.46, 0.16, 0.28, 0.02, "white", 0.0, 0.08, 1.06);
      break;
    }
    case "stool": {
      CY(0.2, 0.03, "steel", 0, 0.02, 0, "y", 5);
      CY(0.025, 0.5, "chrome", 0, 0.28, 0, "y", 10);
      CY(0.17, 0.06, "upholsteryTeal", 0, 0.56, 0, "y", 20);
      break;
    }
    // ---------- hall corner ----------
    case "sink_cabinet": {
      RB(0.56, 0.85, 0.44, 0.01, "white", 0, 0.43, 0);
      RB(0.58, 0.04, 0.46, 0.01, "stone", 0, 0.87, 0);
      RB(0.36, 0.02, 0.3, 0.02, "steel", 0, 0.885, 0.02);
      T([0, 0.88, -0.17], [0, 1.1, -0.16], 0.012, "chrome"); T([0, 1.1, -0.16], [0, 1.08, -0.03], 0.01, "chrome");
      break;
    }
    case "tall_cabinets": {
      RB(W, 2.1, D, 0.01, "oak", 0, 1.05, 0);
      for (let i = 1; i < 4; i++) B(0.004, 2.0, 0.01, "dark", -W / 2 + (i * W) / 4, 1.05, D / 2 + 0.002);
      for (let i = 0; i < 4; i++) B(0.012, 0.22, 0.02, "steel", -W / 2 + (i + 0.5) * W / 4 + 0.08, 1.05, D / 2 + 0.012);
      break;
    }
    // ---------- sauna / SPA ----------
    case "hot_tub": {
      // open octagonal tub: 8 side panels with a stone rim, water surface, seat ring, jets
      const R = 1.03, Hh = 0.62, side = 2 * R * Math.tan(Math.PI / 8);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        G(Math.sin(a) * (R - 0.06), 0, Math.cos(a) * (R - 0.06), 0, a, 0, () => {
          B(side, Hh, 0.12, "tubShell", 0, Hh / 2, 0);
          B(side + 0.05, 0.05, 0.22, "stone", 0, Hh + 0.025, 0.02);
        });
      }
      CY(R - 0.1, 0.02, "tubShell", 0, 0.03, 0, "y", 8, R - 0.1);
      CY(R - 0.14, 0.012, "water", 0, Hh - 0.08, 0, "y", 8, R - 0.14);
      CY(R - 0.42, 0.28, "tubShell", 0, 0.18, 0, "y", 8, R - 0.42);          // central seat block (under water)
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; CY(0.022, 0.004, "chrome", Math.sin(a) * (R - 0.32), Hh - 0.074, Math.cos(a) * (R - 0.32), "y", 6); }
      [0, 1].forEach((k) => TOR(0.16 + k * 0.12, 0.01, "chrome", 0, Hh - 0.074, 0, Math.PI / 2, 0, Math.PI * 2, 24));
      T([0.55, Hh, R - 0.1], [0.55, Hh + 0.4, R - 0.18], 0.02, "chrome");
      T([0.55, Hh + 0.4, R - 0.18], [0.55, Hh + 0.2, R - 0.4], 0.02, "chrome");
      break;
    }
    case "tub_step": { RB(W, 0.36, D, 0.02, "stone", 0, 0.18, 0); break; }
    case "bench": {
      for (let i = 0; i < 4; i++) RB(W, 0.03, D / 4 - 0.01, 0.01, "oak", 0, 0.45, -D / 2 + (i + 0.5) * (D / 4));
      mirrorX((s) => RB(0.05, 0.43, D - 0.04, 0.01, "steel", s * (W / 2 - 0.1), 0.215, 0));
      break;
    }
    case "shower_corner": {
      // tiled tray in the corner (walls on the west and south), glass on the open sides
      B(W, 0.04, D, "tileFloor", 0, 0.02, 0);
      B(0.6, 0.006, 0.08, "steel", 0, 0.043, 0.1);
      B(W, 2.0, 0.012, "glass", 0, 1.06, -D / 2 + 0.006);
      B(0.012, 2.0, D * 0.55, "glass", W / 2 - 0.006, 1.06, D * 0.22);
      B(0.03, 2.0, 0.03, "chrome", W / 2, 1.06, -D / 2);
      CY(0.12, 0.015, "chrome", -W / 2 + 0.35, 2.1, D / 2 - 0.35, "y", 20);
      T([-W / 2 + 0.03, 2.12, D / 2 - 0.35], [-W / 2 + 0.35, 2.12, D / 2 - 0.35], 0.012, "chrome");
      B(0.02, 0.14, 0.06, "chrome", -W / 2 + 0.02, 1.1, D / 2 - 0.5);
      break;
    }
    case "sauna_cabin": {
      // spruce cabin open to the camera (dollhouse): back/side walls, two bench tiers, stove, glass door
      const H = 2.1, t = 0.06;
      for (let i = 0; i < 14; i++) {
        const y = 0.08 + i * 0.145;
        B(W, 0.13, t, "sauna", 0, y, -D / 2 + t / 2);
        B(t, 0.13, D, "sauna", -W / 2 + t / 2, y, 0);
        B(t, 0.13, D, "sauna", W / 2 - t / 2, y, 0);
      }
      B(W, 0.03, D, "saunaDark", 0, 0.015, 0);
      // front: glass door + timber frame
      B(W - 0.1, H - 0.1, 0.012, "glassBronze", 0, H / 2, D / 2 - 0.03);
      B(W, 0.06, 0.06, "sauna", 0, H, D / 2 - 0.03);
      [[-W / 2 + 0.03], [W / 2 - 0.03]].forEach(([x]) => B(0.06, H, 0.06, "sauna", x, H / 2, D / 2 - 0.03));
      B(0.03, 0.35, 0.03, "sauna", -W / 2 + 0.3, 1.0, D / 2);
      [[0.45, -D / 2 + 0.75, 0.5], [0.9, -D / 2 + 0.3, 0.5]].forEach(([y, z, dd]) => {
        for (let i = 0; i < 5; i++) B(W - 0.14, 0.03, dd / 5 - 0.012, "sauna", 0, y, z - dd / 2 + (i + 0.5) * (dd / 5));
        B(W - 0.14, y - 0.03, 0.03, "saunaDark", 0, (y - 0.03) / 2, z + dd / 2);
        B(W - 0.14, 0.012, 0.02, "warmLight", 0, y - 0.04, z + dd / 2 + 0.02);
      });
      RB(0.38, 0.62, 0.34, 0.02, "dark", -W / 2 + 0.3, 0.31, D / 2 - 0.35);
      for (let i = 0; i < 9; i++) S(0.05, "rock", -W / 2 + 0.2 + (i % 3) * 0.1, 0.66 + Math.floor(i / 3) * 0.025, D / 2 - 0.45 + Math.floor(i / 3) * 0.09, 1, 0.8, 1, 8);
      break;
    }
    case "shower_open": {
      // accessible shower: tiled area, drain, fold-down seat, grab rails, rain head
      B(W, 0.012, D, "tileFloor", 0, 0.006, 0);
      B(0.14, 0.006, 0.14, "steel", -W / 2 + 0.52, 0.014, -D / 2 + 0.5);
      RB(0.42, 0.04, 0.4, 0.02, "white", -W / 2 + 0.25, 0.48, 0.15);
      T([-W / 2 + 0.03, 0.85, -0.25], [-W / 2 + 0.03, 0.85, 0.45], 0.017, "chrome");
      CY(0.13, 0.015, "chrome", -W / 2 + 0.45, 2.15, -D / 2 + 0.45, "y", 20);
      T([-W / 2 + 0.03, 2.17, -D / 2 + 0.45], [-W / 2 + 0.45, 2.17, -D / 2 + 0.45], 0.012, "chrome");
      P([[W / 2 - 0.05, 2.05, -D / 2], [W / 2 - 0.05, 2.05, D / 2 - 0.05], [-W / 2, 2.05, D / 2 - 0.05]], 0.01, "chrome", 6, 16);
      B(0.03, 1.85, D * 0.6, "curtainShower", W / 2 - 0.05, 1.1, -D * 0.18);
      break;
    }
    case "shower_stalls": {
      const n = it.n || 4, step = D / n;
      for (let i = 0; i < n; i++) {
        const z0 = -D / 2 + i * step;
        B(W, 0.012, step - 0.02, "tileFloor", 0, 0.006, z0 + step / 2);
        B(0.12, 0.006, 0.12, "steel", -W / 2 + 0.3, 0.014, z0 + step / 2);
        CY(0.11, 0.015, "chrome", -W / 2 + 0.3, 2.1, z0 + step / 2, "y", 18);
        T([-W / 2 + 0.03, 2.12, z0 + step / 2], [-W / 2 + 0.3, 2.12, z0 + step / 2], 0.012, "chrome");
        B(0.02, 0.12, 0.05, "chrome", -W / 2 + 0.02, 1.05, z0 + step / 2 + 0.2);
        if (i > 0) B(W, 2.0, 0.025, "laminate", 0, 1.1, z0);                 // stall partition
        B(0.012, 1.9, step - 0.5, "glass", W / 2 - 0.01, 1.05, z0 + step / 2 - 0.2);
      }
      break;
    }
    case "basin_counter": {
      RB(W, 0.12, D, 0.01, "stone", 0, 0.8, 0);
      RB(W - 0.02, 0.3, 0.05, 0.01, "oak", 0, 0.62, D / 2 - 0.03);
      (it.basins || [0]).forEach((x) => {
        RB(0.48, 0.03, 0.36, 0.06, "ceramic", x, 0.866, 0.02);
        B(0.38, 0.02, 0.26, "ceramicShadow", x, 0.87, 0.03);
        T([x, 0.86, -D / 2 + 0.08], [x, 1.03, -D / 2 + 0.08], 0.012, "chrome");
        T([x, 1.03, -D / 2 + 0.08], [x, 1.01, -D / 2 + 0.2], 0.01, "chrome");
      });
      RB(W, 0.8, 0.02, 0.005, "mirror", 0, 1.5, -D / 2 + 0.012);
      B(W, 0.02, 0.03, "warmLight", 0, 1.92, -D / 2 + 0.03);
      break;
    }
    case "bench_back": {
      for (let i = 0; i < 3; i++) RB(W, 0.03, D / 3 - 0.01, 0.01, "oak", 0, 0.45, -D / 2 + (i + 0.5) * (D / 3));
      mirrorX((s) => RB(0.05, 0.43, D - 0.04, 0.01, "steel", s * (W / 2 - 0.08), 0.215, 0));
      RB(W, 0.25, 0.03, 0.01, "oak", 0, 0.82, -D / 2 + 0.015);
      RB(W, 0.04, 0.05, 0.01, "steel", 0, 1.65, -D / 2 + 0.03);
      for (let i = 0; i < Math.round(W / 0.3); i++) T([-W / 2 + 0.15 + i * 0.3, 1.62, -D / 2 + 0.05], [-W / 2 + 0.15 + i * 0.3, 1.58, -D / 2 + 0.13], 0.008, "chrome");
      break;
    }
    case "bench_slats": {
      for (let i = 0; i < Math.round(W / 0.2); i++) RB(0.17, 0.035, D - 0.04, 0.01, "oak", -W / 2 + 0.1 + i * 0.2, 0.45, 0);
      mirrorX((s) => RB(0.05, 0.43, D - 0.06, 0.01, "steel", s * (W / 2 - 0.06), 0.215, 0));
      RB(W - 0.1, 0.03, 0.03, 0.01, "steel", 0, 0.12, 0);
      break;
    }
    // ---------- control ----------
    case "control_desk": {
      RB(W, 0.04, D, 0.01, "oak", 0, 0.74, 0);
      RB(0.04, 0.72, D - 0.02, 0.01, "white", -W / 2 + 0.02, 0.36, 0);
      RB(0.45, 0.72, D - 0.02, 0.01, "white", W / 2 - 0.23, 0.36, 0);
      RB(W, 0.5, 0.02, 0.005, "white", 0, 0.48, -D / 2 + 0.02);
      // ticket counter facing the entrance (north = -z)
      RB(W * 0.55, 0.04, 0.32, 0.01, "stone", -W * 0.18, 1.08, -D / 2 - 0.1);
      RB(0.55, 0.34, 0.03, 0.01, "dark", 0.1, 0.96, -0.12, -0.1);
      B(0.51, 0.3, 0.005, "screen", 0.1, 0.96, -0.103, -0.1);
      T([0.1, 0.76, -0.17], [0.1, 0.84, -0.15], 0.012, "steel");
      RB(0.42, 0.015, 0.14, 0.005, "dark", 0.1, 0.77, 0.1);
      break;
    }
    case "task_chair": {
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; T([0, 0.07, 0], [Math.sin(a) * 0.3, 0.06, Math.cos(a) * 0.3], 0.018, "dark"); CY(0.025, 0.03, "dark", Math.sin(a) * 0.3, 0.03, Math.cos(a) * 0.3, "x", 8); }
      CY(0.025, 0.36, "steel", 0, 0.26, 0, "y", 10);
      RB(0.48, 0.07, 0.46, 0.03, "fabricDark", 0, 0.47, 0.02);
      T([0, 0.47, -0.2], [0, 0.66, -0.24], 0.02, "dark");
      RB(0.44, 0.42, 0.06, 0.03, "fabricDark", 0, 0.82, -0.24, -0.1);
      break;
    }
    case "equipment_table": {
      RB(W, 0.03, D, 0.01, "oak", 0, 0.72, 0);
      mirrorX((s) => { T([s * (W / 2 - 0.05), 0, D / 2 - 0.05], [s * (W / 2 - 0.05), 0.71, D / 2 - 0.05], 0.015, "steel"); T([s * (W / 2 - 0.05), 0, -D / 2 + 0.05], [s * (W / 2 - 0.05), 0.71, -D / 2 + 0.05], 0.015, "steel"); });
      RB(0.5, 0.3, 0.42, 0.03, "greyPanel", -0.1, 0.89, 0);
      B(0.3, 0.02, 0.2, "dark", -0.1, 1.05, -0.05);
      break;
    }
    case "glass_screen": {
      B(W, 2.2, 0.012, "glass", 0, 1.1, 0);
      B(W, 0.03, 0.04, "steel", 0, 2.2, 0); B(W, 0.03, 0.04, "steel", 0, 0.015, 0);
      break;
    }
    // ---------- interior design (concept) ----------
    case "acoustic_panel": {
      // timber slats on dark acoustic felt, mounted high on the wall (front +z)
      const w = it.w || 3, hh = 0.9, y = it.y || 2.75;
      B(w, hh, 0.03, "acousticFelt", 0, y, 0.015);
      for (let i = 0; i < Math.round(w / 0.07); i++) B(0.028, hh - 0.04, 0.025, "oak", -w / 2 + 0.035 + i * 0.07, y, 0.045);
      break;
    }
    case "lockers": {
      // two-tier oak lockers with a bench plinth (front +z)
      const n = Math.max(1, Math.round(W / 0.4)), cw = W / n;
      RB(W, 0.1, D, 0.01, "dark", 0, 0.05, 0);
      for (let i = 0; i < n; i++) {
        const x = -W / 2 + (i + 0.5) * cw;
        [0, 1].forEach((k) => {
          RB(cw - 0.012, 0.58, D - 0.02, 0.008, "lockerOak", x, 0.42 + k * 0.6, 0);
          B(0.012, 0.1, 0.015, "steel", x + cw / 2 - 0.07, 0.44 + k * 0.6, D / 2);
          B(0.05, 0.05, 0.006, "screen", x - cw / 2 + 0.07, 0.6 + k * 0.6, D / 2 - 0.004);
        });
      }
      RB(W, 0.03, D + 0.02, 0.01, "stone", 0, 1.335, 0);
      break;
    }
    // ---------- structure ----------
    case "steel_column": {
      const hh = it.h || 3;
      B(0.16, hh, 0.012, "steelPaint", 0, hh / 2, -0.074);
      B(0.16, hh, 0.012, "steelPaint", 0, hh / 2, 0.074);
      B(0.008, hh, 0.14, "steelPaint", 0, hh / 2, 0);
      B(0.26, 0.02, 0.26, "steelPaint", 0, 0.01, 0);
      break;
    }
    default:
      RB(Math.max(W, 0.4), 0.8, Math.max(D, 0.4), 0.03, "white", 0, 0.4, 0);
  }
}

// material palette for this building (memoria: aluminium, panel, gres, PVC, resin floor)
export const PROJECT_MATS = {
  white:          { color: 0xf3f2ee, roughness: 0.5 },
  whiteSoft:      { color: 0xe9e6df, roughness: 0.6 },
  whiteMetal:     { color: 0xe8eaec, roughness: 0.35, metalness: 0.4 },
  ceramic:        { color: 0xfbfbf9, roughness: 0.12 },
  ceramicShadow:  { color: 0xd7d9db, roughness: 0.2 },
  chrome:         { color: 0xe4e7ea, roughness: 0.14, metalness: 1 },
  steel:          { color: 0x9aa0a6, roughness: 0.32, metalness: 0.85 },
  steelPaint:     { color: 0x3b4045, roughness: 0.45, metalness: 0.5 },
  copper:         { color: 0xb87333, roughness: 0.35, metalness: 0.9 },
  greyPanel:      { color: 0xb9bdc1, roughness: 0.5, metalness: 0.2 },
  dark:           { color: 0x2c2f33, roughness: 0.5, metalness: 0.2 },
  screen:         { color: 0x0a1014, roughness: 0.2, emissive: 0x2e6f78, emissiveIntensity: 0.8 },
  laminate:       { color: 0x9aa7ad, roughness: 0.45 },
  stone:          { color: 0xe7e3dc, roughness: 0.28 },
  oak:            { color: 0xb88a5a, roughness: 0.55 },
  sauna:          { color: 0xc99d6b, roughness: 0.7 },
  saunaDark:      { color: 0x6e4f34, roughness: 0.8 },
  rock:           { color: 0x55575b, roughness: 0.9 },
  tubShell:       { color: 0xeef1f2, roughness: 0.25 },
  water:          { color: 0x5fb6cf, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.8, emissive: 0x0d4a63, emissiveIntensity: 0.5 },
  tileFloor:      { color: 0xd9dcdc, roughness: 0.35 },
  glass:          { color: 0xd3e8ee, roughness: 0.04, metalness: 0.1, transparent: true, opacity: 0.22, depthWrite: false },
  glassBronze:    { color: 0xb08c63, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, depthWrite: false },
  mirror:         { color: 0xa7b3ba, roughness: 0.05, metalness: 1 },
  upholsteryTeal: { color: 0x4f8f88, roughness: 0.6 },
  paper:          { color: 0xf7f6f1, roughness: 0.9 },
  fabricDark:     { color: 0x3a3f44, roughness: 0.9 },
  accentGreen:    { color: 0x3f8f6b, roughness: 0.5 },
  blueSoft:       { color: 0x9db8cc, roughness: 0.8 },
  curtainShower:  { color: 0xdfe6e8, roughness: 0.9, transparent: true, opacity: 0.85 },
  warmLight:      { color: 0x000000, emissive: 0xffd8a8, emissiveIntensity: 1.8 },
  lightWarm:      { color: 0x000000, emissive: 0xffd6a0, emissiveIntensity: 1.6 },
  // landscape (Mediterranean planting)
  palmTrunk:      { color: 0x8a7458, roughness: 0.95 },
  palmTrunkDark:  { color: 0x6c5a45, roughness: 0.95 },
  palmSkirt:      { color: 0x9c8462, roughness: 1 },
  palmFrond:      { color: 0x52703a, roughness: 0.8, side: 2 },
  palmFrondLight: { color: 0x6f8c4a, roughness: 0.8, side: 2 },
  oliveTrunk:     { color: 0x6a5f53, roughness: 0.95 },
  oliveLeaf:      { color: 0x76855f, roughness: 0.85 },
  oliveLeafLight: { color: 0x96a37f, roughness: 0.85 },
  cypressLeaf:    { color: 0x2f4a2c, roughness: 0.9 },
  cypressLeafLight:{ color: 0x3e5c37, roughness: 0.9 },
  lavenderLeaf:   { color: 0x8a9a7c, roughness: 0.9 },
  lavenderFlower: { color: 0x8a73b8, roughness: 0.8 },
  rosemaryLeaf:   { color: 0x4f6847, roughness: 0.9 },
  grassStraw:     { color: 0xc4ae74, roughness: 0.9, side: 2 },
  grassGreen:     { color: 0x8a9a52, roughness: 0.9, side: 2 },
  agaveLeaf:      { color: 0x7d9a8a, roughness: 0.6 },
  // interior design (concept)
  acousticFelt:   { color: 0x3a3f42, roughness: 1 },
  lockerOak:      { color: 0xb88a5a, roughness: 0.5 },
  tileWall:       { color: 0xeeebe4, roughness: 0.3 },
};
