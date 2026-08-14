import Link from 'next/link';

export const metadata = {
  title: 'Polityka prywatności — Leaders of Teams',
  description: 'Polityka prywatności platformy leadersofteams.pl.',
};

// Polityka prywatności v1 (R-10). Sekcja 4 wymienia JEDYNEGO odbiorcę zewnętrznego:
// dostawcę poczty (Hostinger). Brevo i Cloudflare Turnstile usunięte 2026-08-13 —
// decyzja właściciela o minimalizowaniu dostawców po API. Jeśli kiedykolwiek
// dojdzie nowy odbiorca, ta sekcja MUSI zostać zaktualizowana PRZED włączeniem.
export default function PrivacyPage() {
  return (
    <main>
      <h1>Polityka prywatności</h1>
      <p className="muted">Wersja 1.0 — obowiązuje od 12 sierpnia 2026 r.</p>

      <h2>1. Administrator danych</h2>
      <p>
        Administratorem danych osobowych jest Maciej Kucharski, operator platformy Leaders of Teams.
        Kontakt w sprawach danych osobowych:{' '}
        <a href="mailto:kontakt@leadersofteams.com">kontakt@leadersofteams.com</a>.
      </p>

      <h2>2. Jakie dane przetwarzamy i po co</h2>
      <ul>
        <li>
          <strong>Konto:</strong> e-mail, nazwa wyświetlana, hasło (wyłącznie jako skrót argon2id) —
          w celu świadczenia usługi (art. 6 ust. 1 lit. b RODO).
        </li>
        <li>
          <strong>Treści profilu i aktywności:</strong> profil Lidera, portfolio, usługi, oferty,
          oceny, posty, pytania i odpowiedzi, rejestr punktów Drabinki — publiczne w zakresie
          opisanym na Portalu.
        </li>
        <li>
          <strong>Pliki:</strong> zdjęcia profilowe i portfolio — przechowywane na serwerze Portalu
          (UE), z usuniętymi metadanymi EXIF.
        </li>
        <li>
          <strong>Dane techniczne:</strong> logi serwera i identyfikator sesji (cookie
          <code> lot_sid</code>, niezbędne do logowania) — bezpieczeństwo i diagnostyka (art. 6 ust.
          1 lit. f RODO).
        </li>
      </ul>

      <h2>3. Cookies i statystyki</h2>
      <p>
        Portal używa wyłącznie niezbędnych plików cookie (sesja logowania). Nie używamy cookies
        marketingowych ani zewnętrznych narzędzi analitycznych.
      </p>
      <p>
        Prowadzimy własną, zanonimizowaną statystykę ruchu: zliczamy wyłącznie liczbę otwarć
        poszczególnych <strong>rodzajów stron</strong> w danej dobie. Nie zapisujemy adresów IP, nie
        tworzymy profilu przeglądania, nie rozpoznajemy powracających osób i nie da się na podstawie
        tych liczb wskazać konkretnego użytkownika. Identyfikatory treści są przed zapisem usuwane.
        Dane te przechowujemy nie dłużej niż 35 dni i nie udostępniamy ich nikomu.
      </p>

      <h2>4. Odbiorcy danych</h2>
      <p>
        Dane przechowywane są wyłącznie na serwerze Portalu w Unii Europejskiej. Nie korzystamy z
        zewnętrznej analityki ani z narzędzi marketingowych.
      </p>
      <p>
        <strong>Poczta:</strong> e-maile transakcyjne (potwierdzenie rejestracji, reset hasła,
        powiadomienia) wysyłamy przez serwer poczty naszego dostawcy hostingu, Hostinger
        International Ltd. Oznacza to, że Twój adres e-mail i treść takiej wiadomości przechodzą
        przez jego infrastrukturę. Nie przekazujemy mu żadnych innych danych i nie wykorzystujemy go
        do wysyłek marketingowych.
      </p>
      <p>
        <strong>Ochrona przed automatami:</strong> formularz rejestracji chroni nasz własny
        mechanizm, działający w całości na naszym serwerze. Nie używamy do tego zewnętrznej usługi
        (np. reCAPTCHA czy Cloudflare Turnstile), więc{' '}
        <strong>
          przy zakładaniu konta Twoja przeglądarka nie łączy się z żadną firmą trzecią
        </strong>{' '}
        i nikt poza nami nie dowiaduje się, że odwiedziłeś tę stronę. Mechanizm polega na krótkim
        obliczeniu wykonywanym automatycznie przez przeglądarkę — nie wymaga rozwiązywania zagadek,
        nie zapisuje żadnych plików na Twoim urządzeniu i nie profiluje Twojego zachowania.
      </p>

      <h2>5. Twoje prawa</h2>
      {/* Do S18 ta sekcja OBIECYWAŁA funkcję, której nie było: `/panel/konto`
          nie istniało, a eksport i usunięcie konta dało się wywołać wyłącznie
          curl-em. Odkąd strona istnieje, link jest tu obowiązkowy — prawo, do
          którego nie ma drogi, nie jest realizowane. */}
      <ul>
        <li>
          <strong>Eksport danych:</strong> w <Link href="/panel/konto">panelu konta</Link>{' '}
          pobierzesz komplet swoich danych jako plik JSON (art. 20 RODO).
        </li>
        <li>
          <strong>Usunięcie konta:</strong> w <Link href="/panel/konto">panelu konta</Link>;
          anonimizuje dane osobowe w miejscu, treści zostają jako „[treść usunięta]", a jawny
          rejestr punktów pozostaje bez powiązania z osobą (art. 17 RODO z uwzględnieniem
          integralności systemu ocen).
        </li>
        <li>Prawo dostępu, sprostowania, ograniczenia przetwarzania i skargi do PUODO.</li>
      </ul>

      <h2>6. Okres przechowywania</h2>
      <p>
        Dane konta — do czasu usunięcia konta. Logi techniczne — do 90 dni. Treści zanonimizowane —
        bezterminowo, bez powiązania z osobą.
      </p>
    </main>
  );
}
