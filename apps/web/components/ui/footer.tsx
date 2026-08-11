import Link from 'next/link';

import { LogoMark } from '@/components/ui/logo';

/**
 * Stopka serwisu — jedyne stałe miejsce z linkami prawnymi (wymóg launchowy
 * R-10; strony /regulamin i /prywatnosc dochodzą w sprincie launchowym).
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="brand-block">
          <span className="brand" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}>
            <LogoMark />
            Leaders of Teams
          </span>
          <p>
            Status, którego nie da się kupić ani wyrekrutować — tylko zapracować. Marketplace B2B
            i społeczność Liderów z jawnym, antymanipulacyjnym systemem awansu.
          </p>
        </div>
        <div>
          <h4>Platforma</h4>
          <ul>
            <li><Link href="/zlecenia">Zlecenia</Link></li>
            <li><Link href="/liderzy">Liderzy</Link></li>
            <li><Link href="/grupy">Grupy branżowe</Link></li>
            <li><Link href="/drabinka">Drabinka Lidera</Link></li>
          </ul>
        </div>
        <div>
          <h4>Konto i zasady</h4>
          <ul>
            <li><Link href="/rejestracja">Załóż konto</Link></li>
            <li><Link href="/logowanie">Zaloguj się</Link></li>
            <li><Link href="/regulamin">Regulamin</Link></li>
            <li><Link href="/prywatnosc">Polityka prywatności</Link></li>
          </ul>
        </div>
      </div>
      <div className="site-footer-legal">
        © {new Date().getFullYear()} Leaders of Teams · leadersofteams.pl
      </div>
    </footer>
  );
}
