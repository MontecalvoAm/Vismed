// ============================================================
//  VisayasMed — Client-side Adapter: Modules
//  Calls local API instead of direct Firebase
// ============================================================

export interface AppModule {
    ModuleID: string;
    ModuleName: string;
    Label: string;
    Path: string;
    Icon: string;
    SortOrder: number;
    IsActive: boolean;
}

export async function getActiveModules(): Promise<AppModule[]> {
    try {
        const res = await fetch('/api/modules');
        if (!res.ok) throw new Error('Failed to fetch modules');
        
        const data = await res.json();
        const modules = (data.modules || []).map((m: any) => ({
            ModuleID: m.ModuleID,
            ModuleName: m.ModuleName,
            Label: m.Label,
            Path: m.Path,
            Icon: m.Icon,
            SortOrder: m.SortOrder ?? 99,
            IsActive: m.IsActive ?? true
        } as AppModule));

        return modules;
    } catch (error) {
        console.error("Failed to fetch modules:", error);
        return [];
    }
}
