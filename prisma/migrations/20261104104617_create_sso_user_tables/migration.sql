/*
  Warnings:

  - You are about to drop the `auth_sessions` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `users` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `auth_sessions` DROP FOREIGN KEY `auth_sessions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_bank_id_fkey`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_branch_id_fkey`;

-- DropTable
DROP TABLE `auth_sessions`;

-- DropTable
DROP TABLE `users`;

-- CreateTable
CREATE TABLE `rrb_users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_id` INTEGER UNSIGNED NOT NULL,
    `branch_id` INTEGER UNSIGNED NULL,
    `employee_id` VARCHAR(100) NULL,
    `employee_name` VARCHAR(255) NULL,
    `position` VARCHAR(190) NULL,
    `date_of_birth` DATE NULL,
    `gender` VARCHAR(30) NULL,
    `mobile_no` VARCHAR(30) NULL,
    `email` VARCHAR(190) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_time` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    INDEX `rrb_users_bank_id_branch_id_is_active_idx`(`bank_id`, `branch_id`, `is_active`),
    UNIQUE INDEX `rrb_users_bank_id_email_key`(`bank_id`, `email`),
    UNIQUE INDEX `rrb_users_bank_id_employee_id_key`(`bank_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rrb_auth_sessions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `rrb_user_id` INTEGER UNSIGNED NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    `revoked_at` DATETIME(6) NULL,
    `last_used_at` DATETIME(6) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `rrb_auth_sessions_token_hash_key`(`token_hash`),
    INDEX `rrb_auth_sessions_rrb_user_id_revoked_at_expires_at_idx`(`rrb_user_id`, `revoked_at`, `expires_at`),
    INDEX `rrb_auth_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sso_auth_sessions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `sso_user_id` INTEGER UNSIGNED NOT NULL,
    `token_hash` CHAR(64) NOT NULL,
    `expires_at` DATETIME(6) NOT NULL,
    `revoked_at` DATETIME(6) NULL,
    `last_used_at` DATETIME(6) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(512) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),

    UNIQUE INDEX `sso_auth_sessions_token_hash_key`(`token_hash`),
    INDEX `sso_auth_sessions_sso_user_id_revoked_at_expires_at_idx`(`sso_user_id`, `revoked_at`, `expires_at`),
    INDEX `sso_auth_sessions_expires_at_idx`(`expires_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sso_roles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_code` VARCHAR(50) NOT NULL,
    `role_name` VARCHAR(150) NOT NULL,
    `description` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `sso_roles_role_code_key`(`role_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sso_users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_id` INTEGER UNSIGNED NOT NULL,
    `branch_id` INTEGER UNSIGNED NULL,
    `role_id` INTEGER UNSIGNED NOT NULL,
    `employee_id` VARCHAR(100) NULL,
    `employee_name` VARCHAR(255) NULL,
    `position` VARCHAR(190) NULL,
    `date_of_birth` DATE NULL,
    `gender` VARCHAR(30) NULL,
    `mobile_no` VARCHAR(30) NULL,
    `email` VARCHAR(190) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `must_change_password` BOOLEAN NOT NULL DEFAULT true,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_time` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    INDEX `sso_users_role_id_idx`(`role_id`),
    INDEX `sso_users_bank_id_branch_id_is_active_idx`(`bank_id`, `branch_id`, `is_active`),
    UNIQUE INDEX `sso_users_bank_id_email_key`(`bank_id`, `email`),
    UNIQUE INDEX `sso_users_bank_id_employee_id_key`(`bank_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `rrb_users` ADD CONSTRAINT `rrb_users_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rrb_users` ADD CONSTRAINT `rrb_users_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `bank_branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rrb_auth_sessions` ADD CONSTRAINT `rrb_auth_sessions_rrb_user_id_fkey` FOREIGN KEY (`rrb_user_id`) REFERENCES `rrb_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sso_auth_sessions` ADD CONSTRAINT `sso_auth_sessions_sso_user_id_fkey` FOREIGN KEY (`sso_user_id`) REFERENCES `sso_users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sso_users` ADD CONSTRAINT `sso_users_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sso_users` ADD CONSTRAINT `sso_users_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `bank_branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sso_users` ADD CONSTRAINT `sso_users_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `sso_roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
