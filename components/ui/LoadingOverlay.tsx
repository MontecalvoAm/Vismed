'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLoading } from '@/context/LoadingContext';

export const LoadingOverlay = () => {
    const { isLoading, loadingText } = useLoading();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        
        // Prevent scrolling when loading
        if (isLoading) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isLoading]);

    if (!mounted || !isLoading) return null;

    return createPortal(
        <div 
            className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-900/60 backdrop-blur-md transition-all duration-300 animate-in fade-in"
            style={{ pointerEvents: 'all' }}
        >
            <div className="relative flex flex-col items-center">
                {/* Premium Animated Spinner */}
                <div className="relative w-24 h-24">
                    {/* Inner Pulse */}
                    <div className="absolute inset-0 rounded-full border-4 border-brand-primary opacity-20 animate-ping"></div>
                    
                    {/* Main Ring */}
                    <div className="absolute inset-0 rounded-full border-t-4 border-r-4 border-brand-primary animate-spin"></div>
                    
                    {/* Hospital/Brand Accent (Plus Sign) */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-1bg-brand-primary rounded-full absolute rotate-90"></div>
                        <div className="w-10 h-1 bg-brand-primary rounded-full"></div>
                        
                        <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="3" 
                            className="w-12 h-12 text-brand-primary animate-pulse"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                    </div>
                </div>

                {/* Loading Text */}
                {loadingText && (
                    <p className="mt-8 text-white text-lg font-bold tracking-widest uppercase animate-pulse">
                        {loadingText}
                    </p>
                )}
                
                {/* Subtle reassurance text */}
                {!loadingText && (
                    <p className="mt-8 text-brand-primary/80 text-sm font-bold tracking-[0.3em] uppercase animate-pulse">
                        Please wait...
                    </p>
                )}
            </div>

            {/* Visual Polish - Floating particles or gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 via-transparent to-slate-900/40 pointer-events-none"></div>
        </div>,
        document.body
    );
};
