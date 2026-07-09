// Warstwa e-mail (D4) za flagą konfiguracyjną. 0 zł (ADR-009): darmowy tier Brevo
// (300/dzień) przez API, a przy braku klucza — fallback no-op (log). Realna wysyłka
// jest WYŁĄCZONA dopóki właściciel nie poda BREVO_API_KEY; scaffolding jest gotowy.
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
  brevoApiKey?: string;
  mailFrom: string;
  mailFromName: string;
}

export type MailLogger = (event: string, data: Record<string, unknown>) => void;

// Wysyłka przez Brevo (transakcyjny SMTP API). Wywoływana WYŁĄCZNIE gdy włączona
// flaga (klucz obecny). Digest trzyma wolumen poniżej limitu 300/dzień (ADR-009).
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
        log?.('mail.send_failed', { status: res.status, body: body.slice(0, 500) });
        throw new Error(`Brevo send failed: ${res.status}`);
      }
      log?.('mail.sent', { to: msg.to, subject: msg.subject });
    },
  };
}

// Fallback bez sekretu: nic nie wysyła, tylko loguje (0 zł, bezpieczny domyślnie).
function createNoopMailer(log?: MailLogger): MailService {
  return {
    enabled: false,
    async send(msg) {
      log?.('mail.noop', { to: msg.to, subject: msg.subject });
    },
  };
}

export function createMailService(config: MailConfig, log?: MailLogger): MailService {
  return config.mailEnabled && config.brevoApiKey
    ? createBrevoMailer(config, log)
    : createNoopMailer(log);
}
