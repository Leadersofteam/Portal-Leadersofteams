// Tło „sieć Liderów” (Maciej 26.11: „jaśniejsze z lekką siecią liderów przezroczystą”). Własny SVG, bez sieci i bez animacji.
// Stałe ziarno → zrzuty powtarzalne. Węzły w kolorach szczebli; co ósmy ma pierścień jak awatar Lidera. L7 (ciepły) nie występuje:
// „ciepły = zapracowane” nie może być dekoracją.
(() => {
  const W = 1600, H = 1000, ILE = 64;
  let s = 29;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const kol = 8, rz = ILE / kol;
  const p = Array.from({ length: ILE }, (_, i) => ({
    x: ((i % kol) + 0.15 + r() * 0.7) * (W / kol),
    y: (Math.floor(i / kol) + 0.15 + r() * 0.7) * (H / rz),
    l: 2 + Math.floor(r() * 5),
    r: 2.5 + r() * 3,
  }));
  const linie = new Set();
  p.forEach((a, i) =>
    p.map((b, j) => [Math.hypot(a.x - b.x, a.y - b.y), j]).sort((x, y) => x[0] - y[0]).slice(1, 4)
      .forEach(([, j]) => linie.add(i < j ? `${i}-${j}` : `${j}-${i}`)));
  const l = [...linie].map((k) => { const [a, b] = k.split('-').map((i) => p[i]); return `<line x1="${a.x.toFixed(0)}" y1="${a.y.toFixed(0)}" x2="${b.x.toFixed(0)}" y2="${b.y.toFixed(0)}"/>`; }).join('');
  const w = p.map((a, i) => {
    const c = `var(--level-${a.l})`, x = a.x.toFixed(0), y = a.y.toFixed(0);
    return i % 8 === 3
      ? `<circle cx="${x}" cy="${y}" r="15" style="fill:var(--bg);stroke:${c}" stroke-width="2" stroke-dasharray="10 4"/><circle cx="${x}" cy="${y - 3}" r="4" style="fill:${c}"/><path d="M${+x - 7} ${+y + 9}a7 6 0 0 1 14 0" style="fill:${c}"/>`
      : `<circle cx="${x}" cy="${y}" r="${a.r.toFixed(1)}" style="fill:${c}"/>`;
  }).join('');
  const svg = `<svg class="tlo-siec" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g class="linie">${l}</g><g class="wezly">${w}</g></svg>`;
  window.TloSiec = () => document.body.insertAdjacentHTML('afterbegin', svg);
})();
