import { afterEach, describe, expect, it, vi } from 'vitest';

import { createTurnstileVerifier } from './turnstile';

describe('Turnstile verifier', () => {
  afterEach(() => vi.restoreAllMocks());

  it('OFF (brak sekretu): enabled=false, przepuszcza bez tokenu i BEZ sieci', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const v = createTurnstileVerifier({ turnstileEnabled: false });
    expect(v.enabled).toBe(false);
    expect(await v.verify(undefined)).toBe(true);
    expect(await v.verify('cokolwiek')).toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('flaga włączona ale brak sekretu → i tak OFF', async () => {
    const v = createTurnstileVerifier({ turnstileEnabled: true, secretKey: undefined });
    expect(v.enabled).toBe(false);
    expect(await v.verify(undefined)).toBe(true);
  });

  it('ON + token ważny → true (woła siteverify z sekretem i tokenem)', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ success: true }), { status: 200 }));
    const v = createTurnstileVerifier({ turnstileEnabled: true, secretKey: 'sekret' });
    expect(v.enabled).toBe(true);
    expect(await v.verify('tok', '1.2.3.4')).toBe(true);
    const body = String((fetchSpy.mock.calls[0]?.[1] as RequestInit)?.body ?? '');
    expect(body).toContain('secret=sekret');
    expect(body).toContain('response=tok');
    expect(body).toContain('remoteip=1.2.3.4');
  });

  it('ON + brak tokenu → false BEZ sieci', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const v = createTurnstileVerifier({ turnstileEnabled: true, secretKey: 'sekret' });
    expect(await v.verify(undefined)).toBe(false);
    expect(await v.verify('')).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('ON + CF odrzuca token → false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: false, 'error-codes': ['invalid-input-response'] }), {
        status: 200,
      }),
    );
    const v = createTurnstileVerifier({ turnstileEnabled: true, secretKey: 'sekret' });
    expect(await v.verify('zly-token')).toBe(false);
  });

  it('ON + HTTP 500 → false (fail-closed)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('err', { status: 500 }));
    const v = createTurnstileVerifier({ turnstileEnabled: true, secretKey: 'sekret' });
    expect(await v.verify('tok')).toBe(false);
  });

  it('ON + błąd sieci → false (fail-closed)', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network down'));
    const v = createTurnstileVerifier({ turnstileEnabled: true, secretKey: 'sekret' });
    expect(await v.verify('tok')).toBe(false);
  });
});
