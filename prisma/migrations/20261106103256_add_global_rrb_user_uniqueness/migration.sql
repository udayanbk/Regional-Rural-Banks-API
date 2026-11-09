/*
  Warnings:

  - A unique constraint covering the columns `[mobile_no]` on the table `rrb_users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[email]` on the table `rrb_users` will be added. If there are existing duplicate values, this will fail.

*/

DROP INDEX `rrb_users_bank_id_email_key` ON `rrb_users`;

-- Add global mobile uniqueness
CREATE UNIQUE INDEX `rrb_users_mobile_no_key`
ON `rrb_users` (`mobile_no`);

-- Add global email uniqueness
CREATE UNIQUE INDEX `rrb_users_email_key`
ON `rrb_users` (`email`);