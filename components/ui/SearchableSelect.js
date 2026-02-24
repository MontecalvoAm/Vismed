'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

export default function SearchableSelect({ options, value, onChange, placeholder = 'Search...', displayKey = 'name', valueKey = 'id', renderOption }) {
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
            if (item) item.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

    return (
        <div className="ss-container" ref={containerRef}>
            <button
                type="button"
                className={`ss-trigger${open ? ' ss-open' : ''}`}
                onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
                onKeyDown={!open ? handleKeyDown : undefined}
                aria-haspopup="listbox"
                aria-expanded={open}
            >
                <span className={selected ? 'ss-selected-label' : 'ss-placeholder'}>
                    {selected ? selected[displayKey] : placeholder}
                </span>
                <span className={`ss-arrow${open ? ' ss-arrow-up' : ''}`}>▾</span>
            </button>

            {open && (
                <div className="ss-dropdown" role="listbox">
                    <div className="ss-search-wrap">
                        <input
                            ref={inputRef}
                            type="text"
                            className="ss-search"
                            placeholder="Type to search..."
                            value={query}
                            onChange={(e) => { setQuery(e.target.value); setHighlighted(0); }}
                            onKeyDown={handleKeyDown}
                            autoComplete="off"
                        />
                    </div>
                    <ul ref={listRef} className="ss-list">
                        {filtered.length === 0 ? (
                            <li className="ss-no-results">No results found</li>
                        ) : (
                            filtered.map((opt, i) => (
                                <li
                                    key={opt[valueKey]}
                                    className={`ss-item${i === highlighted ? ' ss-item-highlighted' : ''}${opt[valueKey] === value ? ' ss-item-selected' : ''}`}
                                    onMouseDown={() => handleSelect(opt)}
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
