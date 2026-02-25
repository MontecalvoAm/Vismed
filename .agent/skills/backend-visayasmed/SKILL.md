---
name: backend-visayasmed
description: Backend API, database schema, and architecture rules for the VisayasMed project. Use whenever building endpoints, querying the database, or setting up auth.
---
# Goal
Maintain a secure, API-driven backend with strict database naming conventions and token-based authentication.

# Architecture & Auth
* **API-Only:** The backend must expose standard API endpoints. Reject any architecture that couples the frontend directly to the database.
* **Authentication:** Implement JWT (JSON Web Tokens) paired with secure Refresh Tokens as the primary authorization layer. Tokens are strictly for authorizing actions.

# Database Rules (SQL)
* **Tooling Context:** Ensure generated SQL syntax is compatible with tools like SQLYog. 
* **Primary Keys:** Do not use the Max+1 strategy. Use Auto Increment configured specifically to generate UUID v7 strings, ensuring resources are reliably identifiable and time-sortable.
* **Table Naming:** Always use specific prefixes: `M_` (Master), `MT_` (Master Transaction), or `T_` (Transaction).
* **Column Naming:** Strict PascalCase (UpperCamelCase) for all tables and columns. Example: `UserID`, `FirstName`, `LastName`, `DepartmentID`.
* **Auditability:** Every table must include Audit Logs tracking creation and updates for all records.

# Hybrid RBAC & Authorization Logic
* **Data Structure:** Implement a Hybrid RBAC system. You must create tables for Roles (`M_Role`), default Role Permissions (`MT_RolePermission`), and User Overrides (`MT_UserOverride`).
* **Granular Permissions:** Permissions must explicitly track CRUD operations: `CanView`, `CanAdd`, `CanEdit`, `CanDelete` for each module/page.
* **Naming Conventions:** Strictly use PascalCase and your table prefixes. Example columns: `RoleID`, `UserID`, `ModuleID`, `CanView`. 
* **Permission Resolution:** The backend must calculate the final permissions for a user by merging their base `M_Role` permissions with any specific `MT_UserOverride` records.
* **Payload:** When a user logs in, the API must return the fully resolved, final permission set (either in the JWT payload or a separate `/me` endpoint) so the frontend doesn't have to calculate it.