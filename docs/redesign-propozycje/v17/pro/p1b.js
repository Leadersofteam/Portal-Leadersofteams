// Portal Liderów — P1 „Rynek”, reszta paczki (makieta 26.11.2026). Ładować po pro.js i rynek.js; na końcu TloSiec().
// ?motyw=dark|light, ?stan=… (lista stanów na ekranie w pasku na dole, desktop).
// Zasada tej paczki: na ekranach są WYŁĄCZNIE pola, które dziś istnieją w bazie. Żadnego miasta, terminu zlecenia, załączników ani logo.
// Teksty: z dzisiejszego kodu (apps/web), poprawione tam, gdzie obiecywały coś, czego Portal nie pokazuje.
// Dane fikcyjne; branże z apps/api/prisma/seed.ts; poziomy z modules/ladder/rules.ts. ADR-004/009/010 jak w pozostałych makietach.
(() => {
  const { q, STAN, L, I, aw, odz, okl, nav, gora, dolny, stopka, stany, komunikat, sz, szWiersz, bladEkranu } = Pro.h;
  const M = q.get('motyw') || '';
  const nb = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const zl = (n) => `${nb(n)} zł`;
  const link = (plik, stan = '') => `${plik}.html?stan=${stan}&motyw=${M}`;
  const gw = I('star-fill').replace('ph-star-fill', 'ph-star');
  const odm = (n, j, k, w) => (n === 1 ? j : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? k : w);
  const BRANZE = ['AI i automatyzacja', 'Design i UX', 'E-commerce', 'Finanse i księgowość', 'HR i rekrutacja', 'IT i programowanie', 'Marketing', 'Produkcja i logistyka', 'Sprzedaż', 'Zarządzanie projektami'];

  // ── Fikcyjne firmy i Liderzy (bez miast — Portal nie ma tego pola) ──
  const F = {
    meble: { n: 'Meblarnia Dębowy Kąt', firma: true, branza: 'Produkcja i logistyka', skrot: 'DK' },
    klinika: { n: 'Klinika Fizjoterapii Ruch', firma: true, branza: 'IT i programowanie', skrot: 'KR' },
    hurt: { n: 'Hurtownia Tulipan', firma: true, branza: 'E-commerce', skrot: 'HT' },
    biuro: { n: 'Biuro Rachunkowe Kalkulus', firma: true, branza: 'Finanse i księgowość', skrot: 'BK' },
    szkola: { n: 'Szkoła Językowa Most', firma: true, branza: 'Marketing', skrot: 'SM' },
  };
  const P = {
    ola: { n: 'Ola Wrzos', lv: 3, pkt: 770 },
    marta: { n: 'Marta Jodła', lv: 6, pkt: 6420 },
    bartek: { n: 'Bartek Lis', lv: 5, pkt: 3300 },
    ewa: { n: 'Ewa Cis', lv: 4, pkt: 2050 },
    kuba: { n: 'Kuba Grab', lv: 2, pkt: 390 },
    pawel: { n: 'Paweł Klon', lv: 0, pkt: 0 },
  };

  // ── Rama: zalogowany (Lider albo firma) i gość ──
  function strona(akt, tresc, { ja = F.meble, gosc = false, lista = [] } = {}) {
    let n = nav(akt, ja), g = gora(ja);
    if (gosc) {
      n = n.replace(/<li><a class="poz" href="(powiadomienia|profil)\.html"[\s\S]*?<\/li>/g, '').replace(/<button class="btn obrys duzy utworz"[\s\S]*?<\/button>/, '')
        .replace(/<a class="ja"[\s\S]*<\/a>\s*<\/nav>/, `<div class="ja">${I('user-circle')}<span class="kto"><b>Gość</b><small><a class="tl" href="#" style="display:inline-flex;align-items:center;min-height:44px;margin:-12px 0">Zaloguj się</a></small></span></div></nav>`);
      g = g.replace(/<a class="ikonka" href="#" aria-label="Powiadomienia[\s\S]*$/, `<a class="btn obrys maly" href="#">Zaloguj się</a></header>`);
    }
    document.body.innerHTML = `${g}<div class="rama szeroka">${n}<main class="kolumna" id="tresc">${tresc}</main></div>${dolny(akt)}${lista.length ? stany(lista) : ''}`;
    TloSiec();
    const akty = document.querySelector('[data-przesuw] [aria-current="page"]');
    if (akty) akty.parentElement.scrollLeft = akty.offsetLeft - akty.parentElement.offsetLeft - (akty.parentElement.clientWidth - akty.offsetWidth) / 2;
  }
  const wstecz = (t, h = '#') => `<a class="rn-wstecz" href="${h}">${I('arrow-left')}${t}</a>`;
  const stopkaSt = () => `<div class="rn-stopka rn-st-szer">${stopka()}</div>`;
  const info = (ik, html, kl = '', ak = '') => `<div class="info ${kl}" role="${kl === 'zle' ? 'alert' : 'status'}">${I(ik)}<div>${html}</div>${ak ? `<div class="ak">${ak}</div>` : ''}</div>`;
  const pole = (id, et, wej, { pom = '', err = '', licz = '' } = {}) =>
    `<div class="pf${err ? ' zle' : ''}"><label for="${id}">${et}${licz ? `<small>${licz}</small>` : ''}</label>${wej}${err ? `<span class="err" id="${id}-e">${I('warning-circle')}${err}</span>` : ''}${pom ? `<span class="pom">${pom}</span>` : ''}</div>`;
  const inp = (id, v = '', ph = '', typ = 'text', extra = '') => `<input id="${id}" type="${typ}" value="${v}" placeholder="${ph}" ${extra}>`;
  const sel = (id, opcje, wyb = 0) => `<select id="${id}">${opcje.map((o, i) => `<option${i === wyb ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  const szkielet = (t) => `<div class="st" role="status" aria-busy="true" aria-label="${t}" style="padding-top:14px">${sz('90px', 14, 'm')}<div style="display:grid;gap:14px;margin:18px 0 24px">${sz('58%', 32)}${sz('76%', 14, 'm')}</div>${Array.from({ length: 5 }, szWiersz).join('')}</div>`;

  // ═════════ /zlecenia/nowe — kreator (Oferteo): te same pola, trzy kroki ═════════
  const ZT = 'Uporządkowanie procesu ofertowania w dziale sprzedaży';
  const ZO = 'Mamy 6 handlowców, oferta powstaje tydzień i każdy robi ją inaczej. Chcemy jednego procesu, szablonu wyceny i tygodniowego rytmu przeglądu. Efekt w 2 miesiące.';
  function zlecenieNowe() {
    const lista = ['z-lidera', 'budzet', 'bledy', 'gosc', 'bez-firmy', 'ladowanie'];
    const gosc = STAN === 'gosc', krok2 = STAN === 'budzet' || STAN === 'bledy';
    if (STAN === 'ladowanie') return strona('zlecenia', szkielet('Wczytywanie formularza'), { lista });
    if (STAN === 'bez-firmy')
      return strona('zlecenia', `<div class="st">${wstecz('Zlecenia', link('zlecenia'))}${komunikat('buildings', 'Najpierw dodaj firmę', 'Zlecenia publikuje się w imieniu firmy. Utwórz profil firmowy — zajmie to minutę, potem wrócisz do zlecenia.', `<a class="btn glowny" href="${link('firma-nowa')}">${I('plus')}Utwórz profil firmy</a>`)}</div>`, { ja: P.ola, lista });
    const kroki = gosc ? [['Potrzeba', 'Tytuł, branża, opis, budżet'], ['Konto i firma', 'Jeden formularz'], ['Publikacja', 'Po potwierdzeniu e-maila']] : [['Potrzeba', 'Tytuł, branża, opis'], ['Budżet i poziom', 'Widełki i kto może złożyć ofertę'], ['Szkic i publikacja', 'Sprawdzasz i publikujesz']];
    const akt = krok2 ? 1 : 0;
    const pasek = `<ol class="kroki" aria-label="Kroki">${kroki.map(([t, o], i) => `<li${i === akt ? ' aria-current="step"' : ''}${i < akt ? ' class="ok"' : ''}><b>${i < akt ? I('check') + ' ' : ''}${i + 1}. ${t}</b><span>${o}</span></li>`).join('')}</ol>`;
    const firmaPole = pole('firma', 'Firma zlecająca', sel('firma', ['Meblarnia Dębowy Kąt', 'Dębowy Kąt Serwis']));
    const potrzeba = `<fieldset class="fs"><legend class="sr">Potrzeba</legend>
      ${gosc ? '' : firmaPole}
      ${pole('tyt', 'Tytuł', inp('tyt', gosc ? '' : ZT, 'np. Uporządkowanie procesu ofertowania w zespole sprzedaży'), { licz: 'od 5 do 140 znaków' })}
      ${pole('br', 'Branża', sel('br', ['Wybierz branżę', ...BRANZE], gosc ? 0 : 10))}
      ${pole('opis', 'Opis potrzeby', `<textarea id="opis" rows="6" placeholder="np. Mamy 12 handlowców, oferta powstaje tydzień i każdy robi ją inaczej. Chcemy jednego procesu i tygodniowego rytmu — efekt w 2 miesiące.">${gosc ? '' : ZO}</textarea>`, { licz: 'min. 20 znaków', pom: 'Napisz, co jest dziś, co ma być i po czym poznasz, że się udało.' })}
      ${gosc ? `<div class="pf2 ciasno">${pole('b1', 'Budżet od', `<span class="jedn">${inp('b1', '', 'np. 2000', 'text', 'inputmode="numeric"')}<span>zł</span></span>`)}${pole('b2', 'Budżet do', `<span class="jedn">${inp('b2', '', 'np. 5000', 'text', 'inputmode="numeric"')}<span>zł</span></span>`)}</div>
      ${pole('lv', 'Minimalny poziom Lidera', sel('lv', ['Bez wymagań (otwarte dla wszystkich)', ...L.map((x) => `Poziom ${x.n}+ · ${x.nazwa}`)]))}` : ''}
    </fieldset>`;
    const err = STAN === 'bledy';
    const budzet = `<fieldset class="fs"><legend class="sr">Budżet i poziom</legend>
      <div class="pf2 ciasno">${pole('b1', 'Budżet od', `<span class="jedn">${inp('b1', err ? '15000' : '8000', 'np. 2000', 'text', 'inputmode="numeric"')}<span>zł</span></span>`)}${pole('b2', 'Budżet do', `<span class="jedn">${inp('b2', err ? '12000' : '12000', 'np. 5000', 'text', `inputmode="numeric"${err ? ' aria-invalid="true" aria-describedby="b2-e"' : ''}`)}<span>zł</span></span>`, { err: err ? 'Kwota „do” jest niższa niż „od”' : '' })}</div>
      <div class="pf"><span class="et" id="lv-et">Minimalny poziom Lidera</span><div class="wyb-l" role="radiogroup" aria-labelledby="lv-et">
        ${[['Bez wymagań', 'otwarte dla wszystkich', 0], ...L.map((x) => [`Od poziomu ${x.n}`, x.nazwa, x.n])].map(([t, o, n]) => `<label data-cel-ok${n > 3 ? ' data-dalej hidden' : ''}><input type="radio" name="lv" ${n === (err ? 0 : 2) ? 'checked' : ''}>${n ? odz(n).replace(/>[^<>]*<\/span>$/, `>${t}</span>`) : t}<small>${o}</small></label>`).join('')}</div>
        <button class="btn tekst" type="button" data-poziomy style="justify-self:start">Pokaż poziomy 4–7</button>
        <span class="pom">Im wyższy próg, tym mniej Liderów może złożyć ofertę.</span></div></fieldset>`;
    const baner = STAN === 'z-lidera' ? info('user-focus', `<b>Zlecenie z myślą o: Ewa Cis.</b> Po publikacji trafi do zleceń z branży „Zarządzanie projektami” — <a href="#">Ewa Cis</a> i inni Liderzy z tej branży złożą ofertę, a Ty wybierzesz.`) : '';
    const btn = gosc ? 'Dalej: konto i firma' : krok2 ? 'Zapisz szkic zlecenia' : 'Dalej: budżet i poziom';
    const podglad = `<section class="fm-karta podglad" aria-label="Podgląd na liście zleceń"><h2>Tak zobaczą to Liderzy</h2>
      <div class="zl-w">${gosc ? '<span class="aw-pusty" aria-hidden="true">' + I('buildings') + '</span>' : aw(F.meble, 40)}<div style="min-width:0"><div class="zl-kto"><b>${gosc ? 'Twoja firma' : F.meble.n}</b>${gosc ? '' : `<span class="zw">${I('seal-check')}NIP — suma kontrolna OK</span>`}</div>
      <div class="zl-tyt">${gosc ? 'Tytuł Twojego zlecenia' : ZT}</div><div class="zl-fakty"><b>${gosc ? '— zł' : krok2 ? (err ? '15 000–12 000 zł' : '8 000–12 000 zł') : '— zł'}</b><span>${gosc ? 'Branża' : 'Zarządzanie projektami'}</span></div>${krok2 && !err ? `<div class="zl-wym">${I('lock-simple')}<span>Oferty od <b>L2 · Praktyk</b></span></div>` : ''}</div></div></section>`;
    strona('zlecenia', `<div class="fm"><div class="fm-gl">${wstecz('Zlecenia', link('zlecenia'))}
      <h1>${gosc ? 'Opisz, co ma powstać' : 'Nowe zlecenie'}</h1><p>${gosc ? 'Bez konta na start. Opiszesz potrzebę, a konto i firmę założysz w następnym kroku — jednym formularzem. Zlecenie opublikujesz po potwierdzeniu adresu e-mail.' : 'Zlecenie powstaje jako szkic — opublikujesz je po sprawdzeniu treści.'}</p></div>
      <div class="fm-t">${pasek}${baner}${err ? info('warning-circle', '<b>Nie zapisaliśmy zlecenia.</b> Popraw zaznaczone pole.', 'zle') : ''}
        <form onsubmit="return false">${krok2 ? budzet : potrzeba}
        <div class="fm-pasek">${krok2 ? `<a class="btn obrys" href="${link('zlecenie-nowe')}">${I('arrow-left')}Wstecz</a>` : ''}<span class="sp"></span><a class="btn glowny" href="${link('zlecenie-nowe', gosc || krok2 ? STAN : 'budzet')}">${btn}</a>
        ${gosc ? `<p class="pom">Masz już konto? <a class="tl" href="#">Zaloguj się</a> — szkic zostanie w tej karcie.</p>` : ''}</div></form></div>
      <aside class="fm-bok">${podglad}<section class="fm-karta"><h2>Co dalej</h2><p><b>Oferty przyjdą z kwotą i terminem.</b> Przy każdej zobaczysz poziom Lidera i oceny po zleceniach. Rejestracja, publikacja i oferty są bezpłatne.</p><p>Oferta ani wybór wykonawcy punktów nie dają — punkty daje dopiero Twoja ocena po realizacji.</p></section></aside></div>`,
      { ja: F.meble, gosc, lista });
    const b = document.querySelector('[data-poziomy]');
    b?.addEventListener('click', () => { document.querySelectorAll('[data-dalej]').forEach((e) => (e.hidden = false)); b.remove(); });
  }

  // ═════════ /uslugi/nowa i /uslugi/[slug]/edytuj — jeden formularz ═════════
  function pakiet(i, nazwa, cena, dni, zakres, usun) {
    const t = ['Podstawowy', 'Standard', 'Premium'][i];
    return `<div class="pkt-ed"><header><h3>${t}</h3>${usun ? `<button class="btn tekst" type="button">${I('trash')}Usuń pakiet</button>` : ''}</header>
      ${pole(`pn${i}`, 'Nazwa pakietu', inp(`pn${i}`, nazwa, 'np. Audyt / Wdrożenie / Wdrożenie + opieka'))}
      <div class="pf2 ciasno">${pole(`pc${i}`, 'Cena', `<span class="jedn">${inp(`pc${i}`, cena, '', 'text', 'inputmode="numeric"')}<span>zł</span></span>`)}${pole(`pd${i}`, 'Termin', `<span class="jedn">${inp(`pd${i}`, dni, '', 'text', 'inputmode="numeric"')}<span>dni</span></span>`)}</div>
      ${pole(`ps${i}`, 'Zakres', `<textarea id="ps${i}" rows="3">${zakres}</textarea>`, { licz: 'min. 10 znaków' })}</div>`;
  }
  const UT = 'Wdrożę automatyzację obiegu faktur w małej firmie';
  function formUslugi(edycja) {
    const lista = edycja ? ['szkic', 'archiwum', 'ladowanie', 'blad'] : ['start', 'bez-profilu', 'publikacja-nieudana', 'ladowanie'];
    if (STAN === 'ladowanie') return strona('uslugi', szkielet('Wczytywanie formularza'), { ja: P.ola, lista });
    if (STAN === 'blad') return strona('uslugi', `<div class="st">${wstecz('Moje usługi')}${bladEkranu('Nie udało się wczytać usługi')}</div>`, { ja: P.ola, lista });
    if (STAN === 'bez-profilu')
      return strona('uslugi', `<div class="st">${wstecz('Moje usługi')}${komunikat('identification-card', 'Najpierw utwórz profil Lidera', 'Usługi publikują Liderzy. Wybierz branżę i przedstaw się — potem wrócisz do formularza.', `<a class="btn glowny" href="#">${I('plus')}Utwórz profil Lidera</a>`)}</div>`, { ja: { n: 'Nowe Konto', lv: 0, pkt: 0 }, lista });
    const pusty = STAN === 'start';
    const pakiety = pusty
      ? pakiet(0, '', '', '', '', false)
      : pakiet(0, 'Audyt obiegu', '1200', '5', 'Mapa dzisiejszego obiegu faktur i lista miejsc do automatyzacji.', true) + pakiet(1, 'Wdrożenie', '4800', '21', 'Odczyt faktur, akceptacja w dwóch krokach, eksport do biura rachunkowego.', true);
    const foto = pusty
      ? `<button class="dod" type="button">${I('image-square')}Dodaj zdjęcia</button>`
      : `<div class="zdj">${[1, 4].map((s, i) => `<figure>${okl('el', s, false)}${i === 0 ? '<figcaption>Okładka</figcaption>' : ''}<button type="button" aria-label="Usuń zdjęcie">${I('x')}</button></figure>`).join('')}<button class="dod" type="button">${I('plus')}<span>Dodaj zdjęcie</span></button></div>`;
    let gorny = '';
    if (STAN === 'publikacja-nieudana') gorny = info('warning-circle', '<b>Szkic zapisany, ale nie opublikowany.</b> Nowe konta mają dzienny limit tej czynności (5). Limit odnowi się wkrótce — dojrzałe konta nie mają tego ograniczenia.', 'zle', `<a class="btn obrys maly" href="#">Moje usługi</a>`);
    if (STAN === 'archiwum') gorny = info('archive', '<b>Zarchiwizowanej usługi nie można edytować.</b> Historia i adres usługi zostają.', 'zle', `<a class="btn obrys maly" href="#">Moje usługi</a>`);
    const blok = STAN === 'archiwum';
    const stanUslugi = STAN === 'szkic' ? 'Szkic' : STAN === 'archiwum' ? 'Zarchiwizowana' : 'Opublikowana';
    strona('uslugi', `<div class="fm"><div class="fm-gl">${wstecz('Moje usługi')}<h1>${edycja ? 'Edytuj usługę' : 'Nowa usługa'}</h1>
      <p>${edycja ? (STAN === 'szkic' ? 'Szkic widzisz tylko Ty. Opublikujesz go w „Moich usługach”.' : STAN === 'archiwum' ? '' : 'Zmiany widać publicznie od razu po zapisaniu.') : 'Opisz konkretny rezultat, podziel ofertę na pakiety i zadeklaruj ceny. Usługa trafi do katalogu po publikacji.'}</p></div>
      <div class="fm-t">${gorny}<form onsubmit="return false"><fieldset ${blok ? 'disabled style="opacity:.55"' : ''} style="border:0;margin:0;padding:0;min-width:0">
        <div class="fs"><h2>Usługa</h2>
          ${pole('tyt', 'Tytuł usługi', inp('tyt', pusty ? '' : UT, 'np. Zbuduję i wdrożę automatyzację lejka sprzedaży'), { licz: 'od 10 do 120 znaków', pom: edycja ? 'Adres usługi (link) pozostaje bez zmian — także po zmianie tytułu.' : '' })}
          ${pole('br', 'Branża', sel('br', ['Wybierz branżę', ...BRANZE], pusty ? 0 : 1))}
          ${pole('opis', 'Opis — co dokładnie dostarczysz?', `<textarea id="opis" rows="6">${pusty ? '' : 'Faktury przestają krążyć mailem. Ustawiam odczyt danych, akceptację i eksport, a na koniec szkolę dwie osoby i zostawiam instrukcję na jedną stronę.'}</textarea>`, { licz: 'min. 50 znaków' })}
          ${pole('tagi', 'Tagi', inp('tagi', pusty ? '' : 'automatyzacja, faktury, księgowość', 'np. automatyzacja, CRM, sprzedaż'), { licz: 'opcjonalnie, do 5', pom: 'Po przecinku, każdy od 2 do 30 znaków.' })}</div>
        <div class="fs"><h2>Pakiety</h2><span class="pf"><span class="pom">Od jednego do trzech. Cena to Twoja deklaracja — Portal nie pośredniczy w płatnościach.</span></span>${pakiety}<button class="dod" type="button">${I('plus')}Dodaj pakiet</button></div>
        <div class="fs"><h2>Zdjęcia</h2>${foto}<span class="pf"><span class="pom">Do 6 zdjęć: JPEG, PNG lub WebP, każde do 5 MB. Pierwsze jest okładką.</span></span></div>
        <div class="fm-pasek">${edycja ? '<a class="btn obrys" href="#">Anuluj</a>' : ''}<span class="sp"></span><button class="btn glowny" type="button"${blok ? ' disabled' : ''}>${edycja ? 'Zapisz zmiany' : STAN === 'publikacja-nieudana' ? 'Opublikuj ponownie' : 'Opublikuj usługę'}</button></div></fieldset></form></div>
      <aside class="fm-bok"><section class="fm-karta podglad" aria-label="Podgląd w katalogu"><h2>Podgląd w katalogu</h2><div class="uk" style="margin-top:6px">${okl('el', 1, false)}<div class="ul">${aw(P.ola, 28)}<b>${P.ola.n}</b>${odz(P.ola.lv)}</div><div class="utyt">${pusty ? 'Tytuł Twojej usługi' : UT}</div><div class="ud"><span class="oc bez">Bez ocen</span><span class="cena">od <b>${pusty ? '— zł' : zl(1200)}</b></span></div></div></section>
        ${edycja ? `<section class="fm-karta"><h2>Status</h2><dl class="rn-dl"><div><dt>Teraz</dt><dd>${stanUslugi}</dd></div></dl><p style="margin-top:10px">Publikacja, wstrzymanie i archiwizacja są w „Moich usługach”.</p><a class="btn obrys" href="#">Moje usługi</a></section>` : ''}
        <section class="fm-karta"><h2>Skąd punkty</h2><p><b>Sama usługa punktów nie daje.</b> Punkty dostajesz od firmy, która oceni Cię po zrealizowanym zleceniu — do 100.</p></section></aside></div>`, { ja: P.ola, lista });
  }

  // ═════════ Strony branż ═════════
  const branzeChipy = (akt) => `<nav class="filtry" data-przesuw aria-label="Branże">${['Wszystkie branże', ...BRANZE].map((t) => `<a class="filtr" href="#" aria-pressed="${t === akt}"${t === akt ? ' aria-current="page"' : ''}>${t}</a>`).join('')}</nav>`;
  const okruchy = (a, t) => `<ol class="okruchy" aria-label="Ścieżka"><li><a href="#">${a}</a></li><li aria-current="page">${t}</li></ol>`;
  const inneWejscia = (linki) => `<section class="br-sek" aria-labelledby="iw"><h2 id="iw">Ta sama branża, inne wejścia</h2><ul class="br-linki">${linki.map((t) => `<li><a href="#">${t}${I('arrow-right')}</a></li>`).join('')}</ul></section>`;
  const ZL = [
    [F.klinika, 'Integracja rejestracji wizyt z systemem rozliczeń', [14000, 22000], 'dziś', 0, 0, true],
    [F.hurt, 'Przeniesienie sklepu na nowy serwer bez przerwy w sprzedaży', [3000, 6000], 'wczoraj', 3, 0, true],
    [F.biuro, 'Audyt kopii zapasowych i uprawnień w biurze (9 stanowisk)', [2500, 4000], '3 dni temu', 5, 2, false],
    [F.meble, 'Panel zamówień dla przedstawicieli handlowych', [28000, 45000], '5 dni temu', 2, 4, true],
    [F.szkola, 'Naprawa formularza zapisów i płatności na stronie', [800, 1500], 'tydzień temu', 6, 0, true],
    [F.klinika, 'Przypomnienia SMS o wizytach z kalendarza gabinetu', [1800, 3200], '2 tygodnie temu', 1, 0, true],
  ];
  function branzaZlecen() {
    const pusty = STAN === 'pusty';
    const wiersze = ZL.map(([f, t, [a, b], kiedy, of, od, nip]) => `<a class="zl-w" href="${link('zlecenie')}">${aw(f, 40)}<div style="min-width:0"><div class="zl-kto"><b>${f.n}</b>${nip ? `<span class="zw">${I('seal-check')}NIP — suma kontrolna OK</span>` : `<span class="zw brak">${I('question')}Bez NIP</span>`}<span>· ${kiedy}</span></div><div class="zl-tyt">${t}</div><div class="zl-fakty"><b>${nb(a)}–${zl(b)}</b></div>${od ? `<div class="zl-wym">${I('lock-simple')}<span>Oferty od <b>L${od} · ${L[od - 1].nazwa}</b></span></div>` : ''}</div><div class="zl-of"><b class="${of ? '' : 'zero'}">${of}</b><span>${odm(of, 'oferta', 'oferty', 'ofert')}</span></div></a>`).join('');
    strona('zlecenia', `<div class="rn-gl" style="display:block;padding-bottom:0">${okruchy('Wszystkie zlecenia', 'IT i programowanie')}</div>
      <div class="rn-gl" style="padding-top:6px"><h1>Zlecenia: IT i programowanie</h1><a class="btn glowny br-d" href="${link('zlecenie-nowe')}">${I('plus')}Dodaj zlecenie</a></div>
      <div class="br-gl"><p>Zlecenie IT opisuje stan obecny, oczekiwany efekt i ograniczenia (stack, terminy, dostęp). Próg „od poziomu” pozwala otworzyć je tylko dla sprawdzonych Liderów.</p><a class="btn glowny br-m" href="${link('zlecenie-nowe')}">${I('plus')}Dodaj zlecenie</a></div>
      ${branzeChipy('IT i programowanie')}
      ${pusty ? komunikat('clipboard-text', 'Brak otwartych zleceń w tej branży', 'Masz potrzebę z tego obszaru? Opisz ją — bez konta na start. Szukasz pracy? Zobacz, co oferują Liderzy tej branży.', `<a class="btn obrys" href="${link('branza-uslug')}">Usługi w tej branży</a>`) : `<div class="br-lista">${wiersze}</div><div class="wiecej"><button class="btn obrys" type="button">Pokaż więcej</button><small class="num">6 z 29</small></div>`}
      ${inneWejscia(['Usługi Liderów: IT i programowanie', 'Liderzy: IT i programowanie', 'Dla firm'])}<div class="rn-stopka">${stopka()}</div>`, { ja: P.ola, gosc: true, lista: ['pusty'] });
  }
  const UB = [
    [P.marta, 'Audyt bezpieczeństwa aplikacji webowej z listą poprawek', 3200, '4,9', 24, 21, 3],
    [P.bartek, 'Integracja sklepu z magazynem i programem do faktur', 5800, '4,8', 17, 15, 2],
    [P.ewa, 'Opieka nad serwerem małej firmy: kopie, aktualizacje, alarmy', 600, '5,0', 9, 8, 1],
    [P.ola, 'Wdrożę automatyzację obiegu faktur w małej firmie', 1200, '4,7', 6, 6, 2],
    [P.kuba, 'Strona firmowa na lekkim silniku, z formularzem i analityką', 2400, '4,6', 3, 3, 1],
    [P.pawel, 'Porządek w skrzynkach i uprawnieniach zespołu', 450, '', 0, 0, 1],
    [P.marta, 'Szkolenie zespołu z bezpiecznej pracy z hasłami i pocztą', 900, '4,9', 12, 11, 1],
    [P.ewa, 'Przeniesienie poczty firmowej na nową domenę', 700, '4,8', 7, 7, 1],
  ];
  function branzaUslug() {
    const pusty = STAN === 'pusty';
    const karty = UB.map(([o, t, c, oc, n, zr, pk], i) => `<article class="uk" style="position:relative"><a href="${link('usluga')}">${okl(['el', 'hvac', 'wyk', 'san', 'pv', 'chlod'][i % 6], i + 1, false)}</a><button class="ikonka" type="button" aria-pressed="${i === 1}" aria-label="${i === 1 ? 'Usuń z zapisanych' : 'Zapisz usługę'}" style="position:absolute;top:6px;right:6px;background:var(--surface);border-radius:var(--radius)">${I('bookmark-simple')}</button>
      <div class="ul">${aw(o, 28)}<b>${o.n}</b>${odz(o.lv)}</div><a class="utyt" href="${link('usluga')}">${t}</a>
      <div class="ud">${n ? `<span class="oc">${gw}${oc} <small>(${n})</small></span>` : '<span class="oc bez">Bez ocen</span>'}<span class="cena">od <b>${zl(c)}</b></span></div>
      <div class="data">${zr ? `${zr} ${odm(zr, 'zrealizowane zlecenie', 'zrealizowane zlecenia', 'zrealizowanych zleceń')} · ` : ''}${pk} ${odm(pk, 'pakiet', 'pakiety', 'pakietów')}</div></article>`).join('');
    strona('uslugi', `<div class="rn-gl" style="display:block;padding-bottom:0">${okruchy('Wszystkie usługi', 'IT i programowanie')}</div>
      <div class="rn-gl" style="padding-top:6px"><h1>Usługi Liderów: IT i programowanie</h1><a class="btn glowny br-d" href="${link('usluga-nowa')}">${I('plus')}Wystaw usługę</a></div>
      <div class="br-gl"><p>Wdrożenia, integracje, utrzymanie, audyty bezpieczeństwa. Pakiety z ceną i zakresem; poziom Lidera zdobyty realizacjami ocenionymi przez firmy, nie listą technologii.</p><a class="btn glowny br-m" href="${link('usluga-nowa')}">${I('plus')}Wystaw usługę</a></div>
      ${branzeChipy('IT i programowanie')}
      ${pusty ? komunikat('storefront', 'Jeszcze nikt nie wystawił tu usługi', 'Ta branża czeka na pierwszego Lidera. Jesteś nim? Wystaw usługę — albo zobacz otwarte zlecenia w tej branży.', `<a class="btn obrys" href="${link('branza-zlecen')}">Zlecenia w tej branży</a>`) : `<div class="rn-siatka">${karty}</div><div class="wiecej"><button class="btn obrys" type="button">Pokaż więcej</button><small class="num">8 z 33</small></div>`}
      ${inneWejscia(['Otwarte zlecenia: IT i programowanie', 'Liderzy: IT i programowanie', 'Szukam wykonawcy'])}<div class="rn-stopka">${stopka()}</div>`, { ja: P.ola, gosc: true, lista: ['pusty'] });
  }

  // ═════════ Wątki: /oferty/[id] i /zapytania/[id] ═════════
  const msg = (o, kiedy, tresc, ja, chip = '') => `<li class="msg${ja ? ' ja' : ''}">${aw(o, 40)}<div><div class="g"><b>${o.n}</b>${ja ? '<span>(Ty)</span>' : ''}<span>· ${kiedy}</span></div>${chip}<p>${tresc}</p></div></li>`;
  const odpForm = (et, ph) => `<form class="odp" onsubmit="return false">${pole('body', et, `<textarea id="body" rows="3" placeholder="${ph}"></textarea>`)}<div class="rzad"><small>Do 5000 znaków. Druga strona dostanie powiadomienie.</small><button class="btn glowny" type="button">${I('paper-plane-right')}Wyślij</button></div></form>`;
  const nicPkt = `<p class="rn-nic">${I('seal-check')}<span>Rozmowa punktów nie daje. <b>Punkty daje dopiero ocena po zrealizowanym zleceniu.</b></span></p>`;

  function oferta() {
    const lista = ['wyslana', 'pusty', 'zamknieta', 'ladowanie', 'blad'];
    const lider = STAN === 'wyslana';
    const ja = lider ? P.ewa : F.meble;
    if (STAN === 'ladowanie') return strona('zlecenia', szkielet('Wczytywanie rozmowy'), { ja, lista });
    if (STAN === 'blad') return strona('zlecenia', `<div class="st">${wstecz('Zlecenia', link('zlecenia'))}${bladEkranu('Nie udało się wczytać rozmowy')}</div>`, { ja, lista });
    const pusty = STAN === 'pusty', zam = STAN === 'zamknieta';
    const wiad = pusty || lider ? '' : `<ol class="msgs" aria-label="Wiadomości">${msg(F.meble, 'wczoraj, 15:20', 'Dzień dobry. Czy w cenie jest szkolenie dla dwóch osób i jedna wizyta u nas?', true)}${msg(P.ewa, 'wczoraj, 17:05', 'Tak, szkolenie jest w cenie. Pierwsze spotkanie robię na miejscu, kolejne zdalnie.', false)}${zam ? '' : msg(F.meble, 'dziś, 09:12', 'Dobrze. Kiedy najwcześniej możecie zacząć?', true)}</ol>`;
    const pustaTresc = `<div style="border-top:1px solid var(--line);margin-top:22px">${komunikat('chats-circle', 'Jeszcze nic tu nie ma', lider ? 'Firma może tu dopytać — a Ty doprecyzować ofertę.' : 'Dopytaj o zakres, termin albo cenę — Lider dostanie powiadomienie i e-mail.', '')}</div>`;
    const statusO = zam ? 'Odrzucona' : 'Złożona', statusZ = zam ? 'Wybrano Lidera' : 'Otwarte na oferty';
    strona('zlecenia', `<div class="wt"><div class="gl">${wstecz('Zlecenie: ' + ZT, link('zlecenie'))}<h1 class="st-h1" style="font-size:30px">Rozmowa o ofercie</h1>
        ${lider ? info('check-circle', `<b>Twoja oferta czeka na firmę.</b> ${F.meble.n} dostała powiadomienie i e-mail. Gdy odpowie albo wybierze Twoją ofertę, dowiesz się tak samo. Możesz tu dopisać, jeśli chcesz coś doprecyzować.`, 'ok', `<a class="btn obrys maly" href="#">Wszystkie Twoje oferty</a>`) : ''}</div>
      <aside aria-label="Oferta i zlecenie"><section class="fm-karta"><h2>${lider ? 'Firma zlecająca' : 'Oferent'}</h2><a class="kto-k" href="${lider ? link('firma') : '#'}">${aw(lider ? F.meble : P.ewa, 44)}<span><b>${lider ? F.meble.n : P.ewa.n}</b><small>${lider ? 'Profil firmy' : odz(P.ewa.lv)}</small></span></a></section>
        <section class="fm-karta"><h2>Oferta</h2><dl class="rn-dl"><div><dt>Propozycja</dt><dd>${zl(10400)}</dd></div><div><dt>Czas</dt><dd>30 dni</dd></div><div><dt>Budżet zlecenia</dt><dd>8 000–12 000 zł</dd></div><div><dt>Branża</dt><dd>Zarządzanie projektami</dd></div><div><dt>Status oferty</dt><dd>${statusO}</dd></div><div><dt>Status zlecenia</dt><dd>${statusZ}</dd></div></dl>${lider || zam ? '' : `<a class="btn obrys" href="${link('zlecenie')}">Porównaj i wybierz na stronie zlecenia</a>`}</section></aside>
      <div class="tr"><ol class="msgs" style="border-bottom:0" aria-label="Treść oferty">${msg(P.ewa, 'złożona 2 dni temu', 'Zaczynam od dwóch spotkań z handlowcami, potem piszę proces i szablon wyceny. Przez pierwszy miesiąc prowadzę tygodniowy przegląd razem z Wami.', lider)}</ol>
        <h2 style="margin:24px 0 0;font:800 20px/1.2 var(--font-display);letter-spacing:-.02em;color:var(--text-strong)">Rozmowa</h2>
        ${wiad || pustaTresc}
        ${zam ? info('lock-simple', '<b>Rozmowa jest zamknięta</b> — oferta nie jest już aktywna albo zlecenie zostało anulowane.') : odpForm('Wiadomość', lider ? 'Dopisz, co chcesz doprecyzować' : 'Dopytaj o zakres, termin albo cenę')}
        ${nicPkt}</div></div><div class="rn-stopka">${stopka()}</div>`, { ja, lista });
  }

  function zapytanie() {
    const lista = ['lider', 'przeksztalcone', 'zamkniete', 'ladowanie', 'blad'];
    const lider = STAN === 'lider';
    const ja = lider ? P.ola : F.biuro;
    const klient = F.biuro;
    const powrot = lider ? 'Moje usługi i zapytania' : 'Moje zapytania';
    if (STAN === 'ladowanie') return strona('uslugi', szkielet('Wczytywanie zapytania'), { ja, lista });
    if (STAN === 'blad') return strona('uslugi', `<div class="st">${wstecz('Moje usługi i zapytania')}${bladEkranu('Nie udało się wczytać zapytania')}</div>`, { ja, lista });
    const konw = STAN === 'przeksztalcone', zam = STAN === 'zamkniete', otw = !konw && !zam;
    const stanT = konw ? 'Przekształcone w zlecenie' : zam ? 'Zamknięte' : 'Otwarte';
    const chip = `<span class="temat" style="display:inline-flex;align-items:center;margin-top:8px;padding:0 8px">Pakiet: Wdrożenie · ${zl(4800)}</span>`;
    const akcje = !otw ? '' : `${lider ? '' : `<button class="btn obrys" type="button">${I('clipboard-text')}Przekształć w zlecenie</button><p style="margin-top:8px">Powstanie szkic zlecenia: tytuł i branża z usługi, budżet z cen pakietów, w opisie pierwsza wiadomość. Opublikujesz go po sprawdzeniu.</p>`}<button class="btn grozny" type="button">${I('x-circle')}Zamknij wątek</button><p style="margin-top:8px">Zamkniętego wątku nie można otworzyć ponownie.</p>`;
    strona('uslugi', `<div class="wt"><div class="gl">${wstecz(powrot)}<h1 class="st-h1" style="font-size:30px">Zapytanie: ${UT}</h1><p class="st-lid" style="font-size:14px;color:var(--text-muted)">Status: <b style="color:var(--text-strong)">${stanT}</b></p>
        ${konw ? info('check-circle', '<b>Z tego zapytania powstało zlecenie.</b> Dalsze ustalenia prowadzicie przy nim.', 'ok', `<a class="btn glowny" href="${link('zlecenie')}">Przejdź do zlecenia</a>`) : ''}</div>
      <aside aria-label="Usługa i działania"><section class="fm-karta"><h2>Usługa</h2><p><b>${UT}</b></p><dl class="rn-dl" style="margin-top:10px"><div><dt>Audyt obiegu<small>5 dni</small></dt><dd>${zl(1200)}</dd></div><div><dt>Wdrożenie<small>21 dni</small></dt><dd>${zl(4800)}</dd></div></dl><a class="btn obrys" href="${link('usluga')}">Zobacz usługę</a></section>
        ${akcje ? `<section class="fm-karta"><h2>Co dalej</h2>${akcje}</section>` : ''}</aside>
      <div class="tr"><ol class="msgs" aria-label="Wiadomości">${msg(klient, '24.11, 10:02', 'Dzień dobry, mamy około 120 faktur miesięcznie i dwie osoby do akceptacji. Czy wdrożenie obejmuje eksport do naszego programu księgowego?', !lider, chip)}${msg(P.ola, '24.11, 13:40', 'Tak. Potrzebuję tylko przykładowego pliku, który program przyjmuje. Termin z pakietu liczę od dnia, w którym go dostanę.', lider)}${zam ? '' : msg(klient, 'wczoraj, 08:55', 'Plik wyślemy w tym tygodniu.', !lider)}</ol>
        ${zam ? info('lock-simple', '<b>Wątek jest zamknięty.</b> Historia rozmowy zostaje.') : otw ? odpForm('Odpowiedź', 'Napisz odpowiedź') : ''}${nicPkt}</div></div><div class="rn-stopka">${stopka()}</div>`, { ja, lista });
  }

  // ═════════ /porownanie/[slug] ═════════
  function porownanie() {
    const inne = ['Fixly', 'Useme'];
    const kol = (t, l, my) => `<section class="fm-karta" style="padding:20px${my ? ';border-color:var(--text-muted)' : ''}"><h3 style="margin:0 0 4px;font:800 19px/1.25 var(--font-display);color:var(--text-strong)">${t}</h3><ul style="margin:0;padding:0;list-style:none">${l.map((x) => `<li style="display:flex;gap:12px;padding:12px 0;border-top:1px solid var(--line);font-size:14.5px;line-height:1.55;color:var(--text-body);margin-top:${0}">${I(my ? 'check-circle' : 'arrow-bend-up-right')}<span>${x}</span></li>`).join('')}</ul></section>`;
    const faq = [
      ['Czy w Leaders of Teams płacę za oferty albo kontakty?', 'Nie. Rejestracja, publikacja zlecenia, oferty i rozmowa są bezpłatne. Portal nie sprzedaje kontaktów ani widoczności — poziom Lidera zależy wyłącznie od ocen i uznania innych ludzi.'],
      ['Czym różni się poziom Lidera od opinii w serwisach zleceń?', 'Opinia to ocena jednego zlecenia. Poziom w Drabince to suma ocen i uznanego mentoringu z malejącymi zwrotami od tego samego kontrahenta — jedna zaprzyjaźniona firma nie wypchnie nikogo wysoko. Zero punktów za zapraszanie czy aktywność.'],
      ['Czy muszę mieć konto, żeby opisać potrzebę?', 'Nie na start. Opisujesz potrzebę bez konta, potem jednym formularzem zakładasz konto i firmę, a publikujesz po potwierdzeniu adresu e-mail.'],
    ];
    strona('zlecenia', `<div class="st"><div style="margin-top:6px">${okruchy('Dla firm', 'Porównanie z Oferteo')}</div><div class="dl-hero">
      <h1 class="st-h1">Oferteo a Leaders of Teams: kiedy które?</h1>
      <p class="st-lid">Oferteo to serwis zleceń dla wykonawców i firm: zleceniodawca opisuje potrzebę, wykonawcy odpowiadają, a serwis zarabia na dostępie wykonawców do kontaktów.</p>
      <p style="margin:10px 0 0;font-size:14px;color:var(--text-muted);max-width:66ch">Piszemy o modelach, nie o cenach — te się zmieniają. Jeśli Twoja potrzeba pasuje do pierwszej listy, idź tam. Jeśli do drugiej, zostań.</p></div>
      <div class="st-sek" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr));gap:16px">
        ${kol('Kiedy Oferteo', ['Szukasz wykonawcy do usługi lokalnej i fizycznej (remont, przewóz, naprawa) — tam jest gęsta baza takich firm.', 'Chcesz dużo ofert szybko i sam odsiać po cenie.', 'Nie potrzebujesz historii współpracy ani statusu wykonawcy — liczy się jeden kontakt.'], false)}
        ${kol('Kiedy Leaders of Teams', ['Zlecasz pracę koncepcyjną lub zarządczą B2B (marketing, IT, HR, finanse, projekty) i chcesz wiedzieć, kto wygrywał podobne zlecenia i jak został oceniony.', 'Zależy Ci na statusie wykonawcy, którego nie da się kupić: poziom w Drabince rośnie tylko z ocen po realizacjach i uznanego mentoringu.', 'Chcesz dopytać przed wyborem — przy każdej ofercie jest rozmowa, a po realizacji obie strony oceniają się symultanicznie.'], true)}</div>
      <section class="st-sek pyt-l" aria-labelledby="faq"><h2 id="faq">Najczęstsze pytania</h2>${faq.map(([a, b], i) => `<details${i === 0 ? ' open' : ''}><summary>${a}${I('caret-down')}</summary><p>${b}</p></details>`).join('')}</section>
      <section class="koniec" aria-labelledby="sp"><div><h2 id="sp">Sprawdź sam</h2><p>Potrzebę opiszesz bez konta.</p></div><div class="ak" style="display:flex;flex-wrap:wrap;gap:10px"><a class="btn glowny" href="${link('zlecenie-nowe', 'gosc')}">Opisz potrzebę</a><a class="btn obrys" href="#">Zobacz Liderów</a><a class="btn obrys" href="#">Jak działa Drabinka</a></div></section>
      <section class="st-sek"><h2>Inne porównania</h2><ul class="br-linki">${inne.map((t) => `<li><a href="#">${t}${I('arrow-right')}</a></li>`).join('')}</ul></section>${stopkaSt()}</div>`, { gosc: true });
  }

  // ═════════ /firmy/[id] ═════════
  function firma() {
    const lista = ['pusty', 'ladowanie', 'blad'];
    if (STAN === 'ladowanie') return strona('zlecenia', szkielet('Wczytywanie firmy'), { ja: P.ola, lista });
    if (STAN === 'blad') return strona('zlecenia', `<div class="st">${wstecz('Zlecenia', link('zlecenia'))}${bladEkranu('Nie udało się wczytać firmy')}</div>`, { ja: P.ola, lista });
    const p = STAN === 'pusty';
    const OP = [
      [P.ewa, 5, 'Jasny zakres od pierwszego dnia, decyzje w ciągu doby.', 'Plan produkcji na trzy zmiany', '12.11.2026'],
      [P.bartek, 4, 'Dobra współpraca. Dostęp do danych dostałem z tygodniowym opóźnieniem.', 'Integracja zamówień z magazynem', '28.10.2026'],
      [P.kuba, 5, '', 'Szablon wyceny dla przedstawicieli', '03.10.2026'],
    ];
    const ZF = [[ZT, 'Zarządzanie projektami', 'Otwarte na oferty'], ['Plan produkcji na trzy zmiany', 'Produkcja i logistyka', 'Zrealizowane'], ['Integracja zamówień z magazynem', 'IT i programowanie', 'Zrealizowane'], ['Zdjęcia katalogowe nowej linii', 'Marketing', 'Anulowane']];
    const liczby = p
      ? [['0', 'zrealizowanych z 0 opublikowanych zleceń'], ['—', 'jeszcze nikt nie ocenił tej firmy'], ['0', 'ocen wystawionych Liderom']]
      : [['5', 'zrealizowanych z 8 opublikowanych zleceń'], [`4,8<small style="font-size:15px;font-weight:600;color:var(--text-muted)">/5</small>`, 'średnia z 4 ocen od Liderów'], ['5', 'ocen wystawionych Liderom']];
    strona('zlecenia', `<div class="st">${wstecz('Zlecenia', link('zlecenia'))}
      <div class="firma-gl">${aw(p ? { n: 'Pracownia Nowy Start', firma: true, branza: 'Design', skrot: 'NS' } : F.meble, 72)}<div><h1 class="st-h1" style="margin:0 0 6px;font-size:30px">${p ? 'Pracownia Nowy Start' : F.meble.n}</h1><div class="zw${p ? ' brak' : ''}">${p ? '' : `${I('seal-check')}<span title="Sprawdziliśmy poprawność formalną numeru (sumę kontrolną). Nie weryfikujemy wpisu w rejestrze.">NIP — suma kontrolna OK</span><span>·</span>`}<span>Na Portalu od ${p ? 'mniej niż miesiąca' : '7 miesięcy'}</span></div></div></div>
      ${p ? '' : '<p class="st-lid" style="margin-top:16px;font-size:15.5px">Producent mebli kuchennych na wymiar. Zlecamy to, czego nie robimy sami: procesy, integracje i marketing.</p>'}
      <div class="liczby-r">${liczby.map(([a, b]) => `<div><b>${a}</b><span>${b}</span></div>`).join('')}</div>
      ${p ? '' : '<p style="margin:10px 0 0;font-size:12.5px;color:var(--text-muted)">Liczba NIP oznacza poprawną sumę kontrolną numeru. Nie weryfikujemy wpisu w rejestrze.</p>'.replace('Liczba NIP', 'Znak NIP')}
      <div class="dwie-f"><section class="st-sek" aria-labelledby="op"><h2 id="op">Opinie Liderów o tej firmie</h2>
        ${p ? komunikat('chat-teardrop-text', 'Brak opublikowanych opinii', 'Oceny pojawiają się dopiero wtedy, gdy obie strony je wystawią — albo po upływie okna 14 dni.', '') : OP.map(([o, n, t, zlec, d]) => `<article class="rn-ocena">${aw(o, 40)}<div><div class="g"><b>${o.n}</b><span class="of-ok" style="display:inline-flex" aria-label="${n} na 5">${gw}${n}/5</span><span>· ${d}</span></div>${t ? `<p>${t}</p>` : ''}<a class="tl" href="${link('zlecenie')}" style="display:inline-flex;align-items:center;min-height:44px;margin:-8px 0;font-size:13px">${zlec}</a></div></article>`).join('')}</section>
      <section class="st-sek" aria-labelledby="oz"><h2 id="oz">Ostatnie zlecenia</h2>
        ${p ? komunikat('clipboard-text', 'Jeszcze bez zleceń', 'Ta firma nie opublikowała jeszcze żadnego zlecenia.', '') : ZF.map(([t, br, s]) => `<a class="zl-w" style="grid-template-columns:minmax(0,1fr) auto" href="${link('zlecenie')}"><div style="min-width:0"><div class="zl-tyt" style="margin-top:0">${t}</div><div class="zl-fakty"><span>${br}</span></div></div><div style="text-align:right;font-size:13px;font-weight:650;color:${s === 'Otwarte na oferty' ? 'var(--text-strong)' : 'var(--text-muted)'}">${s}</div></a>`).join('')}</section></div>
      ${stopkaSt()}</div>`, { ja: P.ola, lista });
  }

  // ═════════ /firma/nowa ═════════
  function firmaNowa() {
    const lista = ['bledy', 'gosc'];
    const gosc = STAN === 'gosc', err = STAN === 'bledy';
    if (gosc)
      return strona('zlecenia', `<div class="st">${wstecz('Dla firm', link('dla-firm'))}${komunikat('buildings', 'Zaloguj się, żeby dodać firmę', 'Profil firmy jest przypisany do konta. Nie masz konta? Opisz potrzebę — konto i firmę założysz jednym formularzem.', `<a class="btn glowny" href="#">Zaloguj się</a><a class="btn obrys" href="${link('zlecenie-nowe', 'gosc')}">Opisz potrzebę</a>`)}</div>`, { gosc: true, lista });
    strona('zlecenia', `<div class="fm"><div class="fm-gl">${wstecz('Zlecenia', link('zlecenia'))}<h1>Dodaj firmę</h1><p>Rejestracja firmy jest otwarta — bez weryfikacji na starcie. Wiarygodność firmy budują oceny Liderów po zrealizowanych zleceniach.</p></div>
      <div class="fm-t">${err ? info('warning-circle', '<b>Nie utworzyliśmy firmy.</b> Popraw zaznaczone pole.', 'zle') : ''}<form onsubmit="return false"><div class="fs">
        ${pole('nazwa', 'Nazwa firmy', inp('nazwa', err ? 'Meblarnia Dębowy Kąt' : '', '', 'text', 'autocomplete="organization"'), { licz: 'od 2 do 120 znaków' })}
        ${pole('nip', 'NIP', inp('nip', err ? '1234567890' : '', '10 cyfr, bez kresek', 'text', `inputmode="numeric" maxlength="10"${err ? ' aria-invalid="true" aria-describedby="nip-e"' : ''}`), { licz: 'opcjonalnie', err: err ? 'Błędna suma kontrolna — sprawdź numer' : '', pom: 'Z poprawnym numerem przy firmie pojawi się znak „NIP — suma kontrolna OK”. Samego numeru nie pokazujemy.' })}
        ${pole('opis', 'Krótki opis', '<textarea id="opis" rows="4"></textarea>', { licz: 'opcjonalnie, do 2000 znaków' })}</div>
        <div class="fm-pasek"><span class="sp"></span><button class="btn glowny" type="button">Utwórz firmę</button></div></form></div>
      <aside class="fm-bok"><section class="fm-karta"><h2>Co zobaczą Liderzy</h2><p><b>Nazwę, opis, zlecenia i oceny.</b> Historia buduje się sama: opublikowane zlecenia, potem oceny w obie strony.</p></section><section class="fm-karta"><h2>Co dalej</h2><p>Po utworzeniu firmy przejdziesz do nowego zlecenia.</p></section></aside></div>`, { ja: P.ola, lista });
  }

  // ═════════ /dla-firm ═════════
  function dlaFirm() {
    const p = STAN === 'pusty';
    const kroki = [
      ['Opisz potrzebę', 'Tytuł, branża, widełki budżetu i kilka zdań o tym, co ma powstać. Konto założysz w następnym kroku — jednym formularzem, razem z nazwą firmy.'],
      ['Dostań oferty', 'Liderzy odpowiadają ofertą z kwotą i terminem. Przy każdej widzisz poziom w Drabince, punkty i oceny po zleceniach — żadnego z tych sygnałów nie da się kupić.'],
      ['Dopytaj i wybierz', 'Każda oferta ma rozmowę: dopytasz o zakres, termin albo cenę, zanim wybierzesz. O nowej ofercie i odpowiedzi dostaniesz e-mail.'],
      ['Odbierz pracę i oceń', 'Lider oddaje pracę, Ty potwierdzasz wykonanie. Oceniacie się nawzajem — obie oceny publikują się naraz, więc żadna strona nie ocenia „pod dyktando”.'],
    ];
    const drogi = [
      ['clipboard-text', 'Opisz potrzebę', 'Nie wiesz jeszcze kto — wiesz co. Publikujesz zlecenie z widełkami, Liderzy odpowiadają ofertą, Ty dopytujesz i wybierasz.', 'Dodaj zlecenie', link('zlecenie-nowe', 'gosc')],
      ['storefront', 'Wybierz gotową usługę', 'Konkretny zakres, deklarowana cena, pakiety. Wysyłasz zapytanie do Lidera i rozmawiacie w wątku — z niego powstaje zlecenie z pełnym cyklem ocen.', 'Przeglądaj usługi', link('uslugi')],
      ['user-focus', 'Zapytaj konkretnego Lidera', 'Katalog z poziomem w Drabince, ocenami i liczbą zrealizowanych zleceń. Na profilu Lidera jest przycisk „Zapytaj o usługę” albo „Zaproponuj zlecenie”.', 'Katalog Liderów', '#'],
    ];
    const FAQ = [
      ['Ile to kosztuje?', 'Nic. Portal nie pośredniczy w płatnościach i nie bierze prowizji — rozliczasz się bezpośrednio z Liderem.'],
      ['Czy firma musi być zweryfikowana?', 'Nie. Publikujesz od razu po potwierdzeniu adresu e-mail. NIP jest opcjonalny; wiarygodność firmy budują oceny Liderów po zrealizowanych zleceniach.'],
      ['Skąd wiem, że Lider jest dobry?', 'Z jego poziomu w Drabince. Punkty pochodzą wyłącznie z ocen po zrealizowanych zleceniach i z uznanego mentoringu — zero punktów za zapraszanie, płacenie czy aktywność. Każdy punkt ma jawne źródło.'],
      ['Mogę ograniczyć oferty do doświadczonych Liderów?', 'Tak — ustawiasz minimalny poziom przy zleceniu. Zlecenia bez wymagań są dobrym startem dla nowych Liderów, którzy budują pierwsze oceny.'],
    ];
    const uslugi = UB.slice(0, 3).map(([o, t, c, oc, n, zr, pk], i) => `<a class="uk" href="${link('usluga')}">${okl(['el', 'hvac', 'wyk'][i], i + 1, false)}<div class="ul">${aw(o, 28)}<b>${o.n}</b>${odz(o.lv)}</div><div class="utyt">${t}</div><div class="ud"><span class="oc">${gw}${oc} <small>(${n})</small></span><span class="cena">od <b>${zl(c)}</b></span></div></a>`).join('');
    const liderzy = [[P.marta, 'Bezpieczeństwo aplikacji i serwerów', '4,9', 24], [P.bartek, 'Integracje sprzedaży i magazynu', '4,8', 17], [P.ewa, 'Prowadzenie projektów w małych zespołach', '5,0', 9]];
    strona('zlecenia', `<div class="st"><section class="dl-hero" style="margin-top:18px"><div><h1 class="st-h1" style="margin-top:0;font-size:clamp(28px,4vw,46px)">Opisz, co ma powstać. Wybierz, komu ufasz.</h1>
        <p class="st-lid">Zlecenie opisujesz bez konta i bez prowizji. Oferty składają Liderzy, których poziom i oceny są jawne i zapracowane — a przy każdej ofercie masz rozmowę, żeby dopytać, zanim wybierzesz.</p>
        <div class="ak"><a class="btn glowny duzy" href="${link('zlecenie-nowe', 'gosc')}">${I('plus')}Dodaj zlecenie</a><a class="btn obrys duzy" href="${link('uslugi')}">Przeglądaj gotowe usługi</a></div></div>
        </section>
      <section class="st-sek" aria-labelledby="jak"><h2 id="jak">Od opisu do ocenionej pracy</h2><ol class="krok-l">${kroki.map(([a, b]) => `<li><div><h3>${a}</h3><p>${b}</p></div></li>`).join('')}</ol></section>
      <section class="st-sek" aria-labelledby="drogi"><h2 id="drogi">Trzy drogi do Lidera</h2><div class="dl-drogi">${drogi.map(([ik, t, o, b, h]) => `<a class="zl-w" href="${h}" style="grid-template-columns:40px minmax(0,1fr) auto;align-items:center"><span style="font-size:24px;color:var(--text-muted);display:grid;place-items:center">${I(ik)}</span><div><div class="zl-tyt" style="margin:0 0 4px">${t}</div><div class="zl-fakty"><span>${o}</span></div></div><span class="droga-cta" style="grid-column:auto;font-size:14px;font-weight:650;color:var(--text-strong);display:inline-flex;align-items:center;gap:6px">${b}${I('arrow-right')}</span></a>`).join('')}</div></section>
      ${p ? '' : `<section class="st-sek" aria-labelledby="gu"><h2 id="gu">Gotowe usługi: konkretny zakres, jawna cena</h2><div class="rn-siatka" style="padding:6px 0 8px">${uslugi}</div><a class="btn obrys" href="${link('uslugi')}">Wszystkie usługi</a></section>
      <section class="st-sek" aria-labelledby="ks"><h2 id="ks">Poziom to dowód, nie deklaracja</h2>${liderzy.map(([o, h, oc, n]) => `<a class="zl-w" href="#" style="grid-template-columns:48px minmax(0,1fr) auto;align-items:center">${aw(o, 48, true)}<div style="min-width:0"><div class="zl-kto"><b style="font-size:15px">${o.n}</b>${odz(o.lv)}</div><div class="zl-fakty" style="margin-top:4px"><span>${h}</span></div></div><div class="of-ok">${gw}${oc} <small>(${n} ${odm(n, 'ocena', 'oceny', 'ocen')})</small></div></a>`).join('')}<a class="btn obrys" style="margin-top:16px" href="#">Cały katalog Liderów</a></section>`}
      <section class="st-sek pyt-l" aria-labelledby="faq"><h2 id="faq">Najczęstsze pytania firm</h2>${FAQ.map(([a, b], i) => `<details${i === 0 ? ' open' : ''}><summary>${a}${I('caret-down')}</summary><p>${b}</p></details>`).join('')}</section>
      <section class="koniec" aria-labelledby="mk"><div><h2 id="mk">Masz konkretną potrzebę?</h2><p>Konto założysz po formularzu, razem z firmą.</p></div><a class="btn glowny duzy" href="${link('zlecenie-nowe', 'gosc')}">Dodaj zlecenie</a></section>
      <p class="porownaj">Porównaj: <a class="tl" href="${link('porownanie')}">Oferteo</a><a class="tl" href="#">Fixly</a><a class="tl" href="#">Useme</a></p>${stopkaSt()}</div>`, { gosc: true, lista: ['pusty'] });
  }

  Object.assign(window.Pro, { zlecenieNowe, uslugaNowa: () => formUslugi(false), uslugaEdycja: () => formUslugi(true), branzaZlecen, branzaUslug, oferta, zapytanie, porownanie, firma, firmaNowa, dlaFirm });
})();
