// ============================================================
//  VisayasMed — Permission Cache (server-side)
//  Shared utility used by /api/auth/me and /api/users/[id]
//  TTL: 60 seconds — keyed by verified UserID
// ============================================================

interface CacheEntry {
    data: object;
    expiresAt: number;
}

const globalAny: any = global;
if (!globalAny._vmPermCache) {
    globalAny._vmPermCache = new Map<string, CacheEntry>();
}

export const permCache: Map<string, CacheEntry> = globalAny._vmPermCache;
export const CACHE_TTL_MS = 60_000; // 60 seconds

export function invalidatePermCache(userId: string): void {
    permCache.delete(userId);
}
