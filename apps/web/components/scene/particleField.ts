/**
 * Pole cząstek — silnik sceny 3D „Instrument w przestrzeni".
 *
 * **Skąd to jest.** Kierunek przyjęty 2026-10-20 na wzór aim-motion-podglad
 * (analiza: `docs/KIERUNEK-3D.md`). Tamta strona rysuje kulę, galaktykę i mózg
 * z punktów przez three.js ładowany z unpkg (~150 kB po gzipie) — a z całej
 * biblioteki używa wyłącznie `Points`, `ShaderMaterial` i kamery perspektywy.
 * Ten plik robi to samo na gołym WebGL 1 w kilku kilobajtach: jeden program,
 * jeden bufor, jedno wywołanie rysowania na klatkę.
 *
 * **To jest KOPIA** (Portal, hero drabinki). Kanoniczny plik stoi w repo `leadersofteams.com`
 * (`src/components/scene/particleField.ts`). Zmieniając silnik, zmień wszystkie
 * trzy kopie i podbij `FIELD_VERSION` — rozjazd wersji widać jednym grepem
 * (`grep -rn FIELD_VERSION`). Ta sama zasada co lista Ekosystemu: dosłownie
 * to samo w każdym repo, poza tym akapitem.
 *
 * **Model.** Każdy punkt ma do czterech pozycji (formacji) i rolę koloru
 * w każdej z nich. JS podaje tylko jedną liczbę — `stage` z przedziału
 * 0…(formacje − 1) — a shader sam interpoluje pozycję i barwę, każdy punkt
 * z własnym opóźnieniem. Dzięki temu przewijanie nie dotyka bufora: zmienia
 * jeden uniform.
 *
 * **Kolory nie są tu zapisane.** Paleta to lista nazw zmiennych CSS (ról
 * z `@theme`), odczytywana raz przy starcie i przeliczana przez canvas 2D,
 * więc działa dla każdego formatu, w jakim arkusz poda kolor. Przemalowanie
 * serwisu przemalowuje scenę bez edycji tego pliku.
 *
 * **Kiedy silnik odmawia (zwraca `null`) — i to jest stan poprawny:**
 * - przeglądarka zgłasza `failIfMajorPerformanceCaveat` (GPU na czarnej
 *   liście, sterownik uznany za zbyt wolny),
 * - brak WebGL albo błąd kompilacji shadera.
 *
 * **Uwaga, sprostowanie z 2026-10-20.** Pierwsza wersja tego akapitu twierdziła,
 * że flaga odrzuca też renderowanie programowe (SwiftShader). Pomiar mówi
 * inaczej: headless Chromium 1194 z SwiftShaderem zwraca kontekst przy
 * `failIfMajorPerformanceCaveat: true`. Skutek jest dobry, ale trzeba go znać —
 * bramki przeglądarkowe (`check:perf`, `check:wcag`) mierzą stronę ZE sceną,
 * na CPU, z dławieniem ÷4. Scena nie dostaje tam taryfy ulgowej.
 *
 * **Render programowy dostaje poziom telefonu (od `FIELD_VERSION` 3).** Skoro
 * SwiftShader, llvmpipe i podobne nie odmawiają, scena liczy każdy punkt na tym
 * samym CPU, które obsługuje przewijanie. Na runnerze CI dało to p95 33,4 ms na
 * `/` trzy przebiegi z rzędu przy 16,7 ms na trasach bez sceny (2026-10-21).
 * U człowieka to maszyna bez akceleracji (VM, GPU na czarnej liście), więc
 * 35% punktów i 30 kl./s są tam właściwą decyzją, a nie zabiegiem pod bramkę.
 * Bramki dalej mierzą stronę ZE sceną, tyle że w tym poziomie.
 *
 * W każdym z tych przypadków wywołujący zostawia stronę taką, jaka jest bez
 * sceny.
 * Nic nie może od sceny zależeć: ani treść, ani układ.
 */

export const FIELD_VERSION = 3;

/** Generator deterministyczny — ta sama scena przy każdym wejściu. */
export const mulberry = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Rand = () => number;

/**
 * Punkt formacji: pozycja w jednostkach sceny i indeks roli w palecie.
 * `prev` to pozycja tego samego punktu w poprzedniej formacji (w pierwszej:
 * zera) — pozwala zbudować przejście, które zachowuje kierunek punktu.
 */
export type FormationFn = (
  i: number,
  count: number,
  rand: Rand,
  prev: readonly [number, number, number],
) => [number, number, number, number];

export interface SceneSpec {
  /** Liczba punktów na najwyższym poziomie jakości. Niższe poziomy biorą ułamek. */
  count: number;
  /** 2–4 formacje. `stage` = 0 to pierwsza, `stage` = n − 1 ostatnia. */
  formations: FormationFn[];
  /** Nazwy zmiennych CSS ról koloru, maks. 8 — np. `--color-accent`. */
  palette: string[];
  /** Odległość kamery i kąt widzenia (stopnie). */
  camera: { z: number; fov: number };
  /** Obrót wokół osi pionowej (rad/s) i stałe pochylenie (rad). */
  spin: number;
  tilt: number;
  /**
   * `loop` — obrót bez końca (orbita, pierścień). `swing` — wahadło ±0,45 rad:
   * dla formacji-wykresów, w których pełny obrót ustawiłby słupki jeden za
   * drugim i przez ćwierć okresu wykres byłby nieczytelny.
   */
  spinMode?: 'loop' | 'swing';
  /** Dodatkowy obrót na każdy etap (rad). Domyślnie 0,6 — zmiana formacji „skręca" scenę. */
  stageYaw?: number;
  /** Bazowy rozmiar punktu w pikselach CSS przy odległości 1. */
  pointSize: number;
  /** Amplituda spokojnego dryfu (jednostki sceny). 0 = nieruchome. */
  drift: number;
  /** Siła odpychania kursorem, 0 = brak reakcji. */
  pointer: number;
  /** `add` dla ciemnego tła (światło się sumuje), `normal` dla jasnego. */
  blend?: 'add' | 'normal';
  /** Ziarno generatora formacji. */
  seed?: number;
  /**
   * Przytrzymanie formacji na każdym etapie (0…0,45, domyślnie 0,22).
   *
   * Przewijanie mapuje się na etap liniowo, więc bez przytrzymania kształt
   * jest „gotowy" tylko w jednym punkcie toru, a przez resztę czasu coś się
   * przelewa — czytelnik czyta akapit, a scena obok nie stoi ani chwili.
   * Z przytrzymaniem pierwsze i ostatnie 22% każdego odcinka trzyma formację
   * nieruchomo, a przejście dzieje się w środku, smoothstepem: ruch zaczyna
   * się łagodnie i łagodnie kończy (zasada scrollytellingu: kształt stoi,
   * gdy tekst mówi; przelewa się w pauzie między zdaniami).
   */
  hold?: number;
}

export interface FieldHandle {
  /** Docelowy etap; silnik dojeżdża do niego płynnie (lerp zależny od czasu). */
  setStage: (stage: number) => void;
  /** Kursor w NDC (−1…1), `null` = brak kursora. */
  setPointer: (x: number | null, y?: number) => void;
  /** Przesunięcie sceny w kadrze (jednostki sceny) — np. w prawo od kolumny tekstu. */
  setShift: (x: number, y: number) => void;
  destroy: () => void;
}

interface Tier {
  share: number;
  dprMax: number;
  fps: number;
  pointer: boolean;
  lerp: number;
}

/**
 * Poziomy jakości — ta sama idea co `TIERS` w aim-motion, policzona prościej.
 * Telefon dostaje trzecią część punktów i 30 kl./s: na 390 px nikt nie
 * odróżni 2500 punktów od 7000, a bateria odróżni.
 */
const resolveTier = (width: number, software: boolean): Tier => {
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  if (software || width <= 640 || cores <= 4 || memory <= 4) {
    return { share: 0.35, dprMax: 1.25, fps: 30, pointer: false, lerp: 0.14 };
  }
  if (width <= 1100) return { share: 0.6, dprMax: 1.5, fps: 45, pointer: false, lerp: 0.1 };
  return { share: 1, dprMax: 2, fps: 60, pointer: true, lerp: 0.075 };
};

/** Nazwa sterownika z rozszerzenia debugowego, a bez niego ogólna nazwa z `RENDERER`. */
const isSoftwareRenderer = (gl: WebGLRenderingContext): boolean => {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const name = gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER);
  return /swiftshader|llvmpipe|softpipe|software/i.test(String(name ?? ''));
};

const VERT = `
precision highp float;
attribute vec3 aP0;
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute vec4 aRole;
attribute vec4 aSeed;
uniform float uStage;
uniform float uLast;
uniform float uTime;
uniform float uIntro;
uniform float uDrift;
uniform float uSize;
uniform float uPR;
uniform vec2 uPointer;
uniform float uPointerAmt;
uniform float uAspect;
uniform float uCamZ;
uniform vec2 uShift;
uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProj;
uniform vec3 uPalette[8];
varying vec3 vColor;
varying float vAlpha;

vec3 formation(float k) {
  if (k < 0.5) return aP0;
  if (k < 1.5) return aP1;
  if (k < 2.5) return aP2;
  return aP3;
}
float role(float k) {
  if (k < 0.5) return aRole.x;
  if (k < 1.5) return aRole.y;
  if (k < 2.5) return aRole.z;
  return aRole.w;
}

void main() {
  float s = clamp(uStage, 0.0, uLast);
  float k = floor(min(s, uLast - 0.0001));
  float t = s - k;

  // Każdy punkt przechodzi w swoim oknie czasu — formacja nie przeskakuje
  // naraz, tylko przelewa się z jednej w drugą.
  float delay = aSeed.x * 0.45;
  float tt = clamp((t - delay) / 0.55, 0.0, 1.0);
  tt = tt * tt * (3.0 - 2.0 * tt);

  vec3 dir = normalize(vec3(aSeed.y, aSeed.z, aSeed.x) - 0.5 + 0.0001);
  vec3 p = mix(formation(k), formation(k + 1.0), tt);
  // Łuk lotu: punkt nie jedzie po prostej, tylko lekko odbija w bok — dzięki
  // temu przejście ma objętość. 0,45 (v1) rozlewało chmurę w połowie drogi na
  // pół ekranu i przejście czytało się jak eksplozja, nie przesunięcie.
  p += dir * sin(tt * 3.14159) * 0.22;

  // Wejście: punkty zlatują się z rozproszenia, każdy z własnym opóźnieniem.
  float di = aSeed.y * 0.55;
  float ti = clamp((uIntro - di) / (1.0 - di), 0.0, 1.0);
  ti = 1.0 - pow(1.0 - ti, 3.0);
  p = mix(p + dir * 7.0, p, ti);

  p += uDrift * vec3(
    sin(uTime * 0.55 + aSeed.x * 40.0),
    cos(uTime * 0.45 + aSeed.y * 31.0),
    sin(uTime * 0.65 + aSeed.z * 23.0)
  );

  vec4 mv = uView * uModel * vec4(p, 1.0);
  mv.xy += uShift;
  vec4 clip = uProj * mv;

  vec2 ndc = clip.xy / clip.w;
  vec2 dm = ndc - uPointer;
  dm.x *= uAspect;
  float near = smoothstep(0.32, 0.0, length(dm)) * uPointerAmt;
  clip.xy += normalize(dm + 0.0001) * near * 0.09 * clip.w;

  gl_Position = clip;
  float depth = -mv.z;
  gl_PointSize = max(1.0, uSize * aSeed.w * uPR * (1.0 + near * 0.8) / depth);

  vColor = mix(uPalette[int(role(k))], uPalette[int(role(k + 1.0))], tt);
  // Dalsze punkty ciemnieją — głębia bez mgły i bez drugiego przebiegu.
  // Liczone względem płaszczyzny ogniskowej (uCamZ), nie od zera: pierwsza
  // wersja liczyła od kamery i przy z = 9,5 gasiła całą scenę do 46%.
  vAlpha = clamp(1.0 - (depth - uCamZ) * 0.16, 0.3, 1.0) * ti * (0.6 + 0.4 * aSeed.w);
}
`;

const FRAG = `
precision mediump float;
uniform float uAdd;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  // Ostry rdzeń i cienka aureola. Szerokie miękkie plamy nakładane addytywnie
  // czytają się jak mydliny — ta sama uwaga stoi w shaderze kuli AIM.
  float halo = smoothstep(0.5, 0.0, d);
  halo *= halo;
  float core = smoothstep(0.16, 0.0, d);
  float a = (halo * 0.75 + core * 0.6) * vAlpha;
  gl_FragColor = vec4(vColor * mix(1.0, a, uAdd), a);
}
`;

/** Kolor CSS → [r, g, b] 0…1. Canvas 2D normalizuje każdy format. */
const readPalette = (names: string[], host: Element): Float32Array => {
  const out = new Float32Array(8 * 3);
  const style = getComputedStyle(host);
  const probe = document.createElement('canvas');
  probe.width = probe.height = 1;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  names.slice(0, 8).forEach((name, i) => {
    const value = style.getPropertyValue(name).trim();
    if (!ctx || !value) return;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const px = ctx.getImageData(0, 0, 1, 1).data;
    out.set([(px[0] ?? 0) / 255, (px[1] ?? 0) / 255, (px[2] ?? 0) / 255], i * 3);
  });
  return out;
};

/* ── Macierze (kolumnowo, jak oczekuje WebGL) ─────────────────────────── */
const perspective = (fovDeg: number, aspect: number, near: number, far: number) => {
  const f = 1 / Math.tan((fovDeg * Math.PI) / 360);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect,
    0,
    0,
    0,
    0,
    f,
    0,
    0,
    0,
    0,
    (far + near) * nf,
    -1,
    0,
    0,
    2 * far * near * nf,
    0,
  ]);
};
const rotation = (yaw: number, pitch: number) => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cx = Math.cos(pitch);
  const sx = Math.sin(pitch);
  // Rx(pitch) · Ry(yaw)
  return new Float32Array([
    cy,
    sx * sy,
    -cx * sy,
    0,
    0,
    cx,
    sx,
    0,
    sy,
    -sx * cy,
    cx * cy,
    0,
    0,
    0,
    0,
    1,
  ]);
};
const translation = (z: number) =>
  new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -z, 1]);

const compile = (gl: WebGLRenderingContext, type: number, src: string) => {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn('[scena] shader:', gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
};

export interface MountOptions {
  /** Ruch zredukowany: brak wejścia, brak dryfu, klatka rysowana tylko po zmianie etapu. */
  reducedMotion: boolean;
  /** Wołane raz, gdy pierwsza klatka jest na ekranie — moment na odsłonięcie kanwy. */
  onReady?: () => void;
  /** Wołane, gdy kontekst zginie (np. reset GPU) — wywołujący wraca do stanu bez sceny. */
  onLost?: () => void;
}

export function mountField(
  canvas: HTMLCanvasElement,
  spec: SceneSpec,
  opts: MountOptions,
): FieldHandle | null {
  const glOrNull = canvas.getContext('webgl', {
    alpha: true,
    antialias: false,
    depth: false,
    premultipliedAlpha: true,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: true,
  });
  if (!glOrNull) return null;
  const gl: WebGLRenderingContext = glOrNull;

  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  if (!prog) return null;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  gl.useProgram(prog);

  const tier = resolveTier(window.innerWidth, isSoftwareRenderer(gl));
  const count = Math.max(200, Math.round(spec.count * tier.share));
  const forms = spec.formations.slice(0, 4);
  const last = forms.length - 1;

  /* Bufor przeplatany: 4 × vec3 pozycji + vec4 ról + vec4 losowych = 20 liczb. */
  const STRIDE = 20;
  const data = new Float32Array(count * STRIDE);
  const rand = mulberry(spec.seed ?? 7);
  for (let i = 0; i < count; i++) {
    const o = i * STRIDE;
    let prev: [number, number, number] = [0, 0, 0];
    for (let f = 0; f < 4; f++) {
      // Formacje powyżej ostatniej powtarzają ją — shader i tak do nich nie sięga.
      // `noUncheckedIndexedAccess` (Portal) widzi tu `undefined` — stąd jawne `?? `.
      const fn = forms[Math.min(f, last)];
      const [x, y, z, r] =
        f <= last && fn
          ? fn(i, count, rand, prev)
          : [prev[0], prev[1], prev[2], data[o + 12 + last] ?? 0];
      prev = [x, y, z];
      data[o + f * 3] = x;
      data[o + f * 3 + 1] = y;
      data[o + f * 3 + 2] = z;
      data[o + 12 + f] = r;
    }
    data[o + 16] = rand();
    data[o + 17] = rand();
    data[o + 18] = rand();
    // Rozmiar: większość drobna, co trzydziesty punkt wyraźnie większy.
    data[o + 19] = rand() < 0.035 ? 2.4 : 0.7 + rand() * 0.6;
  }

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  const attr = (name: string, size: number, offset: number) => {
    const loc = gl.getAttribLocation(prog, name);
    if (loc < 0) return;
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, STRIDE * 4, offset * 4);
  };
  attr('aP0', 3, 0);
  attr('aP1', 3, 3);
  attr('aP2', 3, 6);
  attr('aP3', 3, 9);
  attr('aRole', 4, 12);
  attr('aSeed', 4, 16);

  const u = (name: string) => gl.getUniformLocation(prog, name);
  const U = {
    stage: u('uStage'),
    last: u('uLast'),
    time: u('uTime'),
    intro: u('uIntro'),
    drift: u('uDrift'),
    size: u('uSize'),
    pr: u('uPR'),
    pointer: u('uPointer'),
    pointerAmt: u('uPointerAmt'),
    aspect: u('uAspect'),
    model: u('uModel'),
    view: u('uView'),
    proj: u('uProj'),
    palette: u('uPalette'),
    add: u('uAdd'),
    shift: u('uShift'),
    camZ: u('uCamZ'),
  };

  const additive = (spec.blend ?? 'add') === 'add';
  gl.enable(gl.BLEND);
  if (additive) gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
  else gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.uniform1f(U.add, additive ? 0 : 1);
  gl.uniform1f(U.last, Math.max(1, last));
  gl.uniform3fv(U.palette, readPalette(spec.palette, canvas));
  gl.uniformMatrix4fv(U.view, false, translation(spec.camera.z));
  gl.uniform1f(U.camZ, spec.camera.z);
  gl.clearColor(0, 0, 0, 0);

  /* ── Stan ──────────────────────────────────────────────────────────── */
  let stage = 0;
  let target = 0;
  let pointer: [number, number] = [9, 9];
  let pointerAmt = 0;
  let pointerTarget = 0;
  let width = 0;
  let height = 0;
  let dpr = 1;
  let visible = true;
  let raf = 0;
  let lastFrame = 0;
  let gate = 0;
  let started = -1;
  let dirty = true;
  let ready = false;
  let alive = true;
  const frameInterval = 1000 / tier.fps;
  const introMs = 1700;

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, tier.dprMax);
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniformMatrix4fv(
      U.proj,
      false,
      perspective(spec.camera.fov, width / Math.max(1, height), 0.1, 100),
    );
    gl.uniform1f(U.aspect, width / Math.max(1, height));
    // Rozmiar punktu skaluje się z wysokością kadru, nie z liczbą pikseli —
    // inaczej ta sama scena wyglądałaby inaczej w każdym oknie.
    gl.uniform1f(U.size, spec.pointSize * (height / 720));
    gl.uniform1f(U.pr, dpr);
    dirty = true;
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const io = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
    if (visible) schedule();
  });
  io.observe(canvas);

  const onVisibility = () => {
    if (!document.hidden) schedule();
  };
  document.addEventListener('visibilitychange', onVisibility);

  const onLost = (e: Event) => {
    e.preventDefault();
    alive = false;
    cancelAnimationFrame(raf);
    opts.onLost?.();
  };
  canvas.addEventListener('webglcontextlost', onLost);

  function draw(time: number) {
    const elapsed = started < 0 ? 0 : time - started;
    const intro = opts.reducedMotion ? 1 : Math.min(1, elapsed / introMs);
    const seconds = opts.reducedMotion ? 0 : time / 1000;
    gl.uniform1f(U.stage, stage);
    gl.uniform1f(U.time, seconds);
    gl.uniform1f(U.intro, intro);
    gl.uniform1f(U.drift, opts.reducedMotion ? 0 : spec.drift);
    gl.uniform2f(U.pointer, pointer[0], pointer[1]);
    gl.uniform1f(U.pointerAmt, pointerAmt);
    const yaw =
      spec.spinMode === 'swing' ? Math.sin(seconds * spec.spin) * 0.45 : seconds * spec.spin;
    gl.uniformMatrix4fv(U.model, false, rotation(yaw + stage * (spec.stageYaw ?? 0.6), spec.tilt));
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.POINTS, 0, count);
    if (!ready) {
      ready = true;
      opts.onReady?.();
    }
    return intro < 1;
  }

  function frame(time: number) {
    raf = 0;
    if (!alive || !visible || document.hidden) return;
    if (started < 0) started = time;
    // Bramka klatek: telefon dostaje 30 kl./s, nie tyle, ile da rAF.
    if (time - gate + 0.5 < frameInterval) {
      schedule();
      return;
    }
    gate = time;
    const dt = Math.min(lastFrame ? (time - lastFrame) / 1000 : 0, 0.05);
    lastFrame = time;

    const d = target - stage;
    const settling = Math.abs(d) > 0.0005;
    if (opts.reducedMotion) stage = target;
    else stage = settling ? stage + d * (1 - Math.pow(1 - tier.lerp, dt * 60)) : target;
    pointerAmt += (pointerTarget - pointerAmt) * Math.min(1, dt * 6);

    const animating = draw(time);
    dirty = false;
    // Przy redukcji ruchu pętla staje po narysowaniu stanu — kolejna klatka
    // powstaje dopiero, gdy zmieni się etap albo rozmiar.
    if (!opts.reducedMotion || animating || settling || dirty) schedule();
  }

  function schedule() {
    if (!raf && alive) raf = requestAnimationFrame(frame);
  }

  schedule();

  return {
    setStage(next) {
      const raw = Math.min(Math.max(next, 0), Math.max(1, last));
      const k = Math.min(Math.floor(raw), Math.max(0, last - 1));
      const h = Math.min(Math.max(spec.hold ?? 0.22, 0), 0.45);
      const u = Math.min(Math.max((raw - k - h) / Math.max(0.0001, 1 - 2 * h), 0), 1);
      const clamped = k + u * u * (3 - 2 * u);
      if (clamped !== target) {
        target = clamped;
        schedule();
      }
    },
    setShift(x, y) {
      gl.uniform2f(U.shift, x, y);
      dirty = true;
      schedule();
    },
    setPointer(x, y = 0) {
      if (!tier.pointer || opts.reducedMotion || spec.pointer === 0) return;
      if (x === null) {
        pointerTarget = 0;
      } else {
        pointer = [x, y];
        pointerTarget = spec.pointer;
      }
      schedule();
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.removeEventListener('webglcontextlost', onLost);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    },
  };
}
