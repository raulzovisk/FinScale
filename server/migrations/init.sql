

CREATE TABLE IF NOT EXISTS `categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `color` VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  `icon` VARCHAR(50) NOT NULL DEFAULT 'tag'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `password` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `telegram_id` BIGINT UNIQUE DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `transactions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `type` ENUM('income', 'expense') NOT NULL,
  `category` VARCHAR(100) NOT NULL,
  `date` DATE NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `users_id` INT NOT NULL,
  `installment_id` VARCHAR(36) DEFAULT NULL,
  `installment_number` INT DEFAULT NULL,
  `installment_total` INT DEFAULT NULL,
  FOREIGN KEY (`users_id`) REFERENCES `users`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `recurrent_charges` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `users_id` INT NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `frequency` ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL DEFAULT 'monthly',
  `next_due_date` DATE NOT NULL,
  `category` VARCHAR(100) NOT NULL DEFAULT 'recorrente',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`users_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cards` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `users_id` INT NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `last_digits` VARCHAR(4) DEFAULT NULL,
  `color` VARCHAR(7) NOT NULL DEFAULT '#6366f1',
  `initial_balance` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`users_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ALTER TABLE `transactions` ADD COLUMN `card_id` INT DEFAULT NULL;
-- ALTER TABLE `transactions` ADD FOREIGN KEY (`card_id`) REFERENCES `cards`(`id`) ON DELETE SET NULL;

INSERT INTO `categories` (`name`, `color`, `icon`) VALUES
  ('Alimentação', '#ef4444', 'utensils'),
  ('Transporte', '#f59e0b', 'car'),
  ('Lazer', '#8b5cf6', 'gamepad'),
  ('Contas Fixas', '#6366f1', 'receipt'),
  ('Educação', '#10b981', 'book'),
  ('Saúde', '#ec4899', 'heart'),
  ('Trabalho', '#06b6d4', 'briefcase'),
  ('Outros', '#64748b', 'tag')
ON DUPLICATE KEY UPDATE `name` = `name`;
