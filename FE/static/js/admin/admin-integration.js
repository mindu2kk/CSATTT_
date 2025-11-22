// ========================================
// ADMIN PAGE - COMPLETE BLOCKCHAIN INTEGRATION
// ========================================
// This file handles ALL admin page logic - 100% blockchain

/**
 * Handle URL query parameters for book editing
 */
function handleAdminQueryParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we're editing a book
    const bookId = urlParams.get('book_id');
    const bookName = urlParams.get('book_name');
    const bookNewness = urlParams.get('book_newness');
    const bookPrice = urlParams.get('book_price');
    const bookImage = urlParams.get('book_image');
    const bookDescription = urlParams.get('book_description');
    
    if (bookId !== null && bookId !== '') {
        // Load book from blockchain and show edit modal
        loadBookForEdit(parseInt(bookId));
    } else if (bookName) {
        // Search/book filter by name
        console.log('Searching for book:', bookName);
        // Will be handled by admin dashboard
    }
}

/**
 * Load book from blockchain for editing
 */
async function loadBookForEdit(bookId) {
    try {
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.bookNFTContract) {
            alert('Blockchain not connected. Please refresh page.');
            return;
        }
        
        // Get book info from blockchain
        const bookInfo = await window.blockchainBooks.bookNFTContract.getBookInfo(bookId);
        const owner = await window.blockchainBooks.bookNFTContract.ownerOf(bookId);
        const status = Number(bookInfo.status);
        const condition = Number(bookInfo.condition);
        
        // Extract author from description
        const description = bookInfo.description || '';
        let author = 'Unknown';
        if (description.includes('| Author:')) {
            author = description.split('| Author:')[1].trim();
        }
        
        // Get condition percentage
        const conditionPercent = getConditionPercent(condition);
        
        // Show edit modal with blockchain data
        showEditBookModal({
            id: bookId,
            name: bookInfo.name || '',
            description: description.replace(/\|.*$/, '').trim(), // Remove author part
            author: author,
            status: status,
            condition: condition,
            conditionPercent: conditionPercent,
            owner: owner,
            priceEth: (bookId + 1) * 0.01,
            imageHash: bookInfo.imageBeforeHash || ''
        });
        
    } catch (error) {
        console.error('Failed to load book for edit:', error);
        alert('Failed to load book from blockchain. Make sure the book exists.');
    }
}

/**
 * Show edit book modal with blockchain data
 */
function showEditBookModal(book) {
    // Find or create edit modal
    let modal = document.getElementById('edit-book-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'edit-book-modal';
        modal.className = 'overlay-backdrop';
        modal.innerHTML = `
            <div class="modal-container" style="max-width: 600px;">
                <span class="modal-close-button" onclick="closeEditModal()">&times;</span>
                <h3 class="modal-title">Edit Book (Blockchain)</h3>
                <form id="edit-book-form" onsubmit="handleUpdateBook(event)">
                    <div class="form-group">
                        <label>Book ID</label>
                        <input type="text" id="edit-book-id" readonly style="background: #f0f0f0;">
                    </div>
                    <div class="form-group">
                        <label>Tên sách *</label>
                        <input type="text" id="edit-book-name" required>
                    </div>
                    <div class="form-group">
                        <label>Author</label>
                        <input type="text" id="edit-book-author">
                    </div>
                    <div class="form-group">
                        <label>Description *</label>
                        <textarea id="edit-book-description" rows="4" required></textarea>
                    </div>
                    <div class="form-group">
                        <label>Condition</label>
                        <select id="edit-book-condition">
                            <option value="0">New (95-100%)</option>
                            <option value="1">Good (80-95%)</option>
                            <option value="2">Fair (60-80%)</option>
                            <option value="3">Poor (20-60%)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="edit-book-status">
                            <option value="0">Available</option>
                            <option value="1">Borrowed</option>
                            <option value="2">Damaged</option>
                            <option value="3">Lost</option>
                            <option value="4">Old</option>
                            <option value="5">New</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Price (ETH)</label>
                        <input type="text" id="edit-book-price" readonly style="background: #f0f0f0;">
                    </div>
                    <div class="form-group-button">
                        <button type="submit" class="save-button">Update on Blockchain</button>
                        <button type="button" onclick="closeEditModal()" style="margin-left: 10px; background: #999;">Cancel</button>
                    </div>
                </form>
                <div id="edit-book-result" style="margin-top: 16px;"></div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Fill form with blockchain data
    document.getElementById('edit-book-id').value = book.id;
    document.getElementById('edit-book-name').value = book.name;
    document.getElementById('edit-book-author').value = book.author;
    document.getElementById('edit-book-description').value = book.description;
    document.getElementById('edit-book-condition').value = book.condition;
    document.getElementById('edit-book-status').value = book.status;
    document.getElementById('edit-book-price').value = book.priceEth.toFixed(4) + ' ETH';
    
    // Show modal
    modal.style.display = 'flex';
}

/**
 * Close edit modal
 */
function closeEditModal() {
    const modal = document.getElementById('edit-book-modal');
    if (modal) {
        modal.style.display = 'none';
        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

/**
 * Handle update book form submission
 */
async function handleUpdateBook(event) {
    event.preventDefault();
    
    const bookId = parseInt(document.getElementById('edit-book-id').value);
    const name = document.getElementById('edit-book-name').value.trim();
    const author = document.getElementById('edit-book-author').value.trim();
    const description = document.getElementById('edit-book-description').value.trim();
    const condition = parseInt(document.getElementById('edit-book-condition').value);
    const status = parseInt(document.getElementById('edit-book-status').value);
    
    const resultDiv = document.getElementById('edit-book-result');
    resultDiv.innerHTML = '<p style="color: #2196F3;">⏳ Updating book on blockchain...</p>';
    
    try {
        await initBlockchainContracts();
        
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect MetaMask first!');
            await connectMetaMask();
            if (!window.walletState.isConnected) {
                resultDiv.innerHTML = '<p style="color: #f44336;">❌ Please connect MetaMask</p>';
                return;
            }
        }
        
        // Prepare description with author
        const fullDescription = author 
            ? `${description} | Author: ${author}`
            : description;
        
        // Update book info on blockchain
        const bookNFTWithSigner = window.blockchainBooks.bookNFTContract.connect(window.walletState.signer);
        
        // Update name and description
        const tx1 = await bookNFTWithSigner.updateBookInfo(bookId, name, fullDescription);
        await tx1.wait();
        
        // Update condition
        const tx2 = await bookNFTWithSigner.updateCondition(bookId, condition);
        await tx2.wait();
        
        // Update status
        const tx3 = await bookNFTWithSigner.updateBookStatus(bookId, status);
        await tx3.wait();
        
        resultDiv.innerHTML = `
            <div style="padding: 12px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 4px;">
                <strong style="color: #2e7d32;">✅ Book updated successfully!</strong><br>
                <small style="color: #666;">Transaction hashes: ${tx1.hash.slice(0, 10)}...</small>
            </div>
        `;
        
        // Refresh admin tables
        setTimeout(() => {
            if (typeof loadAdminBooksTable === 'function') {
                loadAdminBooksTable();
            }
            if (typeof loadAdminStats === 'function') {
                loadAdminStats();
            }
            closeEditModal();
        }, 2000);
        
    } catch (error) {
        console.error('Update failed:', error);
        let errorMsg = 'Failed to update book';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.reason) {
            errorMsg = error.reason;
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        resultDiv.innerHTML = `
            <div style="padding: 12px; background: #ffebee; border-left: 4px solid #f44336; border-radius: 4px;">
                <strong style="color: #c62828;">❌ ${errorMsg}</strong>
            </div>
        `;
    }
}

/**
 * Get condition percentage range
 */
function getConditionPercent(condition) {
    const percentMap = {
        0: '95-100%',
        1: '80-95%',
        2: '60-80%',
        3: '20-60%'
    };
    return percentMap[condition] || '0-20%';
}

// Auto-handle query params on page load
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on admin page
    if (window.location.pathname === '/admin') {
        console.log('🔧 Admin page loaded, checking query params...');
        
        // Wait a bit for wallet and contracts to initialize
        setTimeout(() => {
            handleAdminQueryParams();
        }, 1000);
    }
});

