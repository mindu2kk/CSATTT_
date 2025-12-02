// ========================================
// ACCOUNT PAGE - IMMUTABLE BLOCKCHAIN PROFILE
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
        
        // Load immutable profile from UserProfileV2 contract
        await loadUserProfileFromBlockchain(userAddress);
        
        // Load borrowed books from LibraryCoreV3
        await loadBorrowedBooksFromBlockchain(userAddress);
        
    } catch (error) {
        console.error('Failed to load account info:', error);
        displayAccountMessage('Error loading account: ' + error.message);
    }
}

/**
 * Load user profile from UserProfileV2 contract (immutable)
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
            
            // Update profile UI with immutable blockchain data
            updateImmutableProfileUI({
                name: profile.name,
                email: profile.email,
                studentId: profile.studentId,
                reputation: Number(profile.reputation),
                createdAt: new Date(Number(profile.createdAt) * 1000),
                isActive: profile.isActive
            });
        } else {
            // Show create profile form (one-time only)
            showCreateProfileForm();
        }
        
    } catch (error) {
        console.error('Failed to load profile:', error);
    }
}

/**
 * Update profile UI with immutable blockchain data
 */
function updateImmutableProfileUI(profile) {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
    profileContent.innerHTML = `
        <div style="padding: 20px;">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
                <div style="width: 64px; height: 64px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: bold;">
                    ${profile.name.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h3 style="margin: 0 0 4px 0; color: #333;">${profile.name}</h3>
                    <p style="margin: 0; color: #666; font-size: 14px;">Blockchain Profile (Permanent)</p>
                </div>
            </div>
            
            <div class="profile-info" style="display: grid; gap: 16px;">
                <div class="in4">
                    <p class="label" style="margin: 0 0 4px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Full Name</p>
                    <p class="value" style="margin: 0; font-size: 16px; color: #333;">${profile.name}</p>
                </div>
                
                <div class="in4">
                    <p class="label" style="margin: 0 0 4px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Email Address</p>
                    <p class="value" style="margin: 0; font-size: 16px; color: #333;">${profile.email}</p>
                </div>
                
                <div class="in4">
                    <p class="label" style="margin: 0 0 4px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Student/Member ID</p>
                    <p class="value" style="margin: 0; font-size: 16px; color: #333;">${profile.studentId}</p>
                </div>
                
                <div class="in4">
                    <p class="label" style="margin: 0 0 4px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Reputation Score</p>
                    <p class="value" style="margin: 0; font-size: 16px; color: #4CAF50; font-weight: 600;">${profile.reputation} points</p>
                </div>
                
                <div class="in4" style="padding: 16px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea;">
                    <p class="label" style="margin: 0 0 4px 0; font-weight: 600; color: #666; font-size: 12px; text-transform: uppercase;">Profile Created On Blockchain</p>
                    <p class="value" style="margin: 0 0 4px 0; font-size: 14px; color: #333; font-weight: 600;">${profile.createdAt.toLocaleDateString()} at ${profile.createdAt.toLocaleTimeString()}</p>
                    <p style="margin: 0; font-size: 11px; color: #888;">🔒 Profile information is permanent and cannot be changed</p>
                </div>
            </div>
        </div>
    `;
}

/**
 * Show create profile form (one-time only)
 */
function showCreateProfileForm() {
    const profileContent = document.getElementById('profileContent');
    if (!profileContent) return;
    
    profileContent.innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <div style="margin-bottom: 24px;">
                <i class='bx bx-user-plus' style="font-size: 64px; color: #667eea; margin-bottom: 16px;"></i>
                <h3 style="margin: 0 0 8px 0; color: #333;">Create Your Blockchain Profile</h3>
                <p style="margin: 0; color: #666;">You need to create a profile before using the library system.</p>
            </div>
            
            <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: left;">
                <h4 style="margin: 0 0 8px 0; color: #856404; font-size: 14px;">⚠️ Important Notice</h4>
                <ul style="margin: 0; padding-left: 20px; color: #856404; font-size: 13px;">
                    <li>Your profile will be stored permanently on the blockchain</li>
                    <li>Information <strong>cannot be changed</strong> after creation</li>
                    <li>Please double-check all details before submitting</li>
                    <li>This transaction will require gas fees</li>
                </ul>
            </div>
            
            <form id="createProfileForm" style="max-width: 400px; margin: 0 auto; text-align: left;">
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Full Name:</label>
                    <input type="text" id="profileName" required placeholder="Enter your full name" 
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    <small style="color: #666; font-size: 12px;">This will be your permanent display name</small>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Email Address:</label>
                    <input type="email" id="profileEmail" required placeholder="your.email@example.com" 
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    <small style="color: #666; font-size: 12px;">Used for notifications and account recovery</small>
                </div>
                
                <div style="margin-bottom: 24px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Student/Member ID:</label>
                    <input type="text" id="profileStudentId" required placeholder="STU001, MEM123, etc." 
                           style="width: 100%; padding: 12px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;">
                    <small style="color: #666; font-size: 12px;">Must be unique - cannot be used by another user</small>
                </div>
                
                <div style="margin-bottom: 16px;">
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: #333;">
                        <input type="checkbox" id="confirmPermanent" required style="margin: 0;">
                        I understand this information is <strong>permanent and cannot be changed</strong>
                    </label>
                </div>
                
                <button type="submit" style="width: 100%; padding: 14px; background: #667eea; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 16px;">
                    🔗 Create Permanent Profile on Blockchain
                </button>
            </form>
        </div>
    `;
    
    // Add form submit handler
    document.getElementById('createProfileForm').addEventListener('submit', handleCreateProfile);
}

/**
 * Handle create profile form submission (one-time only)
 */
async function handleCreateProfile(event) {
    event.preventDefault();
    
    try {
        const name = document.getElementById('profileName').value.trim();
        const email = document.getElementById('profileEmail').value.trim();
        const studentId = document.getElementById('profileStudentId').value.trim();
        const confirmed = document.getElementById('confirmPermanent').checked;
        
        if (!name || !email || !studentId) {
            alert('Please fill in all required fields.');
            return;
        }
        
        if (!confirmed) {
            alert('Please confirm that you understand the profile is permanent.');
            return;
        }
        
        // Double confirmation
        const finalConfirm = confirm(
            `⚠️ FINAL CONFIRMATION ⚠️\n\n` +
            `You are about to create a PERMANENT profile:\n\n` +
            `Name: ${name}\n` +
            `Email: ${email}\n` +
            `Student ID: ${studentId}\n\n` +
            `❗ THIS INFORMATION CANNOT BE CHANGED AFTER CREATION ❗\n\n` +
            `Are you absolutely sure all details are correct?`
        );
        
        if (!finalConfirm) return;
        
        // Show loading state
        const submitBtn = event.target.querySelector('button[type="submit"]');
        submitBtn.textContent = '⏳ Creating permanent profile...';
        submitBtn.disabled = true;
        
        await initBlockchainContracts();
        const userProfileContract = window.blockchainBooks.userProfileContract;
        
        if (!userProfileContract) {
            throw new Error('UserProfile contract not loaded');
        }
        
        // Create profile on blockchain
        console.log('🔗 Creating permanent profile on blockchain...');
        const tx = await userProfileContract.createProfile(name, email, studentId);
        
        submitBtn.textContent = '⏳ Mining transaction...';
        
        console.log('Transaction sent:', tx.hash);
        await tx.wait();
        
        alert('🎉 Permanent profile created successfully on blockchain!\n\nYou can now use all library features.');
        
        // Reload profile to show created profile
        await loadUserProfileFromBlockchain(window.walletState.address);
        
    } catch (error) {
        console.error('Create profile failed:', error);
        
        let errorMessage = 'Failed to create profile: ';
        if (error.message.includes('Student ID already registered')) {
            errorMessage += 'This Student ID is already taken by another user. Please choose a different one.';
        } else if (error.message.includes('user rejected')) {
            errorMessage += 'Transaction was rejected by user.';
        } else if (error.message.includes('User profile already exists')) {
            errorMessage += 'You already have a profile created.';
        } else {
            errorMessage += error.message;
        }
        
        alert('❌ ' + errorMessage);
        
        // Reset button
        const submitBtn = document.querySelector('#createProfileForm button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = '🔗 Create Permanent Profile on Blockchain';
            submitBtn.disabled = false;
        }
    }
}

/**
 * Load borrowed books from LibraryCoreV3 (same as before)
 */
async function loadBorrowedBooksFromBlockchain(userAddress, retryCount = 0) {
    try {
        const orderContent = document.getElementById('orderContent');
        if (!orderContent) return;
        
        orderContent.innerHTML = '<div style="text-align: center; padding: 40px;"><i class="bx bx-loader-alt bx-spin" style="font-size: 32px;"></i><p>Loading borrowed books...</p></div>';
        
        // ✅ Wait for contracts to be initialized with retry logic
        if (!window.blockchainBooks || !window.blockchainBooks.libraryCoreContract || !window.blockchainBooks.bookNFTContract) {
            if (retryCount < 5) {
                console.log(`⏳ Contracts not ready, retrying (${retryCount + 1}/5)...`);
                setTimeout(() => loadBorrowedBooksFromBlockchain(userAddress, retryCount + 1), 1000);
                return;
            } else {
                orderContent.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #f44336;">
                        <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                        <p style="margin-top: 16px;">Contracts not loaded. Please connect your wallet.</p>
                        <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                            Refresh Page
                        </button>
                    </div>
                `;
                return;
            }
        }
        
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const bookNFTContract = window.blockchainBooks.bookNFTContract;
        
        // Get current loans from LibraryCoreV3
        const borrowedBookIds = await libraryCoreContract.getUserCurrentLoans(userAddress);
        console.log(`📋 getUserCurrentLoans() returned:`, borrowedBookIds.map(id => Number(id)));
        
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
                
                console.log(`🔍 Checking book ${bookIdNum}...`);
                
                // ✅ Get loan info FIRST (source of truth!)
                let loanInfo;
                try {
                    loanInfo = await libraryCoreContract.getLoanInfo(bookIdNum);
                } catch (loanError) {
                    console.warn(`⚠️ Cannot get loan info for book ${bookIdNum}:`, loanError.message);
                    continue;
                }
                
                // ✅ Check if loan is active and belongs to this user
                if (loanInfo.isReturned) {
                    console.log(`📚 Skipping book ${bookIdNum} - already returned`);
                    continue;
                }
                
                if (loanInfo.borrower.toLowerCase() !== userAddress.toLowerCase()) {
                    console.log(`📚 Skipping book ${bookIdNum} - borrowed by different user`);
                    continue;
                }
                
                // ✅ Get book info and check status
                let bookInfo;
                try {
                    bookInfo = await bookNFTContract.getBookInfo(bookIdNum);
                } catch (bookError) {
                    console.warn(`⚠️ Cannot get book info for book ${bookIdNum}:`, bookError.message);
                    continue;
                }
                
                // ✅ Double-check with BookNFT status
                const statusNum = bookInfo[2];
                if (statusNum !== 1) { // 1 = Borrowed
                    console.log(`📚 Skipping book ${bookIdNum} - BookNFT status is ${statusNum} (not Borrowed)`);
                    continue;
                }
                
                // Calculate due date and overdue status
                const dueDate = new Date(Number(loanInfo.dueDate) * 1000);
                const now = new Date();
                const isOverdue = now > dueDate && !loanInfo.isReturned;
                
                borrowedBooks.push({
                    id: bookIdNum,
                    name: bookInfo.name || `Book #${bookIdNum}`,
                    description: bookInfo.description || '',
                    borrowedAt: new Date(Number(loanInfo.borrowedAt) * 1000),
                    dueDate: dueDate,
                    deposit: ethers.utils ? ethers.utils.formatEther(loanInfo.deposit) : ethers.formatEther(loanInfo.deposit),
                    isReturned: loanInfo.isReturned,
                    isOverdue: isOverdue,
                    borrower: loanInfo.borrower
                });
                
                console.log(`✅ Loaded borrowed book #${bookIdNum}: ${bookInfo.name}`);
                
            } catch (error) {
                console.warn(`⚠️ Failed to load book ${bookId}:`, error.message);
                continue;
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
 * Render borrowed books with action buttons (same as before)
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
 * Book action functions (same as before)
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
        const signer = window.walletState.signer;
        const contractWithSigner = libraryCoreContract.connect(signer);
        const tx = await contractWithSigner.returnBook(bookId, conditionNum);
        
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

window.extendLoanAction = async function(bookId, bookName) {
    try {
        if (!confirm(`Extend loan for "${bookName}" by 14 days?\n\nExtension fee: 0.01 ETH`)) return;

        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const signer = window.walletState.signer;
        const contractWithSigner = libraryCoreContract.connect(signer);
        const extensionFee = ethers.utils ? ethers.utils.parseEther("0.01") : ethers.parseEther("0.01");
        
        const tx = await contractWithSigner.extendLoan(bookId, { value: extensionFee });
        
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

window.reportLostAction = async function(bookId, bookName) {
    try {
        if (!confirm(`Report "${bookName}" as LOST?\n\n⚠️ This will charge 0.005 ETH penalty!`)) return;
        
        const userInput = prompt('Type "LOST" to confirm:');
        if (userInput !== 'LOST') {
            alert('Confirmation failed.');
            return;
        }

        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const signer = window.walletState.signer;
        const contractWithSigner = libraryCoreContract.connect(signer);
        const tx = await contractWithSigner.returnBook(bookId, 4); // 4 = Lost
        
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
 * Display account message
 */
function displayAccountMessage(message) {
    const profileContent = document.getElementById('profileContent');
    const orderContent = document.getElementById('orderContent');
    
    const messageHTML = `<div style="text-align: center; padding: 40px; color: #666;"><p>${message}</p></div>`;
    
    if (profileContent) profileContent.innerHTML = messageHTML;
    if (orderContent) orderContent.innerHTML = messageHTML;
}

/**
 * Make functions globally available
 */
window.loadBorrowedBooksFromBlockchain = loadBorrowedBooksFromBlockchain;
window.loadAccountInfo = loadAccountInfo;
window.loadUserProfileFromBlockchain = loadUserProfileFromBlockchain;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
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