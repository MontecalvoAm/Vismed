-- CreateTable
CREATE TABLE `T_AuditLog` (
    `LogID` VARCHAR(36) NOT NULL,
    `UserID` VARCHAR(36) NULL,
    `Action` VARCHAR(255) NOT NULL,
    `Target` VARCHAR(255) NULL,
    `Details` TEXT NULL,
    `IPAddress` VARCHAR(50) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `T_AuditLog_UserID_idx`(`UserID`),
    INDEX `T_AuditLog_Action_idx`(`Action`),
    INDEX `T_AuditLog_CreatedAt_idx`(`CreatedAt`),
    PRIMARY KEY (`LogID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
