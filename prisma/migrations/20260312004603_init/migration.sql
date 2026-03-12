-- CreateTable
CREATE TABLE `M_User` (
    `UserID` VARCHAR(36) NOT NULL,
    `Email` VARCHAR(255) NOT NULL,
    `Password` VARCHAR(255) NOT NULL,
    `FirstName` VARCHAR(100) NULL,
    `LastName` VARCHAR(100) NULL,
    `RoleID` VARCHAR(36) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `M_User_Email_key`(`Email`),
    PRIMARY KEY (`UserID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Role` (
    `RoleID` VARCHAR(36) NOT NULL,
    `RoleName` VARCHAR(100) NOT NULL,
    `Description` VARCHAR(255) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,

    PRIMARY KEY (`RoleID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Module` (
    `ModuleID` VARCHAR(36) NOT NULL,
    `ModuleName` VARCHAR(100) NOT NULL,
    `Label` VARCHAR(100) NOT NULL,
    `Path` VARCHAR(255) NOT NULL,
    `Icon` VARCHAR(100) NULL,
    `SortOrder` INTEGER NOT NULL DEFAULT 99,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`ModuleID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Department` (
    `DepartmentID` VARCHAR(36) NOT NULL,
    `DepartmentName` VARCHAR(255) NOT NULL,
    `Icon` VARCHAR(100) NULL,
    `Description` VARCHAR(255) NULL,
    `SortOrder` INTEGER NOT NULL DEFAULT 0,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`DepartmentID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `M_Service` (
    `ServiceID` VARCHAR(36) NOT NULL,
    `DepartmentID` VARCHAR(36) NOT NULL,
    `ServiceName` VARCHAR(255) NOT NULL,
    `Price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Unit` VARCHAR(100) NULL,
    `Description` VARCHAR(255) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`ServiceID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_Quotation` (
    `QuotationID` VARCHAR(36) NOT NULL,
    `CustomerName` VARCHAR(255) NOT NULL,
    `CustomerEmail` VARCHAR(255) NULL,
    `CustomerPhone` VARCHAR(50) NULL,
    `HospitalName` VARCHAR(255) NULL DEFAULT 'VisayasMed Hospital',
    `PreparedBy` VARCHAR(255) NULL,
    `Subtotal` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Vat` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Total` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Status` VARCHAR(50) NOT NULL DEFAULT 'generated',
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`QuotationID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `T_QuotationItem` (
    `ItemID` VARCHAR(36) NOT NULL,
    `QuotationID` VARCHAR(36) NOT NULL,
    `Name` VARCHAR(255) NOT NULL,
    `Department` VARCHAR(255) NULL,
    `Price` DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    `Quantity` INTEGER NOT NULL DEFAULT 1,
    `Unit` VARCHAR(100) NULL,

    PRIMARY KEY (`ItemID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `MT_RolePermission` (
    `PermissionID` VARCHAR(36) NOT NULL,
    `RoleID` VARCHAR(36) NOT NULL,
    `ModuleName` VARCHAR(100) NOT NULL,
    `CanView` BOOLEAN NOT NULL DEFAULT false,
    `CanAdd` BOOLEAN NOT NULL DEFAULT false,
    `CanEdit` BOOLEAN NOT NULL DEFAULT false,
    `CanDelete` BOOLEAN NOT NULL DEFAULT false,

    PRIMARY KEY (`PermissionID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `M_User` ADD CONSTRAINT `M_User_RoleID_fkey` FOREIGN KEY (`RoleID`) REFERENCES `M_Role`(`RoleID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `M_Service` ADD CONSTRAINT `M_Service_DepartmentID_fkey` FOREIGN KEY (`DepartmentID`) REFERENCES `M_Department`(`DepartmentID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `T_QuotationItem` ADD CONSTRAINT `T_QuotationItem_QuotationID_fkey` FOREIGN KEY (`QuotationID`) REFERENCES `T_Quotation`(`QuotationID`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MT_RolePermission` ADD CONSTRAINT `MT_RolePermission_RoleID_fkey` FOREIGN KEY (`RoleID`) REFERENCES `M_Role`(`RoleID`) ON DELETE CASCADE ON UPDATE CASCADE;
