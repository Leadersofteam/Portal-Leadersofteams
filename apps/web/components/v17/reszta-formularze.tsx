// Wspólne dla formularzy „Rynek — reszta” (zlecenie, usługa, firma). Bez hooków.
import type { Zalogowany } from '@/lib/v17-data';

import { Sz, SzWiersz } from './karty';
import type { Ja } from './rama';

export const jaRamy = (ja: Zalogowany): Ja => ({
  name: ja.displayName,
  level: ja.level,
  handle: ja.handle,
  avatarFileId: ja.avatarFileId,
});

/** Atrybuty kontrolki w `<Pole>`: błąd musi być powiązany z polem, nie tylko pokazany pod nim. */
export const kontrolka = (id: string, blad?: string) => ({
  id,
  'aria-invalid': blad ? true : undefined,
  'aria-describedby': blad ? `${id}-e` : undefined,
});

/** Kwota lub liczba dni wpisana ręcznie („8 000”) → liczba całkowita; null, gdy to nie liczba. */
export function calkowita(s: string): number | null {
  const cyfry = s.replace(/\s/g, '');
  return /^\d+$/.test(cyfry) ? Number(cyfry) : null;
}

// Formularz bywa dłuższy niż ekran telefonu — po nieudanym zapisie błąd musi sam się pokazać.
export function skupBlad(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
}

// Błąd z API pokazuje się w pasku nad formularzem, a przycisk jest na dole długiej strony.
export function skupPasek(form: HTMLFormElement | null) {
  requestAnimationFrame(() => {
    const pasek = form?.parentElement?.querySelector<HTMLElement>('.info.zle[role="alert"]');
    if (!pasek) return;
    pasek.tabIndex = -1;
    pasek.focus();
  });
}

export function SzkieletFormularza() {
  return (
    <div
      className="st"
      role="status"
      aria-busy="true"
      aria-label="Wczytywanie formularza"
      style={{ paddingTop: 14 }}
    >
      <Sz w="90px" h={14} m />
      <div style={{ display: 'grid', gap: 14, margin: '18px 0 24px' }}>
        <Sz w="58%" h={32} />
        <Sz w="76%" h={14} m />
      </div>
      {[0, 1, 2, 3, 4].map((i) => (
        <SzWiersz key={i} />
      ))}
    </div>
  );
}
