// ========================================
// ACCOUNT PAGE - BLOCKCHAIN INTEGRATION (FIXED)
// ========================================

/**
 * Load user account info from blockchain
 */
async function loadAccountInfo() {
    try {
        if (!window.walletState || !window.walletState.address) {
            displayAccountMessage('Please connect MetaMask to view your account');
            return;
        }
        
        await initBlockchainContracts();
        
        const userAddress = window.walletState.address;
        
        // Load profile from UserProfileV2 contract
        await loadUserProfileFromBlockchain(userAddress);
        
        // Load borrowed books from LibraryCoreV3
        await loadBorrowedBooksFromBlockchain(userAddress);
        
    } catch (error) {
        console.error('Failed to load account info:', error);
        displayAccountMessage('Error loading account: ' + error.message);
    }
}

/**
 * Load user profile from UserProfileV2 contract
 */
async function loadUserProfileFromBlockchain(userAddress) {
    try {
        const userProfileContract = window.blockchainBooks.userProfileContract;
        if (!userProfileContract) {
            console.warn('UserProfile contract not loaded');
            return;
        }

        // Check if user has profile
        const hasProfile = await userProfileContract.hasActiveProfile(userAddress);
        
        if (hasProfile) {
            const profile = await userProfileContract.getProfile(userAddress);
            
            // Update profile UI with blockchain data
            updateProfileUI({
                name: profile.name,
                email: profile.email,
                studentId: profile.studentId,
                reputation: Number(profile.reputation),
                createdAt: new Date(Number(profile.createdAt) * 1000),
                isActive: profile.isActive
            });
        } else {
            // Show create profile form
            showCreateProfileForm();
        }
        
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

/**
 * Update profile UI with blockchain data
 */
function updateProfileUI(profile) {
    // Update name field
    const nameField = document.querySelector('.in4:nth-child(2) .value');
    if (nameField) nameField.textContent = profile.name;
    
    // Update email field  
    const emailField = document.querySelector('.in4:nth-child(3) .value');
    if (emailField) emailField.textContent = profile.email;
    
    // Update student ID field
    const studentIdField = document.querySelector('.in4:nth-child(4) .value');
    if (studentIdField) studentIdField.textContent = profile.studentId;
    
    // Add reputation display
    addReputationDisplay(profile.reputation);
    
    // Add edit profile button
    addEditProfileButton();
}

/**
 * Show create profile form
 */
function showCreateProfileForm() {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
    profileContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <h3>Create Your Profile</h3>
            <p>You need to create a profile on blockchain before using the library.</p>
            
            <form id="createProfileForm" style="max-width: 400px; margin: 20px auto;">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Full Name:</label>
                    <input type="text" id="profileName" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Email:</label>
                    <input type="email" id="profileEmail" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600;">Student ID:</label>
                    <input type="text" id="profileStudentId" required style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px;">
                </div>
                
                <button type="submit" style="width: 100%; padding: 12px; background: #667eea; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer;">
                    Create Profile on Blockchain
                </button>
            </form>
        </div>
    `;
    
    // Add form submit handler
    document.getElementById('createProfileForm').addEventListener('submit', handleCreateProfile);
}

/**
 * Handle create profile form submission
 */
async function handleCreateProfile(event) {
    event.preventDefault();
    
    try {
        const name = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const studentId = document.getElementById('profileStudentId').value;
        
        const userProfileContract = window.blockchainBooks.userProfileContract;
        
        // Create profile on blockchain
        const tx = await userProfileContract.createProfile(name, email, studentId);
        
        alert(`⏳ Creating profile... Transaction: ${tx.hash}`);
        
        await tx.wait();
        
        alert('✅ Profile created successfully!');
        
        // Reload profile
        await loadUserProfileFromBlockchain(window.walletState.address);
        
    } catch (error) {
        console.error('Create profile failed:', error);
        alert(`❌ Failed to create profile: ${error.message}`);
    }
}

/**
 * Load borrowed books from LibraryCoreV3
 */
async function loadBorrowedBooksFromBlockchain(userAddress) {
    try {
        const orderContent = document.getElementById('orderContent');
        if (!orderContent) return;
        
        orderContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="bx bx-loader-alt bx-spin" style="font-size: 32px;"></i><p>Loading borrowed books...</p></div>';
        
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const bookNFTContract = window.blockchainBooks.bookNFTContract;
        
        if (!libraryCoreContract || !bookNFTContract) {
            orderContent.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><p>Contracts not loaded. Please refresh page.</p></div>';
            return;
        }
        
        // Get current loans from LibraryCoreV3
        const borrowedBookIds = await libraryCoreContract.getUserCurrentLoans(userAddress);
        
        if (borrowedBookIds.length === 0) {
            orderContent.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: #666;">
                    <i class='bx bx-book-open' style="font-size: 64px; margin-bottom: 16px; color: #ddd;"></i>
                    <h3 style="margin: 0 0 8px 0; color: #999;">No Borrowed Books</h3>
                    <p style="margin: 0;">You haven't borrowed any books yet.</p>
                </div>
            `;
            return;
        }
        
        // Load details for each borrowed book
        const borrowedBooks = [];
        
        for (const bookId of borrowedBookIds) {
            try {
                const bookIdNum = Number(bookId);
                
                // Get loan info
                const loanInfo = await libraryCoreContract.getLoanInfo(bookIdNum);
                
                // Get book info
                const bookInfo = await bookNFTContract.getBookInfo(bookIdNum);
                
                // Calculate due date and overdue status
                const dueDate = new Date(Number(loanInfo.dueDate) * 1000);
                const now = new Date();
                const isOverdue = now > dueDate && !loanInfo.isReturned;
                
                borrowedBooks.push({
                    id: bookIdNum,
                    name: bookInfo.name,
                    description: bookInfo.description,
                    borrowedAt: new Date(Number(loanInfo.borrowedAt) * 1000),
                    dueDate: dueDate,
                    deposit: ethers.formatEther(loanInfo.deposit),
                    isReturned: loanInfo.isReturned,
                    isOverdue: isOverdue,
                    borrower: loanInfo.borrower
                });
                
            } catch (error) {
                console.warn(`Failed to load book ${bookId}:`, error.message);
            }
        }
        
        // Render borrowed books with actions
        renderBorrowedBooks(borrowedBooks);
        
    } catch (error) {
        console.error('Failed to load borrowed books:', error);
        orderContent.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #f44336;">
                <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                <p style="margin-top: 16px;">Failed to load borrowed books</p>
                <button onclick="loadBorrowedBooksFromBlockchain('${userAddress}')" style="margin-top: 16px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Render borrowed books with action buttons
 */
function renderBorrowedBooks(borrowedBooks) {
    const orderContent = document.getElementById('orderContent');
    if (!orderContent) return;
    
    let booksHTML = '<div style="padding: 20px;">';
    
    borrowedBooks.forEach(book => {
        const now = new Date();
        const diffTime = book.dueDate - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        const daysOverdue = book.isOverdue ? Math.abs(diffDays) : 0;
        const latePenalty = daysOverdue * 0.02;
        const estimatedRefund = Math.max(0, parseFloat(book.deposit) - latePenalty);
        
        const statusColor = book.isReturned ? '#4CAF50' : (book.isOverdue ? '#F44336' : '#FF9800');
        const statusText = book.isReturned ? 'Returned' : (book.isOverdue ? `Overdue (${daysOverdue} days)` : 'Active');
        
        booksHTML += `
            <div class="borrowed-book" style="margin-bottom: 20px; padding: 20px; background: ${book.isOverdue ? '#fff3f3' : 'white'}; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); border: 2px solid ${book.isOverdue ? '#F44336' : 'transparent'}; display: flex; justify-content: space-between; align-items: center;">
                <div class="book-info" style="display: flex; gap: 16px; align-items: center; flex: 1;">
                    <img src="/model_images/muado.jpg" alt="Book Cover" style="width: 80px; height: 100px; object-fit: cover; border-radius: 8px;">
                    <div class="details">
                        <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">${book.name}</h4>
                        <p style="margin: 4px 0; font-size: 13px; color: #666;">
                            <strong>Book ID:</strong> ${book.id}
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
                <div class="book-actions" style="display: flex; flex-direction: column; gap: 10px; min-width: 140px;">
                    <div class="status" style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                        <span style="width: 10px; height: 10px; border-radius: 50%; background: ${statusColor};"></span>
                        <span style="font-size: 13px; font-weight: 600; color: ${statusColor};">${statusText}</span>
                    </div>
                    ${!book.isReturned ? `
                        <button onclick="returnBookAction(${book.id}, '${book.name.replace(/'/g, "\\'")}')" style="width: 100%; padding: 10px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            📤 Return Book
                        </button>
                        <button onclick="extendLoanAction(${book.id}, '${book.name.replace(/'/g, "\\'")}')" style="width: 100%; padding: 10px 16px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            ⏰ Extend (+14 days)
                        </button>
                        <button onclick="reportLostAction(${book.id}, '${book.name.replace(/'/g, "\\'")}')" style="width: 100%; padding: 10px 16px; background: #f44336; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: 600;">
                            ❌ Report Lost
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    });
    
    booksHTML += '</div>';
    orderContent.innerHTML = booksHTML;
}

/**
 * Return book action
 */
window.returnBookAction = async function(bookId, bookName) {
    try {
        const condition = prompt(
            `Return "${bookName}" (ID: ${bookId})\n\n` +
            `Select book condition:\n` +
            `0 = Good (no penalty)\n` +
            `1 = Fair (no penalty)\n` +
            `2 = Poor (no penalty)\n` +
            `3 = Damaged (0.005 ETH penalty)\n` +
            `4 = Lost (0.005 ETH penalty)\n\n` +
            `Enter condition (0-4):`,
            '0'
        );

        if (condition === null) return;

        const conditionNum = parseInt(condition);
        if (isNaN(conditionNum) || conditionNum < 0 || conditionNum > 4) {
            alert('Invalid condition! Please enter 0-4.');
            return;
        }

        const conditionNames = ['Good', 'Fair', 'Poor', 'Damaged', 'Lost'];
        const hasPenalty = conditionNum >= 3;
        
        if (!confirm(`Return "${bookName}" in ${conditionNames[conditionNum]} condition?${hasPenalty ? '\n⚠️ This will incur a 0.005 ETH damage penalty!' : ''}`)) return;

        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const tx = await libraryCoreContract.returnBook(bookId, conditionNum);
        
        alert(`⏳ Return transaction sent! Hash: ${tx.hash}`);
        await tx.wait();
        alert(`✅ Book "${bookName}" returned successfully!`);
        
        // Reload borrowed books
        await loadBorrowedBooksFromBlockchain(window.walletState.address);
        
    } catch (error) {
        console.error('Return book failed:', error);
        alert(`❌ Failed to return book: ${error.message}`);
    }
};

/**
 * Extend loan action
 */
window.extendLoanAction = async function(bookId, bookName) {
    try {
        if (!confirm(`Extend loan for "${bookName}" by 14 days?\n\nExtension fee: 0.01 ETH`)) return;

        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const extensionFee = ethers.parseEther("0.01");
        
        const tx = await libraryCoreContract.extendLoan(bookId, { value: extensionFee });
        
        alert(`⏳ Extension transaction sent! Hash: ${tx.hash}`);
        await tx.wait();
        alert(`✅ Loan extended for "${bookName}"!`);
        
        // Reload borrowed books
        await loadBorrowedBooksFromBlockchain(window.walletState.address);
        
    } catch (error) {
        console.error('Extend loan failed:', error);
        alert(`❌ Failed to extend loan: ${error.message}`);
    }
};

/**
 * Report lost action
 */
window.reportLostAction = async function(bookId, bookName) {
    try {
        if (!confirm(`Report "${bookName}" as LOST?\n\n⚠️ This will charge 0.005 ETH penalty!`)) return;
        
        const userInput = prompt('Type "LOST" to confirm:');
        if (userInput !== 'LOST') {
            alert('Confirmation failed.');
            return;
        }

        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const tx = await libraryCoreContract.returnBook(bookId, 4); // 4 = Lost
        
        alert(`⏳ Lost report sent! Hash: ${tx.hash}`);
        await tx.wait();
        alert(`✅ Book "${bookName}" reported as lost.`);
        
        // Reload borrowed books
        await loadBorrowedBooksFromBlockchain(window.walletState.address);
        
    } catch (error) {
        console.error('Report lost failed:', error);
        alert(`❌ Failed to report book as lost: ${error.message}`);
    }
};

/**
 * Add reputation display
 */
function addReputationDisplay(reputation) {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
    const reputationHTML = `
        <div class="in4" style="margin-top: 16px;">
            <p class="label">Reputation Score</p>
            <p class="value" style="color: #4CAF50; font-weight: 600;">${reputation} points</p>
        </div>
    `;
    
    profileContent.insertAdjacentHTML('beforeend', reputationHTML);
}

/**
 * Add edit profile button
 */
function addEditProfileButton() {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent || document.getElementById('editProfileBtn')) return;
    
    const editButtonHTML = `
        <button id="editProfileBtn" onclick="showEditProfileForm()" style="margin-top: 20px; padding: 12px 24px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
            ✏️ Edit Profile
        </button>
    `;
    
    profileContent.insertAdjacentHTML('beforeend', editButtonHTML);
}

/**
 * Display account message
 */
function displayAccountMessage(message) {
    const profileContent = document.getElementById('profileContent');
    const orderContent = document.getElementById('orderContent');
    
    const messageHTML = `<div style="text-align: center; padding: 40px; color: #666;"><p>${message}</p></div>`;
    
    if (profileContent) profileContent.innerHTML = messageHTML;
    if (orderContent) orderContent.innerHTML = messageHTML;
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    // Wait for wallet to be ready
    setTimeout(() => {
        if (typeof loadAccountInfo === 'function') {
            loadAccountInfo();
        }
    }, 1000);
});

// Listen for wallet connection events
if (typeof window !== 'undefined') {
    window.addEventListener('walletConnected', function(event) {
        console.log('🎉 Wallet connected event received, reloading account...', event.detail);
        setTimeout(() => {
            loadAccountInfo();
        }, 500);
    });
}