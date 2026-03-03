// ============================================================
//  VisayasMed — Error Handling Utilities
//  Safe error responses that don't leak sensitive information
// ============================================================

/**
 * Base application error class
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly isOperational: boolean;

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = 'INTERNAL_ERROR',
        isOperational: boolean = true
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Validation error (400 Bad Request)
 */
export class ValidationError extends AppError {
    public readonly fields?: Record<string, string>;

    constructor(message: string = 'Validation failed', fields?: Record<string, string>) {
        super(message, 400, 'VALIDATION_ERROR');
        this.fields = fields;
    }
}

/**
 * Unauthorized error (401)
 */
export class UnauthorizedError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

/**
 * Forbidden error (403)
 */
export class ForbiddenError extends AppError {
    constructor(message: string = 'Access denied') {
        super(message, 403, 'FORBIDDEN');
    }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND');
    }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
    constructor(message: string = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
    public readonly retryAfter: number;

    constructor(retryAfter: number = 60, message: string = 'Too many requests') {
        super(message, 429, 'RATE_LIMIT_EXCEEDED');
        this.retryAfter = retryAfter;
    }
}

/**
 * Safe error response for API routes
 * Hides internal error details in production
 */
export function errorResponse(
    error: unknown,
    defaultMessage: string = 'An error occurred'
): Response {
    // Determine if we're in production
    const isProduction = process.env.NODE_ENV === 'production';

    // Handle known AppError types
    if (error instanceof AppError) {
        const body: Record<string, unknown> = {
            error: error.message,
            code: error.code,
        };

        // Include validation field errors if present
        if (error instanceof ValidationError && error.fields) {
            body.fields = error.fields;
        }

        // Include retry-after for rate limit errors
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
        };

        if (error instanceof RateLimitError) {
            headers['Retry-After'] = String(error.retryAfter);
        }

        return new Response(JSON.stringify(body), {
            status: error.statusCode,
            headers,
        });
    }

    // Handle unknown errors - hide details in production
    const message = isProduction
        ? defaultMessage
        : (error instanceof Error ? error.message : defaultMessage);

    console.error('[API Error]', error);

    return new Response(
        JSON.stringify({
            error: message,
            code: 'INTERNAL_ERROR',
        }),
        {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        }
    );
}

/**
 * Success response helper
 */
export function successResponse<T>(
    data: T,
    status: number = 200
): Response {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
    });
}

/**
 * Error handler wrapper for API routes
 * Automatically catches errors and returns safe responses
 */
export function withErrorHandler<T extends unknown[]>(
    handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
    return async (...args: T) => {
        try {
            return await handler(...args);
        } catch (error) {
            return errorResponse(error);
        }
    };
}

/**
 * Log error for monitoring
 */
export function logError(
    error: unknown,
    context?: {
        userId?: string;
        action?: string;
        metadata?: Record<string, unknown>;
    }
): void {
    const timestamp = new Date().toISOString();
    const errorInfo = error instanceof Error
        ? { message: error.message, stack: error.stack }
        : { error };

    console.error(JSON.stringify({
        timestamp,
        ...errorInfo,
        ...context,
    }));
}

/**
 * Async handler wrapper that ensures no promise rejections escape
 */
export function safeAsyncHandler<T extends unknown[]>(
    handler: (...args: T) => Promise<Response>
): (...args: T) => Promise<Response> {
    return withErrorHandler(handler);
}
