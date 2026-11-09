/*
  Warnings:

  - You are about to drop the column `parent_branch_id` on the `bank_branches` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `bank_branches` DROP FOREIGN KEY `bank_branches_parent_branch_id_fkey`;

-- DropIndex
DROP INDEX `bank_branches_parent_branch_id_idx` ON `bank_branches`;

-- AlterTable
ALTER TABLE `bank_branches` DROP COLUMN `parent_branch_id`,
    ADD COLUMN `circle` VARCHAR(255) NULL,
    ADD COLUMN `network` VARCHAR(255) NULL,
    ADD COLUMN `region` VARCHAR(255) NULL,
    ADD COLUMN `sbi_gi_branch` VARCHAR(255) NULL,
    ADD COLUMN `zone` VARCHAR(255) NULL;
