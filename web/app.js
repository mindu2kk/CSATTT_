// Global variables
let provider = null;
let signer = null;
let bookNFTContract = null;
let libraryCoreContract = null;
let escrowVaultContract = null;
let userAddress = null;
let contracts = null;

// Contract ABIs (minimal - just the functions we need)
const BOOK_NFT_ABI = [
    "function mintBook(string memory name, string memory description, uint8 status) external returns (uint256)",
    "function mintBookWithCondition(string memory name, string memory description, uint8 status, uint8 condition) external returns (uint256)",
    {
        "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
        "name": "getBookInfo",
        "outputs": [
            {"internalType": "string", "name": "name", "type": "string"},
            {"internalType": "string", "name": "description", "type": "string"},
            {"internalType": "uint8", "name": "status", "type": "uint8"},
            {"internalType": "uint8", "name": "condition", "type": "uint8"},
            {"internalType": "uint256", "name": "createdAt", "type": "uint256"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    "function getBookStatus(uint256 tokenId) external view returns (uint8)",
    "function getCondition(uint256 tokenId) external view returns (uint8)",
    "function updateBookStatus(uint256 tokenId, uint8 newStatus) external",
    "function updateCondition(uint256 tokenId, uint8 newCondition) external",
    "function setAuthorizedUpdater(address updater, bool authorized) external",
    "function nextBookId() external view returns (uint256)",
    "function ownerOf(uint256 tokenId) external view returns (address)"
];

const LIBRARY_CORE_ABI = [
    "function borrowBook(uint256 bookId) external payable",
    "function returnBook(uint256 bookId, uint8 returnStatus) external",
    {
        "inputs": [{"internalType": "uint256", "name": "bookId", "type": "uint256"}],
        "name": "loanInfos",
        "outputs": [
            {"internalType": "address", "name": "borrower", "type": "address"},
            {"internalType": "uint256", "name": "borrowedAt", "type": "uint256"},
            {"internalType": "uint256", "name": "dueDate", "type": "uint256"},
            {"internalType": "uint256", "name": "deposit", "type": "uint256"},
            {"internalType": "bool", "name": "isReturned", "type": "bool"},
            {"internalType": "uint8", "name": "statusAtLoan", "type": "uint8"},
            {"internalType": "uint8", "name": "statusAtReturn", "type": "uint8"},
            {"internalType": "uint256", "name": "latePenalty", "type": "uint256"},
            {"internalType": "uint256", "name": "damagePenalty", "type": "uint256"},
            {"internalType": "bool", "name": "overdue", "type": "bool"},
            {"internalType": "bool", "name": "damaged", "type": "bool"}
        ],
        "stateMutability": "view",
        "type": "function"
    },
    "function userReputation(address user) external view returns (int256)",
    "function LOAN_DURATION() external view returns (uint256)",
    "function DEPOSIT_AMOUNT() external view returns (uint256)",
    "function pause() external",
    "function unpause() external",
    "function paused() external view returns (bool)",
    "function hasRole(bytes32 role, address account) external view returns (bool)",
    "function PAUSER() external view returns (bytes32)",
    "function LIBRARIAN() external view returns (bytes32)"
];

const ESCROW_VAULT_ABI = [
    "function getDeposit(address user, uint256 bookId) external view returns (uint256)",
    "function depositOf(bytes32) external view returns (uint256)",
    "function libraryCore() external view returns (address)",
    "function owner() external view returns (address)",
    "function getBalance() external view returns (uint256)",
    "function withdrawPenalty(uint256 amount) external",
    "function withdrawAllPenalty() external"
];

// Helper function to get book info with error handling
async function getBookInfoSafe(bookId) {
    try {
        return await bookNFTContract.getBookInfo(bookId);
    } catch (error) {
        // Decode from error data if available
        if (error.data && error.data !== '0x' && error.data.length > 2) {
            try {
                const data = error.data.slice(2);
                const offset1 = parseInt(data.slice(64, 128), 16);
                const offset2 = parseInt(data.slice(128, 192), 16);
                
                const nameOffset = offset1 * 2;
                const nameLength = parseInt(data.slice(nameOffset, nameOffset + 64), 16);
                const nameHex = data.slice(nameOffset + 64, nameOffset + 64 + nameLength * 2);
                const name = ethers.utils.toUtf8String('0x' + nameHex);
                
                const descOffset = offset2 * 2;
                const descLength = parseInt(data.slice(descOffset, descOffset + 64), 16);
                const descHex = data.slice(descOffset + 64, descOffset + 64 + descLength * 2);
                const description = ethers.utils.toUtf8String('0x' + descHex);
                
                // Condition is at index 3 (after status which is at index 2)
                // Structure: name, description, status (uint8), condition (uint8), createdAt (uint256)
                // Status is at offset 192-256, condition should be at 256-320, createdAt at 320-384
                const status = parseInt(data.slice(192, 256), 16);
                const condition = parseInt(data.slice(256, 320), 16);
                const createdAt = ethers.BigNumber.from('0x' + data.slice(320, 384));
                
                return {
                    name: name,
                    description: description,
                    status: status,
                    condition: condition,
                    createdAt: createdAt
                };
            } catch (decodeError) {
                console.error(`Failed to decode book ${bookId}:`, decodeError);
                throw error; // Re-throw original error
            }
        } else {
            throw error; // Re-throw if no data
        }
    }
}

// Status mappings
const STATUS_NAMES = {
    0: "Available",
    1: "Borrowed", 
    2: "Damaged",
    3: "Lost",
    4: "Old",
    5: "New"
};

// Condition mappings
const CONDITION_NAMES = {
    0: "New",
    1: "Good",
    2: "Fair",
    3: "Poor"
};

const CONDITION_EMOJIS = {
    0: "🆕",
    1: "✅",
    2: "⚠️",
    3: "❌"
};

const STATUS_EMOJIS = {
    0: "📗",
    1: "📚", 
    2: "📙",
    3: "📕",
    4: "📘",
    5: "📒"
};

// Wait for ethers to load
function waitForEthers() {
    return new Promise((resolve) => {
        if (typeof ethers !== 'undefined') {
            resolve();
        } else {
            const checkEthers = setInterval(() => {
                if (typeof ethers !== 'undefined') {
                    clearInterval(checkEthers);
                    resolve();
                }
            }, 100);
        }
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Library Blockchain App starting...');
    
    // Wait for ethers to load
    await waitForEthers();
    console.log('✅ Ethers loaded:', typeof ethers);
    
    await loadContracts();
    setupEventListeners();
    setupTabs();
    
    // Try to connect to MetaMask if previously connected
    if (window.ethereum && localStorage.getItem('walletConnected') === 'true') {
        await connectWallet();
    }
});

// Load contract addresses
async function loadContracts() {
    try {
        const response = await fetch('./contracts.json');
        contracts = await response.json();
        console.log('📋 Loaded contracts:', contracts);
        
        // Display contract info
        document.getElementById('contractAddresses').innerHTML = `
            <div><strong>BookNFT:</strong> ${contracts.bookNFT}</div>
            <div><strong>LibraryCore:</strong> ${contracts.libraryCore}</div>
            <div><strong>Network:</strong> ${contracts.network}</div>
            <div><strong>Chain ID:</strong> ${contracts.chainId}</div>
        `;
    } catch (error) {
        console.error('❌ Failed to load contracts:', error);
        showNotification('Failed to load contract addresses. Please deploy contracts first.', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Connection
    document.getElementById('connectButton').addEventListener('click', connectWallet);
    
    // Borrow
    document.getElementById('borrowButton').addEventListener('click', borrowBook);
    
    // Return
    document.getElementById('returnButton').addEventListener('click', returnBook);
    
    // Admin
    document.getElementById('mintButton').addEventListener('click', mintBook);
    document.getElementById('updateStatusButton').addEventListener('click', updateBookStatus);
    
    // Profile
    document.getElementById('refreshProfile').addEventListener('click', refreshProfile);
}

// Setup tab switching
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all tabs
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
            
            // Load data for specific tabs
            if (targetTab === 'books') {
                loadBooks();
            } else if (targetTab === 'profile') {
                refreshProfile();
            } else if (targetTab === 'admin') {
                refreshAdminStats();
                loadBooksForUpdate();
                loadContractStatus();
                loadEscrowVaultInfo();
            } else if (targetTab === 'borrow') {
                loadBorrowerInfo();
                loadAvailableBooksForBorrow();
            } else if (targetTab === 'return') {
                loadReturnerInfo();
                loadBorrowedBooks();
            }
        });
    });
}

// Connect to MetaMask
async function connectWallet() {
    try {
        if (!window.ethereum) {
            throw new Error('MetaMask not found! Please install MetaMask.');
        }
        
        showLoading(true);
        
        // Request account access
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create provider and signer
        provider = new ethers.providers.Web3Provider(window.ethereum);
        signer = provider.getSigner();
        userAddress = await signer.getAddress();
        
        // Check network and auto-switch if needed
        const network = await provider.getNetwork();
        if (contracts && network.chainId !== contracts.chainId) {
            console.log(`Current network: ${network.chainId}, Expected: ${contracts.chainId}`);
            
            try {
                // Try to switch network automatically
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: `0x${contracts.chainId.toString(16)}` }],
                });
                
                // Wait a bit for network switch
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (switchError) {
                console.log('Network switch failed, trying to add network:', switchError);
                
                // If switch fails, try to add the network
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: `0x${contracts.chainId.toString(16)}`,
                            chainName: 'Hardhat Local',
                            nativeCurrency: {
                                name: 'Ethereum',
                                symbol: 'ETH',
                                decimals: 18,
                            },
                            rpcUrls: ['http://127.0.0.1:8545'],
                            blockExplorerUrls: null,
                        }],
                    });
                } catch (addError) {
                    throw new Error(`Please manually switch MetaMask to Hardhat Local network (Chain ID: ${contracts.chainId})`);
                }
            }
        }
        
        // Create contract instances with explicit ABI (no auto-detection)
        if (contracts) {
            // Use explicit ABI to prevent ethers from auto-adding ERC721 functions
            bookNFTContract = new ethers.Contract(contracts.bookNFT, BOOK_NFT_ABI, signer);
            libraryCoreContract = new ethers.Contract(contracts.libraryCore, LIBRARY_CORE_ABI, signer);
            
            // Initialize EscrowVault contract if address exists
            if (contracts.escrowVault) {
                escrowVaultContract = new ethers.Contract(contracts.escrowVault, ESCROW_VAULT_ABI, signer);
            }
            
            // Test contract connection
            try {
                const testNextId = await bookNFTContract.nextBookId();
                console.log("✅ Contract connection verified - Next Book ID:", testNextId.toString());
            } catch (error) {
                console.error("❌ Contract connection test failed:", error);
                throw new Error("Failed to connect to BookNFT contract. Please check if contracts are deployed.");
            }
        }
        
        // Update UI
        const balance = await provider.getBalance(userAddress);
        document.getElementById('connectButton').style.display = 'none';
        document.getElementById('accountInfo').style.display = 'block';
        document.getElementById('accountAddress').textContent = `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`;
        document.getElementById('accountBalance').textContent = `${ethers.utils.formatEther(balance).slice(0, 6)} ETH`;
        
        localStorage.setItem('walletConnected', 'true');
        showNotification('✅ Wallet connected successfully!', 'success');
        
        // Load initial data
        loadBooks();
        loadContractStatus();
        loadEscrowVaultInfo();
        
        // Show borrower info if on borrow tab
        if (document.getElementById('borrow').classList.contains('active')) {
            loadBorrowerInfo();
            loadAvailableBooksForBorrow();
        }
        
    } catch (error) {
        console.error('❌ Connection failed:', error);
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Load all books
async function loadBooks() {
    if (!bookNFTContract) {
        console.error("BookNFT contract not initialized");
        document.getElementById('booksGrid').innerHTML = '<div class="loading error">Please connect your wallet first</div>';
        return;
    }
    
    try {
        const booksGrid = document.getElementById('booksGrid');
        booksGrid.innerHTML = '<div class="loading">Loading books...</div>';
        
        // Use explicit call to nextBookId() to avoid auto-detection issues
        const nextBookId = await bookNFTContract.nextBookId();
        const totalBooks = Number(nextBookId);
        
        console.log("📚 Next Book ID:", totalBooks);
        console.log("📚 Total books to load:", totalBooks);
        
        if (totalBooks === 0) {
            booksGrid.innerHTML = '<div class="loading">No books found. Mint some books first!</div>';
            return;
        }
        
        const bookCards = [];
        let loadedCount = 0;
        
        // Try to load books from 0 to nextBookId - 1
        for (let i = 0; i < totalBooks; i++) {
            try {
                console.log(`Loading book ${i}...`);
                
                // Load book info and owner - catch and decode if needed
                let bookInfo, owner;
                let loadError = null;
                
                try {
                    [bookInfo, owner] = await Promise.all([
                        getBookInfoSafe(i),
                        bookNFTContract.ownerOf(i)
                    ]);
                } catch (error) {
                    console.warn(`⚠️ Book ${i} failed to load:`, error.message);
                    continue; // Skip this book
                }
                
                // Create card if we successfully loaded bookInfo
                if (bookInfo) {
                    console.log(`✅ Book ${i} loaded:`, bookInfo.name);
                    console.log(`   Status:`, bookInfo.status);
                    console.log(`   Owner:`, owner);
                    
                    // Create card
                    try {
                        const card = await createBookCard(i, bookInfo, owner);
                        bookCards.push(card);
                        loadedCount++;
                        
                        // Update UI progressively
                        if (loadedCount % 2 === 0 || i === totalBooks - 1) {
                            booksGrid.innerHTML = bookCards.join('') + (i < totalBooks - 1 ? '<div class="loading">Loading more books...</div>' : '');
                        }
                    } catch (cardError) {
                        console.error(`Failed to create card for book ${i}:`, cardError);
                        // Still add a simple card even if card creation fails
                        bookCards.push(`
                            <div class="book-card">
                                <h3>📖 Book #${i}</h3>
                                <p><strong>Name:</strong> ${bookInfo.name || 'Unknown'}</p>
                                <p><strong>Description:</strong> ${bookInfo.description || 'No description'}</p>
                                <p><strong>Book ID:</strong> ${i}</p>
                                <p style="color: orange;">⚠️ Card creation error (but book exists)</p>
                            </div>
                        `);
                        loadedCount++;
                    }
                }
            } catch (error) {
                // Book doesn't exist, skip it
                console.warn(`⚠️ Book ${i} error:`, error.message);
            }
        }
        
        if (bookCards.length === 0) {
            booksGrid.innerHTML = '<div class="loading">No books found. Mint some books first!</div>';
        } else {
            booksGrid.innerHTML = bookCards.join('');
            console.log(`✅ Successfully loaded ${bookCards.length} out of ${totalBooks} books`);
            showNotification(`✅ Loaded ${bookCards.length} books`, 'success');
        }
        
    } catch (error) {
        console.error('❌ Failed to load books:', error);
        const errorMsg = error.message || error.toString();
        document.getElementById('booksGrid').innerHTML = `
            <div class="loading error">
                <h4>❌ Failed to load books</h4>
                <p>Error: ${errorMsg}</p>
                <p style="margin-top: 10px;">
                    <button onclick="loadBooks()" class="action-btn">🔄 Retry</button>
                </p>
            </div>
        `;
    }
}

// Create book card HTML with loan info
async function createBookCard(id, bookInfo, owner) {
    try {
        const status = Number(bookInfo.status);
        const statusName = STATUS_NAMES[status] || 'Unknown';
        const statusEmoji = STATUS_EMOJIS[status] || '📄';
        const statusClass = `status-${statusName.toLowerCase()}`;
        
        // Get condition (default to 0 = New if not available)
        const condition = bookInfo.condition !== undefined ? Number(bookInfo.condition) : 0;
        const conditionName = CONDITION_NAMES[condition] || 'Unknown';
        const conditionEmoji = CONDITION_EMOJIS[condition] || '📄';
        
        // Parse createdAt safely
        let createdAt = 'N/A';
        try {
            const createdAtTimestamp = Number(bookInfo.createdAt);
            createdAt = new Date(createdAtTimestamp * 1000).toLocaleString();
        } catch (error) {
            console.warn(`Failed to parse createdAt for book ${id}:`, error);
            createdAt = 'N/A';
        }
    
    // Get loan info if book is borrowed
    let loanInfoHtml = '';
    if (status == 1 && libraryCoreContract) { // Borrowed
        try {
            const loanInfo = await libraryCoreContract.loanInfos(id);
            const borrowerCheck = loanInfo.borrower || loanInfo[0];
            if (borrowerCheck && borrowerCheck !== "0x0000000000000000000000000000000000000000") {
                const borrowedAt = new Date(Number(loanInfo.borrowedAt) * 1000).toLocaleDateString();
                const dueDate = new Date(Number(loanInfo.dueDate) * 1000).toLocaleDateString();
                        const deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3] || 0);
                const isOverdue = Date.now() > Number(loanInfo.dueDate) * 1000;
                
                loanInfoHtml = `
                    <div class="loan-info" style="background: #fff3cd; padding: 8px; margin-top: 8px; border-radius: 4px; font-size: 12px;">
                        <strong>📋 Loan Details:</strong><br>
                        👤 Borrower: ${(loanInfo.borrower || loanInfo[0]).slice(0, 6)}...${(loanInfo.borrower || loanInfo[0]).slice(-4)}<br>
                        📅 Borrowed: ${borrowedAt}<br>
                        ⏰ Due: ${dueDate} ${isOverdue ? '⚠️ OVERDUE' : ''}<br>
                        💰 Deposit: ${deposit} ETH
                    </div>
                `;
            }
        } catch (error) {
            console.error(`Failed to get loan info for book ${id}:`, error);
        }
    }
    
        return `
            <div class="book-card">
                <h3>${statusEmoji} ${bookInfo.name || 'Unknown'}</h3>
                <p><strong>Description:</strong> ${bookInfo.description || 'No description'}</p>
                <p><strong>📚 Book ID:</strong> <span style="background: #e3f2fd; padding: 2px 6px; border-radius: 3px; font-weight: bold;">${id}</span></p>
                <p><strong>Owner:</strong> ${owner ? owner.slice(0, 6) + '...' + owner.slice(-4) : 'N/A'}</p>
                <p><strong>Created:</strong> ${createdAt}</p>
                <div class="book-status ${statusClass}">
                    ${statusEmoji} ${statusName}
                </div>
                <div class="book-condition" style="margin-top: 5px; font-size: 12px; color: #666;">
                    ${conditionEmoji} Condition: ${conditionName}
                </div>
                ${loanInfoHtml}
                <div class="book-actions" style="margin-top: 10px;">
                    ${status != 1 && status != 3 ? `<button onclick="quickBorrow(${id})" class="quick-btn">📚 Quick Borrow</button>` : ''}
                    ${status == 1 && userAddress && loanInfoHtml.includes(userAddress.slice(0, 6)) ? `<button onclick="quickReturn(${id})" class="quick-btn return-btn">📝 Quick Return</button>` : ''}
                </div>
            </div>
        `;
    } catch (error) {
        console.error(`Failed to create book card for book ${id}:`, error);
        // Return a simple card even if there's an error
        return `
            <div class="book-card">
                <h3>📖 Book #${id}</h3>
                <p><strong>Error loading book details</strong></p>
                <p><strong>Book ID:</strong> ${id}</p>
                <p style="color: red;">Error: ${error.message}</p>
            </div>
        `;
    }
}

// Load borrower information
async function loadBorrowerInfo() {
    if (!userAddress || !libraryCoreContract || !provider) {
        document.getElementById('borrowerInfoCard').style.display = 'none';
        return;
    }
    
    try {
        document.getElementById('borrowerInfoCard').style.display = 'block';
        
        // Get borrower info
        const reputation = await libraryCoreContract.userReputation(userAddress);
        const balance = await provider.getBalance(userAddress);
        
        // Count active loans
        let activeLoanCount = 0;
        if (bookNFTContract) {
            try {
                const nextBookId = await bookNFTContract.nextBookId();
                for (let i = 0; i < Number(nextBookId); i++) {
                    try {
                        const loanInfo = await libraryCoreContract.loanInfos(i);
                        const borrower = loanInfo.borrower || loanInfo[0];
                const isReturned = loanInfo.isReturned !== undefined ? loanInfo.isReturned : loanInfo[4];
                
                if (borrower && borrower !== '0x0000000000000000000000000000000000000000' &&
                    borrower.toLowerCase() === userAddress.toLowerCase() && !isReturned) {
                            activeLoanCount++;
                        }
                    } catch (error) {
                        // Skip if error
                    }
                }
            } catch (error) {
                console.error('Failed to count active loans:', error);
            }
        }
        
        // Update UI
        document.getElementById('borrowerAddress').textContent = userAddress;
        document.getElementById('borrowerReputation').textContent = reputation.toString();
        document.getElementById('borrowerBalance').textContent = ethers.utils.formatEther(balance).slice(0, 8) + ' ETH';
        document.getElementById('borrowerActiveLoans').textContent = activeLoanCount + ' active loan(s)';
        
    } catch (error) {
        console.error('Failed to load borrower info:', error);
    }
}

// Refresh borrower info
async function refreshBorrowerInfo() {
    await loadBorrowerInfo();
    showNotification('Borrower information refreshed', 'success');
}

// Load available books for borrow dropdown
async function loadAvailableBooksForBorrow() {
    if (!bookNFTContract) return;
    
    try {
        const nextBookId = await bookNFTContract.nextBookId();
        const select = document.getElementById('borrowBookSelect');
        
        // Clear existing options except first
        select.innerHTML = '<option value="">-- Select a book --</option>';
        
        // Add available books
        for (let i = 0; i < Number(nextBookId); i++) {
            try {
                const bookInfo = await getBookInfoSafe(i);
                const status = await bookNFTContract.getBookStatus(i);
                
                // Available books: status != 1 (Borrowed) and != 3 (Lost)
                if (status != 1 && status != 3) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Book #${i}: ${bookInfo.name}`;
                    select.appendChild(option);
                }
            } catch (error) {
                // Skip if book doesn't exist
            }
        }
    } catch (error) {
        console.error('Failed to load available books:', error);
    }
}

// Select book for borrow
async function selectBookForBorrow(bookId) {
    if (!bookId || !bookNFTContract) return;
    
    document.getElementById('borrowBookId').value = bookId;
    
    try {
        const bookInfo = await getBookInfoSafe(bookId);
        const status = await bookNFTContract.getBookStatus(bookId);
        
        // Show preview
        document.getElementById('borrowBookPreview').style.display = 'block';
        document.getElementById('borrowBookDetails').innerHTML = `
            <p><strong>Name:</strong> ${bookInfo.name}</p>
            <p><strong>Description:</strong> ${bookInfo.description}</p>
            <p><strong>Book ID:</strong> ${bookId}</p>
            <p><strong>Status:</strong> ${STATUS_NAMES[status]} ${STATUS_EMOJIS[status]}</p>
        `;
        
        // Update summary
        document.getElementById('borrowSummary').style.display = 'block';
        document.getElementById('summaryBorrower').textContent = userAddress ? userAddress.slice(0, 8) + '...' + userAddress.slice(-6) : '-';
        document.getElementById('summaryBookId').textContent = bookId;
        document.getElementById('summaryDeposit').textContent = document.getElementById('depositAmount').value + ' ETH';
        
    } catch (error) {
        console.error('Failed to load book preview:', error);
    }
}

// Update borrow summary when deposit changes
document.addEventListener('DOMContentLoaded', () => {
    const depositInput = document.getElementById('depositAmount');
    if (depositInput) {
        depositInput.addEventListener('input', () => {
            const summary = document.getElementById('borrowSummary');
            if (summary.style.display !== 'none') {
                document.getElementById('summaryDeposit').textContent = depositInput.value + ' ETH';
            }
        });
    }
});

// Borrow book
async function borrowBook() {
    if (!libraryCoreContract) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        const bookId = document.getElementById('borrowBookId').value;
        const depositAmount = document.getElementById('depositAmount').value;
        
        if (!bookId || bookId < 0) {
            throw new Error('Please enter a valid book ID');
        }
        
        if (!depositAmount || depositAmount <= 0) {
            throw new Error('Please enter a valid deposit amount');
        }
        
        showLoading(true);
        
        // Check book status first
        // Only Borrowed (1) and Lost (3) cannot be borrowed
        const bookStatus = await bookNFTContract.getBookStatus(bookId);
        if (bookStatus == 1) {
            throw new Error(`Book is already borrowed. Current status: ${STATUS_NAMES[bookStatus]}`);
        }
        if (bookStatus == 3) {
            throw new Error(`Lost books cannot be borrowed. Current status: ${STATUS_NAMES[bookStatus]}`);
        }
        
        // Borrow book
        const depositWei = ethers.utils.parseEther(depositAmount);
        const tx = await libraryCoreContract.borrowBook(bookId, { value: depositWei });
        
        showNotification('📚 Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        // Get updated loan info
        const loanInfo = await libraryCoreContract.loanInfos(bookId);
        const dueDate = new Date(Number(loanInfo.dueDate) * 1000);
        
        // Update result
        document.getElementById('borrowResult').className = 'result-section success';
        document.getElementById('borrowResult').innerHTML = `
            <h4>✅ Book borrowed successfully!</h4>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 10px;">
                <p><strong>👤 Borrower:</strong> ${userAddress}</p>
                <p><strong>📚 Book ID:</strong> ${bookId}</p>
                <p><strong>💰 Deposit:</strong> ${depositAmount} ETH</p>
                <p><strong>📅 Due Date:</strong> ${dueDate.toLocaleDateString()}</p>
                <p><strong>⏰ Due Time:</strong> ${dueDate.toLocaleTimeString()}</p>
                <p><strong>📝 Transaction Hash:</strong> ${receipt.transactionHash}</p>
                <p><strong>⛽ Gas Used:</strong> ${receipt.gasUsed.toString()}</p>
            </div>
        `;
        
        showNotification('✅ Book borrowed successfully!', 'success');
        
        // Refresh all data
        loadBooks();
        loadBorrowerInfo();
        loadAvailableBooksForBorrow();
        if (document.getElementById('admin').classList.contains('active')) {
            setTimeout(refreshAdminStats, 500);
        }
        
    } catch (error) {
        console.error('❌ Borrow failed:', error);
        document.getElementById('borrowResult').className = 'result-section error';
        document.getElementById('borrowResult').innerHTML = `
            <h4>❌ Failed to borrow book</h4>
            <p>${error.message}</p>
        `;
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Load returner information
async function loadReturnerInfo() {
    if (!userAddress || !libraryCoreContract || !provider) {
        document.getElementById('returnerInfoCard').style.display = 'none';
        return;
    }
    
    try {
        document.getElementById('returnerInfoCard').style.display = 'block';
        
        // Get returner info
        const reputation = await libraryCoreContract.userReputation(userAddress);
        
        // Count active loans
        let activeLoanCount = 0;
        if (bookNFTContract) {
            try {
                const nextBookId = await bookNFTContract.nextBookId();
                for (let i = 0; i < Number(nextBookId); i++) {
                    try {
                        const loanInfo = await libraryCoreContract.loanInfos(i);
                        const borrower = loanInfo.borrower || loanInfo[0];
                const isReturned = loanInfo.isReturned !== undefined ? loanInfo.isReturned : loanInfo[4];
                
                if (borrower && borrower !== '0x0000000000000000000000000000000000000000' &&
                    borrower.toLowerCase() === userAddress.toLowerCase() && !isReturned) {
                            activeLoanCount++;
                        }
                    } catch (error) {
                        // Skip if error
                    }
                }
            } catch (error) {
                console.error('Failed to count active loans:', error);
            }
        }
        
        // Update UI
        document.getElementById('returnerAddress').textContent = userAddress;
        document.getElementById('returnerReputation').textContent = reputation.toString();
        document.getElementById('returnerActiveLoans').textContent = activeLoanCount + ' active loan(s)';
        
    } catch (error) {
        console.error('Failed to load returner info:', error);
    }
}

// Refresh returner info
async function refreshReturnerInfo() {
    await loadReturnerInfo();
    await loadBorrowedBooks();
    showNotification('Returner information refreshed', 'success');
}

// Load borrowed books for current user
async function loadBorrowedBooks() {
    if (!userAddress || !bookNFTContract || !libraryCoreContract) {
        document.getElementById('borrowedBooksList').innerHTML = '<p>Please connect your wallet first</p>';
        return;
    }
    
    try {
        const nextBookId = await bookNFTContract.nextBookId();
        const select = document.getElementById('returnBookSelect');
        const listDiv = document.getElementById('borrowedBooksList');
        
        // Clear
        select.innerHTML = '<option value="">-- Select a book to return --</option>';
        let borrowedBooks = [];
        
        // Find borrowed books
        for (let i = 0; i < Number(nextBookId); i++) {
            try {
                const loanInfo = await libraryCoreContract.loanInfos(i);
                
                const borrower = loanInfo.borrower || loanInfo[0];
                const isReturned = loanInfo.isReturned !== undefined ? loanInfo.isReturned : loanInfo[4];
                
                if (borrower && borrower !== '0x0000000000000000000000000000000000000000' &&
                    borrower.toLowerCase() === userAddress.toLowerCase() && !isReturned) {
                    const bookInfo = await getBookInfoSafe(i);
                    const borrowedAt = new Date(Number(loanInfo.borrowedAt) * 1000);
                    const dueDate = new Date(Number(loanInfo.dueDate) * 1000);
                    const isOverdue = Date.now() > dueDate.getTime();
                    
                    borrowedBooks.push({
                        bookId: i,
                        bookInfo: bookInfo,
                        loanInfo: loanInfo,
                        borrowedAt: borrowedAt,
                        dueDate: dueDate,
                        isOverdue: isOverdue
                    });
                }
            } catch (error) {
                // Skip if error
            }
        }
        
        if (borrowedBooks.length === 0) {
            listDiv.innerHTML = '<p style="text-align: center; color: #6c757d;">No borrowed books found</p>';
            return;
        }
        
        // Display borrowed books
        let booksHtml = '';
        borrowedBooks.forEach(book => {
            // Add to dropdown
            const option = document.createElement('option');
            option.value = book.bookId;
            option.textContent = `Book #${book.bookId}: ${book.bookInfo.name} ${book.isOverdue ? '(⚠️ OVERDUE)' : ''}`;
            select.appendChild(option);
            
            // Add to list
            booksHtml += `
                <div class="borrowed-book-card" onclick="selectBorrowedBook(${book.bookId})">
                    <h4>📚 ${book.bookInfo.name} ${book.isOverdue ? '⚠️ OVERDUE' : ''}</h4>
                    <div class="book-meta">
                        <div><strong>Book ID:</strong> ${book.bookId}</div>
                        <div><strong>Borrowed:</strong> ${book.borrowedAt.toLocaleDateString()}</div>
                        <div><strong>Due Date:</strong> ${book.dueDate.toLocaleDateString()}</div>
                        <div><strong>Deposit:</strong> ${ethers.utils.formatEther(book.loanInfo.deposit || book.loanInfo[3] || 0)} ETH</div>
                    </div>
                </div>
            `;
        });
        
        listDiv.innerHTML = booksHtml;
        
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        document.getElementById('borrowedBooksList').innerHTML = '<p style="color: red;">Failed to load borrowed books</p>';
    }
}

// Select borrowed book for return
function selectBorrowedBook(bookId) {
    document.getElementById('returnBookId').value = bookId;
    document.getElementById('returnBookSelect').value = bookId;
    selectBookForReturn(bookId);
}

// Select book for return
async function selectBookForReturn(bookId) {
    if (!bookId || !bookNFTContract || !libraryCoreContract) return;
    
    document.getElementById('returnBookId').value = bookId;
    
    try {
        const bookInfo = await getBookInfoSafe(bookId);
        const loanInfo = await libraryCoreContract.loanInfos(bookId);
        
        const borrowerCheck = loanInfo.borrower || loanInfo[0];
        if (borrowerCheck.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('You did not borrow this book');
        }
        
        const borrowedAt = new Date(Number(loanInfo.borrowedAt) * 1000);
        const dueDate = new Date(Number(loanInfo.dueDate) * 1000);
        const isOverdue = Date.now() > dueDate.getTime();
                        const deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3] || 0);
        
        // Show preview
        document.getElementById('returnBookPreview').style.display = 'block';
        document.getElementById('returnLoanDetails').innerHTML = `
            <p><strong>Book Name:</strong> ${bookInfo.name}</p>
            <p><strong>Book ID:</strong> ${bookId}</p>
            <p><strong>Borrowed:</strong> ${borrowedAt.toLocaleString()}</p>
            <p><strong>Due Date:</strong> ${dueDate.toLocaleString()} ${isOverdue ? '⚠️ OVERDUE' : ''}</p>
            <p><strong>Deposit:</strong> ${deposit} ETH</p>
            <p><strong>Days ${isOverdue ? 'Overdue' : 'Remaining'}:</strong> ${Math.abs(Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))} days</p>
        `;
        
        // Update summary
        updateReturnSummary(bookId, loanInfo);
        
    } catch (error) {
        console.error('Failed to load return preview:', error);
        showNotification(error.message, 'error');
    }
}

// Update return summary
function updateReturnSummary(bookId, loanInfo) {
    const returnStatus = document.getElementById('returnStatus').value;
                        const deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3] || 0);
    
    let reputationChange = 0;
    let penalty = '0 ETH';
    let depositReturn = deposit;
    
    if (returnStatus == '0') {
        reputationChange = 1;
        depositReturn = deposit;
    } else if (returnStatus == '2') {
        reputationChange = -5;
        penalty = (parseFloat(deposit) * 0.5).toFixed(4) + ' ETH';
        depositReturn = (parseFloat(deposit) * 0.5).toFixed(4) + ' ETH';
    } else if (returnStatus == '3') {
        reputationChange = -10;
        penalty = deposit;
        depositReturn = '0 ETH';
    }
    
    document.getElementById('returnSummary').style.display = 'block';
    document.getElementById('summaryReturner').textContent = userAddress ? userAddress.slice(0, 8) + '...' + userAddress.slice(-6) : '-';
    document.getElementById('summaryReturnBookId').textContent = bookId;
    document.getElementById('summaryDepositReturn').textContent = depositReturn;
    document.getElementById('summaryReturnReputation').textContent = (reputationChange > 0 ? '+' : '') + reputationChange;
    document.getElementById('summaryPenalty').textContent = penalty;
}

// Update return impact when status changes
function updateReturnImpact() {
    const bookId = document.getElementById('returnBookId').value;
    if (!bookId || !libraryCoreContract) return;
    
    libraryCoreContract.loanInfos(bookId).then(loanInfo => {
        updateReturnSummary(bookId, loanInfo);
    }).catch(error => {
        console.error('Failed to update return impact:', error);
    });
}

// Return book
async function returnBook() {
    if (!libraryCoreContract) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        const bookId = document.getElementById('returnBookId').value;
        const returnStatus = document.getElementById('returnStatus').value;
        
        if (!bookId || bookId < 0) {
            throw new Error('Please enter a valid book ID');
        }
        
        showLoading(true);
        
        // Check if user has borrowed this book
        let loanInfo;
        try {
            loanInfo = await libraryCoreContract.loanInfos(bookId);
        } catch (error) {
            // If loanInfos doesn't exist or error, check if book is borrowed
            const bookStatus = await bookNFTContract.getBookStatus(bookId);
            if (bookStatus != 1) { // Not borrowed
                throw new Error('This book is not currently borrowed');
            }
            throw new Error('Unable to get loan information. Please try again.');
        }
        
        // Check if borrower is valid
        const borrower = loanInfo.borrower || loanInfo[0];
        if (!borrower || borrower === '0x0000000000000000000000000000000000000000') {
            throw new Error('This book has no active loan');
        }
        
        if (borrower.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('You have not borrowed this book');
        }
        
        // Check if already returned 
        // Structure: [0]=borrower, [1]=borrowedAt, [2]=dueDate, [3]=deposit, [4]=isReturned
        const isReturned = loanInfo.isReturned !== undefined ? loanInfo.isReturned : loanInfo[4];
        console.log(`Book ${bookId} loanInfo debug:`, {
            borrower: borrower,
            isReturned: isReturned,
            loanInfo: loanInfo
        });
        
        if (isReturned === true || isReturned === 'true') {
            throw new Error('This book has already been returned');
        }
        
        // Return book
        const tx = await libraryCoreContract.returnBook(bookId, returnStatus);
        
        showNotification('📝 Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        // Get updated info
        const loanInfoAfter = await libraryCoreContract.loanInfos(bookId);
        const reputationAfter = await libraryCoreContract.userReputation(userAddress);
        
        // Get book info - use safe helper
        let bookInfo;
        try {
            bookInfo = await getBookInfoSafe(bookId);
        } catch (error) {
            // Fallback if decode also fails
            console.warn(`Failed to get book info for ${bookId}, using fallback:`, error);
            bookInfo = {
                name: `Book #${bookId}`,
                description: 'Book information',
                status: 0,
                createdAt: ethers.BigNumber.from(0)
            };
        }
        
        // Update result
        document.getElementById('returnResult').className = 'result-section success';
        document.getElementById('returnResult').innerHTML = `
            <h4>✅ Book returned successfully!</h4>
            <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; margin-top: 10px;">
                <p><strong>👤 Returner:</strong> ${userAddress}</p>
                <p><strong>📚 Book ID:</strong> ${bookId}</p>
                <p><strong>📖 Book Name:</strong> ${bookInfo.name}</p>
                <p><strong>📊 Return Status:</strong> ${STATUS_NAMES[returnStatus]} ${STATUS_EMOJIS[returnStatus]}</p>
                <p><strong>⭐ New Reputation:</strong> ${reputationAfter.toString()}</p>
                ${loanInfoAfter.latePenalty > 0 ? `<p><strong>⚠️ Late Penalty:</strong> ${ethers.utils.formatEther(loanInfoAfter.latePenalty)} ETH</p>` : ''}
                ${loanInfoAfter.damagePenalty > 0 ? `<p><strong>⚠️ Damage Penalty:</strong> ${ethers.utils.formatEther(loanInfoAfter.damagePenalty)} ETH</p>` : ''}
                <p><strong>📝 Transaction Hash:</strong> ${receipt.transactionHash}</p>
                <p><strong>⛽ Gas Used:</strong> ${receipt.gasUsed.toString()}</p>
            </div>
        `;
        
        showNotification('✅ Book returned successfully!', 'success');
        
        // Refresh all data
        loadBooks();
        refreshProfile();
        loadReturnerInfo();
        loadBorrowedBooks();
        if (document.getElementById('admin').classList.contains('active')) {
            setTimeout(refreshAdminStats, 500);
        }
        
    } catch (error) {
        console.error('❌ Return failed:', error);
        document.getElementById('returnResult').className = 'result-section error';
        document.getElementById('returnResult').innerHTML = `
            <h4>❌ Failed to return book</h4>
            <p>${error.message}</p>
        `;
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Mint book (admin)
async function mintBook() {
    if (!bookNFTContract) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        const name = document.getElementById('bookName').value;
        const description = document.getElementById('bookDescription').value;
        const status = document.getElementById('bookStatus').value;
        
        if (!name || !description) {
            throw new Error('Please fill in all fields');
        }
        
        showLoading(true);
        
        // Get nextBookId before mint to know what the new ID will be
        const nextBookIdBefore = await bookNFTContract.nextBookId();
        const expectedBookId = Number(nextBookIdBefore);
        
        // Get condition from UI (default to 0 = New)
        const condition = document.getElementById('bookCondition') ? document.getElementById('bookCondition').value : '0';
        
        // Mint book with condition
        const tx = await bookNFTContract.mintBookWithCondition(name, description, status, condition);
        
        showNotification('➕ Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        // Verify the actual book ID (should be expectedBookId)
        const actualBookId = expectedBookId;
        
        // Update result
        document.getElementById('adminResult').className = 'result-section success';
        document.getElementById('adminResult').innerHTML = `
            <h4>✅ Book minted successfully!</h4>
            <p><strong>📚 New Book ID:</strong> ${actualBookId}</p>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Description:</strong> ${description}</p>
            <p><strong>Status:</strong> ${STATUS_NAMES[status]}</p>
            <p><strong>Condition:</strong> ${CONDITION_NAMES[condition]} ${CONDITION_EMOJIS[condition]}</p>
            <p><strong>Transaction Hash:</strong> ${receipt.transactionHash}</p>
            <div style="background: #e8f5e8; padding: 10px; margin-top: 10px; border-radius: 5px;">
                💡 <strong>Use Book ID ${actualBookId} for borrowing and updates</strong>
            </div>
        `;
        
        showNotification('✅ Book minted successfully!', 'success');
        
        // Clear form
        document.getElementById('bookName').value = '';
        document.getElementById('bookDescription').value = '';
        document.getElementById('bookStatus').value = '0';
        if (document.getElementById('bookCondition')) {
            document.getElementById('bookCondition').value = '0';
        }
        
        // Refresh all data
        loadBooks();
        if (document.getElementById('admin').classList.contains('active')) {
            setTimeout(refreshAdminStats, 500);
        }
        
    } catch (error) {
        console.error('❌ Mint failed:', error);
        document.getElementById('adminResult').className = 'result-section error';
        document.getElementById('adminResult').innerHTML = `
            <h4>❌ Failed to mint book</h4>
            <p>${error.message}</p>
        `;
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Load all books for update dropdown
async function loadBooksForUpdate() {
    if (!bookNFTContract) return;
    
    try {
        const nextBookId = await bookNFTContract.nextBookId();
        const select = document.getElementById('updateBookSelect');
        
        // Clear existing options except first
        select.innerHTML = '<option value="">-- Select a book to update --</option>';
        
        // Add all books
        for (let i = 0; i < Number(nextBookId); i++) {
            try {
                const bookInfo = await getBookInfoSafe(i);
                const status = await bookNFTContract.getBookStatus(i);
                
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Book #${i}: ${bookInfo.name} (${STATUS_NAMES[status]})`;
                select.appendChild(option);
            } catch (error) {
                // Skip if book doesn't exist
            }
        }
    } catch (error) {
        console.error('Failed to load books for update:', error);
    }
}

// Select book for update
async function selectBookForUpdate(bookId) {
    if (!bookId || !bookNFTContract) return;
    
    document.getElementById('updateBookId').value = bookId;
    
    try {
        const bookInfo = await getBookInfoSafe(bookId);
        const status = await bookNFTContract.getBookStatus(bookId);
        
        // Show preview
        document.getElementById('updateBookPreview').style.display = 'block';
        document.getElementById('updateBookDetails').innerHTML = `
            <p><strong>Name:</strong> ${bookInfo.name}</p>
            <p><strong>Description:</strong> ${bookInfo.description}</p>
            <p><strong>Book ID:</strong> ${bookId}</p>
            <p><strong>Current Status:</strong> ${STATUS_NAMES[status]} ${STATUS_EMOJIS[status]}</p>
        `;
        
        // Set current status in dropdown
        document.getElementById('newStatus').value = status;
        
        // Get and display condition
        try {
            const condition = await bookNFTContract.getCondition(bookId);
            const conditionName = CONDITION_NAMES[condition] || 'Unknown';
            const conditionEmoji = CONDITION_EMOJIS[condition] || '📄';
            
            document.getElementById('updateBookDetails').innerHTML += `
                <p><strong>Current Condition:</strong> ${conditionEmoji} ${conditionName}</p>
            `;
            
            // Set current condition in update condition form
            if (document.getElementById('updateConditionBookId')) {
                document.getElementById('updateConditionBookId').value = bookId;
            }
            if (document.getElementById('newCondition')) {
                document.getElementById('newCondition').value = condition;
            }
        } catch (error) {
            console.error('Failed to get condition:', error);
        }
        
    } catch (error) {
        console.error('Failed to load book preview:', error);
    }
}

// Update book status (admin)
async function updateBookStatus() {
    if (!bookNFTContract) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        const bookId = document.getElementById('updateBookId').value;
        const newStatus = document.getElementById('newStatus').value;
        
        if (!bookId || bookId < 0) {
            throw new Error('Please enter a valid book ID');
        }
        
        showLoading(true);
        
        // Update status
        const tx = await bookNFTContract.updateBookStatus(bookId, newStatus);
        
        showNotification('🔧 Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        // Update result
        document.getElementById('adminResult').className = 'result-section success';
        document.getElementById('adminResult').innerHTML = `
            <h4>✅ Book status updated successfully!</h4>
            <p><strong>Book ID:</strong> ${bookId}</p>
            <p><strong>New Status:</strong> ${STATUS_NAMES[newStatus]}</p>
            <p><strong>Transaction Hash:</strong> ${receipt.transactionHash}</p>
        `;
        
        showNotification('✅ Book status updated successfully!', 'success');
        
        // Refresh all data
        loadBooks();
        if (document.getElementById('admin').classList.contains('active')) {
            setTimeout(refreshAdminStats, 500);
        }
        
    } catch (error) {
        console.error('❌ Update failed:', error);
        document.getElementById('adminResult').className = 'result-section error';
        document.getElementById('adminResult').innerHTML = `
            <h4>❌ Failed to update book status</h4>
            <p>${error.message}</p>
        `;
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Refresh profile
async function refreshProfile() {
    if (!libraryCoreContract || !userAddress) {
        document.getElementById('reputationScore').textContent = 'Please connect wallet';
        document.getElementById('currentLoans').textContent = 'Please connect wallet';
        document.getElementById('loanHistory').textContent = 'Please connect wallet';
        return;
    }
    
    try {
        // Get reputation
        const reputation = await libraryCoreContract.userReputation(userAddress);
        document.getElementById('reputationScore').textContent = reputation.toString();
        
        // Get current loans and history
        let currentLoans = [];
        let loanHistory = [];
        
        if (bookNFTContract) {
            const nextBookId = await bookNFTContract.nextBookId();
            
            for (let i = 0; i < Number(nextBookId); i++) {
                try {
                    const loanInfo = await libraryCoreContract.loanInfos(i);
                    
                    const borrowerCheck = loanInfo.borrower || loanInfo[0];
                    if (borrowerCheck && borrowerCheck.toLowerCase() === userAddress.toLowerCase()) {
                        const bookInfo = await getBookInfoSafe(i);
                        
                        const loan = {
                            bookId: i,
                            bookName: bookInfo.name,
                            borrowedAt: new Date(Number(loanInfo.borrowedAt) * 1000),
                            dueDate: new Date(Number(loanInfo.dueDate) * 1000),
                            deposit: ethers.utils.formatEther(loanInfo.deposit),
                            isReturned: loanInfo.isReturned !== undefined ? loanInfo.isReturned : loanInfo[4]
                        };
                        
                        const isReturnedCheck = loanInfo.isReturned !== undefined ? loanInfo.isReturned : loanInfo[4];
                        if (isReturnedCheck) {
                            loanHistory.push(loan);
                        } else {
                            currentLoans.push(loan);
                        }
                    }
                } catch (error) {
                    console.error(`Failed to check loan for book ${i}:`, error);
                }
            }
        }
        
        // Update current loans
        if (currentLoans.length === 0) {
            document.getElementById('currentLoans').innerHTML = '<p>No current loans</p>';
        } else {
            const loansHtml = currentLoans.map(loan => `
                <div class="loan-item">
                    <strong>${loan.bookName}</strong> (ID: ${loan.bookId})<br>
                    Due: ${loan.dueDate.toLocaleDateString()}<br>
                    Deposit: ${loan.deposit} ETH
                </div>
            `).join('');
            document.getElementById('currentLoans').innerHTML = loansHtml;
        }
        
        // Update loan history
        if (loanHistory.length === 0) {
            document.getElementById('loanHistory').innerHTML = '<p>No loan history</p>';
        } else {
            const historyHtml = loanHistory.slice(-5).map(loan => `
                <div class="loan-item">
                    <strong>${loan.bookName}</strong> (ID: ${loan.bookId})<br>
                    Borrowed: ${loan.borrowedAt.toLocaleDateString()}<br>
                    Returned: ✅
                </div>
            `).join('');
            document.getElementById('loanHistory').innerHTML = historyHtml;
        }
        
    } catch (error) {
        console.error('❌ Failed to refresh profile:', error);
        showNotification('Failed to refresh profile', 'error');
    }
}

// Utility functions
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

// Handle account changes
if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
            // User disconnected
            localStorage.removeItem('walletConnected');
            location.reload();
        } else {
            // User switched accounts
            location.reload();
        }
    });
    
    window.ethereum.on('chainChanged', (chainId) => {
        // User switched networks
        location.reload();
    });
}

// Add quick action functions
function quickBorrow(bookId) {
    document.getElementById('borrowBookId').value = bookId;
    // Switch to borrow tab
    document.querySelector('[data-tab="borrow"]').click();
    // Scroll to form
    document.getElementById('borrowBookId').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('borrowBookId').focus();
}

function quickReturn(bookId) {
    document.getElementById('returnBookId').value = bookId;
    // Switch to return tab
    document.querySelector('[data-tab="return"]').click();
    // Scroll to form
    document.getElementById('returnBookId').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('returnBookId').focus();
}

// Add library statistics
async function loadLibraryStats() {
    if (!bookNFTContract || !libraryCoreContract) return null;
    
    try {
        const nextBookId = await bookNFTContract.nextBookId();
        let availableCount = 0;
        let borrowedCount = 0;
        let totalDeposit = ethers.BigNumber.from(0);
        let activeLoans = [];
        
        for (let i = 0; i < Number(nextBookId); i++) {
            try {
                const status = await bookNFTContract.getBookStatus(i);
                // Available books: status != 1 (Borrowed) and != 3 (Lost)
                if (status != 1 && status != 3) availableCount++;
                if (status == 1) {
                    borrowedCount++;
                    const loanInfo = await libraryCoreContract.loanInfos(i);
                    const isReturnedCheck = loanInfo.isReturned !== undefined ? loanInfo.isReturned : loanInfo[4];
                    if (!isReturnedCheck) {
                        totalDeposit = totalDeposit.add(loanInfo.deposit);
                        activeLoans.push({
                            bookId: i,
                            borrower: loanInfo.borrower || loanInfo[0],
                            deposit: loanInfo.deposit,
                            dueDate: new Date(Number(loanInfo.dueDate) * 1000),
                            borrowedAt: new Date(Number(loanInfo.borrowedAt) * 1000)
                        });
                    }
                }
            } catch (error) {
                console.error(`Failed to get stats for book ${i}:`, error);
            }
        }
        
        return {
            totalBooks: Number(nextBookId),
            availableCount,
            borrowedCount,
            totalDeposit: ethers.utils.formatEther(totalDeposit),
            activeLoans
        };
    } catch (error) {
        console.error('Failed to load library stats:', error);
        return null;
    }
}

// Refresh admin statistics  
async function refreshAdminStats() {
    const stats = await loadLibraryStats();
    if (!stats) {
        showNotification('Failed to load library statistics', 'error');
        return;
    }
    
    // Update stat cards
    document.getElementById('totalBooksCount').textContent = stats.totalBooks;
    document.getElementById('availableBooksCount').textContent = stats.availableCount;
    document.getElementById('borrowedBooksCount').textContent = stats.borrowedCount;
    document.getElementById('totalDepositsAmount').textContent = parseFloat(stats.totalDeposit).toFixed(2);
    
    // Update active loans table
    const activeLoansTable = document.getElementById('activeLoansTable');
    
    if (stats.activeLoans.length === 0) {
        activeLoansTable.innerHTML = '<p style="text-align: center; color: #6c757d;">No active loans</p>';
    } else {
        const loansHtml = `
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8f9fa; text-align: left;">
                        <th style="padding: 10px; border: 1px solid #dee2e6;">Book ID</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">Borrower</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">Borrowed</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">Due Date</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">Deposit</th>
                        <th style="padding: 10px; border: 1px solid #dee2e6;">Status</th>
                    </tr>
                </thead>
                <tbody>
                    ${stats.activeLoans.map(loan => {
                        const isOverdue = Date.now() > loan.dueDate.getTime();
                        const statusColor = isOverdue ? '#e74c3c' : '#27ae60';
                        const statusText = isOverdue ? '⚠️ OVERDUE' : '✅ Active';
                        
                        return `
                            <tr>
                                <td style="padding: 8px; border: 1px solid #dee2e6; text-align: center; font-weight: bold;">${loan.bookId}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6; font-family: monospace;">${loan.borrower.slice(0, 8)}...${loan.borrower.slice(-6)}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${loan.borrowedAt.toLocaleDateString()}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${loan.dueDate.toLocaleDateString()}</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6;">${ethers.utils.formatEther(loan.deposit)} ETH</td>
                                <td style="padding: 8px; border: 1px solid #dee2e6; color: ${statusColor}; font-weight: bold;">${statusText}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        activeLoansTable.innerHTML = loansHtml;
    }
    
    console.log('📊 Admin stats refreshed:', stats);
}

// Pause contract (admin only)
async function pauseContract() {
    if (!libraryCoreContract) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const tx = await libraryCoreContract.pause();
        showNotification('⏸️ Pause transaction sent! Waiting for confirmation...', 'info');
        const receipt = await tx.wait();
        
        showNotification('✅ Contract paused successfully!', 'success');
        await refreshAdminStats();
        await loadContractStatus();
    } catch (error) {
        console.error('❌ Pause failed:', error);
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Unpause contract (admin only)
async function unpauseContract() {
    if (!libraryCoreContract) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        showLoading(true);
        const tx = await libraryCoreContract.unpause();
        showNotification('▶️ Unpause transaction sent! Waiting for confirmation...', 'info');
        const receipt = await tx.wait();
        
        showNotification('✅ Contract unpaused successfully!', 'success');
        await refreshAdminStats();
        await loadContractStatus();
    } catch (error) {
        console.error('❌ Unpause failed:', error);
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Update book condition (admin)
async function updateBookCondition() {
    if (!bookNFTContract) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        const bookId = document.getElementById('updateConditionBookId') ? document.getElementById('updateConditionBookId').value : document.getElementById('updateBookId').value;
        const newCondition = document.getElementById('newCondition') ? document.getElementById('newCondition').value : '0';
        
        if (!bookId || bookId < 0) {
            throw new Error('Please enter a valid book ID');
        }
        
        showLoading(true);
        
        const tx = await bookNFTContract.updateCondition(bookId, newCondition);
        
        showNotification('🔧 Transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        document.getElementById('adminResult').className = 'result-section success';
        document.getElementById('adminResult').innerHTML = `
            <h4>✅ Book condition updated successfully!</h4>
            <p><strong>Book ID:</strong> ${bookId}</p>
            <p><strong>New Condition:</strong> ${CONDITION_NAMES[newCondition]} ${CONDITION_EMOJIS[newCondition]}</p>
            <p><strong>Transaction Hash:</strong> ${receipt.transactionHash}</p>
        `;
        
        showNotification('✅ Book condition updated successfully!', 'success');
        
        loadBooks();
        if (document.getElementById('admin').classList.contains('active')) {
            setTimeout(refreshAdminStats, 500);
        }
        
    } catch (error) {
        console.error('❌ Update condition failed:', error);
        document.getElementById('adminResult').className = 'result-section error';
        document.getElementById('adminResult').innerHTML = `
            <h4>❌ Failed to update book condition</h4>
            <p>${error.message}</p>
        `;
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// Load contract status (paused/unpaused)
async function loadContractStatus() {
    if (!libraryCoreContract || !userAddress) return;
    
    try {
        const isPaused = await libraryCoreContract.paused();
        const PAUSER_ROLE = await libraryCoreContract.PAUSER();
        const hasPauserRole = await libraryCoreContract.hasRole(PAUSER_ROLE, userAddress);
        
        const pauseStatusDiv = document.getElementById('pauseStatus');
        const pauseButton = document.getElementById('pauseButton');
        const unpauseButton = document.getElementById('unpauseButton');
        
        if (pauseStatusDiv) {
            pauseStatusDiv.textContent = isPaused ? '⏸️ PAUSED' : '▶️ ACTIVE';
            pauseStatusDiv.style.color = isPaused ? '#e74c3c' : '#27ae60';
        }
        
        if (pauseButton) {
            pauseButton.disabled = !hasPauserRole || isPaused;
            pauseButton.style.display = hasPauserRole ? 'inline-block' : 'none';
        }
        
        if (unpauseButton) {
            unpauseButton.disabled = !hasPauserRole || !isPaused;
            unpauseButton.style.display = hasPauserRole ? 'inline-block' : 'none';
        }
    } catch (error) {
        console.error('Failed to load contract status:', error);
    }
}

// Load EscrowVault info
async function loadEscrowVaultInfo() {
    if (!escrowVaultContract || !libraryCoreContract || !userAddress) return;
    
    try {
        const vaultBalance = await escrowVaultContract.getBalance();
        const libraryCoreAddress = await escrowVaultContract.libraryCore();
        const vaultOwner = await escrowVaultContract.owner();
        const isOwner = vaultOwner.toLowerCase() === userAddress.toLowerCase();
        
        const escrowInfoDiv = document.getElementById('escrowVaultInfo');
        if (escrowInfoDiv) {
            let withdrawButtons = '';
            if (isOwner && vaultBalance > 0) {
                withdrawButtons = `
                    <div style="margin-top: 10px;">
                        <button onclick="withdrawAllPenalty()" class="action-btn" style="background: #27ae60; margin-right: 10px;">
                            💰 Withdraw All Penalty (${ethers.utils.formatEther(vaultBalance)} ETH)
                        </button>
                    </div>
                `;
            }
            
            escrowInfoDiv.innerHTML = `
                <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 10px;">
                    <h4>💰 EscrowVault Information</h4>
                    <p><strong>Total Balance (Penalties):</strong> ${ethers.utils.formatEther(vaultBalance)} ETH</p>
                    <p><strong>Owner:</strong> ${vaultOwner.slice(0, 8)}...${vaultOwner.slice(-6)} ${isOwner ? '✅ (You)' : ''}</p>
                    <p><strong>LibraryCore:</strong> ${libraryCoreAddress.slice(0, 8)}...${libraryCoreAddress.slice(-6)}</p>
                    <p><strong>Address:</strong> ${contracts.escrowVault.slice(0, 8)}...${contracts.escrowVault.slice(-6)}</p>
                    ${withdrawButtons}
                    <small style="color: #6c757d; display: block; margin-top: 10px;">
                        💡 Penalty funds từ late return và damaged books được lưu trong EscrowVault.<br>
                        Owner có thể withdraw về account của mình.
                    </small>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load EscrowVault info:', error);
    }
}

// Withdraw all penalty from EscrowVault (owner only)
async function withdrawAllPenalty() {
    if (!escrowVaultContract || !userAddress) {
        showNotification('Please connect your wallet first', 'error');
        return;
    }
    
    try {
        const vaultOwner = await escrowVaultContract.owner();
        if (vaultOwner.toLowerCase() !== userAddress.toLowerCase()) {
            throw new Error('Only owner can withdraw penalty funds');
        }
        
        const balance = await escrowVaultContract.getBalance();
        if (balance === 0) {
            throw new Error('No penalty funds to withdraw');
        }
        
        showLoading(true);
        
        const tx = await escrowVaultContract.withdrawAllPenalty();
        showNotification('💰 Withdraw transaction sent! Waiting for confirmation...', 'info');
        
        const receipt = await tx.wait();
        
        showNotification(`✅ Withdrawn ${ethers.utils.formatEther(balance)} ETH successfully!`, 'success');
        
        // Refresh EscrowVault info
        await loadEscrowVaultInfo();
        
    } catch (error) {
        console.error('❌ Withdraw failed:', error);
        showNotification(error.message, 'error');
    } finally {
        showLoading(false);
    }
}
