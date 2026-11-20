// Rama „Portal Liderów” V17 (makiety tożsamości P0', 20.11.2026): nawigacja, odznaka poziomu, wiersz strumienia, oś światła, szczeble.
// Dane: fixtura-portal.js (fikcja; szczeble parsowane z apps/api/src/modules/ladder/rules.ts). Parametry: ?motyw=dark|light, ?stan=pusty|ladowanie|blad.
// Strony wołają Portal.feed() / Portal.profil() / Portal.drabinka(). Bez zależności.
(() => {
  const q = new URLSearchParams(location.search);
  const H = document.documentElement;
  H.dataset.theme = q.get('motyw') === 'light' ? 'light' : 'dark';
  const STAN = q.get('stan') || '';
  const F = window.FIX;
  const L = F.poziomy;
  const I = (n) => `<i class="ph-duotone ph-${n}" aria-hidden="true"></i>`;
  const pl = (n, a) => {
    const m = n % 10;
    const d = n % 100;
    return n === 1 ? a[0] : m >= 2 && m <= 4 && !(d >= 12 && d <= 14) ? a[1] : a[2];
  };
  const ini = (n) =>
    n
      .split(/\s+/)
      .filter((w) => /^[A-ZĄĆĘŁŃÓŚŹŻ]/.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join('');
  const dec = (x) => x.toFixed(1).replace('.', ',');
  // poziom znanych osób z fikstury (źródło światła ma własne światło)
  const LV = { 'Iga Sosna': 4, 'Marta Jodła': 6, 'Bartek Lis': 5, 'Ola Wrzos': 3, 'Tomek Brzoza': 2 };

  const odz = (n, duza) =>
    n
      ? `<span class="odz${duza ? ' duza' : ''}" data-lv="${n}"><b>${n}</b>${L[n - 1].nazwa}</span>`
      : `<span class="odz${duza ? ' duza' : ''}" data-lv="0">Nowy w Portalu</span>`;
  const aw = (nazwa, lv, kl = '') =>
    lv === 'firma'
      ? `<span class="aw firma ${kl}" aria-hidden="true">${I('buildings')}</span>`
      : `<span class="aw ${kl}" data-lv="${lv || 0}" aria-hidden="true">${ini(nazwa)}</span>`;

  // ── Drabinka: następny krok, dwa paski ścieżek, oś światła ──
  const razem = (p) => p.rynek + p.spolecznosc;
  function krok(p) {
    const N = L[p.poziom];
    if (!N) return 'Najwyższy szczebel. Drabinka nie ma już nic nad Architektem Zespołów.';
    if (!p.poziom && !razem(p))
      return 'Pierwsze światło daje ktoś inny: ocena po zleceniu albo uznana odpowiedź. Nie ma drogi na skróty — punktu nie dasz sobie sam.';
    const min = Math.round((N.minProc / 100) * N.prog);
    const dS = Math.max(0, min - p.spolecznosc);
    const dR = Math.max(0, min - p.rynek);
    const czesci = [];
    if (N.minProc && dS) {
      const k = Math.ceil(dS / F.reguly.odpowiedzUznana);
      czesci.push(`Społeczność: brakuje ${dS} pkt do progu ścieżki — to ${k} ${pl(k, ['uznana odpowiedź', 'uznane odpowiedzi', 'uznanych odpowiedzi'])}.`);
    }
    if (N.minProc && dR) {
      const k = Math.ceil(dR / F.reguly.oceny[5]);
      czesci.push(`Rynek: brakuje ${dR} pkt — ${k} ${pl(k, ['ocena 5/5', 'oceny 5/5', 'ocen 5/5'])} po zleceniach.`);
    }
    czesci.push(`Łącznie do „${N.nazwa}”: ${Math.max(0, N.prog - razem(p))} pkt.`);
    return czesci.join(' ');
  }
  function sciezki(p) {
    const t = L.find((l) => l.n > p.poziom && l.minProc > 0);
    if (!t) return '';
    const min = Math.round((t.minProc / 100) * t.prog);
    const sk = Math.max(min * 2, (p.rynek + p.oczekujace.rynek) * 1.1, (p.spolecznosc + p.oczekujace.spolecznosc) * 1.1);
    const bar = (nazwa, v, cz, kol) => {
      const brak = Math.max(0, min - v);
      return `<div class="sciezka" style="--c:${kol}"><div class="nag"><span>${nazwa}</span><b>${v} pkt</b></div>
        <div class="pasek" role="img" aria-label="${nazwa}: ${v} pkt, próg ścieżki ${min} pkt"><span class="w" style="width:${(v / sk) * 100}%"></span>${
          cz ? `<span class="w cz" style="left:${(v / sk) * 100}%;width:${(cz / sk) * 100}%"></span>` : ''
        }<span class="prog" style="left:${(min / sk) * 100}%"></span></div>
        <div class="opis">${brak ? `brakuje ${brak} pkt do progu` : 'próg ścieżki spełniony'}${cz ? ` · +${cz} dojrzewa` : ''}</div></div>`;
    };
    return `<p class="mut">Od szczebla ${t.n} („${t.nazwa}”) każda ścieżka musi wnieść min. ${t.minProc}% progu — ${min} pkt. Kreska na pasku to ten próg.</p>
      ${bar('Rynek — oceny po zleceniach', p.rynek, p.oczekujace.rynek, 'var(--sc-rynek)')}
      ${bar('Społeczność — uznane odpowiedzi', p.spolecznosc, p.oczekujace.spolecznosc, 'var(--sc-spol)')}`;
  }
  function mini(p) {
    return `<div class="mini-lad" role="img" aria-label="Szczebel ${p.poziom} z 7">${L.map(
      (l) => `<i class="${l.n <= p.poziom ? 'on' : ''} ${l.n === p.poziom ? 'tu' : ''}" style="--c:var(--level-${l.n})"></i>`,
    ).join('')}</div>`;
  }
  function skrot(p) {
    const N = L[p.poziom];
    return `<section class="karta" aria-label="Twoja Drabinka"><div class="glowa"><h2>Twoja Drabinka</h2>${odz(p.poziom)}</div>
      <div class="liczba">${razem(p)} <span class="mut">pkt</span></div>
      ${N ? `<p class="mut">${razem(p)} z ${N.prog} do szczebla „${N.nazwa}”</p>` : ''}${mini(p)}
      <div class="krok"><b>Następny krok</b>${krok(p)}</div>
      <a class="lnk" href="drabinka.html">Pełna Drabinka ${I('arrow-right')}</a></section>`;
  }
  const pusteSwiatlo = `<div class="pusty">${I('sparkle')}<h2>Nikt jeszcze nie dał światła</h2><p>Pierwsze przyjdzie od firmy albo innego Lidera — nie od ciebie samego. Tak działa Drabinka.</p></div>`;
  const os = (a) =>
    a.length
      ? `<ul class="os">${a
          .map((s) => {
            const cz = s.status === 'dojrzewa';
            return `<li>${aw(s.kto, s.typ === 'firma' ? 'firma' : LV[s.kto] || 1)}<div class="tr"><b>${s.kto}</b>${
              cz ? `<span class="znacznik cz">dojrzewa za ${s.dni} ${pl(s.dni, ['dzień', 'dni', 'dni'])}</span>` : ''
            }<div class="zc">${s.zaco}</div><div class="zc">${s.kiedy} · ${s.sciezka === 'rynek' ? 'rynek' : 'społeczność'}</div></div><div class="pk${cz ? ' cz' : ''}">+${s.pkt}<small>pkt</small></div></li>`;
          })
          .join('')}</ul>`
      : pusteSwiatlo;

  // ── Szkielety i błąd ──
  const sk = (n) =>
    Array.from({ length: n }, () => `<div class="szkielet" aria-hidden="true"><span class="k o"></span><div class="l"><span class="k w" style="width:42%"></span><span class="k w" style="width:92%"></span><span class="k w" style="width:70%"></span><span class="k" style="height:52px"></span></div></div>`).join('');
  const blad = (co) => `<div class="blad" role="alert">${I('warning-circle')}<span>${co}</span><button class="btn btn-glowny" onclick="location.reload()">Spróbuj ponownie</button></div>`;

  // ── Rama: nawigacja, pasek górny/dolny, stopka „Ekosystem” ──
  const NAV = [
    ['feed', 'Strumień', 'rows', 'feed.html'],
    ['uslugi', 'Usługi', 'storefront', '#'],
    ['zlecenia', 'Zlecenia', 'clipboard-text', '#'],
    ['pytania', 'Pytania', 'question', '#'],
    ['liderzy', 'Liderzy', 'users-three', 'profil.html'],
    ['drabinka', 'Drabinka', 'stairs', 'drabinka.html'],
    ['powiadomienia', 'Powiadomienia', 'bell', '#'],
  ];
  // Etykiety dosłownie z apps/web/lib/ecosystem.ts (bez „Sieć Liderów” — to ta właściwość).
  const EKO = [
    ['LOT App', 'https://app.leadersofteams.com'],
    ['O firmie', 'https://leadersofteam.pl'],
    ['International / EN', 'https://leadersofteams.com'],
  ];
  const eko = (kl) => `<footer class="eko ${kl}"><b>Ekosystem</b>${EKO.map(([e, h]) => `<a href="${h}">${e}</a>`).join('')}</footer>`;
  const marka = `<svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><circle cx="7" cy="21" r="4" style="fill:var(--level-2)"/><circle cx="14" cy="14" r="4.5" style="fill:var(--level-4)"/><circle cx="21" cy="7" r="5" style="fill:var(--level-6)"/></svg>`;

  function zloz({ ekran, aktywny, ja, srodek, prawa, zawsze, tytul }) {
    document.title = tytul + ' — Portal Liderów (makieta V17 P0′)';
    document.body.dataset.ekran = ekran;
    const nav = NAV.map(([k, e, ik, h]) => `<a class="poz" href="${h}"${k === aktywny ? ' aria-current="page"' : ''} aria-label="${e}">${I(ik)}<span>${e}</span></a>`).join('');
    const dol = (k, e, ik, h, kl = '') => `<a href="${h}" class="${kl}"${k === aktywny ? ' aria-current="page"' : ''}>${I(ik)}<span>${e}</span></a>`;
    const stanBtn = (s, e) => `<button data-s="${s}" aria-pressed="${STAN === s}">${e}</button>`;
    document.body.innerHTML = `
      <header class="gora">${marka}<span>Portal Liderów</span><span class="sp"></span>${odz(ja.poziom)}</header>
      <div class="portal">
        <nav class="nawig" aria-label="Nawigacja główna"><a class="marka" href="feed.html" aria-label="Portal Liderów">${marka}<span>Portal Liderów</span></a>${nav}
          <a class="ja" href="drabinka.html" aria-label="Twoje konto: ${ja.imie} ${ja.nazwisko}">${aw(ja.imie + ' ' + ja.nazwisko, ja.poziom)}<span class="kto"><b>${ja.imie} ${ja.nazwisko}</b>${odz(ja.poziom)}</span></a></nav>
        <main class="srodek${zawsze ? ' z-prawa' : ''}">${srodek}</main>
        <aside class="prawa${zawsze ? ' zawsze' : ''}" aria-label="Kontekst">${prawa}${eko('tylko-pulpit')}</aside>
      </div>
      ${eko('tylko-tel')}
      <nav class="dolny" aria-label="Nawigacja dolna">${dol('feed', 'Feed', 'rows', 'feed.html')}${dol('uslugi', 'Usługi', 'storefront', '#')}${dol('dodaj', 'Dodaj', 'plus', '#', 'tworz')}${dol('powiadomienia', 'Powiadomienia', 'bell', '#')}${dol('panel', 'Panel', 'squares-four', '#')}</nav>
      <div class="przel stany" role="group" aria-label="Stan makiety">${stanBtn('', 'Dane')}${stanBtn('pusty', 'Pusty')}${stanBtn('ladowanie', 'Ładowanie')}${stanBtn('blad', 'Błąd')}<button class="motyw" aria-label="Przełącz motyw">${I('moon-stars')}</button></div>`;
    document.querySelectorAll('.stany [data-s]').forEach((b) =>
      b.addEventListener('click', () => {
        const u = new URL(location.href);
        b.dataset.s ? u.searchParams.set('stan', b.dataset.s) : u.searchParams.delete('stan');
        location.href = u;
      }),
    );
    document.querySelector('.motyw').addEventListener('click', () => {
      H.dataset.theme = H.dataset.theme === 'dark' ? 'light' : 'dark';
    });
  }

  // ───────── /feed ─────────
  const TYP = { zlecenie: ['clipboard-text', 'Zlecenie'], pytanie: ['question', 'Pytanie'], realizacja: ['check-circle', 'Realizacja'], usluga: ['storefront', 'Nowa usługa'] };
  const wiersz = (w) => {
    const a = w.autor;
    const f = a.rodzaj === 'firma';
    const [ik, et] = TYP[w.typ];
    return `<article class="wz" data-typ="${w.typ}">${aw(a.nazwa, f ? 'firma' : a.poziom)}<div class="tr"><div class="gl"><a class="kto" href="profil.html">${a.nazwa}</a>${
      f ? '<span class="znacznik">Firma</span>' : odz(a.poziom)
    }<span class="mut">${a.branza} · ${w.kiedy}</span><span class="typ">${I(ik)}${et}</span></div>
      <p class="tekst">${w.tekst}</p><a class="embed" href="#"><b>${w.embed.tytul}</b><span>${w.embed.meta}</span></a></div></article>`;
  };
  function feed() {
    const ja = STAN === 'pusty' ? F.jaPusty : F.ja;
    let strumien;
    if (STAN === 'ladowanie') strumien = sk(5);
    else if (STAN === 'blad') strumien = blad('Nie udało się wczytać strumienia. Sprawdź połączenie i spróbuj jeszcze raz.');
    else if (STAN === 'pusty')
      strumien = `<div class="pusty">${I('rows')}<h2>Strumień czeka na pierwsze wpisy</h2><p>Tu pojawią się zlecenia firm, pytania Liderów i ich realizacje — w kolejności, w jakiej powstały. Zacznij od opisu, czego potrzebujesz, albo od pytania.</p><a class="lnk" href="profil.html">Zobacz katalog Liderów ${I('arrow-right')}</a></div>`;
    else
      strumien = `${F.feed.map(wiersz).join('')}<div class="wiecej"><button class="btn btn-drugi">Pokaż więcej</button><span class="mut">${F.feed.length} z ${F.feedRazem}</span></div>`;
    const filtry = ['Wszystko', 'Zlecenia', 'Pytania', 'Realizacje', 'Usługi'];
    const klucz = [null, 'zlecenie', 'pytanie', 'realizacja', 'usluga'];
    zloz({
      ekran: 'feed',
      aktywny: 'feed',
      ja,
      tytul: 'Strumień',
      srodek: `<div class="naglowek-ekranu"><h1>Strumień</h1></div>
        <div class="tylko-tel karta">${skrot(ja).replace('<section class="karta"', '<section')}</div>
        <div class="kompozytor">${aw(ja.imie + ' ' + ja.nazwisko, ja.poziom)}<div class="pole"><label for="kp" class="mut" style="position:absolute;left:-9999px">Nowy wpis</label>
          <textarea id="kp" rows="2" placeholder="Opisz, czego potrzebujesz, albo zapytaj o radę…"></textarea>
          <div class="rzad"><button class="ik" aria-label="Dodaj zdjęcie">${I('image')}</button><button class="ik" aria-label="Zmień wpis na zlecenie">${I('clipboard-text')}</button><button class="ik" aria-label="Zmień wpis na pytanie">${I('question')}</button><span class="sp"></span><button class="btn btn-glowny">Opublikuj</button></div></div></div>
        <div class="filtry" data-przesuw role="group" aria-label="Filtr strumienia">${filtry.map((e, i) => `<button class="pig" data-k="${klucz[i] || ''}" aria-pressed="${i === 0}">${e}</button>`).join('')}</div>
        <div id="strumien">${strumien}</div>`,
      prawa: `${skrot(ja)}<section class="karta" aria-label="Tematy"><h2>Tematy</h2><div style="display:flex;flex-wrap:wrap;gap:8px">${F.tematy.map((t) => `<a class="etykieta" href="#">${t}</a>`).join('')}</div></section>`,
    });
    document.querySelectorAll('.filtry .pig').forEach((b) =>
      b.addEventListener('click', () => {
        document.querySelectorAll('.filtry .pig').forEach((x) => x.setAttribute('aria-pressed', x === b));
        document.querySelectorAll('#strumien .wz').forEach((w) => (w.hidden = !!b.dataset.k && w.dataset.typ !== b.dataset.k));
      }),
    );
  }

  // ───────── /profil/[handle] ─────────
  const kartaReal = (r) => `<a class="real" href="#"><span class="mn">${I(r.ikona)}</span><b>${r.tytul}</b><span>${r.firma}</span><span><span class="oc">${dec(r.ocena)}</span> · ${r.kiedy}</span></a>`;
  const kartaUsl = (u, p) => `<a class="usl" href="#" style="--lv:var(--level-${p.poziom || 0})"><span class="mn">${I(u.ikona)}</span><div class="tl"><b>${u.tytul}</b>
      <div class="mut" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">${aw(p.imie + ' ' + p.nazwisko, p.poziom, 'maly')}${p.imie} ${p.nazwisko} ${odz(p.poziom)}</div>
      <div class="st"><span>${dec(u.ocenaSr)} (${u.ocen})</span><span>od <strong>${u.od}</strong></span></div></div></a>`;
  const pusteBlok = (ik, h, t) => `<div class="pusty">${I(ik)}<h2>${h}</h2><p>${t}</p></div>`;
  function panele(p) {
    const wszystkie = (n) => `<button class="lnk" data-tab="${n}" style="background:none;border:0;cursor:pointer;font:inherit;font-weight:600">Wszystkie ${I('arrow-right')}</button>`;
    const przeglad = `<div class="sekcja"><div class="glowa"><h2>Przypięte realizacje</h2>${p.realizacje.length ? wszystkie('realizacje') : ''}</div>${
      p.realizacje.length ? `<div class="przyp">${p.realizacje.map(kartaReal).join('')}</div>` : pusteBlok('push-pin', 'Brak przypiętych realizacji', 'Pierwsza pojawi się po zleceniu ocenionym przez firmę. Portal nie pokazuje tu niczego, czego nie było.')
    }</div>
      <div class="sekcja"><div class="glowa"><h2>Usługi</h2></div>${p.uslugi.length ? `<div class="uslugi">${p.uslugi.map((u) => kartaUsl(u, p)).join('')}</div>` : pusteBlok('storefront', 'Brak usług', 'Usługa z ceną „od” pozwala firmom zamówić pracę bez pisania zlecenia.')}</div>`;
    const real = `<div class="sekcja">${p.realizacje.length ? `<div class="przyp">${p.realizacje.map(kartaReal).join('')}</div><div class="wiecej"><button class="btn btn-drugi">Pokaż więcej</button><span class="mut">${p.realizacje.length} z ${p.zlecen}</span></div>` : pusteBlok('check-circle', 'Brak zrealizowanych zleceń', 'Realizacje trafiają tu po zakończeniu zlecenia i ocenie firmy.')}</div>`;
    const odp = `<div class="sekcja">${p.odpowiedzi.length ? p.odpowiedzi.map((o) => `<a class="wiersz-lista" href="#"><div class="tr"><b>${o.tytul}</b><span class="mut">${o.temat} · ${o.kiedy}</span></div>${o.uznana ? `<span class="znacznik" style="color:var(--ok);border-color:var(--ok)">Uznana</span>` : ''}</a>`).join('') : pusteBlok('chats-circle', 'Brak odpowiedzi', 'Uznana odpowiedź w Q&A daje 50 pkt na ścieżce społeczności.')}</div>`;
    const oc = `<div class="sekcja">${p.oceny.length ? `<ul class="os">${p.oceny.map((o) => `<li>${aw(o.kto, 'firma')}<div class="tr"><b>${o.kto}</b><div class="zc">${o.tekst}</div><div class="zc">${o.kiedy}</div></div><div class="pk">${o.ocena}/5</div></li>`).join('')}</ul><div class="wiecej"><button class="btn btn-drugi">Pokaż więcej</button><span class="mut">${p.oceny.length} z ${p.ocen}</span></div>` : pusteBlok('star', 'Nowy w Portalu', 'Brak ocen — nie pokazujemy pustych gwiazdek. Pierwsza ocena pojawi się po zrealizowanym zleceniu.')}</div>`;
    return { przeglad, realizacje: real, odpowiedzi: odp, oceny: oc };
  }
  function profil() {
    const ja = F.ja;
    const p = STAN === 'pusty' ? F.profilPusty : F.profil;
    const nazwisko = `${p.imie} ${p.nazwisko}`;
    let tresc;
    if (STAN === 'ladowanie') tresc = sk(4);
    else if (STAN === 'blad') tresc = blad('Nie udało się wczytać profilu. Spróbuj jeszcze raz.');
    else {
      const t = panele(p);
      tresc = `<div id="pane">${t.przeglad}</div>`;
      profil.t = t;
    }
    const lv = p.poziom;
    zloz({
      ekran: 'profil',
      aktywny: 'liderzy',
      ja,
      tytul: nazwisko,
      zawsze: true,
      srodek: `<div class="okladka" style="--lv:var(--level-${lv})"></div>
        <div class="profil-g">${aw(nazwisko, lv, 'duzy')}
          <div class="rzad"><h1>${nazwisko}</h1>${odz(lv, true)}</div>
          <p class="mut" style="margin-top:6px">${p.branza} · ${p.miasto} · w Portalu od ${p.odKiedy}</p>
          ${p.opis ? `<p class="opis">${p.opis}</p>` : ''}
          <div class="liczby"><div><span class="liczba">${p.ocenaSr ? dec(p.ocenaSr) : '—'}</span><small>${p.ocen ? `ocena (${p.ocen} ocen)` : 'brak ocen'}</small></div><div><span class="liczba">${p.zlecen}</span><small>zrealizowane zlecenia</small></div><div><span class="liczba">${p.uznaneOdp}</span><small>uznane odpowiedzi</small></div></div>
          <div class="rzad"><a class="btn btn-glowny" href="#">Zaproponuj zlecenie</a></div></div>
        <div class="zakladki" role="tablist" data-przesuw style="gap:0">${[['przeglad', 'Przegląd'], ['realizacje', 'Realizacje'], ['odpowiedzi', 'Odpowiedzi'], ['oceny', 'Oceny']].map(([k, e], i) => `<button role="tab" data-tab="${k}" aria-selected="${i === 0}">${e}</button>`).join('')}</div>
        ${tresc}`,
      prawa: `<section class="karta" aria-label="Drabinka ${p.imie}"><div class="glowa"><h2>Drabinka</h2>${odz(lv)}</div><div class="liczba">${razem(p)} <span class="mut">pkt</span></div>${L[lv] ? `<p class="mut">${razem(p)} z ${L[lv].prog} do szczebla „${L[lv].nazwa}”</p>` : ''}${mini(p)}${sciezki(p)}
          ${lv >= 5 ? `<p class="mut" style="margin-top:10px">${I('app-window')} Szczebel 5 daje dostęp do LOT App.</p>` : ''}</section>
        <section class="karta" aria-label="Kto dał światło"><h2>Kto dał światło</h2>${os(p.swiatlo)}</section>`,
    });
    if (profil.t) {
      const pane = document.getElementById('pane');
      const wybierz = (k) => {
        document.querySelectorAll('.zakladki [role=tab]').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === k));
        pane.innerHTML = profil.t[k];
        pane.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => wybierz(b.dataset.tab)));
      };
      document.querySelectorAll('.zakladki [role=tab]').forEach((b) => b.addEventListener('click', () => wybierz(b.dataset.tab)));
      wybierz(new URLSearchParams(location.search).get('zakladka') || 'przeglad');
    }
  }

  // ───────── /drabinka ─────────
  function scena(p) {
    const pt = L.map((l, i) => [24 + i * 25, 148 - i * 20, l.n]);
    const linia = pt.map(([x, y]) => `${x},${y}`).join(' ');
    return `<svg viewBox="0 0 200 170" role="img" aria-label="Siedem świateł szczebli, ${p.poziom} zapalone"><polyline points="${linia}" fill="none" style="stroke:var(--border-strong)" stroke-width="2" stroke-dasharray="3 5"/>${pt
      .map(([x, y, n]) => {
        const on = n <= p.poziom || n === 7;
        const r = n === 7 ? 10 : 7;
        return `<circle cx="${x}" cy="${y}" r="${r + 7}" style="fill:var(--level-${n})" opacity="${on ? 0.2 : 0.06}"/><circle cx="${x}" cy="${y}" r="${r}" style="fill:var(--level-${n})" opacity="${on ? 1 : 0.4}"/>${n === p.poziom ? `<circle cx="${x}" cy="${y}" r="${r + 4}" fill="none" style="stroke:var(--strong)" stroke-width="2"/>` : ''}`;
      })
      .join('')}</svg>`;
  }
  const NIE = [
    ['user-plus', 'Zaproszenia i polecenia znajomych'],
    ['rocket-launch', 'Rejestracja i onboarding'],
    ['sign-in', 'Logowanie i dni aktywności'],
    ['chat-circle-text', 'Wpisy, komentarze i reakcje'],
    ['eye', 'Wyświetlenia i obserwowanie'],
    ['magnifying-glass', 'Wyszukiwanie'],
  ];
  function szczebel(l, p) {
    const min = Math.round((l.minProc / 100) * l.prog);
    const r = razem(p);
    const wym = [[r >= l.prog, `Łącznie ${l.prog} pkt`, r >= l.prog ? '' : `masz ${r}`]];
    if (l.minProc) {
      wym.push([p.rynek >= min, `Min. ${min} pkt z rynku (${l.minProc}% progu)`, p.rynek >= min ? '' : `masz ${p.rynek}`]);
      wym.push([p.spolecznosc >= min, `Min. ${min} pkt ze społeczności (${l.minProc}% progu)`, p.spolecznosc >= min ? '' : `masz ${p.spolecznosc}`]);
    }
    const odbl = l.zespol
      ? `<div class="odbl">${I('users-three')}Możesz założyć własny zespół</div>`
      : l.n === 5
        ? `<div class="odbl">${I('app-window')}Dostęp do LOT App</div>`
        : `<div class="odbl brak">${I('seal')}Nowa odznaka i nazwa — bez nowych uprawnień</div>`;
    const stat = l.n < p.poziom ? 'Zdobyty' : l.n === p.poziom ? 'Tu jesteś' : l.n === p.poziom + 1 ? 'Następny' : 'Dalej';
    return `<article class="szczebel${l.n <= p.poziom ? ' zdobyty' : ''}${l.n === p.poziom ? ' tu' : ''}${l.n === 7 ? ' l7' : ''}" data-lv="${l.n}"><span class="nr">${l.n}</span><div>
      <div class="gl"><h3>${l.nazwa}</h3><span class="prog">${l.prog.toLocaleString('pl-PL')} pkt</span><span class="stat">${stat}</span></div>${odbl}
      <ul class="wym">${wym.map(([ok, e, d]) => `<li class="${ok ? 'ok' : 'brak'}">${I(ok ? 'check-circle' : 'circle-dashed')}<span>${e}${d ? ` <small>— ${d}</small>` : ''}</span></li>`).join('')}</ul></div></article>`;
  }
  function drabinka() {
    const p = STAN === 'pusty' ? F.jaPusty : F.ja;
    const N = L[p.poziom];
    const R = F.reguly;
    let tresc;
    if (STAN === 'ladowanie') tresc = sk(4);
    else if (STAN === 'blad') tresc = blad('Nie udało się wczytać Drabinki. Spróbuj jeszcze raz.');
    else
      tresc = `<div class="sekcja"><div class="glowa"><h2>Dwie ścieżki</h2></div>${sciezki(p)}</div>
        <div class="sekcja"><div class="glowa"><h2>Kto dał ci światło</h2></div>${os(p.swiatlo)}</div>
        <div class="sekcja" style="padding-bottom:4px"><div class="glowa"><h2>Siedem szczebli</h2></div></div>
        ${L.map((l) => szczebel(l, p)).join('')}
        <div class="sekcja" style="border-bottom:0"><div class="glowa"><h2>Czego Drabinka nie liczy</h2></div><ul class="nieliczy">${NIE.map(([ik, e]) => `<li>${I(ik)}${e}<b>0 pkt</b></li>`).join('')}</ul></div>`;
    const dojrz = p.swiatlo.filter((s) => s.status === 'dojrzewa');
    const sumaDojrz = dojrz.reduce((a, s) => a + s.pkt, 0);
    zloz({
      ekran: 'drabinka',
      aktywny: 'drabinka',
      ja: p,
      tytul: 'Drabinka Lidera',
      zawsze: true,
      srodek: `<div class="hero-lad"><div class="nad"><div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">${odz(p.poziom, true)}<span class="mut">${razem(p)} pkt${N ? ` · do „${N.nazwa}” brakuje ${Math.max(0, N.prog - razem(p))}` : ''}</span></div>
          <h1>Drabinka Lidera</h1>
          <p class="lead">Siedem szczebli. Punkt przyznaje ci wyłącznie drugi człowiek — za zrealizowane zlecenie albo uznaną odpowiedź. Twój punkt nigdy nie świeci sam.</p>
          <a class="btn btn-glowny" href="#">${p.poziom ? 'Odpowiadaj na pytania' : 'Znajdź pierwsze zlecenie'}</a></div>${scena(p)}</div>
        ${tresc}`,
      prawa: `<section class="karta" aria-label="Karencja"><h2>Dojrzewa</h2><p class="mut" style="margin-bottom:6px">Punkty dojrzewają ${R.karencjaDni} dni. Do tego czasu nie liczą się do awansu — pokazujemy je, nie ukrywamy.</p>${
        dojrz.length
          ? `<ul class="os">${dojrz.map((s) => `<li><div class="tr"><b>${s.kto}</b><div class="zc">dojrzewa za ${s.dni} ${pl(s.dni, ['dzień', 'dni', 'dni'])}</div></div><div class="pk cz">+${s.pkt}<small>${s.sciezka === 'rynek' ? 'rynek' : 'społeczność'}</small></div></li>`).join('')}</ul><p class="mut" style="margin-top:6px">Razem +${sumaDojrz} pkt czeka na dojrzenie.</p>`
          : '<p class="mut">Nic teraz nie dojrzewa.</p>'
      }</section>
        <section class="karta" aria-label="Ile to punktów"><h2>Ile to punktów</h2><table class="tab"><tbody>
          <tr><td>Ocena 5/5 po zleceniu</td><td>${R.oceny[5]}</td></tr><tr><td>Ocena 4/5</td><td>${R.oceny[4]}</td></tr><tr><td>Ocena 3/5</td><td>${R.oceny[3]}</td></tr><tr><td>Ocena 2/5 i niżej</td><td>0</td></tr>
          <tr><td>Każda kolejna ocena od tej samej firmy w ciągu roku</td><td>×0,5</td></tr>
          <tr><td>Uznana odpowiedź w pytaniach</td><td>${R.odpowiedzUznana}</td></tr><tr><td>Kwalifikowany głos za odpowiedź</td><td>${R.glosKwalifikowany}</td></tr>
          <tr><td>Limit ścieżki społeczności</td><td>${R.limitSpolecznosci} / ${R.oknoSpolecznosciDni} dni</td></tr></tbody></table></section>`,
    });
  }

  window.Portal = { feed, profil, drabinka };
})();
