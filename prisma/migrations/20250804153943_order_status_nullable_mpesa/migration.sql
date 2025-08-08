/*
  Warnings:

  - You are about to alter the column `status` on the `order` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Enum(EnumId(0))`.

*/
-- AlterTable
ALTER TABLE `order` MODIFY `mpesaTransactionId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('PENDING', 'PAID', 'FAILED') NOT NULL DEFAULT 'PENDING';
