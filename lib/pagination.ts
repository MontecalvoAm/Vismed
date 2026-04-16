import { prisma } from './prisma';

export interface PaginationParams {
    page?: number | string;
    pageSize?: number | string;
    search?: string;
    orderBy?: string;
    orderDir?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
    data: T[];
    meta: {
        totalItems: number;
        totalPages: number;
        currentPage: number;
        pageSize: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}

/**
 * Standard pagination utility for Prisma
 */
export async function paginate<T>(
    model: any,
    params: PaginationParams,
    where: any = {},
    include: any = undefined,
    select: any = undefined
): Promise<PaginatedResult<T>> {
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(100, Number(params.pageSize) || 20));
    const skip = (page - 1) * pageSize;

    const [totalItems, data] = await Promise.all([
        model.count({ where }),
        model.findMany({
            where,
            include,
            select,
            take: pageSize,
            skip,
            orderBy: params.orderBy ? { [params.orderBy]: params.orderDir || 'desc' } : { CreatedAt: 'desc' },
        }),
    ]);

    const totalPages = Math.ceil(totalItems / pageSize);

    return {
        data,
        meta: {
            totalItems,
            totalPages,
            currentPage: page,
            pageSize,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        },
    };
}
