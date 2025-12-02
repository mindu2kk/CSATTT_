// ========================================
// CART BLOCKCHAIN V3 - USING UserCart.sol CONTRACT
// ========================================

import { USER_CART_ABI, BOOK_NFT_ABI, LIBRARY_CORE_V3_ABI } from './abis.js';

let userCartContract = null;
let bookNFTContract = null;
let libraryCoreContract = null;
let currentWalletAddress = null;

/**
 * Initialize contracts for cart
 */
async function initializeCartContracts() {
    if (!window.ethereum) {
        alert('Please install MetaMask to use the cart feature!');
        return false;
    }

    // Check if ethers is loaded
    if (typeof ethers === 'undefined') {
        console.error('❌ Ethers.js not loaded');
        showError('Blockchain library not loaded. Please refresh the page.');
        return false;
    }

    try {
        // Use wallet state from wallet.js (same as other files)
        if (!window.walletState || !window.walletState.isConnected) {
            throw new Error('Wallet not connected. Please connect MetaMask first.');
        }
        
        const signer = window.walletState.signer;
        currentWalletAddress = await signer.getAddress();

        // Load contract addresses
        const response = await fetch('/contracts.json');
        const contracts = await response.json();

        // Initialize contracts
        userCartContract = new ethers.Contract(contracts.userCart, USER_CART_ABI, signer);
        bookNFTContract = new ethers.Contract(contracts.bookNFT, BOOK_NFT_ABI, window.walletState.provider);
        libraryCoreContract = new ethers.Contract(contracts.libraryCore, LIBRARY_CORE_V3_ABI, window.walletState.provider);

        console.log('✅ Cart contracts initialized');
        console.log('   UserCart:', contracts.userCart);
        console.log('   Wallet:', currentWalletAddress);

        return true;
    } catch (error) {
        console.error('❌ Failed to initialize cart contracts:', error);
        return false;
    }
}

/**
 * Load cart from blockchain (UserCart.sol)
 */
async function loadCartItems(retryCount = 0) {
    const cartItemsContainer = document.querySelector('.cart-items');
    if (!cartItemsContainer) return;

    // Show loading state
    if (retryCount === 0) {
        showLoading();
    }

    try {
        const initialized = await initializeCartContracts();
        if (!initialized) {
            // Retry up to 3 times with delay
            if (retryCount < 3) {
                console.log(`🔄 Retrying cart initialization (${retryCount + 1}/3)...`);
                setTimeout(() => loadCartItems(retryCount + 1), 1000);
                return;
            }
            showError('Please connect MetaMask first!');
            return;
        }

        // ✅ Get cart from BLOCKCHAIN (per wallet!)
        const cartBookIds = await userCartContract.getMyCart();
        
        console.log(`🛒 Cart for ${currentWalletAddress}:`, cartBookIds.map(id => Number(id)));

        if (cartBookIds.length === 0) {
            cartItemsContainer.innerHTML = `
                <div class="cart-empty">
                    <i class='bx bx-cart'></i>
                    <h3 style="margin: 0; font-size: 24px; color: #666;">Your cart is empty</h3>
                    <p style="margin: 10px 0; font-size: 14px; color: #888;">
                        Connected wallet: ${currentWalletAddress.slice(0,6)}...${currentWalletAddress.slice(-4)}
                    </p>
                    <p style="margin: 10px 0; font-size: 14px; color: #888;">
                        Add some books to your cart to get started!
                    </p>
                    <a href="/home" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; text-decoration: none; border-radius: 25px; font-weight: 600; transition: all 0.3s ease;">
                        <i class='bx bx-book-open' style="margin-right: 8px;"></i>Browse Books
                    </a>
                </div>
            `;
            updateCartTotals();
            return;
        }

        // Load book details for each book in cart
        const booksHTML = [];
        for (let i = 0; i < cartBookIds.length; i++) {
            const bookId = Number(cartBookIds[i]);
            try {
                // ✅ Check book status DIRECTLY from BookNFT (source of truth!)
                const bookInfo = await bookNFTContract.getBookInfo(bookId);
                const statusNum = bookInfo[2];
                
                console.log(`🔍 Book #${bookId} status from BookNFT: ${statusNum}`);
                
                const statusMap = {
                    0: 'Available',
                    1: 'Borrowed',
                    2: 'Reserved',
                    3: 'Damaged',
                    4: 'Lost',
                    5: 'New',
                    6: 'Old'
                };

                const status = statusMap[statusNum] || 'Unknown';
                
                // ✅ If book is borrowed (status = 1), auto-remove from cart
                if (statusNum === 1) {
                    console.log(`📚 Book #${bookId} is BORROWED - auto-removing from cart`);
                    try {
                        const tx = await userCartContract.removeFromCart(bookId);
                        await tx.wait();
                        console.log(`🗑️ Auto-removed book #${bookId} from cart`);
                    } catch (removeError) {
                        console.warn(`Failed to auto-remove book #${bookId}:`, removeError.message);
                    }
                    continue; // Skip this book
                }
                
                const isAvailable = statusNum === 0 || statusNum === 5 || statusNum === 6;
                const priceEth = 0.01; // BASE_DEPOSIT for all books

                booksHTML.push(`
                    <div class="book" data-book-id="${bookId}" data-available="${isAvailable}">
                        <div class="book-select">
                            <input type="checkbox" ${isAvailable ? 'checked' : 'disabled'} onchange="updateCartTotals()">
                        </div>
                        <div class="book-image">
                            <img src="/model_images/muado.jpg" alt="${bookInfo[0]}">
                        </div>
                        <div class="book-details">
                            <h3>${bookInfo[0]}</h3>
                            <p class="book-description">${bookInfo[1]}</p>
                            <p class="book-status ${isAvailable ? 'status-available' : 'status-unavailable'}">
                                ${isAvailable ? '✅ Available' : '⛔ ' + status}
                            </p>
                        </div>
                        <div class="book-price">
                            <p class="price-eth">${priceEth.toFixed(4)} ETH</p>
                            <p class="price-usd">≈ $${(priceEth * 2000).toFixed(2)}</p>
                        </div>
                        <div class="book-actions">
                            <button class="btn-remove" onclick="removeFromCartBlockchain(${bookId})">
                                <i class='bx bx-trash'></i> Remove
                            </button>
                        </div>
                    </div>
                `);
            } catch (error) {
                console.error(`Failed to load book ${bookId}:`, error);
            }
        }

        cartItemsContainer.innerHTML = booksHTML.join('');
        
        // Setup select-all functionality
        setupSelectAllFunctionality();
        
        updateCartTotals();

    } catch (error) {
        console.error('❌ Failed to load cart:', error);
        showError('Failed to load cart: ' + error.message);
    }
}

/**
 * Remove from cart (blockchain)
 */
window.removeFromCartBlockchain = async function(bookId) {
    if (!confirm('Remove this book from cart?')) return;

    try {
        const initialized = await initializeCartContracts();
        if (!initialized) return;

        // Show loading
        const btn = document.querySelector(`button[onclick*="removeFromCartBlockchain(${bookId})"]`);
        if (btn) {
            btn.innerHTML = '<i class="bx bx-loader-alt bx-spin"></i> Removing...';
            btn.disabled = true;
        }

        // ✅ Remove from blockchain
        const tx = await userCartContract.removeFromCart(bookId);
        console.log('📤 Transaction sent:', tx.hash);
        
        await tx.wait();
        console.log('✅ Book removed from cart!');

        // Reload cart
        await loadCartItems();
        
        alert('✅ Book removed from cart!');

    } catch (error) {
        console.error('❌ Failed to remove from cart:', error);
        alert('Failed to remove: ' + error.message);
        // Restore button
        const btn = document.querySelector(`button[onclick*="removeFromCartBlockchain(${bookId})"]`);
        if (btn) {
            btn.innerHTML = '<i class="bx bx-trash"></i> Remove';
            btn.disabled = false;
        }
    }
};

/**
 * Setup select-all functionality
 */
function setupSelectAllFunctionality() {
    const selectAllCheckbox = document.getElementById('select-all');
    const bookCheckboxes = document.querySelectorAll('.cart-items .book input[type="checkbox"]');

    if (selectAllCheckbox) {
        // Remove existing listeners
        selectAllCheckbox.replaceWith(selectAllCheckbox.cloneNode(true));
        const newSelectAllCheckbox = document.getElementById('select-all');
        
        newSelectAllCheckbox.addEventListener('change', () => {
            const isChecked = newSelectAllCheckbox.checked;
            document.querySelectorAll('.cart-items .book input[type="checkbox"]').forEach(checkbox => {
                checkbox.checked = isChecked;
            });
            updateCartTotals();
        });
    }

    // Add listeners to individual checkboxes
    bookCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            updateCartTotals();
        });
    });
}

/**
 * Update cart totals
 */
function updateCartTotals() {
    let totalEth = 0;
    let totalUsd = 0;
    
    document.querySelectorAll('.cart-items .book').forEach((bookEl) => {
        const checkbox = bookEl.querySelector('input[type="checkbox"]');
        const isAvailable = bookEl.dataset.available === 'true';
        
        if (checkbox && checkbox.checked && isAvailable) {
            const priceEth = parseFloat(bookEl.querySelector('.price-eth').textContent);
            totalEth += priceEth;
            totalUsd += priceEth * 2000;
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

/**
 * Checkout - Borrow all selected books
 */
window.checkoutCart = async function() {
    try {
        const initialized = await initializeCartContracts();
        if (!initialized) return;

        // Get signer from wallet state (FIX: Define signer in correct scope)
        if (!window.walletState || !window.walletState.signer) {
            alert('Wallet not connected. Please connect MetaMask first.');
            return;
        }

        // ✅ Check if user has active profile before borrowing
        if (typeof ensureProfileCompletion === 'function') {
            const ready = await ensureProfileCompletion({
                actionLabel: 'mượn sách từ giỏ hàng',
                redirectUrl: '/account?active_tab=profile'
            });
            if (!ready) {
                return;
            }
        }
        const signer = window.walletState.signer;

        // Get selected books
        const selectedBooks = [];
        document.querySelectorAll('.cart-items .book').forEach((bookEl) => {
            const checkbox = bookEl.querySelector('input[type="checkbox"]');
            const isAvailable = bookEl.dataset.available === 'true';
            
            if (checkbox && checkbox.checked && isAvailable) {
                const bookId = parseInt(bookEl.dataset.bookId);
                const priceEth = parseFloat(bookEl.querySelector('.price-eth').textContent);
                selectedBooks.push({ bookId, priceEth });
            }
        });

        if (selectedBooks.length === 0) {
            alert('Please select at least one available book!');
            return;
        }

        // Calculate total deposit
        const totalDeposit = selectedBooks.reduce((sum, book) => sum + book.priceEth, 0);

        if (!confirm(`Borrow ${selectedBooks.length} book(s) for ${totalDeposit.toFixed(2)} ETH deposit?`)) {
            return;
        }

        // Show checkout modal
        showCheckoutProgress(selectedBooks, totalDeposit);

        // Borrow each book
        let successCount = 0;
        let skippedCount = 0;
        
        for (let i = 0; i < selectedBooks.length; i++) {
            const book = selectedBooks[i];
            try {
                updateCheckoutProgress(i + 1, selectedBooks.length, `Checking book #${book.bookId}...`);

                // ✅ Check book status DIRECTLY from BookNFT (source of truth!)
                console.log(`🔍 Pre-checkout: Checking book #${book.bookId} status from BookNFT...`);
                const bookInfo = await bookNFTContract.getBookInfo(book.bookId);
                const statusNum = bookInfo[2];
                console.log(`  - BookNFT status: ${statusNum} (0=Available, 1=Borrowed)`);
                
                // If status is Borrowed (1), skip immediately
                if (statusNum === 1) {
                    console.log(`📚 Book #${book.bookId} is BORROWED - skipping`);
                    updateCheckoutProgress(i + 1, selectedBooks.length, `Skipped #${book.bookId} - already borrowed`);
                    skippedCount++;
                    
                    // Auto-remove from cart
                    try {
                        const tx = await userCartContract.removeFromCart(book.bookId);
                        await tx.wait();
                        console.log(`🗑️ Auto-removed book #${book.bookId} from cart`);
                    } catch (removeError) {
                        console.warn(`Failed to remove book #${book.bookId}:`, removeError.message);
                    }
                    continue;
                }
                
                // If status is not Available/New/Old, skip
                if (statusNum !== 0 && statusNum !== 5 && statusNum !== 6) {
                    console.log(`📚 Book #${book.bookId} status ${statusNum} - not available`);
                    updateCheckoutProgress(i + 1, selectedBooks.length, `Skipped #${book.bookId} - not available`);
                    skippedCount++;
                    continue;
                }

                updateCheckoutProgress(i + 1, selectedBooks.length, `Borrowing book #${book.bookId}...`);

                const depositWei = ethers.utils.parseEther(book.priceEth.toString());
                const contractWithSigner = libraryCoreContract.connect(signer);
                const tx = await contractWithSigner.borrowBook(book.bookId, { value: depositWei });
                
                console.log(`📤 Borrowing book #${book.bookId}, tx:`, tx.hash);
                await tx.wait();
                
                console.log(`✅ Borrowed book #${book.bookId}`);
                successCount++;

            } catch (error) {
                console.error(`❌ Failed to borrow book #${book.bookId}:`, error);
                
                let errorMsg = error.message;
                if (error.message.includes('Book already borrowed')) {
                    console.log(`📚 Book #${book.bookId} was borrowed during transaction (race condition)`);
                    errorMsg = 'Race condition - already borrowed';
                    skippedCount++;
                    
                    // Try to remove from cart (may fail if already removed)
                    try {
                        const tx = await userCartContract.removeFromCart(book.bookId);
                        await tx.wait();
                        console.log(`🗑️ Removed book #${book.bookId} from cart`);
                    } catch (removeError) {
                        // Ignore error - book may already be removed
                        console.log(`ℹ️ Book #${book.bookId} already removed from cart`);
                    }
                } else if (error.message.includes('Book not available')) {
                    errorMsg = 'Not available';
                    skippedCount++;
                } else if (error.message.includes('User must have active profile')) {
                    errorMsg = 'Profile required';
                    alert('❌ You need to create a profile before borrowing books. Please go to Account → Profile.');
                    break; // Stop checkout process
                }
                
                updateCheckoutProgress(i + 1, selectedBooks.length, `Failed #${book.bookId}: ${errorMsg}`);
            }
        }

        // Show result
        let resultMessage = '';
        if (successCount > 0 && skippedCount === 0) {
            resultMessage = `✅ Successfully borrowed ${successCount} book(s)!`;
        } else if (successCount > 0 && skippedCount > 0) {
            resultMessage = `✅ Borrowed ${successCount} book(s), skipped ${skippedCount} (already borrowed)`;
        } else if (skippedCount > 0) {
            resultMessage = `⚠️ All ${skippedCount} book(s) were already borrowed`;
        } else {
            resultMessage = `❌ Failed to borrow any books`;
        }
        
        showCheckoutResult(resultMessage);
        
        if (successCount === selectedBooks.length) {
            // Reload cart
            setTimeout(() => loadCartItems(), 2000);
        } else {
            showCheckoutResult(`⚠️ Borrowed ${successCount}/${selectedBooks.length} book(s). Check console for errors.`);
        }

    } catch (error) {
        console.error('❌ Checkout failed:', error);
        alert('Checkout failed: ' + error.message);
    }
};

/**
 * Show checkout progress modal
 */
function showCheckoutProgress(books, total) {
    const modal = document.createElement('div');
    modal.id = 'checkout-modal';
    modal.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; padding: 32px; border-radius: 12px; max-width: 500px; width: 90%;">
                <h2 style="margin: 0 0 16px 0;">Processing Checkout</h2>
                <p id="checkout-status">Starting...</p>
                <div style="background: #f0f0f0; height: 24px; border-radius: 12px; overflow: hidden; margin: 16px 0;">
                    <div id="checkout-progress" style="background: #667eea; height: 100%; width: 0%; transition: width 0.3s;"></div>
                </div>
                <p style="font-size: 14px; color: #666;">Borrowing ${books.length} book(s) for ${total.toFixed(4)} ETH</p>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

/**
 * Update checkout progress
 */
function updateCheckoutProgress(current, total, message) {
    const progress = (current / total) * 100;
    const progressBar = document.getElementById('checkout-progress');
    const statusText = document.getElementById('checkout-status');
    
    if (progressBar) progressBar.style.width = progress + '%';
    if (statusText) statusText.textContent = message;
}

/**
 * Show checkout result
 */
function showCheckoutResult(message) {
    const statusText = document.getElementById('checkout-status');
    if (statusText) statusText.textContent = message;
    
    setTimeout(() => {
        const modal = document.getElementById('checkout-modal');
        if (modal) modal.remove();
    }, 3000);
}

/**
 * Show error message
 */
function showError(message) {
    const cartItemsContainer = document.querySelector('.cart-items');
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = `
            <div class="cart-error">
                <i class='bx bx-error-circle'></i>
                <h3 style="margin: 0; font-size: 20px; color: #e53e3e;">Connection Error</h3>
                <p style="margin: 15px 0; font-size: 16px;">${message}</p>
                <div class="error-actions">
                    <button onclick="connectMetaMask()" class="error-btn primary">
                        <i class='bx bx-wallet'></i> Connect Wallet
                    </button>
                    <button onclick="location.reload()" class="error-btn secondary">
                        <i class='bx bx-refresh'></i> Refresh Page
                    </button>
                </div>
                <p style="margin-top: 20px; font-size: 13px; color: #888; line-height: 1.4;">
                    <i class='bx bx-info-circle' style="margin-right: 4px;"></i>
                    Make sure MetaMask is installed and connected to Hardhat Local (Chain ID: 31337)
                </p>
            </div>
        `;
    }
}

function showLoading() {
    const cartItemsContainer = document.querySelector('.cart-items');
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = `
            <div class="cart-loading">
                <i class='bx bx-loader-alt bx-spin' style="font-size: 64px; color: #667eea;"></i>
                <h3 style="margin: 20px 0 10px 0; font-size: 18px; color: #333;">Loading your cart</h3>
                <p style="margin: 0; font-size: 14px; color: #666;">
                    Connecting to blockchain and fetching your items...
                </p>
                <div style="margin-top: 20px; width: 200px; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden; margin-left: auto; margin-right: auto;">
                    <div style="width: 100%; height: 100%; background: linear-gradient(90deg, #667eea, #764ba2); animation: loading-bar 2s infinite;"></div>
                </div>
            </div>
            <style>
                @keyframes loading-bar {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
            </style>
        `;
    }
}

/**
 * Listen for wallet changes
 */
if (window.ethereum) {
    window.ethereum.on('accountsChanged', async () => {
        console.log('🔄 Wallet changed, reloading cart...');
        await loadCartItems();
    });
}

// Initialize on page load with proper timing
function initCartPage() {
    // Check if we're on cart page
    const isCartPage = window.location.pathname === '/cart';
    if (!isCartPage) return;
    
    console.log('🛒 Initializing cart page...');
    
    // Show loading initially
    showLoading();
    
    // Check wallet state with retry logic
    function checkWalletAndLoad(attempt = 1) {
        console.log(`🔍 Checking wallet state (attempt ${attempt})...`);
        
        if (window.walletState && window.walletState.isConnected) {
            console.log('🛒 Wallet connected, loading cart...');
            loadCartItems();
        } else if (attempt < 5) {
            // Retry up to 5 times with increasing delay
            console.log(`🔄 Wallet not ready, retrying in ${attempt * 500}ms...`);
            setTimeout(() => checkWalletAndLoad(attempt + 1), attempt * 500);
        } else {
            // After 5 attempts, show connect message
            console.log('🛒 Wallet not connected after retries, showing connect message...');
            showError('Please connect your MetaMask wallet to view cart');
        }
    }
    
    // Start checking
    checkWalletAndLoad();
    
    // Also listen for wallet connection events
    document.addEventListener('walletConnected', () => {
        console.log('🛒 Wallet connected event received, loading cart...');
        loadCartItems();
    });
}

// Initialize with proper timing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait for wallet.js to initialize
        setTimeout(initCartPage, 1000);
    });
} else {
    setTimeout(initCartPage, 1000);
}

// Listen for wallet connection to update cart badge
document.addEventListener('walletConnected', async () => {
    console.log('🛒 Wallet connected event in cart-v3, updating badge...');
    if (typeof updateCartBadgeBlockchain === 'function') {
        await updateCartBadgeBlockchain();
    }
});

// Listen for account changes to update cart badge
if (window.ethereum) {
    window.ethereum.on('accountsChanged', async () => {
        console.log('🔄 Account changed in cart-v3, updating badge and reloading cart...');
        if (typeof updateCartBadgeBlockchain === 'function') {
            await updateCartBadgeBlockchain();
        }
        // Reload cart for new account
        const isCartPage = window.location.pathname === '/cart';
        if (isCartPage) {
            setTimeout(() => loadCartItems(), 1000);
        }
    });
}

// Export for other files
window.loadCartItems = loadCartItems;
window.updateCartTotals = updateCartTotals;



