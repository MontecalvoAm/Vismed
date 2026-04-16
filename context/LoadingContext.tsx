'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingContextType {
    isLoading: boolean;
    loadingText: string | null;
    showLoading: (text?: string) => void;
    hideLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider = ({ children }: { children: ReactNode }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingText, setLoadingText] = useState<string | null>(null);

    const showLoading = useCallback((text?: string) => {
        setLoadingText(text || null);
        setIsLoading(true);
    }, []);

    const hideLoading = useCallback(() => {
        setIsLoading(false);
        setLoadingText(null);
    }, []);

    return (
        <LoadingContext.Provider value={{ isLoading, loadingText, showLoading, hideLoading }}>
            {children}
        </LoadingContext.Provider>
    );
};

export const useLoading = () => {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
};
