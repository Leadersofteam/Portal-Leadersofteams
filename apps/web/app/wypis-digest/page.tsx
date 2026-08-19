import { Suspense } from 'react';

import { UnsubscribeClient } from './unsubscribe-client';

export const metadata = {
  title: 'Wypis z powiadomień e-mail — Leaders of Teams',
  // Token wypisu siedzi w URL — strona nie może trafić do indeksu ani do
  // podglądów. robots.ts też ją wyklucza; podwójnie, bo koszt jest zerowy.
  robots: { index: false, follow: false },
};

// Strona lądowania z linku „wypisz się" w digeście. Działa BEZ logowania:
// token z maila jest dowodem posiadania skrzynki. Do 19.08 digest nie miał
// ŻADNEJ drogi wyłączenia — przy pierwszych realnych użytkownikach to problem
// RODO, nie kosmetyka.
export default function UnsubscribePage() {
  return (
    <main>
      <h1>Powiadomienia e-mail</h1>
      <Suspense fallback={<p className="muted">Chwila…</p>}>
        <UnsubscribeClient />
      </Suspense>
    </main>
  );
}
