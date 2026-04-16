import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedArchive() {
    try {
        console.log('--- Seeding Archive Module ---');
        
        // 1. Add Archive module to M_Module
        const module = await prisma.m_Module.upsert({
            where: { ModuleID: 'archive' },
            create: {
                ModuleID: 'archive',
                ModuleName: 'Archive',
                Label: 'Archive',
                Path: '/archive',
                Icon: 'Archive',
                SortOrder: 99,
                IsActive: true,
            },
            update: {
                ModuleName: 'Archive',
                Label: 'Archive',
                Path: '/archive',
                Icon: 'Archive',
                SortOrder: 99,
                IsActive: true,
            }
        });
        console.log('Module seeded:', module.ModuleName);

        // 2. Get ALL roles
        const roles = await prisma.m_Role.findMany({
            where: { IsDeleted: false }
        });

        console.log(`Found ${roles.length} roles. Seeding permissions...`);

        for (const role of roles) {
            await prisma.mT_RolePermission.upsert({
                where: {
                    RoleID_ModuleName: {
                        RoleID: role.RoleID,
                        ModuleName: 'Archive'
                    }
                },
                create: {
                    RoleID: role.RoleID,
                    ModuleName: 'Archive',
                    CanView: true,
                    CanAdd: false,
                    CanEdit: true,
                    CanDelete: true,
                },
                update: {
                    CanView: true,
                    CanAdd: false,
                    CanEdit: true,
                    CanDelete: true,
                }
            });
            console.log(`- Permission granted for role: ${role.RoleName}`);
        }

        console.log('\nSUCCESS: Archive module and permissions seeded successfully.');
        console.log('IMPORTANT: Logout and log back in (or wait 60s) for the sidebar link to appear.');

    } catch (e: any) {
        console.error('ERROR during seeding:', e.message);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

seedArchive();
