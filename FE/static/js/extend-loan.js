// ========================================
// EXTEND LOAN - BLOCKCHAIN INTEGRATION
// ========================================

const DEFAULT_EXTENSION_FEE = ethers.utils.parseEther('0.01');

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
        
        // Get extension fee (fallback 0.01 ETH if contract does not expose constant)
        const extensionFeeWei = await getExtensionFee(libraryCoreContract);
        const feeEth = ethers.utils.formatEther(extensionFeeWei);
        
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
            value: extensionFeeWei
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

async function getExtensionFee(contract) {
    if (contract && typeof contract.EXTENSION_FEE === 'function') {
        try {
            const fee = await contract.EXTENSION_FEE();
            if (fee && fee.gt(0)) {
                return fee;
            }
        } catch (error) {
            console.warn('EXTENSION_FEE constant not available on contract, using default', error);
        }
    }
    return DEFAULT_EXTENSION_FEE;
}

