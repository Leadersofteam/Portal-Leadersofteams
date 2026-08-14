-- AlterTable
ALTER TABLE `posts` ADD COLUMN `pinnedAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `bookmarks` (
    `userId` VARCHAR(191) NOT NULL,
    `subjectType` ENUM('SOCIAL_POST', 'POST') NOT NULL,
    `subjectId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `bookmarks_userId_createdAt_idx`(`userId`, `createdAt`),
    PRIMARY KEY (`userId`, `subjectType`, `subjectId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `posts_groupId_pinnedAt_idx` ON `posts`(`groupId`, `pinnedAt`);

-- AddForeignKey
ALTER TABLE `bookmarks` ADD CONSTRAINT `bookmarks_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

