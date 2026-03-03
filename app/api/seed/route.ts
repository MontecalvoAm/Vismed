import { NextResponse } from 'next/server';
import { db, auth, generateUUIDv7 } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, writeBatch, collection } from 'firebase/firestore';

export async function GET() {
    try {
        const email = 'admin@vismed.com';
        const password = 'vismed2024';

        let userCredential;
        try {
            // Try to create the user
            userCredential = await createUserWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            // If user already exists, sign them in
            if (error.code === 'auth/email-already-in-use') {
                userCredential = await signInWithEmailAndPassword(auth, email, password);
            } else {
                throw error;
            }
        }

        const uid = userCredential.user.uid;
        const batch = writeBatch(db);

        // 1. Create Admin Role
        const roleId = generateUUIDv7();
        const roleRef = doc(db, 'M_Role', roleId);
        batch.set(roleRef, {
            RoleID: roleId,
            RoleName: 'Super Admin',
            Description: 'System Administrator with full access to all modules.',
            IsActive: true
        });

        // 2. Create Role Permissions for Admin
        const modules = ['Departments', 'Services', 'Users', 'Quotation'];
        for (const mod of modules) {
            const permId = generateUUIDv7();
            const permRef = doc(db, 'MT_RolePermission', permId);
            batch.set(permRef, {
                PermissionID: permId,
                RoleID: roleId,
                ModuleName: mod,
                CanView: true,
                CanAdd: true,
                CanEdit: true,
                CanDelete: true,
            });
        }

        // 3. Create Admin User Record
        const userRef = doc(db, 'M_User', uid);
        batch.set(userRef, {
            UserID: uid,
            Email: email,
            FirstName: 'Admin',
            LastName: 'VisMed',
            RoleID: roleId,
            IsActive: true,
            CreatedAt: new Date().toISOString(),
            CreatedBy: 'Seed Script'
        });

        // 3.5 Create Initial Modules
        const appModules = [
            { ModuleID: 'quotations', ModuleName: 'Quotation', Label: 'Quotation', Path: '/quotation', Icon: 'LayoutDashboard', SortOrder: 1 },
            { ModuleID: 'history', ModuleName: 'History', Label: 'Records', Path: '/history', Icon: 'ClipboardList', SortOrder: 2 },
            { ModuleID: 'departments', ModuleName: 'Departments', Label: 'Departments', Path: '/departments', Icon: 'Building2', SortOrder: 3 },
            { ModuleID: 'guarantors', ModuleName: 'Guarantors', Label: 'Guarantors', Path: '/guarantors', Icon: 'Shield', SortOrder: 4 },
            { ModuleID: 'services', ModuleName: 'Services', Label: 'Items and Services', Path: '/services', Icon: 'Stethoscope', SortOrder: 5 },
            { ModuleID: 'users', ModuleName: 'Users', Label: 'Users', Path: '/users', Icon: 'Users', SortOrder: 6 }
        ];

        for (const mod of appModules) {
            const ref = doc(db, 'M_Module', mod.ModuleID);
            batch.set(ref, {
                ...mod,
                IsActive: true,
                CreatedAt: new Date().toISOString()
            });
        }

        // 4. Create Initial Departments
        const depts = [
            { DepartmentName: 'Cardiology', Icon: '🫀', Description: 'Heart and cardiovascular care', SortOrder: 1 },
            { DepartmentName: 'Neurology', Icon: '🧠', Description: 'Brain and nervous system', SortOrder: 2 },
            { DepartmentName: 'Laboratory', Icon: '🔬', Description: 'Blood and sample testing', SortOrder: 3 },
            { DepartmentName: 'Radiology', Icon: '☢️', Description: 'X-rays, CT scans, and MRI', SortOrder: 4 }
        ];

        const deptIds = {};
        for (const dept of depts) {
            const id = generateUUIDv7();
            deptIds[dept.DepartmentName] = id;
            const ref = doc(db, 'M_Department', id);
            batch.set(ref, {
                DepartmentID: id,
                ...dept,
                IsActive: true,
                CreatedAt: new Date().toISOString(),
                CreatedBy: 'Seed Script'
            });
        }

        // 5. Create Initial Services
        const svcs = [
            { DepartmentID: deptIds['Cardiology'], ServiceName: 'Echocardiogram', Price: 3500, Unit: 'per session', Description: 'Ultrasound of the heart' },
            { DepartmentID: deptIds['Cardiology'], ServiceName: 'ECG', Price: 800, Unit: 'per session', Description: 'Electrocardiogram' },
            { DepartmentID: deptIds['Neurology'], ServiceName: 'EEG', Price: 4000, Unit: 'per session', Description: 'Electroencephalogram' },
            { DepartmentID: deptIds['Laboratory'], ServiceName: 'CBC', Price: 450, Unit: 'per test', Description: 'Complete Blood Count' },
            { DepartmentID: deptIds['Laboratory'], ServiceName: 'Lipid Profile', Price: 1200, Unit: 'per test', Description: 'Cholesterol testing' },
            { DepartmentID: deptIds['Radiology'], ServiceName: 'Chest X-Ray', Price: 600, Unit: 'per scan', Description: 'PA View Chest X-Ray' },
            { DepartmentID: deptIds['Radiology'], ServiceName: 'CT Scan (Head)', Price: 8500, Unit: 'per scan', Description: 'Computerized Tomography of the Head' }
        ];

        for (const svc of svcs) {
            const id = generateUUIDv7();
            const ref = doc(db, 'M_Service', id);
            batch.set(ref, {
                ServiceID: id,
                ...svc,
                IsActive: true,
                CreatedAt: new Date().toISOString(),
                CreatedBy: 'Seed Script'
            });
        }

        // Execute batch write
        await batch.commit();

        return NextResponse.json({ success: true, message: 'Database seeded successfully', uid });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
