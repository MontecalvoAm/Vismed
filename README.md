# 🏥 VisayasMed Hospital — Quotation System

A modern, high-performance web application designed for generating, managing, and tracking medical service quotations for VisayasMed Hospital.

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-00000F?style=for-the-badge&logo=mysql&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)

---

## 🚀 Quick Start (Fresh Setup)

Follow these steps to get the project running on your local machine if you are starting from scratch.

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **pnpm**
- **MySQL Server** (Running locally or accessible via network)

### 2. Clone and Install
```bash
git clone <repository-url>
cd QuotationApp
npm install
```

### 3. Environment Variables
Copy the example environment file and fill in your credentials:
```bash
cp .env.example .env
```

**Required Variables:**
- `DATABASE_URL`: Connection string for your MySQL database (e.g., `mysql://user:password@localhost:3306/vismed_quotation`)
- `NEXT_PUBLIC_FIREBASE_*`: Firebase client configuration for frontend services.
- `FIREBASE_ADMIN_*`: Firebase service account details for server-side operations.

### 4. Database Initialization
This project uses Prisma ORM. Initialize your database schema and seed initial data:

```bash
# Push schema to database
npx prisma db push

# (Optional) Run migrations if using a managed environment
# npx prisma migrate dev

# Seed the database with initial roles, users, and modules
npx prisma db seed
```

### 5. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Initial Credentials

After seeding, you can log in with the following default Super Admin account:

- **Email**: `aljon.montecalvo08@gmail.com`
- **Password**: `@Aljon123`

> [!WARNING]
> Please change the administrator password immediately after the first login for security.

---

## 🛠 Technology Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS.
- **Backend**: Next.js Server Actions & API Routes.
- **Database**: MySQL (via Prisma ORM).
- **Authentication**: Custom Session-based Auth (HttpOnly Cookies).
- **Utilities**: Lucide Icons, Date-fns, JSPDF (for PDF generation), XLSX (for exports).

---

## 📂 Project Structure

```text
QuotationApp/
├── app/                # Next.js App Router (Pages & API)
├── components/         # Reusable UI Components
├── context/            # React Context Providers
├── lib/                # Core logic (Prisma, Auth, Rate Limiting)
├── prisma/             # Database Schema & Seed scripts
├── public/             # Static assets (Images, Fonts)
├── hooks/              # Custom React Hooks
└── database-migration.sql # SQL reference for manual setups
```

---

## 📈 Key Features

- **Dynamic Quotation Builder**: Create complex medical quotations with real-time calculations.
- **RBAC (Role-Based Access Control)**: Granular permissions for Users, Roles, and Modules.
- **PDF Generation**: Generate professional PDF quotations for patients.
- **Audit Logging**: Comprehensive tracking of all administrative actions.
- **Guarantor Management**: Handle discounts and special pricing for different insurance/partners.

---

## 📑 Documentation

- [Architecture Overview](ARCHITECTURE.md) — Detailed system design and data flow.
- [Database Schema](prisma/schema.prisma) — Canonical Prisma schema definition.

---

© 2026 VisayasMed Hospital. All rights reserved.
