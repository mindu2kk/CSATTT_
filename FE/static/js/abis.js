// ========================================
// CONTRACT ABIs - BLOCKCHAIN LIBRARY SYSTEM V3
// ========================================

// RoleManager ABI
export const ROLE_MANAGER_ABI = [
    "function grantRole(address account, uint8 role) external",
    "function revokeRole(address account) external",
    "function isAdmin(address account) view returns (bool)",
    "function isLibrarian(address account) view returns (bool)",
    "function isUser(address account) view returns (bool)",
    "function hasRole(address account) view returns (bool)",
    "function getRole(address account) view returns (uint8)",
    "function getAllAdmins() view returns (address[])",
    "function getAllLibrarians() view returns (address[])",
    "function getUsers(uint256 offset, uint256 limit) view returns (address[])",
    "function getRoleStats() view returns (uint256 totalAdmins, uint256 totalLibrarians, uint256 totalUsers)",
    "event RoleGranted(address indexed account, uint8 role, uint256 timestamp)",
    "event RoleRevoked(address indexed account, uint8 oldRole, uint256 timestamp)",
    "event RoleChanged(address indexed account, uint8 oldRole, uint8 newRole, uint256 timestamp)"
];

// UserProfileV2 ABI
export const USER_PROFILE_ABI = [
    "function createProfile(string name, string emailHash, string studentId) external",
    "function updateProfile(string name, string emailHash, string studentId) external",
    "function hasActiveProfile(address user) view returns (bool)",
    "function getProfile(address user) view returns (tuple(string name, string email, string studentId, uint256 createdAt, uint256 updatedAt, bool isActive, uint256 reputation))",
    "function getUserByStudentId(string studentId) view returns (address)",
    "function getRegisteredUsers(uint256 offset, uint256 limit) view returns (address[])",
    "function getUserStats() view returns (uint256 total, uint256 active)",
    "event ProfileCreated(address indexed user, string name, string studentId, uint256 timestamp)",
    "event ProfileUpdated(address indexed user, string name, string studentId, uint256 timestamp)",
    "event ReputationUpdated(address indexed user, uint256 oldReputation, uint256 newReputation, address indexed updater)"
];

// UserCart ABI
export const USER_CART_ABI = [
    "function addToCart(uint256 bookId) external",
    "function removeFromCart(uint256 bookId) external",
    "function getMyCart() view returns (uint256[])",
    "function getCart(address user) view returns (uint256[])",
    "function getMyCartCount() view returns (uint256)",
    "function getCartCount(address user) view returns (uint256)",
    "function clearCart() external",
    "function checkInCart(address user, uint256 bookId) view returns (bool)",
    "function getCartWithMetadata(address user) view returns (uint256[] bookIds, uint256[] timestamps)",
    "event ItemAdded(address indexed user, uint256 indexed bookId, uint256 timestamp)",
    "event ItemRemoved(address indexed user, uint256 indexed bookId, uint256 timestamp)",
    "event CartCleared(address indexed user, uint256 timestamp)"
];

// LibraryCoreV3 ABI (Main Functions)
export const LIBRARY_CORE_V3_ABI = [
    "function borrowBook(uint256 bookId) payable external",
    "function returnBook(uint256 bookId, uint8 returnStatus) external",
    "function requestReturn(uint256 bookId, uint8 proposedCondition) external",
    "function approveReturn(uint256 requestId, uint8 finalCondition) external",
    "function getPendingReturnRequests() view returns (uint256[])",
    "function extendLoan(uint256 bookId) payable external",
    "function reserveBook(uint256 bookId) external",
    "function getUserCurrentLoans(address user) view returns (uint256[])",
    "function getUserLoanHistory(address user) view returns (uint256[])",
    "function getLoanInfo(uint256 bookId) view returns (tuple(address borrower, uint256 borrowedAt, uint256 dueDate, uint256 deposit, bool isReturned, uint8 statusAtLoan, uint8 statusAtReturn, uint256 returnedAt, uint256 latePenalty, uint256 damagePenalty))",
    "function isBookBorrowed(uint256 bookId) view returns (bool)",
    "function calculateCurrentPenalty(uint256 bookId) view returns (uint256)",
    "function getBookReservations(uint256 bookId) view returns (address[])",
    "function returnRequests(uint256 requestId) view returns (address borrower, uint256 bookId, uint256 requestedAt, uint8 proposedCondition, bool isPending, bool isApproved, address approvedBy, uint256 approvedAt)",
    "function returnRequestCounter() view returns (uint256)",
    "function pause() external",
    "function unpause() external",
    "function withdrawAllPenalty() external",
    "function BASE_DEPOSIT() view returns (uint256)",
    "function PENALTY_LATE_PER_DAY() view returns (uint256)",
    "function PENALTY_DAMAGE() view returns (uint256)",
    "function LOAN_PERIOD() view returns (uint256)",
    "event BookBorrowed(address indexed borrower, uint256 indexed bookId, uint256 deposit, uint256 dueDate, uint256 timestamp)",
    "event BookReturned(address indexed borrower, uint256 indexed bookId, uint256 penalty, uint256 timestamp)",
    "event BookReserved(uint256 indexed bookId, address indexed user, uint256 timestamp)",
    "event LoanExtended(uint256 indexed bookId, address indexed borrower, uint256 newDueDate, uint256 fee)",
    "event ReturnRequested(uint256 indexed requestId, address indexed borrower, uint256 indexed bookId, uint256 timestamp)",
    "event ReturnApproved(uint256 indexed requestId, address indexed approver, uint8 finalCondition, uint256 penalty, uint256 timestamp)",
    "event DeprecatedFunctionUsed(address indexed caller, string functionName, uint256 timestamp)"
];

// EscrowVault ABI
export const ESCROW_VAULT_ABI = [
    "function getDeposit(address user, uint256 bookId) view returns (uint256)",
    "function getBalance() view returns (uint256)",
    "function withdrawAllPenalty() external",
    "event Locked(address indexed user, uint256 indexed bookId, uint256 amount)",
    "event Released(address indexed to, uint256 indexed bookId, uint256 amount)",
    "event CoreSet(address indexed core)"
];

// BookNFT ABI (Essential Functions)
export const BOOK_NFT_ABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function nextBookId() view returns (uint256)",
    "function getBookInfo(uint256 tokenId) view returns (tuple(string name, string description, uint8 status, uint8 condition, uint256 createdAt, string imageBeforeHash, string imageAfterHash))",
    "function getBookStatus(uint256 tokenId) view returns (uint8)",
    "function getAllBooks() view returns (tuple(uint256 id, string name, string description, uint8 status, uint8 condition)[])",
    "function ownerOf(uint256 tokenId) view returns (address)",
    "event BookMinted(uint256 indexed tokenId, string name, uint8 status, uint8 condition)",
    "event BookStatusUpdated(uint256 indexed tokenId, uint8 oldStatus, uint8 newStatus)"
];

// Export all ABIs as object
export const ABIS = {
    roleManager: ROLE_MANAGER_ABI,
    userProfile: USER_PROFILE_ABI,
    userCart: USER_CART_ABI,
    libraryCore: LIBRARY_CORE_V3_ABI,
    escrowVault: ESCROW_VAULT_ABI,
    bookNFT: BOOK_NFT_ABI
};

// Enum mappings
export const ROLE_ENUM = {
    NONE: 0,
    USER: 1,
    LIBRARIAN: 2,
    ADMIN: 3
};

// ⚠️ DEPRECATED: Use blockchain-constants.js instead
// Book Status from BookNFT.sol (matches contract exactly)
export const BOOK_STATUS_ENUM = {
    AVAILABLE: 0,   // Sách có sẵn
    BORROWED: 1,    // Đang được mượn
    DAMAGED: 2,     // Bị hư hỏng
    LOST: 3,        // Bị mất
    OLD: 4,         // Sách cũ (return condition)
    NEW: 5          // Sách mới (return condition)
};

// ⚠️ DEPRECATED: BookStatus and Condition are the same in our contract
// Valid return conditions: AVAILABLE(0), OLD(4), DAMAGED(2), LOST(3)
export const CONDITION_ENUM = BOOK_STATUS_ENUM;



