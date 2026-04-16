# 📐 Architecture Overview — QuotationApp

This document provides a technical deep dive into the system design, data flow, and core architectural patterns of the VisayasMed Quotation System.

---

## 🏗 System Architecture

The project follows a **Hybrid Serverless/Service-Oriented Architecture** built on top of Next.js.

### 1. Unified Backend (Next.js App Router)
Most business logic resides in **Server Actions** (`app/actions`) and **API Routes** (`app/api`). This ensures:
- Direct database access from the server.
- Reduced client-side bundle size.
- Simplified data synchronization using React Server Components.

### 2. Data Persistence Layer
The system currently transitions from **Firebase Firestore** to **Relational MySQL (via Prisma)**.

- **MySQL (Primary)**: Stores transactional data (Quotations, Items), Master data (Users, Roles, Departments, Services), and Audit logs.
- **Firebase (Legacy/Support)**: Used for client-side authentication states and potentially file storage (via Firebase Storage).

---

## 🔐 Security & Permission System

The QuotationApp implements a robust **Role-Based Access Control (RBAC)** system with a unique **Override** capability.

### Permission Hierarchy:
1. **Role Level**: Permissions defined in `mT_RolePermission`. A user inherits permissions from their assigned role.
2. **User Level (Overrides)**: Permissions defined in `mT_UserOverride`. These explicitly grant or deny specific permissions to an individual user, bypassing the role level.

### Authentication Flow:
- **Provider**: Custom session management.
- **Session Token**: Stored in a secure `HttpOnly` cookie.
- **Verification**: Middleware (`middleware.js`) and `getServerUser` utility verify the session on every server-side request.

---

## 🔄 Data Flow: Generating a Quotation

1. **Input**: User selects services and enters customer details in the Quotation Builder.
2. **Validation**: Zod schemas in `lib/validation.ts` ensure data integrity.
3. **Storage**: The `createQuotationAction` server action writes to:
    - `t_Quotation` table (header).
    - `t_QuotationItem` table (line items).
4. **Logging**: An entry is automatically created in `t_AuditLog`.
5. **Output**: The system computes Subtotal, VAT, and Total on the fly, then generates a PDF via `jspdf`/`html2canvas`.

---

## 🚦 Rate Limiting

To protect sensitive endpoints (like Login), the system uses an in-memory **Sliding Window** rate limiter (`lib/rateLimit.ts`).
- **Logic**: Tracks requests per Window MS per Client IP.
- **Grace**: Automatically cleans up expired entries every 5 minutes.

---

## 📦 Core Modules

- **Quotations**: The engine for issued medical quotes.
- **Guarantors**: Management of insurance providers and corporate partners with custom discounts.
- **Master Data**: Departments and Services management.
- **User Management**: Admin tools for roles and permissions.
- **Reports**: Dashboard and Audit logs for compliance.

---

## 🛠 Maintenance & Scaling

### Database Migrations
Always use Prisma CLI for schema changes:
```bash
npx prisma migrate dev --name <description>
```

### Adding New Modules
1. Define the module in the database (via `M_Module` table or `seed.ts`).
2. Add the corresponding route in the `app/` directory.
3. Update RBAC logic to include the new module name.

---

© 2026 VisayasMed Hospital. Proprietary Documentation.
