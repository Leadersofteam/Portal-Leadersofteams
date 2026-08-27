import Link from 'next/link';

import { ECOSYSTEM_OTHERS } from '@/lib/ecosystem';
import { FooterAccountLinks } from '@/components/ui/footer-account-links';
import { LogoMark } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';

/**
 * Stopka serwisu — jedyne stałe miejsce z linkami prawnymi (wymóg launchowy
 * R-10; strony /regulamin i /prywatnosc dochodzą w sprincie launchowym).
 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="brand-block">
          <span
            className="brand"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.6rem', fontWeight: 700 }}
          >
            <LogoMark />
            Leaders of Teams
          </span>
          <p>
            Status, którego nie da się kupić ani wyrekrutować — tylko zapracować. Marketplace B2B i
            społeczność Liderów z jawnym, antymanipulacyjnym systemem awansu.
          </p>
          <ThemeToggle />
        </div>
        <div>
          <h4>Platforma</h4>
          <ul>
            <li>
              <Link href="/uslugi">Usługi Liderów</Link>
            </li>
            <li>
              <Link href="/zlecenia">Zlecenia</Link>
            </li>
            <li>
              <Link href="/liderzy">Liderzy</Link>
            </li>
            <li>
              <Link href="/grupy">Grupy branżowe</Link>
            </li>
            <li>
              <Link href="/drabinka">Drabinka Lidera</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Ekosystem</h4>
          {/* Cztery właściwości marki, ta sama lista i te same etykiety na
              każdej z nich (patrz `lib/ecosystem.ts`). Bez tego bloku człowiek,
              który trafił na Portal, nie miał skąd wiedzieć, że reszta istnieje. */}
          <ul>
            {ECOSYSTEM_OTHERS.map((link) => (
              <li key={link.href}>
                <a href={link.href} title={link.description} hrefLang={link.lang}>
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Konto i zasady</h4>
          <ul>
            <FooterAccountLinks />
            <li>
              <Link href="/regulamin">Regulamin</Link>
            </li>
            <li>
              <Link href="/prywatnosc">Polityka prywatności</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="site-footer-legal">
        © {new Date().getFullYear()} Leaders of Teams · leadersofteams.pl
      </div>
    </footer>
  );
}
