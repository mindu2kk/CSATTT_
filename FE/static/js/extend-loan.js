// ========================================
// EXTEND LOAN - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Extend loan for a borrowed book
 */
async function extendLoanForBook(bookId, bookName) {
    try {
        // Check wallet connection
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect your MetaMask wallet first!');
            return;
        }
        
        // Initialize contracts
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            throw new Error('LibraryCore contract not loaded');
        }
        
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const contractWithSigner = libraryCoreContract.connect(window.walletState.signer);
        
        // Get current loan info
        const loanInfo = await libraryCoreContract.loanInfos(bookId);
        const currentDueDate = new Date(Number(loanInfo.dueDate || loanInfo[2]) * 1000);
        const newDueDate = new Date(currentDueDate.getTime() + (14 * 24 * 60 * 60 * 1000)); // +14 days
        
        // Get extension fee
        const EXTENSION_FEE = await libraryCoreContract.EXTENSION_FEE();
        const feeEth = ethers.utils.formatEther(EXTENSION_FEE);
        
        // Confirm extension
        const confirmMsg = `
⏰ Extend Loan

Book: ${bookName}
Current Due Date: ${currentDueDate.toLocaleDateString()}
New Due Date: ${newDueDate.toLocaleDateString()}

Extension Fee: ${feeEth} ETH

Do you want to extend this loan?
        `;
        
        if (!confirm(confirmMsg)) {
            return;
        }
        
        console.log(`⏰ Extending loan for book ${bookId}...`);
        
        // Call extendLoan function
        const tx = await contractWithSigner.extendLoan(bookId, {
            value: EXTENSION_FEE
        });
        
        alert(`⏳ Transaction sent! Waiting for confirmation...`);
        console.log(`Transaction hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`✅ Loan extended! Block: ${receipt.blockNumber}`);
        
        // Success message
        alert(`✅ Loan extended successfully!

Book: ${bookName}
New Due Date: ${newDueDate.toLocaleDateString()}
Extension Fee: ${feeEth} ETH

Transaction confirmed in block ${receipt.blockNumber}

Refreshing your orders...`);
        
        // Reload the page to refresh orders
        window.location.reload();
        
    } catch (error) {
        console.error('Failed to extend loan:', error);
        
        let errorMsg = 'Failed to extend loan: ' + error.message;
        
        if (error.message.includes('BookNotBorrowed')) {
            errorMsg = 'This book is not currently borrowed by you.';
        } else if (error.message.includes('user rejected')) {
            errorMsg = 'Transaction rejected by user.';
        } else if (error.message.includes('insufficient funds')) {
            errorMsg = 'Insufficient funds to pay extension fee.';
        }
        
        alert(`❌ ${errorMsg}`);
    }
}

/**
 * Make function globally available
 */
window.extendLoanForBook = extendLoanForBook;

console.log('✅ Extend Loan module loaded');

