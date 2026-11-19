'use client';

import { useEffect, useRef } from 'react';

// „Siatka liderów": kratka robi CSS (v17.css), tu tylko liderzy na węzłach i
// impuls po liniach. Reduced-motion = jedna statyczna klatka; pauza w tle
// (visibilitychange) i poza ekranem — canvas nie mieli CPU niewidoczny.
const STEP = 48;

export function GridBg() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0;
    let h = 0;
    let raf = 0;
    let t0 = 0;
    let visible = true;
    // Kolory z tokenów (zapadka lint-tokens zabrania literałów).
    const css = getComputedStyle(document.documentElement);
    const col = () => css.getPropertyValue('--violet-500').trim() || 'currentColor';

    const nodes: Array<{ x: number; y: number; ph: number }> = [];
    const size = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = w * dpr;
      cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      nodes.length = 0;
      // deterministyczne rozmieszczenie (bez Math.random → stabilny zrzut)
      for (let i = 0; i < Math.min(28, Math.floor((w * h) / 45000)); i++) {
        const gx = Math.floor((((i * 7919) % 997) / 997) * (w / STEP));
        const gy = Math.floor((((i * 104729) % 991) / 991) * (h / STEP));
        nodes.push({ x: gx * STEP, y: gy * STEP, ph: (i % 9) / 9 });
      }
    };
    const draw = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = col();
      for (const n of nodes) {
        const a = still ? 0.5 : 0.35 + 0.35 * Math.sin(t / 1800 + n.ph * 6.28);
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(n.x, n.y, 2.2, 0, 6.283);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };
    const loop = (t: number) => {
      if (!t0) t0 = t;
      draw(t - t0);
      if (visible && !document.hidden) raf = requestAnimationFrame(loop);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (still) {
        draw(0);
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    size();
    start();
    const ro = new ResizeObserver(() => {
      size();
      start();
    });
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) start();
    });
    io.observe(cv);
    const vis = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    document.addEventListener('visibilitychange', vis);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', vis);
    };
  }, []);

  return <canvas ref={ref} className="v17-grid" aria-hidden="true" />;
}
