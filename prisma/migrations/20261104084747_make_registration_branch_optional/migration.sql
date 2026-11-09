/*
  Warnings:

  - Added the required column `portal` to the `pre_registered_users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_type` to the `pre_registered_users` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `pre_registered_users` ADD COLUMN `portal` ENUM('SP', 'SSO') NOT NULL,
    ADD COLUMN `user_type` ENUM('SP_EMPLOYEE', 'LICENSING_USER', 'SALES_SUPPORT_OFFICER', 'REGIONAL_MANAGER') NOT NULL,
    MODIFY `branch_id` INTEGER UNSIGNED NULL;
