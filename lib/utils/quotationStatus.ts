/**
 * Quotation Status Utility Functions
 *
 * Handles status auto-complete logic for quotations.
 * Pharmacy items with quantity <= 1 still auto-complete.
 * One Time Visits auto-complete all items entirely.
 */

export interface QuotationItemLike {
    Department?: string;
    Quantity?: number;
    Used?: number;
}

/**
 * Flexible match - checks if department name contains "pharmacy"
 * This handles variations like "Pharmacy", "pharmacy", "Outpatient Pharmacy", etc.
 */
export function isPharmacyDepartment(deptName: string): boolean {
    if (!deptName) return false;
    return deptName.toLowerCase().includes('pharmacy');
}

/**
 * Determines the initial status for a new quotation based on its items.
 */
export function determineInitialStatus(items: QuotationItemLike[], isOneTimeVisit: boolean = false): string {
    if (items.length === 0) return 'Incomplete';

    // Check if ALL items are pharmacy items with quantity <= 1
    const allPharmacyAutoComplete = items.every(item => {
        const isPharmacy = isPharmacyDepartment(item.Department || '');
        const qty = item.Quantity || 1;
        return isPharmacy && qty <= 1;
    });

    return allPharmacyAutoComplete ? 'Completed' : 'Incomplete';
}

/**
 * Determines the session type.
 */
export function determineSessionType(items: QuotationItemLike[], isOneTimeVisit: boolean = false): 'Per-session' | 'One-time' {
    if (isOneTimeVisit) return 'One-time';

    // Otherwise fallback logic
    const totalQuantity = items.reduce((sum, i) => sum + (Number(i.Quantity) || 1), 0);
    return totalQuantity > 1 ? 'Per-session' : 'One-time';
}

/**
 * Checks if a single item should be considered auto-completed.
 */
export function isItemAutoComplete(item: QuotationItemLike, isOneTimeVisit: boolean = false): boolean {

    const isPharmacy = isPharmacyDepartment(item.Department || '');
    const qty = item.Quantity || 1;
    const used = item.Used || 0;

    // Pharmacy items with qty <= 1 are auto-completed
    if (isPharmacy && qty <= 1) return true;

    // Otherwise, check if fully used
    return qty > 0 && used >= qty;
}

/**
 * Checks if an item should be considered completed based on tracking progress.
 */
export function isItemTrackingCompleted(item: QuotationItemLike, isOneTimeVisit: boolean = false): boolean {

    const isPharmacy = isPharmacyDepartment(item.Department || '');
    const max = item.Quantity || 1;
    const used = item.Used || 0;

    // Pharmacy items with max <= 1 are auto-completed
    if (isPharmacy && max <= 1) return true;

    // Otherwise, check if fully used
    return used === max;
}

/**
 * Determines the overall quotation status based on item usage.
 */
export function determineStatusFromTracking(items: QuotationItemLike[], isOneTimeVisit: boolean = false): 'Completed' | 'Incomplete' {
    if (items.length === 0) return 'Incomplete';

    // Check if ALL items are completed (either auto-completed or fully tracked)
    const allCompleted = items.every(item => isItemTrackingCompleted(item, false));

    return allCompleted ? 'Completed' : 'Incomplete';
}
