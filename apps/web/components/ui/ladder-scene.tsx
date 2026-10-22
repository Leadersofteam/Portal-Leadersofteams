'use client';

import { useEffect, useRef, useState } from 'react';

import type { FieldHandle, FormationFn, SceneSpec } from '@/components/scene/particleField';

import { LadderArt } from './ladder-art';

/**
 * Drabinka w przestrzeni — wersja 3D sygnatury hero (kierunek „Instrument
 * w przestrzeni", docs/KIERUNEK-3D.md).
 *
 * **Co niesie.** Siedem szczebli w kolorach poziomów (`--level-1…7`, te same
 * tokeny co LevelBadge). Przy przewijaniu punkty z niższych szczebli przenoszą
 * się wyżej — światło się wspina i ociepla. To jest zdanie z hero („status
 * trzeba zapracować") powiedziane ruchem: nikt nie zaczyna od bursztynu.
 *
 * **Kontrakt ADR-009.** Zero zewnętrznych zasobów: silnik to ~6 kB własnego
 * WebGL (`components/scene/particleField.ts`, kopia z leadersofteams.com),
 * bez three.js, bez CDN, bez żadnego wywołania sieciowego.
 *
 * **Bez WebGL zostaje SVG.** `LadderArt` jest renderowany zawsze i trzyma
 * miejsce w układzie; scena kładzie się na nim i dopiero po pierwszej
 * narysowanej klatce SVG gaśnie (klasa na wrapperze, CSS w globals.css).
 * Brak GPU, renderowanie programowe albo utrata kontekstu = hero sprzed
 * zmiany, bez skoku układu.
 */

const RUNGS = 7;
const rungY = (k: number) => -2.55 + k * 0.85;
/** Belki pochylone jak drabina oparta o ścianę — ta sama perspektywa co SVG. */
const railX = (side: -1 | 1, y: number) => {
  const t = (y + 3) / 6;
  return side < 0 ? -1.15 + t * 0.55 : 1.35 - t * 0.3;
};
const lean = (y: number) => -y * 0.32;

const ladderPoint = (rung: number, rand: () => number): [number, number, number, number] => {
  // 38% punktów to belki, reszta szczeble. Belka bierze kolor szczebla,
  // na którego wysokości leży — gradient od stali po bursztyn.
  if (rand() < 0.38) {
    const side = rand() < 0.5 ? -1 : 1;
    const y = -3 + rand() * 6;
    const level = Math.min(RUNGS - 1, Math.max(0, Math.round((y + 2.55) / 0.85)));
    return [railX(side, y) + (rand() - 0.5) * 0.08, y, lean(y) + (rand() - 0.5) * 0.08, level];
  }
  const y = rungY(rung);
  const x0 = railX(-1, y);
  const x1 = railX(1, y);
  const t = rand();
  return [
    x0 + (x1 - x0) * t,
    y + (rand() - 0.5) * 0.1 - t * 0.06,
    lean(y) + (rand() - 0.5) * 0.1,
    rung,
  ];
};

/** Formacja 0: punkty rozłożone równo po wszystkich szczeblach. */
const ladder: FormationFn = (i, count, rand) => ladderPoint(i % RUNGS, rand);

/**
 * Formacja 1: ten sam punkt, ale od jednego do trzech szczebli wyżej
 * (sufit: poziom 7). Dolne szczeble pustoszeją, górne gęstnieją.
 */
const climbed: FormationFn = (i, count, rand) =>
  ladderPoint(Math.min(RUNGS - 1, (i % RUNGS) + 1 + Math.floor(rand() * 3)), rand);

const LADDER_SCENE: SceneSpec = {
  count: 8000,
  formations: [ladder, climbed],
  palette: [
    '--level-1',
    '--level-2',
    '--level-3',
    '--level-4',
    '--level-5',
    '--level-6',
    '--level-7',
  ],
  camera: { z: 9, fov: 40 },
  spin: 0.35,
  spinMode: 'swing',
  stageYaw: 0,
  tilt: 0.12,
  pointSize: 42,
  drift: 0.02,
  pointer: 1,
  blend: 'add',
  seed: 7,
};

export function LadderScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let handle: FieldHandle | null = null;
    let cancelled = false;
    let frame = 0;
    const box = { top: 0, left: 0, width: 1, height: 1 };
    const measure = () => {
      const r = canvas.getBoundingClientRect();
      box.top = r.top + window.scrollY;
      box.left = r.left + window.scrollX;
      box.width = r.width || 1;
      box.height = r.height || 1;
    };
    const ro = new ResizeObserver(measure);
    ro.observe(document.body);

    // Wspinaczka trwa przez pierwsze ~0,8 ekranu przewinięcia — hero jest
    // wtedy jeszcze w kadrze, więc ruch widać, zanim drabina wyjedzie.
    const apply = () => {
      frame = 0;
      handle?.setStage(window.scrollY / (window.innerHeight * 0.8));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };
    const onPointer = (e: PointerEvent) => {
      const x = e.clientX + window.scrollX - box.left;
      const y = e.clientY + window.scrollY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) handle?.setPointer(null);
      else handle?.setPointer((x / box.width) * 2 - 1, -((y / box.height) * 2 - 1));
    };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('@/components/scene/particleField').then(({ mountField }) => {
      if (cancelled) return;
      measure();
      handle = mountField(canvas, LADDER_SCENE, {
        reducedMotion,
        onReady: () => setReady(true),
        onLost: () => setReady(false),
      });
      if (!handle) return;
      apply();
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('pointermove', onPointer, { passive: true });
    });

    return () => {
      cancelled = true;
      if (frame) cancelAnimationFrame(frame);
      ro.disconnect();
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      handle?.destroy();
    };
  }, []);

  return (
    <div ref={wrapRef} className="ladder-scene" data-scene={ready ? 'on' : 'off'}>
      <LadderArt />
      <canvas ref={canvasRef} aria-hidden="true" className="ladder-scene-canvas" />
    </div>
  );
}
