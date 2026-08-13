import { describe, expect, it, vi } from 'vitest';

import { createMailService } from './mail';

// Wybór transportu poczty. Testujemy to osobno, bo połowiczna konfiguracja
// (host bez hasła) to najczęstszy sposób, w jaki wysyłka wyłącza się PO CICHU —
// a wtedy reset hasła przestaje działać i nikt się o tym nie dowiaduje.

const BASE = { mailEnabled: true, mailFrom: 'no-reply@leadersofteams.pl', mailFromName: 'LoT' };

describe('createMailService — wybór transportu', () => {
  it('komplet danych własnej skrzynki (SMTP) włącza wysyłkę', () => {
    const mail = createMailService({
      ...BASE,
      smtpHost: 'smtp.hostinger.com',
      smtpUser: 'kontakt@leadersofteams.com',
      smtpPass: 'x',
    });
    expect(mail.enabled).toBe(true);
  });

  it('POŁOWICZNY SMTP (host bez hasła) NIE udaje działającej poczty', () => {
    const mail = createMailService({ ...BASE, smtpHost: 'smtp.hostinger.com' });
    expect(mail.enabled).toBe(false);
  });

  it('brak konfiguracji = jawny no-op, który loguje zamiast wysyłać', async () => {
    const log = vi.fn();
    const mail = createMailService({ ...BASE }, log);
    expect(mail.enabled).toBe(false);
    await mail.send({ to: 'kto@example.com', subject: 'Reset hasła', text: '…' });
    expect(log).toHaveBeenCalledWith(
      'mail.noop',
      expect.objectContaining({ to: 'kto@example.com' }),
    );
  });
});
