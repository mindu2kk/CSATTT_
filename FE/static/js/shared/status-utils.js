// ========================================
// STATUS AND CONDITION UTILITIES
// ========================================
// Centralized status/condition mapping for consistency

/**
 * Get status name from enum number
 * ========================================
 * CORRECT SMART CONTRACT DEFINITION (BookNFT.sol):
 * enum BookStatus { 
 *   Available(0), 
 *   Borrowed(1), 
 *   Damaged(2),    // ✅ Contract uses "Damaged", not "Reserved"
 *   Lost(3),
 *   Old(4),        // Not used by LibraryCore
 *   New(5)         // Not used by LibraryCore
 * }
 * ========================================
 * LibraryCore only uses 0-3 (Available, Borrowed, Damaged, Lost)
 * Values 4, 5 exist in contract but are not used by library system
 */
function getStatusName(statusNum) {
    const statusMap = {
        0: 'Available',
        1: 'Borrowed',
        2: 'Damaged',  // ✅ FIXED: Contract uses "Damaged", not "Reserved"
        3: 'Lost'
        // Note: 4=Old, 5=New exist in contract but not used by LibraryCore
    };
    
    // If invalid status, return INVALID(X) instead of hiding error
    if (statusMap[statusNum] === undefined) {
        console.error(`❌ INVALID STATUS ${statusNum} detected! Only 0-3 allowed for library system.`);
        return `INVALID(${statusNum})`;
    }
    
    return statusMap[statusNum];
}

/**
 * Get condition name from enum number
 * Condition: New(0), Good(1), Fair(2), Poor(3)
 * User simplified: New, Old
 */
function getConditionName(conditionNum) {
    const conditionMap = {
        0: 'New',
        1: 'Good',
        2: 'Fair',
        3: 'Poor'
    };
    return conditionMap[conditionNum] || 'Unknown';
}

/**
 * Get condition name simplified (New/Old only)
 */
function getConditionNameSimple(conditionNum) {
    // Map: New(0) = New, Good/Fair/Poor(1-3) = Old
    if (conditionNum === 0) {
        return 'New';
    } else {
        return 'Old';
    }
}

/**
 * Get condition percentage range
 */
function getConditionPercent(conditionNum) {
    const percentMap = {
        0: '95-100%',  // New
        1: '80-95%',   // Good
        2: '60-80%',   // Fair
        3: '20-60%'    // Poor
    };
    return percentMap[conditionNum] || '0-20%';
}

/**
 * Check if book is overdue
 */
function isBookOverdue(dueDate) {
    if (!dueDate) return false;
    const due = new Date(Number(dueDate) * 1000);
    return new Date() > due;
}

/**
 * Get status color for UI
 */
function getStatusColor(statusNum) {
    const colorMap = {
        0: '#4CAF50',  // Available - Green
        1: '#FF9800',  // Borrowed - Orange
        2: '#FF5722',  // Damaged - Deep Orange (✅ FIXED: Matches contract)
        3: '#F44336'   // Lost - Red
        // Note: 4=Old, 5=New exist in contract but not used by LibraryCore
    };
    return colorMap[statusNum] || '#666';  // Invalid = Gray
}

/**
 * Get condition color for UI
 */
function getConditionColor(conditionNum) {
    const colorMap = {
        0: '#4CAF50',  // New - Green
        1: '#2196F3',  // Good - Blue
        2: '#FF9800',  // Fair - Orange
        3: '#F44336'   // Poor - Red
    };
    return colorMap[conditionNum] || '#666';
}

// Make functions globally available
window.getStatusName = getStatusName;
window.getConditionName = getConditionName;
window.getConditionNameSimple = getConditionNameSimple;
window.getConditionPercent = getConditionPercent;
window.isBookOverdue = isBookOverdue;
window.getStatusColor = getStatusColor;
window.getConditionColor = getConditionColor;

