/**
 * Quotation Status Utility Functions
 *
 * Handles status auto-complete logic for quotations.
 * Only Pharmacy department items with quantity <= 1 should auto-complete.
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
 *
 * Rules:
 * - If ALL items are pharmacy items with quantity <= 1 → 'Completed'
 * - Otherwise → 'Incomplete'
 */
export function determineInitialStatus(items: QuotationItemLike[]): string {
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
 * Determines the session type based on total quantity
 */
export function determineSessionType(items: QuotationItemLike[]): 'Per-session' | 'One-time' {
    const totalQuantity = items.reduce((sum, i) => sum + (Number(i.Quantity) || 1), 0);
    return totalQuantity > 1 ? 'Per-session' : 'One-time';
}

/**
 * Checks if a single item should be considered auto-completed.
 *
 * An item is auto-completed if:
 * - It's a Pharmacy department item AND quantity <= 1
 * - OR it has been fully used (used >= total)
 */
export function isItemAutoComplete(item: QuotationItemLike): boolean {
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
 *
 * For Pharmacy items with max <= 1: auto-completed (no tracking needed)
 * For other items: completed when used === max
 */
export function isItemTrackingCompleted(item: QuotationItemLike): boolean {
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
 *
 * Takes into account pharmacy auto-complete logic:
 * - Pharmacy items with qty <= 1 are considered automatically completed
 * - Other items need to be fully tracked to be completed
 */
export function determineStatusFromTracking(items: QuotationItemLike[]): 'Completed' | 'Incomplete' {
    if (items.length === 0) return 'Incomplete';

    // Check if ALL items are completed (either auto-completed or fully tracked)
    const allCompleted = items.every(item => isItemTrackingCompleted(item));

    return allCompleted ? 'Completed' : 'Incomplete';
}
