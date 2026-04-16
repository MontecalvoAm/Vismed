import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkArchiveModule() {
  try {
    console.log('--- Checking m_module ---');
    const modules = await prisma.m_Module.findMany({
      where: { ModuleID: 'archive' }
    });
    console.log('Archive Module:', JSON.stringify(modules, null, 2));

    console.log('\n--- Checking mt_rolepermission for Archive ---');
    const permissions = await prisma.mT_RolePermission.findMany({
      where: { ModuleName: 'Archive' },
      include: {
        Role: true
      }
    });
    console.log('Archive Permissions:', JSON.stringify(permissions, null, 2));

    console.log('\n--- Checking Roles ---');
    const roles = await prisma.m_Role.findMany({
      where: { IsDeleted: false }
    });
    console.log('Total Roles:', roles.length);
    roles.forEach(r => console.log(`- ${r.RoleName} (ID: ${r.RoleID})`));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkArchiveModule();
