// ========================================
// BOOK DETAIL PAGE - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Load book detail from blockchain by ID
 */
async function loadBookDetail() {
    try {
        // Get book ID from URL or default to 0
        const urlParams = new URLSearchParams(window.location.search);
        const bookId = parseInt(urlParams.get('id') || '0');
        
        console.log('📖 Loading book detail for ID:', bookId);
        
        // Wait for contracts
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.bookNFTContract) {
            console.error('Contracts not loaded');
            displayBookError('Blockchain not connected. Please refresh page.');
            return;
        }
        
        // Get book info
        const bookInfo = await window.blockchainBooks.bookNFTContract.getBookInfo(bookId);
        const owner = await window.blockchainBooks.bookNFTContract.ownerOf(bookId);
        const status = Number(bookInfo.status);
        const condition = Number(bookInfo.condition);
        
        // Calculate price (example: 0.01 ETH per book)
        const priceEth = (bookId + 1) * 0.01;
        
        // Render book detail
        renderBookDetail({
            id: bookId,
            name: bookInfo.name || `Book #${bookId}`,
            description: bookInfo.description || 'No description available',
            author: extractAuthor(bookInfo.description),
            status: status,
            statusName: getStatusName(status),
            condition: condition,
            conditionName: getConditionName(condition),
            priceEth: priceEth,
            owner: owner,
            imageHash: bookInfo.imageBeforeHash || ''
        });
        
        // Load related books
        loadRelatedBooks(bookId);
        
    } catch (error) {
        console.error('Failed to load book detail:', error);
        displayBookError('Book not found or error loading from blockchain');
    }
}

/**
 * Extract author from description (if format: "... | Author: Name")
 */
function extractAuthor(description) {
    const match = description.match(/\|\s*Author:\s*(.+)/i);
    return match ? match[1].trim() : 'Unknown Author';
}

/**
 * Render book detail
 */
function renderBookDetail(book) {
    // Determine book status logic
    const status = Number(book.status);
    const condition = Number(book.condition);
    
    const isAvailable = status === 0;
    const isBorrowed = status === 1;
    const isDamaged = status === 2;  // ✅ FIXED: Contract uses "Damaged", not "Reserved"
    const isLost = status === 3;
    
    // Update book image (placeholder for now)
    const bookImg = document.querySelector('.layout .content > img');
    if (bookImg) {
        bookImg.alt = book.name;
        // Add status overlay
        if (!isAvailable) {
            bookImg.style.filter = 'grayscale(50%)';
            bookImg.style.opacity = '0.7';
        }
    }
    
    // Update book name
    const bookNameEl = document.querySelector('.ten p');
    if (bookNameEl) {
        bookNameEl.textContent = book.name;
    }
    
    // Update condition with enhanced display
    const conditionEl = document.querySelector('.condition p');
    if (conditionEl) {
        const conditionPercent = getConditionPercent(book.condition);
        const conditionColors = {0: '#4CAF50', 1: '#2196F3', 2: '#FF9800', 3: '#F44336'};
        const conditionColor = conditionColors[condition] || '#666';
        
        conditionEl.innerHTML = `
            📖 Book Condition: 
            <b style="color: ${conditionColor};">${book.conditionName}</b> 
            (<span id="selected-option">${conditionPercent}</span>)
        `;
    }
    
    // Update status with comprehensive info
    const statusEl = document.querySelector('.status p');
    if (statusEl) {
        const statusColors = {0: '#4CAF50', 1: '#FF9800', 2: '#FF5722', 3: '#F44336'};  // ✅ Fixed: 2=Damaged
        const statusIcons = {0: '✅', 1: '📗', 2: '⚠️', 3: '❌'};  // ✅ Fixed: 2=Damaged icon
        const statusColor = statusColors[status] || '#666';
        const statusIcon = statusIcons[status] || '⚠️';
        
        let statusMessage = '';
        if (isAvailable) {
            statusMessage = '<span style="color: #4CAF50; font-weight: 600;">✅ Available for borrowing</span>';
        } else if (isBorrowed) {
            statusMessage = '<span style="color: #FF9800; font-weight: 600;">📗 Currently borrowed by another user</span>';
        } else if (isDamaged) {
            statusMessage = '<span style="color: #FF5722; font-weight: 600;">⚠️ Damaged - Cannot borrow at this time</span>';
        } else if (isLost) {
            statusMessage = '<span style="color: #F44336; font-weight: 600;">❌ Lost - Admin management required</span>';
        }
        
        statusEl.innerHTML = `
            📍 Status: <b style="color: ${statusColor};">${statusIcon} ${book.statusName}</b>
            <br><small style="font-size: 12px;">${statusMessage}</small>
        `;
    }
    
    // Update author
    const authorEl = document.querySelector('.author p');
    if (authorEl) {
        authorEl.textContent = `Author: ${book.author}`;
    }
    
    // Update description
    const descEl = document.querySelector('.intro-content');
    if (descEl) {
        descEl.textContent = book.description.replace(/\|.*$/, '').trim(); // Remove author part
    }
    
    // Update price
    const priceEl = document.querySelector('.price-1 p');
    if (priceEl) {
        priceEl.innerHTML = `
            ${book.priceEth.toFixed(4)} ETH
            <small style="display: block; font-size: 11px; color: #888; margin-top: 4px;">
                Deposit Required • ≈ $${book.priceUsd} USD
            </small>
        `;
    }
    
    // Update "Borrow Now" button with smart logic
    const borrowBtn = document.querySelector('.buy-now-btn');
    if (borrowBtn) {
        if (isAvailable) {
            borrowBtn.textContent = '📚 Borrow Now';
            borrowBtn.disabled = false;
            borrowBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            borrowBtn.style.color = 'white';
            borrowBtn.style.opacity = '1';
            borrowBtn.style.cursor = 'pointer';
            borrowBtn.onclick = async () => {
                await borrowBook(book.id, book.priceEth);
            };
        } else if (isBorrowed) {
            borrowBtn.textContent = '📗 Currently Borrowed';
            borrowBtn.disabled = true;
            borrowBtn.style.background = '#FF9800';
            borrowBtn.style.color = 'white';
            borrowBtn.style.opacity = '0.7';
            borrowBtn.style.cursor = 'not-allowed';
            borrowBtn.onclick = null;
        } else if (isDamaged) {
            borrowBtn.textContent = '⚠️ Damaged';
            borrowBtn.disabled = true;
            borrowBtn.style.background = '#FF5722';
            borrowBtn.style.color = 'white';
            borrowBtn.style.opacity = '0.7';
            borrowBtn.style.cursor = 'not-allowed';
            borrowBtn.onclick = null;
        } else if (isLost) {
            borrowBtn.textContent = '❌ Lost - Admin Only';
            borrowBtn.disabled = true;
            borrowBtn.style.background = '#F44336';
            borrowBtn.style.color = 'white';
            borrowBtn.style.opacity = '0.7';
            borrowBtn.style.cursor = 'not-allowed';
            borrowBtn.onclick = null;
        }
    }
    
    // Update "Add to Cart" button
    const cartBtn = document.querySelector('.cart-btn');
    if (cartBtn) {
        if (isAvailable) {
            cartBtn.disabled = false;
            cartBtn.style.opacity = '1';
            cartBtn.style.cursor = 'pointer';
            cartBtn.onclick = () => {
                addToCartFromDetail(book);
            };
        } else {
            cartBtn.disabled = true;
            cartBtn.style.opacity = '0.5';
            cartBtn.style.cursor = 'not-allowed';
            cartBtn.onclick = () => {
                alert(`❌ Cannot add to cart!\n\nThis book is "${book.statusName}".\nOnly Available books can be borrowed.`);
            };
        }
    }
    
    // Add book info to page for debugging
    console.log('✅ Book detail rendered:', {
        id: book.id,
        name: book.name,
        status: `${status} (${book.statusName})`,
        condition: `${condition} (${book.conditionName})`,
        canBorrow: isAvailable
    });
}

/**
 * Get condition percentage range
 */
function getConditionPercent(condition) {
    const ranges = {
        0: '95-100%',  // New
        1: '80-95%',   // Good
        2: '60-80%',   // Fair
        3: '20-60%'    // Poor
    };
    return ranges[condition] || '0-20%';
}

/**
 * Borrow book function
 */
async function borrowBook(bookId, priceEth) {
    try {
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect MetaMask first!');
            await connectMetaMask();
            if (!window.walletState.isConnected) return;
        }
        
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            alert('Library contract not loaded. Please refresh.');
            return;
        }
        
        const depositAmount = ethers.utils.parseEther(priceEth.toFixed(18));
        
        alert(`⏳ Borrowing book #${bookId}. Deposit: ${priceEth.toFixed(2)} ETH. Please confirm in MetaMask...`);
        
        const libraryCoreWithSigner = window.blockchainBooks.libraryCoreContract.connect(window.walletState.signer);
        const tx = await libraryCoreWithSigner.borrowBook(bookId, { value: depositAmount });
        
        console.log('⏳ Transaction sent:', tx.hash);
        alert('⏳ Transaction sent! Waiting for confirmation...');
        
        const receipt = await tx.wait();
        console.log('✅ Book borrowed successfully:', receipt);
        
        alert(`✅ Success! You borrowed book #${bookId}. Transaction: ${receipt.transactionHash.slice(0, 10)}...`);
        
        // Reload page to update status
        setTimeout(() => {
            window.location.reload();
        }, 2000);
        
    } catch (error) {
        console.error('Borrow failed:', error);
        
        let errorMsg = 'Failed to borrow book';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.reason) {
            errorMsg = error.reason;
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        alert('❌ ' + errorMsg);
    }
}

/**
 * Add book to cart from detail page
 */
function addToCartFromDetail(book) {
    let cart = [];
    try {
        cart = JSON.parse(localStorage.getItem('cart')) || [];
    } catch (e) {
        console.warn('localStorage not available:', e);
        cart = [];
    }
    const existingItem = cart.find(item => item.id === book.id);
    
    if (existingItem) {
        // Get quantity from input
        const quantityInput = document.querySelector('.quantity-selector .val');
        const quantity = parseInt(quantityInput?.value || 1);
        existingItem.quantity += quantity;
    } else {
        const quantityInput = document.querySelector('.quantity-selector .val');
        const quantity = parseInt(quantityInput?.value || 1);
        cart.push({ 
            id: book.id, 
            name: book.name, 
            priceEth: book.priceEth, 
            quantity: quantity 
        });
    }
    
    try {
        localStorage.setItem('cart', JSON.stringify(cart));
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
    alert(`✅ ${book.name} added to cart!`);
    updateCartBadge();
}

/**
 * Load related books (similar books)
 */
async function loadRelatedBooks(currentBookId) {
    try {
        const books = await loadBooksFromBlockchain();
        const relatedBooks = books.filter(b => b.id !== currentBookId).slice(0, 3);
        
        const viewMoreContainer = document.querySelector('.view-more .book');
        if (!viewMoreContainer) return;
        
        viewMoreContainer.innerHTML = '';
        
        relatedBooks.forEach(book => {
            const bookCard = document.createElement('div');
            bookCard.className = 'sach1';
            bookCard.innerHTML = `
                <a href="/book?id=${book.id}">
                    <div class="biasach" style="background-image: url('/static/model/muado.jpg');"></div>
                </a>
                <div class="tensach">
                    <p>${book.name}</p>
                </div>
                <div class="price-2">
                    <p>${book.priceEth.toFixed(2)} ETH</p>
                    <button onclick="addToCart(${book.id}, '${book.name}', ${book.priceEth})">Add to Cart</button>
                </div>
            `;
            viewMoreContainer.appendChild(bookCard);
        });
        
    } catch (error) {
        console.error('Failed to load related books:', error);
    }
}

/**
 * Display error message
 */
function displayBookError(message) {
    const contentDiv = document.querySelector('.layout .content-book');
    if (contentDiv) {
        contentDiv.innerHTML = `
            <div style="padding: 40px; text-align: center;">
                <i class='bx bx-error-circle' style="font-size: 64px; color: #f44336;"></i>
                <h3 style="margin-top: 16px; color: #333;">${message}</h3>
                <button onclick="window.location.href='/home'" style="margin-top: 16px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer;">
                    Back to Home
                </button>
            </div>
        `;
    }
}

// Auto-load book detail when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on book detail page
    if (window.location.pathname.includes('/book')) {
        console.log('📖 Book detail page detected, loading from blockchain...');
        await loadBookDetail();
    }
});

