/* =====================================================================
   GFX — minimal WebGL2 renderer (instancing, planar reflections, bloom)
   ===================================================================== */
const NL = 8; // max point lights (shader loops use LN <= NL, chosen per quality)

const SH = {};
SH.litVS = `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aUv;
layout(location=3) in vec4 aCol;
#ifdef INSTANCED
layout(location=4) in vec4 iM0; layout(location=5) in vec4 iM1; layout(location=6) in vec4 iM2; layout(location=7) in vec4 iM3;
layout(location=8) in vec4 iCol;
#endif
uniform mat4 uVP; uniform mat4 uModel;
out vec3 vW; out vec3 vN; out vec4 vUv; out vec4 vC;
void main(){
#ifdef INSTANCED
  mat4 M = mat4(iM0, iM1, iM2, iM3);
  vC = vec4(aCol.rgb * iCol.rgb, aCol.a + iCol.a);
#else
  mat4 M = uModel; vC = aCol;
#endif
  vec4 w = M * vec4(aPos, 1.0);
  vW = w.xyz; vN = mat3(M) * aNrm; vUv = aUv;
  gl_Position = uVP * w;
}`;

// skinned people (see Folk): bones (3 rows of a 3x4 matrix each) and palette of every person in a float texture,
// one row per person; per vertex: palette slot, baked shade, specular, mask (emission, or stubble on the skin)
SH.skinVS = `
layout(location=0) in vec3 aPos;
layout(location=1) in vec3 aNrm;
layout(location=2) in vec4 aM;
layout(location=3) in vec4 aJ;
layout(location=4) in vec4 aW;
layout(location=5) in vec4 iD;
uniform mat4 uVP; uniform highp sampler2D uBones;
out vec3 vW; out vec3 vN; out vec4 vUv; out vec4 vC;
void acc(int r, float j, float w, inout vec4 a, inout vec4 b, inout vec4 c) {
  if (w <= 0.0) return;
  int x = int(j + 0.5) * 3;
  a += texelFetch(uBones, ivec2(x, r), 0) * w; b += texelFetch(uBones, ivec2(x + 1, r), 0) * w; c += texelFetch(uBones, ivec2(x + 2, r), 0) * w;
}
void main(){
  int r = int(iD.x + 0.5);
  vec4 a = vec4(0.0), b = vec4(0.0), c = vec4(0.0);
  acc(r, aJ.x, aW.x, a, b, c); acc(r, aJ.y, aW.y, a, b, c); acc(r, aJ.z, aW.z, a, b, c); acc(r, aJ.w, aW.w, a, b, c);
  vec4 p = vec4(aPos, 1.0);
  vW = vec3(dot(a, p), dot(b, p), dot(c, p));
  vN = vec3(dot(a.xyz, aNrm), dot(b.xyz, aNrm), dot(c.xyz, aNrm));
  int s = int(aM.x + 0.5);
  vec4 pal = texelFetch(uBones, ivec2(NBONES * 3 + s, r), 0);
  vec3 col = pal.rgb; float m = aM.w / 255.0, e = m * pal.a;
  if (s == 0) { col = mix(col, texelFetch(uBones, ivec2(NBONES * 3 + 2, r), 0).rgb * 0.55 + col * 0.12, m * pal.a); e = 0.0; }
  vC = vec4(col * (aM.y / 128.0) * iD.y, e * iD.z);
  vUv = vec4(aM.z / 128.0, s <= 1 ? 1.0 : 0.0, 0.0, 0.0);
  gl_Position = uVP * vec4(vW, 1.0);
}`;

SH.litFS = `
precision highp float;
in vec3 vW; in vec3 vN; in vec4 vUv; in vec4 vC;
uniform vec3 uCam; uniform vec3 uHemiS; uniform vec3 uHemiG; uniform vec3 uMoonD; uniform vec3 uMoonC;
uniform vec4 uLP[LN]; uniform vec3 uLC[LN]; uniform float uLD[LN];
uniform vec3 uFogC; uniform float uFogD; uniform float uClipY;
uniform sampler2D uLM; uniform vec4 uLMo; uniform float uLMk;
uniform vec4 uMat; uniform vec3 uRimC;
#ifdef ATLAS
uniform sampler2D uMap; uniform sampler2D uEmap; uniform vec2 uCell;
#endif
#ifdef WET
uniform sampler2D uRefl; uniform vec2 uRes; uniform float uRefK; uniform float uTime; uniform vec3 uEnvC; uniform float uWet; uniform float uRain;
#endif
#if defined(WET) || defined(ATLAS)
uniform sampler2D uNoise;
#endif
#ifdef NMAP
uniform sampler2D uNmap; uniform vec3 uEnvH; uniform vec3 uEnvZ;
#endif
out vec4 oC;
void main(){
  if (vW.y < uClipY) discard;
  vec3 base = vC.rgb; vec3 emis = vec3(0.0);
#ifdef ATLAS
  vec2 cuv = (vUv.zw + 0.004 + fract(vUv.xy) * 0.992) * uCell;
  vec2 gx = dFdx(vUv.xy) * uCell, gy = dFdy(vUv.xy) * uCell;
  vec4 tc = textureGrad(uMap, cuv, gx, gy);
#ifdef ALPHATEST
  if (tc.a < 0.5) discard;
#endif
  base *= tc.rgb;
  emis = pow(textureGrad(uEmap, cuv, gx, gy).rgb, vec3(2.2)) * (uMat.w * 1.6); // painted in display colours: back to linear light
#ifndef WET
  { // weathering on walls: darker where they meet the ground, vertical grime streaks washed down by the rain
    float wall = 1.0 - abs(normalize(vN).y);
    float contact = mix(0.6, 1.0, smoothstep(0.05, 2.4, vW.y));
    float grime = texture(uNoise, vec2((vW.x + vW.z) * 0.11, vW.y * 0.016)).b;
    base *= mix(1.0, contact * mix(0.74, 1.08, grime), wall);
  }
#endif
#endif
  vec3 N = normalize(vN); if (!gl_FrontFacing) N = -N;
  vec3 V = uCam - vW; float dist = length(V); V /= max(dist, 1e-4);
  float puddle = 0.0, gloss = 0.0;
#ifdef WET
  vec4 nz = texture(uNoise, vW.xz * 0.061);
  float dry = 1.0 - uWet; // as the street dries the puddles shrink, the deepest ones last
  puddle = smoothstep(0.52 + dry * 0.46, 0.72 + dry * 0.4, texture(uNoise, vW.xz * 0.0137 + vec2(0.37, 0.11)).a);
#endif
#ifdef NMAP
  { // tangent frame from the screen-space derivatives (no stored tangents needed)
    vec4 nm = textureGrad(uNmap, cuv, gx, gy);
    vec3 tn = mix(nm.xyz * 2.0 - 1.0, vec3(0.0, 0.0, 1.0), puddle);
    vec3 dp1 = dFdx(vW), dp2 = dFdy(vW); vec2 du1 = dFdx(vUv.xy), du2 = dFdy(vUv.xy);
    vec3 dp2p = cross(dp2, N), dp1p = cross(N, dp1);
    vec3 T = dp2p * du1.x + dp1p * du2.x, B = dp2p * du1.y + dp1p * du2.y;
    float im = inversesqrt(max(max(dot(T, T), dot(B, B)), 1e-20));
    N = normalize(T * (tn.x * im) + B * (tn.y * im) + N * tn.z);
    gloss = nm.a;
  }
#endif
#ifdef WET
  vec2 rp = (texture(uNoise, vW.xz * 0.31 + vec2(uTime * 0.043, uTime * -0.027)).rg - 0.5) * uRain; // ripples only while it rains
  N = normalize(N + vec3(rp.x, 0.0, rp.y) * mix(0.18, 0.06, puddle) + vec3(nz.r - 0.5, 0.0, nz.g - 0.5) * 0.12 * (1.0 - puddle));
  base *= mix(1.0, 0.55, puddle) * mix(1.12, 1.0, uWet); // dry asphalt is lighter
#endif
  float wrap = 0.0, specK = uMat.y;
#ifdef WET
  specK *= mix(0.35, 1.0, uWet);
#endif
#ifdef SKIN
  wrap = vUv.y * 0.4; // skin: light wraps past the terminator (scattering under the surface)
  specK = vUv.x * 0.3;
#endif
  vec3 diff = mix(uHemiG, uHemiS, N.y * 0.5 + 0.5);
  if (uLMk > 0.0) { // the baked city lights: street slice below, first-floor slice above, nothing up on the roofs
    vec2 luv = clamp((vW.xz - uLMo.xy) * uLMo.zw, 0.002, 0.998);
    float hk = smoothstep(0.7, 3.2, vW.y), fade = 1.0 - smoothstep(6.5, 13.0, vW.y);
    vec4 g = texture(uLM, vec2(luv.x, luv.y * 0.5)), m = texture(uLM, vec2(luv.x, 0.5 + luv.y * 0.5));
    vec3 lm = mix(g.rgb, m.rgb, hk); lm = lm * lm * (uLMk * fade);
    diff = diff * mix(1.0, g.a, (1.0 - hk) * fade) + lm * (0.6 + 0.4 * max(N.y, 0.0));
  }
  diff += uMoonC * max((dot(N, uMoonD) + wrap) / (1.0 + wrap), 0.0);
#ifdef SKIN
  diff *= mix(vec3(1.0), vec3(1.1, 0.97, 0.92), vUv.y); // warm light scattered in the skin
#endif
  vec3 spec = vec3(0.0);
  float shin = uMat.x * (1.0 + puddle * 3.0);
#ifdef SKIN
  shin = mix(10.0, 70.0, clamp(vUv.x * 0.5, 0.0, 1.0));
#endif
#if defined(NMAP) && !defined(WET)
  shin = mix(shin, 110.0, gloss);
#endif
  for (int i = 0; i < LN; i++) {
    vec3 L = uLP[i].xyz - vW; float d = length(L); L /= max(d, 1e-3);
    float a = clamp(1.0 - d / uLP[i].w, 0.0, 1.0); a *= a;
    float nl = max(dot(N, L), 0.0);
    diff += uLC[i] * (max((dot(N, L) + wrap) / (1.0 + wrap), 0.0) * a * uLD[i]);
    vec3 H = normalize(L + V);
    spec += uLC[i] * (pow(max(dot(N, H), 0.0), shin) * a * (0.25 + 0.75 * nl));
  }
  vec3 col = base * diff + spec * (specK * (1.0 + puddle * 2.0)) + base * vC.a + emis;
#if defined(NMAP) && !defined(WET)
  { // glass: highlights of the lamps and the glow of the sky mirrored, stronger at grazing angles
    col += spec * gloss * 0.9;
    vec3 R = reflect(-V, N);
    vec3 env = R.y > 0.0 ? mix(uEnvH * 1.3, uEnvZ, smoothstep(0.0, 0.6, R.y)) : uHemiG * 1.4;
    float fr = pow(1.0 - max(dot(N, V), 0.0), 5.0);
    col += env * gloss * (0.22 + fr * 1.3);
  }
#endif
#ifdef INSTANCED
  if (uMat.w > 0.0) { // metal: mirror the sky/ground ambience and the moon, tinted by the paint
    vec3 R = reflect(-V, N);
    float fr = 0.3 + 0.7 * pow(1.0 - max(dot(N, V), 0.0), 2.0);
    vec3 env = mix(uHemiG, uHemiS, smoothstep(-0.35, 0.65, R.y)) * 1.6 + uMoonC * pow(max(dot(R, uMoonD), 0.0), 12.0) * 1.4;
    col += env * (0.12 + base * 1.1) * fr * uMat.w;
  }
#endif
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  col += uRimC * rim * uMat.z;
#ifdef WET
  vec2 suv = gl_FragCoord.xy / uRes;
  vec2 distort = (nz.rg - 0.5) * mix(0.02, 0.004, puddle) + rp * 0.012;
  vec3 refl = textureLod(uRefl, suv + distort, mix(2.6, 0.6, puddle)).rgb;
  float ndv = max(dot(vec3(0.0, 1.0, 0.0), V), 0.0);
  float fres = 0.06 + 0.94 * pow(1.0 - ndv, 4.0);
  float film = mix(0.1, 1.0, uWet); // a dry street keeps only a faint sheen
  float k = uRefK * mix(0.38 * film, 1.0, puddle) * mix(0.45, 1.0, fres);
  if (uRefK <= 0.0) { refl = uEnvC * (0.75 + 0.5 * nz.b); k = 0.55 * fres * mix(0.55 * film, 1.0, puddle); } // no reflection pass: mirror the glow of the sky
  col = col * (1.0 - k * 0.5) + refl * k;
#endif
  float fd = uFogD * mix(1.0, 0.62, smoothstep(6.0, 48.0, vW.y)); // the haze sits low in the streets
  float f = 1.0 - exp(-fd * fd * dist * dist);
  oC = vec4(mix(col, uFogC, f), 1.0);
}`;

SH.glowFS = `
precision highp float;
in vec3 vW; in vec3 vN; in vec4 vUv; in vec4 vC;
uniform sampler2D uMap; uniform float uGain; uniform vec3 uCam; uniform vec3 uFogC; uniform float uFogD; uniform float uClipY; uniform float uAdd;
out vec4 oC;
void main(){
  if (vW.y < uClipY) discard;
  vec4 t = texture(uMap, vUv.xy);
  float g = uGain * (1.0 + vC.a);
  g = g < 1.3 ? g : 1.3 + (g - 1.3) * 0.4;            // eye comfort: the brightest emitters are squeezed, colours stay
  vec3 col = vC.rgb * t.rgb * g;
  float d = length(uCam - vW); float f = 1.0 - exp(-uFogD * uFogD * d * d * 0.7);
  if (uAdd > 0.5) { col *= (1.0 - f) * t.a; oC = vec4(col, 1.0); }
  else { oC = vec4(mix(col, uFogC, f), t.a); }
}`;

SH.quadVS = `
out vec2 vUv;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vUv = p; gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0); }`;

SH.skyVS = `
out vec2 vNdc;
void main(){ vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)); vNdc = p * 2.0 - 1.0; gl_Position = vec4(vNdc, 1.0, 1.0); }`;

SH.skyFS = `
precision highp float;
in vec2 vNdc; uniform mat4 uInvVP; uniform vec3 uCam; uniform float uTime; uniform float uFlash; uniform float uMirror;
uniform vec3 uHorizon; uniform vec3 uZenith; uniform sampler2D uNoise; uniform float uCloud; uniform vec3 uMoonDir; uniform float uClear;
out vec4 oC;
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * texture(uNoise, p).b; p *= 2.03; a *= 0.5; } return s; }
void main(){
  vec4 w = uInvVP * vec4(vNdc, 1.0, 1.0); vec3 d = normalize(w.xyz / w.w - uCam);
  if (uMirror > 0.5) d.y = -d.y;
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.5, h));
  col += uHorizon * 0.55 * exp(-max(h, 0.0) * 14.0); // glow of the city lights on the haze
  vec2 cp = d.xz / (max(h, 0.02) + 0.25);
  float n = fbm(cp * 0.045 + vec2(uTime * 0.0035, uTime * 0.002));
  float cl = smoothstep(0.64 - uCloud * 0.42, 0.95 - uCloud * 0.2, n) * mix(0.35, 1.0, uCloud); // cloud cover follows the weather
  // stars (few: the city glows) and the moon, where the sky is clear
  float sky = (1.0 - cl) * uClear * smoothstep(0.04, 0.35, h) * (uMirror < 0.5 ? 1.0 : 0.0);
  if (sky > 0.01) {
    vec3 sp = d * 520.0; vec3 ce = floor(sp); float hs = fract(sin(dot(ce, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
    float star = step(0.9962, hs) * smoothstep(0.42, 0.1, length(fract(sp) - 0.5)) * (0.65 + 0.35 * sin(uTime * (1.5 + hs * 3.0) + hs * 60.0));
    col += vec3(0.8, 0.85, 1.0) * star * 0.55 * sky * (1.0 - uCloud * 0.7);
  }
  vec3 md = normalize(uMoonDir); float mdot = max(dot(d, md), 0.0);
  float disc = smoothstep(0.99955, 0.99975, mdot);
  float veil = 1.0 - smoothstep(0.55, 1.0, uCloud) * 0.9; // an overcast sky hides the moon
  col += vec3(0.95, 0.93, 0.85) * disc * 0.9 * (1.0 - cl * 0.9) * veil * uClear * (uMirror < 0.5 ? 1.0 : 0.0);
  col += vec3(0.5, 0.55, 0.7) * pow(mdot, 90.0) * 0.12 * (1.0 - uCloud * 0.7) * uClear;
  // low clouds are lit from below by the streets (sodium orange), high ones stay dark; the moon silvers their edges
  vec3 cloudCol = mix(uHorizon * 2.1, vec3(0.03, 0.03, 0.05), smoothstep(0.0, 0.55, h)) + vec3(0.12, 0.13, 0.16) * pow(mdot, 12.0) * uClear;
  col = mix(col, cloudCol, cl * 0.8 * smoothstep(-0.05, 0.12, h));
  col += uFlash * vec3(0.55, 0.6, 0.85) * (0.35 + cl) * smoothstep(-0.1, 0.3, h);
  // far skyline: blocky silhouette just above the horizon, with a few lit windows
  float az = atan(d.x, d.z) * 70.0; float bi = floor(az);
  float bh = 0.012 + 0.05 * pow(fract(sin(bi * 12.9898) * 43758.5453), 2.2) + 0.01 * fract(sin(floor(az * 0.23) * 78.233) * 9631.2);
  if (uMirror < 0.5 && h > -0.01 && h < bh) {
    col = mix(col, uHorizon * 0.42, 0.85);
    vec2 wc = vec2(floor(az * 7.0), floor(h * 900.0));
    float lit = step(0.9, fract(sin(dot(wc, vec2(12.9898, 78.233))) * 43758.5453)) * step(0.35, fract(az * 7.0)) * step(0.4, fract(h * 900.0));
    col += vec3(1.0, 0.72, 0.4) * lit * 0.18;
  }
  col *= smoothstep(-0.25, 0.0, h) * 0.8 + 0.2;
  oC = vec4(col, 1.0);
}`;

SH.rainVS = `
layout(location=0) in vec3 aPos; layout(location=1) in vec3 aNrm;
uniform mat4 uVP; uniform vec3 uCam; uniform float uTime; uniform vec3 uBox; uniform vec2 uWind; uniform float uLen;
out float vA;
void main(){
  float spd = 16.0 + aNrm.y * 8.0; float e = aNrm.x;
  float t = uTime * spd;
  vec3 p;
  p.x = uCam.x + (fract(aPos.x - (uCam.x - uWind.x * uTime) / uBox.x) - 0.5) * uBox.x;
  p.z = uCam.z + (fract(aPos.z - (uCam.z - uWind.y * uTime) / uBox.z) - 0.5) * uBox.z;
  p.y = uCam.y + (fract(aPos.y - (t + uCam.y) / uBox.y) - 0.5) * uBox.y;
  vec3 dir = normalize(vec3(uWind.x, -spd, uWind.y));
  p -= dir * uLen * e * (0.7 + aNrm.z * 0.6);
  vA = (1.0 - e) * (0.55 + aNrm.z * 0.45);
  gl_Position = uVP * vec4(p, 1.0);
}`;
SH.rainFS = `
precision highp float; in float vA; uniform vec3 uColor; out vec4 oC;
void main(){ oC = vec4(uColor * vA, 1.0); }`;

SH.partVS = `
layout(location=0) in vec3 aPos;
layout(location=4) in vec4 iP; layout(location=5) in vec4 iC; layout(location=6) in vec4 iX;
uniform mat4 uVP; uniform vec3 uCR; uniform vec3 uCU; uniform vec3 uCam;
out vec2 vUv; out vec4 vC; out float vF;
void main(){
  vec2 q = aPos.xy; if (iX.w > 0.5) q.y *= iX.y;
  float c = cos(iX.x), s = sin(iX.x);
  vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
  vec3 wp;
  if (iX.w > 0.5) { // flat on ground (XZ plane)
    wp = iP.xyz + vec3(r.x, 0.0, r.y) * iP.w;
  } else {
    wp = iP.xyz + (uCR * r.x + uCU * r.y * iX.y) * iP.w;
  }
  float cell = iX.z; vec2 cc = vec2(mod(cell, 4.0), floor(cell / 4.0));
  vUv = (cc + clamp(aPos.xy + 0.5, 0.01, 0.99)) * 0.25;
  vC = iC;
  vF = length(uCam - wp);
  gl_Position = uVP * vec4(wp, 1.0);
}`;
SH.partFS = `
precision highp float; in vec2 vUv; in vec4 vC; in float vF;
uniform sampler2D uMap; uniform float uFogD; uniform float uAdd;
out vec4 oC;
void main(){
  vec4 t = texture(uMap, vUv);
  float f = exp(-uFogD * uFogD * vF * vF * 0.6);
  if (uAdd > 0.5) oC = vec4(vC.rgb * t.rgb * t.a * vC.a * f, 1.0);
  else oC = vec4(vC.rgb * t.rgb, t.a * vC.a * f);
}`;

// light coronas: camera-facing sprites pulled toward the viewer and never smaller than a few pixels,
// or flat streaks on the wet ground (mode iX.w = 1)
SH.glareVS = `
layout(location=0) in vec3 aPos;
layout(location=4) in vec4 iP; layout(location=5) in vec4 iC; layout(location=6) in vec4 iX;
uniform mat4 uVP; uniform vec3 uCR; uniform vec3 uCU; uniform vec3 uCam; uniform float uPix; uniform float uRefl;
out vec2 vUv; out vec4 vC; out float vF;
void main(){
  vUv = vec2(0.0); vC = vec4(0.0); vF = 0.0;
  if (uRefl > 0.5 && iX.w > 0.5) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; } // ground streaks are not mirrored
  vec2 q = aPos.xy; vec3 wp; float d = length(uCam - iP.xyz); float k = 1.0;
  if (iX.w > 0.5) {
    q.y *= iX.y; float c = cos(iX.x), s = sin(iX.x);
    vec2 r = vec2(q.x * c - q.y * s, q.x * s + q.y * c);
    wp = iP.xyz + vec3(r.x, 0.0, r.y) * iP.w;
  } else {
    vec3 toC = (uCam - iP.xyz) / max(d, 1e-3);
    float s = max(iP.w, d * uPix * iX.x);
    k = clamp(sqrt(iP.w / s), 0.4, 1.0);
    wp = iP.xyz + toC * min(0.9, d * 0.4) + (uCR * q.x * iX.y + uCU * q.y) * s;
  }
  float cell = iX.z; vec2 cc = vec2(mod(cell, 2.0), floor(cell / 2.0));
  vUv = (cc + clamp(aPos.xy + 0.5, 0.004, 0.996)) * 0.5;
  vC = vec4(iC.rgb, iC.a * k); vF = d;
  gl_Position = uVP * vec4(wp, 1.0);
}`;
SH.glareFS = `
precision highp float; in vec2 vUv; in vec4 vC; in float vF;
uniform sampler2D uMap; uniform float uFogD; out vec4 oC;
void main(){
  vec4 t = texture(uMap, vUv);
  float f = exp(-uFogD * uFogD * vF * vF * 0.35);
  oC = vec4(vC.rgb * t.a * vC.a * f, 1.0);
}`;

SH.beamVS = `
layout(location=0) in vec3 aPos; layout(location=3) in vec4 aCol; layout(location=2) in vec4 aUv;
uniform mat4 uVP; out vec4 vC; out vec2 vUv;
void main(){ vC = aCol; vUv = aUv.xy; gl_Position = uVP * vec4(aPos, 1.0); }`;
SH.beamFS = `
precision highp float; in vec4 vC; in vec2 vUv; out vec4 oC;
void main(){ float e = 1.0 - abs(vUv.y * 2.0 - 1.0); e = e * e; oC = vec4(vC.rgb * vC.a * e, 1.0); }`;

SH.waterVS = `
layout(location=0) in vec3 aPos; uniform mat4 uVP; out vec3 vW;
void main(){ vW = aPos; gl_Position = uVP * vec4(aPos, 1.0); }`;
SH.waterFS = `
precision highp float;
in vec3 vW; uniform vec3 uCam; uniform float uTime; uniform sampler2D uNoise; uniform sampler2D uRefl; uniform vec2 uRes; uniform float uRefK;
uniform vec4 uLP[LN]; uniform vec3 uLC[LN]; uniform vec3 uFogC; uniform float uFogD; uniform vec3 uHorizon; uniform float uFlash;
out vec4 oC;
void main(){
  vec2 p = vW.xz;
  vec2 n1 = texture(uNoise, p * 0.021 + vec2(uTime * 0.011, uTime * 0.007)).rg - 0.5;
  vec2 n2 = texture(uNoise, p * 0.057 + vec2(-uTime * 0.017, uTime * 0.013)).rg - 0.5;
  vec2 n3 = texture(uNoise, p * 0.23 + vec2(uTime * 0.05, -uTime * 0.04)).rg - 0.5;
  vec3 N = normalize(vec3((n1.x + n2.x * 0.7 + n3.x * 0.35) * 0.55, 1.0, (n1.y + n2.y * 0.7 + n3.y * 0.35) * 0.55));
  vec3 V = uCam - vW; float dist = length(V); V /= dist;
  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
  vec2 suv = gl_FragCoord.xy / uRes + N.xz * 0.06;
  vec3 refl = textureLod(uRefl, suv, 1.2).rgb * uRefK + uHorizon * (1.0 - uRefK * 0.6) * 0.45;
  vec3 col = vec3(0.004, 0.012, 0.018);
  vec3 spec = vec3(0.0);
  for (int i = 0; i < LN; i++) {
    vec3 L = uLP[i].xyz - vW; float d = length(L); L /= max(d, 1e-3);
    float a = clamp(1.0 - d / (uLP[i].w * 2.5), 0.0, 1.0);
    vec3 H = normalize(L + V);
    spec += uLC[i] * pow(max(dot(N, H), 0.0), 180.0) * a * 3.0;
  }
  col = mix(col, refl, clamp(fres * 1.4 + 0.15, 0.0, 1.0)) + spec + uFlash * 0.25 * fres;
  float f = 1.0 - exp(-uFogD * uFogD * dist * dist);
  oC = vec4(mix(col, uFogC, f), 1.0);
}`;

// normal (rgb) + gloss (a) map baked from an albedo atlas: luminance is read as height, dark bluish pixels as glass
SH.nmapFS = `
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uK; uniform float uLod; out vec4 oC;
float L(vec2 o){ return dot(textureLod(uTex, vUv + o * uTexel, uLod).rgb, vec3(0.3, 0.55, 0.15)); }
void main(){
  float tl = L(vec2(-1.0, 1.0)), t = L(vec2(0.0, 1.0)), tr = L(vec2(1.0, 1.0)), l = L(vec2(-1.0, 0.0)), r = L(vec2(1.0, 0.0));
  float bl = L(vec2(-1.0, -1.0)), b = L(vec2(0.0, -1.0)), br = L(vec2(1.0, -1.0));
  float dx = (tr + 2.0 * r + br) - (tl + 2.0 * l + bl), dy = (tl + 2.0 * t + tr) - (bl + 2.0 * b + br);
  vec3 n = normalize(vec3(-dx * uK, -dy * uK, 1.0));
  vec3 c = textureLod(uTex, vUv, uLod).rgb; float lum = dot(c, vec3(0.3, 0.55, 0.15));
  float gloss = clamp((0.3 - lum) * 4.0, 0.0, 1.0) * clamp(0.6 + (c.b - c.r) * 4.0, 0.0, 1.0);
  oC = vec4(n * 0.5 + 0.5, gloss);
}`;

SH.bloomPreFS = `
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uThr; out vec4 oC;
vec3 pf(vec3 c){ c = min(c, vec3(24.0)); float br = max(c.r, max(c.g, c.b)); float knee = uThr * 0.6;
  float rq = clamp(br - uThr + knee, 0.0, 2.0 * knee); rq = rq * rq / (4.0 * knee + 1e-4);
  return c * (max(rq, br - uThr) / max(br, 1e-4)); }
void main(){
  vec3 c = pf(texture(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb) + pf(texture(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb)
         + pf(texture(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb) + pf(texture(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb);
  oC = vec4(c * 0.25, 1.0);
}`;
SH.downFS = `
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel; out vec4 oC;
void main(){ vec2 h = uTexel;
  vec3 s = texture(uTex, vUv).rgb * 4.0 + texture(uTex, vUv - h).rgb + texture(uTex, vUv + h).rgb + texture(uTex, vUv + vec2(h.x, -h.y)).rgb + texture(uTex, vUv - vec2(h.x, -h.y)).rgb;
  oC = vec4(s / 8.0, 1.0); }`;
SH.upFS = `
precision highp float; in vec2 vUv; uniform sampler2D uTex; uniform vec2 uTexel; uniform float uW; out vec4 oC;
void main(){ vec2 h = uTexel;
  vec3 s = texture(uTex, vUv + vec2(-h.x * 2.0, 0.0)).rgb + texture(uTex, vUv + vec2(-h.x, h.y)).rgb * 2.0 + texture(uTex, vUv + vec2(0.0, h.y * 2.0)).rgb
   + texture(uTex, vUv + vec2(h.x, h.y)).rgb * 2.0 + texture(uTex, vUv + vec2(h.x * 2.0, 0.0)).rgb + texture(uTex, vUv + vec2(h.x, -h.y)).rgb * 2.0
   + texture(uTex, vUv + vec2(0.0, -h.y * 2.0)).rgb + texture(uTex, vUv + vec2(-h.x, -h.y)).rgb * 2.0;
  oC = vec4(s / 12.0 * uW, 1.0); }`;
SH.compFS = `
precision highp float; in vec2 vUv;
uniform sampler2D uScene; uniform sampler2D uBloom; uniform float uBloomK; uniform float uExpo; uniform float uSat; uniform float uVig;
uniform float uDmg; uniform float uFlash; uniform float uTime; uniform float uGrain; uniform vec2 uRes; uniform float uAspect; uniform vec3 uTint;
uniform vec3 uShadowT; uniform vec3 uHiT; uniform vec3 uLift; uniform float uContrast; uniform float uCA; uniform vec3 uBloomT; uniform float uAA;
out vec4 oC;
float lum(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec3 c;
  if (uCA > 0.0) { vec2 o = (vUv - 0.5) * uCA; c = vec3(texture(uScene, vUv - o).r, texture(uScene, vUv).g, texture(uScene, vUv + o).b); }
  else c = texture(uScene, vUv).rgb;
  if (uAA > 0.0) { // edge smoothing (a light FXAA) where the picture is not multisampled
    vec2 px = 1.0 / uRes;
    float lM = lum(c), lN = lum(texture(uScene, vUv + vec2(0.0, px.y)).rgb), lS = lum(texture(uScene, vUv - vec2(0.0, px.y)).rgb), lE = lum(texture(uScene, vUv + vec2(px.x, 0.0)).rgb), lW = lum(texture(uScene, vUv - vec2(px.x, 0.0)).rgb);
    float lMin = min(lM, min(min(lN, lS), min(lE, lW))), lMax = max(lM, max(max(lN, lS), max(lE, lW)));
    if (lMax - lMin > max(0.03, lMax * 0.14)) {
      vec2 dir = vec2(-((lN + lS) - (lE + lW)), ((lE + lW) - (lN + lS)) * 0.0 + ((lW - lE)));
      dir = vec2(abs(lN - lS) >= abs(lE - lW) ? 1.0 : 0.0, abs(lN - lS) >= abs(lE - lW) ? 0.0 : 1.0); // blur across the edge
      vec3 a = (texture(uScene, vUv + dir * px * 0.75).rgb + texture(uScene, vUv - dir * px * 0.75).rgb) * 0.5;
      c = mix(c, a, 0.6 * uAA);
    }
  }
  c += texture(uBloom, vUv).rgb * uBloomK * uBloomT;
  c *= uExpo * uTint;
  c = aces(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  c = mix(vec3(l), c, uSat);
  c *= mix(uShadowT, uHiT, smoothstep(0.02, 0.55, l));   // cool shadows, warm highlights
  c = uLift + c * (1.0 - uLift);                           // lifted blacks (film)
  vec2 d = (vUv - 0.5) * vec2(uAspect, 1.0);
  float v = smoothstep(1.05, 0.25, length(d));
  c *= mix(1.0, v, uVig);
  float edge = smoothstep(0.35, 1.0, length(d) * 1.2);
  c = mix(c, vec3(0.55, 0.02, 0.06), clamp(uDmg * edge, 0.0, 0.85));
  c += vec3(uFlash);
  c += (hash(vUv * uRes + fract(uTime) * 91.7) - 0.5) * uGrain;
  c = pow(max(c, 0.0), vec3(1.0 / 2.2));
  c = mix(c, c * c * (3.0 - 2.0 * c), uContrast);         // S-curve in display space
  oC = vec4(c, 1.0);
}`;

const Gfx = {
  gl: null, canvas: null, W: 1, H: 1, bw: 1, bh: 1, floatRT: false, aniso: null, anisoMax: 1,
  progs: {}, emptyVAO: null, quality: null,
  rt: {},
  LN: 8,
  compileAll(ln, nm) {
    this.LN = ln; this.NM = !!nm; const N = nm ? { NMAP: 1 } : {};
    const P = (vs, fs, defs) => this.program(vs, fs, Object.assign({ LN: ln }, defs));
    this.progs.lit = P(SH.litVS, SH.litFS, {});
    this.progs.litI = P(SH.litVS, SH.litFS, { INSTANCED: 1 });
    this.progs.atlas = P(SH.litVS, SH.litFS, Object.assign({ ATLAS: 1 }, N));
    this.progs.atlasA = P(SH.litVS, SH.litFS, { ATLAS: 1, ALPHATEST: 1 });
    this.progs.wet = P(SH.litVS, SH.litFS, Object.assign({ ATLAS: 1, WET: 1 }, N));
    this.progs.water = P(SH.waterVS, SH.waterFS, {});
    this.progs.skin = P(SH.skinVS, SH.litFS, { SKIN: 1, NBONES: NB });
  },
  init(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: true, stencil: false, powerPreference: 'high-performance', premultipliedAlpha: false, preserveDrawingBuffer: false });
    if (!gl) return false;
    this.gl = gl;
    this.floatRT = !!gl.getExtension('EXT_color_buffer_float');
    const an = gl.getExtension('EXT_texture_filter_anisotropic');
    if (an) { this.aniso = an; this.anisoMax = Math.min(8, gl.getParameter(an.MAX_TEXTURE_MAX_ANISOTROPY_EXT)); }
    this.emptyVAO = gl.createVertexArray();
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK); gl.frontFace(gl.CCW);
    const P = (vs, fs, defs) => this.program(vs, fs, defs);
    this.compileAll(8, false);
    this.progs.nmap = P(SH.quadVS, SH.nmapFS, {});
    this.progs.glow = P(SH.litVS, SH.glowFS, {});
    this.progs.glowI = P(SH.litVS, SH.glowFS, { INSTANCED: 1 });
    this.progs.sky = P(SH.skyVS, SH.skyFS, {});
    this.progs.rain = P(SH.rainVS, SH.rainFS, {});
    this.progs.part = P(SH.partVS, SH.partFS, {});
    this.progs.beam = P(SH.beamVS, SH.beamFS, {});
    this.progs.glare = P(SH.glareVS, SH.glareFS, {});
    this.progs.pre = P(SH.quadVS, SH.bloomPreFS, {});
    this.progs.down = P(SH.quadVS, SH.downFS, {});
    this.progs.up = P(SH.quadVS, SH.upFS, {});
    this.progs.comp = P(SH.quadVS, SH.compFS, {});
    this.white = this.texData(1, 1, new Uint8Array([255, 255, 255, 255]));
    this.black = this.texData(1, 1, new Uint8Array([0, 0, 0, 255]));
    return true;
  },
  program(vs, fs, defs) {
    const gl = this.gl;
    const head = '#version 300 es\n' + Object.keys(defs).map(k => '#define ' + k + ' ' + defs[k] + '\n').join('');
    const mk = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, head + src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const log = gl.getShaderInfoLog(s); console.error(log, src); throw new Error('Shader: ' + log); }
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link: ' + gl.getProgramInfoLog(p));
    const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); const name = info.name.replace(/\[0\]$/, ''); u[name] = gl.getUniformLocation(p, info.name); }
    return { p, u, tex: 0 };
  },
  use(pr) { this.gl.useProgram(pr.p); pr.tex = 0; this.cur = pr; return pr; },
  f1(n, v) { const l = this.cur.u[n]; if (l) this.gl.uniform1f(l, v); },
  f2(n, a, b) { const l = this.cur.u[n]; if (l) this.gl.uniform2f(l, a, b); },
  f3(n, a, b, c) { const l = this.cur.u[n]; if (l) this.gl.uniform3f(l, a, b, c); },
  f4(n, a, b, c, d) { const l = this.cur.u[n]; if (l) this.gl.uniform4f(l, a, b, c, d); },
  v3(n, arr) { const l = this.cur.u[n]; if (l) this.gl.uniform3fv(l, arr); },
  v4(n, arr) { const l = this.cur.u[n]; if (l) this.gl.uniform4fv(l, arr); },
  m4(n, m) { const l = this.cur.u[n]; if (l) this.gl.uniformMatrix4fv(l, false, m); },
  t(n, tex) { const l = this.cur.u[n]; if (!l) return; const gl = this.gl; const unit = this.cur.tex++; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tex); gl.uniform1i(l, unit); },

  texData(w, h, data) {
    const gl = this.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return t;
  },
  texCanvas(cv, opt = {}) {
    const gl = this.gl; const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, opt.flipY !== false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    const wrap = opt.clamp ? gl.CLAMP_TO_EDGE : gl.REPEAT;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    if (opt.mips !== false) { gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); }
    else gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (this.aniso && opt.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, this.anisoMax);
    return t;
  },
  // bake a normal + gloss map from an albedo texture (w × h target, reading the source at mip level lod)
  bakeNormals(src, w, h, k, lod) {
    const gl = this.gl; const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.viewport(0, 0, w, h); gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.disable(gl.CULL_FACE);
    this.use(this.progs.nmap); this.t('uTex', src); this.f2('uTexel', 1 / w, 1 / h); this.f1('uK', k); this.f1('uLod', lod || 0); this.quad();
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.deleteFramebuffer(fb);
    gl.bindTexture(gl.TEXTURE_2D, tex); gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, this.anisoMax);
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE);
    return tex;
  },
  // render target with texture color (+ optional depth renderbuffer)
  makeRT(w, h, depth, mips) {
    const gl = this.gl; const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
    const fl = this.floatRT;
    gl.texImage2D(gl.TEXTURE_2D, 0, fl ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, fl ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mips ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (mips) gl.generateMipmap(gl.TEXTURE_2D);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    let rb = null;
    if (depth) { rb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, rb); gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT24, w, h); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb); }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return { fb, tex, rb, w, h, mips };
  },
  makeMSRT(w, h, samples) {
    const gl = this.gl; const fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    const crb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, crb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, this.floatRT ? gl.RGBA16F : gl.RGBA8, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, crb);
    const drb = gl.createRenderbuffer(); gl.bindRenderbuffer(gl.RENDERBUFFER, drb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, w, h);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, drb);
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    if (!ok) return null;
    return { fb, crb, drb, w, h };
  },
  freeRT(r) { if (!r) return; const gl = this.gl; gl.deleteFramebuffer(r.fb); if (r.tex) gl.deleteTexture(r.tex); if (r.rb) gl.deleteRenderbuffer(r.rb); if (r.crb) gl.deleteRenderbuffer(r.crb); if (r.drb) gl.deleteRenderbuffer(r.drb); },

  setup(q) { // q: {scale, msaa, bloom, refl, lights}
    this.quality = q;
    if ((q.lights && q.lights !== this.LN) || !!q.nmap !== this.NM) this.compileAll(q.lights || this.LN, q.nmap);
    const dpr = Math.min(window.devicePixelRatio || 1, q.maxDpr);
    const cw = Math.max(1, this.canvas.clientWidth || window.innerWidth), ch = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    const bw = Math.max(2, Math.round(cw * dpr * q.scale)), bh = Math.max(2, Math.round(ch * dpr * q.scale));
    if (this.bw === bw && this.bh === bh && this._qkey === JSON.stringify(q)) return;
    this._qkey = JSON.stringify(q);
    this.canvas.width = bw; this.canvas.height = bh; this.bw = bw; this.bh = bh; this.W = cw; this.H = ch;
    const r = this.rt; ['scene', 'ms', 'refl'].forEach(k => { this.freeRT(r[k]); r[k] = null; });
    (r.bloom || []).forEach(x => this.freeRT(x)); r.bloom = [];
    r.scene = this.makeRT(bw, bh, true, false);
    if (q.msaa > 0) r.ms = this.makeMSRT(bw, bh, Math.min(q.msaa, this.gl.getParameter(this.gl.MAX_SAMPLES)));
    if (q.refl) r.refl = this.makeRT(Math.max(2, bw >> 1), Math.max(2, bh >> 1), true, true);
    if (q.bloom) { let w = bw, h = bh; for (let i = 0; i < 5; i++) { w = Math.max(2, w >> 1); h = Math.max(2, h >> 1); r.bloom.push(this.makeRT(w, h, false, false)); } }
  },
  quad() { const gl = this.gl; gl.bindVertexArray(this.emptyVAO); gl.drawArrays(gl.TRIANGLES, 0, 3); },
  blendMode(m) {
    const gl = this.gl;
    if (m === 'none') { gl.disable(gl.BLEND); gl.depthMask(true); }
    else if (m === 'add') { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false); }
    else if (m === 'alpha') { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); }
    else if (m === 'mul') { gl.enable(gl.BLEND); gl.blendFunc(gl.ZERO, gl.SRC_COLOR); gl.depthMask(false); }
  },
  post(p) { // p: {bloomK, thr, expo, sat, vig, dmg, flash, time, grain, tint}
    const gl = this.gl, r = this.rt;
    gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.disable(gl.BLEND); gl.depthMask(false);
    if (r.ms) {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, r.ms.fb); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, r.scene.fb);
      gl.blitFramebuffer(0, 0, this.bw, this.bh, 0, 0, this.bw, this.bh, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
    }
    let bloomTex = this.black;
    if (r.bloom.length) {
      const B = r.bloom;
      gl.bindFramebuffer(gl.FRAMEBUFFER, B[0].fb); gl.viewport(0, 0, B[0].w, B[0].h);
      this.use(this.progs.pre); this.t('uTex', r.scene.tex); this.f2('uTexel', 1 / this.bw, 1 / this.bh); this.f1('uThr', p.thr); this.quad();
      for (let i = 1; i < B.length; i++) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B[i].fb); gl.viewport(0, 0, B[i].w, B[i].h);
        this.use(this.progs.down); this.t('uTex', B[i - 1].tex); this.f2('uTexel', 1 / B[i - 1].w, 1 / B[i - 1].h); this.quad();
      }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      for (let i = B.length - 2; i >= 0; i--) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, B[i].fb); gl.viewport(0, 0, B[i].w, B[i].h);
        this.use(this.progs.up); this.t('uTex', B[i + 1].tex); this.f2('uTexel', 0.5 / B[i + 1].w, 0.5 / B[i + 1].h); this.f1('uW', 1.0); this.quad();
      }
      gl.disable(gl.BLEND);
      bloomTex = B[0].tex;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, this.bw, this.bh);
    this.use(this.progs.comp);
    this.t('uScene', r.scene.tex); this.t('uBloom', bloomTex);
    this.f1('uBloomK', r.bloom.length ? p.bloomK : 0); this.f1('uExpo', p.expo); this.f1('uSat', p.sat); this.f1('uVig', p.vig);
    this.f1('uDmg', p.dmg); this.f1('uFlash', p.flash); this.f1('uTime', p.time); this.f1('uGrain', p.grain);
    this.f2('uRes', this.bw, this.bh); this.f1('uAspect', this.bw / this.bh); this.f3('uTint', p.tint[0], p.tint[1], p.tint[2]);
    const g = p.grade; this.f3('uShadowT', g.shadow[0], g.shadow[1], g.shadow[2]); this.f3('uHiT', g.hi[0], g.hi[1], g.hi[2]); this.f3('uLift', g.lift[0], g.lift[1], g.lift[2]);
    this.f1('uContrast', g.contrast); this.f1('uCA', this.quality && this.quality.ca ? g.ca : 0); this.f3('uBloomT', g.bloom[0], g.bloom[1], g.bloom[2]); this.f1('uAA', r.ms ? 0 : 1);
    this.quad();
    gl.enable(gl.DEPTH_TEST); gl.enable(gl.CULL_FACE); gl.depthMask(true);
  }
};

/* ---------- meshes ---------- */
class Mesh {
  constructor(geo) {
    const gl = Gfx.gl; this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.bufs = [];
    const attr = (loc, data, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); this.bufs.push(b); };
    attr(0, geo.pos, 3); attr(1, geo.nrm, 3); attr(2, geo.uv, 4); attr(3, geo.col, 4);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
    this.ib = ib; this.count = geo.idx.length; this.itype = geo.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    gl.bindVertexArray(null);
  }
  draw() { const gl = Gfx.gl; gl.bindVertexArray(this.vao); gl.drawElements(gl.TRIANGLES, this.count, this.itype, 0); }
}
/* ---------- city geometry split into square tiles, drawn only when in range and in view ---------- */
const CHUNK = 80;
const Cull = {
  pass: null, stats: { parts: 0, drawn: 0, tris: 0 },
  // pass: { planes: Float32Array(24), x, z, maxD }
  visible(q, pass) {
    if (!pass) return true;
    if (!q.global) { const dx = Math.max(q.x0 - pass.x, 0, pass.x - q.x1), dz = Math.max(q.z0 - pass.z, 0, pass.z - q.z1); if (dx * dx + dz * dz > pass.maxD * pass.maxD) return false; }
    const P = pass.planes;
    for (let i = 0; i < 6; i++) { const a = P[i * 4], b = P[i * 4 + 1], c = P[i * 4 + 2], d = P[i * 4 + 3]; if (a * (a > 0 ? q.x1 : q.x0) + b * (b > 0 ? q.y1 : q.y0) + c * (c > 0 ? q.z1 : q.z0) + d < 0) return false; }
    return true;
  }
};
class ChunkMesh {
  static split(geo, name) {
    const P = geo.pos, N = geo.nrm, U = geo.uv, C = geo.col, I = geo.idx;
    const buckets = new Map();
    const get = key => { let b = buckets.get(key); if (!b) { b = { key, p: [], n: [], u: [], c: [], i: [], map: new Map(), x0: 1e9, y0: 1e9, z0: 1e9, x1: -1e9, y1: -1e9, z1: -1e9 }; buckets.set(key, b); } return b; };
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2];
      const ax = P[a * 3], az = P[a * 3 + 2], bx = P[b * 3], bz = P[b * 3 + 2], cx = P[c * 3], cz = P[c * 3 + 2];
      const ext = Math.max(Math.max(ax, bx, cx) - Math.min(ax, bx, cx), Math.max(az, bz, cz) - Math.min(az, bz, cz));
      const key = ext > CHUNK * 0.75 ? 'G' : Math.floor((ax + bx + cx) / 3 / CHUNK) * 1000 + Math.floor((az + bz + cz) / 3 / CHUNK);
      const B = get(key);
      for (let k = 0; k < 3; k++) {
        const v = I[t + k]; let nv = B.map.get(v);
        if (nv === undefined) {
          nv = B.p.length / 3; B.map.set(v, nv);
          const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
          B.p.push(x, y, z); B.n.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); B.u.push(U[v * 4], U[v * 4 + 1], U[v * 4 + 2], U[v * 4 + 3]); B.c.push(C[v * 4], C[v * 4 + 1], C[v * 4 + 2], C[v * 4 + 3]);
          if (x < B.x0) B.x0 = x; if (x > B.x1) B.x1 = x; if (y < B.y0) B.y0 = y; if (y > B.y1) B.y1 = y; if (z < B.z0) B.z0 = z; if (z > B.z1) B.z1 = z;
        }
        B.i.push(nv);
      }
    }
    const cm = new ChunkMesh(); cm.name = name; cm.parts = [];
    for (const B of buckets.values()) {
      const vc = B.p.length / 3;
      const g = { pos: new Float32Array(B.p), nrm: new Float32Array(B.n), uv: new Float32Array(B.u), col: new Float32Array(B.c), idx: vc > 65535 ? new Uint32Array(B.i) : new Uint16Array(B.i) };
      cm.parts.push({ mesh: new Mesh(g), global: B.key === 'G', x0: B.x0, y0: B.y0, z0: B.z0, x1: B.x1, y1: B.y1, z1: B.z1, tris: B.i.length / 3 });
    }
    return cm;
  }
  draw() {
    const pass = Cull.pass, st = Cull.stats;
    for (const q of this.parts) { st.parts++; if (!Cull.visible(q, pass)) continue; st.drawn++; st.tris += q.tris; q.mesh.draw(); }
  }
}
const ISTRIDE = 20;
class Instanced {
  constructor(geo, max) {
    const gl = Gfx.gl; this.max = max; this.count = 0; this.data = new Float32Array(max * ISTRIDE);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const attr = (loc, data, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); };
    attr(0, geo.pos, 3); attr(1, geo.nrm, 3); attr(2, geo.uv, 4); attr(3, geo.col, 4);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.idx, gl.STATIC_DRAW);
    this.icount = geo.idx.length; this.itype = geo.idx instanceof Uint32Array ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
    this.ibuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf); gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 4; i++) { gl.enableVertexAttribArray(4 + i); gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, ISTRIDE * 4, i * 16); gl.vertexAttribDivisor(4 + i, 1); }
    gl.enableVertexAttribArray(8); gl.vertexAttribPointer(8, 4, gl.FLOAT, false, ISTRIDE * 4, 64); gl.vertexAttribDivisor(8, 1);
    gl.bindVertexArray(null);
  }
  reset() { this.count = 0; }
  // push parent*local matrix with color
  pushMul(a, b, r, g, bl, e) {
    if (this.count >= this.max) return;
    const o = this.count * ISTRIDE; M4.mulInto(this.data, o, a, b);
    const d = this.data; d[o + 16] = r; d[o + 17] = g; d[o + 18] = bl; d[o + 19] = e; this.count++;
  }
  push(m, r, g, bl, e) {
    if (this.count >= this.max) return;
    const o = this.count * ISTRIDE; const d = this.data; for (let i = 0; i < 16; i++) d[o + i] = m[i];
    d[o + 16] = r; d[o + 17] = g; d[o + 18] = bl; d[o + 19] = e; this.count++;
  }
  upload() { if (!this.count) return; const gl = Gfx.gl; gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.count * ISTRIDE); }
  draw() { if (!this.count) return; const gl = Gfx.gl; gl.bindVertexArray(this.vao); gl.drawElementsInstanced(gl.TRIANGLES, this.icount, this.itype, 0, this.count); }
}
// camera-facing particle batch (instanced quads)
class Particles {
  constructor(max) {
    const gl = Gfx.gl; this.max = max; this.count = 0; this.data = new Float32Array(max * 12);
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.5, -0.5, 0, 0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, -0.5, 0, 0.5, 0.5, 0, -0.5, 0.5, 0]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.ibuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf); gl.bufferData(gl.ARRAY_BUFFER, this.data.byteLength, gl.DYNAMIC_DRAW);
    for (let i = 0; i < 3; i++) { gl.enableVertexAttribArray(4 + i); gl.vertexAttribPointer(4 + i, 4, gl.FLOAT, false, 48, i * 16); gl.vertexAttribDivisor(4 + i, 1); }
    gl.bindVertexArray(null);
  }
  reset() { this.count = 0; }
  push(x, y, z, size, r, g, b, a, rot, stretch, cell, flat) {
    if (this.count >= this.max) return; const o = this.count * 12, d = this.data;
    d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = size; d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = a;
    d[o + 8] = rot; d[o + 9] = stretch; d[o + 10] = cell; d[o + 11] = flat ? 1 : 0; this.count++;
  }
  draw() { if (!this.count) return; const gl = Gfx.gl; gl.bindBuffer(gl.ARRAY_BUFFER, this.ibuf); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.data, 0, this.count * 12); gl.bindVertexArray(this.vao); gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, this.count); }
}
// camera-facing ribbons (tracers, lasers, beams), CPU-expanded
class Beams {
  constructor(max) {
    const gl = Gfx.gl; this.max = max; this.n = 0;
    this.pos = new Float32Array(max * 4 * 3); this.col = new Float32Array(max * 4 * 4); this.uv = new Float32Array(max * 4 * 4);
    const idx = new Uint16Array(max * 6); for (let i = 0; i < max; i++) { idx.set([i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3], i * 6); }
    for (let i = 0; i < max; i++) { this.uv.set([0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0], i * 16); }
    this.vao = gl.createVertexArray(); gl.bindVertexArray(this.vao);
    this.bp = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bp); gl.bufferData(gl.ARRAY_BUFFER, this.pos.byteLength, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    this.bc = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, this.bc); gl.bufferData(gl.ARRAY_BUFFER, this.col.byteLength, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 0, 0);
    const bu = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, bu); gl.bufferData(gl.ARRAY_BUFFER, this.uv, gl.STATIC_DRAW); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);
    gl.bindVertexArray(null);
  }
  reset() { this.n = 0; }
  push(ax, ay, az, bx, by, bz, w, r, g, b, a, cam) {
    if (this.n >= this.max) return;
    // side vector = normalize(cross(dir, viewdir))
    const dx = bx - ax, dy = by - ay, dz = bz - az;
    const mx = (ax + bx) / 2 - cam.x, my = (ay + by) / 2 - cam.y, mz = (az + bz) / 2 - cam.z;
    let sx = dy * mz - dz * my, sy = dz * mx - dx * mz, sz = dx * my - dy * mx; const l = Math.hypot(sx, sy, sz) || 1; sx *= w / l; sy *= w / l; sz *= w / l;
    const o = this.n * 12, p = this.pos;
    p[o] = ax - sx; p[o + 1] = ay - sy; p[o + 2] = az - sz; p[o + 3] = bx - sx; p[o + 4] = by - sy; p[o + 5] = bz - sz;
    p[o + 6] = bx + sx; p[o + 7] = by + sy; p[o + 8] = bz + sz; p[o + 9] = ax + sx; p[o + 10] = ay + sy; p[o + 11] = az + sz;
    const c = this.col, oc = this.n * 16; for (let i = 0; i < 4; i++) { c[oc + i * 4] = r; c[oc + i * 4 + 1] = g; c[oc + i * 4 + 2] = b; c[oc + i * 4 + 3] = a; }
    this.n++;
  }
  draw() {
    if (!this.n) return; const gl = Gfx.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bp); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.pos, 0, this.n * 12);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bc); gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.col, 0, this.n * 16);
    gl.bindVertexArray(this.vao); gl.drawElements(gl.TRIANGLES, this.n * 6, gl.UNSIGNED_SHORT, 0);
  }
}

