// ============================================================
//  VisayasMed — Input Validation & Sanitization Utilities
//  Prevents XSS and injection attacks through input sanitization
// ============================================================

/**
 * Remove HTML tags and dangerous characters from a string
 */
export function sanitizeString(input: string): string {
    if (typeof input !== 'string') return '';

    return input
        // Remove HTML tags
        .replace(/<[^>]*>/g, '')
        // Remove javascript: protocol
        .replace(/javascript:/gi, '')
        // Remove on* event handlers
        .replace(/on\w+\s*=/gi, '')
        // Remove data: URLs (can be used for XSS)
        .replace(/data:/gi, '')
        // Trim whitespace
        .trim();
}

/**
 * Recursively sanitize all strings in an object
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            result[key] = sanitizeString(value);
        } else if (Array.isArray(value)) {
            result[key] = value.map(item =>
                typeof item === 'string' ? sanitizeString(item) :
                    typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) : item
            );
        } else if (typeof value === 'object' && value !== null) {
            result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
            result[key] = value;
        }
    }

    return result as T;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;

    // RFC 5322 compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    return emailRegex.test(email.trim()) && email.length <= 254;
}

/**
 * Validate password strength
 * Returns object with isValid and issues array
 */
export function validatePassword(password: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!password || typeof password !== 'string') {
        return { isValid: false, issues: ['Password is required'] };
    }

    if (password.length < 8) {
        issues.push('Password must be at least 8 characters');
    }
    if (password.length > 128) {
        issues.push('Password must be less than 128 characters');
    }
    if (!/[a-z]/.test(password)) {
        issues.push('Password must contain a lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        issues.push('Password must contain an uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
        issues.push('Password must contain a number');
    }

    return {
        isValid: issues.length === 0,
        issues,
    };
}

/**
 * Check required fields exist and are not empty
 */
export function validateRequired(
    data: Record<string, unknown>,
    fields: string[]
): { isValid: boolean; missing: string[] } {
    const missing: string[] = [];

    for (const field of fields) {
        const value = data[field];
        if (value === undefined || value === null || value === '') {
            missing.push(field);
        }
    }

    return {
        isValid: missing.length === 0,
        missing,
    };
}

/**
 * Validate string length
 */
export function validateLength(
    value: string,
    min: number,
    max: number
): boolean {
    if (typeof value !== 'string') return false;
    return value.length >= min && value.length <= max;
}

/**
 * Validate phone number format (accepts various formats)
 */
export function isValidPhone(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;

    // Allow digits, spaces, dashes, parentheses, and plus sign
    const phoneRegex = /^[\d\s\-+()]+$/;
    const digitsOnly = phone.replace(/\D/g, '');

    return phoneRegex.test(phone) && digitsOnly.length >= 10 && digitsOnly.length <= 15;
}

/**
 * Escape special characters for safe output
 */
export function escapeHtml(input: string): string {
    if (typeof input !== 'string') return '';

    const escapeMap: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '/': '&#x2F;',
    };

    return input.replace(/[&<>"'/]/g, (char) => escapeMap[char]);
}

/**
 * Validate UUID v7 format
 */
export function isValidUUIDv7(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') return false;

    // UUID v7 format: xxxxxxxx-xxxx-7xxx-xxxx-xxxxxxxxxxxx
    const uuidv7Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidv7Regex.test(uuid);
}

/**
 * Validation result type
 */
export interface ValidationResult {
    isValid: boolean;
    errors: Record<string, string>;
    sanitizedData?: Record<string, unknown>;
}

/**
 * Validate request body with schema
 */
export function validateBody(
    body: Record<string, unknown>,
    schema: Record<string, {
        required?: boolean;
        type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
        minLength?: number;
        maxLength?: number;
        sanitize?: boolean;
        custom?: (value: unknown) => boolean;
        customMessage?: string;
    }>
): ValidationResult {
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, unknown> = {};

    for (const [field, rules] of Object.entries(schema)) {
        const value = body[field];

        // Check required
        if (rules.required && (value === undefined || value === null || value === '')) {
            errors[field] = `${field} is required`;
            continue;
        }

        // Skip further validation if value is optional and not provided
        if (value === undefined || value === null || value === '') {
            continue;
        }

        // Check type
        if (rules.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== rules.type) {
                errors[field] = `${field} must be a ${rules.type}`;
                continue;
            }
        }

        // Check string length
        if (typeof value === 'string') {
            if (rules.minLength && value.length < rules.minLength) {
                errors[field] = `${field} must be at least ${rules.minLength} characters`;
                continue;
            }
            if (rules.maxLength && value.length > rules.maxLength) {
                errors[field] = `${field} must be less than ${rules.maxLength} characters`;
                continue;
            }
        }

        // Custom validation
        if (rules.custom && !rules.custom(value)) {
            errors[field] = rules.customMessage ?? `${field} is invalid`;
            continue;
        }

        // Sanitize string values
        if (rules.sanitize !== false && typeof value === 'string') {
            sanitizedData[field] = sanitizeString(value);
        } else {
            sanitizedData[field] = value;
        }
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors,
        sanitizedData,
    };
}
