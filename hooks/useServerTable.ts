import { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';

interface UseServerTableProps {
    initialPage?: number;
    initialPageSize?: number;
    initialSearch?: string;
    endpoint: string;
    dataKey: string; // e.g., 'quotations' or 'records'
}

export function useServerTable({
    initialPage = 1,
    initialPageSize = 10,
    initialSearch = '',
    endpoint,
    dataKey
}: UseServerTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [data, setData] = useState<any[]>([]);
    const [meta, setMeta] = useState({
        totalItems: 0,
        totalPages: 0,
        currentPage: initialPage,
        pageSize: initialPageSize,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Sync state with URL params if needed, or just use local state
    const [page, setPage] = useState(Number(searchParams.get('page')) || initialPage);
    const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || initialPageSize);
    const [search, setSearch] = useState(searchParams.get('search') || initialSearch);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.set('page', page.toString());
            params.set('pageSize', pageSize.toString());
            if (search) params.set('search', search);

            // Preserve existing search params (like 'tab' in archive)
            searchParams.forEach((value, key) => {
                if (!['page', 'pageSize', 'search'].includes(key)) {
                    params.set(key, value);
                }
            });

            const res = await fetch(`${endpoint}?${params.toString()}`);
            const result = await res.json();

            if (result.success) {
                setData(result[dataKey] || []);
                if (result.meta) {
                    setMeta(result.meta);
                }
            } else {
                throw new Error(result.error || 'Failed to fetch data');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [endpoint, dataKey, page, pageSize, search, searchParams]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300); // Debounce search

        return () => clearTimeout(timeoutId);
    }, [fetchData]);

    // Update URL when pagination changes (optional, but good for UX)
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        params.set('page', page.toString());
        params.set('pageSize', pageSize.toString());
        if (search) params.set('search', search); else params.delete('search');
        
        // Don't push to history if only search is changing to avoid spamming back button
        // router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }, [page, pageSize, search, pathname, router, searchParams]);

    const handlePageChange = (newPage: number) => setPage(newPage);
    const handlePageSizeChange = (newSize: number) => {
        setPageSize(newSize);
        setPage(1); // Reset to first page
    };
    const handleSearchChange = (newSearch: string) => {
        setSearch(newSearch);
        setPage(1); // Reset to first page
    };

    return {
        data,
        meta,
        loading,
        error,
        page,
        pageSize,
        search,
        handlePageChange,
        handlePageSizeChange,
        handleSearchChange,
        refresh: fetchData
    };
}
