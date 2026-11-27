// V17 PRO — P6 landing i P5 auth/stany (makieta 26.11.2026). Ładować po pro.js, publiczne-tresc.js i tlo.js; wywołać Pub.<ekran>().
// ?motyw=dark|light, ?stan=… (lista stanów każdego ekranu w README). Dane Liderów fikcyjne (Pro.h.P). Teksty 1:1 z apps/web.
(() => {
  const { q, STAN, L, P, I, aw, odz, fmt, stany, sz } = Pro.h;
  const fmt4 = (n) => fmt(n).replace(/\s/g, ' ');
  const ZNAK = `<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle cx="5" cy="20" r="3.4" style="fill:var(--level-2)"/><circle cx="12.5" cy="12.5" r="4.2" style="fill:var(--primary-400)"/><circle cx="20.5" cy="5.5" r="4.6" style="fill:var(--level-6)"/></svg>`;
  const znak = () => `<a class="znak" href="landing.html">${ZNAK}<span>Leaders of Teams</span></a>`;
  const href = (s) => `${s}${s.includes('?') ? '&' : '?'}motyw=${q.get('motyw') || 'dark'}`;

  // ── Nagłówek: te same pozycje co components/site-header.tsx ──
  const NAV = ['Feed', 'Usługi', 'Zlecenia', 'Liderzy', 'Grupy'];
  function gora(zalogowany) {
    const linki = [...NAV, ...(zalogowany ? ['Droga', 'Panel'] : ['Dla firm'])];
    const menu = STAN === 'menu' || STAN === 'menu-zalogowany';
    const szukaj = () => `<form class="pg-szukaj" role="search" action="#" onsubmit="return false">${I('magnifying-glass')}<input type="search" aria-label="Szukaj w Portalu" placeholder="Szukaj usług, Liderów, zleceń…"></form>`;
    const konto = zalogowany
      ? `<a class="btn obrys" href="#">Ola</a>`
      : `<a class="btn obrys" href="${href('logowanie.html')}">Zaloguj się</a><a class="btn glowny" href="${href('rejestracja.html')}">Dołącz</a>`;
    return `<header class="pg"><div class="pg-w">${znak()}
      ${szukaj()}
      <nav class="pg-linki" aria-label="Nawigacja główna">${linki.map((t) => `<a href="#">${t}</a>`).join('')}
      ${zalogowany ? `<a class="ikonka" href="#" aria-label="Powiadomienia: 1 nowe">${I('bell')}<em>1</em></a><a class="btn obrys" href="#">Ola</a>` : `<a href="${href('logowanie.html')}">Zaloguj się</a><a class="btn obrys" href="${href('rejestracja.html')}">Dołącz</a>`}</nav></div></header>
      <header class="pg-tel">${znak()}${zalogowany ? `<a class="ikonka" href="#" aria-label="Powiadomienia: 1 nowe">${I('bell')}</a>` : ''}
      <button class="ikonka" type="button" aria-label="Menu" aria-expanded="${menu}">${I(menu ? 'x' : 'list')}</button>${szukaj()}</header>
      ${menu ? `<div class="zaslona"></div><nav class="menu-tel" aria-label="Menu">${linki.map((t) => `<a href="#">${t}</a>`).join('')}${zalogowany ? '<a href="#">Powiadomienia</a>' : ''}<div class="akcje-k">${konto}</div></nav>` : ''}`;
  }
  // ── Dolny pasek: te same sloty co components/bottom-nav.tsx (5, gość / zalogowany) ──
  function dol(zalogowany, akt) {
    const D = [['Feed', 'house-simple'], ['Usługi', 'storefront'], ['Utwórz', 'plus-circle'],
      ...(zalogowany ? [['Powiadomienia', 'bell'], ['Panel', 'squares-four']] : [['Dla firm', 'clipboard-text'], ['Zaloguj', 'sign-in']])];
    const ark = STAN === 'utworz' ? `<div class="zaslona"></div><div class="arkusz" role="dialog" aria-label="Co chcesz utworzyć?"><h2>Co dziś tworzysz?</h2>
      ${[['pencil-simple', 'Napisz wpis', 'Krótka notka do obserwujących'], ['storefront', 'Opublikuj usługę', 'Twoje umiejętności z pakietami i ceną'], ['clipboard-text', 'Dodaj zlecenie', 'Opisz, czego potrzebujesz — Liderzy złożą oferty']]
        .map(([ik, t, h]) => `<a href="#"><span class="ico">${I(ik)}</span><span><strong>${t}</strong><small>${h}</small></span></a>`).join('')}<button class="btn obrys pelny" type="button">Zamknij</button></div>` : '';
    return `<nav class="dolny" aria-label="Nawigacja dolna">${D.map(([t, ik]) => `<a href="#"${t === akt ? ' aria-current="page"' : ''}>${I(ik)}<span>${t}</span></a>`).join('')}</nav>${ark}`;
  }
  // ── Stopka: components/ui/footer.tsx + lib/ecosystem.ts (trzy POZOSTAŁE właściwości, etykiety dosłownie) ──
  function stopka(zalogowany) {
    const kol = (h, l) => `<div><h4>${h}</h4><ul>${l.map(([t, u]) => `<li><a href="${u || '#'}">${t}</a></li>`).join('')}</ul></div>`;
    const jasny = document.documentElement.dataset.theme === 'light';
    return `<footer class="st"><div class="st-w"><div>${znak()}<p>Status, którego nie da się kupić ani wyrekrutować — tylko zapracować. Marketplace B2B i społeczność Liderów z jawnym, antymanipulacyjnym systemem awansu.</p>
      <div class="motywy" role="radiogroup" aria-label="Motyw kolorystyczny">${['Ciemny', 'Jasny', 'Systemowy'].map((t) => `<button type="button" role="radio" aria-checked="${t === (jasny ? 'Jasny' : 'Ciemny')}">${t}</button>`).join('')}</div></div>
      ${kol('Platforma', [['Usługi Liderów'], ['Zlecenia'], ['Liderzy'], ['Grupy branżowe'], ['Droga Lidera'], ['Zasady punktacji'], ['Dla firm']])}
      ${kol('Ekosystem', [['LOT App', 'https://app.leadersofteams.com'], ['O firmie', 'https://leadersofteam.pl'], ['International / EN', 'https://leadersofteams.com']])}
      ${kol('Konto i zasady', [...(zalogowany ? [['Panel'], ['Konto i dane']] : [['Załóż konto', href('rejestracja.html')], ['Zaloguj się', href('logowanie.html')]]), ['Regulamin', href('dokument.html')], ['Polityka prywatności', href('dokument.html?strona=prywatnosc')]])}
      </div><div class="st-prawne">© 2026 Leaders of Teams · leadersofteams.pl</div></footer>`;
  }
  function rama(tresc, { zalogowany = false, akt = '', lista = [] } = {}) {
    document.body.innerHTML = `<div class="strona-tel">${gora(zalogowany)}<main class="pm">${tresc}</main>${stopka(zalogowany)}</div>${dol(zalogowany, akt)}`;
    window.TloSiec();
    if (lista.length) document.body.insertAdjacentHTML('beforeend', stany(lista));
  }

  // ── Scena 3D: w KODZIE zostaje bez zmian components/ui/ladder-scene.tsx (WebGL + SVG zapasowe). Tu jej nieruchomy
  //    odpowiednik na canvas 2D z tych samych liczb (7 szczebli, pochylone belki, kolory --level-*), żeby zrzut był powtarzalny. ──
  function scena() {
    const c = document.getElementById('scena');
    if (!c) return;
    const W = c.clientWidth, H = c.clientHeight, d = Math.min(2, devicePixelRatio || 1);
    c.width = W * d; c.height = H * d;
    const g = c.getContext('2d'); g.scale(d, d);
    let s = 7;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const css = getComputedStyle(document.documentElement);
    const kol = [1, 2, 3, 4, 5, 6, 7].map((n) => css.getPropertyValue(`--level-${n}`).trim());
    const jasny = document.documentElement.dataset.theme === 'light';
    g.globalCompositeOperation = jasny ? 'source-over' : 'lighter';
    const rail = (side, y) => { const t = (y + 3) / 6; return side < 0 ? -1.15 + t * 0.55 : 1.35 - t * 0.3; };
    for (let i = 0; i < 4200; i++) {
      let x, y, lv;
      if (r() < 0.38) { const side = r() < 0.5 ? -1 : 1; y = -3 + r() * 6; lv = Math.min(6, Math.max(0, Math.round((y + 2.55) / 0.85))); x = rail(side, y) + (r() - 0.5) * 0.09; }
      else { lv = i % 7; const yy = -2.55 + lv * 0.85, t = r(); x = rail(-1, yy) + (rail(1, yy) - rail(-1, yy)) * t; y = yy + (r() - 0.5) * 0.11 - t * 0.06; }
      const rozrzut = r() < 0.04 ? 0.5 : 0;
      const px = W / 2 + (x + (r() - 0.5) * rozrzut) * H * 0.155, py = H / 2 - (y + (r() - 0.5) * rozrzut) * H * 0.153;
      g.globalAlpha = 0.25 + r() * 0.65; g.fillStyle = kol[lv];
      g.beginPath(); g.arc(px, py, 0.7 + r() * 1.5, 0, 7); g.fill();
    }
  }
  function drabinaArt(extra = '') {
    return `<svg viewBox="0 0 340 480" fill="none" aria-hidden="true">${extra}<path d="M96 478 150 6M268 478 250 6" style="stroke:var(--line-2)" stroke-width="10" stroke-linecap="round"/>${[0, 1, 2, 3, 4, 5, 6].map((i) => { const t = i / 6, y = 424 - t * 372; return `<line x1="${102 + t * 44}" y1="${y}" x2="${262 - t * 14}" y2="${y - 6}" style="stroke:var(--level-${i + 1})" stroke-width="${i === 6 ? 14 : 11}" stroke-linecap="round" opacity="${0.45 + t * 0.55}"/>`; }).join('')}</svg>`;
  }

  // ── Blok „Twój pierwszy punkt” (components/ui/first-point.tsx) ──
  function pierwszy(compact) {
    return `<section class="pierwszy"><h3>Pierwszy szczebel, Adept, to 100 pkt. Dają je tylko inni ludzie.</h3><ul>
      <li><strong>+100 pkt</strong><span>Firma ocenia Twoją pracę na 5/5 po zakończonym zleceniu. Jedno takie zlecenie wystarcza na Adepta.</span>${compact ? '' : '<a class="link" href="#">Znajdź zlecenie →</a>'}</li>
      <li><strong>+50 pkt</strong><span>Autor pytania uznaje Twoją odpowiedź w Q&amp;A (do 300 pkt w 7 dni).</span>${compact ? '' : '<a class="link" href="#">Odpowiedz na pytanie →</a>'}</li>
      <li class="bez-pkt"><strong>0 pkt</strong><span>za zaproszenia, logowanie, wpisy i obserwujących.</span></li></ul>
      <p>Punkty liczą się do awansu po 7 dniach. <a class="link" href="#">Pełne zasady Drabinki</a></p></section>`;
  }

  // ═════════ / ═════════
  const KROKI = [
    ['Opisz potrzebę', 'Tytuł, branża, widełki budżetu i kilka zdań o tym, co ma powstać. Konto założysz w następnym kroku — jednym formularzem, razem z nazwą firmy.'],
    ['Dostań oferty', 'Liderzy odpowiadają ofertą z kwotą i terminem. Przy każdej widzisz poziom w Drabince, oceny od innych Firm i liczbę zrealizowanych zleceń — żadnego z tych sygnałów nie da się kupić.'],
    ['Dopytaj i wybierz', 'Każda oferta ma rozmowę: dopytasz o zakres, termin albo cenę, zanim wybierzesz. O nowej ofercie i odpowiedzi dostaniesz e-mail.'],
    ['Odbierz pracę i oceń', 'Lider oddaje pracę, Ty potwierdzasz wykonanie. Oceniacie się nawzajem — obie oceny publikują się naraz, więc żadna strona nie ocenia „pod dyktando”.'],
  ];
  const FAQ = [
    ['Czym to się różni od Fiverr czy Oferteo?', 'Tam kupujesz widoczność albo licytujesz ceną. Tu pozycję Lidera buduje wyłącznie oceniona praca i uznany mentoring — poziom w Drabince jest zweryfikowanym dowodem kompetencji, którego nie można kupić.'],
    ['Czy to jakiś system MLM?', 'Nie — i to jest wbudowane w architekturę, nie tylko w regulamin. Zero punktów za zapraszanie, rekrutację, publikowanie treści czy samo logowanie. Rejestr punktów jest jawny: zawsze widać, za co i ile.'],
    ['Ile kosztuje udział w platformie?', 'Rejestracja i korzystanie z marketplace, grup i Q&A są bezpłatne. Platforma nie pośredniczy w płatnościach — rozliczasz się bezpośrednio z drugą stroną.'],
    ['Jak Firma może zlecić pracę?', 'Opisz potrzebę bez konta — konto i firmę założysz jednym krokiem po formularzu. Publikujesz po potwierdzeniu adresu e-mail. Oferty składają Liderzy o wymaganym poziomie, przy każdej masz rozmowę, a po realizacji oceniacie się nawzajem. <a href="#">Więcej dla firm →</a>'],
    ['Co daje wyższy poziom w Drabince?', 'Dostęp do większych zleceń, prawo zakładania grup branżowych (od poziomu 2), od poziomu 5 — dostęp do aplikacji LOT (CRM dla zespołów), a na poziomie 7 — własny zespół prowadzony w tej aplikacji. Poziom raz zdobyty nie wygasa.'],
  ];
  function liderzy() {
    const l = [[P.marta, 'Fotowoltaika dla firm — od projektu po przyłączenie', '4,9', '31 ocen'], [P.bartek, 'Wentylacja i klimatyzacja w działających zakładach', '4,8', '22 oceny'], [P.iga, 'Wykończenia lokali usługowych pod klucz', '4,7', '14 ocen']];
    return `<section class="sek"><p class="nadtytul">Kogo spotkasz</p><h2>Poziom to dowód, nie deklaracja</h2><div class="lista">${l.map(([o, h, s, n]) => `<div class="lid-w">${aw(o, 52, true)}<div><h3><a href="#">${o.n}</a></h3><p>${h}</p><small>${o.branza}</small></div><div class="prawo">${odz(o.lv)}<span class="ocena-l">${I('star')}<b>${s}/5</b>(${n})</span></div></div>`).join('')}</div>
      <p style="margin:16px 0 0"><a class="link" href="#">Przeglądaj cały katalog Liderów →</a></p></section>`;
  }
  function landing() {
    document.documentElement.classList.add('pub-landing');
    const zal = STAN === 'zalogowany' || STAN === 'menu-zalogowany';
    rama(`<section class="hero"><div>
        <p class="nadtytul">Marketplace B2B · Liderzy zespołów</p>
        <h1>Opisz zlecenie. Oferty złożą <span class="szczebel">sprawdzeni</span> Liderzy.</h1>
        <p class="lid">Sprzedaż, operacje, projekty, automatyzacja — Liderzy odpowiadają ofertą z kwotą i terminem. Przy każdej widzisz poziom w Drabince, oceny innych firm i zrealizowane zlecenia. Bez prowizji, bez konta na start.</p>
        <div class="cta"><a class="btn glowny duzy" href="#">Dodaj zlecenie</a><a class="btn obrys duzy" href="${href('rejestracja.html')}">Szukam zleceń — dołącz jako Lider</a></div>
        <dl class="liczby" aria-label="Zasady platformy w liczbach"><div><dt>0 zł</dt><dd>prowizji i opłat za zlecenie</dd></div><div><dt>2</dt><dd>kroki: opis potrzeby, potem konto</dd></div><div><dt>0</dt><dd>punktów do kupienia — poziom to oceniona praca</dd></div></dl></div>
        <div class="scena"><canvas id="scena" aria-hidden="true"></canvas>
          <div class="promien-przyklad"><small>Przykład: światło daje drugi człowiek</small><span class="kto">${aw(P.hotel, 36)}</span><span class="linia" aria-hidden="true"></span><span class="kto">${aw(P.marta, 36)}<b class="pkt">+100 pkt</b></span><small>ocena 5/5 po zleceniu</small></div></div>
      </section>
      <section class="sek"><p class="nadtytul">Jak zlecić pracę</p><h2>Od opisu do ocenionej pracy</h2><ol class="schody">${KROKI.map(([t, b]) => `<li><h3>${t}</h3><p>${b}</p></li>`).join('')}</ol><a class="btn obrys" href="#">Dodaj zlecenie</a></section>
      ${STAN === 'bez-liderow' ? '' : liderzy()}
      <section class="sek lider-sek"><div><p class="nadtytul">Dla Liderów</p><h2 class="h">Szukasz zleceń? Pozycję budujesz pracą, nie znajomościami.</h2>
        <p class="lid">Punkty w Drabince dają wyłącznie oceny Firm po zrealizowanym zleceniu i odpowiedzi uznane w Q&amp;A. Wyższy poziom to większe zlecenia, prawo zakładania grup, a od poziomu 5 — dostęp do aplikacji LOT, w której prowadzisz własny zespół.</p>
        <ol class="szczeble" aria-label="Siedem szczebli Drabinki">${L.map((s, i) => `<li style="--c:var(--level-${s.n});--i:${i}"><b>${s.n}</b><span>${s.nazwa}</span><small>${fmt4(s.prog)} pkt</small></li>`).join('')}</ol></div>
        <div>${pierwszy(false)}<div class="cta"><a class="btn obrys" href="${href('rejestracja.html')}">Dołącz jako Lider</a></div>
        <p style="margin:12px 0 0;display:flex;flex-wrap:wrap;gap:0 20px"><a class="link" href="#">Droga Lidera, szczebel po szczeblu →</a><a class="link" href="#">Jawne zasady punktacji →</a></p></div></section>
      <section class="sek"><p class="nadtytul">FAQ</p><h2>Najczęstsze pytania</h2><div class="faq">${FAQ.map(([p, o], i) => `<details${i === 0 ? ' open' : ''}><summary>${p}<span class="plus" aria-hidden="true"></span></summary><p>${o}</p></details>`).join('')}</div></section>
      <span class="znak-wodny" aria-hidden="true">LEADERS OF TEAMS</span>`, { zalogowany: zal, lista: ['zalogowany', 'bez-liderow', 'menu', 'menu-zalogowany', 'utworz'] });
    scena();
  }

  // ═════════ Logowanie, rejestracja, hasło ═════════
  const pole = (id, et, typ = 'text', wart = '', zle = false, ph = '') => `<div class="pole-f${zle ? ' zle' : ''}"><label for="${id}">${et}</label><input id="${id}" type="${typ}" value="${wart}" placeholder="${ph}"></div>`;
  const blad = (t) => `<div class="blad-box" role="alert">${I('warning-circle')}<span>${t}</span></div>`;
  const przycisk = (t, wTrakcie) => `<button class="btn glowny pelny duzy" type="button"${wTrakcie ? ' disabled' : ''}>${wTrakcie || t}</button>`;
  const dwie = (karta, bok) => `<div class="dwie${bok ? '' : ' jedna'}"><div class="forma">${karta}</div>${bok ? `<aside class="bok-auth">${drabinaArt()}<p>${bok}</p></aside>` : ''}</div>`;
  const BOK = 'Konto to pierwszy szczebel. Dalej wspinasz się już tylko pracą — każdy punkt w Drabince ma jawne źródło, a bursztyn szczytu trzeba zdobyć.';

  function logowanie() {
    const zle = STAN === 'blad';
    rama(dwie(`<h1>Zaloguj się</h1>${zle ? blad('Nieprawidłowy e-mail lub hasło') : ''}
      ${pole('email', 'E-mail', 'email', STAN ? 'ola.wrzos@example.com' : '')}${pole('password', 'Hasło', 'password', STAN ? 'abcdefghij' : '', zle)}
      ${przycisk('Zaloguj się', STAN === 'wysylanie' ? 'Logowanie…' : '')}
      <p class="pod-przyciskiem"><a href="${href('haslo.html')}">Nie pamiętam hasła</a></p>
      <p class="pod-przyciskiem">Nie masz konta? <a href="${href('rejestracja.html')}">Zarejestruj się</a></p>`, 'Twoje szczeble czekają. Poziom raz zdobyty nie wygasa.'), { akt: 'Zaloguj', lista: ['blad', 'wysylanie'] });
  }
  function rejestracja() {
    const firma = STAN === 'firma';
    rama(dwie(`${firma ? '<p class="krok-z">Krok 2 z 2 · konto i firma</p>' : ''}<h1>${firma ? 'Konto i firma — jeden krok' : 'Załóż konto'}</h1>
      <p class="cicho">${firma ? 'Twój opis potrzeby czeka w tej karcie. Załóż konto, podaj nazwę firmy — i wracasz do zlecenia.' : 'Rejestracja jest otwarta dla każdego. Tytuł Lidera zdobywa się pracą i mentoringiem — w Drabince Lidera.'}</p>
      ${STAN === 'blad' ? blad('Konto z tym adresem e-mail już istnieje') : ''}
      ${pole('displayName', 'Imię i nazwisko (lub nazwa)', 'text', STAN === 'blad' ? 'Ola Wrzos' : '')}${firma ? pole('companyName', 'Nazwa firmy') : ''}
      ${pole('email', 'E-mail', 'email', STAN === 'blad' ? 'ola.wrzos@example.com' : '', STAN === 'blad')}${pole('password', 'Hasło (min. 10 znaków)', 'password', STAN === 'blad' ? 'abcdefghij' : '')}
      ${przycisk('Utwórz konto', STAN === 'wysylanie' ? 'Tworzenie konta…' : '')}
      <p class="zgoda">Zakładając konto, akceptujesz <a href="${href('dokument.html')}">Regulamin</a> i <a href="${href('dokument.html?strona=prywatnosc')}">Politykę prywatności</a>.</p>
      <p class="pod-przyciskiem">Masz już konto? <a href="${href('logowanie.html')}">Zaloguj się</a></p>`, BOK), { lista: ['firma', 'blad', 'wysylanie'] });
  }
  function haslo() {
    let k;
    const nowy = `<p><a class="btn glowny pelny" href="#">Wyślij nowy link</a></p>`;
    if (STAN === 'wyslano') k = `<div class="stan-ikona ok">${I('envelope-simple')}</div><h1>Sprawdź skrzynkę</h1><p>Jeśli to konto istnieje, wysłaliśmy na nie link do ustawienia nowego hasła. Link jest ważny przez godzinę i działa jeden raz.</p><p class="cicho">Nie ma wiadomości? Zajrzyj do spamu i sprawdź, czy adres nie ma literówki.</p><a class="btn obrys pelny" href="#">Wróć do logowania</a>`;
    else if (STAN === 'nowe' || STAN === 'rozne') k = `<h1>Ustaw nowe hasło</h1>${STAN === 'rozne' ? blad('Hasła nie są takie same.') : ''}${pole('password', 'Nowe hasło (min. 10 znaków)', 'password', STAN === 'rozne' ? 'abcdefghij' : '')}${pole('password2', 'Powtórz hasło', 'password', STAN === 'rozne' ? 'abcdefghik' : '', STAN === 'rozne')}${przycisk('Ustaw hasło')}<p class="pod-przyciskiem">Link stracił ważność? <a href="#">Poproś o nowy</a>.</p>`;
    else if (STAN === 'bez-tokenu') k = `<h1>Ustaw nowe hasło</h1>${blad('W adresie zabrakło tokenu.')}<p class="cicho">Otwórz link dokładnie tak, jak przyszedł w wiadomości. Możesz też poprosić o nowy — link resetu traci ważność po godzinie.</p>${nowy}`;
    else if (STAN === 'ustawione') k = `<div class="stan-ikona ok">${I('check-circle')}</div><h1>Hasło ustawione</h1><p>Możesz się teraz zalogować nowym hasłem.</p><p class="cicho">Ze względów bezpieczeństwa wylogowaliśmy Cię ze wszystkich urządzeń — na każdym trzeba zalogować się ponownie.</p><a class="btn glowny pelny" href="#">Zaloguj się</a>`;
    else k = `<h1>Nie pamiętam hasła</h1><p class="cicho">Podaj adres e-mail, którym się rejestrowałeś. Wyślemy link do ustawienia nowego hasła.</p>${pole('email', 'E-mail', 'email', STAN === 'wysylanie' ? 'ola.wrzos@example.com' : '')}${przycisk('Wyślij link', STAN === 'wysylanie' ? 'Wysyłanie…' : '')}<p class="pod-przyciskiem">Pamiętasz hasło? <a href="${href('logowanie.html')}">Zaloguj się</a></p>`;
    rama(dwie(k), { lista: ['wysylanie', 'wyslano', 'nowe', 'rozne', 'bez-tokenu', 'ustawione'] });
  }

  // ═════════ /wypis-digest ═════════
  function wypis() {
    const k = STAN === 'ladowanie' ? `<h1>Powiadomienia e-mail</h1><p class="cicho" role="status">Wypisuję…</p>${sz('80%', 14, 'm')}`
      : STAN === 'blad' ? `<div class="stan-ikona zle">${I('link-break')}</div><h1>Powiadomienia e-mail</h1><p><b>Ten link nie zadziałał</b></p><p class="cicho">Link mógł być niekompletny (niektóre programy pocztowe ucinają adresy). Powiadomienia e-mail wyłączysz też ręcznie w <a href="#">panelu konta</a>.</p>`
        : `<div class="stan-ikona ok">${I('check-circle')}</div><h1>Powiadomienia e-mail</h1><p><b>Gotowe.</b> Nie będziemy już wysyłać Ci dziennego podsumowania powiadomień.</p><p class="cicho">Zmienisz zdanie? Włączysz je z powrotem w <a href="#">panelu konta</a>. Maile o resecie hasła i weryfikacji adresu działają dalej — to nie subskrypcja.</p>`;
    rama(dwie(k), { lista: ['ladowanie', 'blad'] });
  }

  // ═════════ Regulamin i prywatność ═════════
  function dokument() {
    const kt = q.get('strona') === 'prywatnosc' || STAN === 'prywatnosc' ? 'prywatnosc' : 'regulamin';
    let n = 0;
    const spis = [];
    const html = window.TRESC[kt].replace(/<h2>(.*?)<\/h2>/g, (_, t) => { spis.push(t); return `<h2 id="p${++n}">${t}</h2>`; }).replace(/<a href="\/prywatnosc">/g, `<a href="${href('dokument.html?strona=prywatnosc')}">`);
    rama(`<nav class="dok-zakl" aria-label="Dokumenty"><a href="${href('dokument.html')}"${kt === 'regulamin' ? ' aria-current="page"' : ''}>Regulamin</a><a href="${href('dokument.html?strona=prywatnosc')}"${kt === 'prywatnosc' ? ' aria-current="page"' : ''}>Polityka prywatności</a></nav>
      <div class="dok"><nav class="dok-spis" data-przesuw aria-label="Spis treści">${spis.map((t, i) => `<a href="#p${i + 1}">${t}</a>`).join('')}</nav><article class="dok-tekst">${html}</article></div>`);
  }

  // ═════════ /start (zalogowany) ═════════
  const ART = {
    rung: '<path d="M18 60 26 4M50 60 42 4" style="stroke:var(--line-2)" stroke-width="4" stroke-linecap="round"/><path d="M22 46h24M23 32h22" style="stroke:var(--text-muted)" stroke-width="4" stroke-linecap="round"/><path d="M25 18h18" style="stroke:var(--level-3)" stroke-width="4" stroke-linecap="round" stroke-dasharray="5 5"/>',
    search: '<circle cx="27" cy="27" r="17" style="stroke:var(--text-muted)" stroke-width="4"/><path d="m40 40 16 16" style="stroke:var(--text-muted)" stroke-width="4" stroke-linecap="round"/><circle cx="27" cy="27" r="6" style="fill:var(--level-3)"/>',
    lantern: '<path d="M22 20h20l4 28H18z" style="stroke:var(--text-muted)" stroke-width="3.5" stroke-linejoin="round"/><path d="M26 20c0-14 12-14 12 0M20 56h24" style="stroke:var(--text-muted)" stroke-width="3.5" stroke-linecap="round"/><circle cx="32" cy="35" r="8" style="fill:var(--level-5)"/>',
    ladder: '<path d="M18 60 26 4M50 60 42 4" style="stroke:var(--line-2)" stroke-width="4" stroke-linecap="round"/><path d="M22 46h24" style="stroke:var(--level-1)" stroke-width="4" stroke-linecap="round"/><path d="M23 32h22" style="stroke:var(--level-2)" stroke-width="4" stroke-linecap="round"/><path d="M25 18h18" style="stroke:var(--level-3)" stroke-width="4" stroke-linecap="round"/>',
  };
  const art = (n) => `<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">${ART[n]}</svg>`;
  function start() {
    const krok = STAN === '3' || STAN === '3-firma' ? 3 : ['2', '2-blad', '2-zapis'].includes(STAN) ? 2 : 1;
    const kroki = `<ol class="kroki" aria-label="Postęp kreatora">${['Kim jesteś', 'Minimum', 'Pierwszy ruch'].map((t, i) => `<li class="${i + 1 === krok ? 'teraz' : i + 1 < krok ? 'zrobione' : ''}"${i + 1 === krok ? ' aria-current="step"' : ''}><span>${i + 1}</span><span class="sr">${t}</span></li>`).join('')}</ol>`;
    let k;
    if (krok === 1) k = `<section><h2>Kim jesteś w Portalu?</h2><p class="cicho">Możesz to później zmienić — to tylko ustawia Ci punkt startowy.</p><div class="wybory">
      ${[['ladder', 'Jestem Liderem', 'Prowadzę zespoły albo wykonuję projekty. Chcę pokazać, co potrafię, i dostawać zlecenia.'], ['search', 'Reprezentuję Firmę', 'Szukam ludzi do konkretnej roboty. Chcę opisać potrzebę i dostać oferty.'], ['rung', 'Jedno i drugie', 'Czasem zlecam, czasem realizuję. Chcę mieć obie strony w jednym koncie.']].map(([a, t, h]) => `<button class="wybor" type="button">${art(a)}<strong>${t}</strong><em>${h}</em></button>`).join('')}</div></section>`;
    else if (krok === 2) k = `<section><h2>Minimum, żeby ludzie wiedzieli, z kim mają do czynienia</h2><p></p><div class="pola">${STAN === '2-blad' ? blad('Wybierz branżę / kompetencję.') : ''}
      <div class="pole-f${STAN === '2-blad' ? ' zle' : ''}"><label for="br">Branża / kompetencja</label><select id="br"><option>Wybierz branżę</option><option>Instalacje sanitarne</option></select></div>
      ${pole('hl', 'W czym jesteś dobry? (jedno zdanie)', 'text', '', false, 'np. Buduję i prowadzę zespoły sprzedażowe B2B')}${pole('firma', 'Nazwa firmy')}
      <div class="akcje-k"><button class="btn glowny" type="button"${STAN === '2-zapis' ? ' disabled>Zapisywanie…' : '>Dalej'}</button><button class="btn obrys" type="button">Pomiń</button></div></div></section>`;
    else {
      const f = STAN === '3-firma';
      const a = f ? [['rung', 'Opisz pierwsze zlecenie'], ['search', 'Przejrzyj katalog Liderów'], ['ladder', 'Zobacz gotowe usługi']] : [['ladder', 'Uzupełnij profil, który zobaczą Firmy'], ['search', 'Znajdź zlecenie dla siebie'], ['lantern', 'Odpowiedz na pytanie innego Lidera']];
      k = `<section><h2>Pierwszy ruch</h2><p class="cicho">Wybierz jedną rzecz. Reszta poczeka — do wszystkiego wrócisz z panelu.</p><div class="wybory">${a.map(([n, t]) => `<button class="wybor" type="button">${art(n)}<strong>${t}</strong></button>`).join('')}</div>${f ? '' : pierwszy(true)}<div class="akcje-k" style="margin-top:20px"><button class="btn obrys" type="button">Przejdź do panelu</button></div></section>`;
    }
    rama(`<div class="start"><div class="start-hero"><div><p class="nadtytul">Pierwsza mila</p><h1>Witaj u podnóża</h1><p>Leaders of Teams stoi na jednej zasadzie: <strong>status trzeba zapracować</strong>. Poziomu nie da się kupić ani wyrekrutować — zdobywa się go, gdy drugi człowiek uzna Twoją pracę: Firma po zrealizowanym zleceniu albo Lider, którego odpowiedź faktycznie pomogła.</p><p class="cicho">Trzy krótkie kroki. Każdy możesz pominąć.</p></div><div>${drabinaArt()}</div></div>
      ${kroki}${k}${krok < 3 ? '<p class="pomin"><button class="link" type="button">Pomiń kreator</button></p>' : ''}</div>`, { zalogowany: true, lista: ['2', '2-blad', '2-zapis', '3', '3-firma'] });
  }

  // ═════════ 404, błąd, ładowanie ═════════
  function stan() {
    let k;
    if (STAN === 'blad') k = `<div class="pelny-stan" role="alert"><div class="stan-ikona zle">${I('warning')}</div><h1>Coś poszło nie tak</h1><p>Nie udało się wczytać tej strony. Spróbuj ponownie — jeśli problem wraca, wróć za kilka minut.</p><button class="btn glowny" type="button">${I('arrow-clockwise')}Spróbuj ponownie</button></div>`;
    else if (STAN === 'ladowanie') k = `<div class="szk" role="status" aria-busy="true" aria-label="Wczytywanie">${sz('34%', 30)}${sz('62%', 14, 'm')}${[0, 1, 2, 3, 4].map(() => `<div class="karta-sz">${sz('44px', 44, 'kolo')}<div>${sz('46%', 15)}${sz('88%', 13, 'm')}${sz('64%', 13, 'm')}</div></div>`).join('')}</div>`;
    else k = `<div class="pelny-stan">${drabinaArt('<path d="M20 424h30M300 52h24" style="stroke:var(--line-2)" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 12"/>')}<h1>404 — ta strona nie istnieje</h1><p>Rekord mógł zostać usunięty albo adres jest niepełny.</p><a class="btn glowny" href="${href('landing.html')}">Wróć na stronę główną</a></div>`;
    rama(k, { lista: ['blad', 'ladowanie'] });
  }

  window.Pub = { landing, logowanie, rejestracja, haslo, wypis, dokument, start, stan };
  addEventListener('resize', () => scena());
})();
