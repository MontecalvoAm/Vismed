// ============================================================
//  VisayasMed — API: GET /api/seed/archive-module
//  Seeds the Archive module in M_Module and adds Archive
//  permissions to ALL roles in MT_RolePermission.
// ============================================================

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // 1. Add Archive module to M_Module
        await prisma.m_Module.upsert({
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

        // 2. Get ALL roles
        const roles = await prisma.m_Role.findMany({
            where: { IsDeleted: false }
        });

        const seededRoles: string[] = [];
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
            seededRoles.push(role.RoleName);
        }

        return NextResponse.json({
            success: true,
            message: `Archive module seeded. Logout and log back in (or wait 60s) for the sidebar link to appear.`,
            rolesSeeded: seededRoles,
        });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
