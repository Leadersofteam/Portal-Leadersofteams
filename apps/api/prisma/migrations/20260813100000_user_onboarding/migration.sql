-- AlterTable
ALTER TABLE `users` ADD COLUMN `checklistDismissedAt` DATETIME(3) NULL,
    ADD COLUMN `onboardingCompletedAt` DATETIME(3) NULL,
    ADD COLUMN `onboardingIntent` VARCHAR(191) NULL,
    ADD COLUMN `onboardingStep` INTEGER NOT NULL DEFAULT 0;

