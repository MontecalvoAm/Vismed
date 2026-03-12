-- AlterTable
ALTER TABLE `m_department` ADD COLUMN `IsDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `m_service` ADD COLUMN `IsDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `m_user` ADD COLUMN `IsDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `t_quotation` ADD COLUMN `IsDeleted` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `T_Guarantor` (
    `GuarantorID` VARCHAR(36) NOT NULL,
    `Name` VARCHAR(255) NOT NULL,
    `Description` TEXT NULL,
    `IsDeleted` BOOLEAN NOT NULL DEFAULT false,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`GuarantorID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
