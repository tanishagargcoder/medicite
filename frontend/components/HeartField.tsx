"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

/* ---------------------------------------------------------------- constants */

// Enough to fill a wide screen while each ball still reads as its own sphere.
const COUNT = 5200;
const CAM_START_Z = 11.5;
const CAM_END_Z = 9;
const POINTER_RADIUS = 2.4;
const POINTER_STRENGTH = 1.3;

const Lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Implicit unit heart: (x² + y² − 1)³ − x²y³ ≤ 0 inside the shape. */
function insideHeart(x: number, y: number) {
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

/** Rejection-sample a solid 3D heart: fill the 2D silhouette, then give it
 *  thickness that tapers toward the edges so it reads as a volume, not a slab. */
function sampleHeart(): [number, number, number] {
  for (;;) {
    const x = (Math.random() * 2 - 1) * 1.3;
    const y = (Math.random() * 2 - 1) * 1.3;
    if (!insideHeart(x, y)) continue;
    // Distance-ish to the edge drives thickness.
    const a = x * x + y * y - 1;
    const d = -(a * a * a - x * x * y * y * y);
    const thickness = Math.min(1, Math.pow(Math.max(d, 0), 0.28)) * 0.55;
    const z = (Math.random() * 2 - 1) * thickness;
    return [x * 3.1, y * 3.1 + 0.35, z * 3.1];
  }
}

/* ------------------------------------------------------------------ shaders */

const VERT = /* glsl */ `
attribute vec3 aGrid;
attribute vec3 aScatter;
attribute vec3 aHeart;
attribute float aSeed;
attribute float aSize;

uniform float uTime;
uniform float uMorph;     // 0 = orb, 1 = scattered, 2 = heart
uniform float uAppear;
uniform float uDrop;      // 0 = still falling in, 1 = settled
uniform vec3  uCursor;
uniform float uRepelRadius;
uniform float uRepelStrength;
uniform float uActivity;

varying float vDepth;
varying float vSeed;
varying float vDrop;

void main() {
  // Two-leg morph: orb -> scatter -> heart, each leg eased independently.
  float legA = clamp(uMorph, 0.0, 1.0);
  float legB = clamp(uMorph - 1.0, 0.0, 1.0);
  legA = legA * legA * (3.0 - 2.0 * legA);
  legB = legB * legB * (3.0 - 2.0 * legB);

  // The resting field drifts in a slow spiral around the centre of the screen.
  // Rotating in XY (around the view axis) keeps every sphere on screen, and the
  // radius term makes the outside lag behind the middle — a lazy galaxy turn.
  vec3 orb = aGrid;
  float rl = length(orb.xy) + 0.0001;
  float swirl = uTime * 0.22 - rl * 0.045;
  float cs = cos(swirl), sn = sin(swirl);
  orb.xy = mat2(cs, -sn, sn, cs) * orb.xy;
  // A gentle sideways breath so it never looks like a rigid turntable.
  orb.z += sin(uTime * 0.4 + rl * 0.35) * 0.6;

  vec3 pos = mix(orb, aScatter, legA);
  pos = mix(pos, aHeart, legB);

  // Entrance: spheres rain in from above and decelerate into place. Each one is
  // staggered by its seed so the field lands as a shower, not a single slab.
  float d = clamp((uDrop - aSeed * 0.4) / 0.6, 0.0, 1.0);
  d = 1.0 - pow(1.0 - d, 3.0);   // ease-out: fast fall, soft settle
  vDrop = d;
  pos.y += (1.0 - d) * 26.0;

  // Idle drift so nothing is ever perfectly static.
  float wob = sin(uTime * 0.8 + aSeed * 6.28318) * 0.06;
  pos += vec3(wob, wob * 0.7, wob * 0.5) * (1.0 - legB * 0.6);

  vec4 mp = modelMatrix * vec4(pos, 1.0);

  // Cursor pushes the spheres aside.
  vec3 toP = mp.xyz - uCursor;
  float cd = length(toP);
  float fall = smoothstep(uRepelRadius, 0.0, cd);
  mp.xyz += normalize(toP + vec3(0.0001)) * fall * uRepelStrength * uActivity;

  vec4 mv = viewMatrix * mp;

  vDepth = clamp((mp.z + 3.5) / 7.0, 0.0, 1.0);
  vSeed = aSeed;

  // Keep each ball a distinct dot (~10-20px). A larger factor here makes the
  // sprites overlap into one blurred mass instead of a scattered field.
  gl_PointSize = aSize * (12.0 / -mv.z) * uAppear;
  gl_PointSize = max(gl_PointSize, 1.0);
  gl_Position = projectionMatrix * mv;
}
`;

const FRAG = /* glsl */ `
uniform vec3 uDeep;
uniform vec3 uLight;
uniform float uAppear;

varying float vDepth;
varying float vSeed;
varying float vDrop;

void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot(p, p);
  if (r2 > 1.0) discard;

  // Fake a lit sphere: reconstruct a normal from the sprite disc and shade it.
  vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r2)));
  vec3 lightDir = normalize(vec3(-0.45, 0.75, 0.55));
  float diff = clamp(dot(n, lightDir), 0.0, 1.0);
  float spec = pow(clamp(dot(reflect(-lightDir, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 22.0);
  float rim = pow(1.0 - n.z, 2.2) * 0.35;

  vec3 base = mix(uDeep, uLight, vDepth * 0.75 + vSeed * 0.25);
  // Deeper shading range and a hotter highlight give each ball a readable form
  // instead of a flat blue dot.
  vec3 col = base * (0.18 + 0.82 * diff) + vec3(spec) * 1.15 + uLight * rim;

  // Tight falloff: crisp rim, no soft halo bleeding into its neighbours.
  float edge = smoothstep(1.0, 0.90, r2);
  // Fade each sphere in as it falls, so they arrive rather than pop.
  gl_FragColor = vec4(col, edge * uAppear * vDrop);
}
`;

/* ---------------------------------------------------------------- component */

export default function HeartField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Respect users who don't want motion: render one static frame.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight, false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    );
    camera.position.set(0, 0, CAM_START_Z);

    /* ---- geometry: three position sets the shader morphs between ---- */
    const grid = new Float32Array(COUNT * 3);
    const scatter = new Float32Array(COUNT * 3);
    const heart = new Float32Array(COUNT * 3);
    const seeds = new Float32Array(COUNT);
    const sizes = new Float32Array(COUNT);

    // A wide slab that overfills the frame, so the field reads as an open sky of
    // spheres rather than a ball floating in the middle. Sized against what the
    // camera can see at CAM_START_Z (FOV 45) with margin for wide screens.
    // Wide enough to still reach the edges on a 21:9 display: at the far plane
    // the camera sees roughly 29 units across, 13 tall.
    const FIELD_W = 34;
    const FIELD_H = 16;
    const FIELD_D = 7;

    for (let i = 0; i < COUNT; i++) {
      grid[i * 3] = (Math.random() - 0.5) * FIELD_W;
      grid[i * 3 + 1] = (Math.random() - 0.5) * FIELD_H;
      grid[i * 3 + 2] = (Math.random() - 0.5) * FIELD_D;

      // Scattered cloud, biased downward so the field reads as "dropping".
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      const rr = 5 + Math.random() * 5;
      scatter[i * 3] = Math.sin(ph) * Math.cos(th) * rr;
      scatter[i * 3 + 1] = Math.cos(ph) * rr * 0.7 - 3.2;
      scatter[i * 3 + 2] = Math.sin(ph) * Math.sin(th) * rr * 0.6;

      const [hx, hy, hz] = sampleHeart();
      heart[i * 3] = hx;
      heart[i * 3 + 1] = hy;
      heart[i * 3 + 2] = hz;

      seeds[i] = Math.random();
      sizes[i] = 9 + Math.random() * 9;
    }

    const geo = new THREE.BufferGeometry();
    // `position` is required by three, but the shader drives placement from the
    // morph targets — point it at the grid so bounds are sane.
    geo.setAttribute("position", new THREE.BufferAttribute(grid, 3));
    geo.setAttribute("aGrid", new THREE.BufferAttribute(grid, 3));
    geo.setAttribute("aScatter", new THREE.BufferAttribute(scatter, 3));
    geo.setAttribute("aHeart", new THREE.BufferAttribute(heart, 3));
    geo.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));

    const uniforms = {
      uTime: { value: 0 },
      uMorph: { value: 0 },
      uAppear: { value: 0 },
      uDrop: { value: 0 },
      uCursor: { value: new THREE.Vector3() },
      uRepelRadius: { value: POINTER_RADIUS },
      uRepelStrength: { value: POINTER_STRENGTH },
      uActivity: { value: 0 },
      uDeep: { value: new THREE.Color("#1d4ed8") },
      uLight: { value: new THREE.Color("#dbeafe") },
    };

    const mat = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      // Depth on: nearer spheres properly occlude farther ones. Without this
      // every ball blends through its neighbours and the field turns to haze.
      depthTest: true,
      depthWrite: true,
    });

    const points = new THREE.Points(geo, mat);
    points.frustumCulled = false;
    scene.add(points);

    /* ---- input ---- */
    const mouseTarget = { x: 0, y: 0 };
    const mouse = { x: 0, y: 0 };
    const POINTER = { world: new THREE.Vector3(), activity: 0, active: false, lastMove: 0 };
    let scrollTarget = 0;
    let scrollSmooth = 0;

    const onScroll = () => {
      // The hero morph plays out over roughly the first two screens.
      const span = window.innerHeight * 2;
      scrollTarget = clamp(window.scrollY / span, 0, 1);
    };
    const onMove = (e: MouseEvent) => {
      mouseTarget.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouseTarget.y = -((e.clientY / window.innerHeight) * 2 - 1);
      POINTER.active = true;
      POINTER.lastMove = performance.now();
    };
    const onOut = () => {
      POINTER.active = false;
    };
    const onResize = () => {
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      onScroll();
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("resize", onResize);
    onScroll();

    const _ndc = new THREE.Vector3();
    const _dir = new THREE.Vector3();
    const _tgt = new THREE.Vector3();
    function updatePointerWorld() {
      _tgt.set(0, 0, 0);
      if (POINTER.active) {
        _ndc.set(mouse.x, mouse.y, 0.5).unproject(camera);
        _dir.copy(_ndc).sub(camera.position).normalize();
        const dn = _dir.z;
        if (Math.abs(dn) > 1e-4) {
          const tt = -camera.position.z / dn;
          if (tt > 0 && Number.isFinite(tt)) _tgt.copy(camera.position).addScaledVector(_dir, tt);
        }
      }
      POINTER.world.lerp(_tgt, 0.12);
      const idle = (performance.now() - POINTER.lastMove) / 1000;
      POINTER.activity += (((POINTER.active && idle < 3) ? 1 : 0) - POINTER.activity) * 0.06;
    }

    /* ---- loop ---- */
    const appearStart = performance.now();
    let raf = 0;

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const t = performance.now() / 1000;

      scrollSmooth = Lerp(scrollSmooth, scrollTarget, 0.075);
      mouse.x = Lerp(mouse.x, mouseTarget.x, 0.06);
      mouse.y = Lerp(mouse.y, mouseTarget.y, 0.06);

      uniforms.uTime.value = t;
      uniforms.uMorph.value = scrollSmooth * 2; // 0..1 scatter, 1..2 heart

      camera.position.x = Lerp(camera.position.x, mouse.x * 0.9, 0.05);
      camera.position.y = Lerp(camera.position.y, mouse.y * 0.6, 0.05);
      camera.position.z = Lerp(CAM_START_Z, CAM_END_Z, scrollSmooth);
      camera.lookAt(0, 0, 0);

      // Slow turn as the heart forms, so it presents itself.
      points.rotation.y = Math.sin(t * 0.15) * 0.12 + scrollSmooth * 0.35;

      updatePointerWorld();
      uniforms.uCursor.value.copy(POINTER.world);
      uniforms.uActivity.value = POINTER.activity;

      const elapsed = (performance.now() - appearStart) / 1000;
      uniforms.uAppear.value = clamp((elapsed - 0.1) / 0.6, 0, 1);
      // The fall runs a little longer than the fade so the last spheres are
      // still visibly settling as the field completes.
      uniforms.uDrop.value = clamp(elapsed / 2.4, 0, 1);

      renderer.render(scene, camera);
    };

    if (reduceMotion) {
      uniforms.uAppear.value = 1;
      uniforms.uDrop.value = 1; // already landed — skip the entrance
      uniforms.uMorph.value = 2; // show the finished heart, no animation
      renderer.render(scene, camera);
    } else {
      frame();
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("resize", onResize);
      geo.dispose();
      mat.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-screen w-screen"
    />
  );
}
