// Fikstura danych makiet V17 PRO Portalu — WYMYŚLONE firmy, Liderzy, zlecenia, oceny, pytania.
// Wzór: /docker/leaders-of-teams-app/audyt/harness/v17-fixtura-firma.mjs (tam atrapy API na lokalnym bundlu App).
// Portal renderuje po stronie serwera (Next), więc atrapy API w przeglądarce nie wystarczą — makiety biorą dane z tego pliku:
//   node audyt/harness/v17-fixtura-portal.mjs   → docs/redesign-propozycje/v17/fixtura-portal.js (window.FIX = {...})
// Zasady (M287 z App + CLAUDE.md Portalu): NIGDY prawdziwe konta, e-maile, NIP-y ani markery demo z produkcji
// (@demo.leadersofteams.pl, DEMO-SEED). Nazwy celowo fikcyjne; liczby spójne z fizyką Drabinki (punkt = ocena albo uznana odpowiedź).
// Rozszerzenie 20.11 (makiety tożsamości P0'): kto dał światło, punkty w karencji, dwie ścieżki, przypięte realizacje, wpisy strumienia.
import fs from 'fs';
import path from 'path';

// Szczeble: DOSŁOWNIE z kodu (apps/api/src/modules/ladder/rules.ts), parsowane regexem — makieta nie może się rozjechać z regułami.
const rulesSrc = fs.readFileSync(
  path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../apps/api/src/modules/ladder/rules.ts',
  ),
  'utf8',
);
const POZIOMY = [
  ...rulesSrc.matchAll(
    /level:\s*(\d+),\s*name:\s*'([^']+)',\s*pointsRequired:\s*(\d+),\s*minPathSharePct:\s*(\d+),\s*unlocksAppAccess:\s*(true|false),\s*unlocksTeamCreation:\s*(true|false)/g,
  ),
].map((m) => ({
  n: +m[1],
  nazwa: m[2],
  prog: +m[3],
  minProc: +m[4],
  app: m[5] === 'true',
  zespol: m[6] === 'true',
}));
if (POZIOMY.length !== 7) throw new Error('rules.ts: oczekiwano 7 szczebli, jest ' + POZIOMY.length);
const stala = (n) => +rulesSrc.match(new RegExp(`export const ${n} = (\\d+)`))[1];

// Ola Wrzos: rynek 640 + społeczność 130 = 770 pkt → L3 Specjalista (700). L4 (1500) wymaga min. 300 z KAŻDEJ ścieżki — społeczność blokuje.
// Punkty „dojrzewają” 7 dni (MATURATION_DAYS) — w sumie ich jeszcze nie ma.
const OLA = {
  imie: 'Ola',
  nazwisko: 'Wrzos',
  handle: 'ola-wrzos',
  branza: 'Instalacje sanitarne',
  miasto: 'Gdynia',
  poziom: 3,
  rynek: 640,
  spolecznosc: 130,
  oczekujace: { rynek: 100, spolecznosc: 50 },
  ocenaSr: 4.8,
  ocen: 11,
  uznaneOdp: 3,
  zlecen: 12,
  swiatlo: [
    {
      kto: 'Kamienica Pod Lipą sp. z o.o.',
      typ: 'firma',
      zaco: 'Ocena 5/5 po zleceniu „Wymiana pionu wodnego”',
      pkt: 100,
      sciezka: 'rynek',
      kiedy: '15.11',
      status: 'dojrzewa',
      dni: 2,
    },
    {
      kto: 'Iga Sosna',
      typ: 'osoba',
      zaco: 'Uznana odpowiedź: „Pompa ciepła w budynku z 1930 r.”',
      pkt: 50,
      sciezka: 'spolecznosc',
      kiedy: '17.11',
      status: 'dojrzewa',
      dni: 4,
    },
    {
      kto: 'Piekarnia Złoty Kłos',
      typ: 'firma',
      zaco: 'Ocena 4/5 po zleceniu „Hydraulika w piekarni”',
      pkt: 80,
      sciezka: 'rynek',
      kiedy: '04.11',
      status: 'zaliczone',
    },
    {
      kto: 'Hotel Nad Zatoką',
      typ: 'firma',
      zaco: 'Ocena 5/5 — druga od tej firmy w roku, waga ×0,5',
      pkt: 50,
      sciezka: 'rynek',
      kiedy: '28.10',
      status: 'zaliczone',
    },
    {
      kto: 'Marta Jodła',
      typ: 'osoba',
      zaco: 'Uznana odpowiedź: „Zaliczka przy zleceniu powyżej 20 tys.”',
      pkt: 50,
      sciezka: 'spolecznosc',
      kiedy: '21.10',
      status: 'zaliczone',
    },
    {
      kto: 'Bartek Lis',
      typ: 'osoba',
      zaco: 'Kwalifikowany głos za odpowiedź o zaworach',
      pkt: 10,
      sciezka: 'spolecznosc',
      kiedy: '14.10',
      status: 'zaliczone',
    },
  ],
};

// Bartek Lis: bohater makiety profilu. 2400 + 900 = 3300 → L5 Mentor (3000; L5 wymaga min. 600 z każdej ścieżki — ma 900).
const BARTEK = {
  imie: 'Bartek',
  nazwisko: 'Lis',
  handle: 'bartek-lis',
  branza: 'Instalacje HVAC',
  miasto: 'Poznań',
  odKiedy: 'marzec 2026',
  poziom: 5,
  rynek: 2400,
  spolecznosc: 900,
  oczekujace: { rynek: 0, spolecznosc: 0 },
  ocenaSr: 4.9,
  ocen: 37,
  uznaneOdp: 12,
  zlecen: 41,
  opis: 'Klimatyzacja, wentylacja i pompy ciepła w obiektach usługowych. Pracuję z zespołem czterech monterów; odpowiadam za projekt i odbiór.',
  swiatlo: [
    {
      kto: 'Hotel Nad Zatoką',
      typ: 'firma',
      zaco: 'Ocena 5/5 po zleceniu „Serwis klimatyzacji — 12 pokoi”',
      pkt: 100,
      sciezka: 'rynek',
      kiedy: '12.11',
      status: 'zaliczone',
    },
    {
      kto: 'Marta Jodła',
      typ: 'osoba',
      zaco: 'Uznana odpowiedź: „Dobór pompy do budynku z 1930 r.”',
      pkt: 50,
      sciezka: 'spolecznosc',
      kiedy: '09.11',
      status: 'zaliczone',
    },
    {
      kto: 'Piekarnia Złoty Kłos',
      typ: 'firma',
      zaco: 'Ocena 5/5 po zleceniu „Wentylacja piekarni”',
      pkt: 100,
      sciezka: 'rynek',
      kiedy: '30.10',
      status: 'zaliczone',
    },
    {
      kto: 'Iga Sosna',
      typ: 'osoba',
      zaco: 'Kwalifikowany głos za odpowiedź o rekuperacji',
      pkt: 10,
      sciezka: 'spolecznosc',
      kiedy: '22.10',
      status: 'zaliczone',
    },
  ],
  realizacje: [
    { tytul: 'Klimatyzacja 12 pokoi', firma: 'Hotel Nad Zatoką', kiedy: 'listopad 2026', ocena: 5.0, ikona: 'snowflake' },
    { tytul: 'Wentylacja piekarni', firma: 'Piekarnia Złoty Kłos', kiedy: 'październik 2026', ocena: 4.8, ikona: 'wind' },
    { tytul: 'Pompa ciepła, kamienica z 1930 r.', firma: 'Kamienica Pod Lipą sp. z o.o.', kiedy: 'wrzesień 2026', ocena: 5.0, ikona: 'thermometer-hot' },
    { tytul: 'Modernizacja węzła cieplnego', firma: 'Hotel Nad Zatoką', kiedy: 'sierpień 2026', ocena: 4.9, ikona: 'gauge' },
    { tytul: 'Rekuperacja w biurowcu', firma: 'Biuro Rachunkowe Kalkulus', kiedy: 'lipiec 2026', ocena: 4.7, ikona: 'fan' },
    { tytul: 'Serwis chłodni', firma: 'Piekarnia Złoty Kłos', kiedy: 'czerwiec 2026', ocena: 5.0, ikona: 'cube' },
  ],
  uslugi: [
    { tytul: 'Przegląd i czyszczenie klimatyzacji', od: '180 zł / jedn.', ocenaSr: 4.9, ocen: 24, ikona: 'snowflake' },
    { tytul: 'Projekt wentylacji z rekuperacją', od: 'wycena', ocenaSr: 4.8, ocen: 9, ikona: 'wind' },
  ],
  odpowiedzi: [
    { tytul: 'Pompa ciepła w budynku z 1930 r. — od czego zacząć?', temat: 'HVAC', kiedy: '09.11', uznana: true },
    { tytul: 'Jak dobrać moc rekuperatora do lokalu usługowego?', temat: 'HVAC', kiedy: '27.10', uznana: true },
    { tytul: 'Czy serwis klimatyzacji wymaga odbioru protokołem?', temat: 'Formalności', kiedy: '11.10', uznana: false },
  ],
  oceny: [
    { kto: 'Hotel Nad Zatoką', typ: 'firma', ocena: 5, kiedy: '12.11', tekst: 'Wszystkie 12 pokoi w dwa dni, bez ani jednej poprawki.' },
    { kto: 'Piekarnia Złoty Kłos', typ: 'firma', ocena: 5, kiedy: '30.10', tekst: 'Nie zatrzymali produkcji, uprzedzili o każdym wyłączeniu.' },
    { kto: 'Kamienica Pod Lipą sp. z o.o.', typ: 'firma', ocena: 4, kiedy: '05.10', tekst: 'Dobra robota, protokół dostaliśmy z dwudniowym opóźnieniem.' },
    { kto: 'Biuro Rachunkowe Kalkulus', typ: 'firma', ocena: 5, kiedy: '19.07', tekst: 'Rekuperacja działa cicho, instrukcja czytelna.' },
  ],
};

// Nowy w Portalu: te same struktury bez danych — makiety stanu „pusty” nie udają niczego.
const NOWY = {
  imie: 'Nowy',
  nazwisko: 'Lider',
  handle: 'nowy-lider',
  branza: 'Branża nie podana',
  miasto: '—',
  odKiedy: 'dziś',
  poziom: 0,
  rynek: 0,
  spolecznosc: 0,
  oczekujace: { rynek: 0, spolecznosc: 0 },
  ocenaSr: null,
  ocen: 0,
  uznaneOdp: 0,
  zlecen: 0,
  opis: '',
  swiatlo: [],
  realizacje: [],
  uslugi: [],
  odpowiedzi: [],
  oceny: [],
};

export const FIX = {
  poziomy: POZIOMY,
  reguly: {
    karencjaDni: stala('MATURATION_DAYS'),
    odpowiedzUznana: stala('ANSWER_ACCEPTED_POINTS'),
    glosKwalifikowany: stala('ANSWER_UPVOTED_POINTS'),
    limitSpolecznosci: stala('COMMUNITY_WEEKLY_CAP'),
    oknoSpolecznosciDni: stala('COMMUNITY_WINDOW_DAYS'),
    oceny: { 5: 100, 4: 80, 3: 40, 2: 0 },
  },
  ja: OLA,
  jaPusty: NOWY,
  profil: BARTEK,
  profilPusty: NOWY,
  tematy: ['HVAC', 'Elektryka', 'Fotowoltaika', 'Formalności', 'Wykończenia', 'Rozliczenia'],
  feed: [
    {
      typ: 'zlecenie',
      autor: { nazwa: 'Hotel Nad Zatoką', rodzaj: 'firma', branza: 'Hotelarstwo, Sopot' },
      kiedy: '12 min',
      tekst: 'Szukamy ekipy do serwisu klimatyzacji w 12 pokojach przed sezonem zimowym.',
      embed: { tytul: 'Serwis klimatyzacji — 12 pokoi', meta: '8–12 tys. zł · termin 05.12 · 4 oferty' },
    },
    {
      typ: 'realizacja',
      autor: { nazwa: 'Marta Jodła', rodzaj: 'lider', poziom: 6, branza: 'Fotowoltaika, Gdańsk' },
      kiedy: '2 godz.',
      tekst: 'Skończyliśmy 15 kWp na dachu hotelu. Ocena 5/5 od zleceniodawcy już jest — dziękuję za zaufanie.',
      embed: { tytul: 'Montaż paneli PV 15 kWp', meta: 'ocena 5/5 od Hotel Nad Zatoką · kwiecień–maj' },
    },
    {
      typ: 'pytanie',
      autor: { nazwa: 'Tomek Brzoza', rodzaj: 'lider', poziom: 2, branza: 'Elektryka, Łódź' },
      kiedy: '4 godz.',
      tekst: 'Piszę protokół pomiarów po wymianie instalacji w lokalu usługowym. Co musi się w nim znaleźć, żeby odbiór przeszedł za pierwszym razem?',
      embed: { tytul: 'Protokół pomiarów po wymianie instalacji — co obowiązkowo?', meta: '2 odpowiedzi · temat: Formalności' },
    },
    {
      typ: 'usluga',
      autor: { nazwa: 'Iga Sosna', rodzaj: 'lider', poziom: 4, branza: 'Wykończenia, Wrocław' },
      kiedy: 'wczoraj',
      tekst: 'Dodałam nową usługę: kompleksowe wykończenie lokalu pod klucz, z harmonogramem w etapach.',
      embed: { tytul: 'Projekt i wykończenie lokalu usługowego', meta: 'wycena indywidualna · 4,7 (22 oceny)' },
    },
    {
      typ: 'zlecenie',
      autor: { nazwa: 'Kamienica Pod Lipą sp. z o.o.', rodzaj: 'firma', branza: 'Zarządzanie nieruchomościami, Kraków' },
      kiedy: 'wczoraj',
      tekst: 'Remont klatki schodowej w kamienicy z 1910 r., prace w dwóch etapach.',
      embed: { tytul: 'Remont klatki schodowej', meta: '25–40 tys. zł · termin 20.01 · 2 oferty' },
    },
    {
      typ: 'pytanie',
      autor: { nazwa: 'Ola Wrzos', rodzaj: 'lider', poziom: 3, branza: 'Instalacje sanitarne, Gdynia' },
      kiedy: '2 dni',
      tekst: 'Przy jakiej wartości zlecenia podpisujecie aneks z zaliczką, a przy jakiej wystarcza e-mail?',
      embed: { tytul: 'Jak rozliczyć zaliczkę przy zleceniu powyżej 20 tys.?', meta: '2 odpowiedzi · temat: Formalności' },
    },
    {
      typ: 'realizacja',
      autor: { nazwa: 'Bartek Lis', rodzaj: 'lider', poziom: 5, branza: 'Instalacje HVAC, Poznań' },
      kiedy: '3 dni',
      tekst: 'Wentylacja piekarni gotowa bez zatrzymania produkcji. Najtrudniejsze były okna czasowe, nie sama instalacja.',
      embed: { tytul: 'Wentylacja piekarni', meta: 'ocena 5/5 od Piekarnia Złoty Kłos · październik' },
    },
    {
      typ: 'zlecenie',
      autor: { nazwa: 'Piekarnia Złoty Kłos', rodzaj: 'firma', branza: 'Gastronomia, Toruń' },
      kiedy: '4 dni',
      tekst: 'Potrzebny przegląd instalacji elektrycznej przed kontrolą, najlepiej w dni bez wypieku.',
      embed: { tytul: 'Przegląd instalacji elektrycznej', meta: '2–3 tys. zł · termin 28.11 · 6 ofert' },
    },
  ],
  feedRazem: 87,
  uslugi: [
    { tytul: 'Przegląd i czyszczenie klimatyzacji', lider: 'Bartek Lis', poziom: 5, od: '180 zł / jedn.', ocenaSr: 4.9, ocen: 24, ikona: 'snowflake' },
    { tytul: 'Projekt i wykończenie lokalu usługowego', lider: 'Iga Sosna', poziom: 4, od: 'wycena', ocenaSr: 4.7, ocen: 22, ikona: 'paint-roller' },
  ],
};

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = path.resolve(
    path.dirname(new URL(import.meta.url).pathname),
    '../../docs/redesign-propozycje/v17/fixtura-portal.js',
  );
  fs.writeFileSync(
    out,
    `// WYGENEROWANE z audyt/harness/v17-fixtura-portal.mjs — nie edytuj ręcznie.\nwindow.FIX = ${JSON.stringify(FIX, null, 1)};\n`,
  );
  console.log('zapisano', path.relative(process.cwd(), out));
}
