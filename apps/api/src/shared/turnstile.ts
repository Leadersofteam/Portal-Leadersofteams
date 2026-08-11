// Anty-bot Cloudflare Turnstile (R-03/R-13) za flagą konfiguracyjną. 0 zł (ADR-009):
// Turnstile jest darmowy. Wzorzec jak warstwa e-mail (shared/mail.ts): bez sekretu
// weryfikacja jest WYŁĄCZONA (przepuszcza wszystko) — bezpieczny, otwarty domyślny
// stan dla dev/staging; realną ochronę włącza właściciel podając TURNSTILE_SECRET_KEY
// (i site-key na froncie) przy launchu. Gdy WŁĄCZONA — fail-closed: nieudana lub
// błędna weryfikacja odrzuca rejestrację (bo to bariera bezpieczeństwa).
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface TurnstileConfig {
  turnstileEnabled: boolean;
  secretKey?: string;
}

export interface TurnstileVerifier {
  readonly enabled: boolean;
  /** true = przepuść (OK lub wyłączone), false = odrzuć. */
  verify(token: string | undefined, remoteIp?: string): Promise<boolean>;
}

export type TurnstileLogger = (event: string, data: Record<string, unknown>) => void;

function createCloudflareVerifier(config: TurnstileConfig, log?: TurnstileLogger): TurnstileVerifier {
  return {
    enabled: true,
    async verify(token, remoteIp) {
      if (!token) return false;
      try {
        const body = new URLSearchParams({ secret: config.secretKey!, response: token });
        if (remoteIp) body.set('remoteip', remoteIp);
        const res = await fetch(SITEVERIFY_URL, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
        });
        if (!res.ok) {
          log?.('turnstile.http_error', { status: res.status });
          return false; // fail-closed
        }
        const data = (await res.json()) as { success?: boolean; 'error-codes'?: string[] };
        if (data.success !== true) {
          log?.('turnstile.rejected', { errorCodes: data['error-codes'] ?? [] });
          return false;
        }
        return true;
      } catch (err) {
        // Błąd sieci przy WŁĄCZONEJ ochronie → odrzuć (bariera bezpieczeństwa
        // nie może „przepuszczać w razie awarii", inaczej boty czekają na timeout).
        log?.('turnstile.error', { message: err instanceof Error ? err.message : String(err) });
        return false;
      }
    },
  };
}

// Bez sekretu: ochrona wyłączona → przepuszczaj (domyślnie OFF, 0 zł).
function createDisabledVerifier(): TurnstileVerifier {
  return {
    enabled: false,
    async verify() {
      return true;
    },
  };
}

export function createTurnstileVerifier(
  config: TurnstileConfig,
  log?: TurnstileLogger,
): TurnstileVerifier {
  return config.turnstileEnabled && config.secretKey
    ? createCloudflareVerifier(config, log)
    : createDisabledVerifier();
}
