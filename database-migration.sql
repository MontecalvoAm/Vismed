-- ============================================================
--  VisayasMed Hospital — Database Schema Migration Script
--  Tool: SQLYog (MySQL / MariaDB compatible)
--  Scope: Renaming and standardizing the Quotation table
--  Naming Convention: T_ prefix (Transaction), PascalCase columns
--  NOTE: The live database is Firebase Firestore (NoSQL).
--        This file serves as the CANONICAL SCHEMA REFERENCE
--        for the T_Quotation collection and its sub-documents.
--        Use it for SQLYog, reporting tools, or data mirror setups.
-- ============================================================

-- ── 1. CREATE T_Quotation (main quotation table) ─────────────
--
-- Replaces the old 'quotations' collection (camelCase fields).
-- All columns are now strictly PascalCase (UpperCamelCase).
-- Primary Key uses UUID v7 (time-sortable) auto-generated in app.
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `T_Quotation` (
  `QuotationID`   VARCHAR(36)   NOT NULL  COMMENT 'UUID v7 — time-sortable unique identifier',
  `CustomerName`  VARCHAR(255)  NOT NULL  COMMENT 'Full name of the patient/client',
  `CustomerEmail` VARCHAR(255)  NULL      COMMENT 'Client contact email address',
  `CustomerPhone` VARCHAR(50)   NULL      COMMENT 'Client contact phone number',
  `HospitalName`  VARCHAR(255)  NULL      DEFAULT 'VisayasMed Hospital',
  `PreparedBy`    VARCHAR(255)  NULL      COMMENT 'Full name of the staff who prepared the quotation',
  `Subtotal`      DECIMAL(12,2) NOT NULL  DEFAULT 0.00,
  `Vat`           DECIMAL(12,2) NOT NULL  DEFAULT 0.00,
  `Total`         DECIMAL(12,2) NOT NULL  DEFAULT 0.00,
  `Status`        ENUM('generated','sent','approved','rejected') NOT NULL DEFAULT 'generated',
  `CreatedAt`     DATETIME      NOT NULL  DEFAULT CURRENT_TIMESTAMP,
  `UpdatedAt`     DATETIME      NOT NULL  DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`QuotationID`),
  INDEX `idx_TQ_Status`      (`Status`),
  INDEX `idx_TQ_CustomerName`(`CustomerName`),
  INDEX `idx_TQ_CreatedAt`   (`CreatedAt` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Transaction table — Medical service quotations issued to patients';


-- ── 2. CREATE T_QuotationItem (line-items for each quotation) ─
--
-- Normalized sub-table. In Firestore this is an embedded array
-- (T_Quotation.Items[]), but for a relational mirror it should
-- be its own transaction table (T_ prefix).
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS `T_QuotationItem` (
  `ItemID`       VARCHAR(36)   NOT NULL,
  `QuotationID`  VARCHAR(36)   NOT NULL  COMMENT 'FK → T_Quotation.QuotationID',
  `Name`         VARCHAR(255)  NOT NULL  COMMENT 'Service / product name',
  `Department`   VARCHAR(255)  NULL      COMMENT 'Department providing the service',
  `Price`        DECIMAL(12,2) NOT NULL  DEFAULT 0.00 COMMENT 'Unit price per item',
  `Quantity`     INT           NOT NULL  DEFAULT 1,
  `Unit`         VARCHAR(100)  NULL      COMMENT 'e.g. per session, per test, per scan',
  PRIMARY KEY (`ItemID`),
  CONSTRAINT `fk_TQI_QuotationID`
    FOREIGN KEY (`QuotationID`) REFERENCES `T_Quotation` (`QuotationID`)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Transaction table — Line items belonging to each T_Quotation';


-- ── 3. FULL SCHEMA REFERENCE for other existing tables ────────
--      (Already correctly named; listed here for completeness)
-- ─────────────────────────────────────────────────────────────

-- M_Role         — Master table for system roles
-- M_User         — Master table for staff/admin accounts
-- M_Department   — Master table for hospital departments
-- M_Service      — Master table for available medical services
-- MT_RolePermission — Master-Transaction: role → module CRUD permissions
-- MT_UserOverride   — Master-Transaction: per-user permission overrides

-- ── 4. COLUMN RENAME REFERENCE (old → new) ───────────────────
--      Applied in Firestore by code refactor, documented here
--      for audit trail.
-- ─────────────────────────────────────────────────────────────
--
--  OLD FIELD (quotations)   →   NEW FIELD (T_Quotation)
--  ─────────────────────────────────────────────────────
--  customerName             →   CustomerName
--  customerEmail            →   CustomerEmail
--  customerPhone            →   CustomerPhone
--  hospitalName             →   HospitalName
--  items[]                  →   Items[] / T_QuotationItem rows
--    items[].id             →   ItemID
--    items[].name           →   Name
--    items[].department     →   Department
--    items[].price          →   Price
--    items[].quantity       →   Quantity
--  subtotal                 →   Subtotal
--  vat                      →   Vat
--  total                    →   Total
--  status                   →   Status
--  createdAt                →   CreatedAt
--  (new)                    →   PreparedBy
--  (new)                    →   UpdatedAt
--
-- ─────────────────────────────────────────────────────────────
-- END OF MIGRATION SCRIPT
-- ============================================================
