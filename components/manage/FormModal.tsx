'use client';

// ============================================================
//  VisayasMed — Reusable Form Modal
// ============================================================

import { X } from 'lucide-react';
import { useEffect } from 'react';

interface FormModalProps {
    isOpen: boolean;
    title: string;
    onClose: () => void;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg';
}

const sizeClass = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
};

export default function FormModal({ isOpen, title, onClose, children, size = 'md' }: FormModalProps) {
    // Close on ESC key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        if (isOpen) window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
                aria-hidden="true"
            />
            {/* Modal */}
            <div className={`relative z-10 w-full ${sizeClass[size]} bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]`}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {/* Body */}
                <div className="overflow-y-auto px-6 py-5 flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
