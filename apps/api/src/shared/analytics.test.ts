// Testy normalizacji ścieżek. Świadomie JEDNOSTKOWE (bez DATABASE_URL/REDIS_URL):
// testy integracyjne mają `describe.skipIf(!hasInfra)` i bez infry zielenią się
// przez POMINIĘCIE, więc bariera pamięciowa Redisa nie może zależeć wyłącznie
// od nich — musi być pilnowana testem, który wykona się ZAWSZE.
import { describe, expect, it } from 'vitest';

import {
  dayKey,
  DIRECT_SOURCE,
  normalizePath,
  normalizeSource,
  OTHER_PATH,
  OTHER_SOURCE,
} from './analytics';

describe('normalizePath', () => {
  it('zachowuje znane ścieżki statyczne', () => {
    expect(normalizePath('/')).toBe('/');
    expect(normalizePath('/uslugi')).toBe('/uslugi');
    expect(normalizePath('/panel/moderacja')).toBe('/panel/moderacja');
  });

  it('zwija identyfikatory do :id', () => {
    expect(normalizePath('/wpisy/clh3k2j9x0000abcdefghijkl')).toBe('/wpisy/:id');
    expect(normalizePath('/grupy/clh3k2j9x0000abcdefghijkl/pytania')).toBe('/grupy/:id/pytania');
    expect(normalizePath('/grupy/clh3k2j9x0000abcdefghijkl/post/clzzzzzzz0000abcdefghijkl')).toBe(
      '/grupy/:id/post/:id',
    );
  });

  it('NIE myli statycznego segmentu z identyfikatorem', () => {
    // Gdyby „nowa" wpadło pod :id, formularz dodawania usługi byłby nieodróżnialny
    // od jej oglądania — czyli lejek „ilu zaczęło wystawiać usługę" przestałby istnieć.
    expect(normalizePath('/uslugi/nowa')).toBe('/uslugi/nowa');
    expect(normalizePath('/zlecenia/nowe')).toBe('/zlecenia/nowe');
  });

  it('obcina query i fragment', () => {
    expect(normalizePath('/szukaj?q=marketing')).toBe('/szukaj');
    expect(normalizePath('/uslugi?strona=2#lista')).toBe('/uslugi');
  });

  it('wrzuca nieznane i skanowane adresy do jednego wiadra', () => {
    // To jest bariera pamięciowa: bez niej bot skanujący tysiąc adresów tworzy
    // tysiąc pól w dobowym hashu Redisa.
    expect(normalizePath('/wp-admin')).toBe(OTHER_PATH);
    expect(normalizePath('/.env')).toBe(OTHER_PATH);
    expect(normalizePath('/a/b/c/d/e/f/g/h')).toBe(OTHER_PATH);
    expect(normalizePath('nie-sciezka')).toBe(OTHER_PATH);
  });

  it('nie przepuszcza surowego uchwytu profilu', () => {
    // /profil/[handle] to dane o osobie — do statystyk wystarczy sam fakt odsłony.
    expect(normalizePath('/profil/maciej-nowak-1234567890123')).toBe('/profil/:id');
  });

  it('zwija KRÓTKIE identyfikatory tam, gdzie segment jest zawsze dynamiczny', () => {
    // Regresja z S18. Powyższy test przechodził, bo użyto w nim 27-znakowej
    // atrapy uchwytu — a realny uchwyt to `displayName` przycięty do 24 znaków
    // BEZ sufiksu, więc zwykle jest krótszy niż próg długości. Skutek: profile,
    // tematy i większość usług lądowały w wiadrze `/inne`, czyli najczęściej
    // odwiedzane strony treści były niepoliczalne.
    expect(normalizePath('/profil/macix')).toBe('/profil/:id');
    expect(normalizePath('/tematy/hr')).toBe('/tematy/:id');
    expect(normalizePath('/uslugi/seo-audyt-a1b2c3')).toBe('/uslugi/:id');
  });

  it('segment statyczny wygrywa z regułą dynamicznego rodzica', () => {
    // Gdyby reguła rodzica miała pierwszeństwo, formularz dodawania usługi
    // zlałby się z kartą usługi i lejek „ilu zaczęło wystawiać usługę" zniknąłby.
    expect(normalizePath('/uslugi/nowa')).toBe('/uslugi/nowa');
  });

  it('zna strony dodane w S14–S17', () => {
    // Biała lista była za kodem o dwa sprinty — to jest ten dług.
    expect(normalizePath('/reset-hasla')).toBe('/reset-hasla');
    expect(normalizePath('/weryfikacja')).toBe('/weryfikacja');
    expect(normalizePath('/nie-pamietam-hasla')).toBe('/nie-pamietam-hasla');
    expect(normalizePath('/panel/zapisane')).toBe('/panel/zapisane');
    expect(normalizePath('/grupy/nowa')).toBe('/grupy/nowa');
    expect(normalizePath('/firmy/clh3k2j9x0000abcdefghijkl')).toBe('/firmy/:id');
  });

  it('sonda zdrowia NIE jest znaną ścieżką', () => {
    // Druga linia obrony. Pierwszą jest wykluczenie `/healthz` z matchera
    // middleware (apps/web/middleware.ts) — gdyby ktoś je kiedyś usunął,
    // sonda ma wpaść do `/inne`, a nie urosnąć we własne pole hasha.
    expect(normalizePath('/healthz')).toBe(OTHER_PATH);
  });
});

describe('dayKey', () => {
  it('daje YYYY-MM-DD w UTC', () => {
    expect(dayKey(new Date('2026-08-13T22:30:00.000Z'))).toBe('2026-08-13');
    // Późny wieczór czasu polskiego to już kolejna doba UTC — spójność klucza
    // zapisu i odczytu jest ważniejsza niż zgodność z kalendarzem właściciela.
    expect(dayKey(new Date('2026-08-13T23:30:00.000Z'))).toBe('2026-08-13');
  });
});

// PL0: źródła ruchu. Te same dwa powody co wyżej — bariera pamięciowa
// i prywatność (host zamiast pełnego URL-a) muszą być pilnowane testem,
// który wykonuje się bez infrastruktury.
describe('normalizeSource', () => {
  it('sprowadza odsyłacz do samego hosta, bez www i bez ścieżki', () => {
    expect(normalizeSource('https://www.google.com/search?q=lider')).toBe('google.com');
    expect(normalizeSource('https://linkedin.com/in/ktos-tam')).toBe('linkedin.com');
  });

  it('własna domena to wejście bezpośrednie, nie źródło', () => {
    expect(normalizeSource('https://leadersofteams.pl/uslugi')).toBe(DIRECT_SOURCE);
    expect(normalizeSource('https://www.leadersofteams.pl/')).toBe(DIRECT_SOURCE);
  });

  it('brak odsyłacza = bezpośrednio', () => {
    expect(normalizeSource(undefined)).toBe(DIRECT_SOURCE);
    expect(normalizeSource('')).toBe(DIRECT_SOURCE);
    expect(normalizeSource(null)).toBe(DIRECT_SOURCE);
  });

  it('utm_source wygrywa z hostem i jest oczyszczony', () => {
    expect(normalizeSource('https://google.com', 'Newsletter Wrzesień!')).toBe(
      'utm:newsletterwrzesie',
    );
    expect(normalizeSource(undefined, 'zaproszenie')).toBe('utm:zaproszenie');
  });

  it('śmieci lądują w jednym wiadrze', () => {
    expect(normalizeSource('not a url')).toBe(OTHER_SOURCE);
    expect(normalizeSource('http://10.0.0.1/')).toBe(OTHER_SOURCE);
    expect(normalizeSource('http://intranet/')).toBe(OTHER_SOURCE);
    expect(normalizeSource(`https://${'a'.repeat(80)}.com/`)).toBe(OTHER_SOURCE);
  });
});
