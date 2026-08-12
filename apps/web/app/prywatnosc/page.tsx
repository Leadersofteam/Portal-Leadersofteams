export const metadata = {
  title: 'Polityka prywatności — Leaders of Teams',
  description: 'Polityka prywatności platformy leadersofteams.pl.',
};

// SZKIC polityki prywatności (bloker launchowy R-10). Sekcje [DO UZUPEŁNIENIA]
// wymagają decyzji właściciela przed startem produkcyjnym.
export default function PrivacyPage() {
  return (
    <main>
      <h1>Polityka prywatności</h1>
      <p className="muted">Wersja robocza — obowiązuje od dnia startu produkcyjnego.</p>

      <h2>1. Administrator danych</h2>
      <p>
        Administratorem danych osobowych jest [DO UZUPEŁNIENIA: dane podmiotu, adres, e-mail
        kontaktowy].
      </p>

      <h2>2. Jakie dane przetwarzamy i po co</h2>
      <ul>
        <li>
          <strong>Konto:</strong> e-mail, nazwa wyświetlana, hasło (wyłącznie jako skrót argon2id)
          — w celu świadczenia usługi (art. 6 ust. 1 lit. b RODO).
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
          <code> lot_sid</code>, niezbędne do logowania) — bezpieczeństwo i diagnostyka
          (art. 6 ust. 1 lit. f RODO).
        </li>
      </ul>

      <h2>3. Cookies</h2>
      <p>
        Portal używa wyłącznie niezbędnych plików cookie (sesja logowania). Nie używamy cookies
        marketingowych ani zewnętrznych narzędzi analitycznych.
      </p>

      <h2>4. Odbiorcy danych</h2>
      <p>
        Dane przechowywane są na serwerze w Unii Europejskiej. Zewnętrzni odbiorcy ograniczają się
        do: [DO UZUPEŁNIENIA po włączeniu: dostawca e-mail transakcyjnych (Brevo), anty-bot
        Cloudflare Turnstile].
      </p>

      <h2>5. Twoje prawa</h2>
      <ul>
        <li>
          <strong>Eksport danych:</strong> w panelu konta możesz pobrać komplet swoich danych
          (art. 20 RODO).
        </li>
        <li>
          <strong>Usunięcie konta:</strong> anonimizuje dane osobowe w miejscu; jawny rejestr
          punktów pozostaje bez powiązania z osobą (art. 17 RODO z uwzględnieniem integralności
          systemu ocen).
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
