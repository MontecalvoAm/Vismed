import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { permCache, CACHE_TTL_MS } from '@/lib/permCache';

// Global cache for module list to avoid re-fetching on every request for Super Admins
let cachedModuleList: string[] | null = null;
let lastModuleFetch = 0;
const MODULE_CACHE_TTL = 300_000; // 5 minutes

export async function getServerUser() {
    const cookieStore = await cookies();
    const UserID = cookieStore.get('vm_token')?.value;
    const sessionId = cookieStore.get('vm_session_id')?.value;

    if (!UserID) return null;

    try {
        // 1. Check Cache first
        const cached = permCache.get(UserID);
        if (cached && Date.now() < cached.expiresAt && cached.sessionId === sessionId) {
            return cached.data;
        }

        // 2. Fetch User with Role, RolePermissions, and Overrides in one go
        const user = await prisma.m_User.findUnique({
            where: { UserID },
            include: {
                Role: {
                    include: {
                        Permissions: true
                    }
                },
                Overrides: true,
                Department: {
                    select: {
                        DepartmentName: true
                    }
                }
            }
        });

        if (!user || !user.IsActive || user.IsDeleted) return null;

        // SINGLE-USER LOGIN CHECK: Verify Session ID
        if (user.CurrentSessionID && user.CurrentSessionID !== sessionId) {
            return null;
        }

        // 3. Resolve Hybrid RBAC — base role permissions first
        let resolved: Record<string, any> = {};

        // SPECIAL ACCESS: Super Admin or specific email gets ALL permissions
        if (user.Role?.RoleName === 'Super Admin' || user.Email === 'aljon.montecalvo08@gmail.com') {
            // Fetch modules if cache is stale or missing
            if (!cachedModuleList || (Date.now() - lastModuleFetch > MODULE_CACHE_TTL)) {
                const modules = await prisma.m_Module.findMany({
                    where: { IsActive: true, IsDeleted: false },
                    select: { ModuleName: true }
                });
                cachedModuleList = modules.map(m => m.ModuleName);
                lastModuleFetch = Date.now();
            }

            cachedModuleList.forEach(moduleName => {
                resolved[moduleName] = {
                    CanView: true,
                    CanAdd: true,
                    CanEdit: true,
                    CanDelete: true,
                };
            });
        } else {
            if (user.Role?.Permissions) {
                user.Role.Permissions.forEach(perm => {
                    resolved[perm.ModuleName] = {
                        CanView: perm.CanView,
                        CanAdd: perm.CanAdd,
                        CanEdit: perm.CanEdit,
                        CanDelete: perm.CanDelete,
                    };
                });
            }

            // 4. User-specific overrides take full priority
            if (user.Overrides) {
                user.Overrides.forEach(ov => {
                    resolved[ov.ModuleName] = {
                        CanView: ov.CanView,
                        CanAdd: ov.CanAdd,
                        CanEdit: ov.CanEdit,
                        CanDelete: ov.CanDelete,
                    };
                });
            }
        }

        const responseData = {
            UserID,
            Email: user.Email,
            FirstName: user.FirstName,
            LastName: user.LastName,
            RoleID: user.RoleID,
            RoleName: user.Role?.RoleName || 'Unknown',
            DepartmentID: user.DepartmentID,
            DepartmentName: user.Department?.DepartmentName,
            Permissions: resolved,
        };

        // 5. Store in cache for 60 seconds
        permCache.set(UserID, { data: responseData, expiresAt: Date.now() + CACHE_TTL_MS, sessionId });

        return responseData;

    } catch (err) {
        console.error('[getServerUser] Error fetching user:', err);
        return null;
    }
}
