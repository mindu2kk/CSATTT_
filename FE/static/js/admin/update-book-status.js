// ========================================
// ADMIN: UPDATE BOOK STATUS/CONDITION
// ========================================

/**
 * Update book status (Admin only)
 */
async function adminUpdateBookStatus(bookId, bookName) {
    try {
        // Check wallet connection
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect your MetaMask wallet first!');
            return;
        }
        
        // Show status selector
        const statusHTML = `
            <div id="statusModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                    <h2 style="margin: 0 0 20px 0;">Update Book Status</h2>
                    <p style="margin-bottom: 16px;"><strong>Book:</strong> ${bookName}</p>
                    <select id="newStatus" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
                        <option value="0">✅ Available</option>
                        <option value="1">📗 Borrowed</option>
                        <option value="2">⚠️ Damaged</option>
                        <option value="3">❌ Lost</option>
                    </select>
                    <div style="display: flex; gap: 10px;">
                        <button id="cancelStatus" style="flex: 1; padding: 12px; background: #f5f5f5; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                        <button id="confirmStatus" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Update</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', statusHTML);
        
        const modal = document.getElementById('statusModal');
        const statusSelect = document.getElementById('newStatus');
        
        document.getElementById('cancelStatus').onclick = () => modal.remove();
        document.getElementById('confirmStatus').onclick = async () => {
            const newStatus = parseInt(statusSelect.value);
            modal.remove();
            
            // Initialize contracts
            await initBlockchainContracts();
            
            if (!window.blockchainBooks.bookNFTContract) {
                throw new Error('BookNFT contract not loaded');
            }
            
            const bookNFTContract = window.blockchainBooks.bookNFTContract;
            const contractWithSigner = bookNFTContract.connect(window.walletState.signer);
            
            console.log(`🔄 Updating book ${bookId} status to ${newStatus}...`);
            
            const tx = await contractWithSigner.updateBookStatus(bookId, newStatus);
            alert('⏳ Updating status...');
            
            await tx.wait();
            
            alert(`✅ Book status updated successfully!`);
            window.location.reload();
        };
        
    } catch (error) {
        console.error('Failed to update book status:', error);
        alert(`❌ Failed to update status: ${error.message}`);
    }
}

/**
 * Update book condition (Admin only)
 */
async function adminUpdateBookCondition(bookId, bookName) {
    try {
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect your MetaMask wallet first!');
            return;
        }
        
        // Show condition selector
        const conditionHTML = `
            <div id="conditionModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div style="background: white; padding: 30px; border-radius: 12px; max-width: 400px; width: 90%;">
                    <h2 style="margin: 0 0 20px 0;">Update Book Condition</h2>
                    <p style="margin-bottom: 16px;"><strong>Book:</strong> ${bookName}</p>
                    <select id="newCondition" style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 8px; margin-bottom: 20px;">
                        <option value="0">✨ New (99-100%)</option>
                        <option value="1">📗 Good (80-98%)</option>
                        <option value="2">📙 Fair (60-79%)</option>
                        <option value="3">📕 Poor (<60%)</option>
                    </select>
                    <div style="display: flex; gap: 10px;">
                        <button id="cancelCondition" style="flex: 1; padding: 12px; background: #f5f5f5; border: none; border-radius: 8px; cursor: pointer;">Cancel</button>
                        <button id="confirmCondition" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">Update</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', conditionHTML);
        
        const modal = document.getElementById('conditionModal');
        const conditionSelect = document.getElementById('newCondition');
        
        document.getElementById('cancelCondition').onclick = () => modal.remove();
        document.getElementById('confirmCondition').onclick = async () => {
            const newCondition = parseInt(conditionSelect.value);
            modal.remove();
            
            await initBlockchainContracts();
            
            if (!window.blockchainBooks.bookNFTContract) {
                throw new Error('BookNFT contract not loaded');
            }
            
            const bookNFTContract = window.blockchainBooks.bookNFTContract;
            const contractWithSigner = bookNFTContract.connect(window.walletState.signer);
            
            console.log(`🔄 Updating book ${bookId} condition to ${newCondition}...`);
            
            const tx = await contractWithSigner.updateBookCondition(bookId, newCondition);
            alert('⏳ Updating condition...');
            
            await tx.wait();
            
            alert(`✅ Book condition updated successfully!`);
            window.location.reload();
        };
        
    } catch (error) {
        console.error('Failed to update book condition:', error);
        alert(`❌ Failed to update condition: ${error.message}`);
    }
}

/**
 * Make functions globally available
 */
window.adminUpdateBookStatus = adminUpdateBookStatus;
window.adminUpdateBookCondition = adminUpdateBookCondition;

console.log('✅ Admin Update Book module loaded');

