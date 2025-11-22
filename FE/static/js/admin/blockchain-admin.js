// ========================================
// ADMIN BLOCKCHAIN FUNCTIONS
// ========================================

/**
 * Initialize admin blockchain features
 */
async function initAdminBlockchain() {
    try {
        // Wait for wallet
        if (!window.walletState.isConnected) {
            console.warn('Wallet not connected');
            return false;
        }
        
        // Initialize contracts
        if (!window.blockchainBooks.bookNFTContract) {
            await initBlockchainContracts();
        }
        
        return true;
    } catch (error) {
        console.error('Failed to init admin blockchain:', error);
        return false;
    }
}

/**
 * Mint new book to blockchain
 */
async function mintBookToBlockchain(bookData) {
    try {
        if (!window.walletState.isConnected) {
            alert('Please connect MetaMask first!');
            await connectMetaMask();
            if (!window.walletState.isConnected) return null;
        }
        
        await initAdminBlockchain();
        
        if (!window.blockchainBooks.bookNFTContract) {
            alert('Contracts not loaded. Please deploy contracts first.');
            return null;
        }
        
        console.log('📝 Minting book:', bookData);
        
        // Prepare contract call
        const bookNFTWithSigner = window.blockchainBooks.bookNFTContract.connect(window.walletState.signer);
        
        // Call mintBookWithCondition function
        const tx = await bookNFTWithSigner.mintBookWithCondition(
            bookData.name,
            bookData.description,
            bookData.status || 0,  // 0 = Available
            bookData.condition || 1 // 1 = Good
        );
        
        console.log('⏳ Transaction sent:', tx.hash);
        alert('⏳ Transaction sent! Waiting for confirmation...');
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed:', receipt);
        
        // Get book ID from event
        let bookId = null;
        if (receipt.events) {
            const mintEvent = receipt.events.find(e => e.event === 'BookMinted' || e.event === 'Transfer');
            if (mintEvent && mintEvent.args) {
                bookId = mintEvent.args.tokenId ? Number(mintEvent.args.tokenId) : null;
            }
        }
        
        return {
            success: true,
            transactionHash: receipt.transactionHash,
            bookId: bookId,
            gasUsed: receipt.gasUsed.toString()
        };
        
    } catch (error) {
        console.error('❌ Mint failed:', error);
        
        let errorMsg = 'Failed to mint book';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.reason) {
            errorMsg = error.reason;
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        alert('❌ ' + errorMsg);
        return { success: false, error: errorMsg };
    }
}

/**
 * Load all books for admin view
 */
async function loadAdminBooks() {
    try {
        await initAdminBlockchain();
        
        const books = await loadBooksFromBlockchain();
        
        return books.map(book => ({
            ...book,
            owner: book.owner,
            createdAt: 'On blockchain',
            borrower: null // Will be fetched if needed
        }));
        
    } catch (error) {
        console.error('Failed to load admin books:', error);
        return [];
    }
}

/**
 * Get borrowed books info (for admin view)
 */
async function getBorrowedBooksInfo() {
    try {
        await initAdminBlockchain();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            return [];
        }
        
        const books = await loadBooksFromBlockchain();
        const borrowedBooks = [];
        
        for (const book of books) {
            if (book.status === 1) { // Borrowed
                try {
                    // Get loan info from LibraryCore
                    const libraryCore = window.blockchainBooks.libraryCoreContract;
                    const loanInfo = await libraryCore.loanInfos(book.id);
                    
                    borrowedBooks.push({
                        bookId: book.id,
                        bookName: book.name,
                        borrower: loanInfo.borrower || loanInfo[0],
                        borrowedAt: new Date(Number(loanInfo.borrowedAt || loanInfo[2]) * 1000),
                        dueDate: new Date(Number(loanInfo.dueDate || loanInfo[3]) * 1000),
                        deposit: ethers.utils.formatEther(loanInfo.deposit || loanInfo[4] || 0)
                    });
                } catch (error) {
                    console.warn(`Failed to get loan info for book ${book.id}:`, error);
                }
            }
        }
        
        return borrowedBooks;
        
    } catch (error) {
        console.error('Failed to get borrowed books:', error);
        return [];
    }
}

function initAdminDashboardPage() {
    updateAdminWalletStatus();
    
    const mintForm = document.getElementById('mintBookForm');
    if (mintForm && !mintForm.dataset.bound) {
        mintForm.addEventListener('submit', handleMintBook);
        mintForm.dataset.bound = 'true';
    }
    
    loadAdminStats();
    loadAdminBooksTable();
    loadBorrowedBooksTable();
}

/**
 * Update admin wallet status
 */
function updateAdminWalletStatus() {
    const statusText = document.getElementById('walletStatusText');
    if (!statusText) return;
    
    if (window.walletState.isConnected) {
        statusText.innerHTML = `
            <span style="color: #4CAF50;">✅ Connected</span> - 
            ${window.walletState.address.slice(0, 8)}...${window.walletState.address.slice(-6)}
            (${parseFloat(window.walletState.balance).toFixed(4)} ETH)
        `;
    } else {
        statusText.innerHTML = `
            <span style="color: #F44336;">❌ Not Connected</span> - 
            <button onclick="connectMetaMask()" style="padding: 4px 12px; background: #667eea; color: white; border: none; border-radius: 4px; cursor: pointer;">Connect MetaMask</button>
        `;
    }
}

/**
 * Load admin stats
 */
async function loadAdminStats() {
    try {
        const books = await loadAdminBooks();
        
        const totalBooks = books.length;
        const availableBooks = books.filter(b => b.status === 0 || b.status === 4 || b.status === 5).length;
        const borrowedBooks = books.filter(b => b.status === 1).length;
        
        const totalEl = document.getElementById('totalBooksCount');
        const availableEl = document.getElementById('availableBooksCount');
        const borrowedEl = document.getElementById('borrowedBooksCount');
        
        if (!totalEl || !availableEl || !borrowedEl) {
            console.warn('Admin stats widgets not rendered yet, skipping update');
            return;
        }
        
        totalEl.textContent = totalBooks;
        availableEl.textContent = availableBooks;
        borrowedEl.textContent = borrowedBooks;
        
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

/**
 * Load admin books table
 */
async function loadAdminBooksTable() {
    const container = document.getElementById('adminBooksTable');
    if (!container) return;
    
    container.innerHTML = 'Loading books...';
    
    try {
        const books = await loadAdminBooks();
        
        if (books.length === 0) {
            container.innerHTML = '<p style="color: #666;">No books found. Mint your first book!</p>';
            return;
        }
        
        let tableHTML = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">ID</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Name</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Condition</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Price</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Owner</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        books.forEach(book => {
            tableHTML += `
                <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 12px;">${book.id}</td>
                    <td style="padding: 12px;"><strong>${book.name}</strong></td>
                    <td style="padding: 12px;">${getStatusName(book.status)}</td>
                    <td style="padding: 12px;">${getConditionName(book.condition)}</td>
                    <td style="padding: 12px;">${book.priceEth} ETH</td>
                    <td style="padding: 12px;"><code style="font-size: 11px;">${book.owner.slice(0, 8)}...${book.owner.slice(-4)}</code></td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Failed to load books table:', error);
        container.innerHTML = '<p style="color: red;">Failed to load books</p>';
    }
}

/**
 * Load borrowed books table
 */
async function loadBorrowedBooksTable() {
    const container = document.getElementById('borrowedBooksTable');
    if (!container) return;
    
    container.innerHTML = 'Loading borrowed books...';
    
    try {
        const borrowedBooks = await getBorrowedBooksInfo();
        
        if (borrowedBooks.length === 0) {
            container.innerHTML = '<p style="color: #666;">No borrowed books currently</p>';
            return;
        }
        
        let tableHTML = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Book ID</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Book Name</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Borrower</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Borrowed Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Due Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Deposit</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        borrowedBooks.forEach(loan => {
            const isOverdue = new Date() > loan.dueDate;
            tableHTML += `
                <tr style="border-bottom: 1px solid #e0e0e0;">
                    <td style="padding: 12px;">${loan.bookId}</td>
                    <td style="padding: 12px;"><strong>${loan.bookName}</strong></td>
                    <td style="padding: 12px;"><code style="font-size: 11px;">${loan.borrower.slice(0, 8)}...${loan.borrower.slice(-4)}</code></td>
                    <td style="padding: 12px;">${loan.borrowedAt.toLocaleDateString()}</td>
                    <td style="padding: 12px;">${loan.dueDate.toLocaleDateString()}</td>
                    <td style="padding: 12px;">${loan.deposit} ETH</td>
                    <td style="padding: 12px;">
                        <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${isOverdue ? '#ffebee' : '#e8f5e9'}; color: ${isOverdue ? '#c62828' : '#2e7d32'};">
                            ${isOverdue ? '⚠️ OVERDUE' : '✅ ACTIVE'}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = tableHTML;
        
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        container.innerHTML = '<p style="color: red;">Failed to load borrowed books</p>';
    }
}

/**
 * Handle mint book form submission
 */
async function handleMintBook(event) {
    event.preventDefault();
    
    const mintResult = document.getElementById('mintResult');
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    
    try {
        submitBtn.textContent = '⏳ Minting...';
        submitBtn.disabled = true;
        mintResult.innerHTML = '';
        
        const bookData = {
            name: document.getElementById('bookName').value,
            description: document.getElementById('bookDescription').value + 
                        (document.getElementById('bookAuthor').value ? 
                        ` | Author: ${document.getElementById('bookAuthor').value}` : ''),
            status: 0, // Available
            condition: 1 // Good
        };
        
        const result = await mintBookToBlockchain(bookData);
        
        if (result && result.success) {
            mintResult.innerHTML = `
                <div style="padding: 16px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 4px;">
                    <strong style="color: #2e7d32;">✅ Book minted successfully!</strong><br>
                    <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
                        ${result.bookId !== null ? `Book ID: ${result.bookId}<br>` : ''}
                        Transaction: <code style="font-size: 11px;">${result.transactionHash}</code>
                    </p>
                </div>
            `;
            
            // Reset form
            event.target.reset();
            
            // Refresh tables
            setTimeout(() => {
                loadAdminStats();
                loadAdminBooksTable();
            }, 1000);
        } else {
            throw new Error(result?.error || 'Unknown error');
        }
        
    } catch (error) {
        console.error('Mint failed:', error);
        mintResult.innerHTML = `
            <div style="padding: 16px; background: #ffebee; border-left: 4px solid #F44336; border-radius: 4px;">
                <strong style="color: #c62828;">❌ Failed to mint book</strong><br>
                <p style="margin: 8px 0 0 0; font-size: 13px; color: #666;">
                    ${error.message}
                </p>
            </div>
        `;
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

/**
 * Get condition name
 */
function getConditionName(condition) {
    const names = {
        0: '🆕 New',
        1: '✅ Good',
        2: '⚠️ Fair',
        3: '❌ Poor'
    };
    return names[condition] || 'Unknown';
}

document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname === '/admin/dashboard') {
        initAdminDashboardPage();
    }
});

window.addEventListener('walletConnected', () => {
    if (window.location.pathname === '/admin/dashboard') {
        initAdminDashboardPage();
    }
});

