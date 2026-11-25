// Portal Liderów — P1 „Rynek” (makieta 25.11.2026): Pro.zlecenia(), Pro.zlecenie(), Pro.uslugi(), Pro.usluga().
// Ładować po pro.js (bierze z niego ramę, awatary, odznaki, okładki: Pro.h). Parametry jak w pro.js: ?motyw=dark|light, ?stan=dane|pusty|ladowanie|blad.
// Dane fikcyjne (firmy i Liderzy wymyśleni; zero prawdziwych kont, e-maili, NIP-ów). Punkty i progi z apps/api/src/modules/ladder/rules.ts.
// Granice: ADR-004 — punkt tylko za ocenę po zleceniu i uznaną odpowiedź (oferta, wybór wykonawcy, zamówienie punktów nie dają);
// ADR-010 — kolejność chronologiczna, „Pokaż więcej · N z M”, zero liczników wyświetleń/obserwujących; licznik OFERT to fakt zlecenia, nie popularność.
(() => {
  const { STAN, L, P, I, aw, odz, okl, nav, gora, dolny, stopka, stany, miernik, komunikat, sz, szWiersz, bladEkranu, fmt, szczebelki } = Pro.h;
  const fmt4 = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0');
  const zl = (n) => `${fmt4(n)}\u00a0zł`;
  const gwiazdka = I('star-fill').replace('ph-star-fill', 'ph-star');
  const ocena = (o, n, kl = 'oc') =>
    n ? `<span class="${kl}">${gwiazdka}${o.toString().replace('.', ',')} <small>(${n})</small></span>` : `<span class="${kl} bez">Bez ocen</span>`;

  // ── Ludzie i firmy dodane w P1 (reszta z P w pro.js) ──
  const F = {
    spoldz: { n: 'Spółdzielnia Mieszkaniowa Nad Brdą', firma: true, branza: 'Zarządzanie nieruchomościami', miasto: 'Bydgoszcz', skrot: 'SB' },
    przedszkole: { n: 'Przedszkole Słoneczko', firma: true, branza: 'Edukacja', miasto: 'Rzeszów', skrot: 'PS' },
    pensjonat: { n: 'Pensjonat Leśna Przystań', firma: true, branza: 'Turystyka', miasto: 'Zakopane', skrot: 'LP' },
    zagiel: { n: 'Hotel Pod Żaglem', firma: true, branza: 'Hotelarstwo', miasto: 'Gdynia', skrot: 'PŻ' },
    pawel: { n: 'Paweł Klon', lv: 1, pkt: 140, branza: 'Instalacje HVAC', miasto: 'Gdynia' },
  };
  const ZAP = { ...P, ...F };

  // ── Zlecenia: od najnowszego (ADR-010) ──
  // zw: true = NIP potwierdzony; od = wymagany poziom oferenta (0 = bez wymagań)
  const ZLECENIA = [
    { f: ZAP.spoldz, t: 'Wymiana pionów wodnych w bloku z 1978 r. (3 klatki)', b: '60–90 tys. zł', m: 'Bydgoszcz', br: 'Instalacje sanitarne', do: '28.02', czas: '1 godz. temu', of: 1, zb: '05.12', od: 3, zw: true },
    { f: ZAP.przedszkole, t: 'Wentylacja z rekuperacją w 4 salach', b: '28–35 tys. zł', m: 'Rzeszów', br: 'Instalacje HVAC', do: '15.01', czas: '3 godz. temu', of: 0, zb: '08.12', od: 0, zw: true },
    { f: ZAP.pensjonat, t: 'Instalacja PV 20 kWp z magazynem energii', b: '70–95 tys. zł', m: 'Zakopane', br: 'Fotowoltaika', do: '31.03', czas: '6 godz. temu', of: 3, zb: '03.12', od: 4, zw: false },
    { f: ZAP.hotel, t: 'Serwis klimatyzacji — 12 pokoi', b: '8–12 tys. zł', m: 'Sopot', br: 'Instalacje HVAC', do: '05.12', czas: 'wczoraj', of: 4, zb: '28.11', od: 0, zw: true, id: 1 },
    { f: ZAP.kamienica, t: 'Przegląd kotłowni gazowej z wymianą zaworów', b: '3–5 tys. zł', m: 'Kraków', br: 'Instalacje sanitarne', do: '10.12', czas: 'wczoraj', of: 2, zb: '30.11', od: 0, zw: true },
    { f: ZAP.biuro, t: 'Dostosowanie klimatyzacji w serwerowni', b: '14–18 tys. zł', m: 'Poznań', br: 'Chłodnictwo', do: '20.12', czas: '3 dni temu', of: 3, zb: '29.11', od: 2, zw: true },
    { f: ZAP.piekarnia, t: 'Przegląd instalacji elektrycznej przed kontrolą', b: '2–3 tys. zł', m: 'Toruń', br: 'Elektryka', do: '30.11', czas: '4 dni temu', of: 6, zb: '26.11', od: 0, zw: true },
    { f: ZAP.kamienica, t: 'Remont klatki schodowej', b: '25–40 tys. zł', m: 'Kraków', br: 'Wykończenia', do: '20.01', czas: '5 dni temu', of: 2, zb: '05.12', od: 3, zw: true },
  ];
  const ja = P.ola; // Lider oglądający listy: Specjalista (L3), 770 pkt

  const ofW = (n) => (n === 1 ? 'oferta' : n >= 2 && n <= 4 ? 'oferty' : 'ofert');
  function wierszZlecenia(z) {
    const wys = z.od > ja.lv;
    const wym = z.od
      ? `<div class="zl-wym${wys ? ' za-wysoko' : ''}">${I('lock-simple')}<span>Oferty od <b>L${z.od} · ${L[z.od - 1].nazwa}</b>${wys ? ` — brakuje ${fmt(L[z.od - 1].prog - ja.pkt)} pkt` : ''}</span></div>`
      : '';
    return `<a class="zl-w" href="zlecenie.html">${aw(z.f, 40)}<div style="min-width:0">
      <div class="zl-kto"><b>${z.f.n}</b><span class="zw${z.zw ? '' : ' brak'}">${I(z.zw ? 'seal-check' : 'question')}${z.zw ? 'Zweryfikowana' : 'Bez NIP'}</span><span>· ${z.czas}</span></div>
      <div class="zl-tyt">${z.t}</div>
      <div class="zl-fakty"><b>${z.b}</b><span>${z.m}</span><span>${z.br}</span><span>wykonanie do ${z.do}</span></div>${wym}</div>
      <div class="zl-of"><b class="${z.of ? '' : 'zero'}">${z.of || '0'}</b><span>${z.of ? ofW(z.of) : 'ofert'}</span><small>zbiera do ${z.zb}</small></div></a>`;
  }
  const szWierszZl = () =>
    `<div class="zl-w" aria-hidden="true"><span class="sz" style="width:40px;height:40px;border-radius:8px"></span><div style="display:grid;gap:10px;padding-top:2px">${sz('52%', 11, 'm')}${sz('86%', 19)}${sz('64%', 13, 'm')}</div><span class="sz" style="width:44px;height:30px;justify-self:end"></span></div>`;

  const BRANZE = [['Instalacje HVAC', 9], ['Instalacje sanitarne', 7], ['Elektryka', 5], ['Fotowoltaika', 3], ['Wykończenia', 4], ['Chłodnictwo', 3]];
  const BUDZET = [['Dowolny', 31], ['do 5 tys. zł', 8], ['5–20 tys. zł', 11], ['20–60 tys. zł', 8], ['powyżej 60 tys. zł', 4]];
  const POZIOM = [['Bez wymagań', 24], ['Wymagany poziom do L3', 5], ['Wymagany poziom L4 i wyżej', 2]];
  const filtrBok = (akt) => {
    const [brA, buA, poA] = akt;
    return `<aside class="bok" aria-label="Filtry"><form class="rn-filtr" onsubmit="return false">
      <div><h2>Branża</h2><div class="og">${BRANZE.map(([t, n]) => `<label><input type="checkbox" ${brA.includes(t) ? 'checked' : ''}>${t}<span class="n">${n}</span></label>`).join('')}</div></div>
      <div><h2>Budżet</h2><div class="og">${BUDZET.map(([t, n], i) => `<label><input type="radio" name="b" ${i === buA ? 'checked' : ''}>${t}<span class="n">${n}</span></label>`).join('')}</div></div>
      <div><h2>Poziom oferenta</h2><div class="og">${POZIOM.map(([t, n], i) => `<label><input type="radio" name="p" ${i === poA ? 'checked' : ''}>${t}<span class="n">${n}</span></label>`).join('')}</div></div>
      ${brA.length || buA || poA ? `<a class="czysc" href="?stan=dane&motyw=${Pro.h.q.get('motyw') || ''}">Wyczyść filtry</a>` : ''}
      <p class="rn-uwaga">${I('seal-check')}<b>Oferta punktów nie daje.</b> Punkty dostaje Lider od firmy, która oceni go po zrealizowanym zleceniu — do 100.</p>
    </form></aside>`;
  };

  // ═════════ /zlecenia ═════════
  function zlecenia() {
    const pusty = STAN === 'pusty';
    const aktywne = pusty ? [['Fotowoltaika'], 1, 0] : [[], 0, 0];
    const lista = pusty ? 0 : ZLECENIA.length;
    let srodek;
    if (STAN === 'ladowanie') srodek = `<div role="status" aria-busy="true" aria-label="Wczytywanie zleceń">${Array.from({ length: 6 }, szWierszZl).join('')}</div>`;
    else if (STAN === 'blad')
      srodek = komunikat('cloud-slash', 'Nie udało się wczytać zleceń', 'To po naszej stronie. Filtry zostały zapamiętane.', `<button class="btn obrys" type="button" data-ponow>${I('arrow-clockwise')}Spróbuj ponownie</button>`);
    else if (pusty)
      srodek = komunikat('magnifying-glass', 'Nic nie pasuje do tych filtrów', 'Zlecenia z branży Fotowoltaika w budżecie do 5 tys. zł akurat się nie pojawiły. Poluzuj budżet albo zostaw sam wybór branży.', `<a class="btn obrys" href="?stan=dane&motyw=${Pro.h.q.get('motyw') || ''}">Wyczyść filtry</a>`);
    else srodek = ZLECENIA.map(wierszZlecenia).join('') + `<div class="wiecej"><button class="btn obrys" type="button">Pokaż więcej</button><small class="num">8 z 31</small></div>`;
    const sel = (opts, i) => `<select class="rn-sel" aria-label="${opts.e}">${opts.l.map((t, k) => `<option${k === i ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    const mob = `<div class="rn-mob"><div class="filtry" data-przesuw role="toolbar" aria-label="Branża">${['Wszystkie', 'HVAC', 'Sanitarne', 'Elektryka', 'Fotowoltaika', 'Wykończenia', 'Chłodnictwo'].map((t) => `<button class="filtr" type="button" aria-pressed="${pusty ? t === 'Fotowoltaika' : t === 'Wszystkie'}">${t}</button>`).join('')}</div>
      <div class="rn-pasek">${sel({ e: 'Budżet', l: ['Budżet: dowolny', 'Budżet: do 5 tys. zł', 'Budżet: 5–20 tys. zł', 'Budżet: 20–60 tys. zł', 'Budżet: powyżej 60 tys.'] }, pusty ? 1 : 0)}${sel({ e: 'Poziom oferenta', l: ['Poziom: dowolny', 'Poziom: do L3', 'Poziom: L4 i wyżej'] }, 0)}</div></div>`;
    const akt = pusty
      ? `<div class="rn-aktywne"><span>Filtry:</span><span class="t">Fotowoltaika</span><span class="t">budżet do 5 tys. zł</span></div>`
      : '';
    document.body.innerHTML = `${gora()}<div class="rama">${nav('zlecenia')}
      <main class="kolumna" id="tresc">
        <div class="rn-gl"><div><h1>Zlecenia</h1><div class="meta-l">${pusty ? '0 z 31 zleceń' : STAN === 'blad' ? '' : '31 otwartych · najnowsze u góry'}</div></div><a class="btn glowny" href="#">${I('plus')}Dodaj zlecenie</a></div>
        ${mob}${akt}${srodek}
        <div class="rn-stopka">${stopka()}</div>
      </main>${filtrBok(aktywne)}</div>${dolny('zlecenia')}${stany(['pusty', 'ladowanie', 'blad'])}`;
  }

  // ═════════ /zlecenia/[id] — widok firmy porównującej oferty (Oferteo) ═════════
  const firma = P.hotel;
  const OFERTY = [
    { o: P.bartek, ile: '10 400', cena: 10400, dni: 8, ocena: '4,9', n: 37, nota: 'Zaczynam od jednostek z recepcji. Dojazd z Poznania wlicza się w cenę.', ost: 'Piekarnia Złoty Kłos · 3 dni temu', kiedy: 'dziś 09:30' },
    { o: P.ewa, cena: 11200, dni: 5, ocena: '4,9', n: 31, nota: 'Filtry i czynnik mam na magazynie w Sopocie — zaczynam od ręki, 3 pokoje dziennie rano.', ost: 'Hotel Pod Żaglem · 2 tyg. temu', kiedy: 'dziś 07:15', wyb: true },
    { o: P.kuba, cena: 9800, dni: 6, ocena: '4,8', n: 14, nota: 'Serwis po 2 pokoje dziennie, 8–12. Protokół do każdej jednostki.', ost: 'Biuro Rachunkowe Kalkulus · 3 tyg. temu', kiedy: 'wczoraj 18:42' },
    { o: F.pawel, cena: 8200, dni: 9, ocena: '5,0', n: 2, nota: 'Pierwsze zlecenia w Portalu, stąd niższa cena. Do 12 pokoi potrzebuję jednego pomocnika.', ost: 'Kamienica Pod Lipą · 5 tyg. temu', kiedy: 'wczoraj 21:10' },
  ];
  const minC = Math.min(...OFERTY.map((x) => x.cena)), minT = Math.min(...OFERTY.map((x) => x.dni));
  const dniW = (n) => `${n} ${n === 1 ? 'dzień' : 'dni'}`;
  function wierszOferty(x) {
    const poziom = `<span class="odz" style="--lv:var(--level-${x.o.lv})">${szczebelki(x.o.lv, 12)}${L[x.o.lv - 1].nazwa}</span>`;
    return `<tr class="of-w${x.wyb ? ' wyb' : ''}" data-oferta>
      <td class="sel"><label class="of-wyb" data-cel-ok><input type="radio" name="oferta" ${x.wyb ? 'checked' : ''} aria-label="Wybierz ofertę: ${x.o.n}"></label></td>
      <td class="kto"><div class="of-kto">${aw(x.o, 40)}<div style="min-width:0"><b>${x.o.n}</b><small>${x.o.miasto} · złożona ${x.kiedy}</small><span class="m-poz of-poz">${poziom}</span><p class="not" style="margin:6px 0 0">${x.nota}</p></div></div></td>
      <td class="poz of-poz">${poziom}<span class="pk">${fmt4(x.o.pkt)} pkt</span></td>
      <td data-e="Cena" class="of-c">${zl(x.cena)}${x.cena === minC ? '<span class="plus">najniższa</span>' : ''}</td>
      <td data-e="Termin" class="of-t">${dniW(x.dni)}${x.dni === minT ? '<span class="plus">najkrótszy</span>' : ''}</td>
      <td data-e="Oceny po zleceniach"><div class="of-ok">${gwiazdka}${x.ocena} <small>(${x.n})</small></div><span class="cap">ostatnia: ${x.ost}</span></td></tr>`;
  }
  function zlecenieStan() {
    const lista = ['pusty', 'ladowanie', 'blad'];
    const op = (t, fn) => `${gora(firma)}<div class="rama szeroka">${nav('zlecenia', firma)}<main class="kolumna" id="tresc">${t}</main></div>${dolny('zlecenia')}${stany(lista)}`;
    if (STAN === 'ladowanie')
      return op(`<div role="status" aria-busy="true" aria-label="Wczytywanie zlecenia" style="padding:14px 28px 28px">${sz('90px', 14, 'm')}<div style="display:grid;gap:14px;margin:18px 0 22px">${sz('62%', 34)}<div style="display:flex;gap:12px;align-items:center"><span class="sz kolo" style="width:40px;height:40px"></span>${sz('220px', 14)}</div></div>
        <div style="display:grid;gap:10px;padding-top:22px;border-top:1px solid var(--line)">${sz('92%', 14, 'm')}${sz('88%', 14, 'm')}${sz('70%', 14, 'm')}</div>
        <div style="margin-top:36px">${sz('120px', 22)}<div style="margin-top:16px">${Array.from({ length: 4 }, szWiersz).join('')}</div></div></div>`);
    if (STAN === 'blad') return op(`<div class="rn-det"><a class="rn-wstecz" href="zlecenia.html">${I('arrow-left')}Zlecenia</a>${bladEkranu('Nie udało się wczytać zlecenia')}</div>`);
    return null;
  }
  function zlecenie() {
    const stan = zlecenieStan();
    if (stan) { document.body.innerHTML = stan; return; }
    const pusty = STAN === 'pusty';
    const ofBlok = pusty
      ? `${komunikat('hourglass', 'Pierwsze oferty jeszcze nie przyszły', 'Zlecenie widzą Liderzy z branży Instalacje HVAC. Zbieranie trwa do 28.11 — dostaniesz powiadomienie przy każdej ofercie.', `<a class="btn glowny" href="#">${I('share-network')}Udostępnij zlecenie</a><a class="btn obrys" href="#">Edytuj zlecenie</a>`)}`
      : `<table class="of"><thead><tr><th style="width:44px"><span class="sr">Wybór</span></th><th>Oferent</th><th>Poziom w Drabince</th><th>Cena</th><th>Termin</th><th>Oceny po zleceniach</th></tr></thead><tbody>${OFERTY.map(wierszOferty).join('')}</tbody></table>
        <div class="of-pod"><div class="wyb" id="of-wyb"></div><button class="btn glowny" type="button">Wybierz wykonawcę</button></div>
        <p class="rn-nic">${I('seal-check')}<span>Po zakończeniu pracy ocenisz wykonawcę. <b>Dopiero ta ocena daje mu punkty — do +100.</b> Oferta ani wybór wykonawcy punktów nie dają.</span></p>`;
    document.body.innerHTML = `${gora(firma)}<div class="rama szeroka">${nav('zlecenia', firma)}
      <main class="kolumna" id="tresc"><div class="rn-det">
        <a class="rn-wstecz" href="zlecenia.html">${I('arrow-left')}Zlecenia</a>
        <div class="nad">Twoje zlecenie · Instalacje HVAC · dodane wczoraj, 16:40</div>
        <h1>Serwis klimatyzacji — 12 pokoi</h1>
        <div class="rn-firma">${aw(firma, 40)}<div><b>${firma.n}</b><small>${I('seal-check')}Firma zweryfikowana · 14 zleceń · średnia wystawianych ocen 4,8</small></div></div>
        <div class="rn-2"><div class="rn-opis">
          <p>Szukamy ekipy do serwisu klimatyzacji w 12 pokojach przed sezonem zimowym. Jednostki kasetonowe 2,5 kW, montaż 2019. Prace przy gościach — tylko w godzinach 8–12.</p>
          <h2>Zakres</h2><ul><li>${I('check')}Przegląd i czyszczenie każdej z 12 jednostek</li><li>${I('check')}Wymiana filtrów i pomiar ciśnień</li><li>${I('check')}Protokół z przeglądu dla każdego pokoju</li></ul></div>
          <dl class="rn-dl"><div><dt>Budżet</dt><dd>8–12 tys. zł</dd></div><div><dt>Wykonanie do</dt><dd>05.12</dd></div><div><dt>Miejsce</dt><dd>Sopot</dd></div><div><dt>Zbiera oferty do</dt><dd>28.11<small>zostały 3 dni</small></dd></div><div><dt>Poziom oferenta</dt><dd>bez wymagań</dd></div></dl></div>
        <section class="rn-oferty" aria-labelledby="of-h"><header><h2 id="of-h">Oferty${pusty ? '' : '<small>4 · od najnowszej</small>'}</h2>${pusty ? '' : `<select class="rn-sel" aria-label="Kolejność ofert"><option>Od najnowszej</option><option>Cena rosnąco</option><option>Termin rosnąco</option></select>`}</header>${ofBlok}</section>
        <div class="rn-stopka rn-st-szer">${stopka()}</div>
      </div></main></div>${dolny('zlecenia')}${stany(['pusty', 'ladowanie', 'blad'])}`;
    const wiersze = [...document.querySelectorAll('[data-oferta]')];
    const wypisz = () => {
      const r = wiersze.find((w) => w.querySelector('input').checked); const el = document.getElementById('of-wyb');
      if (!r || !el) return;
      const x = OFERTY[wiersze.indexOf(r)];
      el.innerHTML = `${aw(x.o, 36)}<span>Wybrana oferta: <b>${x.o.n}</b><br><span class="n">${zl(x.cena)}</span> · ${dniW(x.dni)}</span>`;
      wiersze.forEach((w) => w.classList.toggle('wyb', w === r));
    };
    wiersze.forEach((w) => w.addEventListener('click', () => { w.querySelector('input').checked = true; wypisz(); }));
    wypisz();
  }

  // ═════════ /uslugi ═════════
  const USLUGI = [
    { o: P.ewa, t: 'Przegląd i serwis klimatyzacji dla biur i hoteli', c: 480, oc: '4,9', n: 31, rodz: 'chlod', br: 'Instalacje HVAC', d: '24.11' },
    { o: P.marta, t: 'Instalacja fotowoltaiczna do 15 kWp pod klucz, z formalnościami', c: 38000, oc: '5,0', n: 18, rodz: 'pv', br: 'Fotowoltaika', d: '22.11' },
    { o: P.ola, t: 'Wymiana pionów i podejść wodnych w kamienicy', c: 6500, oc: '4,8', n: 11, rodz: 'san', br: 'Instalacje sanitarne', d: '21.11' },
    { o: P.bartek, t: 'Wentylacja z odzyskiem ciepła w lokalu usługowym', c: 18000, oc: '4,9', n: 37, rodz: 'hvac', br: 'Instalacje HVAC', d: '19.11' },
    { o: P.tomek, t: 'Pomiary elektryczne i protokół odbioru instalacji', c: 650, oc: '4,6', n: 6, rodz: 'el', br: 'Elektryka', d: '18.11' },
    { o: P.iga, t: 'Projekt i wykończenie lokalu usługowego z harmonogramem etapów', c: 2400, oc: '4,7', n: 22, rodz: 'wyk', br: 'Wykończenia', d: '15.11', za: '/m²' },
    { o: P.kuba, t: 'Pompa ciepła powietrze–woda: dobór i montaż', c: 24000, oc: '4,8', n: 14, rodz: 'hvac', br: 'Instalacje HVAC', d: '12.11' },
    { o: F.pawel, t: 'Jednorazowy przegląd klimatyzacji domowej (split)', c: 280, oc: '', n: 0, rodz: 'chlod', br: 'Chłodnictwo', d: '10.11' },
  ];
  const BRK = { hvac: 'wind', chlod: 'snowflake', pv: 'solar-panel', el: 'lightning', wyk: 'paint-roller', san: 'drop' };
  function kartaUslugi(u, i) {
    return `<a class="uk" href="usluga.html">${okl(u.rodz, i + 1)}
      <div class="ul">${aw(u.o, 28)}<b>${u.o.n}</b>${odz(u.o.lv)}</div>
      <div class="utyt">${u.t}</div>
      <div class="ud">${ocena(u.oc, u.n)}<span class="cena">od <b>${zl(u.c)}${u.za || ''}</b></span></div><div class="data">${u.br} · dodana ${u.d}</div></a>`;
  }
  const szKarta = () => `<div class="uk" aria-hidden="true"><div class="sz" style="aspect-ratio:16/9;border-radius:var(--radius)"></div><div style="display:flex;gap:8px;align-items:center;margin-top:12px"><span class="sz kolo" style="width:28px;height:28px"></span>${sz('46%', 12, 'm')}</div><div style="display:grid;gap:8px;margin-top:10px">${sz('96%', 15)}${sz('62%', 15)}</div><div style="margin-top:14px;display:flex;justify-content:space-between">${sz('60px', 14, 'm')}${sz('84px', 18)}</div></div>`;
  function uslugi() {
    const pusty = STAN === 'pusty';
    let srodek;
    if (STAN === 'ladowanie') srodek = `<div class="rn-siatka" role="status" aria-busy="true" aria-label="Wczytywanie usług">${Array.from({ length: 6 }, szKarta).join('')}</div>`;
    else if (STAN === 'blad')
      srodek = komunikat('cloud-slash', 'Nie udało się wczytać usług', 'To po naszej stronie. Filtry zostały zapamiętane.', `<button class="btn obrys" type="button" data-ponow>${I('arrow-clockwise')}Spróbuj ponownie</button>`);
    else if (pusty)
      srodek = komunikat('storefront', 'Brak usług w tej branży przy tych filtrach', 'Wśród Liderów od L4 nikt jeszcze nie zaproponował usługi w branży Fotowoltaika do 10 tys. zł. Poluzuj poziom albo cenę.', `<a class="btn obrys" href="?stan=dane&motyw=${Pro.h.q.get('motyw') || ''}">Wyczyść filtry</a>`);
    else srodek = `<div class="rn-siatka">${USLUGI.map(kartaUslugi).join('')}</div><div class="wiecej"><button class="btn obrys" type="button">Pokaż więcej</button><small class="num">8 z 41</small></div>`;
    const sel = (e, l, i = 0) => `<select class="rn-sel" aria-label="${e}">${l.map((t, k) => `<option${k === i ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
    document.body.innerHTML = `${gora()}<div class="rama szeroka">${nav('uslugi')}
      <main class="kolumna" id="tresc">
        <div class="rn-gl"><div><h1>Usługi</h1><div class="meta-l">${pusty ? '0 z 41 usług' : STAN === 'blad' ? '' : '41 usług · najnowsze u góry'}</div></div><a class="btn glowny" href="#">${I('plus')}Zaproponuj usługę</a></div>
        <div class="filtry" data-przesuw role="toolbar" aria-label="Branża">${['Wszystkie', 'HVAC', 'Sanitarne', 'Elektryka', 'Fotowoltaika', 'Wykończenia', 'Chłodnictwo'].map((t) => `<button class="filtr" type="button" aria-pressed="${pusty ? t === 'Fotowoltaika' : t === 'Wszystkie'}">${t}</button>`).join('')}</div>
        <div class="rn-pasek">${sel('Cena', ['Cena: dowolna', 'Cena: do 10 tys. zł', 'Cena: 10–50 tys. zł', 'Cena: powyżej 50 tys.'], pusty ? 1 : 0)}${sel('Poziom Lidera', ['Poziom Lidera: dowolny', 'Poziom: od L2', 'Poziom: od L3', 'Poziom: od L4'], pusty ? 3 : 0)}</div>
        ${srodek}
        <div class="rn-stopka">${stopka()}</div>
      </main></div>${dolny('uslugi')}${stany(['pusty', 'ladowanie', 'blad'])}`;
  }

  // ═════════ /uslugi/[slug] — pakiety i Lider z poziomem (Fiverr × Drabinka) ═════════
  const lid = P.ewa; // Ekspert (L4), 2 050 pkt: rynek 1 640 + społeczność 410; do Mentora (3 000) brakuje 950
  const PAKIETY = [
    { n: 'Podstawowy', c: 480, opis: 'Przegląd do 5 jednostek', dni: 3, wiz: '1 wizyta', cechy: ['Przegląd i czyszczenie filtrów', 'Pomiar ciśnień w układzie', 'Protokół dla każdej jednostki'] },
    { n: 'Standard', c: 1150, opis: 'Przegląd do 12 jednostek', dni: 5, wiz: '2 wizyty', cechy: ['Wszystko z pakietu Podstawowego', 'Czyszczenie wymienników i tac skroplin', 'Test szczelności układu', 'Wizyta kontrolna po 30 dniach'] },
    { n: 'Premium', c: 2400, opis: 'Przegląd do 30 jednostek', dni: 10, wiz: '4 wizyty', cechy: ['Wszystko z pakietu Standard', 'Umowa serwisowa na 12 miesięcy', 'Wizyty okresowe co kwartał', 'Reakcja na awarię w 24 godziny'] },
  ];
  const OCENY = [
    { f: ZAP.piekarnia, o: 5, t: 'Przegląd 6 jednostek w sobotę, bez zatrzymania wypieku. Protokoły podpisane od ręki.', kiedy: '3 dni temu', pkt: '+100 pkt' },
    { f: ZAP.zagiel, o: 5, t: 'Druga wizyta u nas. Zmieścili się w oknie 8–12, goście nic nie zauważyli.', kiedy: '2 tyg. temu', pkt: '+50 pkt', nota: 'waga ×0,5 — druga ocena od tej firmy w roku' },
    { f: ZAP.biuro, o: 4, t: 'Rzetelnie i z protokołem. Termin wyszedł o dzień dłuższy niż w ofercie.', kiedy: '3 tyg. temu', pkt: '+80 pkt' },
  ];
  const gw5 = (n) => `<span class="of-ok" style="display:inline-flex" aria-label="${n} na 5">${gwiazdka}${n}/5</span>`;
  function osSwiatla() {
    const E = [
      [ZAP.piekarnia, '+100', 'ocena 5/5 po zleceniu „Wentylacja zaplecza”', '', 'dojrzewa za 4 dni'],
      [ZAP.zagiel, '+100', 'ocena 5/5 po zleceniu „Serwis 18 jednostek”', '12.11'],
      [P.tomek, '+50', 'uznana odpowiedź „Jaki czynnik do starszych jednostek”', '09.11'],
      [ZAP.zagiel, '+50', 'druga ocena od tej firmy w roku, waga ×0,5', '02.11'],
    ];
    return `<ul class="os-sw">${E.map(([k, p, co, d, dz]) => `<li>${aw(k, 36)}<div class="co"><b>${k.n}</b> · ${co}<small>${dz ? `<span class="dojrzewa">${I('hourglass-medium')}${dz}</span>` : d}</small></div><span class="pkt">${p}</span></li>`).join('')}</ul>`;
  }
  function usluga() {
    const lista = ['pusty', 'ladowanie', 'blad'];
    const wrap = (t) => `${gora()}<div class="rama szeroka">${nav('uslugi')}<main class="kolumna" id="tresc">${t}</main></div>${dolny('uslugi')}${stany(lista)}`;
    if (STAN === 'ladowanie') {
      document.body.innerHTML = wrap(`<div class="rn-us" role="status" aria-busy="true" aria-label="Wczytywanie usługi"><div class="gl" style="padding-top:14px">${sz('90px', 14, 'm')}<div style="display:grid;gap:12px;margin:18px 0">${sz('80%', 32)}${sz('50%', 32)}</div><div style="display:flex;gap:12px;align-items:center">${'<span class="sz kolo" style="width:40px;height:40px"></span>'}${sz('200px', 14)}</div><div class="sz" style="aspect-ratio:16/9;margin-top:18px;border-radius:var(--radius)"></div></div>
        <div class="pak" style="margin-top:24px;padding:18px;display:grid;gap:14px">${sz('100%', 40)}${sz('40%', 30)}${sz('90%', 14, 'm')}${sz('84%', 14, 'm')}${sz('100%', 44)}</div><div class="tr">${[0, 1, 2].map(szWiersz).join('')}</div></div>`);
      return;
    }
    if (STAN === 'blad') {
      document.body.innerHTML = wrap(`<div class="rn-det"><a class="rn-wstecz" href="uslugi.html">${I('arrow-left')}Usługi</a>${bladEkranu('Nie udało się wczytać usługi')}</div>`);
      return;
    }
    const pusty = STAN === 'pusty';
    const pk = PAKIETY[1];
    const pakiet = (p, i) => `<div class="pp" role="tabpanel" id="pp${i}" aria-labelledby="pt${i}"${i === 1 ? '' : ' hidden'}>
      <div class="pc"><b>${zl(p.c)}</b><span>${p.opis}</span></div>
      <div class="meta-p"><div>Realizacja<b>${dniW(p.dni)} rob.</b></div><div>Wizyty<b>${p.wiz}</b></div></div>
      <ul>${p.cechy.map((c) => `<li>${I('check')}${c}</li>`).join('')}</ul>
      <button class="btn glowny" type="button">Zleć pakiet ${p.n} · ${zl(p.c)}</button>
      <p class="male">Lider potwierdzi zakres i termin, zanim cokolwiek zaczniecie. <a href="#">Potrzebujesz czegoś innego? Zaproponuj własne zlecenie</a></p></div>`;
    const ocenyBlok = pusty
      ? komunikat('chat-teardrop-text', 'Ta usługa nie ma jeszcze ocen', 'Pierwsza ocena pojawi się po zrealizowanym zleceniu — dopiero wtedy Lider dostaje za nie punkty. Oceny Lidera z innych zleceń widać obok.', '')
      : `${OCENY.map((x) => `<article class="rn-ocena">${aw(x.f, 40)}<div><div class="g"><b>${x.f.n}</b>${gw5(x.o)}<span>· ${x.kiedy}</span></div><p>${x.t}</p><span class="pk">${x.pkt} <small>dla Lidera${x.nota ? ` · ${x.nota}` : ''}</small></span></div></article>`).join('')}
        <div class="rn-wiecej"><button class="btn obrys" type="button">Pokaż więcej</button><small>3 z 31</small></div>`;
    document.body.innerHTML = wrap(`<div class="rn-us">
      <div class="gl"><a class="rn-wstecz" href="uslugi.html">${I('arrow-left')}Usługi</a>
        <div class="nad" style="margin-top:10px;font-size:13px;color:var(--text-muted)">Instalacje HVAC · dodana 24.11</div>
        <h1>Przegląd i serwis klimatyzacji dla biur i hoteli</h1>
        <div class="rn-lw">${aw(lid, 36)}<b>${lid.n}</b>${odz(lid.lv)}<span class="sep">·</span>${pusty ? '<span class="oc bez">Usługa bez ocen</span>' : ocena('4,9', 31).replace('class="oc"', 'class="oc"')}</div>
        <div class="rn-ok">${okl('chlod', 1)}</div></div>
      <aside class="pak" aria-label="Pakiety usługi"><div role="tablist" aria-label="Pakiet">${PAKIETY.map((p, i) => `<button role="tab" type="button" id="pt${i}" aria-controls="pp${i}" aria-selected="${i === 1}">${p.n}</button>`).join('')}</div>${PAKIETY.map(pakiet).join('')}</aside>
      <div class="tr">
        <section class="rn-sek"><h2>O usłudze</h2><p>Przeglądy klimatyzacji kasetonowej i ściennej w hotelach, biurach i lokalach usługowych. Pracuję w godzinach, które nie przeszkadzają gościom i pracownikom, a każdą jednostkę zamykam protokołem.</p><p>Czynnik, filtry i części eksploatacyjne mam na stanie w Sopocie, więc zwykle zaczynam w ciągu kilku dni od potwierdzenia zakresu.</p></section>
        <section class="rn-sek"><h2>O Liderze</h2><div class="rn-lider">
          <div class="gl-l">${aw(lid, 88, true)}<div><b>${lid.n}</b><small>${lid.branza} · ${lid.miasto}</small>${odz(lid.lv, true)}</div></div>
          <div class="rn-sc"><div><div class="w"><span>Rynek: oceny po zleceniach</span><b>1\u00a0640 <span class="dojrzewa">+100</span></b></div>${miernik(1640, 3000, `var(--level-${lid.lv})`, 100, 600)}</div>
            <div><div class="w"><span>Społeczność: uznane odpowiedzi</span><b>410</b></div>${miernik(410, 3000, `var(--level-${lid.lv})`, 0, 600)}</div></div>
          <ul class="rn-wym" aria-label="Wymagania do poziomu Mentor"><li class="ok">${I('check-circle')}Rynek: min. 600 pkt<small>1 640</small></li><li>${I('circle')}Społeczność: min. 600 pkt<small>brakuje 190</small></li><li>${I('circle')}Razem 3 000 pkt<small>brakuje 950</small></li></ul>
          <p class="rn-pod">Kreska na pasku to 600 pkt: <b>20% progu „Mentor”</b>. Punkty daje wyłącznie druga osoba — ocena po zleceniu albo uznana odpowiedź. <a href="profil.html" style="display:inline-flex;align-items:center;min-height:44px;margin:-12px 0;font-weight:600;color:var(--text-strong);text-decoration:underline;text-underline-offset:3px">Cały profil</a></p></div></section>
        <section class="rn-sek"><h2>Ostatnie światło</h2>${osSwiatla()}</section>
        <section class="rn-sek"><h2>Oceny po zleceniach<small>${pusty ? 'jeszcze bez ocen' : '4,9 · 31 ocen'}</small></h2>${ocenyBlok}</section>
        <div class="rn-stopka rn-st-szer">${stopka()}</div>
      </div></div>`);
    const tabs = [...document.querySelectorAll('[role=tab]')];
    tabs.forEach((t, i) => t.addEventListener('click', () => {
      tabs.forEach((x, k) => { x.setAttribute('aria-selected', k === i); document.getElementById('pp' + k).hidden = k !== i; });
    }));
  }

  Object.assign(window.Pro, { zlecenia, zlecenie, uslugi, usluga });
})();
