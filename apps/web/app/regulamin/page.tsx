export const metadata = {
  title: 'Regulamin — Leaders of Teams',
  description: 'Regulamin platformy leadersofteams.pl.',
};

// Regulamin v1 (R-10). Dane operatora wg dokumentacji projektu; przy zmianie
// formy prawnej działalności zaktualizować §1.
export default function TermsPage() {
  return (
    <main>
      <h1>Regulamin platformy Leaders of Teams</h1>
      <p className="muted">Wersja 1.0 — obowiązuje od 12 sierpnia 2026 r.</p>

      <h2>§1. Postanowienia ogólne</h2>
      <ul>
        <li>
          Platforma leadersofteams.pl (dalej: „Portal") łączy specjalistów budujących reputację
          zawodową („Liderzy") z firmami poszukującymi wykonawców („Firmy").
        </li>
        <li>
          Operatorem Portalu jest Maciej Kucharski, twórca Leaders of Teams. Kontakt we wszystkich
          sprawach dotyczących Portalu:{' '}
          <a href="mailto:kontakt@leadersofteams.com">kontakt@leadersofteams.com</a>.
        </li>
        <li>Korzystanie z Portalu jest bezpłatne.</li>
      </ul>

      <h2>§2. Konta i role</h2>
      <ul>
        <li>Rejestracja wymaga adresu e-mail i akceptacji niniejszego regulaminu.</li>
        <li>
          Tytuł „Lider" oraz poziomy w Drabince Lidera zdobywa się wyłącznie ocenioną pracą i
          uznanym mentoringiem — zgodnie z jawnymi zasadami na stronie /drabinka. Punktów nie można
          kupić, przenieść ani otrzymać za zapraszanie innych osób.
        </li>
        <li>Profil Firmy może utworzyć każdy zarejestrowany użytkownik.</li>
      </ul>

      <h2>§3. Zlecenia, usługi i rozliczenia</h2>
      <ul>
        <li>
          Portal służy nawiązaniu kontaktu i formalizacji przebiegu współpracy (cykl zlecenia,
          oceny). <strong>Portal nie pośredniczy w płatnościach</strong> — rozliczenia następują
          bezpośrednio między Firmą a Liderem, poza Portalem.
        </li>
        <li>
          Ceny podawane w usługach Liderów oraz widełki budżetu zleceń mają charakter deklaratywny i
          nie stanowią oferty w rozumieniu Kodeksu cywilnego.
        </li>
        <li>
          Oceny publikowane są symultanicznie po obu stronach i nie mogą być usuwane na życzenie — z
          wyjątkiem treści naruszających prawo lub regulamin (moduł zgłoszeń).
        </li>
      </ul>

      <h2>§4. Treści użytkowników</h2>
      <ul>
        <li>
          Użytkownik odpowiada za publikowane treści (posty, komentarze, pytania, odpowiedzi, opisy
          usług) i oświadcza, że nie naruszają one praw osób trzecich.
        </li>
        <li>
          Zabronione są: spam, treści bezprawne, podszywanie się, manipulowanie ocenami i punktacją
          (w tym wymiany wzajemne) oraz działania o charakterze systemów promocyjnych typu MLM.
        </li>
        <li>
          Naruszenia obsługuje moduł zgłoszeń i moderacja; punkty zdobyte z naruszeniem zasad mogą
          zostać wstrzymane lub cofnięte (jawny rejestr punktów).
        </li>
      </ul>

      <h2>§5. Reklamacje i odpowiedzialność</h2>
      <ul>
        <li>
          Reklamacje i zgłoszenia:{' '}
          <a href="mailto:kontakt@leadersofteams.com">kontakt@leadersofteams.com</a> — odpowiadamy w
          terminie 14 dni.
        </li>
        <li>
          Portal nie jest stroną umów zawieranych między Firmą a Liderem i nie odpowiada za ich
          wykonanie.
        </li>
      </ul>

      <h2>§6. Postanowienia końcowe</h2>
      <ul>
        <li>
          Zasady przetwarzania danych osobowych opisuje{' '}
          <a href="/prywatnosc">Polityka prywatności</a>.
        </li>
        <li>
          Zmiany regulaminu ogłaszane są na Portalu z 14-dniowym wyprzedzeniem; zmiany zasad
          punktacji są wersjonowane i nie działają wstecz.
        </li>
      </ul>
    </main>
  );
}
