// ========================================
// BLOCKCHAIN BOOKS INTEGRATION
// ========================================

// Global contracts state
window.blockchainBooks = {
    bookNFTContract: null,
    libraryCoreContract: null,
    contracts: null,
    books: []
};

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
            "function loanInfos(uint256) view returns (address borrower, uint256 borrowedAt, uint256 dueDate, uint256 deposit, bool isReturned, uint8 statusAtLoan, uint8 statusAtReturn, uint256 latePenalty, uint256 damagePenalty, bool overdue, bool damaged, string imageBeforeHash, string imageAfterHash)",
            "function userReputation(address) view returns (int256)",
            "function getLoanInfo(uint256 tokenId) view returns (tuple(address borrower, uint256 borrowedAt, uint256 dueDate, uint256 deposit, bool isReturned, uint8 statusAtLoan, uint8 statusAtReturn, uint256 latePenalty, uint256 damagePenalty, bool overdue, bool damaged, string imageBeforeHash, string imageAfterHash))",
            "function getReputation(address user) view returns (int256)",
            "function isBookBorrowed(uint256 tokenId) view returns (bool)",
            "function getBookReservations(uint256 tokenId) view returns (address[])",
            "function hasReserved(uint256 tokenId, address user) view returns (bool)",
            "function calculatePenalty(uint256 tokenId) view returns (uint256 penalty, bool isOverdue)",
            // Main functions
            "function borrowBook(uint256 tokenId) payable",
            "function returnBook(uint256 tokenId, uint8 afterStatus)",
            "function returnBookWithImage(uint256 tokenId, uint8 afterStatus, string imageAfterHash)",
            "function extendLoan(uint256 tokenId) payable",
            "function reserveBook(uint256 tokenId)",
            "function updateBookInfo(uint256 tokenId, string name, string description)",
            "function withdrawAllPenalty()",
            "function pause()",
            "function unpause()",
            // ✅ CRITICAL: EVENT DEFINITIONS (needed for filters!)
            "event BookBorrowed(uint256 indexed bookId, address indexed borrower, uint256 deposit, uint256 dueDate, uint256 timestamp)",
            "event BookReturned(uint256 indexed bookId, address indexed borrower, uint8 returnStatus, uint256 penaltyPaid, uint256 timestamp)",
            "event BookReserved(uint256 indexed bookId, address indexed user, uint256 timestamp)",
            "event ReputationUpdated(address indexed user, int256 oldReputation, int256 newReputation)"
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
        
        let depositEth = 0.1;
        try {
            if (window.blockchainBooks.libraryCoreContract) {
                const baseDeposit = await window.blockchainBooks.libraryCoreContract.BASE_DEPOSIT();
                depositEth = parseFloat(ethers.utils.formatEther(baseDeposit));
            }
        } catch (depositError) {
            console.warn('⚠️ Could not load BASE_DEPOSIT, using 0.1 ETH fallback', depositError);
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
                
                if (statusNum < 0 || statusNum > 3) {
                    console.error(`❌ Book ${i} has invalid status ${statusNum}, skipping`);
                    continue;
                }
                
                books.push({
                    id: i,
                    name: bookInfo[0] || 'Unknown Book',
                    description: bookInfo[1] || 'No description',
                    status: statusNum,
                    condition: Number(bookInfo[3]),
                    priceEth: depositEth,
                    priceUsd: (depositEth * 2000).toFixed(2),
                    owner: owner,
                    imageUrl: '/model_images/muado.jpg'
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
    const depositDisplay = (window.blockchainBooks && window.blockchainBooks.baseDepositEth) || 0.1;
    const depositText = depositDisplay.toFixed(4);
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
        const isAvailable = status === 0;
        
        // Status colors and text
        const statusColors = {
            0: '#4CAF50', // Available - Green
            1: '#FF9800', // Borrowed - Orange
            2: '#FF5722', // Damaged - Deep Orange (✅ Matches contract)
            3: '#F44336'  // Lost - Red
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
                <div class="biasach" style="background-image: url('${book.imageUrl}'); background-size: cover; background-position: center;"></div>
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
        3: 'Lost'
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
 * Add book to cart (will be saved to localStorage)
 */
async function addToCart(bookId, bookName, priceEth) {
    // Simple add to cart - NO status check here
    // Status will be checked during checkout
    
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
        console.warn('localStorage not available:', e);
        cart = [];
    }
    
    // Check if book already in cart
    const existingIndex = cart.findIndex(item => item.id === bookId);
    
    if (existingIndex >= 0) {
        cart[existingIndex].quantity += 1;
        alert(`Added another "${bookName}" to cart. Quantity: ${cart[existingIndex].quantity}`);
    } else {
        cart.push({
            id: bookId,
            name: bookName,
            priceEth: priceEth,
            priceUsd: (priceEth * 2000).toFixed(2),
            quantity: 1,
            imageUrl: '/model_images/muado.jpg'
        });
        alert(`Added "${bookName}" to cart!`);
    }
    
    // Save cart
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
    
    // Update cart badge
    updateCartBadge();
}

/**
 * Update cart badge count
 */
function updateCartBadge() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Find cart icon and add badge
    const cartIcon = document.querySelector('a[href*="cart"] .bx-cart');
    if (cartIcon && totalItems > 0) {
        // Add badge
        let badge = cartIcon.parentElement.querySelector('.cart-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'cart-badge';
            badge.style.cssText = 'position: absolute; top: -5px; right: -5px; background: #f44336; color: white; border-radius: 50%; width: 18px; height: 18px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold;';
            cartIcon.parentElement.style.position = 'relative';
            cartIcon.parentElement.appendChild(badge);
        }
        badge.textContent = totalItems;
    }
}

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

