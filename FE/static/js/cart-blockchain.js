// ========================================
// CART BLOCKCHAIN PAYMENT INTEGRATION
// ========================================

/**
 * Load cart from localStorage and display
 */
function loadCartItems() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItemsContainer = document.querySelector('.cart-items');
    
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: #666;">
                <i class='bx bx-cart' style="font-size: 64px; opacity: 0.3;"></i>
                <p style="margin-top: 20px; font-size: 18px;">Your cart is empty</p>
                <a href="/home" style="display: inline-block; margin-top: 16px; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 8px;">Browse Books</a>
            </div>
        `;
        return;
    }
    
    // Clear existing
    cartItemsContainer.innerHTML = '';
    
    // Render each item
    cart.forEach((item, index) => {
        const bookHtml = `
            <div class="book" data-index="${index}">
                <div class="bia">
                    <input type="checkbox" id="select-${index}" checked>
                    <img src="${item.imageUrl || '/model_images/muado.jpg'}" alt="${item.name}">
                    <div class="details">
                        <h4>${item.name}</h4>
                        <p>Book ID: ${item.id}</p>
                        <div class="quantity-selector">
                            <button class="sub" onclick="updateQuantity(${index}, -1)"><i class='bx bx-minus'></i></button>
                            <input type="text" value="${String(item.quantity).padStart(2, '0')}" class="val" readonly>
                            <button class="add" onclick="updateQuantity(${index}, 1)"><i class='bx bx-plus'></i></button>
                        </div>
                    </div>
                </div>
                <div class="action">
                    <p class="price">
                        ${item.priceEth} ETH
                        <small style="display: block; font-size: 11px; color: #888;">≈ $${item.priceUsd}</small>
                    </p>
                    <i class='bx bx-trash' onclick="removeFromCart(${index})"></i> 
                </div>
            </div>
        `;
        cartItemsContainer.insertAdjacentHTML('beforeend', bookHtml);
    });
    
    // Update totals
    updateCartTotals();
    
    // Add checkbox listeners
    document.querySelectorAll('.cart-items .book input[type="checkbox"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateCartTotals);
    });
}

/**
 * Update quantity
 */
function updateQuantity(index, delta) {
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
        console.warn('localStorage not available:', e);
        return;
    }
    
    if (index < 0 || index >= cart.length) return;
    
    cart[index].quantity = Math.max(1, Math.min(50, cart[index].quantity + delta));
    
    localStorage.setItem('cart', JSON.stringify(cart));
    loadCartItems();
}

/**
 * Remove from cart
 */
function removeFromCart(index) {
    if (!confirm('Remove this book from cart?')) return;
    
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.splice(index, 1);
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
        console.warn('localStorage not available:', e);
        return;
    }
    loadCartItems();
}

/**
 * Update cart totals
 */
function updateCartTotals() {
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart') || '[]');
    } catch (e) {
        console.warn('localStorage not available:', e);
        cart = [];
    }
    let totalEth = 0;
    let totalUsd = 0;
    
document.querySelectorAll('.cart-items .book').forEach((bookEl, index) => {
        const checkbox = bookEl.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked && cart[index]) {
            const item = cart[index];
            totalEth += parseFloat(item.priceEth) * item.quantity;
            totalUsd += parseFloat(item.priceUsd) * item.quantity;
        }
    });
    
    // Update display
    const totalElement = document.querySelector('.total span');
    if (totalElement) {
        totalElement.innerHTML = `
            Total: ${totalEth.toFixed(4)} ETH
            <small style="display: block; font-size: 12px; color: #888;">≈ $${totalUsd.toFixed(2)}</small>
        `;
    }
    
    // Store for checkout
    window.cartTotal = {
        eth: totalEth.toFixed(4),
        usd: totalUsd.toFixed(2)
    };
}

function showCheckoutModal(details) {
    return new Promise((resolve) => {
        const modal = document.getElementById('checkoutModal');
        if (!modal) {
            resolve(confirm('Proceed with MetaMask payment?'));
            return;
        }
        const dialog = modal.querySelector('.checkout-dialog');
        const itemsContainer = document.getElementById('checkoutItems');
        const depositPerEl = document.getElementById('checkoutDepositPer');
        const depositTotalEl = document.getElementById('checkoutDepositTotal');
        const depositUsdEl = document.getElementById('checkoutDepositUsd');
        const depositPer = Number(details.depositPerEth || 0);
        const totalEth = depositPer * details.items.length;
        const usdEstimate = totalEth * 2000;
        if (itemsContainer) {
            itemsContainer.innerHTML = details.items.map((item) => `
                <div class="summary-item">
                    <div>
                        <strong>${item.name}</strong>
                        <small>ID #${item.id} • Cart price ${Number(item.priceEth).toFixed(3)} ETH</small>
                    </div>
                    <span>${depositPer.toFixed(4)} ETH</span>
                </div>
            `).join('') || '<p style="color:#777;">No books selected.</p>';
        }
        if (depositPerEl) depositPerEl.textContent = `${depositPer.toFixed(4)} ETH`;
        if (depositTotalEl) depositTotalEl.textContent = `${totalEth.toFixed(4)} ETH`;
        if (depositUsdEl) depositUsdEl.textContent = `(≈ $${usdEstimate.toFixed(2)})`;
        modal.style.display = 'flex';
        const confirmBtn = modal.querySelector('[data-action="confirm"]');
        const cancelButtons = modal.querySelectorAll('[data-action="cancel"]');
        const outsideHandler = (event) => {
            if (event.target === modal) {
                cleanup(false);
            }
        };
        const cleanup = (result) => {
            modal.style.display = 'none';
            confirmBtn && (confirmBtn.onclick = null);
            cancelButtons.forEach(btn => btn.onclick = null);
            modal.removeEventListener('click', outsideHandler);
            resolve(result);
        };
        confirmBtn && (confirmBtn.onclick = () => cleanup(true));
        cancelButtons.forEach(btn => btn.onclick = () => cleanup(false));
        modal.addEventListener('click', outsideHandler);
    });
}

function showMessageModal({ title = 'Notice', message = '', variant = 'info' }) {
    return new Promise((resolve) => {
        const modal = document.getElementById('checkoutMessageModal');
        if (!modal) {
            alert(message);
            resolve();
            return;
        }
        const dialog = modal.querySelector('.checkout-dialog');
        dialog.classList.remove('variant-info', 'variant-success', 'variant-error');
        dialog.classList.add(`variant-${variant}`);
        const titleEl = document.getElementById('messageModalTitle');
        const bodyEl = document.getElementById('messageModalBody');
        if (titleEl) titleEl.textContent = title;
        if (bodyEl) bodyEl.textContent = message;
        modal.style.display = 'flex';
        const okBtn = modal.querySelector('[data-action="ok"]');
        const closeBtn = modal.querySelector('[data-action="close"]');
        const outsideHandler = (event) => {
            if (event.target === modal) {
                cleanup();
            }
        };
        const cleanup = () => {
            modal.style.display = 'none';
            okBtn && (okBtn.onclick = null);
            closeBtn && (closeBtn.onclick = null);
            modal.removeEventListener('click', outsideHandler);
            resolve();
        };
        okBtn && (okBtn.onclick = cleanup);
        closeBtn && (closeBtn.onclick = cleanup);
        modal.addEventListener('click', outsideHandler);
    });
}

/**
 * Checkout with MetaMask
 */
async function checkoutWithMetaMask() {
    try {
        if (!window.walletState || !window.walletState.isConnected) {
            await connectMetaMask();
            if (!window.walletState.isConnected) {
                await showMessageModal({
                    title: 'Wallet Required',
                    message: 'Please connect your MetaMask wallet to continue checkout.'
                });
                return;
            }
        }
        
        // Get selected items
        let cart = [];
        try {
            cart = JSON.parse(localStorage.getItem('cart') || '[]');
        } catch (e) {
            console.warn('localStorage not available:', e);
            await showMessageModal({
                title: 'Storage Error',
                message: 'Cart storage is not available. Please refresh the page and try again.',
                variant: 'error'
            });
            return;
        }
        const selectedItems = [];
        
        document.querySelectorAll('.cart-items .book').forEach((bookEl, index) => {
            const checkbox = bookEl.querySelector('input[type="checkbox"]');
            if (checkbox && checkbox.checked && cart[index]) {
                selectedItems.push(cart[index]);
            }
        });
        
        if (selectedItems.length === 0) {
            await showMessageModal({
                title: 'No Books Selected',
                message: 'Please select at least one book in your cart before checking out.'
            });
            return;
        }
        
        await initBlockchainContracts();
        if (!window.blockchainBooks.libraryCoreContract || !window.blockchainBooks.bookNFTContract) {
            await showMessageModal({
                title: 'Contract Missing',
                message: 'Blockchain contracts are not loaded. Please refresh and try again.',
                variant: 'error'
            });
            return;
        }

        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const contractWithSigner = libraryCoreContract.connect(window.walletState.signer);
        const BASE_DEPOSIT = await libraryCoreContract.BASE_DEPOSIT();
        const depositEth = parseFloat(ethers.utils.formatEther(BASE_DEPOSIT));

        const proceed = await showCheckoutModal({
            items: selectedItems,
            depositPerEth: depositEth
        });
        if (!proceed) {
            return;
        }
        
        // Show loading
        const orderBtn = document.querySelector('.order-btn');
        const originalText = orderBtn.textContent;
        orderBtn.textContent = '⏳ Processing...';
        orderBtn.disabled = true;
        
        try {
            console.log(`📚 Borrowing ${selectedItems.length} books...`);
            console.log(`💰 Required deposit per book: ${depositEth} ETH`);
            
            // VALIDATE: Check all books are available before borrowing
            console.log(`🔍 Validating ${selectedItems.length} books...`);
            
            for (let i = 0; i < selectedItems.length; i++) {
                const item = selectedItems[i];
                const bookStatus = await window.blockchainBooks.bookNFTContract.getBookStatus(item.id);
                const statusNum = Number(bookStatus);
                
                console.log(`📖 Book ${item.id} "${item.name}": status = ${statusNum} (${getStatusName(statusNum)})`);
                
                // Valid status check
                if (statusNum < 0 || statusNum > 3) {
                    throw new Error(`Book "${item.name}" has INVALID status ${statusNum}. Blockchain data corrupted! Need to reset and remint.`);
                }
                
                if (statusNum !== 0) {
                    throw new Error(`Book "${item.name}" is ${getStatusName(statusNum)}. Only Available books can be borrowed. Please remove it from cart.`);
                }
            }
            
            console.log(`✅ All books validated as available`);
            
            // Borrow each selected book
            for (let i = 0; i < selectedItems.length; i++) {
                const item = selectedItems[i];
                const bookId = item.id;
                
                console.log(`📖 Borrowing book ${bookId} with deposit ${depositEth} ETH...`);
                
                try {
                    // Call borrowBook function on smart contract with BASE_DEPOSIT
                    const tx = await contractWithSigner.borrowBook(bookId, {
                        value: BASE_DEPOSIT  // Use actual BASE_DEPOSIT from contract
                    });
                    
                    console.log(`⏳ Transaction sent for book ${bookId}: ${tx.hash}`);
                    
                    // Wait for confirmation
                    const receipt = await tx.wait();
                    console.log(`✅ Book ${bookId} borrowed! Block: ${receipt.blockNumber}`);
                    
                } catch (bookError) {
                    console.error(`❌ Failed to borrow book ${bookId}:`, bookError);
                    
                    // Better error messages
                    let errorMsg = bookError.message;
                    if (errorMsg.includes('BookNotAvailable')) {
                        errorMsg = `Book is no longer available. Someone else may have borrowed it.`;
                    }
                    
                    throw new Error(`Failed to borrow "${item.name}": ${errorMsg}`);
                }
            }
            
            // Success!
            await showMessageModal({
                title: 'Borrow Successful',
                message: `You borrowed ${selectedItems.length} book(s). Deposits are locked until you return them in good condition.`,
                variant: 'success'
            });
            
            // Clear cart
            try {
                localStorage.removeItem('cart');
            } catch (e) {
                console.warn('localStorage not available:', e);
            }
            
            // ✅ CRITICAL FIX: Wait longer and ensure wallet state is preserved
            // Also force reload of books to update status
            setTimeout(async () => {
                // Force reload books to update their status
                if (window.loadBooksFromBlockchain) {
                    try {
                        await window.loadBooksFromBlockchain();
                    } catch (e) {
                        console.warn('Failed to reload books:', e);
                    }
                }
                
                // Redirect to account page - My Order tab (to see borrowed books)
                window.location.href = '/account?active_tab=order';
            }, 1000);
            
        } catch (txError) {
            console.error('Transaction failed:', txError);
            
            let errorMsg = 'Transaction failed!';
            if (txError.code === 4001) {
                errorMsg = 'Transaction rejected by user';
            } else if (txError.code === -32000) {
                errorMsg = 'Insufficient funds';
            } else if (txError.message) {
                errorMsg = txError.message;
            }
            
            await showMessageModal({
                title: 'Transaction Failed',
                message: errorMsg,
                variant: 'error'
            });
            
        } finally {
            orderBtn.textContent = originalText;
            orderBtn.disabled = false;
        }
        
    } catch (error) {
        console.error('Checkout failed:', error);
        await showMessageModal({
            title: 'Checkout Failed',
            message: error.message || 'An unexpected error occurred.',
            variant: 'error'
        });
    }
}

// Initialize cart on page load
document.addEventListener('DOMContentLoaded', function() {
    loadCartItems();
    
    // Replace Order button handler
    const orderBtn = document.querySelector('.order-btn');
    if (orderBtn) {
        // Remove old handler
        const newOrderBtn = orderBtn.cloneNode(true);
        orderBtn.parentNode.replaceChild(newOrderBtn, orderBtn);
        
        // Add new handler
        newOrderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            checkoutWithMetaMask();
        });
    }
});

