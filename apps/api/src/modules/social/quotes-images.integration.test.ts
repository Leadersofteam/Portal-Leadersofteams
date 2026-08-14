// Obrazy przy wpisie i „podaj dalej z komentarzem" (X-lite, S14).
//
// Pilnujemy przede wszystkim rzeczy, które da się zepsuć po cichu: cudzego
// pliku wstawionego do własnego wpisu, matrioszki cytatów oraz karty cytatu
// po skasowaniu oryginału.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import sharp from 'sharp';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();

describe.skipIf(!hasInfra)('wpisy: obrazy i cytowanie', () => {
  let ctx: AppContext;
  const emails = [`qi-a-${run}@test.local`, `qi-b-${run}@test.local`];
  let aCookie = '';
  let bCookie = '';
  const userIds: string[] = [];

  async function register(email: string, displayName: string) {
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email, password: 'super-tajne-haslo-1', displayName },
    });
    expect(res.statusCode).toBe(201);
    userIds.push((res.json() as { user: { id: string } }).user.id);
    return res.headers['set-cookie'] as string;
  }

  async function uploadImage(cookie: string): Promise<string> {
    const png = await sharp({
      create: { width: 600, height: 400, channels: 3, background: { r: 20, g: 60, b: 140 } },
    })
      .png()
      .toBuffer();
    const boundary = `----lotQI${run}`;
    const head =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="kind"\r\n\r\nSOCIAL\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="wpis.png"\r\n` +
      `Content-Type: image/png\r\n\r\n`;
    const body = Buffer.concat([
      Buffer.from(head, 'latin1'),
      png,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'latin1'),
    ]);
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/files',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(201);
    // Trasa zwraca { file: … }, nie samo id — pomyłka tutaj objawia się
    // dopiero 400 przy tworzeniu wpisu, w zupełnie innym miejscu.
    return (res.json() as { file: { id: string } }).file.id;
  }

  function createPost(cookie: string, payload: Record<string, unknown>) {
    return ctx.app.inject({
      method: 'POST',
      url: '/api/v1/social/posts',
      headers: { cookie },
      payload,
    });
  }

  beforeAll(async () => {
    ctx = await buildServer(loadConfig({ ...process.env, NODE_ENV: 'test', LOG_LEVEL: 'error' }));
    aCookie = await register(emails[0]!, 'Autor A');
    bCookie = await register(emails[1]!, 'Autor B');
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.activityItem.deleteMany({ where: { actorId: { in: userIds } } });
    await ctx.prisma.socialPost.deleteMany({ where: { authorUserId: { in: userIds } } });
    await ctx.prisma.uploadedFile.deleteMany({ where: { ownerId: { in: userIds } } });
    await ctx.prisma.user.deleteMany({ where: { email: { in: emails } } });
    await ctx.close();
  });

  it('wpis niesie obrazy w kolejności wstawienia', async () => {
    const first = await uploadImage(aCookie);
    const second = await uploadImage(aCookie);
    const created = await createPost(aCookie, {
      body: `Dwa ujęcia z wdrożenia ${run}`,
      imageFileIds: [first, second],
    });
    expect(created.statusCode).toBe(201);

    const postId = (created.json() as { id: string }).id;
    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/social/posts/${postId}` });
    expect(res.statusCode).toBe(200);
    // Kolejność ma znaczenie: to autor decyduje, co jest pierwszym kadrem.
    expect((res.json() as { post: { imageFileIds: string[] } }).post.imageFileIds).toEqual([
      first,
      second,
    ]);
  }, 60_000);

  it('NIE pozwala wstawić do wpisu cudzego pliku', async () => {
    const foreign = await uploadImage(bCookie);
    const res = await createPost(aCookie, { body: 'Podpinam cudzy plik', imageFileIds: [foreign] });
    // Bez tej bariery wystarczyłoby zgadnąć identyfikator, żeby wyświetlić
    // czyjeś zdjęcie pod własnym nazwiskiem.
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  }, 60_000);

  it('cytowanie pokazuje treść i autora oryginału', async () => {
    const original = await createPost(bCookie, { body: `Oryginalna myśl ${run}` });
    const originalId = (original.json() as { id: string }).id;

    const quote = await createPost(aCookie, { body: 'Dokładnie tak', quotedPostId: originalId });
    expect(quote.statusCode).toBe(201);
    const quoteId = (quote.json() as { id: string }).id;

    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/social/posts/${quoteId}` });
    const { post } = res.json() as {
      post: { quoted: { available: boolean; body: string; author: { displayName: string } } };
    };
    expect(post.quoted.available).toBe(true);
    expect(post.quoted.body).toContain(String(run));
    expect(post.quoted.author.displayName).toBe('Autor B');
  }, 60_000);

  it('cytat cytatu SPŁASZCZA się do oryginału, zamiast budować matrioszkę', async () => {
    const original = await createPost(bCookie, { body: `Źródło ${run}` });
    const originalId = (original.json() as { id: string }).id;
    const firstQuote = await createPost(aCookie, {
      body: 'Podaję dalej',
      quotedPostId: originalId,
    });
    const firstQuoteId = (firstQuote.json() as { id: string }).id;

    const secondQuote = await createPost(bCookie, {
      body: 'I jeszcze raz',
      quotedPostId: firstQuoteId,
    });
    expect(secondQuote.statusCode).toBe(201);
    const secondQuoteId = (secondQuote.json() as { id: string }).id;

    const res = await ctx.app.inject({
      method: 'GET',
      url: `/api/v1/social/posts/${secondQuoteId}`,
    });
    const { post } = res.json() as { post: { quoted: { id: string } } };
    // Cytujemy ŹRÓDŁO, nie cudzy cytat — inaczej po kilku podaniach dalej karta
    // byłaby matrioszką, a czytelnik i tak chce zobaczyć oryginał.
    expect(post.quoted.id).toBe(originalId);
  }, 60_000);

  it('po usunięciu oryginału cytat mówi wprost, że treści nie ma', async () => {
    const original = await createPost(bCookie, { body: `Zniknie ${run}` });
    const originalId = (original.json() as { id: string }).id;
    const quote = await createPost(aCookie, {
      body: 'Komentarz zostaje',
      quotedPostId: originalId,
    });
    const quoteId = (quote.json() as { id: string }).id;

    const removed = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/social/posts/${originalId}`,
      headers: { cookie: bCookie },
    });
    expect(removed.statusCode).toBe(200);

    const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/social/posts/${quoteId}` });
    expect(res.statusCode).toBe(200);
    const { post } = res.json() as { post: { body: string; quoted: { available: boolean } } };
    // Wypowiedź cytującego MUSI przetrwać usunięcie oryginału — inaczej autor
    // straciłby własny tekst przez cudzą decyzję.
    expect(post.body).toBe('Komentarz zostaje');
    expect(post.quoted.available).toBe(false);
  }, 60_000);

  it('wpis bez treści, obrazu i cytatu nadal jest odrzucany', async () => {
    const res = await createPost(aCookie, { body: '   ' });
    expect(res.statusCode).toBe(400);
  }, 60_000);
});
