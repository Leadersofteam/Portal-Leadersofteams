// Portal Liderów — „Światło” (V17 PRO, makieta 20.11.2026). Komponenty wspólne + trzy ekrany: Pro.feed(), Pro.profil(), Pro.drabinka().
// Parametry: ?motyw=dark|light, ?stan=pusty|ladowanie|blad. Dane fikcyjne; szczeble i punkty z apps/api/src/modules/ladder/rules.ts
// (progi 100/300/700/1500/3000/6000/12000; ocena 5→100, 4→80, 3→40; kolejna od tej samej firmy w 365 dni ×0,5^n, min ×0,1;
//  uznana odpowiedź 50, głos 10, limit społeczności 300/7 dni; od L4 min. 20% progu z każdej ścieżki; karencja 7 dni).
(() => {
  const q = new URLSearchParams(location.search);
  const H = document.documentElement;
  H.dataset.theme = q.get('motyw') === 'light' ? 'light' : 'dark';
  const STAN = q.get('stan') || '';

  const L = [
    ['Adept', 100], ['Praktyk', 300], ['Specjalista', 700], ['Ekspert', 1500],
    ['Mentor', 3000], ['Autorytet', 6000], ['Architekt Zespołów', 12000],
  ].map(([nazwa, prog], i) => ({ n: i + 1, nazwa, prog }));
  const fmt = (x) => x.toLocaleString('pl-PL').replace(/ /g, ' ');
  const I = (n, kl = '') => `<i class="ph-duotone ph-${n} ${kl}" aria-hidden="true"></i>`;
  const ini = (n) => n.split(/\s+/).filter((w) => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
  const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

  // ── Ludzie i firmy ──
  const P = {
    ola: { n: 'Ola Wrzos', lv: 3, pkt: 770, branza: 'Instalacje sanitarne', miasto: 'Gdynia' },
    marta: { n: 'Marta Jodła', lv: 6, pkt: 6420, branza: 'Fotowoltaika', miasto: 'Gdańsk' },
    tomek: { n: 'Tomek Brzoza', lv: 2, pkt: 390, branza: 'Elektryka', miasto: 'Łódź' },
    iga: { n: 'Iga Sosna', lv: 4, pkt: 1720, branza: 'Wykończenia', miasto: 'Wrocław' },
    bartek: { n: 'Bartek Lis', lv: 5, pkt: 3300, branza: 'Instalacje HVAC', miasto: 'Poznań' },
    kuba: { n: 'Kuba Grab', lv: 3, pkt: 980, branza: 'Instalacje HVAC', miasto: 'Gdańsk' },
    ewa: { n: 'Ewa Cis', lv: 4, pkt: 2050, branza: 'Instalacje HVAC', miasto: 'Sopot' },
    hotel: { n: 'Hotel Nad Zatoką', firma: true, branza: 'Hotelarstwo', miasto: 'Sopot', skrot: 'HZ' },
    kamienica: { n: 'Kamienica Pod Lipą sp. z o.o.', firma: true, branza: 'Zarządzanie nieruchomościami', miasto: 'Kraków', skrot: 'KL' },
    piekarnia: { n: 'Piekarnia Złoty Kłos', firma: true, branza: 'Gastronomia', miasto: 'Toruń', skrot: 'ZK' },
    biuro: { n: 'Biuro Rachunkowe Kalkulus', firma: true, branza: 'Usługi biurowe', miasto: 'Poznań', skrot: 'BK' },
  };
  const postep = (o) => {
    if (!o.lv || o.lv >= 7) return 0;
    const od = L[o.lv - 1].prog, ku = L[o.lv].prog;
    return Math.min(1, (o.pkt - od) / (ku - od));
  };

  // ── Awatar z pierścieniem Drabinki: 7 łuków; pełne = zdobyte szczeble, częściowy = droga do następnego ──
  function pierscien(S, lv, p) {
    const r = S / 2 - 1.5, c = S / 2, seg = 360 / 7, gap = 7;
    const pt = (a) => [c + r * Math.cos(((a - 90) * Math.PI) / 180), c + r * Math.sin(((a - 90) * Math.PI) / 180)];
    const luk = (a0, a1, st) => {
      const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
      return `<path d="M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" style="${st}"/>`;
    };
    let s = '';
    for (let k = 1; k <= 7; k++) {
      const a0 = (k - 1) * seg + gap / 2, a1 = k * seg - gap / 2;
      const kol = k <= lv ? `var(--level-${lv})` : 'var(--line-2)';
      s += luk(a0, a1, `stroke:${kol};`);
      if (k === lv + 1 && p > 0.02) s += luk(a0, a0 + (a1 - a0) * p, `stroke:var(--level-${lv});opacity:.6;`);
    }
    return `<svg class="pier" viewBox="0 0 ${S} ${S}" width="${S}" height="${S}" fill="none" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">${s}</svg>`;
  }
  // Portret rysowany z nazwy: geometryczny, każdy człowiek inny (tło, skóra, włosy, ubiór). Zdjęcia dopiero z uploadu w kodzie.
  function portretNieuzywany(o, w) {
    const h = hue(o.n), h2 = (h * 7 + 140) % 360;
    const skora = ['#f1c9a5', '#e0a982', '#c68863', '#9a6240', '#6f4529'][h % 5];
    const wlos = ['#2a1d14', '#5a3a22', '#8a5a2b', '#c9a35a', '#1b1b1f', '#7d4a3a'][(h >> 1) % 6];
    const styl = (h >> 2) % 4;
    let wl = '';
    if (styl === 0) wl = `<path d="M14.5 21c0-7 4-10.5 9.5-10.5S33.5 14 33.5 21c-2-3-5-4.6-9.5-4.6S16.5 18 14.5 21z" fill="${wlos}"/>`;
    else if (styl === 1) wl = `<path d="M13.5 30c-1.2-11 2-19.5 10.5-19.5S35.2 19 34.5 30c-1.2-2.4-1.6-6-1.6-9-2.2-2.6-5-3.8-8.9-3.8s-6.7 1.2-8.9 3.8c0 3-.4 6.6-1.6 9z" fill="${wlos}"/>`;
    else if (styl === 2) wl = `<circle cx="24" cy="9.5" r="4.2" fill="${wlos}"/><path d="M14.8 21.5c0-6.6 3.6-9.6 9.2-9.6s9.2 3 9.2 9.6c-2-3.2-5-4.8-9.2-4.8s-7.2 1.6-9.2 4.8z" fill="${wlos}"/>`;
    else wl = `<path d="M14 22c-1-8 3-12.5 10-12.5S35 14 34 22c-1.5-2.5-3-4.8-5-5.6-1.2 1.4-3.2 2-5 2s-3.8-.6-5-2c-2 .8-3.5 3.1-5 5.6z" fill="${wlos}"/>`;
    return `<svg viewBox="0 0 48 48" width="${w}" height="${w}" aria-hidden="true"><rect width="48" height="48" fill="hsl(${h} 38% 78%)"/><circle cx="38" cy="8" r="14" fill="hsl(${(h + 30) % 360} 45% 70%)" opacity=".55"/><path d="M5 49c0-9 8-14.5 19-14.5S43 40 43 49z" fill="hsl(${h2} 38% 36%)"/><rect x="20.5" y="27" width="7" height="9" rx="3" fill="${skora}"/><ellipse cx="24" cy="21.5" rx="8.6" ry="9.6" fill="${skora}"/>${wl}</svg>`;
  }
  function aw(o, S = 44, ring = false) {
    if (o.firma) {
      const f = Math.round(S * 0.34);
      return `<span class="aw firma" style="width:${S}px;height:${S}px;--fs:${f}px;--fh:${hue(o.branza)}" aria-hidden="true"><span class="twarz" style="width:${S}px;height:${S}px">${o.skrot}</span></span>`;
    }
    const w = ring && o.lv ? S - 9 : S;
    return `<span class="aw osoba" style="width:${S}px;height:${S}px;--fs:${Math.round(w * 0.36)}px;--fh:${hue(o.n)}" aria-hidden="true">${ring && o.lv ? pierscien(S, o.lv, postep(o)) : ''}<span class="twarz" style="width:${w}px;height:${w}px">${ini(o.n)}</span></span>`;
  }
  // Odznaka: szczebelki — 7 słupków rosnących, wypełnione do poziomu
  function szczebelki(lv, h = 12) {
    let s = '';
    for (let k = 0; k < 7; k++) {
      const hh = 3 + ((h - 3) * k) / 6, x = k * 3.2;
      s += `<rect x="${x}" y="${h - hh}" width="2.2" height="${hh}" rx="1" style="fill:${k < lv ? 'currentColor' : 'var(--line-2)'}"/>`;
    }
    return `<svg width="${7 * 3.2}" height="${h}" viewBox="0 0 ${7 * 3.2} ${h}" aria-hidden="true">${s}</svg>`;
  }
  const odz = (lv, duza) =>
    lv
      ? `<span class="odz${duza ? ' duza' : ''}" style="--lv:var(--level-${lv})" title="Szczebel ${lv} z 7">${szczebelki(lv, duza ? 14 : 12)}${L[lv - 1].nazwa}</span>`
      : `<span class="odz nowy">Nowy w Portalu</span>`;
  const znakOsoby = (o) => (o.firma ? '' : odz(o.lv));

  // ── Okładki rysowane w SVG (zero zdjęć z sieci); wzór zależy od branży ──
  const BR = {
    hvac: { c: 'var(--level-2)', ik: 'wind' },
    pv: { c: 'var(--br-pv)', ik: 'solar-panel' },
    el: { c: 'var(--primary-400)', ik: 'lightning' },
    wyk: { c: 'var(--violet-500)', ik: 'paint-roller' },
    san: { c: 'var(--br-san)', ik: 'drop' },
    chlod: { c: 'var(--br-chlod)', ik: 'snowflake' },
  };
  let uid = 0;
  function okl(rodz, seed = 1, ikona = true) {
    const b = BR[rodz], id = 'g' + uid++;
    const W = 320, Hh = 160;
    let wz = '';
    if (rodz === 'hvac' || rodz === 'chlod') {
      for (let i = 0; i < 7; i++) {
        const y = 20 + i * 20 + (seed % 3) * 4;
        wz += `<path d="M-10 ${y} C 60 ${y - 18 - i * 2}, 120 ${y + 22}, 190 ${y} S 300 ${y - 16}, 340 ${y + 4}" style="stroke:${b.c};opacity:${0.18 + i * 0.07}" fill="none" stroke-width="1.6"/>`;
      }
    } else if (rodz === 'pv') {
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 7; c++) {
          const x = 30 + c * 44 + r * 14 - (seed % 2) * 10, y = 26 + r * 30;
          wz += `<path d="M${x} ${y} l36 0 l-10 24 l-36 0z" style="fill:${b.c};opacity:${0.08 + ((r + c + seed) % 4) * 0.07}"/>`;
        }
    } else if (rodz === 'el') {
      const pts = [[0, 120], [60, 120], [90, 70], [150, 70], [170, 110], [240, 110], [270, 40], [330, 40]];
      wz = `<polyline points="${pts.map((p) => p.join(',')).join(' ')}" fill="none" style="stroke:${b.c}" stroke-width="2" opacity=".7"/>`;
      wz += pts.slice(1, -1).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" style="fill:${b.c}"/>`).join('');
      wz += `<polyline points="0,80 40,80 70,140 330,140" fill="none" style="stroke:${b.c}" stroke-width="1.2" opacity=".3"/>`;
    } else if (rodz === 'wyk') {
      for (let i = 0; i < 5; i++)
        wz += `<rect x="${40 + i * 52}" y="${20 + (i % 2) * 26}" width="120" height="90" rx="6" transform="rotate(${-12 + i * 6} ${100 + i * 52} 80)" style="fill:${b.c};opacity:${0.07 + i * 0.05}"/>`;
    } else {
      for (let i = 0; i < 6; i++) wz += `<circle cx="${240 - seed * 10}" cy="80" r="${18 + i * 22}" fill="none" style="stroke:${b.c};opacity:${0.5 - i * 0.07}" stroke-width="${6 - i * 0.7}"/>`;
    }
    return `<div class="okl" aria-hidden="true"><svg viewBox="0 0 ${W} ${Hh}" preserveAspectRatio="xMidYMid slice"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:${b.c};stop-opacity:.22"/><stop offset="1" style="stop-color:${b.c};stop-opacity:.03"/></linearGradient></defs><rect width="${W}" height="${Hh}" fill="url(#${id})"/>${wz}</svg>${ikona ? `<span class="ikon">${I(b.ik)}</span>` : ''}</div>`;
  }

  // ── Rama ──
  const MENU = [
    ['feed', 'Strumień', 'house-simple'], ['zlecenia', 'Zlecenia', 'clipboard-text'], ['uslugi', 'Usługi', 'storefront'],
    ['pytania', 'Pytania', 'chats-circle'], ['liderzy', 'Liderzy', 'users-three'], ['drabinka', 'Drabinka', 'ladder'],
    ['powiadomienia', 'Powiadomienia', 'bell', 3], ['profil', 'Profil', 'user-circle'],
  ];
  const ZNAK = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="5" cy="20" r="3.4" style="fill:var(--level-2)"/><circle cx="12.5" cy="12.5" r="4.2" style="fill:var(--primary-400)"/><circle cx="20.5" cy="5.5" r="4.6" style="fill:var(--level-6)"/></svg>`;
  function nav(akt) {
    const ja = P.ola;
    return `<nav class="nav" aria-label="Nawigacja główna">
      <a class="znak" href="feed.html">${ZNAK}<span>Portal Liderów</span></a>
      <ul>${MENU.map(([k, t, ik, kr]) => `<li><a class="poz" href="${k}.html"${k === akt ? ' aria-current="page"' : ''} title="${t}">${I(ik)}<span class="etk">${t}</span>${kr ? `<span class="kropka etk">${kr}</span>` : ''}</a></li>`).join('')}</ul>
      <button class="btn obrys duzy utworz" type="button" aria-label="Utwórz">${I('plus')}<span>Utwórz</span></button>
      <a class="ja" href="drabinka.html">${aw(ja, 44)}<span class="kto"><b>${ja.n}</b><small>${odz(ja.lv)}</small></span><span class="ikonka" aria-hidden="true">${I('dots-three')}</span></a>
    </nav>`;
  }
  function gora() {
    return `<header class="gora"><a class="znak" href="feed.html">${ZNAK}<span>Portal Liderów</span></a>
      <a class="ikonka" href="#" aria-label="Szukaj">${I('magnifying-glass')}</a>
      <a class="ikonka" href="#" aria-label="Powiadomienia: 3 nowe">${I('bell')}</a>
      <a href="profil.html" aria-label="Twój profil">${aw(P.ola, 36)}</a></header>`;
  }
  function dolny(akt) {
    const D = [['feed', 'Strumień', 'house-simple'], ['zlecenia', 'Zlecenia', 'clipboard-text'], ['uslugi', 'Usługi', 'storefront'], ['pytania', 'Pytania', 'chats-circle'], ['drabinka', 'Drabinka', 'ladder']];
    return `<nav class="dolny" aria-label="Nawigacja dolna">${D.map(([k, t, ik]) => `<a href="${k}.html"${k === akt ? ' aria-current="page"' : ''}>${I(ik)}<span>${t}</span></a>`).join('')}</nav>`;
  }
  const stopka = () => `<footer class="stopka"><span class="eko">Ekosystem</span><a href="https://app.leadersofteams.com">LOT App</a><a href="https://leadersofteam.pl">O firmie</a><a href="https://leadersofteams.com">International / EN</a><span>Regulamin</span><span>Prywatność</span></footer>`;
  const stany = (lista) => `<nav class="stany" aria-label="Stany makiety">${['', ...lista].map((s) => `<a href="?stan=${s}&motyw=${q.get('motyw') || ''}"${s === STAN ? ' aria-current="true"' : ''}>${s || 'dane'}</a>`).join('')}</nav>`;

  // ── Karta „Twoja Drabinka” (prawa kolumna strumienia) ──
  const JA = { rynek: 640, spol: 130, czekaRynek: 100, czekaSpol: 50 };
  function schodki(lv, p) {
    return `<div class="schodki" aria-hidden="true">${L.map((s, i) => {
      const h = 22 + i * 13;
      const k = `--c:var(--level-${Math.max(lv, 1)})`;
      if (i + 1 <= lv) return `<span class="ma" style="height:${h}%;${k}"></span>`;
      if (i === lv) return `<span class="teraz" style="height:${h}%;${k}"><i style="height:${Math.round(p * 100)}%"></i></span>`;
      return `<span style="height:${h}%"></span>`;
    }).join('')}</div>
    <div class="schodki-etykiety num">${L.map((s) => `<span class="${s.n === lv ? 'teraz' : ''}">${s.n}</span>`).join('')}</div>`;
  }
  function miernik(war, max, c, czeka = 0, prog = null) {
    const p = Math.min(100, (war / max) * 100), pc = Math.min(100 - p, (czeka / max) * 100);
    return `<div class="miernik" style="--c:${c}" role="img" aria-label="${fmt(war)} z ${fmt(max)}"><span style="width:${p}%"></span>${czeka ? `<em style="left:${p}%;width:${pc}%"></em>` : ''}${prog !== null ? `<i class="prog" style="left:${(prog / max) * 100}%"></i>` : ''}</div>`;
  }
  function kartaDrabinki() {
    const o = P.ola, c = `var(--level-${o.lv})`;
    return `<section class="karta hero-dr" aria-labelledby="kd">
      <header><h2 id="kd">Twoja Drabinka</h2><a href="drabinka.html">Pełna Drabinka ${I('arrow-right')}</a></header>
      <div class="hd">${aw(o, 88, true)}<div class="liczby"><div class="duza-liczba"><b>${o.pkt}</b><span>pkt</span></div>${odz(o.lv, true)}<small>730 do „Ekspert”</small></div></div>
      <div class="dwie-sc">
        <div class="sc"><div class="wiersz"><span>${I('clipboard-text')}Rynek</span><b>${JA.rynek} <span class="dojrzewa">+${JA.czekaRynek}</span></b></div>${miernik(JA.rynek, 1500, c, JA.czekaRynek, 300)}</div>
        <div class="sc"><div class="wiersz"><span>${I('chats-circle')}Społeczność</span><b>${JA.spol} <span class="dojrzewa">+${JA.czekaSpol}</span></b></div>${miernik(JA.spol, 1500, c, JA.czekaSpol, 300)}</div>
        <div class="pod">Kreska: 300 pkt, czyli 20% progu „Ekspert” — wymóg dla każdej ścieżki</div>
      </div>
      <div class="krok">${I('footprints')}<span><b>Najkrótsza droga:</b> 4 uznane odpowiedzi domkną próg społeczności (brakuje 170 pkt).</span></div>
    </section>`;
  }
  function kartaZlecen() {
    const Z = [
      [P.hotel, 'Serwis klimatyzacji — 12 pokoi', '8–12 tys. zł · Sopot', 4],
      [P.biuro, 'Wymiana pionów w biurowcu', '40–60 tys. zł · Poznań', 1],
      [P.kamienica, 'Kotłownia gazowa — przegląd', '3–5 tys. zł · Kraków', 0],
    ];
    return `<section class="karta" aria-labelledby="kz"><header><h2 id="kz">Zlecenia w twojej branży</h2><a href="zlecenia.html">Wszystkie</a></header>
      <ul class="lista">${Z.map(([f, t, m, o]) => `<li><a href="#" class="mz">${aw(f, 40)}<span class="t"><b>${t}</b><small>${m} · ${o ? `${o} ${o === 1 ? 'oferta' : 'oferty'}` : 'bez ofert'}</small></span></a></li>`).join('')}</ul></section>`;
  }
  const kartaTematow = () =>
    `<section class="tematy" aria-labelledby="kt"><h2 id="kt">Tematy</h2><div class="chipy">${['HVAC', 'Pompy ciepła', 'Fotowoltaika', 'Formalności', 'Rozliczenia', 'Elektryka', 'Wykończenia'].map((t) => `<a class="chip" href="#"># ${t}</a>`).join('')}</div></section>`;

  // ── Wpisy strumienia ──
  const typ = (t) => ({
    zlecenie: `<span class="typ" style="--c:var(--t-zlecenie)">${I('clipboard-text')}<span>Zlecenie</span></span>`,
    pytanie: `<span class="typ" style="--c:var(--t-pytanie)">${I('chats-circle')}<span>Pytanie</span></span>`,
    realizacja: `<span class="typ" style="--c:var(--t-realizacja)">${I('seal-check')}<span>Realizacja</span></span>`,
    usluga: `<span class="typ" style="--c:var(--t-usluga)">${I('storefront')}<span>Nowa usługa</span></span>`,
  })[t];
  const glowa = (o, czas, t) =>
    `<div class="glowa"><a href="profil.html" class="imie">${o.n}</a>${znakOsoby(o)}<span class="czas">· ${czas}</span></div><div class="meta">${typ(t)}<span class="sep" aria-hidden="true">·</span>${o.branza} · ${o.miasto}</div>`;
  const akcje = (glowny) =>
    `<div class="akcje"><button class="akcja" type="button" aria-label="Odpowiedz" title="Odpowiedz">${I('arrow-bend-up-left')}</button><button class="akcja" type="button" aria-label="Zapisz" title="Zapisz">${I('bookmark-simple')}</button><button class="akcja" type="button" aria-label="Udostępnij" title="Udostępnij">${I('share-network')}</button>${glowny || ''}</div>`;
  const nic = (t, od) => `<div class="nic">${I('seal-check')}<span>${t}</span><b>${od}</b></div>`;
  const gw = (n) => `<span class="gwiazdy" aria-label="${n} na 5">${I('star-fill').repeat(n)}</span>`.replaceAll('ph-star-fill', 'ph-star');

  function wZlecenie(f, czas, tresc, tyt, budzet, termin, miasto, oferty, oferenci, zbiera, minLv = 0) {
    return `<article class="wpis">${aw(f, 40)}<div>${glowa(f, czas, 'zlecenie')}<p class="tresc">${tresc}</p>
      <div class="zlec"><div class="tyt">${tyt}</div>
        <dl class="fakty"><div><dt>Budżet</dt><dd>${budzet}</dd></div><div><dt>Termin</dt><dd>${termin}</dd></div><div><dt>Miasto</dt><dd>${miasto}</dd></div><div><dt>Branża</dt><dd>${f.branza.split(' ')[0]}</dd></div></dl>
        <div class="zaufanie">${I('seal-check')}<span>Firma zweryfikowana · 14 zleceń · średnia wystawianych ocen 4,8</span>${minLv ? `<span class="wymaga">${I('lock-simple')}Oferty od L${minLv} · ${L[minLv - 1].nazwa}</span>` : ''}</div>
        <div class="oferty">${oferenci.length ? `<span class="stos">${oferenci.map((o) => aw(o, 26)).join('')}</span>` : ''}<span><b>${oferty} ${oferty === 1 ? 'oferta' : oferty < 5 ? 'oferty' : 'ofert'}</b> · zbiera do ${zbiera}</span><span class="pasek" aria-hidden="true"><span style="width:${Math.min(100, oferty * 12.5)}%"></span></span><a class="btn obrys maly" href="#">Złóż ofertę</a></div>
        ${nic('Po ocenie 5/5 po realizacji zlecenia', 'do +100 pkt dla Lidera')}
      </div>${akcje()}</div></article>`;
  }
  function wRealizacja(lider, firma, czas, tresc, tyt, ocena, pkt, opis, rodz) {
    return `<article class="wpis">${aw(lider, 40, true)}<div>${glowa(lider, czas, 'realizacja')}<p class="tresc">${tresc}</p>
      <div class="swiatlo"><div class="scena">${aw(firma, 48)}<div class="promien"><b>+${pkt}<span> pkt</span></b><small>${opis}</small></div>${aw(lider, 48, true)}</div>
        <div class="dol">${okl(rodz, 2, false).replace('class="okl"', 'class="okl" style="width:44px;height:44px;border-radius:10px;flex:none"')}<span style="min-width:0;flex:1"><span class="tyt">${tyt}</span><br><span class="pod">${firma.n} · ${gw(ocena)} ${ocena}/5</span></span></div>
      </div>${akcje()}</div></article>`;
  }
  function wPytanie(o, czas, tresc, tyt, odp, temat, odpowiadajacy) {
    return `<article class="wpis">${aw(o, 40)}<div>${glowa(o, czas, 'pytanie')}
      <div class="pyt"><div class="tyt">${tyt}</div><p class="tresc" style="margin-top:6px">${tresc}</p>
      <div class="pod"><span class="temat">${temat}</span>${odpowiadajacy.length ? `<span class="stos">${odpowiadajacy.map((x) => aw(x, 24)).join('')}</span>` : ''}<span>${odp ? `${odp} ${odp === 1 ? 'odpowiedź' : 'odpowiedzi'}` : 'Bez odpowiedzi'}</span></div>${nic('Gdy autor uzna odpowiedź', '+50 pkt dla odpowiadającego')}</div>
      ${akcje()}</div></article>`;
  }
  function wUsluga(o, czas, tresc, tyt, cena, ocena, ile, rodz) {
    return `<article class="wpis">${aw(o, 40)}<div>${glowa(o, czas, 'usluga')}<p class="tresc">${tresc}</p>
      <a class="usl" href="#">${okl(rodz, 3)}<span class="opis"><span class="tyt">${tyt}</span><span class="ocena">${I('star')}${ocena}<span>(${ile} ocen)</span></span><span class="dno"><span class="cena">od <b>${cena}</b></span></span></span></a>
      ${nic('Po ocenie 5/5 od klienta', '+100 pkt dla Lidera')}
      ${akcje()}</div></article>`;
  }

  function wpisy() {
    return [
      wZlecenie(P.hotel, '12 min', 'Szukamy ekipy do serwisu klimatyzacji w 12 pokojach przed sezonem zimowym. Prace przy gościach — tylko rano.', 'Serwis klimatyzacji — 12 pokoi', '8–12 tys. zł', '05.12', 'Sopot', 4, [P.kuba, P.ewa, P.bartek], '28.11'),
      wRealizacja(P.marta, P.hotel, '2 godz.', 'Skończyliśmy 15 kWp na dachu hotelu. Najtrudniejsze były mocowania na starej papie — opisałam to w realizacji.', 'Montaż paneli PV 15 kWp', 5, 100, 'ocena 5/5 · dojrzewa 7 dni', 'pv'),
      wPytanie(P.tomek, '4 godz.', 'Wymiana instalacji w lokalu usługowym, odbiór w przyszłym tygodniu.', 'Co musi być w protokole pomiarów, żeby odbiór przeszedł za pierwszym razem?', 2, 'Formalności', [P.iga, P.bartek]),
      wUsluga(P.iga, 'wczoraj', 'Dodałam usługę: wykończenie lokalu pod klucz, z harmonogramem w etapach i odbiorem częściowym.', 'Projekt i wykończenie lokalu usługowego', '2400 zł', '4,7', 22, 'wyk'),
      wZlecenie(P.kamienica, 'wczoraj', 'Remont klatki schodowej w kamienicy z 1910 r. Dwa etapy, konserwator zabytków już uzgodniony.', 'Remont klatki schodowej', '25–40 tys. zł', '20.01', 'Kraków', 2, [P.iga], '05.12', 3),
      wPytanie(P.ola, '2 dni', 'Mam zlecenie na 24 tys. — firma chce zaliczkę bez aneksu.', 'Przy jakiej wartości zlecenia podpisujecie aneks z zaliczką?', 0, 'Rozliczenia', []),
      wRealizacja(P.bartek, P.piekarnia, '3 dni', 'Wentylacja piekarni gotowa bez zatrzymania produkcji. Najtrudniejsze były okna czasowe, nie sama instalacja.', 'Wentylacja piekarni', 5, 50, 'druga ocena od tej firmy w roku · ×0,5', 'hvac'),
      wZlecenie(P.piekarnia, '4 dni', 'Potrzebny przegląd instalacji elektrycznej przed kontrolą, najlepiej w dni bez wypieku.', 'Przegląd instalacji elektrycznej', '2–3 tys. zł', '28.11', 'Toruń', 6, [P.tomek, P.kuba], '25.11'),
    ].join('');
  }
  const szkielet = () =>
    Array.from({ length: 4 }, () => `<div class="wpis" aria-hidden="true"><span class="aw" style="width:48px;height:48px;background:var(--surface-3)"></span><div style="display:grid;gap:10px;padding-top:4px"><span style="height:12px;width:40%;border-radius:6px;background:var(--surface-3)"></span><span style="height:12px;width:92%;border-radius:6px;background:var(--surface-2)"></span><span style="height:96px;border-radius:12px;background:var(--surface-2);border:1px solid var(--line)"></span></div></div>`).join('');
  const komunikat = (ik, t, p, przyciski) =>
    `<div style="display:grid;justify-items:center;text-align:center;gap:10px;padding:56px 24px"><span style="display:grid;place-items:center;width:64px;height:64px;border-radius:20px;background:var(--surface-3);color:var(--text-muted)">${I(ik).replace('class="', 'style="font-size:32px" class="')}</span><h2 style="margin:6px 0 0;font:750 20px/1.2 var(--font-display);color:var(--text-strong)">${t}</h2><p style="margin:0;max-width:40ch;color:var(--text-muted)">${p}</p><div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:center;margin-top:8px">${przyciski}</div></div>`;

  // ═════════ Strumień ═════════
  function feed() {
    const filtry = [['Wszystko', 87, true], ['Moja branża', 41], ['Zlecenia', 31], ['Pytania', 24], ['Realizacje', 19], ['Usługi', 13]];
    let srodek;
    if (STAN === 'ladowanie') srodek = szkielet();
    else if (STAN === 'blad') srodek = komunikat('cloud-slash', 'Nie udało się wczytać strumienia', 'To po naszej stronie. Twoje wpisy są bezpieczne.', `<button class="btn glowny" type="button" data-ponow>${I('arrow-clockwise')}Spróbuj ponownie</button>`);
    else if (STAN === 'pusty') srodek = komunikat('sparkle', 'Tu pojawią się zlecenia, pytania i realizacje', 'Wybierz branże, a strumień pokaże wpisy z nich — najnowsze na górze, bez algorytmu.', `<a class="btn glowny" href="#">Wybierz branże</a><a class="btn obrys" href="#">Zadaj pierwsze pytanie</a>`);
    else srodek = wpisy() + `<div class="wiecej"><button class="btn obrys" type="button">Pokaż więcej</button><small class="num">8 z 87</small></div>`;
    document.body.innerHTML = `${gora()}<div class="rama">${nav('feed')}
      <main class="kolumna" id="tresc">
        <div class="naglowek"><h1>Strumień</h1></div>
        ${STAN === 'pusty' ? '' : `<a class="pasek-drabinki" href="drabinka.html">${aw(P.ola, 40, true)}<span class="t"><b>Specjalista · 770 pkt</b><small>730 do „Ekspert” · +150 dojrzewa</small>${miernik(70, 800, 'var(--level-3)', 150)}</span>${I('caret-right')}</a>`}
        <div class="kompozytor">${aw(P.ola, 48)}<div class="pole"><button class="wpisz" type="button">Opisz, czego potrzebujesz, albo zapytaj o radę…</button>
          <div class="rodzaje"><button class="rodzaj" style="--c:var(--t-zlecenie)" type="button">${I('clipboard-text')}Zlecenie</button><button class="rodzaj" style="--c:var(--t-pytanie)" type="button">${I('chats-circle')}Pytanie</button><button class="rodzaj" style="--c:var(--t-realizacja)" type="button">${I('seal-check')}Realizacja</button><button class="btn glowny maly" type="button">Opublikuj</button></div></div></div>
        <div class="filtry" data-przesuw role="toolbar" aria-label="Filtr strumienia">${filtry.map(([t, n, a]) => `<button class="filtr" type="button" aria-pressed="${!!a}">${t}</button>`).join('')}</div>
        ${srodek}
      </main>
      <aside class="bok"><div class="bok-lepki">${kartaDrabinki()}${kartaZlecen()}${kartaTematow()}${stopka()}</div></aside>
    </div>${dolny('feed')}<button class="fab" type="button" aria-label="Utwórz wpis">${I('plus')}</button>${stany(['pusty', 'ladowanie', 'blad'])}`;
  }

  // ═════════ Profil (Bartek Lis oglądany przez Olę) ═════════
  function okladkaProfilu() {
    // konstelacja: każdy punkt to ktoś, kto dał światło; linie zbiegają się do Lidera
    let s = '', seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const cx = 120, cy = 150;
    for (let i = 0; i < 23; i++) {
      const x = 260 + rnd() * 760, y = 20 + rnd() * 130, r = 1.6 + rnd() * 2.6;
      s += `<line x1="${x}" y1="${y}" x2="${cx}" y2="${cy}" style="stroke:var(--level-5);opacity:${0.05 + rnd() * 0.12}" stroke-width="1"/>`;
      s += `<circle cx="${x}" cy="${y}" r="${r}" style="fill:${i % 6 === 0 ? 'var(--warm)' : 'var(--level-5)'};opacity:${0.45 + rnd() * 0.5}"/>`;
    }
    return `<div class="prof-okl" aria-hidden="true"><svg viewBox="0 0 1040 168" preserveAspectRatio="xMidYMid slice"><defs><radialGradient id="po" cx="15%" cy="100%" r="90%"><stop offset="0" style="stop-color:var(--level-5);stop-opacity:.35"/><stop offset=".6" style="stop-color:var(--primary-500);stop-opacity:.08"/><stop offset="1" style="stop-color:var(--primary-500);stop-opacity:0"/></radialGradient></defs><rect width="1040" height="168" style="fill:var(--surface)"/><rect width="1040" height="168" fill="url(#po)"/>${s}</svg></div>`;
  }
  function profil() {
    const b = P.bartek;
    const R = [
      ['Klimatyzacja 12 pokoi', P.hotel, '5,0', 'listopad 2026', 'chlod', 50], ['Wentylacja piekarni', P.piekarnia, '5,0', 'październik 2026', 'hvac', 50],
      ['Pompa ciepła, kamienica z 1930 r.', P.kamienica, '5,0', 'wrzesień 2026', 'san', 100], ['Modernizacja węzła cieplnego', P.hotel, '4,0', 'sierpień 2026', 'el', 80],
      ['Rekuperacja w biurowcu', P.biuro, '5,0', 'lipiec 2026', 'hvac', 100], ['Serwis chłodni', P.piekarnia, '5,0', 'czerwiec 2026', 'chlod', 100],
    ];
    const os = [
      [P.hotel, 'Ocena 5/5 · druga od tej firmy w roku, ×0,5', 'Klimatyzacja 12 pokoi', '12.11', 50], [P.marta, 'Uznała odpowiedź', 'Pompa ciepła w budynku z 1930 r.', '09.11', 50],
      [P.piekarnia, 'Ocena 5/5', 'Wentylacja piekarni', '30.10', 50], [P.iga, 'Głos za odpowiedź', 'Rekuperacja w lokalu usługowym', '22.10', 10],
      [P.kamienica, 'Ocena 5/5', 'Pompa ciepła, kamienica z 1930 r.', '12.09', 100], [P.hotel, 'Ocena 4/5 · pierwsza od tej firmy', 'Modernizacja węzła cieplnego', '28.08', 80],
    ];
    document.body.innerHTML = `${gora()}<div class="rama szeroka">${nav('liderzy')}
      <main class="kolumna" id="tresc"><div class="gh">
        <aside class="gh-lewa" aria-label="Lider">
          <div class="gh-aw">${aw(b, 260, true)}</div>
          <h1>${b.n}</h1><div class="gh-poz">${odz(b.lv, true)}</div>
          <div class="rola">Instalacje HVAC · ${b.miasto}</div>
          <p class="bio">Klimatyzacja, wentylacja i pompy ciepła w obiektach usługowych. Projekt, montaż i odbiór — z jednym człowiekiem do kontaktu.</p>
          <div class="prof-akcje"><a class="btn glowny" href="#">${I('clipboard-text')}Zaproponuj zlecenie</a><button class="btn obrys" type="button">${I('plus')}Obserwuj</button><button class="ikonka" type="button" aria-label="Udostępnij profil" style="border:1px solid var(--line-2)">${I('share-network')}</button></div>
          <ul class="gh-liczby"><li>${I('seal-check')}<b>41</b> realizacji</li><li>${I('chats-circle')}<b>12</b> uznanych odpowiedzi</li><li>${I('star')}<b>4,9</b> średnia z 37 ocen</li><li>${I('calendar-blank')}W Portalu od marca 2026</li></ul>
          <section class="gh-dr" aria-label="Do następnego szczebla"><h2>Do następnego szczebla</h2>${miniDrabinkaProfilu(b, true)}</section>
        </aside>
        <div class="gh-prawa">
          <div class="naglowek" style="position:sticky"><nav class="zakladki" data-przesuw aria-label="Sekcje profilu"><a href="#" aria-current="page">Przegląd</a><a href="#">Realizacje<span class="ile">41</span></a><a href="#">Odpowiedzi<span class="ile">12</span></a><a href="#">Oceny<span class="ile">37</span></a><a href="#">Usługi<span class="ile">2</span></a></nav></div>
          <section class="sekcja"><div class="readme"><header>${I('article')}<span>O mnie</span></header><div class="tr"><p>Od ośmiu lat montuję klimatyzację, wentylację i pompy ciepła w hotelach, piekarniach i biurowcach. Pracuję w oknach, w których obiekt nie traci ani dnia: serwis rano, protokół z pomiarów tego samego dnia.</p><p>Pytania o dobór urządzeń i formalności odbioru? Odpowiadam w Portalu — tak zdobywam punkty od innych Liderów.</p></div></div></section>
          <section class="sekcja"><header><h2>Przypięte realizacje</h2><a href="#">Wszystkie 41</a></header>
            <div class="przypiete" data-przesuw>${R.map(([t, f, o, d, rz, p]) => `<a class="real" href="#">${okl(rz, t.length)}<span class="w"><span class="tyt">${t}</span><span class="kto">${aw(f, 22).replace('--fs:7px', '--fs:8px')}${f.n}</span><span class="dno"><span class="ocena">${I('star')}${o}</span><span class="pk">+${p} pkt</span><span>${d}</span></span></span></a>`).join('')}</div></section>
          <section class="sekcja"><header><h2>Oś światła</h2><small>kto dał punkt, za co, ile — od najnowszych</small></header>
            <ol class="os-sw">${os.map(([z, co, za, d, p]) => `<li>${aw(z, 36)}<span class="co"><b>${z.n}</b> · ${co}<small>${za} · ${d}</small></span><span class="pkt">+${p}</span></li>`).join('')}</ol>
            <a class="wiecej-link" href="#">Pokaż więcej · 6 z 23</a></section>
          <section class="sekcja"><header><h2>Usługi</h2><small>ceny orientacyjne, wycena po wizji</small></header>
            <div class="uslugi" data-przesuw>
              <a class="kusl" href="#">${okl('chlod', 4)}<span class="w"><span class="tyt">Przegląd i czyszczenie klimatyzacji z protokołem</span><span class="ocena">${I('star')}4,9<span>(24 oceny)</span></span><span class="dno"><span class="cena">od <b>180 zł</b> / jedn.</span><span class="cena">2–5 dni</span></span></span></a>
              <a class="kusl" href="#">${okl('hvac', 1)}<span class="w"><span class="tyt">Projekt wentylacji z rekuperacją dla lokalu usługowego</span><span class="ocena">${I('star')}4,8<span>(9 ocen)</span></span><span class="dno"><span class="cena">od <b>3500 zł</b></span><span class="cena">2–3 tyg.</span></span></span></a>
            </div></section>
          <section class="sekcja"><header><h2>Ostatnie oceny</h2><a href="#">Wszystkie 37</a></header>
            ${[[P.hotel, 5, 'Serwis zrobiony rano, zanim goście zeszli na śniadanie. Protokół z pomiarami dostaliśmy tego samego dnia.', 'Klimatyzacja 12 pokoi', '12.11'], [P.piekarnia, 5, 'Ani jednego dnia przestoju produkcji. Ekipa pracowała w oknach między wypiekami.', 'Wentylacja piekarni', '30.10'], [P.hotel, 4, 'Dobra robota, jeden termin przesunięty o dwa dni — uprzedzili z wyprzedzeniem.', 'Modernizacja węzła cieplnego', '28.08']].map(([f, o, t, z, d]) => `<div class="cytat">${aw(f, 40)}<div><q>${t}</q><div class="kto"><b style="color:var(--text-strong);font-weight:600">${f.n}</b>${gw(o)}<span>${z} · ${d}</span></div></div></div>`).join('')}
          </section>
          <div class="sekcja" style="border:0">${stopka()}</div>
        </div></div>
      </main>
    </div>${dolny('')}`;
  }
  function miniDrabinkaProfilu(b, bok) {
    const rynek = 2400, spol = 900;
    return `${bok ? '' : `<header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h2 style="margin:0;font:700 18px/1.2 var(--font-display);color:var(--text-strong)">Drabinka</h2>${odz(b.lv)}</header>`}
      <div class="duza-liczba"><b>${fmt(b.pkt)}</b><span>z ${fmt(6000)} do „Autorytet”</span></div>
      ${schodki(b.lv, postep(b))}
      <div class="sciezka">
        <div class="wiersz"><span>Rynek</span><b>${fmt(rynek)}</b></div>${miernik(rynek, 6000, 'var(--level-5)', 0, 1200)}<div class="pod ok">${I('check-circle')} próg ścieżki spełniony</div>
        <div class="wiersz" style="margin-top:6px"><span>Społeczność</span><b>${spol}</b></div>${miernik(spol, 6000, 'var(--level-5)', 0, 1200)}<div class="pod">brakuje 300 pkt do progu 20% (1200)</div>
      </div>
      <div class="krok" style="margin-top:14px">${I('app-window')}<span><b>Szczebel 5</b> dał Bartkowi dostęp do LOT App.</span></div>`;
  }

  // ═════════ Drabinka ═════════
  function scena(pusty) {
    // schody 7 węzłów; do węzła bieżącego biegną promienie od ludzi, którzy dali światło
    const N = L.map((s, i) => ({ x: 40 + i * 58, y: 290 - i * 40, ...s }));
    const lv = pusty ? 0 : 3;
    let s = `<defs><filter id="bl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6"/></filter><linearGradient id="sch" x1="0" y1="1" x2="1" y2="0"><stop offset="0" style="stop-color:var(--level-1)"/><stop offset=".5" style="stop-color:var(--primary-400)"/><stop offset="1" style="stop-color:var(--level-7)"/></linearGradient></defs>`;
    s += `<polyline points="${N.map((n) => `${n.x},${n.y}`).join(' ')}" fill="none" style="stroke:url(#sch)" stroke-width="2" opacity=".35" stroke-dasharray="2 6" stroke-linecap="round"/>`;
    if (lv) s += `<polyline points="${N.slice(0, lv).map((n) => `${n.x},${n.y}`).join(' ')}" fill="none" style="stroke:url(#sch)" stroke-width="3" stroke-linecap="round"/>`;
    const cel = N[Math.max(lv - 1, 0)];
    if (lv) {
      const zr = [[330, 300], [390, 250], [410, 170], [250, 330], [170, 40], [80, 120]];
      zr.forEach(([x, y], i) => {
        s += `<line x1="${x}" y1="${y}" x2="${cel.x}" y2="${cel.y}" style="stroke:${i < 2 ? 'var(--warm)' : 'var(--primary-400)'}" stroke-width="1.2" opacity=".35"/>`;
        s += `<circle cx="${x}" cy="${y}" r="9" style="fill:var(--surface-3);stroke:${i < 2 ? 'var(--warm)' : 'var(--line-2)'}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="3.5" style="fill:${i < 2 ? 'var(--warm)' : 'var(--primary-400)'}"/>`;
      });
    }
    N.forEach((n, i) => {
      const ma = i < lv, teraz = i === lv - 1, c = `var(--level-${n.n})`;
      if (teraz) s += `<circle cx="${n.x}" cy="${n.y}" r="22" style="fill:${c}" opacity=".45" filter="url(#bl)"/><circle cx="${n.x}" cy="${n.y}" r="17" fill="none" style="stroke:${c}" stroke-width="1.5" opacity=".6"/>`;
      if (n.n === 7) s += `<circle cx="${n.x}" cy="${n.y}" r="18" style="fill:var(--level-7)" opacity=".25" filter="url(#bl)"/>`;
      s += `<circle cx="${n.x}" cy="${n.y}" r="${ma ? 10 : 8}" style="fill:${ma ? c : 'var(--surface)'};stroke:${c}" stroke-width="2"/>`;
      const etk = teraz ? [`${n.nazwa} · tu jesteś`, 'var(--text-strong)', 700] : n.n === 5 ? ['Mentor · LOT App', 'var(--text-muted)', 600] : n.n === 7 ? ['Architekt Zespołów', 'var(--warm)', 650] : null;
      if (etk) s += `<text x="${n.x - 18}" y="${n.y + 4}" text-anchor="end" style="fill:${etk[1]};font:${etk[2]} 12px var(--font-sans)">${etk[0]}</text>`;
    });
    return `<div class="dr-scena" aria-hidden="true"><svg viewBox="0 0 420 340" preserveAspectRatio="xMidYMid meet">${s}</svg></div>`;
  }
  function drabinka() {
    const pusty = STAN === 'pusty';
    const lv = pusty ? 0 : 3, pkt = pusty ? 0 : 770;
    const stopnie = L.map((s, i) => {
      const ma = s.n <= lv, teraz = s.n === lv, nast = s.n === lv + 1;
      const daje = s.n === 5 ? `<span class="daje">${I('app-window')}Dostęp do LOT App</span>` : s.n === 7 ? `<span class="daje">${I('users-three')}Własny zespół</span>` : '';
      const stan = ma ? (teraz ? `${I('map-pin')}Tu jesteś` : `${I('check-circle')}Zdobyty`) : nast ? `brakuje ${fmt(s.prog - pkt)}` : s.n >= 4 ? `2 ścieżki × min. ${fmt(s.prog / 5)}` : '';
      return `<li class="stopien${ma ? ' ma' : ''}${teraz ? ' teraz' : ''}${s.n === 7 ? ' siodmy' : ''}" style="--i:${i};--c:var(--level-${s.n})"><span class="nr">${s.n}</span><span class="naz">${s.nazwa}</span><span class="pr num">${fmt(s.prog)} pkt</span>${daje}<span class="stan">${stan}</span></li>`;
    }).join('');
    const os = pusty
      ? komunikat('hand-heart', 'Jeszcze nikt nie dał ci światła', 'Pierwsze punkty przyjdą od firmy, która oceni twoje zlecenie, albo od Lidera, który uzna twoją odpowiedź.', `<a class="btn glowny" href="#">Pytania czekające na odpowiedź</a>`)
      : `<ol class="os">${[
          [P.kamienica, 'Ocena 5/5 po zleceniu', '„Wymiana pionu wodnego”', '15.11 · rynek', 100, 'dojrzewa za 2 dni'],
          [P.iga, 'Uznała twoją odpowiedź', '„Pompa ciepła w budynku z 1930 r.”', '17.11 · społeczność', 50, 'dojrzewa za 4 dni'],
          [P.piekarnia, 'Ocena 4/5 po zleceniu', '„Hydraulika w piekarni”', '04.11 · rynek', 80],
          [P.hotel, 'Ocena 5/5 — druga od tej firmy w roku', 'waga ×0,5', '28.10 · rynek', 50],
          [P.marta, 'Uznała twoją odpowiedź', '„Zaliczka przy zleceniu powyżej 20 tys.”', '21.10 · społeczność', 50],
          [P.bartek, 'Głos za odpowiedź', '„Dobór zaworów do pionu”', '14.10 · społeczność', 10],
        ].map(([z, co, t, d, p, cz]) => `<li class="${cz ? 'czeka' : ''}">${aw(z, 40)}<span class="co"><b>${z.n}</b> · ${co} <span style="color:var(--text-muted)">${t}</span><small>${d}${cz ? ` · <span class="dojrzewa">${I('hourglass-medium')}${cz}</span>` : ''}</small></span><span class="pkt">+${p}<small>${cz ? 'czeka' : 'pkt'}</small></span></li>`).join('')}</ol>`;
    document.body.innerHTML = `${gora()}<div class="rama szeroka">${nav('drabinka')}
      <main class="kolumna" id="tresc">
        <section class="dr-hero">
          <div>
            <div class="etk">Drabinka Lidera</div>
            <h1>Twój punkt nigdy <em>nie świeci sam.</em></h1>
            <p>Siedem szczebli. Punkty daje ci wyłącznie drugi człowiek — firma, która oceniła zlecenie, albo Lider, który uznał twoją odpowiedź.</p>
            <div class="dr-ja">${aw(pusty ? { ...P.ola, lv: 0 } : P.ola, 64, true)}<div class="t">
              <div class="r"><b>${pkt} pkt</b><span>${pusty ? '100 do „Adept”' : '730 do „Ekspert”'}</span></div>
              ${pusty ? miernik(0, 100, 'var(--level-1)') : miernik(70, 800, 'var(--level-3)', 150)}
              <div class="pod">${pusty ? '<span>Nowy w Portalu</span>' : `${odz(3)}<span class="dojrzewa">${I('hourglass-medium')}+150 dojrzewa</span>`}</div>
            </div></div>
          </div>
          ${scena(pusty)}
        </section>
        <section class="sekcja"><header><h2>Siedem szczebli</h2><small>od szczebla 4 każda ścieżka musi dać min. 20% progu</small></header><ol class="stopnie" data-przesuw style="list-style:none;margin:0">${stopnie}</ol></section>
        ${pusty ? '' : `<section class="sekcja"><header><h2>Następny: Ekspert</h2><small class="num">1500 pkt</small></header>
          <div class="wymogi">
            <div class="wymog">${I('circle-dashed')}<span class="co">Łącznie 1500 pkt</span><span class="ile"><b>770</b> / 1500</span>${miernik(770, 1500, 'var(--level-4)', 150)}</div>
            <div class="wymog ok">${I('check-circle')}<span class="co">Rynek — min. 300 pkt</span><span class="ile"><b>640</b> / 300</span>${miernik(300, 300, 'var(--success)')}</div>
            <div class="wymog">${I('circle-dashed')}<span class="co">Społeczność — min. 300 pkt</span><span class="ile"><b>130</b> / 300</span>${miernik(130, 300, 'var(--level-4)', 50)}</div>
          </div>
          <div class="drogi">
            <div class="droga"><span class="x">4 uznane odpowiedzi<span>+200 pkt</span></span><p>Domykają próg społeczności. Limit: 300 pkt na 7 dni — w tym tygodniu masz 50 z 300.</p><a href="#">12 pytań z twoich branż czeka ${I('arrow-right')}</a></div>
            <div class="droga"><span class="x">Zlecenie z oceną 5/5<span>+100 pkt</span></span><p>Każda nowa firma liczy się w pełni. Kolejne oceny od tej samej firmy w roku: ×0,5, ×0,25… min. ×0,1.</p><a href="#">9 otwartych zleceń w twojej branży ${I('arrow-right')}</a></div>
          </div></section>`}
        <div class="dwie">
          <section class="sekcja"><header><h2>Kto dał ci światło</h2>${pusty ? '' : '<small>6 z 14</small>'}</header>${os}</section>
          <section class="sekcja"><header><h2>Ile to punktów</h2></header><div class="cennik">
            <h3 style="--c:var(--primary-400)">${I('clipboard-text')}Rynek — ocena po zleceniu</h3>
            <div class="w"><span>Ocena 5/5</span><b>100</b></div><div class="w"><span>Ocena 4/5</span><b>80</b></div><div class="w"><span>Ocena 3/5</span><b>40</b></div><div class="w"><span>Ocena 2/5 i niżej</span><b>0</b></div>
            <div class="w"><span>Kolejna ocena od tej samej firmy w 365 dni</span><b>×0,5ⁿ</b></div><div class="w"><span>Firma młodsza niż 14 dni</span><b>×0,5</b></div>
            <h3 style="--c:var(--t-pytanie)">${I('chats-circle')}Społeczność — odpowiedzi</h3>
            <div class="w"><span>Uznana odpowiedź</span><b>50</b></div><div class="w"><span>Głos za odpowiedź (konto ≥ 14 dni)</span><b>10</b></div><div class="w"><span>Limit ścieżki</span><b>300 / 7 dni</b></div>
            <h3 style="--c:var(--warm)">${I('hourglass-medium')}Każdy punkt dojrzewa 7 dni</h3>
          </div></section>
        </div>
        <section class="sekcja" style="border-bottom:0"><header><h2>Czego Drabinka nie liczy</h2><small>żeby status znaczył to samo dla każdego</small></header>
          <div class="zero">${[['user-plus', 'Zaproszenia i polecenia'], ['sign-in', 'Logowanie i dni aktywności'], ['note-pencil', 'Wpisy i komentarze'], ['heart', 'Reakcje'], ['eye', 'Wyświetlenia'], ['users', 'Obserwujący'], ['magnifying-glass', 'Wyszukiwanie']].map(([ik, t]) => `<span>${I(ik)}${t}<b>0 pkt</b></span>`).join('')}</div>
          <div class="tylko-telefon" style="margin-top:24px">${stopka()}</div>
        </section>
      </main>
    </div>${dolny('drabinka')}${stany(['pusty', 'ladowanie', 'blad'])}`;
  }

  // ═════════ Stany profilu i Drabinki: ładowanie (szkielet w kształcie wierszy) / błąd / pusty ═════════
  const sz = (w, h = 12, kl = '') => `<span class="sz ${kl}" style="width:${w};height:${h}px"></span>`;
  const szWiersz = () => `<div class="sz-wiersz"><span class="sz kolo" style="width:40px;height:40px"></span><div>${sz('46%')}${sz('88%', 10, 'm')}</div>${sz('44px', 20)}</div>`;
  const powloka = (akt, szeroka, tresc, lista, pasekTel = '') => `${gora()}<div class="rama${szeroka ? ' szeroka' : ''}">${nav(akt)}<main class="kolumna" id="tresc">${tresc}</main></div>${dolny(akt)}${stany(lista)}`;
  const bladEkranu = (t) => komunikat('cloud-slash', t, 'To po naszej stronie. Twoje punkty i wpisy są bezpieczne.', `<button class="btn glowny" type="button" data-ponow>${I('arrow-clockwise')}Spróbuj ponownie</button><a class="btn obrys" href="feed.html">Wróć do strumienia</a>`);

  function stanProfilu() {
    const lista = ['pusty', 'ladowanie', 'blad'];
    if (STAN === 'ladowanie') {
      return powloka('', false, `<div role="status" aria-busy="true" aria-label="Wczytywanie profilu"><div class="sz" style="height:150px;border-radius:0"></div>
        <div style="padding:0 20px;margin-top:-48px">${sz('96px', 96, 'kolo')}<div style="display:grid;gap:10px;margin-top:16px">${sz('46%', 22)}${sz('30%', 12, 'm')}${sz('80%', 12, 'm')}</div></div>
        <div style="padding:20px">${szWiersz()}${szWiersz()}${szWiersz()}${szWiersz()}</div></div>`, lista);
    }
    if (STAN === 'blad') return powloka('', false, `<div class="naglowek"><h1>Profil</h1></div>${bladEkranu('Nie udało się wczytać profilu')}`, lista);
    // pusty = nowy Lider bez punktów, widziany przez siebie
    const o = { ...P.ola, lv: 0, pkt: 0, n: 'Ola Wrzos' };
    return powloka('liderzy', false, `${okladkaProfilu()}
      <div class="prof-glowa">${aw(o, 128)}<div class="prof-akcje"><a class="btn glowny" href="#">${I('pencil-simple')}Uzupełnij profil</a></div>
        <h1>${o.n} ${odz(0, true)}</h1><div class="rola">${o.branza} · ${o.miasto}</div>
        <p class="bio" style="color:var(--text-muted)">Dodaj dwa zdania o tym, co robisz i dla kogo. Firmy czytają to przed wysłaniem zlecenia.</p></div>
      <section class="sekcja"><header><h2>Realizacje</h2></header>${komunikat('seal-check', 'Pierwsza realizacja pojawi się po zleceniu', 'Firma ocenia pracę po jej zakończeniu — dopiero wtedy wpis trafia na profil. Nie da się go dodać samemu.', `<a class="btn glowny" href="feed.html">Zobacz otwarte zlecenia</a>`)}</section>
      <section class="sekcja"><header><h2>Odpowiedzi</h2></header>${komunikat('chats-circle', 'Brak uznanych odpowiedzi', 'Odpowiedz na pytanie z twojej branży. Punkt dostaniesz, gdy autor uzna odpowiedź.', `<a class="btn obrys" href="feed.html">Pytania czekające na odpowiedź</a>`)}</section>`, lista);
  }
  function stanDrabinki() {
    if (STAN === 'ladowanie') {
      return powloka('drabinka', true, `<div role="status" aria-busy="true" aria-label="Wczytywanie Drabinki"><section class="dr-hero" style="display:grid;gap:14px">${sz('30%', 12)}${sz('70%', 36)}${sz('55%', 14, 'm')}<div style="display:flex;gap:14px;align-items:center;margin-top:8px">${sz('60px', 60, 'kolo')}<div style="flex:1;display:grid;gap:10px">${sz('40%', 16)}${sz('100%', 8, 'm')}</div></div></section>
        <section class="sekcja">${sz('36%', 18)}<div style="display:grid;gap:12px;margin-top:16px">${[0, 1, 2, 3, 4, 5, 6].map(szWiersz).join('')}</div></section></div>`, ['pusty', 'ladowanie', 'blad']);
    }
    return powloka('drabinka', true, `<div class="naglowek"><h1>Drabinka Lidera</h1></div>${bladEkranu('Nie udało się wczytać Drabinki')}`, ['pusty', 'ladowanie', 'blad']);
  }
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-ponow]')) return;
    const u = new URLSearchParams(location.search); u.delete('stan'); location.search = u.toString();
  });

  window.Pro = {
    feed,
    profil: () => { if (STAN) { document.body.innerHTML = stanProfilu(); } else { profil(); document.body.insertAdjacentHTML('beforeend', stany(['pusty', 'ladowanie', 'blad'])); } },
    drabinka: () => { if (STAN === 'ladowanie' || STAN === 'blad') { document.body.innerHTML = stanDrabinki(); } else drabinka(); },
  };
})();
