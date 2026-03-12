-- CreateTable
CREATE TABLE `MT_UserOverride` (
    `OverrideID` VARCHAR(36) NOT NULL,
    `UserID` VARCHAR(36) NOT NULL,
    `ModuleName` VARCHAR(100) NOT NULL,
    `CanView` BOOLEAN NOT NULL DEFAULT false,
    `CanAdd` BOOLEAN NOT NULL DEFAULT false,
    `CanEdit` BOOLEAN NOT NULL DEFAULT false,
    `CanDelete` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`OverrideID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MT_UserOverride` ADD CONSTRAINT `MT_UserOverride_UserID_fkey` FOREIGN KEY (`UserID`) REFERENCES `M_User`(`UserID`) ON DELETE CASCADE ON UPDATE CASCADE;
