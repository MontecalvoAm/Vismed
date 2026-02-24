'use client';

// ============================================================
//  VisayasMed — 403 Access Denied Component
//  Shows when user navigates to a module without CanView permission
// ============================================================

import { ShieldOff } from 'lucide-react';
import Image from 'next/image';

export default function AccessDenied({ moduleName }: { moduleName?: string }) {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-6 py-16 space-y-6">
            <div className="w-20 h-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-2">
                <ShieldOff className="w-10 h-10 text-red-400" />
            </div>
            <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Denied</h2>
                <p className="text-slate-500 text-sm max-w-sm">
                    {moduleName
                        ? `You do not have permission to view the ${moduleName} module.`
                        : 'You do not have permission to access this page.'}
                    {' '}Please contact your administrator.
                </p>
            </div>
            <div className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-4">
                403 · VisayasMed Hospital
            </div>
        </div>
    );
}
