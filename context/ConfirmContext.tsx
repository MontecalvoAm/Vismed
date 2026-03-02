'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmOptions {
    title: string;
    message: ReactNode;
    variant?: ConfirmVariant;
    confirmText?: string;
    cancelText?: string;
}

export interface AlertOptions {
    title: string;
    message: ReactNode;
    variant?: ConfirmVariant;
    confirmText?: string;
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
    alert: (options: AlertOptions) => Promise<void>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};

interface ConfirmState extends ConfirmOptions {
    isOpen: boolean;
    isAlert: boolean;
    resolve: (value: boolean | PromiseLike<boolean>) => void;
}

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
    const [state, setState] = useState<ConfirmState | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const confirm = useCallback((options: ConfirmOptions) => {
        return new Promise<boolean>((resolve) => {
            setState({ ...options, isOpen: true, isAlert: false, resolve });
        });
    }, []);

    const alert = useCallback((options: AlertOptions) => {
        return new Promise<boolean>((resolve) => {
            setState({ ...options, isOpen: true, isAlert: true, resolve });
        }).then(() => { }); // ignore the boolean result for alerts
    }, []);

    const handleConfirm = useCallback(() => {
        if (state) {
            state.resolve(true);
            setState(null);
        }
    }, [state]);

    const handleCancel = useCallback(() => {
        if (state) {
            state.resolve(false);
            setState(null);
        }
    }, [state]);

    const handleBackdropClick = useCallback((e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !state?.isAlert) {
            handleCancel();
        }
        if (e.target === e.currentTarget && state?.isAlert) {
            handleConfirm();
        }
    }, [handleCancel, handleConfirm, state]);

    const modalContent = state?.isOpen ? (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-sm transition-opacity"
            style={{ zIndex: 99999 }}
            onClick={handleBackdropClick}
        >
            <div
                className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200"
                role="dialog"
                aria-modal="true"
            >
                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center ${state.variant === 'danger' ? 'bg-rose-100 text-rose-600' :
                            state.variant === 'warning' ? 'bg-amber-100 text-amber-600' :
                                state.variant === 'success' ? 'bg-green-100 text-green-600' :
                                    'bg-brand-muted-blue/10 text-brand-muted-blue'
                            }`}>
                            {state.variant === 'danger' && <AlertCircle className="w-5 h-5" />}
                            {state.variant === 'warning' && <AlertTriangle className="w-5 h-5" />}
                            {state.variant === 'success' && <CheckCircle className="w-5 h-5" />}
                            {(!state.variant || state.variant === 'info') && <Info className="w-5 h-5" />}
                        </div>

                        <div className="flex-1 pt-0.5">
                            <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-none mb-2">
                                {state.title}
                            </h3>
                            <p className="text-sm text-slate-500 leading-relaxed">
                                {state.message}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-slate-50/80 px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 flex-wrap sm:flex-nowrap">
                    {!state.isAlert && (
                        <button
                            onClick={handleCancel}
                            className="w-full sm:w-auto px-4 py-2 text-sm font-semibold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-sm"
                        >
                            {state.cancelText || 'Cancel'}
                        </button>
                    )}
                    <button
                        onClick={handleConfirm}
                        className={`w-full sm:w-auto px-4 py-2 text-sm font-semibold text-white rounded-xl shadow-sm transition-colors ${state.variant === 'danger' ? 'bg-rose-500 hover:bg-rose-600 border border-transparent shadow-rose-500/20' :
                            state.variant === 'warning' ? 'bg-amber-500 hover:bg-amber-600 border border-transparent shadow-amber-500/20' :
                                state.variant === 'success' ? 'bg-green-600 hover:bg-green-700 border border-transparent shadow-green-500/20' :
                                    'bg-brand-dark-blue hover:bg-brand-muted-blue border border-transparent shadow-brand-dark-blue/20'
                            }`}
                    >
                        {state.confirmText || (state.isAlert ? 'OK' : 'Confirm')}
                    </button>
                </div>
            </div>
        </div>
    ) : null;

    return (
        <ConfirmContext.Provider value={{ confirm, alert }}>
            {children}
            {mounted && modalContent && createPortal(modalContent, document.body)}
        </ConfirmContext.Provider>
    );
};
