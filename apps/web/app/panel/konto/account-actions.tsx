'use client';

import { useState } from 'react';

import { ApiRequestError, apiFetch } from '@/lib/api';

// Słowo potwierdzenia zamiast natywnego `confirm()`. Dwa powody, oba praktyczne:
// natywnego dialogu nie da się uczciwie przejść w e2e (a tę ścieżkę MUSIMY
// przechodzić końcem-końca, bo „backend gotowy" ≠ „funkcja działa"), a operacja
// nieodwracalna nie powinna dać się wyklikać dwoma odruchowymi kliknięciami.
const CONFIRM_WORD = 'USUWAM';

export function AccountActions() {
  const [exportState, setExportState] = useState<'idle' | 'pending' | 'done'>('idle');
  const [exportError, setExportError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function downloadExport() {
    setExportError(null);
    setExportState('pending');
    try {
      const data = await apiFetch<Record<string, unknown>>('/me/export');
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      // Blob + kliknięty programowo `<a download>`, a NIE `window.open` ani
      // `target="_blank"`: w zainstalowanej PWA nowa karta nie pobiera pliku,
      // tylko otwiera pusty widok. Sprawdzona pułapka z sąsiedniego projektu.
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `leaders-of-teams-moje-dane-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      // Zwolnienie po chwili — natychmiastowe `revokeObjectURL` potrafi ubiec
      // rozpoczęcie pobierania w części przeglądarek.
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setExportState('done');
    } catch (err) {
      setExportError(
        err instanceof ApiRequestError ? err.message : 'Nie udało się przygotować pliku.',
      );
      setExportState('idle');
    }
  }

  async function deleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiFetch('/me', { method: 'DELETE' });
      // Pełne przeładowanie, nie `router.push`: ciastko sesji kasuje SERWER
      // w odpowiedzi na to żądanie, a router kliencki zostałby ze starym
      // stanem i pokazywał zalogowany nagłówek na koncie, którego już nie ma.
      window.location.assign('/');
    } catch (err) {
      setDeleteError(err instanceof ApiRequestError ? err.message : 'Nie udało się usunąć konta.');
      setDeleting(false);
    }
  }

  return (
    <>
      <section className="card mt-3">
        <h3>Pobierz swoje dane</h3>
        <p>
          Plik JSON z kompletem tego, co Portal o Tobie przechowuje: konto, profil Lidera,
          portfolio, zlecenia i oferty, wpisy, komentarze, pytania i odpowiedzi, obserwowania,
          zakładki, ulubione usługi oraz metadane wgranych plików (art. 20 RODO).
        </p>
        {exportError && <div className="error-box">{exportError}</div>}
        <div className="actions-row">
          <button
            className="btn"
            onClick={() => void downloadExport()}
            disabled={exportState === 'pending'}
          >
            {exportState === 'pending' ? 'Przygotowuję…' : 'Pobierz swoje dane (JSON)'}
          </button>
          {exportState === 'done' && <span className="badge success">Plik pobrany</span>}
        </div>
      </section>

      <section className="card mt-3 danger-zone">
        <h3>Usuń konto</h3>
        <p>
          Operacja jest <strong>nieodwracalna</strong> i działa od razu — wylogujemy Cię wszędzie.
        </p>

        {/* Opis MUSI zgadzać się z kodem (identity/service.ts → anonymizeAccount
            i `anonymizeUserContent` każdego modułu), a nie z tym, co brzmi ładnie.
            Deklaracja prawna rozjeżdżająca się z implementacją jest gorsza niż jej
            brak — dlatego jest tu wypisane także to, co ZOSTAJE. */}
        <p className="muted">Co znika bezpowrotnie:</p>
        <ul>
          <li>
            e-mail, nazwa, hasło i uchwyt <code>@</code>,
          </li>
          <li>awatar i wszystkie wgrane pliki — usuwane też z dysku,</li>
          <li>profil Lidera i portfolio; Twoje usługi trafiają do archiwum,</li>
          <li>
            obserwowania, reakcje, Twoja oś aktywności oraz obie prywatne półki — zakładki i
            ulubione usługi.
          </li>
        </ul>
        <p className="muted">Co zostaje, ale bez powiązania z Tobą:</p>
        <ul>
          <li>
            wpisy, komentarze, posty w grupach oraz pytania i odpowiedzi — jako{' '}
            <code>[treść usunięta]</code>, żeby nie rwać cudzych rozmów,
          </li>
          <li>
            oceny liczbowe (bez Twojego komentarza) — druga strona ma prawo do swojej historii,
          </li>
          <li>
            zlecenia firmy, dla której pracowałeś — to dokument dwóch stron, nie Twoje dane osobowe,
          </li>
          <li>
            jawny rejestr punktów Drabinki — zanonimizowany. Jest dopisywany tylko na koniec i nigdy
            nie zmieniany, bo na nim opiera się wiarygodność cudzych poziomów.
          </li>
        </ul>
        <p className="muted">
          Adres e-mail się zwalnia — jeśli kiedyś wrócisz, możesz założyć na niego nowe konto.
          Zaczniesz od zera: punktów nie da się przenieść.
        </p>

        {deleteError && <div className="error-box">{deleteError}</div>}

        <div className="field">
          <label htmlFor="confirm-delete">
            Wpisz <strong>{CONFIRM_WORD}</strong>, żeby odblokować przycisk
          </label>
          <input
            id="confirm-delete"
            name="confirm-delete"
            autoComplete="off"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
          />
        </div>
        <button
          className="btn danger"
          disabled={confirmText.trim() !== CONFIRM_WORD || deleting}
          onClick={() => void deleteAccount()}
        >
          {deleting ? 'Usuwam…' : 'Usuń konto na zawsze'}
        </button>
      </section>
    </>
  );
}
