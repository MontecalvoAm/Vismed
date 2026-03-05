'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search } from 'lucide-react';

interface SearchableSelectProps {
    options: any[];
    value: string;
    onChange: (val: any) => void;
    placeholder?: string;
    displayKey?: string;
    valueKey?: string;
    renderOption?: (opt: any) => React.ReactNode;
}

export default function SearchableSelect({ options, value, onChange, placeholder = 'Search...', displayKey = 'name', valueKey = 'id', renderOption }: SearchableSelectProps) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState(0);
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const listRef = useRef(null);

    const selected = options.find((o) => o[valueKey] === value);

    const filtered = query.trim()
        ? options.filter((o) => o[displayKey].toLowerCase().includes(query.toLowerCase()))
        : options;

    useEffect(() => {
        const handler = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleSelect = useCallback((opt) => {
        onChange(opt[valueKey]);
        setQuery('');
        setOpen(false);
        setHighlighted(0);
    }, [onChange, valueKey]);

    const handleKeyDown = (e) => {
        if (!open) {
            if (e.key === 'Enter' || e.key === 'ArrowDown') { setOpen(true); setHighlighted(0); }
            return;
        }
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted((h) => Math.min(h + 1, filtered.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlighted((h) => Math.max(h - 1, 0)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (filtered[highlighted]) handleSelect(filtered[highlighted]); }
        else if (e.key === 'Escape') { setOpen(false); setQuery(''); }
    };

    useEffect(() => {
        if (listRef.current) {
            const item = listRef.current.children[highlighted];
            if (item) item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }, [highlighted]);

    return (
        <div className="relative w-full text-slate-900" ref={containerRef}>
            <button
                type="button"
                className={`w-full flex items-center justify-between px-4 py-2.5 bg-white border rounded-xl shadow-sm transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${open ? 'border-primary ring-2 ring-primary/20' : 'border-slate-200'}`}
                onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
                onKeyDown={!open ? handleKeyDown : undefined}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <div className={`truncate ${selected ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
                    {selected ? selected[displayKey] : placeholder}
                </div>
                <ChevronDown className={`w-4 h-4 ml-2 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150" role="listbox">
                    <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                <Search className="w-4 h-4" />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                                placeholder="Type to search..."
                                value={query}
                                onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }}
                                onKeyDown={handleKeyDown}
                                autoComplete="off"
                            />
                        </div>
                    </div>

                    <ul ref={listRef} className="max-h-[200px] overflow-y-auto overscroll-contain py-1">
                        {filtered.length === 0 ? (
                            <li className="px-4 py-3 text-sm text-center text-slate-500">No results found</li>
                        ) : (
                            filtered.map((opt, i) => (
                                <li
                                    key={opt[valueKey]}
                                    className={`px-4 py-2.5 cursor-pointer text-sm transition-colors border-l-2 ${i === highlighted
                                        ? 'bg-primary/5 text-primary border-primary'
                                        : opt[valueKey] === value
                                            ? 'bg-slate-50 text-slate-800 border-transparent font-medium'
                                            : 'text-slate-700 border-transparent hover:bg-slate-50'
                                        }`}
                                    onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                                    onMouseEnter={() => setHighlighted(i)}
                                    role="option"
                                    aria-selected={opt[valueKey] === value}
                                >
                                    {renderOption ? renderOption(opt) : opt[displayKey]}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
