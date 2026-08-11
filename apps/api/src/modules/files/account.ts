import type { PrismaClient } from '../../shared/db';
import type { AccountDataModule } from '../identity/index';
import type { FilesService } from './service';

// RODO (D6): pliki użytkownika znikają z dysku i z DB przy anonimizacji;
// eksport zwraca metadane (nie binaria — te są dostępne przez API do czasu usunięcia).
export function createFilesAccountData(
  prisma: PrismaClient,
  files: FilesService,
): AccountDataModule {
  return {
    async anonymizeUserContent(userId) {
      await files.removeAllForUser(userId);
    },

    async exportUserData(userId) {
      const uploadedFiles = await prisma.uploadedFile.findMany({
        where: { ownerId: userId },
        select: {
          id: true,
          kind: true,
          originalName: true,
          mime: true,
          size: true,
          createdAt: true,
        },
      });
      return { uploadedFiles };
    },
  };
}
