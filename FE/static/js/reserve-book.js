// ========================================
// RESERVE BOOK - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Reserve a borrowed book for next borrow
 */
async function reserveBook(bookId, bookName) {
    try {
        // Check wallet connection
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect your MetaMask wallet first!');
            return;
        }
        
        // Confirm reservation
        if (!confirm(`Reserve "${bookName}"?\n\nYou will be notified when this book becomes available.`)) {
            return;
        }
        
        // Initialize contracts
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            throw new Error('LibraryCore contract not loaded');
        }
        
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const contractWithSigner = libraryCoreContract.connect(window.walletState.signer);
        
        console.log(`🔖 Reserving book ${bookId}...`);
        
        // Call reserveBook function
        const tx = await contractWithSigner.reserveBook(bookId);
        
        alert(`⏳ Reservation in progress...`);
        console.log(`Transaction hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`✅ Book reserved! Block: ${receipt.blockNumber}`);
        
        // Success message
        alert(`✅ Book reserved successfully!

Book: ${bookName}

You will be the next person to borrow this book when it's returned.
We'll notify you when it becomes available!`);
        
    } catch (error) {
        console.error('Failed to reserve book:', error);
        
        let errorMsg = 'Failed to reserve book: ' + error.message;
        
        if (error.message.includes('BookNotBorrowed')) {
            errorMsg = 'This book is currently available - you can borrow it directly!';
        } else if (error.message.includes('AlreadyReserved')) {
            errorMsg = 'You have already reserved this book.';
        } else if (error.message.includes('user rejected')) {
            errorMsg = 'Transaction rejected by user.';
        }
        
        alert(`❌ ${errorMsg}`);
    }
}

/**
 * Cancel reservation
 */
async function cancelReservation(bookId, bookName) {
    try {
        // Check wallet connection
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect your MetaMask wallet first!');
            return;
        }
        
        // Confirm cancellation
        if (!confirm(`Cancel reservation for "${bookName}"?`)) {
            return;
        }
        
        // Initialize contracts
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            throw new Error('LibraryCore contract not loaded');
        }
        
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const contractWithSigner = libraryCoreContract.connect(window.walletState.signer);
        
        console.log(`❌ Cancelling reservation for book ${bookId}...`);
        
        // Call cancelReservation function
        const tx = await contractWithSigner.cancelReservation(bookId);
        
        console.log(`Transaction hash: ${tx.hash}`);
        
        // Wait for confirmation
        const receipt = await tx.wait();
        
        console.log(`✅ Reservation cancelled! Block: ${receipt.blockNumber}`);
        
        // Success message
        alert(`✅ Reservation cancelled successfully!

Book: ${bookName}

Your reservation has been removed.`);
        
        // Reload to refresh
        window.location.reload();
        
    } catch (error) {
        console.error('Failed to cancel reservation:', error);
        alert(`❌ Failed to cancel reservation: ${error.message}`);
    }
}

/**
 * Make functions globally available
 */
window.reserveBook = reserveBook;
window.cancelReservation = cancelReservation;

console.log('✅ Reserve Book module loaded');

