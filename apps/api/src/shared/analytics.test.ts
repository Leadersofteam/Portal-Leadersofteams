// Testy normalizacji ścieżek. Świadomie JEDNOSTKOWE (bez DATABASE_URL/REDIS_URL):
// testy integracyjne mają `describe.skipIf(!hasInfra)` i bez infry zielenią się
// przez POMINIĘCIE, więc bariera pamięciowa Redisa nie może zależeć wyłącznie
// od nich — musi być pilnowana testem, który wykona się ZAWSZE.
import { describe, expect, it } from 'vitest';

import { dayKey, normalizePath, OTHER_PATH } from './analytics';

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
});

describe('dayKey', () => {
  it('daje YYYY-MM-DD w UTC', () => {
    expect(dayKey(new Date('2026-08-13T22:30:00.000Z'))).toBe('2026-08-13');
    // Późny wieczór czasu polskiego to już kolejna doba UTC — spójność klucza
    // zapisu i odczytu jest ważniejsza niż zgodność z kalendarzem właściciela.
    expect(dayKey(new Date('2026-08-13T23:30:00.000Z'))).toBe('2026-08-13');
  });
});
