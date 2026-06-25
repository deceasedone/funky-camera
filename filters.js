// Export the filters array so engine.js can use it
export const FILTERS = [
  { 
    name: "01. Passthrough (Normal)", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; out vec4 outColor; void main() { outColor = texture(u_tex, v_uv); }`, 
    params: [] 
  },
  { 
    name: "02. Grayscale & Contrast", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform float u_blend; uniform float u_contrast; out vec4 outColor; void main() { vec3 col = (texture(u_tex, v_uv).rgb - 0.5) * u_contrast + 0.5; vec3 gray = vec3(dot(col, vec3(0.299, 0.587, 0.114))); outColor = vec4(mix(col, gray, u_blend), 1.0); }`, 
    params: [{ id: 'u_blend', label: 'B/W Intensity', type: 'range', min: 0, max: 1, step: 0.05, default: 1.0 }, { id: 'u_contrast', label: 'Contrast', type: 'range', min: 0.5, max: 2.5, step: 0.1, default: 1.2 }] 
  },
  { 
    name: "03. 8-Bit Pixelate", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; uniform float u_pixelSize; out vec4 outColor; void main() { vec2 b = u_resolution/u_pixelSize; outColor = texture(u_tex, floor(v_uv*b)/b + 1.0/(2.0*b)); }`, 
    params: [{ id: 'u_pixelSize', label: 'Block Size', type: 'range', min: 2, max: 64, step: 2, default: 16 }] 
  },
  { 
    name: "04. Comic Posterize", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform float u_steps; out vec4 outColor; void main() { outColor = vec4(floor(texture(u_tex, v_uv).rgb * u_steps) / (u_steps - 1.0), 1.0); }`, 
    params: [{ id: 'u_steps', label: 'Color Levels', type: 'range', min: 2, max: 16, step: 1, default: 4 }] 
  },
  { 
    name: "05. Pop-Art Halftone", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; uniform float u_dotSize; out vec4 outColor; void main() { vec2 p = v_uv * u_resolution; vec2 c = floor(p/u_dotSize)*u_dotSize + (u_dotSize*0.5); vec3 col = texture(u_tex, c/u_resolution).rgb; float lum = dot(col, vec3(0.299, 0.587, 0.114)); float rad = (u_dotSize*0.7)*(1.0-lum); float edge = smoothstep(rad, rad-1.0, distance(p, c)); outColor = vec4(mix(col, vec3(1.0), edge), 1.0); }`, 
    params: [{ id: 'u_dotSize', label: 'Dot Grid Size', type: 'range', min: 4, max: 30, step: 1, default: 12 }] 
  },
  { 
    name: "06. Neon Edge-Glow", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; uniform float u_intensity; out vec4 outColor; void main() { vec2 t = 1.0/u_resolution; float s11=dot(texture(u_tex,v_uv+vec2(-t.x,-t.y)).rgb,vec3(.33)); float s12=dot(texture(u_tex,v_uv+vec2(0.,-t.y)).rgb,vec3(.33)); float s13=dot(texture(u_tex,v_uv+vec2(t.x,-t.y)).rgb,vec3(.33)); float s21=dot(texture(u_tex,v_uv+vec2(-t.x,0.)).rgb,vec3(.33)); float s23=dot(texture(u_tex,v_uv+vec2(t.x,0.)).rgb,vec3(.33)); float s31=dot(texture(u_tex,v_uv+vec2(-t.x,t.y)).rgb,vec3(.33)); float s32=dot(texture(u_tex,v_uv+vec2(0.,t.y)).rgb,vec3(.33)); float s33=dot(texture(u_tex,v_uv+vec2(t.x,t.y)).rgb,vec3(.33)); float edge = sqrt(pow(s11+2.*s21+s31-(s13+2.*s23+s33),2.) + pow(s11+2.*s12+s13-(s31+2.*s32+s33),2.)); outColor = vec4(texture(u_tex,v_uv).rgb * edge * u_intensity, 1.0); }`, 
    params: [{ id: 'u_intensity', label: 'Glow Intensity', type: 'range', min: 1.0, max: 15.0, step: 0.5, default: 5.0 }] 
  },
  { 
    name: "07. Spin Kaleidoscope", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; uniform float u_segments; uniform float u_time; out vec4 outColor; void main() { vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0); vec2 p = (v_uv - 0.5) * 2.0 * aspect; float radius = length(p); float angle = atan(p.y, p.x); float slice = 6.2831853 / u_segments; angle = abs(mod(angle, slice) - slice / 2.0) + u_time * 0.15; vec2 mirroredP = vec2(cos(angle), sin(angle)) * radius; outColor = texture(u_tex, (mirroredP / aspect) * 0.5 + 0.5); }`, 
    params: [{ id: 'u_segments', label: 'Mirror Segments', type: 'range', min: 2, max: 24, step: 2, default: 8 }] 
  },
  { 
    name: "08. Liquid Warp", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform float u_time; uniform float u_freq; uniform float u_amp; out vec4 outColor; void main() { vec2 distortedUV = v_uv + vec2(sin(v_uv.y * u_freq + u_time * 2.0) * u_amp, cos(v_uv.x * u_freq + u_time * 2.0) * u_amp); outColor = texture(u_tex, distortedUV); }`, 
    params: [{ id: 'u_freq', label: 'Wave Frequency', type: 'range', min: 1.0, max: 30.0, step: 1.0, default: 10.0 }, { id: 'u_amp', label: 'Distortion Amount', type: 'range', min: 0.0, max: 0.1, step: 0.01, default: 0.03 }] 
  },
  { 
    name: "09. VHS Glitch", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; uniform float u_time; uniform float u_intensity; out vec4 outColor; void main() { vec2 uv = v_uv; float noise = fract(sin(dot(vec2(uv.y, u_time), vec2(12.9898, 78.233))) * 43758.5453); uv.x += step(0.98 - (u_intensity * 0.05), noise) * 0.1 * sign(fract(u_time * 10.0) - 0.5); float shift = 0.01 * u_intensity; float r = texture(u_tex, vec2(uv.x + shift, uv.y)).r; float g = texture(u_tex, uv).g; float b = texture(u_tex, vec2(uv.x - shift, uv.y)).b; float scanline = sin(uv.y * u_resolution.y * 0.8 - u_time * 10.0) * 0.04 * u_intensity; outColor = vec4(r - scanline, g - scanline, b - scanline, 1.0); }`, 
    params: [{ id: 'u_intensity', label: 'Glitch Intensity', type: 'range', min: 0.0, max: 2.0, step: 0.1, default: 1.0 }] 
  },
  { 
    name: "10. Voronoi Stained Glass", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; uniform float u_time; uniform float u_scale; out vec4 outColor; vec2 random2(vec2 p) { return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453); } void main() { vec2 grid = vec2(u_resolution.x/u_resolution.y, 1.0) * u_scale; vec2 st = v_uv * grid; vec2 i_st = floor(st); vec2 f_st = fract(st); float m_dist = 10.0; vec2 m_point; vec2 m_neighbor; for (int y= -1; y <= 1; y++) { for (int x= -1; x <= 1; x++) { vec2 neighbor = vec2(float(x), float(y)); vec2 point = random2(i_st + neighbor); point = 0.5 + 0.5 * sin(u_time * 1.5 + 6.2831 * point); float dist = length(neighbor + point - f_st); if(dist < m_dist) { m_dist = dist; m_point = point; m_neighbor = neighbor; } }} vec3 color = texture(u_tex, (i_st + m_neighbor + m_point) / grid).rgb; outColor = vec4(color - (m_dist * 0.4), 1.0); }`, 
    params: [{ id: 'u_scale', label: 'Glass Shard Count', type: 'range', min: 10, max: 80, step: 2, default: 30 }] 
  },
  { 
    name: "11. Matrix Digital Rain", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform vec2 u_resolution; uniform float u_time; uniform float u_size; out vec4 outColor; void main() { vec2 blocks = u_resolution / u_size; vec2 gridUV = floor(v_uv * blocks) / blocks; float lum = dot(texture(u_tex, gridUV).rgb, vec3(0.299, 0.587, 0.114)); float noise = fract(sin(dot(gridUV + floor(u_time*5.0), vec2(12.9898,78.233))) * 43758.5453); if (lum > 0.2 && noise > (1.0 - lum)) { outColor = vec4(0.0, lum * 1.2, 0.0, 1.0); } else { outColor = vec4(0.0, 0.1, 0.0, 1.0); } }`, 
    params: [{ id: 'u_size', label: 'Font Grid Size', type: 'range', min: 8, max: 40, step: 2, default: 16 }] 
  },
  { 
    name: "12. Glitch Melt", 
    frag: `#version 300 es \n precision mediump float; in vec2 v_uv; uniform sampler2D u_tex; uniform float u_time; uniform float u_threshold; uniform float u_amount; out vec4 outColor; float rand(float n){return fract(sin(n) * 43758.5453123);} void main() { vec2 uv = v_uv; float lum = dot(texture(u_tex, uv).rgb, vec3(0.299, 0.587, 0.114)); if (lum < u_threshold) { uv.y += rand(floor(uv.x * 300.0)) * u_amount; } outColor = texture(u_tex, uv); }`, 
    params: [{ id: 'u_threshold', label: 'Melt Threshold', type: 'range', min: 0.1, max: 0.9, step: 0.05, default: 0.5 }, { id: 'u_amount', label: 'Melt Length', type: 'range', min: 0.0, max: 0.2, step: 0.01, default: 0.05 }] 
  },
  {
    name: "13. True WebGL ASCII",
    frag: `#version 300 es
      precision mediump float; 
      in vec2 v_uv; 
      uniform sampler2D u_tex;      // The camera
      uniform sampler2D u_fontTex;  // The hidden text atlas we generated
      uniform vec2 u_resolution; 
      uniform float u_fontSize; 
      uniform float u_colorMode; 
      uniform float u_charCount;
      out vec4 outColor;
      
      void main() {
        // 1. Create a true monospace text grid
        // Monospace characters are roughly 0.6 times as wide as they are tall
        vec2 cellSize = vec2(u_fontSize * 0.6, u_fontSize);
        vec2 grid = u_resolution / cellSize;
        
        // 2. Snap UV to the grid to get the block coordinates
        vec2 cellUV = floor(v_uv * grid) / grid;
        
        // 3. Sample the camera pixel exactly at the center of the block
        vec2 centerUV = cellUV + (0.5 / grid);
        vec3 camColor = texture(u_tex, centerUV).rgb;
        
        // 4. Calculate Brightness
        float lum = dot(camColor, vec3(0.299, 0.587, 0.114));
        
        // 5. Select character based on brightness — scales with however many glyphs are in the current atlas (Classic/Detailed/Word)
        float charIndex = floor(lum * (u_charCount - 0.01));
        
        // 6. Get coordinates INSIDE the character cell (0.0 to 1.0)
        vec2 localUV = fract(v_uv * grid);
        
        // 7. Sample from the Font Atlas
        float atlasWidth = 1.0 / u_charCount;
        vec2 fontUV = vec2((charIndex + localUV.x) * atlasWidth, localUV.y);
        float fontMask = texture(u_fontTex, fontUV).r;
        
        // 8. Paint the character!
        if (u_colorMode > 0.5) {
          outColor = vec4(camColor * fontMask, 1.0); // Full Color Text
        } else {
          outColor = vec4(vec3(0.0, 1.0, 0.2) * fontMask * (lum + 0.2), 1.0); // Matrix Green Text
        }
      }`,
    params: [
      { id: 'u_fontSize', label: 'Font Size', type: 'range', min: 8, max: 48, step: 2, default: 16 },
      { id: 'u_colorMode', label: 'Matrix Mode (0) / Color (1)', type: 'range', min: 0, max: 1, step: 1, default: 0 },
      { id: 'u_charSet', label: 'Charset: Classic(0)/Detailed(1)/Word(2)', type: 'range', min: 0, max: 2, step: 1, default: 0 }
    ]
  },
  {
    name: "14. Thermal Vision",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform float u_shift;
      uniform float u_bands;
      out vec4 outColor;

      vec3 thermalRamp(float t) {
        vec3 c0 = vec3(0.0, 0.0, 0.15);
        vec3 c1 = vec3(0.0, 0.0, 0.9);
        vec3 c2 = vec3(0.0, 0.8, 0.2);
        vec3 c3 = vec3(1.0, 0.9, 0.0);
        vec3 c4 = vec3(1.0, 0.05, 0.0);
        vec3 c5 = vec3(1.0, 1.0, 1.0);
        if (t < 0.2) return mix(c0, c1, t / 0.2);
        if (t < 0.45) return mix(c1, c2, (t - 0.2) / 0.25);
        if (t < 0.7) return mix(c2, c3, (t - 0.45) / 0.25);
        if (t < 0.9) return mix(c3, c4, (t - 0.7) / 0.2);
        return mix(c4, c5, (t - 0.9) / 0.1);
      }

      void main() {
        vec3 col = texture(u_tex, v_uv).rgb;
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        lum = fract(lum + u_shift);
        lum = floor(lum * u_bands) / u_bands;
        outColor = vec4(thermalRamp(lum), 1.0);
      }`,
    params: [
      { id: 'u_shift', label: 'Palette Shift', type: 'range', min: 0.0, max: 1.0, step: 0.01, default: 0.0 },
      { id: 'u_bands', label: 'Color Bands', type: 'range', min: 2, max: 32, step: 1, default: 16 }
    ]
  },
  {
    name: "15. Low-Poly Facets",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_cellSize;
      uniform float u_edgeStrength;
      out vec4 outColor;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

      void main() {
        vec2 grid = u_resolution / u_cellSize;
        vec2 cell = floor(v_uv * grid);
        vec2 local = fract(v_uv * grid);

        bool upperLeft = (local.x + local.y) < 1.0;
        vec2 triId = cell + (upperLeft ? vec2(0.0) : vec2(1.0));

        vec2 jitter = (vec2(hash(triId), hash(triId + 4.7)) - 0.5) * 0.4;
        vec2 sampleUV = clamp((cell + 0.5 + jitter) / grid, 0.0, 1.0);
        vec3 col = texture(u_tex, sampleUV).rgb;

        float edge = smoothstep(0.0, 0.05 + u_edgeStrength, abs(local.x + local.y - 1.0));
        col *= mix(0.7, 1.0, edge);

        outColor = vec4(col, 1.0);
      }`,
    params: [
      { id: 'u_cellSize', label: 'Facet Size', type: 'range', min: 8, max: 80, step: 2, default: 28 },
      { id: 'u_edgeStrength', label: 'Edge Definition', type: 'range', min: 0.0, max: 0.3, step: 0.01, default: 0.08 }
    ]
  },
  {
    name: "16. Motion Trail (Datamosh)",
    needsHistory: true,
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform sampler2D u_prevTex;
      uniform vec2 u_resolution;
      uniform float u_persistence;
      uniform float u_drift;
      out vec4 outColor;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }

      void main() {
        vec2 px = v_uv * u_resolution;
        vec2 offset = (vec2(hash(px), hash(px + 5.2)) - 0.5) * u_drift;
        vec3 cur = texture(u_tex, v_uv).rgb;
        vec3 prev = texture(u_prevTex, v_uv + offset).rgb;
        outColor = vec4(mix(cur, prev, u_persistence), 1.0);
      }`,
    params: [
      { id: 'u_persistence', label: 'Trail Persistence', type: 'range', min: 0.0, max: 0.95, step: 0.05, default: 0.65 },
      { id: 'u_drift', label: 'Datamosh Drift', type: 'range', min: 0.0, max: 0.02, step: 0.001, default: 0.004 }
    ]
  },
  {
    name: "17. Ink Stippling",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_cellSize;
      uniform float u_jitter;
      out vec4 outColor;

      float hash(vec2 p) { return fract(sin(dot(p, vec2(91.3, 127.1))) * 43758.5453); }

      void main() {
        vec2 p = v_uv * u_resolution;
        vec2 cell = floor(p / u_cellSize);
        vec2 jitterOff = (vec2(hash(cell), hash(cell + 3.7)) - 0.5) * u_jitter * u_cellSize;
        vec2 center = (cell + 0.5) * u_cellSize + jitterOff;
        vec3 col = texture(u_tex, center / u_resolution).rgb;
        float lum = dot(col, vec3(0.299, 0.587, 0.114));
        float rad = (1.0 - lum) * (u_cellSize * 0.45);
        float d = distance(p, center);
        float dotMask = 1.0 - smoothstep(rad - 1.0, rad, d);
        outColor = vec4(vec3(1.0 - dotMask), 1.0);
      }`,
    params: [
      { id: 'u_cellSize', label: 'Dot Grid Size', type: 'range', min: 4, max: 24, step: 1, default: 10 },
      { id: 'u_jitter', label: 'Point Jitter', type: 'range', min: 0.0, max: 1.0, step: 0.05, default: 0.5 }
    ]
  },
  {
    name: "18. Retro Bayer Dither",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_levels;
      out vec4 outColor;

      float bayerValue(int idx) {
        if (idx == 0) return 0.0; if (idx == 1) return 8.0; if (idx == 2) return 2.0; if (idx == 3) return 10.0;
        if (idx == 4) return 12.0; if (idx == 5) return 4.0; if (idx == 6) return 14.0; if (idx == 7) return 6.0;
        if (idx == 8) return 3.0; if (idx == 9) return 11.0; if (idx == 10) return 1.0; if (idx == 11) return 9.0;
        if (idx == 12) return 15.0; if (idx == 13) return 7.0; if (idx == 14) return 13.0; return 5.0;
      }

      void main() {
        vec3 col = texture(u_tex, v_uv).rgb;
        ivec2 pix = ivec2(mod(floor(v_uv * u_resolution), 4.0));
        int idx = pix.x + pix.y * 4;
        float threshold = (bayerValue(idx) + 0.5) / 16.0;
        vec3 stepped = col * u_levels;
        vec3 dithered = floor(stepped + threshold) / u_levels;
        outColor = vec4(dithered, 1.0);
      }`,
    params: [
      { id: 'u_levels', label: 'Color Levels', type: 'range', min: 2, max: 8, step: 1, default: 3 }
    ]
  },
  {
    name: "19. Oil Paint (Kuwahara)",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_radius;
      out vec4 outColor;

      void main() {
        vec2 t = 1.0 / u_resolution;
        int r = max(1, int(u_radius));
        float n = float((r + 1) * (r + 1));

        // Four overlapping quadrant windows around the current pixel.
        // They share the centre row/column — that's intentional (classic Kuwahara).
        vec3 m0 = vec3(0.0), m1 = vec3(0.0), m2 = vec3(0.0), m3 = vec3(0.0);
        float v0 = 0.0, v1 = 0.0, v2 = 0.0, v3 = 0.0;

        for (int j = -r; j <= 0; j++) {
          for (int i = -r; i <= 0; i++) { vec3 c = texture(u_tex, v_uv + vec2(float(i), float(j)) * t).rgb; m0 += c; v0 += dot(c, c); }
          for (int i =  0; i <=  r; i++) { vec3 c = texture(u_tex, v_uv + vec2(float(i), float(j)) * t).rgb; m1 += c; v1 += dot(c, c); }
        }
        for (int j = 0; j <= r; j++) {
          for (int i = -r; i <= 0; i++) { vec3 c = texture(u_tex, v_uv + vec2(float(i), float(j)) * t).rgb; m2 += c; v2 += dot(c, c); }
          for (int i =  0; i <=  r; i++) { vec3 c = texture(u_tex, v_uv + vec2(float(i), float(j)) * t).rgb; m3 += c; v3 += dot(c, c); }
        }

        // Variance formula: E[x²] - (E[x])² (applied per channel, summed)
        m0 /= n; m1 /= n; m2 /= n; m3 /= n;
        v0 = v0 / n - dot(m0, m0);
        v1 = v1 / n - dot(m1, m1);
        v2 = v2 / n - dot(m2, m2);
        v3 = v3 / n - dot(m3, m3);

        // Pick the quadrant with the most homogeneous neighbourhood
        vec3 result = m0; float minV = v0;
        if (v1 < minV) { minV = v1; result = m1; }
        if (v2 < minV) { minV = v2; result = m2; }
        if (v3 < minV) {            result = m3; }

        outColor = vec4(result, 1.0);
      }`,
    params: [
      { id: 'u_radius', label: 'Brush Size', type: 'range', min: 1, max: 7, step: 1, default: 3 }
      // Keep max low on integrated GPUs — radius 7 = 8×8 window × 4 quadrants = 256 samples/pixel
    ]
  },
  {
    name: "20. CRT Monitor",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_curvature;
      uniform float u_scanlines;
      out vec4 outColor;

      void main() {
        // 1. Barrel distortion — curved CRT glass bends the image outward
        vec2 uv = v_uv * 2.0 - 1.0;
        uv *= 1.0 + dot(uv, uv) * u_curvature;
        uv = uv * 0.5 + 0.5;

        // Anything outside the curved screen edge is black bezel
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          outColor = vec4(0.01, 0.01, 0.01, 1.0);
          return;
        }

        // 2. Sample with tiny RGB fringe (barrel distortion is chromatic)
        float fringe = u_curvature * 0.008;
        float r = texture(u_tex, vec2(uv.x + fringe, uv.y)).r;
        float g = texture(u_tex, uv).g;
        float b = texture(u_tex, vec2(uv.x - fringe, uv.y)).b;
        vec3 col = vec3(r, g, b);

        // 3. RGB phosphor shadow mask — every 3 horizontal pixels is one R/G/B triad.
        // Real CRT monitors physically have separate R, G, B phosphor dots per "pixel".
        float maskX = mod(uv.x * u_resolution.x, 3.0);
        vec3 mask = vec3(
          smoothstep(0.0, 0.5, maskX) * (1.0 - smoothstep(0.5, 1.0, maskX)),   // R dot
          smoothstep(1.0, 1.5, maskX) * (1.0 - smoothstep(1.5, 2.0, maskX)),   // G dot
          smoothstep(2.0, 2.5, maskX) * (1.0 - smoothstep(2.5, 3.0, maskX))    // B dot
        );
        col = col * mix(vec3(1.0), mask * 2.8 + 0.2, 0.25);

        // 4. Horizontal scanlines — the electron beam scans one line at a time
        float scan = sin(uv.y * u_resolution.y * 3.14159) * 0.5 + 0.5;
        col *= mix(1.0, scan, u_scanlines);

        // 5. Vignette — the shadow mask darkens the corners
        float vignette = 1.0 - dot((uv * 2.0 - 1.0) * 0.85, (uv * 2.0 - 1.0) * 0.85);
        col *= max(vignette, 0.0);

        // 6. Slight green phosphor tint common on old CRTs
        col.g *= 1.04;

        outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
      }`,
    params: [
      { id: 'u_curvature',  label: 'Screen Curvature', type: 'range', min: 0.0, max: 0.35, step: 0.01, default: 0.12 },
      { id: 'u_scanlines',  label: 'Scanline Depth',   type: 'range', min: 0.0, max: 0.8,  step: 0.05, default: 0.3  }
    ]
  },

  {
    name: "21. Solarized Print",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform float u_threshold;
      uniform float u_amount;
      out vec4 outColor;

      // Classic darkroom solarization (Sabattier effect): tones past the threshold
      // start reversing back toward their inverse, producing that surreal halo look.
      float solarizeChannel(float v, float thresh) {
        float inv = 1.0 - v;
        float t = smoothstep(thresh - 0.12, thresh + 0.12, v);
        return mix(v, inv, t);
      }

      void main() {
        vec3 col = texture(u_tex, v_uv).rgb;
        vec3 sol = vec3(
          solarizeChannel(col.r, u_threshold),
          solarizeChannel(col.g, u_threshold),
          solarizeChannel(col.b, u_threshold)
        );
        outColor = vec4(mix(col, sol, u_amount), 1.0);
      }`,
    params: [
      { id: 'u_threshold', label: 'Reversal Point', type: 'range', min: 0.1, max: 0.9, step: 0.05, default: 0.5 },
      { id: 'u_amount',    label: 'Solarize Mix',   type: 'range', min: 0.0, max: 1.0, step: 0.05, default: 1.0 }
    ]
  },
  {
    name: "22. Emboss Relief",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_time;
      uniform float u_strength;
      uniform float u_colorBlend;
      out vec4 outColor;

      void main() {
        vec2 t = 1.0 / u_resolution;

        // Light direction rotates over time for a dynamic "turning the clay" look.
        // u_time drives the rotation; remove + u_time * 0.3 if you want it static.
        float angle = u_time * 0.3;
        vec2 light = vec2(cos(angle), sin(angle));

        vec3 above = texture(u_tex, v_uv + light * t).rgb;
        vec3 below = texture(u_tex, v_uv - light * t).rgb;

        // Difference in the light direction, scaled, then biased to 0.5 neutral grey
        vec3 emboss = (above - below) * u_strength + 0.5;

        // Convert to greyscale — keeps the stone/clay look
        float lum = dot(emboss, vec3(0.299, 0.587, 0.114));
        vec3 grey = vec3(lum);

        // Optional: blend original colour back in for a "tinted relief" effect
        vec3 original = texture(u_tex, v_uv).rgb;
        outColor = vec4(mix(grey, original * lum * 1.5, u_colorBlend), 1.0);
      }`,
    params: [
      { id: 'u_strength',   label: 'Relief Depth',  type: 'range', min: 1.0, max: 12.0, step: 0.5, default: 4.0 },
      { id: 'u_colorBlend', label: 'Colour Tint',   type: 'range', min: 0.0, max: 1.0,  step: 0.05, default: 0.0 }
    ]
  },
  {
    name: "23. Radial Zoom Blur",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_strength;
      uniform float u_samples;
      out vec4 outColor;

      void main() {
        // Direction from this pixel toward the zoom origin (screen centre)
        vec2 dir    = v_uv - vec2(0.5, 0.5);
        vec3 colour = vec3(0.0);
        int  n      = max(1, int(u_samples));

        // Walk from the current pixel back toward centre, averaging samples.
        // t=0 → the pixel itself, t=1 → the zoom-origin direction fully.
        for (int i = 0; i < n; i++) {
          float t = float(i) / float(n);
          colour += texture(u_tex, v_uv - dir * t * u_strength).rgb;
        }
        colour /= float(n);

        // Slight vignette so the centre stays sharp
        float vig = 1.0 - dot(dir, dir) * 1.2;
        outColor = vec4(colour * max(vig, 0.5), 1.0);
      }`,
    params: [
      { id: 'u_strength', label: 'Zoom Amount',   type: 'range', min: 0.0, max: 0.5,  step: 0.01, default: 0.15 },
      { id: 'u_samples',  label: 'Sample Count',  type: 'range', min: 4,   max: 24,   step: 2,    default: 12  }
    ]
  },
  {
    name: "24. Cross-Hatch Engraving",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_lineSpacing;
      uniform float u_inkAmount;
      out vec4 outColor;

      float hatchLine(vec2 px, float angleDeg, float spacing) {
        float angle = radians(angleDeg);
        vec2 dir = vec2(cos(angle), sin(angle));
        float coord = dot(px, dir);
        return step(0.5, fract(coord / spacing));
      }

      void main() {
        vec3 col = texture(u_tex, v_uv).rgb;
        float lum = dot(col, vec3(0.299, 0.587, 0.114)) / max(u_inkAmount, 0.05);

        vec2 px = v_uv * u_resolution;
        float linesA = hatchLine(px,  45.0, u_lineSpacing);
        float linesB = hatchLine(px, -45.0, u_lineSpacing);
        float linesC = hatchLine(px,   0.0, u_lineSpacing);

        // Darker regions accumulate more crossing line directions, like a real engraving plate
        float ink = 1.0;
        if (lum < 0.78) ink = min(ink, linesA);
        if (lum < 0.52) ink = min(ink, linesB);
        if (lum < 0.26) ink = min(ink, linesC);

        vec3 paper = vec3(0.95, 0.93, 0.86);
        vec3 inkColor = vec3(0.04, 0.04, 0.05);
        outColor = vec4(mix(inkColor, paper, ink), 1.0);
      }`,
    params: [
      { id: 'u_lineSpacing', label: 'Line Spacing', type: 'range', min: 3,   max: 18,  step: 1,    default: 7   },
      { id: 'u_inkAmount',   label: 'Ink Density',  type: 'range', min: 0.3, max: 2.0, step: 0.05, default: 1.0 }
    ]
  },
  {
    name: "25. Needlepoint Stitch",
    frag: `#version 300 es
      precision mediump float;
      in vec2 v_uv;
      uniform sampler2D u_tex;
      uniform vec2 u_resolution;
      uniform float u_cellSize;
      uniform float u_threadThickness;
      out vec4 outColor;

      void main() {
        vec2 grid = u_resolution / u_cellSize;
        vec2 cell = floor(v_uv * grid);
        vec2 local = fract(v_uv * grid);

        vec2 centerUV = (cell + 0.5) / grid;
        vec3 col = texture(u_tex, centerUV).rgb;
        float lum = dot(col, vec3(0.299, 0.587, 0.114));

        // Distance to each diagonal of the cell — together they form an X-shaped stitch
        float d1 = abs(local.x - local.y);
        float d2 = abs(local.x + local.y - 1.0);
        float thickness = mix(0.05, 0.24, 1.0 - lum) * u_threadThickness;
        float stitch = step(min(d1, d2), thickness);

        vec3 linen = vec3(0.93, 0.90, 0.82);
        vec3 thread = col * 1.15;
        outColor = vec4(mix(linen, thread, stitch), 1.0);
      }`,
    params: [
      { id: 'u_cellSize',        label: 'Stitch Size',      type: 'range', min: 6,   max: 36,  step: 1,    default: 16 },
      { id: 'u_threadThickness', label: 'Thread Thickness', type: 'range', min: 0.3, max: 2.0, step: 0.05, default: 1.0 }
    ]
  }
];