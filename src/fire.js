// fire.js: drive the t2-fire simulation (assets/t2-fire, in a hidden iframe) in step with video time.
// The simulation has state, so a scene's fire is replayed from the scene start at 1/60 s steps.
// A worker rendering frames in order only replays once. The picture the fire burns (the desktop, or
// letters) is uploaded into the fire's own WebGL context as its picture texture.
'use strict';

const FIRE_STEP = 1 / 60;
const FS = { scene: null, time: 0, tex: null, picL: null };

function firePicture(src) {
  const gl = FIRE.canvas.getContext('webgl2'), S = FIRE.api.S;
  if (!FS.tex) FS.tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, FS.tex);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, src);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  S.picTex = FS.tex; S.picAspect = src.width / src.height; S.hasPicture = true;
}

// Run fire scene `id` (which started at t0) up to time t and return the fire canvas.
// spec: { params(t) → fire params, picture(t) → canvas to burn (or null), pictureEvery: s }
function fireAt(id, t0, t, spec) {
  const api = FIRE.api;
  if (FS.scene !== id || FS.time > t + 1e-6) {
    FS.scene = id; FS.time = t0; FS.lastPic = -1;
    api.setAll(spec.params(t0));
    api.resetFire();
    api.S.time = 0;   // the shaders' noise and flicker run on this clock; every worker must start it equal
    if (spec.picture) { firePicture(spec.picture(t0)); FS.lastPic = t0; }
  }
  // advance in 1/30 s chunks (two simulation steps, one render each), updating params and picture
  const CH = 2 * FIRE_STEP;
  while (FS.time + CH <= t + 1e-6) {
    const p = spec.params(FS.time); for (const k in p) api.params[k] = p[k];
    if (spec.picture) firePicture(spec.picture(FS.time));
    api.pump(CH);
    FS.time += CH;
  }
  const p = spec.params(t); for (const k in p) api.params[k] = p[k];
  if (spec.picture) firePicture(spec.picture(t));
  api.render();
  return FIRE.canvas;
}
