// Moduł files: upload (multipart) → warianty webp na dysku → odczyt → usunięcie.
// Wymaga realnego MySQL+Redis (skipIf jak pozostałe testy integracyjne).
import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import sharp from 'sharp';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildServer } from '../../server';
import type { AppContext } from '../../server';
import { loadConfig } from '../../shared/config';

const hasInfra = Boolean(process.env.DATABASE_URL && process.env.REDIS_URL);
const run = Date.now();
const UPLOADS = path.join(tmpdir(), `lot-files-test-${run}`);

describe.skipIf(!hasInfra)('files — upload, warianty, awatar', () => {
  let ctx: AppContext;
  let cookie = '';
  let userEmail = '';

  beforeAll(async () => {
    ctx = await buildServer(
      loadConfig({
        ...process.env,
        NODE_ENV: 'test',
        LOG_LEVEL: 'error',
        UPLOADS_DIR: UPLOADS,
      }),
    );
    userEmail = `files-${run}@test.local`;
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/auth/register',
      payload: { email: userEmail, password: 'super-tajne-haslo-1', displayName: 'Fila Testowa' },
    });
    expect(res.statusCode).toBe(201);
    cookie = res.headers['set-cookie'] as string;
  }, 120_000);

  afterAll(async () => {
    if (!ctx) return;
    await ctx.prisma.uploadedFile.deleteMany({
      where: { owner: { email: userEmail } },
    });
    await ctx.prisma.user.deleteMany({ where: { email: userEmail } });
    await ctx.close();
    await rm(UPLOADS, { recursive: true, force: true });
  });

  function multipartBody(filename: string, fileBuffer: Buffer, kind: string) {
    const boundary = `----lotTest${run}`;
    const head =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="kind"\r\n\r\n${kind}\r\n` +
      `--${boundary}\r\n` +
      // Nazwa pliku wysyłana jak przez przeglądarkę: bajty utf8 interpretowane
      // przez busboy jako latin1 — serwer musi je naprawić.
      `Content-Disposition: form-data; name="file"; filename="${Buffer.from(filename, 'utf8').toString('latin1')}"\r\n` +
      `Content-Type: image/png\r\n\r\n`;
    const tail = `\r\n--${boundary}--\r\n`;
    return {
      boundary,
      body: Buffer.concat([Buffer.from(head, 'latin1'), fileBuffer, Buffer.from(tail, 'latin1')]),
    };
  }

  async function upload(filename: string, kind = 'PORTFOLIO') {
    const png = await sharp({
      create: { width: 900, height: 600, channels: 3, background: { r: 40, g: 40, b: 120 } },
    })
      .png()
      .toBuffer();
    const { boundary, body } = multipartBody(filename, png, kind);
    return ctx.app.inject({
      method: 'POST',
      url: '/api/v1/files',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
  }

  it('upload zwraca metadane, a polskie znaki w nazwie są naprawione (utf8)', async () => {
    const res = await upload('zdjęcie żółwia.png');
    expect(res.statusCode).toBe(201);
    const { file } = res.json() as { file: { id: string; originalName: string; mime: string } };
    expect(file.originalName).toBe('zdjęcie żółwia.png');
    expect(file.mime).toBe('image/webp');
  });

  it('warianty thumb/full są webp z cache immutable; thumb ≤ 320 px', async () => {
    const up = await upload('kadr.png');
    const { file } = up.json() as { file: { id: string } };

    for (const variant of ['thumb', 'full'] as const) {
      const res = await ctx.app.inject({ method: 'GET', url: `/api/v1/files/${file.id}/${variant}` });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toBe('image/webp');
      expect(res.headers['cache-control']).toContain('immutable');
      const meta = await sharp(res.rawPayload).metadata();
      expect(meta.format).toBe('webp');
      if (variant === 'thumb') expect(meta.width).toBeLessThanOrEqual(320);
    }
  });

  it('odrzuca pliki, które nie są obrazem, mimo poprawnego mime', async () => {
    const { boundary, body } = multipartBody('nie-obraz.png', Buffer.from('to nie jest png'), 'PORTFOLIO');
    const res = await ctx.app.inject({
      method: 'POST',
      url: '/api/v1/files',
      headers: { cookie, 'content-type': `multipart/form-data; boundary=${boundary}` },
      payload: body,
    });
    expect(res.statusCode).toBe(400);
  });

  it('awatar: przyjmuje własny plik AVATAR, odrzuca plik złego rodzaju', async () => {
    const wrongKind = await upload('portret.png', 'PORTFOLIO');
    const wrongId = (wrongKind.json() as { file: { id: string } }).file.id;
    const bad = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/me/avatar',
      headers: { cookie },
      payload: { fileId: wrongId },
    });
    expect(bad.statusCode).toBe(400);

    const avatar = await upload('ja.png', 'AVATAR');
    const avatarId = (avatar.json() as { file: { id: string } }).file.id;
    const ok = await ctx.app.inject({
      method: 'PUT',
      url: '/api/v1/me/avatar',
      headers: { cookie },
      payload: { fileId: avatarId },
    });
    expect(ok.statusCode).toBe(200);

    const user = await ctx.prisma.user.findUnique({ where: { email: userEmail } });
    expect(user?.avatarFileId).toBe(avatarId);
  });

  it('DELETE usuwa plik — wariant przestaje istnieć', async () => {
    const up = await upload('do-usuniecia.png');
    const { file } = up.json() as { file: { id: string } };
    const del = await ctx.app.inject({
      method: 'DELETE',
      url: `/api/v1/files/${file.id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
    const read = await ctx.app.inject({ method: 'GET', url: `/api/v1/files/${file.id}/thumb` });
    expect(read.statusCode).toBe(404);
  });
});
