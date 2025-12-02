// ========================================
// BLOCKCHAIN CONSTANTS - SINGLE SOURCE OF TRUTH
// Sync with smart contracts: BookNFT.sol, LibraryCoreV3.sol
// ========================================

/**
 * Book Status Enum (from BookNFT.sol)
 * Represents the availability/state of a book
 */
export const BOOK_STATUS = {
    AVAILABLE: 0,   // Sách có sẵn để mượn
    BORROWED: 1,    // Đang được mượn
    DAMAGED: 2,     // Bị hư hỏng
    LOST: 3,        // Bị mất
    OLD: 4,         // Sách cũ (dùng cho return condition)
    NEW: 5          // Sách mới (dùng cho return condition)
};

/**
 * Book Status Display Names
 */
export const BOOK_STATUS_NAMES = {
    [BOOK_STATUS.AVAILABLE]: 'Available',
    [BOOK_STATUS.BORROWED]: 'Borrowed',
    [BOOK_STATUS.DAMAGED]: 'Damaged',
    [BOOK_STATUS.LOST]: 'Lost',
    [BOOK_STATUS.OLD]: 'Old',
    [BOOK_STATUS.NEW]: 'New'
};

/**
 * Book Status Colors (for UI badges)
 */
export const BOOK_STATUS_COLORS = {
    [BOOK_STATUS.AVAILABLE]: '#4CAF50',  // Green
    [BOOK_STATUS.BORROWED]: '#FF9800',   // Orange
    [BOOK_STATUS.DAMAGED]: '#F44336',    // Red
    [BOOK_STATUS.LOST]: '#9E9E9E',       // Gray
    [BOOK_STATUS.OLD]: '#2196F3',        // Blue
    [BOOK_STATUS.NEW]: '#00BCD4'         // Cyan
};

/**
 * Book Status Icons
 */
export const BOOK_STATUS_ICONS = {
    [BOOK_STATUS.AVAILABLE]: '✅',
    [BOOK_STATUS.BORROWED]: '📖',
    [BOOK_STATUS.DAMAGED]: '⚠️',
    [BOOK_STATUS.LOST]: '❌',
    [BOOK_STATUS.OLD]: '📚',
    [BOOK_STATUS.NEW]: '✨'
};

/**
 * Valid Return Conditions (subset of BookStatus)
 * These are the only valid values for requestReturn()
 */
export const VALID_RETURN_CONDITIONS = [
    BOOK_STATUS.NEW,        // 5 - Like new (will become Available)
    BOOK_STATUS.AVAILABLE,  // 0 - Good condition
    BOOK_STATUS.OLD,        // 4 - Fair/worn condition
    BOOK_STATUS.DAMAGED,    // 2 - Damaged
    BOOK_STATUS.LOST        // 3 - Lost
];

/**
 * Return Condition Display Names
 */
export const RETURN_CONDITION_NAMES = {
    [BOOK_STATUS.NEW]: 'Like New',
    [BOOK_STATUS.AVAILABLE]: 'Good Condition',
    [BOOK_STATUS.OLD]: 'Fair Condition',
    [BOOK_STATUS.DAMAGED]: 'Damaged',
    [BOOK_STATUS.LOST]: 'Lost'
};

/**
 * Deposit & Penalty Constants (from LibraryCoreV3.sol)
 */
export const DEPOSIT_CONSTANTS = {
    BASE_DEPOSIT: '0.01',           // ETH
    PENALTY_LATE_PER_DAY: '0.001',  // ETH per day
    PENALTY_DAMAGE: '0.005',        // ETH for damage
    LOAN_PERIOD_DAYS: 14            // Days
};

/**
 * Format deposit amount for display
 * @param {string|number} ethAmount - Amount in ETH
 * @returns {string} Formatted string like "0.01 ETH"
 */
export function formatDeposit(ethAmount) {
    const amount = typeof ethAmount === 'string' ? ethAmount : ethAmount.toString();
    return `${amount} ETH`;
}

/**
 * Get book status badge HTML
 * @param {number} status - Book status enum value
 * @returns {string} HTML for status badge
 */
export function getStatusBadge(status) {
    const name = BOOK_STATUS_NAMES[status] || 'Unknown';
    const color = BOOK_STATUS_COLORS[status] || '#666';
    const icon = BOOK_STATUS_ICONS[status] || '❓';
    
    return `<span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${color}20; color: ${color};">
        ${icon} ${name}
    </span>`;
}

/**
 * Get return condition badge HTML
 * @param {number} condition - Return condition enum value
 * @returns {string} HTML for condition badge
 */
export function getReturnConditionBadge(condition) {
    const name = RETURN_CONDITION_NAMES[condition] || 'Unknown';
    const color = BOOK_STATUS_COLORS[condition] || '#666';
    
    return `<span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; background: ${color}20; color: ${color};">
        ${name}
    </span>`;
}

/**
 * Check if a status is valid for return request
 * @param {number} status - Status to check
 * @returns {boolean} True if valid
 */
export function isValidReturnCondition(status) {
    return VALID_RETURN_CONDITIONS.includes(status);
}

/**
 * Calculate deposit amount based on book condition
 * Currently all books have same deposit, but this allows for future customization
 * @param {number} bookId - Book ID
 * @param {number} status - Book status
 * @returns {string} Deposit amount in ETH
 */
export function calculateDeposit(bookId, status) {
    // For now, all books have same deposit
    // Future: could vary based on book value, condition, etc.
    return DEPOSIT_CONSTANTS.BASE_DEPOSIT;
}

// Export all as default object for convenience
export default {
    BOOK_STATUS,
    BOOK_STATUS_NAMES,
    BOOK_STATUS_COLORS,
    BOOK_STATUS_ICONS,
    VALID_RETURN_CONDITIONS,
    RETURN_CONDITION_NAMES,
    DEPOSIT_CONSTANTS,
    formatDeposit,
    getStatusBadge,
    getReturnConditionBadge,
    isValidReturnCondition,
    calculateDeposit
};
