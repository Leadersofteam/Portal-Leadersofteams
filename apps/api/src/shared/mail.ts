import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Warstwa e-mail (D4) — 0 zł (ADR-009), dwa transporty i bezpieczny fallback.
//
// DOMYŚLNA DROGA TO WŁASNA SKRZYNKA (SMTP), nie zewnętrzny dostawca: używamy tej
// samej skrzynki co App (smtp.hostinger.com, kontakt@leadersofteams.com), która
// jest już opłacona w ramach hostingu domeny. Żadnego nowego vendora, żadnego
// nowego kosztu, żadnej zgody na przetwarzanie danych przez trzecią stronę.
//
// Brevo zostaje jako alternatywa (darmowy tier 300/dzień) — przydatny, jeśli
// kiedyś dojdzie masowy digest i nie będziemy chcieli obciążać reputacji
// skrzynki transakcyjnej App-a.
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
  brevoApiKey?: string;
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

// --- Transport 2: Brevo (alternatywa) ---------------------------------------
function createBrevoMailer(config: MailConfig, log?: MailLogger): MailService {
  return {
    enabled: true,
    async send(msg) {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.brevoApiKey!,
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify({
          sender: { email: config.mailFrom, name: config.mailFromName },
          to: [{ email: msg.to }],
          subject: msg.subject,
          textContent: msg.text,
          ...(msg.html ? { htmlContent: msg.html } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        log?.('mail.send_failed', {
          transport: 'brevo',
          status: res.status,
          body: body.slice(0, 500),
        });
        throw new Error(`Brevo send failed: ${res.status}`);
      }
      log?.('mail.sent', { transport: 'brevo', to: msg.to, subject: msg.subject });
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
 * Wybór transportu. Kolejność jest celowa: własna skrzynka ma pierwszeństwo
 * przed zewnętrznym dostawcą. Jeśli skonfigurowano oba, wygrywa SMTP.
 */
export function createMailService(config: MailConfig, log?: MailLogger): MailService {
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    return createSmtpMailer(config, log);
  }
  if (config.brevoApiKey) return createBrevoMailer(config, log);
  return createNoopMailer(log);
}
