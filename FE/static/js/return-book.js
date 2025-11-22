// ========================================
// RETURN BOOK - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Show return book modal with condition selector
 */
function showReturnModal(bookId, bookName) {
    return new Promise((resolve, reject) => {
        // Create modal HTML
        const modalHTML = `
            <div id="returnBookModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            ">
                <div style="
                    background: white;
                    padding: 30px;
                    border-radius: 12px;
                    max-width: 500px;
                    width: 90%;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                ">
                    <h2 style="margin: 0 0 20px 0; color: #333;">📚 Return Book</h2>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
                        <strong style="color: #666;">Book:</strong> ${bookName}
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 10px; font-weight: 600; color: #333;">
                            📖 Book Condition After Return:
                        </label>
                        <select id="returnCondition" style="
                            width: 100%;
                            padding: 12px;
                            border: 2px solid #ddd;
                            border-radius: 8px;
                            font-size: 14px;
                            background: white;
                        ">
                            <option value="0">✨ Available - Perfect condition (will auto-set to Available)</option>
                            <option value="1">📗 Good - Good condition (will auto-set to Available)</option>
                            <option value="2">⚠️ Damaged - Fair condition (needs review, will set to Damaged)</option>
                            <option value="3">❌ Lost - Book is lost or severely damaged (will set to Lost)</option>
                        </select>
                    </div>
                    
                    <div style="margin-bottom: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196F3;">
                        <strong style="color: #1976D2;">💡 Refund Information:</strong>
                        <div style="margin-top: 8px; font-size: 13px; color: #555;">
                            • <strong>Available:</strong> Full deposit refund (0.1 ETH)<br>
                            • <strong>Lost:</strong> No refund, deposit forfeited<br>
                            • Late fees will be deducted if overdue
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button id="cancelReturn" style="
                            padding: 12px 24px;
                            background: #f5f5f5;
                            color: #333;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        ">Cancel</button>
                        <button id="confirmReturn" style="
                            padding: 12px 24px;
                            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                            color: white;
                            border: none;
                            border-radius: 8px;
                            cursor: pointer;
                            font-size: 14px;
                            font-weight: 600;
                        ">✅ Confirm Return</button>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Get elements
        const modal = document.getElementById('returnBookModal');
        const cancelBtn = document.getElementById('cancelReturn');
        const confirmBtn = document.getElementById('confirmReturn');
        const conditionSelect = document.getElementById('returnCondition');
        
        // Cancel handler
        cancelBtn.onclick = () => {
            modal.remove();
            reject('User cancelled');
        };
        
        // Confirm handler
        confirmBtn.onclick = () => {
            const condition = parseInt(conditionSelect.value);
            modal.remove();
            resolve(condition);
        };
        
        // Click outside to close
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.remove();
                reject('User cancelled');
            }
        };
    });
}

/**
 * Return a book to the library
 */
async function returnBookToBlockchain(bookId, bookName) {
    try {
        // Check wallet connection
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect your MetaMask wallet first!');
            return;
        }
        
        // Show condition selector modal
        let conditionAfter;
        try {
            conditionAfter = await showReturnModal(bookId, bookName);
        } catch (error) {
            console.log('Return cancelled by user');
            return;
        }
        
        // Initialize contracts
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            throw new Error('LibraryCore contract not loaded');
        }
        
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const contractWithSigner = libraryCoreContract.connect(window.walletState.signer);
        
        // Get loan info to calculate refund
        const loanInfo = await libraryCoreContract.loanInfos(bookId);
        const deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3]);
        
        // Show loading
        alert(`⏳ Processing return for "${bookName}"...\n\nThis may take a few seconds.`);
        
        console.log(`📤 Returning book ${bookId} with condition ${conditionAfter}...`);
        
        // Call returnBook function
        const tx = await contractWithSigner.returnBook(bookId, conditionAfter);
        
        console.log(`⏳ Transaction sent: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`✅ Book returned! Block: ${receipt.blockNumber}`);
        
        // Success message
        alert(`✅ Book returned successfully!

Book: ${bookName}
Deposit: ${deposit} ETH will be refunded to your wallet

Transaction confirmed in block ${receipt.blockNumber}

Refreshing your orders...`);
        
        // Reload the page to refresh orders
        window.location.reload();
        
    } catch (error) {
        console.error('Failed to return book:', error);
        
        let errorMsg = 'Failed to return book: ' + error.message;
        
        if (error.message.includes('BookNotBorrowed')) {
            errorMsg = 'This book is not currently borrowed by you.';
        } else if (error.message.includes('user rejected')) {
            errorMsg = 'Transaction rejected by user.';
        }
        
        alert(`❌ ${errorMsg}`);
    }
}

/**
 * Make function globally available
 */
window.returnBookToBlockchain = returnBookToBlockchain;

console.log('✅ Return Book module loaded');

