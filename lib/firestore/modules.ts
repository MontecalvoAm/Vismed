import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';

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
        const q = query(
            collection(db, 'M_Module'),
            where('IsActive', '==', true)
        );

        const snap = await getDocs(q);

        const modules = snap.docs.map(doc => {
            const data = doc.data();
            return {
                ModuleID: doc.id,
                ModuleName: data.ModuleName,
                Label: data.Label,
                Path: data.Path,
                Icon: data.Icon,
                SortOrder: data.SortOrder ?? 99,
                IsActive: data.IsActive ?? true
            } as AppModule;
        });

        // Sort in memory as composite index for IsActive + SortOrder might not exist yet
        return modules.sort((a, b) => a.SortOrder - b.SortOrder);
    } catch (error) {
        console.error("Failed to fetch modules:", error);
        return [];
    }
}
