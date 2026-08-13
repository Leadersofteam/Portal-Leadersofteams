import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import type { AuthHelpers } from '../../shared/auth';
import { DomainError } from '../../shared/errors';
import type { IdentityService } from '../identity/index';
import { FILE_VARIANTS, type FilesService, type FileVariant, type FileKind } from './service';

export interface FilesRoutesDeps {
  files: FilesService;
  auth: AuthHelpers;
  identity: Pick<IdentityService, 'setAvatar' | 'getPublicUsers'>;
}

const setAvatarSchema = z.object({ fileId: z.string().min(1).nullable() });

// Lista rodzajów MUSI iść w parze z enumem FileKind w schemacie i z
// `fileKindSchema` w kontraktach — rozjazd objawia się 400 przy uploadzie,
// mimo poprawnie zmigrowanej bazy.
const KINDS: ReadonlySet<string> = new Set(['AVATAR', 'PORTFOLIO', 'LISTING', 'SOCIAL']);

export function filesRoutes({ files, auth, identity }: FilesRoutesDeps) {
  return async function plugin(app: FastifyInstance) {
    // Upload obrazu (multipart, pole `file` + pole `kind`). Zwraca metadane.
    app.post('/files', async (request, reply) => {
      const user = await auth.requireUser(request);
      const part = await request.file();
      if (!part) {
        throw new DomainError('NO_FILE', 'Brak pliku w żądaniu (pole multipart `file`)', 400);
      }
      const kindRaw = (part.fields.kind as { value?: string } | undefined)?.value ?? 'PORTFOLIO';
      if (!KINDS.has(kindRaw)) {
        throw new DomainError('BAD_KIND', 'kind: AVATAR | PORTFOLIO | LISTING | SOCIAL', 400);
      }

      // @fastify/multipart dekoduje filename jako utf8 (defParamCharset) —
      // w odróżnieniu od multera nie wymaga naprawy latin1. Pilnuje tego test
      // z polskimi znakami w files.integration.test.ts.
      const originalName = part.filename || 'plik';
      const buffer = await part.toBuffer();

      const stored = await files.store({
        ownerId: user.id,
        kind: kindRaw as FileKind,
        originalName,
        mime: part.mimetype,
        buffer,
      });
      return reply.code(201).send({ file: stored });
    });

    // Publiczny odczyt wariantu. Id jest niemutowalne → cache immutable.
    app.get<{ Params: { id: string; variant: string } }>(
      '/files/:id/:variant',
      async (request, reply) => {
        const { id, variant } = request.params;
        if (!(variant in FILE_VARIANTS)) {
          throw new DomainError('BAD_VARIANT', 'variant: thumb | full', 400);
        }
        const { body, mime } = await files.read(id, variant as FileVariant);
        return reply
          .header('content-type', mime)
          .header('cache-control', 'public, max-age=31536000, immutable')
          .send(body);
      },
    );

    app.delete<{ Params: { id: string } }>('/files/:id', async (request, reply) => {
      const user = await auth.requireUser(request);
      await files.remove(request.params.id, user.id);
      return reply.code(204).send();
    });

    app.get('/me/avatar', async (request, reply) => {
      const user = await auth.requireUser(request);
      const users = await identity.getPublicUsers([user.id]);
      return reply.send({ fileId: users.get(user.id)?.avatarFileId ?? null });
    });

    // Awatar: files waliduje własność pliku, identity zapisuje własną tabelę (ADR-002).
    app.put('/me/avatar', async (request, reply) => {
      const user = await auth.requireUser(request);
      const { fileId } = setAvatarSchema.parse(request.body);
      if (fileId) await files.assertOwned(fileId, user.id, 'AVATAR');
      await identity.setAvatar(user.id, fileId);
      return reply.send({ ok: true });
    });
  };
}
