import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Warstwa e-mail (D4) — 0 zł (ADR-009): JEDEN transport i bezpieczny fallback.
//
// Wysyłamy przez WŁASNĄ SKRZYNKĘ (SMTP) — tę samą co App (smtp.hostinger.com,
// kontakt@leadersofteams.com), opłaconą w ramach hostingu domeny. Żadnego
// vendora po API, żadnego nowego kosztu, żadnego klucza do zewnętrznej usługi.
//
// ⛔ Brevo USUNIĘTE 2026-08-13 (decyzja właściciela: minimalizujemy zewnętrznych
// dostawców po API). Był to martwy kod — SMTP miał pierwszeństwo i Brevo nigdy
// nie zostało użyte na produkcji. Gdyby kiedyś doszedł masowy digest i skrzynka
// przestała wyrabiać, wracamy do tej rozmowy ŚWIADOMIE, a nie przez zapomnianą
// gałąź `if`. Historia w gicie.
//
// ⚠️ Czego świadomie NIE robimy: własnego serwera pocztowego na VPS. Port 25
// wychodzący bywa blokowany, a poczta z „świeżego" IP bez historii i tak ląduje
// w spamie — SPF/DKIM/DMARC to za mało. Skrzynka u dostawcy hostingu ma gotową
// reputację i to jest jedyny sensowny wybór przy naszej skali.

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface MailService {
  readonly enabled: boolean;
  send(msg: MailMessage): Promise<void>;
}

export interface MailConfig {
  mailEnabled: boolean;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  mailFrom: string;
  mailFromName: string;
}

export type MailLogger = (event: string, data: Record<string, unknown>) => void;

// --- Transport 1: własna skrzynka przez SMTP (domyślny) ---------------------
function createSmtpMailer(config: MailConfig, log?: MailLogger): MailService {
  let transporter: Transporter | null = null;

  // Leniwie: połączenie otwieramy przy pierwszej wysyłce, nie przy starcie
  // serwera. Niedostępny SMTP nie może blokować bootu API.
  function getTransport(): Transporter {
    transporter ??= nodemailer.createTransport({
      host: config.smtpHost!,
      port: config.smtpPort ?? 465,
      secure: config.smtpSecure ?? true,
      auth: { user: config.smtpUser!, pass: config.smtpPass! },
    });
    return transporter;
  }

  return {
    enabled: true,
    async send(msg) {
      try {
        await getTransport().sendMail({
          from: `"${config.mailFromName}" <${config.mailFrom}>`,
          to: msg.to,
          subject: msg.subject,
          text: msg.text,
          ...(msg.html ? { html: msg.html } : {}),
        });
        log?.('mail.sent', { transport: 'smtp', to: msg.to, subject: msg.subject });
      } catch (err) {
        // Log NIE zawiera treści ani danych uwierzytelniających — tylko powód.
        log?.('mail.send_failed', {
          transport: 'smtp',
          to: msg.to,
          reason: err instanceof Error ? err.message : 'unknown',
        });
        throw err;
      }
    },
  };
}

// --- Fallback: nic nie wysyła, tylko loguje ---------------------------------
function createNoopMailer(log?: MailLogger): MailService {
  return {
    enabled: false,
    async send(msg) {
      log?.('mail.noop', { to: msg.to, subject: msg.subject });
    },
  };
}

/**
 * Wybór transportu: komplet danych SMTP → wysyłamy, cokolwiek innego → no-op.
 * Połowiczna konfiguracja (sam host bez hasła) MUSI dawać jawny no-op, a nie
 * ciche „connection refused" przy pierwszym resecie hasła.
 */
export function createMailService(config: MailConfig, log?: MailLogger): MailService {
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    return createSmtpMailer(config, log);
  }
  return createNoopMailer(log);
}
