'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ClearableInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    onClear?: () => void;
    containerClassName?: string;
    error?: string;
}

export function ClearableInput({
    label,
    onClear,
    value,
    onChange,
    containerClassName = '',
    error,
    className = '',
    ...props
}: ClearableInputProps) {
    const handleClear = () => {
        if (onClear) {
            onClear();
        } else if (onChange) {
            // Create a pseudo-event to clear the value if onClear isn't provided
            const event = {
                target: { value: '' }
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(event);
        }
    };

    return (
        <div className={`space-y-1.5 ${containerClassName}`}>
            {label && (
                <label className="block text-sm font-semibold text-slate-700 ml-1">
                    {label}
                </label>
            )}
            <div className="relative group">
                <input
                    value={value}
                    onChange={onChange}
                    className={`
                        w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl 
                        text-sm text-slate-900 placeholder:text-slate-400
                        focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                        transition-all duration-200 shadow-sm hover:border-slate-300
                        ${error ? 'border-red-400 focus:ring-red-100 focus:border-red-500' : ''}
                        ${className}
                    `}
                    {...props}
                />
                {value && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full 
                                 text-slate-400 hover:text-slate-600 hover:bg-slate-100 
                                 transition-all duration-200 opacity-0 group-hover:opacity-100"
                        aria-label="Clear input"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>
            {error && (
                <p className="text-xs font-medium text-red-500 ml-1">
                    {error}
                </p>
            )}
        </div>
    );
}
