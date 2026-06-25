import { FILTERS } from './filters.js';

// ─────────────────────────────────────────────────────────────────────
// WEBGL SHADER UTILS & CONSTANTS
// ─────────────────────────────────────────────────────────────────────
const VERT_SRC = `#version 300 es
in vec2 a_pos; in vec2 a_uv; out vec2 v_uv;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); v_uv = a_uv; }`;

const PREPASS_FRAG = `#version 300 es
precision mediump float;
in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; out vec4 outColor;
void main() {
  vec2 step = 1.0 / u_resolution;
  vec3 texB = texture(u_tex, v_uv + vec2( 0.0, -step.y)).rgb;
  vec3 texD = texture(u_tex, v_uv + vec2(-step.x,  0.0)).rgb;
  vec3 texE = texture(u_tex, v_uv).rgb;
  vec3 texF = texture(u_tex, v_uv + vec2( step.x,  0.0)).rgb;
  vec3 texH = texture(u_tex, v_uv + vec2( 0.0,  step.y)).rgb;
  vec3 color = texE * 5.0 - (texB + texD + texF + texH);
  color = (color - 0.5) * 1.15 + 0.5;
  outColor = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

function compileShader(gl, type, src) {
  const shader = gl.createShader(type); gl.shaderSource(shader, src); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
  return shader;
}

function createProgram(gl, vsSrc, fsSrc) {
  const prg = gl.createProgram(); 
  gl.attachShader(prg, compileShader(gl, gl.VERTEX_SHADER, vsSrc)); 
  gl.attachShader(prg, compileShader(gl, gl.FRAGMENT_SHADER, fsSrc)); 
  gl.linkProgram(prg);
  if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prg));
  return prg;
}

// ─────────────────────────────────────────────────────────────────────
// ENGINE STATE
// ─────────────────────────────────────────────────────────────────────
let gl = null, videoTexture = null, vao = null, activeFilterIndex = 0, activeProgram = null;
let prepassProgram = null, fbo = null, fboTexture = null, prevFrameTexture = null;
let paramLocations = {}, stdUniformLocs = {};
let usePrepass = true;

// ─────────────────────────────────────────────────────────────────────
// DOM ELEMENTS & UI BINDINGS
// ─────────────────────────────────────────────────────────────────────
const video = document.getElementById('video'); 
const canvas = document.getElementById('canvas'); 
const selectEl = document.getElementById('filter-select'); 
const paramsContainer = document.getElementById('filter-params-container');
const prepassToggle = document.getElementById('prepass-toggle');

prepassToggle.addEventListener('change', (e) => { usePrepass = e.target.checked; });

// Populate Dropdown
FILTERS.forEach((f, i) => { 
  const opt = document.createElement('option'); 
  opt.value = i; 
  opt.textContent = f.name; 
  selectEl.appendChild(opt); 
});

selectEl.addEventListener('change', (e) => { 
  activeFilterIndex = parseInt(e.target.value); 
  buildFilterUI(FILTERS[activeFilterIndex]); 
  if (gl) compileActiveFilter(); 
});

function buildFilterUI(filter) {
  paramsContainer.innerHTML = '';
  if (filter.params.length === 0) { paramsContainer.innerHTML = '<p style="font-size:10px;color:var(--muted)">No parameters available.</p>'; return; }
  filter.params.forEach(param => {
    param.currentValue = param.default;
    const group = document.createElement('div'); group.className = 'param-group';
    group.innerHTML = `<div class="param-header"><span>${param.label}</span><span class="param-val" id="val-${param.id}">${param.default.toFixed(2)}</span></div><input type="range" id="input-${param.id}" min="${param.min}" max="${param.max}" step="${param.step}" value="${param.default}">`;
    paramsContainer.appendChild(group);
    group.querySelector(`#input-${param.id}`).addEventListener('input', (e) => { 
      param.currentValue = parseFloat(e.target.value); 
      group.querySelector(`#val-${param.id}`).textContent = param.currentValue.toFixed(2); 
      if (param.id === 'u_charSet') handleCharsetModeChange(param.currentValue);
    });
    if (param.id === 'u_charSet') handleCharsetModeChange(param.currentValue);
  });
  if (!filter.params.some(p => p.id === 'u_charSet')) {
    document.getElementById('word-input-container').style.display = 'none';
  }
}
buildFilterUI(FILTERS[0]);

// ─────────────────────────────────────────────────────────────────────
// WEBGL INITIALIZATION
// ─────────────────────────────────────────────────────────────────────
let fontTexture = null; // Add this near the top of engine.js with the other let variables
let currentCharCount = 12;

// ASCII charset presets — Classic/Detailed are fixed density ramps, "word" mode is built live from user input
const CHARSETS = {
  classic:  " .':-~+=*#%@",
  detailed: " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$"
};
let currentCharSet = CHARSETS.classic;

// Rebuilds the font atlas texture for the given charset/word. Safe to call before WebGL exists —
// it just records the choice in currentCharSet and applies it for real once initWebGL() runs.
function buildFontAtlas(charSet) {
  currentCharSet = charSet;
  currentCharCount = charSet.length;
  if (!gl) return;

  const atlasCanvas = document.createElement('canvas');
  const ctx = atlasCanvas.getContext('2d');
  atlasCanvas.width = charSet.length * 64;
  atlasCanvas.height = 64;

  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, atlasCanvas.width, atlasCanvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (let i = 0; i < charSet.length; i++) {
    ctx.fillText(charSet[i], i * 64 + 32, 32);
  }

  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, fontTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlasCanvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.activeTexture(gl.TEXTURE0);
}

// Driven by the ASCII filter's "Charset" slider: 0 = Classic, 1 = Detailed, 2 = Word
function handleCharsetModeChange(mode) {
  const wordContainer = document.getElementById('word-input-container');
  if (mode === 2) {
    wordContainer.style.display = 'block';
    const word = document.getElementById('ascii-word-input').value.trim() || 'FUNKY';
    buildFontAtlas(' ' + word.toUpperCase()); // leading space keeps brightest pixels blank, matching the other modes
  } else {
    wordContainer.style.display = 'none';
    buildFontAtlas(mode === 1 ? CHARSETS.detailed : CHARSETS.classic);
  }
}

document.getElementById('ascii-word-input').addEventListener('input', (e) => {
  const word = e.target.value.trim() || 'FUNKY';
  buildFontAtlas(' ' + word.toUpperCase());
});

function initWebGL(canvas) {
  gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true }); 
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); // moved up: must be set BEFORE any texImage2D upload, otherwise the font atlas ends up flipped relative to video frames
  const verts = new Float32Array([-1, 1, 0, 1, -1, -1, 0, 0, 1, 1, 1, 1, 1, -1, 1, 0]);
  vao = gl.createVertexArray(); gl.bindVertexArray(vao); 
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);
  
  // Texture 0: Video
  videoTexture = gl.createTexture(); 
  gl.activeTexture(gl.TEXTURE0); // Tell WebGL this is slot 0
  gl.bindTexture(gl.TEXTURE_2D, videoTexture); 
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); 
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); 
  
  // Texture 1: ASCII Font Atlas — built from whatever charset/word the user already picked
  fontTexture = gl.createTexture();
  buildFontAtlas(currentCharSet);

  // FBO setup — explicitly switch back to unit 0 first. Without this, this bind
  // silently lands on unit 1 (still active from the font atlas setup above) and
  // overwrites it — that's the actual "face instead of characters" ASCII bug.
  gl.activeTexture(gl.TEXTURE0);
  fboTexture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, fboTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  
  fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, fboTexture, 0); 
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Texture 2: previous-frame buffer, used by temporal filters (Motion Trail / Datamosh)
  gl.activeTexture(gl.TEXTURE2);
  prevFrameTexture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, prevFrameTexture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.activeTexture(gl.TEXTURE0);

  prepassProgram = createProgram(gl, VERT_SRC, PREPASS_FRAG);
  gl.useProgram(prepassProgram);
  const posLocP = gl.getAttribLocation(prepassProgram, 'a_pos'); const uvLocP = gl.getAttribLocation(prepassProgram, 'a_uv');
  gl.enableVertexAttribArray(posLocP); gl.vertexAttribPointer(posLocP, 2, gl.FLOAT, false, 16, 0); 
  gl.enableVertexAttribArray(uvLocP); gl.vertexAttribPointer(uvLocP, 2, gl.FLOAT, false, 16, 8);
  gl.uniform1i(gl.getUniformLocation(prepassProgram, 'u_tex'), 0);
  gl.uniform2f(gl.getUniformLocation(prepassProgram, 'u_resolution'), canvas.width, canvas.height);

  compileActiveFilter();
}

function compileActiveFilter() {
  const filter = FILTERS[activeFilterIndex]; if (activeProgram) gl.deleteProgram(activeProgram);
  activeProgram = createProgram(gl, VERT_SRC, filter.frag); gl.useProgram(activeProgram);
  
  const posLoc = gl.getAttribLocation(activeProgram, 'a_pos'); const uvLoc  = gl.getAttribLocation(activeProgram, 'a_uv');
  gl.enableVertexAttribArray(posLoc); gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 16, 0); 
  gl.enableVertexAttribArray(uvLoc); gl.vertexAttribPointer(uvLoc,  2, gl.FLOAT, false, 16, 8);
  
  gl.uniform1i(gl.getUniformLocation(activeProgram, 'u_tex'), 0);
  gl.uniform1i(gl.getUniformLocation(activeProgram, 'u_fontTex'), 1);
  gl.uniform1i(gl.getUniformLocation(activeProgram, 'u_prevTex'), 2);
stdUniformLocs = { resolution: gl.getUniformLocation(activeProgram, 'u_resolution'), time: gl.getUniformLocation(activeProgram, 'u_time'), charCount: gl.getUniformLocation(activeProgram, 'u_charCount') };
  paramLocations = {}; filter.params.forEach(p => paramLocations[p.id] = gl.getUniformLocation(activeProgram, p.id));
}

let initTime = performance.now();

// ─────────────────────────────────────────────────────────────────────
// RENDER LOOP
// ─────────────────────────────────────────────────────────────────────
function loop() {
  if (!stream || !gl) return; 
  
  gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, videoTexture);
  if (video.readyState >= video.HAVE_CURRENT_DATA) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
  
  gl.bindVertexArray(vao);

  if (usePrepass) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.useProgram(prepassProgram);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(activeProgram);
    gl.bindTexture(gl.TEXTURE_2D, fboTexture); 
  } else {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.useProgram(activeProgram);
  }

  if (stdUniformLocs.resolution) gl.uniform2f(stdUniformLocs.resolution, canvas.width, canvas.height);
 if (stdUniformLocs.time) gl.uniform1f(stdUniformLocs.time, (performance.now() - initTime) / 1000.0);
  if (stdUniformLocs.charCount) gl.uniform1f(stdUniformLocs.charCount, currentCharCount);
  FILTERS[activeFilterIndex].params.forEach(p => { if (paramLocations[p.id]) gl.uniform1f(paramLocations[p.id], p.currentValue); });
  
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  // Only pay the copy cost when the active filter actually needs frame history
  if (FILTERS[activeFilterIndex].needsHistory) {
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, prevFrameTexture);
    gl.copyTexImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 0, 0, canvas.width, canvas.height, 0);
    gl.activeTexture(gl.TEXTURE0);
  }

  fpsCount++; const now = performance.now(); if (now - lastFpsTs >= 1000) { document.getElementById('s-fps').textContent = fpsCount; fpsCount = 0; lastFpsTs = now; }
  rafId = requestAnimationFrame(loop);
}

// ─────────────────────────────────────────────────────────────────────
// CAMERA & CAPTURE LOGIC
// ─────────────────────────────────────────────────────────────────────
let stream = null, rafId = null, fpsCount = 0, lastFpsTs = 0, facing = 'user';

async function startCamera() {
  if(stream) stream.getTracks().forEach(t=>t.stop()); stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } } });
  video.srcObject = stream; await new Promise(res => video.addEventListener('loadedmetadata', res, { once: true }));
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  
  if (!gl) initWebGL(canvas); 
  gl.viewport(0, 0, canvas.width, canvas.height);
  
  canvas.className = (facing === 'user') ? 'mirror' : ''; 
  document.getElementById('s-res').textContent = `${canvas.width}×${canvas.height}`;
  document.getElementById('idle').style.display = 'none'; canvas.style.display = 'block'; 
  document.getElementById('dot').className = 'dot live'; document.getElementById('status-txt').textContent = 'LIVE'; 
  document.getElementById('gl-badge').style.display = 'inline'; 
  document.getElementById('stop-btn').disabled = document.getElementById('flip-btn').disabled = document.getElementById('capture-btn').disabled = false;
  
  fpsCount = 0; lastFpsTs = performance.now(); loop();
}

document.getElementById('capture-btn').addEventListener('click', () => {
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a'); link.download = `funky-cam-${Date.now()}.png`; link.href = dataURL; link.click();
});

document.getElementById('start-btn').addEventListener('click', startCamera);
document.getElementById('stop-btn').addEventListener('click', () => {
  cancelAnimationFrame(rafId); stream.getTracks().forEach(t=>t.stop()); stream=null; canvas.style.display = 'none'; document.getElementById('idle').style.display = 'flex';
  document.getElementById('dot').className = 'dot'; document.getElementById('status-txt').textContent = 'NO SIGNAL'; 
  document.getElementById('stop-btn').disabled = document.getElementById('flip-btn').disabled = document.getElementById('capture-btn').disabled = true;
});
document.getElementById('flip-btn').addEventListener('click', () => { facing = facing==='user'?'environment':'user'; startCamera(); });