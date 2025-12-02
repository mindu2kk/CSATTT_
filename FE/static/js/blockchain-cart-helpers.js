// ========================================
// BLOCKCHAIN CART HELPERS
// Helper functions to add to cart using UserCart.sol
// ========================================

import { USER_CART_ABI } from './abis.js';

let userCartContractInstance = null;

/**
 * Initialize UserCart contract
 */
async function initUserCartContract() {
    if (userCartContractInstance) return userCartContractInstance;

    if (!window.ethereum) {
        throw new Error('MetaMask not installed');
    }

    try {
        // Use the same provider pattern as blockchain-books.js
        if (!window.walletState || !window.walletState.provider) {
            throw new Error('Wallet not connected. Please connect MetaMask first.');
        }

        const signer = await window.walletState.provider.getSigner();

        // Load contract address
        const response = await fetch('/contracts.json');
        const contracts = await response.json();

        userCartContractInstance = new ethers.Contract(contracts.userCart, USER_CART_ABI, signer);
        console.log('✅ UserCart contract initialized:', contracts.userCart);

        return userCartContractInstance;
    } catch (error) {
        console.error('❌ Failed to init UserCart:', error);
        throw error;
    }
}

/**
 * Add book to cart (blockchain-based!)
 * @param {number} bookId - Book ID
 * @param {string} bookName - Book name (for UI feedback)

 */
export async function addToCartBlockchain(bookId, bookName) {
    try {
        // Check wallet connection first
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect your MetaMask wallet first!');
            return false;
        }

        // Initialize contract
        const contract = await initUserCartContract();

        // Check if already in cart
        const currentWallet = await contract.signer.getAddress();
        const isInCart = await contract.checkInCart(currentWallet, bookId);

        if (isInCart) {
            alert(`"${bookName}" is already in your cart!`);
            return false;
        }

        // Show loading state
        const addButtons = document.querySelectorAll(`button[onclick*="addToCart"][onclick*="${bookId}"]`);
        addButtons.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Adding...';
        });

        // Add to cart on blockchain
        const tx = await contract.addToCart(bookId);
        console.log('📤 Adding to cart, tx:', tx.hash);

        // Wait for confirmation
        await tx.wait();
        console.log('✅ Added to cart!');

        // Show success message with animation
        showCartSuccessMessage(`✅ Added "${bookName}" to cart!`);

        // Update cart badge
        await updateCartBadgeBlockchain();

        // Restore buttons
        addButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="bx bx-cart-add"></i> Add to Cart';
        });

        return true;

    } catch (error) {
        console.error('❌ Failed to add to cart:', error);
        
        let errorMsg = 'Failed to add to cart';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected';
        } else if (error.message) {
            errorMsg = error.message;
        }

        alert('❌ ' + errorMsg);

        // Restore buttons
        const addButtons = document.querySelectorAll(`button[onclick*="addToCart"][onclick*="${bookId}"]`);
        addButtons.forEach(btn => {
            btn.disabled = false;
            btn.innerHTML = '<i class="bx bx-cart-add"></i> Add to Cart';
        });

        return false;
    }
}

/**
 * Update cart badge count (blockchain-based!)
 */
export async function updateCartBadgeBlockchain() {
    try {
        // Check wallet connection first
        if (!window.walletState || !window.walletState.isConnected) {
            // Hide badge if wallet not connected
            const badge = document.querySelector('#cartBadge');
            if (badge) {
                badge.style.display = 'none';
            }
            return;
        }

        const contract = await initUserCartContract();
        const count = await contract.getMyCartCount();
        
        // Update badge in header
        const badge = document.querySelector('#cartBadge');
        if (badge) {
            badge.textContent = count.toString();
            badge.style.display = count > 0 ? 'flex' : 'none';
        }

        console.log('🛒 Cart count updated:', count.toString());
        
        // Dispatch event for other components
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: { count: Number(count) } 
        }));
        
    } catch (error) {
        console.error('❌ Failed to update cart badge:', error);
        // Hide badge on error
        const badge = document.querySelector('#cartBadge');
        if (badge) {
            badge.style.display = 'none';
        }
    }
}

/**
 * Get my cart (blockchain-based!)
 */
export async function getMyCartBlockchain() {
    try {
        const contract = await initUserCartContract();
        const cartBookIds = await contract.getMyCart();
        return cartBookIds.map(id => Number(id));
    } catch (error) {
        console.error('❌ Failed to get cart:', error);
        return [];
    }
}

/**
 * Show cart success message with animation
 */
function showCartSuccessMessage(message) {
    // Remove existing message
    const existing = document.querySelector('.cart-success-message');
    if (existing) existing.remove();
    
    // Create message element
    const messageEl = document.createElement('div');
    messageEl.className = 'cart-success-message';
    messageEl.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #00b894, #00a085);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0, 184, 148, 0.3);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 600;
            animation: slideInRight 0.3s ease-out;
        ">
            <i class='bx bx-check-circle' style="font-size: 20px;"></i>
            <span>${message}</span>
        </div>
        <style>
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        </style>
    `;
    
    document.body.appendChild(messageEl);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (messageEl.parentNode) {
            messageEl.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => {
                if (messageEl.parentNode) {
                    messageEl.remove();
                }
            }, 300);
        }
    }, 3000);
}

// Make functions available globally
window.addToCartBlockchain = addToCartBlockchain;
window.updateCartBadgeBlockchain = updateCartBadgeBlockchain;
window.getMyCartBlockchain = getMyCartBlockchain;
window.showCartSuccessMessage = showCartSuccessMessage;



