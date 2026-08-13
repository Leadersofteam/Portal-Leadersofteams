-- AlterTable
ALTER TABLE `social_posts` ADD COLUMN `quotedPostId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `uploaded_files` MODIFY `kind` ENUM('AVATAR', 'PORTFOLIO', 'LISTING', 'SOCIAL') NOT NULL;

-- CreateTable
CREATE TABLE `social_post_images` (
    `id` VARCHAR(191) NOT NULL,
    `postId` VARCHAR(191) NOT NULL,
    `fileId` VARCHAR(191) NOT NULL,
    `position` INTEGER NOT NULL DEFAULT 0,

    INDEX `social_post_images_postId_position_idx`(`postId`, `position`),
    UNIQUE INDEX `social_post_images_postId_fileId_key`(`postId`, `fileId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `social_posts_quotedPostId_idx` ON `social_posts`(`quotedPostId`);

-- AddForeignKey
ALTER TABLE `social_posts` ADD CONSTRAINT `social_posts_quotedPostId_fkey` FOREIGN KEY (`quotedPostId`) REFERENCES `social_posts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_post_images` ADD CONSTRAINT `social_post_images_postId_fkey` FOREIGN KEY (`postId`) REFERENCES `social_posts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `social_post_images` ADD CONSTRAINT `social_post_images_fileId_fkey` FOREIGN KEY (`fileId`) REFERENCES `uploaded_files`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

