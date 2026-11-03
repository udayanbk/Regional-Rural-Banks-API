-- CreateTable
CREATE TABLE `bank_branches` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_id` INTEGER UNSIGNED NOT NULL,
    `branch_code` VARCHAR(100) NOT NULL,
    `branch_name` VARCHAR(255) NOT NULL,
    `parent_branch_id` INTEGER UNSIGNED NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    INDEX `bank_branches_bank_id_is_active_idx`(`bank_id`, `is_active`),
    INDEX `bank_branches_parent_branch_id_idx`(`parent_branch_id`),
    UNIQUE INDEX `bank_branches_bank_id_branch_code_key`(`bank_id`, `branch_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_email_domains` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_id` INTEGER UNSIGNED NOT NULL,
    `domain` VARCHAR(255) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `bank_email_domains_domain_key`(`domain`),
    INDEX `bank_email_domains_bank_id_is_active_idx`(`bank_id`, `is_active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `banks` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_name` VARCHAR(255) NOT NULL,
    `bank_code` VARCHAR(50) NOT NULL,
    `address` TEXT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    UNIQUE INDEX `banks_bank_code_key`(`bank_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pre_registered_users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_id` INTEGER UNSIGNED NOT NULL,
    `branch_id` INTEGER UNSIGNED NOT NULL,
    `employee_id` VARCHAR(100) NULL,
    `employee_name` VARCHAR(255) NULL,
    `position` VARCHAR(190) NULL,
    `date_of_birth` DATETIME(6) NULL,
    `gender` VARCHAR(30) NULL,
    `mobile_no` VARCHAR(30) NULL,
    `email` VARCHAR(190) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reject_reason` TEXT NULL,
    `approved_reject_date` DATETIME(6) NULL,
    `approved_reject_user_id` INTEGER UNSIGNED NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    INDEX `pre_registered_users_bank_id_email_status_idx`(`bank_id`, `email`, `status`),
    INDEX `pre_registered_users_branch_id_idx`(`branch_id`),
    INDEX `pre_registered_users_employee_id_idx`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `bank_id` INTEGER UNSIGNED NOT NULL,
    `branch_id` INTEGER UNSIGNED NOT NULL,
    `employee_id` VARCHAR(100) NULL,
    `employee_name` VARCHAR(255) NULL,
    `position` VARCHAR(190) NULL,
    `date_of_birth` DATETIME(6) NULL,
    `gender` VARCHAR(30) NULL,
    `mobile_no` VARCHAR(30) NULL,
    `email` VARCHAR(190) NOT NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `last_login_time` DATETIME(6) NULL,
    `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    `updated_at` DATETIME(6) NOT NULL,

    INDEX `users_bank_id_branch_id_is_active_idx`(`bank_id`, `branch_id`, `is_active`),
    UNIQUE INDEX `users_bank_id_email_key`(`bank_id`, `email`),
    UNIQUE INDEX `users_bank_id_employee_id_key`(`bank_id`, `employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bank_branches` ADD CONSTRAINT `bank_branches_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_branches` ADD CONSTRAINT `bank_branches_parent_branch_id_fkey` FOREIGN KEY (`parent_branch_id`) REFERENCES `bank_branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_email_domains` ADD CONSTRAINT `bank_email_domains_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pre_registered_users` ADD CONSTRAINT `pre_registered_users_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pre_registered_users` ADD CONSTRAINT `pre_registered_users_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `bank_branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_bank_id_fkey` FOREIGN KEY (`bank_id`) REFERENCES `banks`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `bank_branches`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
