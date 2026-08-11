import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import type { PrismaClient } from '../../shared/db';
import { DomainError, ForbiddenError, NotFoundError } from '../../shared/errors';

// Moduł files: jedyne miejsce, które dotyka dysku. Na dysku leżą wyłącznie
// przetworzone warianty webp (thumb 320 px / full 1280 px) pod wygenerowaną
// nazwą — oryginalna nazwa pliku (naprawiona z latin1) zostaje tylko w DB.
// Serwowanie: stream z dysku + Cache-Control immutable (id jest niemutowalne).

export const FILE_VARIANTS = {
  thumb: 320,
  full: 1280,
} as const;

export type FileVariant = keyof typeof FILE_VARIANTS;

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

export type FileKind = 'AVATAR' | 'PORTFOLIO' | 'LISTING';

export interface FilesDeps {
  uploadsDir: string;
  maxUploadBytes: number;
}

export interface StoredFileDto {
  id: string;
  kind: FileKind;
  originalName: string;
  mime: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export interface FilesService {
  store(input: {
    ownerId: string;
    kind: FileKind;
    originalName: string;
    mime: string;
    buffer: Buffer;
  }): Promise<StoredFileDto>;
  read(fileId: string, variant: FileVariant): Promise<{ body: Buffer; mime: string }>;
  remove(fileId: string, requesterId: string): Promise<void>;
  /** RODO / kaskady: usuwa pliki użytkownika z dysku i z DB. */
  removeAllForUser(userId: string): Promise<void>;
  /** Wewnętrzne (inne moduły przez composition root): walidacja własności. */
  assertOwned(fileId: string, ownerId: string, kind?: FileKind): Promise<void>;
}

export function createFilesService(prisma: PrismaClient, deps: FilesDeps): FilesService {
  const root = path.resolve(deps.uploadsDir);

  const variantPath = (storagePath: string, variant: FileVariant) =>
    path.join(root, `${storagePath}-${variant}.webp`);

  async function unlinkVariants(storagePath: string) {
    await Promise.all(
      (Object.keys(FILE_VARIANTS) as FileVariant[]).map((v) =>
        rm(variantPath(storagePath, v), { force: true }),
      ),
    );
  }

  return {
    async store({ ownerId, kind, originalName, mime, buffer }) {
      if (!ALLOWED_MIME.has(mime)) {
        throw new DomainError('UNSUPPORTED_FILE_TYPE', 'Dozwolone formaty: JPEG, PNG, WebP', 415);
      }
      if (buffer.length === 0) {
        throw new DomainError('EMPTY_FILE', 'Pusty plik', 400);
      }
      if (buffer.length > deps.maxUploadBytes) {
        throw new DomainError(
          'FILE_TOO_LARGE',
          `Maksymalny rozmiar pliku to ${Math.round(deps.maxUploadBytes / 1024 / 1024)} MB`,
          413,
        );
      }

      // sharp odrzuci pliki, które nie są realnym obrazem (mime bywa kłamstwem).
      let meta;
      try {
        meta = await sharp(buffer).metadata();
      } catch {
        throw new DomainError('INVALID_IMAGE', 'Plik nie jest poprawnym obrazem', 400);
      }

      const now = new Date();
      const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      const storagePath = path.join(month, randomUUID());
      await mkdir(path.join(root, month), { recursive: true });

      // EXIF (w tym GPS) jest wycinany: rotate() normalizuje orientację,
      // a webp bez withMetadata() nie przenosi metadanych.
      const base = sharp(buffer).rotate();
      const results = await Promise.all(
        (Object.entries(FILE_VARIANTS) as Array<[FileVariant, number]>).map(async ([v, px]) => {
          const out = await base
            .clone()
            .resize({ width: px, height: px, fit: 'inside', withoutEnlargement: true })
            .webp({ quality: 82 })
            .toBuffer();
          await writeFile(variantPath(storagePath, v), out);
          return [v, out] as const;
        }),
      );
      const fullBuffer = results.find(([v]) => v === 'full')?.[1] ?? buffer;

      const record = await prisma.uploadedFile.create({
        data: {
          ownerId,
          kind,
          storagePath,
          originalName: originalName.slice(0, 255),
          mime: 'image/webp',
          size: fullBuffer.length,
          width: meta.width ?? null,
          height: meta.height ?? null,
        },
      });
      return record;
    },

    async read(fileId, variant) {
      const record = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
      if (!record) throw new NotFoundError('Plik nie istnieje');
      try {
        const body = await readFile(variantPath(record.storagePath, variant));
        return { body, mime: record.mime };
      } catch {
        throw new NotFoundError('Plik nie istnieje');
      }
    },

    async remove(fileId, requesterId) {
      const record = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
      if (!record) throw new NotFoundError('Plik nie istnieje');
      if (record.ownerId !== requesterId) throw new ForbiddenError();
      await prisma.uploadedFile.delete({ where: { id: fileId } });
      await unlinkVariants(record.storagePath);
    },

    async removeAllForUser(userId) {
      const records = await prisma.uploadedFile.findMany({ where: { ownerId: userId } });
      await prisma.uploadedFile.deleteMany({ where: { ownerId: userId } });
      for (const record of records) {
        await unlinkVariants(record.storagePath);
      }
    },

    async assertOwned(fileId, ownerId, kind) {
      const record = await prisma.uploadedFile.findUnique({ where: { id: fileId } });
      if (!record || record.ownerId !== ownerId) {
        throw new DomainError('FILE_NOT_OWNED', 'Plik nie istnieje lub nie należy do Ciebie', 400);
      }
      if (kind && record.kind !== kind) {
        throw new DomainError('FILE_WRONG_KIND', 'Plik ma niewłaściwe przeznaczenie', 400);
      }
    },
  };
}
