/*
  Warnings:

  - A unique constraint covering the columns `[checkoutRequestId]` on the table `Order` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `quantity` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `ticketCategoryId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `auditlog` DROP FOREIGN KEY `AuditLog_staffId_fkey`;

-- DropIndex
DROP INDEX `AuditLog_staffId_fkey` ON `auditlog`;

-- AlterTable
ALTER TABLE `auditlog` MODIFY `staffId` INTEGER NULL;

-- AlterTable
ALTER TABLE `order` ADD COLUMN `affiliateId` INTEGER NULL,
    ADD COLUMN `checkoutRequestId` VARCHAR(191) NULL,
    ADD COLUMN `quantity` INTEGER NOT NULL,
    ADD COLUMN `ticketCategoryId` INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Order_checkoutRequestId_key` ON `Order`(`checkoutRequestId`);

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_ticketCategoryId_fkey` FOREIGN KEY (`ticketCategoryId`) REFERENCES `TicketCategory`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Order` ADD CONSTRAINT `Order_affiliateId_fkey` FOREIGN KEY (`affiliateId`) REFERENCES `Affiliate`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `AuditLog` ADD CONSTRAINT `AuditLog_staffId_fkey` FOREIGN KEY (`staffId`) REFERENCES `StaffUser`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
