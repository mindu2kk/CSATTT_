// ========================================
// BLOCKCHAIN BOOKS INTEGRATION
// ========================================

// Global contracts state
window.blockchainBooks = {
    bookNFTContract: null,
    libraryCoreContract: null,
    escrowVaultContract: null,
    userProfileContract: null,
    roleManagerContract: null,
    contracts: null,
    books: []
};

// Use global DEFAULT_BOOK_IMAGE if it exists, otherwise define it
if (typeof window.DEFAULT_BOOK_IMAGE === 'undefined') {
    window.DEFAULT_BOOK_IMAGE = '/model_images/muado.jpg';
}

function resolveIpfsUrl(imageHash) {
    if (!imageHash) return window.DEFAULT_BOOK_IMAGE;
    const trimmed = imageHash.trim();
    if (!trimmed) return window.DEFAULT_BOOK_IMAGE;
    if (trimmed.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${trimmed.replace('ipfs://', '')}`;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return `https://ipfs.io/ipfs/${trimmed}`;
}

/**
 * Initialize blockchain contracts
 */
async function initBlockchainContracts() {
    try {
        if (!window.walletState.provider) {
            console.warn('Wallet not connected yet');
            return false;
        }
        
        // Load contract addresses
        const response = await fetch('/contracts.json');
        if (!response.ok) {
            console.warn('Contracts not deployed yet');
            return false;
        }
        
        window.blockchainBooks.contracts = await response.json();
        console.log('📋 Loaded contracts:', window.blockchainBooks.contracts);
        
        // FULL ABIs based on smart contracts
        const bookNFTAbi = [
            // View functions
            "function nextBookId() view returns (uint256)",
            "function getBookInfo(uint256 tokenId) view returns (tuple(string name, string description, uint8 status, uint8 condition, uint256 createdAt, string imageBeforeHash, string imageAfterHash))",
            "function ownerOf(uint256 tokenId) view returns (address)",
            "function getBookStatus(uint256 tokenId) view returns (uint8)",
            "function getTotalBooks() view returns (uint256)",
            "function getCondition(uint256 tokenId) view returns (uint8)",
            "function getBookImage(uint256 tokenId, string imageType) view returns (string)",
            // Mint functions (owner only)
            "function mintBook(string name, string description, uint8 status) returns (uint256)",
            "function mintBookWithCondition(string name, string description, uint8 status, uint8 condition) returns (uint256)",
            "function mintBookWithImage(string name, string description, uint8 status, uint8 condition, string imageBeforeHash) returns (uint256)",
            "function batchMintBooks(string[] names, string[] descriptions, uint8[] statuses) returns (uint256[])",
            // Update functions (authorized only)
            "function updateBookStatus(uint256 tokenId, uint8 newStatus)",
            "function updateCondition(uint256 tokenId, uint8 newCondition)",
            "function updateBookImage(uint256 tokenId, string imageType, string imageHash)",
            "function updateBookInfo(uint256 tokenId, string name, string description)",
            // Admin functions
            "function setAuthorizedUpdater(address updater, bool authorized)"
        ];
        
        const libraryCoreAbi = [
            // Constants
            "function BASE_DEPOSIT() view returns (uint256)",
            "function PENALTY_LATE() view returns (uint256)",
            "function PENALTY_DAMAGE() view returns (uint256)",
            "function LOAN_PERIOD() view returns (uint256)",
            // State variables
            "function bookNFT() view returns (address)",
            "function totalPenaltyCollected() view returns (uint256)",
            // View functions
            // loanInfos mapping getter (flattened outputs)
            "function loanInfos(uint256) view returns (address borrower, uint256 borrowedAt, uint256 dueDate, uint256 deposit, bool isReturned, uint8 statusAtLoan, uint8 statusAtReturn, uint256 returnedAt, uint256 latePenalty, uint256 damagePenalty)",
            "function userReputation(address) view returns (int256)",
            "function getLoanInfo(uint256 tokenId) view returns (tuple(address borrower, uint256 borrowedAt, uint256 dueDate, uint256 deposit, bool isReturned, uint8 statusAtLoan, uint8 statusAtReturn, uint256 returnedAt, uint256 latePenalty, uint256 damagePenalty))",
            "function getReputation(address user) view returns (int256)",
            "function isBookBorrowed(uint256 tokenId) view returns (bool)",
            "function getBookReservations(uint256 tokenId) view returns (address[])",
            "function hasReserved(uint256 tokenId, address user) view returns (bool)",
            "function getUserCurrentLoans(address user) view returns (uint256[])",
            "function getUserLoanHistory(address user) view returns (uint256[])",
            "function calculatePenalty(uint256 tokenId) view returns (uint256 penalty, bool isOverdue)",
            "function returnRequests(uint256) view returns (address borrower, uint256 bookId, uint256 requestedAt, uint8 proposedCondition, bool isPending, bool isApproved, address approvedBy, uint256 approvedAt)",
            "function returnRequestCounter() view returns (uint256)",
            "function getPendingReturnRequests() view returns (uint256[])",
            // Main functions
            "function borrowBook(uint256 tokenId) payable",
            "function returnBook(uint256 tokenId, uint8 afterStatus)",
            "function requestReturn(uint256 bookId, uint8 proposedCondition)",
            "function approveReturn(uint256 requestId, uint8 finalCondition)",
            "function returnBookWithImage(uint256 tokenId, uint8 afterStatus, string imageAfterHash)",
            "function extendLoan(uint256 tokenId) payable",
            "function reserveBook(uint256 tokenId)",
            "function updateBookInfo(uint256 tokenId, string name, string description)",
            "function withdrawAllPenalty()",
            "function pause()",
            "function unpause()",
            // ✅ CRITICAL: EVENT DEFINITIONS (needed for filters!)
            "event BookBorrowed(address indexed borrower, uint256 indexed tokenId, uint256 deposit, uint256 dueDate, uint256 timestamp)",
            "event BookReturned(address indexed borrower, uint256 indexed tokenId, uint256 penalty, uint256 timestamp)",
            "event BookReserved(uint256 indexed tokenId, address indexed reserver)",
            "event LoanExtended(uint256 indexed tokenId, address indexed borrower, uint256 newDueDate)",
            "event PenaltyWithdrawn(address indexed owner, uint256 amount)",
            "event BookInfoUpdated(uint256 indexed tokenId, string name, string description)",
            "event BookAvailableForReservation(uint256 indexed tokenId, address indexed reserver)",
            "event ReturnRequested(uint256 indexed requestId, address indexed borrower, uint256 indexed bookId, uint256 timestamp)",
            "event ReturnApproved(uint256 indexed requestId, address indexed approver, uint8 finalCondition, uint256 penalty, uint256 timestamp)",
            "event DeprecatedFunctionUsed(address indexed caller, string functionName, uint256 timestamp)"
        ];
        
        // ⭐ EscrowVault ABI
        const escrowVaultAbi = [
            // View functions
            "function owner() view returns (address)",
            "function libraryCore() view returns (address)",
            "function depositOf(bytes32) view returns (uint256)",
            "function getDeposit(address user, uint256 bookId) view returns (uint256)",
            "function getBalance() view returns (uint256)",
            // Main functions
            "function lock(address user, uint256 bookId, uint256 amt) payable",
            "function release(address payable to, uint256 bookId, uint256 amt)",
            "function setCore(address _core)",
            "function withdrawPenalty(uint256 amount)",
            "function withdrawAllPenalty()",
            // Events
            "event Locked(address indexed user, uint256 indexed bookId, uint256 amount)",
            "event Released(address indexed to, uint256 indexed bookId, uint256 amount)",
            "event CoreSet(address indexed core)"
        ];

        // ⭐ UserProfileV2 ABI
        const userProfileAbi = [
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

        // ⭐ RoleManager ABI
        const roleManagerAbi = [
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
        
        // Create contract instances
        window.blockchainBooks.bookNFTContract = new ethers.Contract(
            window.blockchainBooks.contracts.bookNFT,
            bookNFTAbi,
            window.walletState.provider
        );
        
        window.blockchainBooks.libraryCoreContract = new ethers.Contract(
            window.blockchainBooks.contracts.libraryCore,
            libraryCoreAbi,
            window.walletState.signer
        );
        
        // ⭐ Load EscrowVault if deployed
        if (window.blockchainBooks.contracts.escrowVault) {
            try {
                window.blockchainBooks.escrowVaultContract = new ethers.Contract(
                    window.blockchainBooks.contracts.escrowVault,
                    escrowVaultAbi,
                    window.walletState.provider
                );
                console.log('✅ EscrowVault loaded:', window.blockchainBooks.contracts.escrowVault);
                
                // Make it globally accessible
                window.escrowVaultContract = window.blockchainBooks.escrowVaultContract;
            } catch (escrowError) {
                console.warn('⚠️ Failed to load EscrowVault:', escrowError);
            }
        } else {
            console.warn('⚠️ EscrowVault not deployed');
        }

        // ⭐ Load UserProfile if deployed
        if (window.blockchainBooks.contracts.userProfile) {
            try {
                window.blockchainBooks.userProfileContract = new ethers.Contract(
                    window.blockchainBooks.contracts.userProfile,
                    userProfileAbi,
                    window.walletState.signer
                );
                console.log('✅ UserProfile loaded:', window.blockchainBooks.contracts.userProfile);
                window.userProfileContract = window.blockchainBooks.userProfileContract;
            } catch (profileError) {
                console.warn('⚠️ Failed to load UserProfile:', profileError);
            }
        } else {
            console.warn('⚠️ UserProfile not deployed');
        }

        // ⭐ Load RoleManager if deployed
        if (window.blockchainBooks.contracts.roleManager) {
            try {
                window.blockchainBooks.roleManagerContract = new ethers.Contract(
                    window.blockchainBooks.contracts.roleManager,
                    roleManagerAbi,
                    window.walletState.signer
                );
                console.log('✅ RoleManager loaded:', window.blockchainBooks.contracts.roleManager);
                window.roleManagerContract = window.blockchainBooks.roleManagerContract;
            } catch (roleError) {
                console.warn('⚠️ Failed to load RoleManager:', roleError);
            }
        } else {
            console.warn('⚠️ RoleManager not deployed');
        }
        
        console.log('✅ Contracts initialized');
        return true;
        
    } catch (error) {
        console.error('Failed to initialize contracts:', error);
        return false;
    }
}

/**
 * Load all books from blockchain
 */
async function loadBooksFromBlockchain() {
    try {
        if (!window.blockchainBooks.bookNFTContract) {
            await initBlockchainContracts();
        }
        
        if (!window.blockchainBooks.bookNFTContract) {
            console.warn('Contracts not available, using demo books');
            return getDemoBooks();
        }
        
        const nextBookId = await window.blockchainBooks.bookNFTContract.nextBookId();
        const totalBooks = Number(nextBookId);
        console.log(`📚 Loading ${totalBooks} books from blockchain...`);
        
        let depositEth = 0.01; // Standard BASE_DEPOSIT
        try {
            if (window.blockchainBooks.libraryCoreContract) {
                const baseDeposit = await window.blockchainBooks.libraryCoreContract.BASE_DEPOSIT();
                depositEth = parseFloat(ethers.utils.formatEther(baseDeposit));
            }
        } catch (depositError) {
            console.warn('⚠️ Could not load BASE_DEPOSIT, using 0.01 ETH fallback', depositError);
        }
        window.blockchainBooks.baseDepositEth = depositEth;

        const books = [];
        
        for (let i = 0; i < totalBooks; i++) {
            try {
                let owner;
                try {
                    owner = await window.blockchainBooks.bookNFTContract.ownerOf(i);
                } catch (ownerError) {
                    if (isBookNotExistError(ownerError)) {
                        console.warn(`⏭️ Skipping book ${i}: not minted`);
                        continue;
                    }
                    console.warn(`⚠️ Failed to read owner for book ${i}:`, ownerError);
                    continue;
                }
                
                const [bookInfo, status] = await Promise.all([
                    window.blockchainBooks.bookNFTContract.getBookInfo(i),
                    window.blockchainBooks.bookNFTContract.getBookStatus(i)
                ]);
                
                const statusNum = Number(status);
                const imageBeforeHash = bookInfo.imageBeforeHash || bookInfo[5] || '';
                const imageAfterHash = bookInfo.imageAfterHash || bookInfo[6] || '';
                const coverUrl = resolveIpfsUrl(imageAfterHash || imageBeforeHash);
                
                books.push({
                    id: i,
                    name: bookInfo[0] || 'Unknown Book',
                    description: bookInfo[1] || 'No description',
                    status: statusNum,
                    condition: Number(bookInfo[3]),
                    priceEth: depositEth.toFixed(2),
                    priceUsd: (depositEth * 2000).toFixed(2),
                    owner: owner,
                    imageUrl: coverUrl,
                    imageBeforeHash,
                    imageAfterHash
                });
                
                console.log(`✅ Book ${i}: "${bookInfo[0]}" - Status: ${statusNum} (${getStatusName(statusNum)})`);
            } catch (error) {
                if (isBookNotExistError(error)) {
                    console.warn(`⏭️ Skipping book ${i}: not minted`);
                    continue;
                }
                console.warn(`Failed to load book ${i}:`, error);
            }
        }
        
        window.blockchainBooks.books = books;
        console.log(`✅ Loaded ${books.length} books from blockchain`);
        return books;
        
    } catch (error) {
        console.error('Failed to load books from blockchain:', error);
        return getDemoBooks();
    }
}

/**
 * Get demo books (fallback when blockchain not available)
 */
function getDemoBooks() {
    const depositDisplay = (window.blockchainBooks && window.blockchainBooks.baseDepositEth) || 0.01;
    const depositText = depositDisplay.toFixed(2);
    return [
        {
            id: 0,
            name: 'Mưa Đỏ',
            description: 'Cuốn sách về chiến tranh Việt Nam',
            status: 0,
            condition: 1,
            priceEth: depositText,
            priceUsd: (depositDisplay * 2000).toFixed(2),
            owner: '0x0000000000000000000000000000000000000000',
            imageUrl: '/model_images/muado.jpg'
        },
        {
            id: 1,
            name: 'Đắc Nhân Tâm',
            description: 'How to Win Friends and Influence People',
            status: 0,
            condition: 0,
            priceEth: '0.0075',
            priceUsd: '15.00',
            owner: '0x0000000000000000000000000000000000000000',
            imageUrl: '/model_images/muado.jpg'
        },
        {
            id: 2,
            name: 'Nhà Giả Kim',
            description: 'The Alchemist',
            status: 0,
            condition: 1,
            priceEth: '0.0060',
            priceUsd: '12.00',
            owner: '0x0000000000000000000000000000000000000000',
            imageUrl: '/model_images/muado.jpg'
        }
    ];
}

/**
 * Render books to home page
 */
function renderBooksToPage(books) {
    const container = document.querySelector('.content');
    if (!container) return;
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create book cards with FULL INFO
        books.forEach(book => {
        const bookCard = document.createElement('div');
        bookCard.className = 'sach1';
        
        // Status and Condition
        const status = Number(book.status);
        const condition = Number(book.condition);
            // ✅ Available = 0 (Available), 5 (New), 6 (Old) - NOT 4!
            const isAvailable = status === 0 || status === 5 || status === 6;
            const coverUrl = resolveIpfsUrl(book.imageAfterHash || book.imageBeforeHash || book.imageUrl);
            const beforeLink = book.imageBeforeHash ? `<a href="${resolveIpfsUrl(book.imageBeforeHash)}" target="_blank">📷 Before</a>` : '';
            const afterLink = book.imageAfterHash ? `<a href="${resolveIpfsUrl(book.imageAfterHash)}" target="_blank">✅ After</a>` : '';
        
        // Status colors and text
        const statusColors = {
                0: '#4CAF50', // Available
                1: '#FF9800', // Borrowed
                2: '#FF5722', // Damaged
                3: '#F44336', // Lost
                4: '#8e44ad', // Old
                5: '#00b894'  // New
        };
        const statusColor = statusColors[status] || '#666';
        const statusText = getStatusName(status);
        
        // Condition colors
        const conditionColors = {
            0: '#4CAF50', // New - Green
            1: '#2196F3', // Good - Blue
            2: '#FF9800', // Fair - Orange
            3: '#F44336'  // Poor - Red
        };
        const conditionColor = conditionColors[condition] || '#666';
        const conditionText = getConditionName(condition);
        
            bookCard.innerHTML = `
            <a href="/book?id=${book.id}">
                <div class="biasach" style="background-image: url('${coverUrl}'); background-size: cover; background-position: center;"></div>
            </a>
            <div class="tensach">
                <p style="font-weight: 600; margin-bottom: 4px;">${book.name}</p>
                <small style="color: #666; font-size: 11px; display: block; margin-bottom: 8px;">ID: ${book.id}</small>
                
                <!-- Status & Condition -->
                <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                    <small style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-weight: 600; color: #555;">Status:</span>
                        <span style="padding: 2px 6px; background: ${statusColor}; color: white; border-radius: 3px; font-size: 10px; font-weight: 600;">
                            ${statusText}
                        </span>
                    </small>
                    <small style="display: flex; align-items: center; gap: 4px;">
                        <span style="font-weight: 600; color: #555;">Condition:</span>
                        <span style="padding: 2px 6px; background: ${conditionColor}; color: white; border-radius: 3px; font-size: 10px; font-weight: 600;">
                            ${conditionText}
                        </span>
                    </small>
                    ${(beforeLink || afterLink) ? `
                        <small style="display:flex; gap:8px; font-size:11px; color:#0d47a1;">
                            ${beforeLink}
                            ${afterLink}
                        </small>` : ''
                    }
                </div>
            </div>
            <div class="price">
                <p style="font-weight: 600; color: #667eea; margin-bottom: 8px;">
                    ${book.priceEth} ETH
                    <small style="display: block; font-size: 10px; color: #888;">≈ $${book.priceUsd}</small>
                </p>
                <button onclick="addToCart(${book.id}, '${book.name.replace(/'/g, "\\'")}', ${book.priceEth})" 
                        style="${!isAvailable ? 'opacity: 0.6; cursor: not-allowed;' : ''}">
                    ${isAvailable ? 'Add to Cart' : 'Not Available'}
                </button>
            </div>
        `;
        container.appendChild(bookCard);
    });
    
    console.log(`✅ Rendered ${books.length} books to page`);
}

/**
 * Get status name
 * NOTE: Keep local definition to avoid circular references
 */
function getStatusName(status) {
    const statusNum = Number(status);
    const names = {
        0: 'Available',
        1: 'Borrowed',
        2: 'Damaged',
        3: 'Lost',
        4: 'Old',
        5: 'New Arrival'
    };
    
    if (names[statusNum] === undefined) {
        console.error(`❌ INVALID STATUS ${statusNum} detected! Only 0-3 allowed. This book has corrupted data!`);
        return `INVALID(${statusNum})`;
    }
    
    return names[statusNum];
}

/**
 * Detect BookNFT "does not exist" errors (skip missing tokens)
 */
function isBookNotExistError(error) {
    if (!error) return false;
    const candidates = [
        error.reason,
        error.message,
        error?.error?.message,
        error?.data?.message,
        error?.error?.data?.message
    ];
    return candidates.filter(Boolean).some(msg => msg.includes('BookNFT: Book does not exist'));
}

/**
 * Get condition name from enum
 */
function getConditionName(condition) {
    const names = {
        0: 'New',
        1: 'Good',
        2: 'Fair',
        3: 'Poor'
    };
    return names[condition] || 'Unknown';
}

/**
 * Add book to cart (using Helper)
 */
async function addToCart(bookId, bookName, priceEth) {
    if (typeof addToCartBlockchain === 'function') {
        return await addToCartBlockchain(bookId, bookName, priceEth);
    }
    // Fallback if helper not loaded
    console.warn('Blockchain cart helper not loaded');
}

/**
 * Update cart badge count
 */
async function updateCartBadge() {
    if (typeof updateCartBadgeBlockchain === 'function') {
        await updateCartBadgeBlockchain();
    }
}

// ========================================
// CRITICAL FIX: Listen for wallet connection
// ========================================
window.addEventListener('walletConnected', async function(event) {
    console.log('📢 Wallet connected event received, initializing contracts...');
    
    // Re-initialize contracts when wallet connects
    if (typeof initBlockchainContracts === 'function') {
        await initBlockchainContracts();
    }
    
    // If on home page, reload books
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/home';
    if (isHomePage) {
        setTimeout(async () => {
            console.log('🔄 Reloading books after wallet connection...');
            const books = await loadBooksFromBlockchain();
            renderBooksToPage(books);
            updateCartBadge();
        }, 500);
    }
    
    // Always update cart badge when wallet connects
    setTimeout(async () => {
        if (typeof updateCartBadgeBlockchain === 'function') {
            await updateCartBadgeBlockchain();
        }
    }, 1000);
});

// Auto-load books when page loads
document.addEventListener('DOMContentLoaded', async function() {
    // ONLY load books on home page (not account, cart, admin, etc)
    const isHomePage = window.location.pathname === '/' || window.location.pathname === '/home';
    
    if (!isHomePage) {
        console.log('Not home page, skipping book render');
        updateCartBadge(); // Still update cart badge
        return;
    }
    
    // Wait a bit for wallet to connect
    setTimeout(async () => {
        console.log('🔄 Loading books...');
        const books = await loadBooksFromBlockchain();
        renderBooksToPage(books);
        updateCartBadge();
    }, 1000);
});
