import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Create Super Admin Role
  const adminRoleId = '97288339-3831-4831-b833-313831383138'; // Example fixed UUID
  const adminRole = await prisma.m_Role.upsert({
    where: { RoleID: adminRoleId },
    update: {
      RoleName: 'Super Admin',
      Description: 'System Administrator with full access.',
    },
    create: {
      RoleID: adminRoleId,
      RoleName: 'Super Admin',
      Description: 'System Administrator with full access.',
      IsActive: true,
    },
  });

  // 2. Create Initial User
  const password = await bcrypt.hash('@Aljon123', 10);
  await prisma.m_User.upsert({
    where: { Email: 'aljon.montecalvo08@gmail.com' },
    update: {
      Password: password,
      RoleID: adminRole.RoleID,
    },
    create: {
      Email: 'aljon.montecalvo08@gmail.com',
      Password: password,
      FirstName: 'Aljon',
      LastName: 'Montecalvo',
      RoleID: adminRole.RoleID,
      IsActive: true,
    },
  });

  // 3. Create Modules
  const appModules = [
    { ModuleID: 'quotations', ModuleName: 'Quotation', Label: 'Quotation', Path: '/quotation', Icon: 'LayoutDashboard', SortOrder: 1 },
    { ModuleID: 'guarantors', ModuleName: 'Guarantors', Label: 'Guarantors', Path: '/guarantors', Icon: 'Shield', SortOrder: 2 },
    { ModuleID: 'departments', ModuleName: 'Departments', Label: 'Departments', Path: '/departments', Icon: 'Building2', SortOrder: 3 },
    { ModuleID: 'services', ModuleName: 'Services', Label: 'Items and Services', Path: '/services', Icon: 'Stethoscope', SortOrder: 4 },
    { ModuleID: 'reports', ModuleName: 'Reports', Label: 'Reports', Path: '/reports', Icon: 'ClipboardList', SortOrder: 5 },
    { ModuleID: 'logs', ModuleName: 'Logs', Label: 'Logs', Path: '/reports/audit-logs', Icon: 'History', SortOrder: 6 },
    { ModuleID: 'users', ModuleName: 'Users', Label: 'Users', Path: '/users', Icon: 'Users', SortOrder: 7 }
  ];

  for (const mod of appModules) {
    await prisma.m_Module.upsert({
      where: { ModuleID: mod.ModuleID },
      update: mod,
      create: {
        ...mod,
        IsActive: true,
      },
    });
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
