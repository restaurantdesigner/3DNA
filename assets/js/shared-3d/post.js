/*
 * Shared render quality for every 3D scene on the site:
 *   - ambient occlusion (GTAO) for contact shadows in corners, under furniture and along walls
 *   - multisampled (MSAA) render targets so edges stay smooth through post-processing
 *   - tone mapping / sRGB output as before (OutputPass)
 * and the shared "section cut" material: the cut tops of walls drawn solid black (poché), as in an
 * architectural section.
 *
 *   const post = createPost(renderer, scene, camera, { lowPower, onReady: requestRender });
 *   post.render();            // instead of renderer.render(scene, camera)
 *   post.setSize(w, h);       // after renderer.setSize(w, h, false)
 *
 * Until the post-processing modules have loaded (or if they cannot load, or WebGL 2 is missing),
 * render() falls back to a plain renderer.render(), so a scene never waits for it.
 * GTAOPass comes from the same three.js version the page already uses: "three/addons/" when the page's
 * import map has it, otherwise the matching version on jsDelivr.
 */
import * as THREE from "three";

/** Solid black, unlit: the cut surface of walls in a section. */
export const sectionCutMaterial = () => new THREE.MeshBasicMaterial({ color: 0x000000, toneMapped: false });

export function createPost(renderer, scene, camera, { lowPower = false, onReady = null, aoScale, radius = 0.45, distanceFallOff = 1, thickness = 1, blendIntensity = 1 } = {}) {
  let composer = null, gtao = null, size = null;
  const scale = aoScale || (lowPower ? 0.5 : 0.75);
  const api = {
    render() { if (composer) composer.render(); else renderer.render(scene, camera); },
    setSize(w, h) { size = [w, h]; if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } },
    get enabled() { return !!composer; },
  };
  if (!renderer.capabilities.isWebGL2) return api;
  const rev = THREE.REVISION.replace(/\D.*$/, "");
  const cdn = `https://cdn.jsdelivr.net/npm/three@0.${rev}.0/examples/jsm/postprocessing/`;
  const load = (file) => import(`three/addons/postprocessing/${file}`).catch(() => import(cdn + file));
  Promise.all([load("EffectComposer.js"), load("RenderPass.js"), load("GTAOPass.js"), load("OutputPass.js")])
    .then(([{ EffectComposer }, { RenderPass }, { GTAOPass }, { OutputPass }]) => {
      const box = new THREE.Vector2(); renderer.getSize(box);
      const target = new THREE.WebGLRenderTarget(box.x * renderer.getPixelRatio(), box.y * renderer.getPixelRatio(),
        { type: THREE.HalfFloatType, samples: lowPower ? 2 : 4 });
      const c = new EffectComposer(renderer, target);
      c.addPass(new RenderPass(scene, camera));
      gtao = new GTAOPass(scene, camera, box.x, box.y);
      gtao.output = GTAOPass.OUTPUT.Default;
      gtao.blendIntensity = blendIntensity;
      gtao.updateGtaoMaterial({ radius, distanceFallOff, thickness, scale: 1, samples: lowPower ? 8 : 16 });
      gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: lowPower ? 8 : 16 });
      // the occlusion buffers at a reduced resolution (softer and much cheaper)
      const setAo = gtao.setSize.bind(gtao);
      gtao.setSize = (w, h) => setAo(Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale)));
      c.addPass(gtao);
      c.addPass(new OutputPass());
      composer = c;
      renderer.domElement.dataset.post = "ao";        // marks the canvas (handy to check the effect is on)
      api.setSize(...(size || [box.x, box.y]));
      if (onReady) onReady();
    })
    .catch((e) => { renderer.domElement.dataset.post = "off"; if (window.console) console.warn("3D post-processing off:", e && e.message); });
  return api;
}
