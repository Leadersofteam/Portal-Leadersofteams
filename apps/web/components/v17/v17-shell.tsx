'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { NotificationCountBadge } from '@/components/notification-bell';
import { V17_BOTTOM, V17_MENU, v17Active } from '@/lib/v17-menu';
import { useSession } from '@/lib/use-session';

import { GridBg } from './grid-bg';
import { CaretLeft, CaretRight, MagnifyingGlass, V17Icon, X } from './v17-icons';

const KEY = 'lot_v17_menu';

// Rama V17: szyna 76 px ↔ panel 256 px (przycisk i skrót `[`, stan w
// localStorage), pasek górny, dolny pasek telefonu + arkusz „Więcej", tło
// siatki. Renderuje się TYLKO dla zalogowanego (gość zostaje przy starym
// nagłówku — nie tracimy „Zaloguj się"), a flagę wyglądu czyta z <html>.
// Gdy rama jest aktywna, ustawiamy html[data-v17-rama] — CSS chowa wtedy stary
// nagłówek i dolny pasek, więc nic nie dubluje się ani nie miga w SSR.
export function V17Shell() {
  const { user } = useSession();
  const pathname = usePathname();
  const [on, setOn] = useState(false);
  const [wide, setWide] = useState(false);
  const [sheet, setSheet] = useState(false);

  useEffect(() => {
    setOn(document.documentElement.dataset.wyglad === 'v17');
    try {
      setWide(localStorage.getItem(KEY) === 'panel');
    } catch {
      /* tryb prywatny — stan tylko w pamięci */
    }
  }, []);

  const rama = on && !!user;
  useEffect(() => {
    const el = document.documentElement;
    if (rama) el.dataset.v17Rama = '1';
    else delete el.dataset.v17Rama;
    return () => {
      delete el.dataset.v17Rama;
    };
  }, [rama]);
  useEffect(() => {
    document.documentElement.dataset.v17Menu = wide ? 'panel' : 'szyna';
  }, [wide]);
  useEffect(() => setSheet(false), [pathname]);

  const toggle = useCallback(() => {
    setWide((w) => {
      try {
        localStorage.setItem(KEY, w ? 'szyna' : 'panel');
      } catch {
        /* patrz wyżej */
      }
      return !w;
    });
  }, []);
  useEffect(() => {
    if (!rama) return;
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key === '[' && !/INPUT|TEXTAREA|SELECT/.test(t?.tagName ?? '') && !t?.isContentEditable)
        toggle();
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [rama, toggle]);

  if (!rama) return null;
  const inicjaly = (user?.displayName ?? '?')
    .split(/\s+/)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <>
      <GridBg />
      <aside className="v17-menu" aria-label="Menu główne">
        <button
          type="button"
          className="v17-menu-toggle"
          onClick={toggle}
          aria-expanded={wide}
          aria-label={wide ? 'Zwiń menu do szyny' : 'Rozwiń menu'}
          title="Zwiń / rozwiń ([)"
        >
          {wide ? <CaretLeft size={16} weight="bold" /> : <CaretRight size={16} weight="bold" />}
        </button>
        <nav>
          {V17_MENU.map((s) => (
            <div className="v17-sec" key={s.title}>
              <p className="v17-sec-t">{s.title}</p>
              {s.items.map((it) => {
                const act = v17Active(pathname, it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className={`v17-mi${act ? ' on' : ''}`}
                    aria-current={act ? 'page' : undefined}
                    data-tip={it.label}
                  >
                    <span className="v17-ik">
                      <V17Icon name={it.icon} />
                      {it.badge && <NotificationCountBadge />}
                    </span>
                    <span className="v17-lb">{it.label}</span>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
      </aside>

      <header className="v17-bar">
        <Link href="/" className="v17-logo" aria-label="Leaders of Teams — strona główna">
          <img src="/icon.svg" alt="" width={32} height={32} />
        </Link>
        <span className="v17-bc">
          <b>{pathname === '/panel' ? 'Panel' : 'Portal'}</b>
        </span>
        <span className="v17-sp" />
        <Link href="/szukaj" className="v17-szuk">
          <MagnifyingGlass size={15} weight="bold" aria-hidden="true" />
          <span>Szukaj zleceń, Liderów, firm</span>
        </Link>
        <Link
          href="/panel/konto"
          className="v17-av"
          aria-label={`Konto: ${user?.displayName ?? ''}`}
        >
          {inicjaly}
        </Link>
      </header>

      <nav className="v17-dol" aria-label="Nawigacja główna">
        {V17_BOTTOM.map((it) => {
          const act = v17Active(pathname, it.href);
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`v17-di${act ? ' on' : ''}`}
              aria-current={act ? 'page' : undefined}
            >
              <span className="v17-ik">
                <V17Icon name={it.icon} size={22} />
                {it.badge && <NotificationCountBadge />}
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`v17-di${sheet ? ' on' : ''}`}
          onClick={() => setSheet(true)}
          aria-haspopup="dialog"
        >
          <span className="v17-ik">
            <V17Icon name="DotsThreeOutline" size={22} />
          </span>
          <span>Więcej</span>
        </button>
      </nav>

      {sheet && (
        <div
          className="v17-arkusz"
          role="dialog"
          aria-modal="true"
          aria-label="Wszystkie moduły"
          onClick={() => setSheet(false)}
        >
          <div className="v17-arkusz-in" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="v17-arkusz-x"
              onClick={() => setSheet(false)}
              aria-label="Zamknij"
            >
              <X size={18} weight="bold" />
            </button>
            {V17_MENU.map((s) => (
              <div key={s.title}>
                <p className="v17-sec-t">{s.title}</p>
                <div className="v17-arkusz-sieć">
                  {s.items.map((it) => (
                    <Link
                      key={it.href}
                      href={it.href}
                      className={`v17-mi${v17Active(pathname, it.href) ? ' on' : ''}`}
                    >
                      <span className="v17-ik">
                        <V17Icon name={it.icon} />
                      </span>
                      <span className="v17-lb">{it.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
