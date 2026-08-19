-- AlterTable
ALTER TABLE `users` ADD COLUMN `digestOptOutAt` DATETIME(3) NULL,
    ADD COLUMN `digestToken` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `worker_state` (
    `key` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `users_digestToken_key` ON `users`(`digestToken`);

