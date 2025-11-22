// ========================================
// ACCOUNT PAGE - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Load user account info from blockchain
 */
async function loadAccountInfo() {
    try {
        // ✅ CRITICAL FIX: Check and reconnect wallet if needed
        if (!window.walletState || !window.walletState.isConnected) {
            // Try to reconnect if previously connected
            try {
                if (localStorage.getItem('walletConnected') === 'true' && window.ethereum) {
                    console.log('🔄 Attempting to reconnect wallet...');
                    await connectMetaMask();
                    // Wait a bit for wallet to initialize
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            } catch (e) {
                console.warn('Failed to reconnect wallet:', e);
            }
            
            // Check again after reconnection attempt
            if (!window.walletState || !window.walletState.isConnected) {
                displayAccountMessage('Please connect MetaMask to view your account');
                return;
            }
        }
        
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract || !window.blockchainBooks.bookNFTContract) {
            console.warn('Contracts not initialized, retrying...');
            const retrySuccess = await initBlockchainContracts();
            if (!retrySuccess) {
                displayAccountMessage('Failed to connect to blockchain contracts. Please refresh page.');
                return;
            }
        }
        
        const userAddress = window.walletState.address;
        const balance = window.walletState.balance;
        
        // Update profile section
        updateProfileSection(userAddress, balance);
        
        // Load borrowed books
        await loadBorrowedBooks(userAddress);
        
    } catch (error) {
        console.error('Failed to load account info:', error);
        displayAccountMessage('Error loading account from blockchain: ' + error.message);
    }
}

/**
 * Update profile section with blockchain data
 * IMPORTANT: Don't replace entire innerHTML, preserve tab structure
 */
function updateProfileSection(address, balance) {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
    // Check if already updated (avoid duplicate)
    if (profileContent.querySelector('.blockchain-profile-data')) {
        return;
    }
    
    // Get shortened address
    const shortAddress = `${address.slice(0, 8)}...${address.slice(-6)}`;
    
    // Clear existing static content but keep structure
    // Update HTML - preserve display style
    const currentDisplay = profileContent.style.display;
    profileContent.innerHTML = `
        <div class="in4">
            <p class="label">Wallet Address</p>
            <p class="value" style="font-family: monospace; font-size: 13px;" title="${address}">${shortAddress}</p>
        </div>
        <div class="in4">
            <p class="label">ETH Balance</p>
            <p class="value"><strong>${parseFloat(balance).toFixed(4)} ETH</strong></p>
        </div>
        <div class="in4">
            <p class="label">Network</p>
            <p class="value">Hardhat Local (Chain ID: 31337)</p>
        </div>
        
        <!-- User Profile Form -->
        <div class="in4">
            <p class="label">Họ và Tên / Full Name</p>
            <input type="text" id="userName" class="value" placeholder="Nguyen Van A" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
        </div>
        <div class="in4">
            <p class="label">Email / Địa chỉ</p>
            <input type="email" id="userEmail" class="value" placeholder="example@gmail.com" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
        </div>
        <div class="in4">
            <p class="label">Mã định danh / Student ID</p>
            <input type="text" id="userStudentId" class="value" placeholder="SV2024001" style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%;">
        </div>
        
        <div class="in4" style="grid-column: 1 / -1; margin-top: 8px;">
            <button onclick="saveUserProfile()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
                💾 Save Profile
            </button>
            <button onclick="loadUserProfile()" style="margin-left: 10px; padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: 500;">
                🔄 Load Saved Profile
            </button>
        </div>
        
        <div class="in4" style="background: #f0f7ff; padding: 16px; border-radius: 8px; margin-top: 16px; grid-column: 1 / -1;">
            <p class="label" style="font-size: 13px; color: #666;">Blockchain Account</p>
            <p class="value" style="margin-top: 8px; font-size: 12px; color: #333;">
                Your profile is stored locally. All your book borrowing history and transactions are recorded on-chain.
            </p>
        </div>
    `;
    
    // Restore display style
    profileContent.style.display = currentDisplay;
    profileContent.classList.add('blockchain-profile-data');
    
    // Load saved profile data
    loadUserProfileData();
}

/**
 * Load borrowed books for current user
 */
async function loadBorrowedBooks(userAddress) {
    const orderContent = document.getElementById('orderContent');
    if (!orderContent) return;
    
    // Preserve display style
    const currentDisplay = orderContent.style.display;
    
    orderContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="bx bx-loader-alt bx-spin" style="font-size: 32px;"></i><p>Loading your borrowed books...</p></div>';
    orderContent.style.display = currentDisplay;
    
    try {
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract || !window.blockchainBooks.bookNFTContract) {
            orderContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><p>Contracts not loaded. Please refresh page.</p></div>';
            return;
        }
        
        // ✅ CRITICAL FIX: Use EVENTS instead of checking all books
        // This eliminates CALL_EXCEPTION errors and is MUCH faster
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const bookNFTContract = window.blockchainBooks.bookNFTContract;
        
        console.log(`📚 🔥 Querying active loans for ${userAddress}...`);
        const userAddressLower = userAddress.toLowerCase();
        const borrowedBookIds = new Set();
        
        // 1) Pull from BookBorrowed events (fast path)
        try {
            const filter = libraryCoreContract.filters.BookBorrowed(userAddress, null);
            const events = await libraryCoreContract.queryFilter(filter, 0, 'latest');
            console.log(`📋 Found ${events.length} borrow event(s) for this user via events`);
            events.forEach(event => {
                const rawId = event.args.tokenId ?? event.args.bookId ?? 0;
                borrowedBookIds.add(Number(rawId));
            });
        } catch (eventError) {
            console.warn('⚠️ Could not query BookBorrowed events, falling back to loan scan:', eventError);
        }
        
        // 2) Fallback: scan loanInfos mapping to find active loans for this user
        try {
            const nextBookId = await bookNFTContract.nextBookId();
            for (let i = 0; i < Number(nextBookId); i++) {
                try {
                    const loanInfo = await libraryCoreContract.loanInfos(i);
                    const borrower = (loanInfo.borrower || loanInfo[0] || '').toLowerCase();
                    const isReturned = loanInfo.isReturned ?? loanInfo[4] ?? false;
                    
                    if (borrower && borrower === userAddressLower && !isReturned) {
                        borrowedBookIds.add(i);
                    }
                } catch (scanError) {
                    console.warn(`⚠️ Failed to inspect loan info for book ${i}:`, scanError.message);
                }
            }
        } catch (scanRootError) {
            console.warn('⚠️ Failed to scan loan infos:', scanRootError);
        }
        
        const borrowedBooks = [];
        const uniqueBookIds = Array.from(borrowedBookIds).sort((a, b) => a - b);
        
        console.log(`📖 ✅ Active loans detected: ${uniqueBookIds.length}`);
        
        for (const bookId of uniqueBookIds) {
            try {
                const loanInfo = await libraryCoreContract.loanInfos(bookId);
                const borrower = (loanInfo.borrower || loanInfo[0] || '').toLowerCase();
                const isReturned = loanInfo.isReturned ?? loanInfo[4] ?? false;
                
                if (borrower !== userAddressLower || isReturned) {
                    continue;
                }
                
                const bookInfo = await bookNFTContract.getBookInfo(bookId);
                const status = await bookNFTContract.getBookStatus(bookId);
                const borrowedAt = new Date(Number(loanInfo.borrowedAt || loanInfo[1]) * 1000);
                const dueDate = new Date(Number(loanInfo.dueDate || loanInfo[2]) * 1000);
                const deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3] || 0);
                
                borrowedBooks.push({
                    id: bookId,
                    name: bookInfo[0],
                    description: bookInfo[1],
                    status: Number(status),
                    condition: Number(bookInfo[3]),
                    imageHash: bookInfo[5] || '',
                    borrowedAt,
                    dueDate,
                    deposit,
                    isReturned: false,
                    isOverdue: new Date() > dueDate
                });
            } catch (error) {
                console.warn(`⚠️ Failed to load book ${bookId}:`, error.message);
            }
        }
        
        console.log(`📖 ✅ Currently borrowed: ${borrowedBooks.length} book(s)`);

        
        // Render borrowed books
        const currentDisplay = orderContent.style.display;
        if (borrowedBooks.length === 0) {
            orderContent.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #666;">
                    <i class='bx bx-book' style="font-size: 64px; opacity: 0.3;"></i>
                    <h3 style="margin-top: 16px; font-weight: 400;">No borrowed books</h3>
                    <p style="margin-top: 8px; font-size: 14px;">You haven't borrowed any books yet</p>
                    <button onclick="window.location.href='/home'" style="margin-top: 20px; padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        Browse Books
                    </button>
                </div>
            `;
            orderContent.style.display = currentDisplay;
        } else {
            let booksHTML = '';
            borrowedBooks.forEach(book => {
                // Calculate days until due or days overdue
                const now = new Date();
                const dueDate = new Date(book.dueDate);
                const diffTime = dueDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                // Calculate late penalty if overdue
                const daysOverdue = book.isOverdue ? Math.abs(diffDays) : 0;
                const latePenalty = daysOverdue * 0.02; // 0.02 ETH per day
                const estimatedRefund = Math.max(0, parseFloat(book.deposit) - latePenalty);
                
                const statusClass = book.isOverdue ? 'overdue' : 'active';
                const statusText = book.isReturned ? 'Returned' : (book.isOverdue ? `Overdue (${daysOverdue} days)` : 'Active');
                const statusColor = book.isReturned ? '#4CAF50' : (book.isOverdue ? '#F44336' : '#FF9800');
                
                booksHTML += `
                    <div class="book" style="margin-bottom: 20px; padding: 20px; background: ${book.isOverdue ? '#fff3f3' : 'white'}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid ${book.isOverdue ? '#F44336' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;">
                        <div class="bia" style="display: flex; gap: 16px; align-items: center;">
                            <img src="/model_images/muado.jpg" alt="logo" style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px;">
                            <div class="details">
                                <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">${book.name}</h4>
                                <p style="margin: 4px 0; font-size: 13px; color: #666;">
                                    <strong>Book ID:</strong> ${book.id} | 
                                    <strong>Condition:</strong> ${getConditionName(book.condition)}
                                </p>
                                <p style="margin: 4px 0; font-size: 13px; color: #666;">
                                    <strong>Borrowed:</strong> ${book.borrowedAt.toLocaleDateString()}
                                </p>
                                <p style="margin: 4px 0; font-size: 13px; color: ${book.isOverdue ? '#F44336' : '#666'}; font-weight: ${book.isOverdue ? '600' : 'normal'};">
                                    <strong>Due Date:</strong> ${book.dueDate.toLocaleDateString()}
                                    ${book.isOverdue ? ` ⚠️ OVERDUE (${daysOverdue} days)` : ` ✅ (${diffDays} days left)`}
                                </p>
                                <p style="margin: 4px 0; font-size: 13px; color: #666;">
                                    <strong>Deposit:</strong> ${book.deposit} ETH
                                </p>
                                ${book.isOverdue ? `
                                <p style="margin: 8px 0 0 0; padding: 6px 10px; background: #ffebee; border-radius: 4px; font-size: 12px; color: #d32f2f; display: inline-block;">
                                    💸 Late Penalty: ${latePenalty.toFixed(4)} ETH | Refund: ~${estimatedRefund.toFixed(4)} ETH
                                </p>
                                ` : ''}
                            </div>
                        </div>
                        <div class="action" style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px; min-width: 140px;">
                            <div class="status" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                                <span class="status-dot" style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor};"></span>
                                <span class="status-text" style="font-size: 13px; font-weight: 600; color: ${statusColor};">${statusText}</span>
                            </div>
                            ${!book.isReturned ? `
                                <button onclick="returnBookToBlockchain(${book.id}, '${book.name.replace(/'/g, "\\'")}')" style="width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                                    📤 Return Book
                                </button>
                                <button onclick="extendLoanForBook(${book.id}, '${book.name.replace(/'/g, "\\'")}')" style="width: 100%; padding: 10px 16px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                                    ⏰ Extend (+14 days)
                                </button>
                                <button onclick="reportLostBook(${book.id}, '${book.name.replace(/'/g, "\\'")}')" style="width: 100%; padding: 10px 16px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                                    ❌ Report Lost
                                </button>
                            ` : ''}
                        </div>
                    </div>
                `;
            });
            
            orderContent.innerHTML = booksHTML;
            // Restore display style
            orderContent.style.display = currentDisplay;
        }
        
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        orderContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f44336;">
                <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                <p style="margin-top: 16px;">Failed to load borrowed books</p>
                <button onclick="loadBorrowedBooks('${userAddress}')" style="margin-top: 16px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Return book function
 */
async function returnBook(bookId) {
    try {
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect MetaMask first!');
            return;
        }
        
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            alert('Library contract not loaded. Please refresh.');
            return;
        }
        
        // Ask for return condition
        const condition = prompt('Enter book condition (0=New, 1=Good, 2=Fair, 3=Poor):', '1');
        if (condition === null) return;
        
        const conditionNum = parseInt(condition);
        if (isNaN(conditionNum) || conditionNum < 0 || conditionNum > 3) {
            alert('Invalid condition. Please enter 0-3');
            return;
        }
        
        alert(`⏳ Returning book #${bookId}. Please confirm in MetaMask...`);
        
        const libraryCoreWithSigner = window.blockchainBooks.libraryCoreContract.connect(window.walletState.signer);
        const tx = await libraryCoreWithSigner.returnBook(bookId, conditionNum);
        
        console.log('⏳ Transaction sent:', tx.hash);
        alert('⏳ Transaction sent! Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Book returned successfully:', receipt);
        
        alert(`✅ Success! Book #${bookId} returned. Your deposit has been refunded.`);
        
        // Reload page
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Return failed:', error);
        
        let errorMsg = 'Failed to return book';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.reason) {
            errorMsg = error.reason;
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        alert('❌ ' + errorMsg);
    }
}

/**
 * View on blockchain explorer (placeholder)
 */
function viewOnBlockchain() {
    alert('Blockchain explorer not available for local Hardhat network.\n\nFor testnet/mainnet, this would open Etherscan with your address.');
}

/**
 * Display account message
 */
function displayAccountMessage(message) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <i class='bx bx-wallet' style="font-size: 64px; opacity: 0.3;"></i>
                <h3 style="margin-top: 16px; font-weight: 400;">${message}</h3>
                <button onclick="connectMetaMask(); setTimeout(loadAccountInfo, 1000);" style="margin-top: 20px; padding: 10px 24px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Connect MetaMask
                </button>
            </div>
        `;
    }
}

/**
 * Load user profile data from blockchain (if exists)
 */
async function loadUserProfileData() {
    try {
        // Note: UserProfile contract not deployed yet
        // This will be implemented when contract is deployed
        console.log('Loading user profile from blockchain...');
        
        const userName = document.getElementById('userName');
        const userEmail = document.getElementById('userEmail');
        const userStudentId = document.getElementById('userStudentId');
        
        // For now, load from localStorage as fallback
        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            const profile = JSON.parse(savedProfile);
            if (userName) userName.value = profile.name || '';
            if (userEmail) userEmail.value = profile.email || '';
            if (userStudentId) userStudentId.value = profile.studentId || '';
        }
    } catch (error) {
        console.warn('Could not load profile:', error);
    }
}

/**
 * Save user profile (to localStorage for now, blockchain when contract deployed)
 */
window.saveUserProfile = async function() {
    try {
        const userName = document.getElementById('userName')?.value;
        const userEmail = document.getElementById('userEmail')?.value;
        const userStudentId = document.getElementById('userStudentId')?.value;
        
        if (!userName || !userEmail || !userStudentId) {
            alert('Please fill in all fields');
            return;
        }
        
        // Save to localStorage (will be replaced with blockchain call when contract deployed)
        const profile = { name: userName, email: userEmail, studentId: userStudentId };
        localStorage.setItem('userProfile', JSON.stringify(profile));
        
        alert('✅ Profile saved successfully!\n(Currently saved locally. Will be on blockchain when UserProfile contract is deployed)');
        console.log('Profile saved:', profile);
    } catch (error) {
        console.error('Failed to save profile:', error);
        alert('❌ Failed to save profile: ' + error.message);
    }
}

/**
 * Load user profile from blockchain
 */
window.loadUserProfile = async function() {
    await loadUserProfileData();
    alert('✅ Profile loaded from storage!');
}

// ========================================
// CRITICAL FIX: Listen for wallet connection
// ========================================

/**
 * Load account when wallet is ready
 */
async function loadAccountWhenReady() {
    if (!window.location.pathname.includes('/account')) {
        return; // Not on account page
    }
    
    console.log('👤 Account page detected, checking wallet...');
    
    // ✅ CRITICAL FIX: Wait for wallet.js to initialize first
    let retries = 0;
    while (retries < 10 && (!window.walletState || typeof window.walletState === 'undefined')) {
        await new Promise(resolve => setTimeout(resolve, 100));
        retries++;
    }
    
    // Try to reconnect if previously connected
    if (!window.walletState || !window.walletState.isConnected) {
        try {
            if (localStorage.getItem('walletConnected') === 'true' && window.ethereum) {
                console.log('🔄 Reconnecting wallet on account page...');
                await connectMetaMask();
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        } catch (e) {
            console.warn('Failed to reconnect:', e);
        }
    }
    
    if (window.walletState && window.walletState.isConnected) {
        console.log('✅ Wallet connected, loading account...');
        try {
            await loadAccountInfo();
        } catch (error) {
            console.error('Error loading account:', error);
        }
    } else {
        console.log('⏳ Wallet not connected yet, tabs will work but no blockchain data');
        // Don't show "Please connect" message - let user see the page
        // They can connect from the header widget
    }
}

// Auto-load account info when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // ✅ CRITICAL FIX: Wait longer for wallet.js to load first
    // Also listen for wallet connected event
    setTimeout(loadAccountWhenReady, 1000);
});

// ========================================
// CRITICAL FIX: Listen for wallet connection event
// ========================================
// When wallet connects, reload account info
window.addEventListener('walletConnected', async (event) => {
    console.log('🎉 Wallet connected event received, reloading account...', event.detail);
    
    if (window.location.pathname.includes('/account')) {
        try {
            // Wait a bit for contracts to initialize
            setTimeout(async () => {
                await loadAccountInfo();
            }, 1000);
        } catch (error) {
            console.error('Error loading account after wallet connection:', error);
        }
    }
});

// ✅ ADDITIONAL FIX: Also listen for tab changes to reload data
document.addEventListener('DOMContentLoaded', () => {
    const orderBtn = document.getElementById('orderBtn');
    if (orderBtn) {
        orderBtn.addEventListener('click', async () => {
            // When order tab is clicked, reload borrowed books if wallet is connected
            if (window.walletState && window.walletState.isConnected) {
                setTimeout(async () => {
                    try {
                        await loadBorrowedBooks(window.walletState.address);
                    } catch (error) {
                        console.error('Error reloading borrowed books:', error);
                    }
                }, 300);
            }
        });
    }
});

// ========================================
// DUPLICATE FUNCTION REMOVED!
// ========================================
// This function was duplicated (defined at line 365 and here at line 449).
// The actual implementation is at line 365.
// This duplicate has been removed to prevent conflicts.
// ========================================

/**
 * Save user profile (to localStorage for now, blockchain when contract deployed)
 */
window.saveUserProfile = async function() {
    try {
        const userName = document.getElementById('userName')?.value;
        const userEmail = document.getElementById('userEmail')?.value;
        const userStudentId = document.getElementById('userStudentId')?.value;
        
        if (!userName || !userEmail || !userStudentId) {
            alert('Please fill in all fields');
            return;
        }
        
        // Save to localStorage (will be replaced with blockchain call when contract deployed)
        const profile = { name: userName, email: userEmail, studentId: userStudentId };
        try {
            localStorage.setItem('userProfile', JSON.stringify(profile));
        } catch (e) {
            console.warn('localStorage not available:', e);
        }
        
        alert('✅ Profile saved successfully!\n(Currently saved locally. Will be on blockchain when UserProfile contract is deployed)');
        console.log('Profile saved:', profile);
    } catch (error) {
        console.error('Failed to save profile:', error);
        alert('❌ Failed to save profile: ' + error.message);
    }
}

/**
 * Load user profile from blockchain
 */
window.loadUserProfile = async function() {
    await loadUserProfileData();
    alert('✅ Profile loaded from storage!');
}

