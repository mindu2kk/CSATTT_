// ========================================
// REPORT LOST BOOK - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Report a book as lost
 */
async function reportLostBook(bookId, bookName) {
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
        
        // Get loan info to show deposit
        const loanInfo = await libraryCoreContract.loanInfos(bookId);
        const deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3]);
        
        // WARNING message
        const confirmMsg = `
⚠️ REPORT LOST BOOK

Book: ${bookName}

⚠️ WARNING: If you report this book as lost:
• Your deposit of ${deposit} ETH will be FORFEITED
• The book will be marked as "Lost" on blockchain
• This action CANNOT be undone
• Your reputation will be affected

Are you absolutely sure you want to proceed?
        `;
        
        if (!confirm(confirmMsg)) {
            return;
        }
        
        // Double confirm
        if (!confirm('This is your final warning. Proceed with reporting as lost?')) {
            return;
        }
        
        const contractWithSigner = libraryCoreContract.connect(window.walletState.signer);
        
        console.log(`❌ Reporting book ${bookId} as lost...`);
        
        // Call reportLostBook function
        const tx = await contractWithSigner.reportLostBook(bookId);
        
        alert(`⏳ Processing lost report...`);
        console.log(`Transaction hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`✅ Book marked as lost! Block: ${receipt.blockNumber}`);
        
        // Message
        alert(`Book reported as lost.

Book: ${bookName}
Deposit Forfeited: ${deposit} ETH

The book has been marked as "Lost" on the blockchain.
Your account has been updated.

Thank you for your honesty in reporting this.`);
        
        // Reload the page
        window.location.reload();
        
    } catch (error) {
        console.error('Failed to report lost book:', error);
        
        let errorMsg = 'Failed to report lost book: ' + error.message;
        
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
window.reportLostBook = reportLostBook;

console.log('✅ Report Lost module loaded');

