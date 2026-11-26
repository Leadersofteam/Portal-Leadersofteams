// Makieta braków V17 (26.11.2026): wpis portalowy w strumieniu (docenienie, zapis, cytat, zdjęcia), zakres „Obserwowani”,
// awans, kompozytor ze zdjęciami i cytatem, podgląd offline, menu „Więcej” z motywem i kontem.
// ADR-010: żadnych liczników docenień ani wyświetleń; kolejność chronologiczna; „Pokaż więcej”. ADR-004: wpis nie daje punktów.
(() => {
  const { q, STAN, L, P, I, aw, odz, okl, nav, gora, dolny, stopka, stany, komunikat, miernik, kartaDrabinki, kartaZlecen, kartaTematow } = window.Pro.h;
  const S = STAN === 'dane' ? '' : STAN;
  // „x” i „plus” w wadze regular: duotone rysuje pod nimi szary kwadrat, który wygląda jak zepsuta ikona.
  const R = (n) => `<i class="ph ph-${n}" aria-hidden="true"></i>`;

  const zakres = (a) =>
    `<div class="zakres" role="tablist" aria-label="Zakres strumienia">${['Cała społeczność', 'Obserwowani'].map((t, i) => `<button type="button" role="tab" aria-selected="${i === a}">${t}</button>`).join('')}</div>`;
  const filtry = () =>
    `<div class="filtry" data-przesuw role="toolbar" aria-label="Filtr strumienia">${['Wszystko', 'Wpisy', 'Moja branża', 'Zlecenia', 'Pytania', 'Realizacje', 'Usługi'].map((t, i) => `<button class="filtr" type="button" aria-pressed="${i === 0}">${t}</button>`).join('')}</div>`;

  const glowa = (o, czas, typ, ik) =>
    `<div class="glowa"><a href="profil.html" class="imie">${o.n}</a>${odz(o.lv)}<a class="czas" href="#" aria-label="Otwórz wpis, ${czas}">· ${czas}</a></div><div class="meta"><span class="typ">${I(ik)}<span>${typ}</span></span><span class="sep" aria-hidden="true">·</span>${o.branza} · ${o.miasto}</div>`;
  const akcja = (ik, t, wl) =>
    `<button class="akcja${wl ? ' wl' : ''}" type="button" aria-label="${t}" title="${t}"${wl === undefined ? '' : ` aria-pressed="${!!wl}"`}>${I(ik)}</button>`;
  const akcjeWpisu = (odpowiedzi, doc, zap) =>
    `<div class="akcje wpisu"><a class="akcja odp" href="#" aria-label="Skomentuj${odpowiedzi ? `, komentarzy: ${odpowiedzi}` : ''}">${I('chat-circle')}${odpowiedzi ? `<span>${odpowiedzi}</span>` : ''}</a>${akcja('hands-clapping', doc ? 'Cofnij docenienie' : 'Doceniam', doc)}${akcja('bookmark-simple', zap ? 'Usuń z zapisanych' : 'Zapisz na później', zap)}${akcja('repeat', 'Podaj dalej')}${akcja('share-network', 'Udostępnij')}</div>`;
  const zdj = (lista) =>
    `<div class="zdjecia" data-ile="${lista.length}">${lista.map(([r, s, a]) => `<a href="#" aria-label="${a}">${okl(r, s, false)}</a>`).join('')}</div>`;
  const cytat = (o, czas, t) =>
    `<a class="bcyt" href="#"><span class="autor">${aw(o, 24)}<b>${o.n}</b>${odz(o.lv)}<span class="czas">· ${czas}</span></span><span class="tekst">${t}</span></a>`;
  const wpis = (o, czas, tresc, dodatek, akc) =>
    `<article class="wpis">${aw(o, 40)}<div>${glowa(o, czas, 'Wpis', 'article')}<p class="tresc">${tresc}</p>${dodatek}${akc}</div></article>`;
  const awans = (o, czas) =>
    `<article class="wpis">${aw(o, 40, true)}<div>${glowa(o, czas, 'Awans', 'ladder')}<a class="awans" href="drabinka.html">${I('ladder')}<span><b>Awans na szczebel „${L[o.lv - 1].nazwa}”</b><small>Zdobyty z ocen po zleceniach i uznanych odpowiedzi</small></span></a></div></article>`;

  const lista = () =>
    wpis(P.iga, '25 min', 'Odbiór częściowy w lokalu na Świdnickiej za nami. Przed malowaniem sprawdzajcie wilgotność tynku — zaoszczędziło nam to tygodnia poprawek.', zdj([['wyk', 1, 'Zdjęcie 1 z 3'], ['wyk', 4, 'Zdjęcie 2 z 3'], ['san', 2, 'Zdjęcie 3 z 3']]), akcjeWpisu(3, true, false)) +
    wpis(P.ola, '3 godz.', 'Dokładam od siebie: ten sam wymóg mamy przy wylewkach. Warto wpisać pomiar do protokołu.', cytat(P.tomek, 'wczoraj', 'Co dopisujecie do protokołu odbioru, żeby inwestor nie wracał z poprawkami po miesiącu?'), akcjeWpisu(1, false, true)) +
    awans(P.kuba, '5 godz.') +
    wpis(P.marta, 'wczoraj', 'Nowe mocowania na papę przeszły pierwszą zimę bez przecieku.', zdj([['pv', 3, 'Zdjęcie mocowań']]), akcjeWpisu(0, false, false));

  function kompozytor() {
    if (S !== 'pisanie')
      return `<div class="kompozytor">${aw(P.ola, 48)}<div class="pole"><button class="wpisz" type="button">Napisz, co dziś zrobiliście, albo zapytaj o radę…</button>
        <div class="rodzaje"><button class="rodzaj" type="button">${I('image')}Zdjęcie</button><button class="rodzaj" type="button">${I('clipboard-text')}Zlecenie</button><button class="rodzaj" type="button">${I('chats-circle')}Pytanie</button><button class="rodzaj" type="button">${I('seal-check')}Realizacja</button><button class="btn glowny" type="button" disabled>Opublikuj</button></div></div></div>`;
    return `<div class="kompozytor pisze" role="dialog" aria-modal="true" aria-label="Nowy wpis">${aw(P.ola, 48)}<div class="pole"><div class="pisze-gora"><button type="button" class="ikonka" aria-label="Zamknij">${R('x')}</button><b>Nowy wpis</b><button class="btn glowny" type="button">Opublikuj</button></div><label class="sr" for="tr">Treść wpisu</label><textarea id="tr" class="wpisz" rows="3">Dokładam od siebie: przy wylewkach robimy ten sam pomiar i wpisujemy go do protokołu. Zdjęcia z wczoraj poniżej.</textarea>
      <div class="miniatury">${['wyk', 'san'].map((r, i) => `<span class="mini">${okl(r, i + 2, false)}<button type="button" aria-label="Usuń zdjęcie ${i + 1}">${R('x')}</button></span>`).join('')}<button class="mini dodaj" type="button" aria-label="Dodaj zdjęcie">${R('plus')}</button></div>
      <div class="bcyt-szkic">${cytat(P.tomek, 'wczoraj', 'Co dopisujecie do protokołu odbioru, żeby inwestor nie wracał z poprawkami po miesiącu?')}<button type="button" class="ikonka" aria-label="Usuń cytat">${R('x')}</button></div>
      <div class="rodzaje"><button class="rodzaj" type="button">${I('image')}Zdjęcie · 2 z 4</button><span class="licznik num">Zostało ${600 - 113}</span><button class="btn glowny dol" type="button">Opublikuj</button></div>
      <div class="inne"><span>Zamiast wpisu:</span><button class="rodzaj" type="button">${I('clipboard-text')}Zlecenie</button><button class="rodzaj" type="button">${I('chats-circle')}Pytanie</button><button class="rodzaj" type="button">${I('storefront')}Usługa</button></div></div></div>`;
  }

  const motyw = () =>
    `<div class="motyw-wybor" role="radiogroup" aria-label="Motyw">${[['moon', 'Ciemny', 'dark'], ['sun', 'Jasny', 'light'], ['desktop', 'Systemowy', 'system']].map(([ik, t, k]) => `<button type="button" role="radio" aria-checked="${(q.get('motyw') === 'light' ? 'light' : 'dark') === k}">${I(ik)}${t}</button>`).join('')}</div>`;
  const wiecej = () =>
    `<div class="zaslona"></div><section class="wiecej-menu" role="dialog" aria-modal="true" aria-labelledby="wm"><header>${aw(P.ola, 44, true)}<a class="mojprofil" href="profil.html"><h2 id="wm">${P.ola.n}</h2>${odz(P.ola.lv)}<small>Mój profil</small></a><button class="ikonka" type="button" aria-label="Zamknij">${R('x')}</button></header>
      <nav aria-label="Konto">${[['gauge', 'Panel'], ['bookmark-simple', 'Zapisane'], ['list-checks', 'Moje punkty']].map(([ik, t]) => `<a href="#">${I(ik)}${t}</a>`).join('')}</nav>
      <nav aria-label="Portal">${[['users-three', 'Liderzy'], ['users', 'Grupy branżowe'], ['footprints', 'Droga Lidera'], ['buildings', 'Dla firm']].map(([ik, t]) => `<a href="#">${I(ik)}${t}</a>`).join('')}</nav>
      <div class="blok"><span class="et">Motyw</span>${motyw()}</div>
      <nav><button type="button">${I('sign-out')}Wyloguj się</button></nav></section>`;

  window.Pro.braki = () => {
    let srodek;
    if (S === 'offline')
      srodek = `<div class="offline" role="status">${I('cloud-slash')}<span><b>Jesteś offline</b><small>Ostatni zapisany strumień z dziś, 9:41. Publikowanie wróci razem z siecią.</small></span><button class="btn obrys" type="button">${I('arrow-clockwise')}Odśwież</button></div>
        ${[[P.iga, '25 min', 'Odbiór częściowy w lokalu na Świdnickiej za nami. Przed malowaniem sprawdzajcie wilgotność tynku.'], [P.tomek, 'wczoraj', 'Co dopisujecie do protokołu odbioru, żeby inwestor nie wracał z poprawkami po miesiącu?'], [P.marta, 'wczoraj', 'Nowe mocowania na papę przeszły pierwszą zimę bez przecieku.']].map(([o, c, t]) => `<article class="wpis">${aw(o, 40)}<div>${glowa(o, c, 'Wpis', 'article')}<p class="tresc">${t}</p></div></article>`).join('')}
        <div class="wiecej"><small class="num">3 zapisane wpisy · tylko to, co publiczne</small></div>`;
    else if (S === 'pusty')
      srodek = komunikat('users-three', 'Nie obserwujesz jeszcze nikogo', 'Wejdź na profil Lidera i kliknij „Obserwuj”. Jego wpisy, usługi i awanse pojawią się tutaj.', `<a class="btn obrys" href="#">Zobacz całą społeczność</a>`);
    else srodek = lista() + `<div class="wiecej"><button class="btn obrys" type="button">Pokaż więcej</button><small class="num">8 z 87</small></div>`;
    document.body.innerHTML = `${gora()}<div class="rama">${nav('feed')}
      <main class="kolumna" id="tresc"><div class="naglowek"><h1>Strumień</h1></div>
        ${S === 'offline' || S === 'pusty' ? '' : `<a class="pasek-drabinki" href="drabinka.html">${aw(P.ola, 40, true)}<span class="t"><b>Specjalista · 770 pkt</b><small>730 do „Ekspert” · +150 dojrzewa</small>${miernik(70, 800, 'var(--level-3)', 150)}</span>${I('caret-right')}</a>`}
        ${S === 'offline' ? '' : zakres(S === 'pusty' ? 1 : 0) + kompozytor() + (S === 'pusty' ? '' : filtry())}
        ${srodek}
      </main>
      <aside class="bok"><div class="bok-lepki">${S === 'offline' ? '' : kartaDrabinki() + kartaZlecen() + kartaTematow()}${stopka()}</div></aside>
    </div>${dolny('feed')}${S === '' || S === 'pusty' ? `<button class="fab" type="button" aria-label="Napisz wpis">${R('plus')}</button>` : ''}${S === 'wiecej' ? wiecej() : ''}${stany(['dane', 'pisanie', 'offline', 'wiecej', 'pusty'])}`;
    // Wyzwalacze menu: karta konta w szynie (desktop, także zwinięta) i awatar w górnym pasku (telefon).
    for (const el of document.querySelectorAll('.nav .ja, .gora a[href="profil.html"]')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = el.className ? `${el.className} wyzw` : 'wyzw';
      b.setAttribute('aria-haspopup', 'dialog');
      b.setAttribute('aria-expanded', String(S === 'wiecej'));
      b.setAttribute('aria-label', 'Konto i ustawienia');
      b.innerHTML = el.innerHTML;
      b.addEventListener('click', () => { const u = new URLSearchParams(location.search); u.set('stan', S === 'wiecej' ? 'dane' : 'wiecej'); location.search = u.toString(); });
      el.replaceWith(b);
    }
    if (S === 'offline') for (const b of document.querySelectorAll('.nav .utworz')) b.disabled = true;
  };
})();
