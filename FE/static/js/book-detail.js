// ========================================
// BOOK DETAIL PAGE - BLOCKCHAIN INTEGRATION
// ========================================

// Use global DEFAULT_BOOK_IMAGE if it exists, otherwise define it
if (typeof window.DEFAULT_BOOK_IMAGE === 'undefined') {
    window.DEFAULT_BOOK_IMAGE = '/model_images/muado.jpg';
}
let currentBookDetail = null;

function resolveIpfsUrl(imageHash) {
    if (!imageHash) return window.DEFAULT_BOOK_IMAGE;
    const trimmed = imageHash.trim();
    if (!trimmed) return window.DEFAULT_BOOK_IMAGE;
    if (trimmed.startsWith('ipfs://')) {
        return `https://ipfs.io/ipfs/${trimmed.replace('ipfs://', '')}`;
    }
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    return `https://ipfs.io/ipfs/${trimmed}`;
}

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
        const imageBeforeHash = bookInfo.imageBeforeHash || bookInfo[5] || '';
        const imageAfterHash = bookInfo.imageAfterHash || bookInfo[6] || '';
        
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
            imageHash: imageBeforeHash,
            imageBeforeHash,
            imageAfterHash
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
    currentBookDetail = book;
    // Determine book status logic
    const status = Number(book.status);
    const condition = Number(book.condition);
    
    const isAvailable = status === 0 || status === 4 || status === 5;
    const isBorrowed = status === 1;
    const isDamaged = status === 2;  // ✅ FIXED: Contract uses "Damaged", not "Reserved"
    const isLost = status === 3;
    const isOld = status === 4;
    const isNewArrival = status === 5;
    const coverUrl = resolveIpfsUrl(book.imageAfterHash || book.imageBeforeHash || book.imageHash);
    
    // Update book image (placeholder for now)
    const bookImg = document.querySelector('.layout .content > img');
    if (bookImg) {
        bookImg.alt = book.name;
        bookImg.src = coverUrl;
        // Add status overlay
        if (!isAvailable) {
            bookImg.style.filter = 'grayscale(50%)';
            bookImg.style.opacity = '0.7';
        } else {
            bookImg.style.filter = '';
            bookImg.style.opacity = '1';
        }
        
        if (book.imageBeforeHash || book.imageAfterHash) {
            let imageMeta = document.querySelector('.image-hashes');
            if (!imageMeta) {
                imageMeta = document.createElement('div');
                imageMeta.className = 'image-hashes';
                imageMeta.style.marginTop = '8px';
                imageMeta.style.fontSize = '12px';
                imageMeta.style.color = '#0d47a1';
                bookImg.parentElement?.appendChild(imageMeta);
            }
            const beforeLink = book.imageBeforeHash ? `<a href="${resolveIpfsUrl(book.imageBeforeHash)}" target="_blank">📷 Before</a>` : '';
            const afterLink = book.imageAfterHash ? `<a href="${resolveIpfsUrl(book.imageAfterHash)}" target="_blank">✅ After</a>` : '';
            imageMeta.innerHTML = `
                <strong>Cover proof:</strong>
                <span style="display:inline-flex; gap:10px; margin-left:6px;">
                    ${beforeLink || '—'}
                    ${afterLink}
                </span>
            `;
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
        const statusColors = {
            0: '#4CAF50',
            1: '#FF9800',
            2: '#FF5722',
            3: '#F44336',
            4: '#8e44ad',
            5: '#00b894'
        };
        const statusIcons = {
            0: '✅',
            1: '📗',
            2: '⚠️',
            3: '❌',
            4: '📘',
            5: '🆕'
        };
        const statusColor = statusColors[status] || '#666';
        const statusIcon = statusIcons[status] || '⚠️';
        
        let statusMessage = '';
        if (isAvailable) {
            if (isNewArrival) {
                statusMessage = '<span style="color: #00b894; font-weight: 600;">🆕 New arrival – be the first to borrow!</span>';
            } else if (isOld) {
                statusMessage = '<span style="color: #8e44ad; font-weight: 600;">📘 Archived copy – vẫn có thể mượn bình thường.</span>';
            } else {
                statusMessage = '<span style="color: #4CAF50; font-weight: 600;">✅ Available for borrowing</span>';
            }
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

    loadReservationInfo(book.id, isBorrowed);
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

        if (typeof ensureProfileCompletion === 'function') {
            const ready = await ensureProfileCompletion({
                actionLabel: 'mượn sách',
                redirectUrl: '/account?active_tab=profile'
            });
            if (!ready) {
                return;
            }
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

async function loadReservationInfo(bookId, isBorrowed) {
    const panel = document.getElementById('reservationPanel');
    if (!panel) return;

    try {
        await initBlockchainContracts();
        const libraryCore = window.blockchainBooks?.libraryCoreContract;
        if (!libraryCore || typeof libraryCore.getBookReservations !== 'function') {
            panel.style.display = 'none';
            return;
        }

        let reservations = [];
        try {
            reservations = await libraryCore.getBookReservations(bookId);
        } catch (error) {
            console.warn('getBookReservations unavailable:', error);
        }

        let hasReserved = false;
        if (window.walletState?.address && typeof libraryCore.hasReserved === 'function') {
            try {
                hasReserved = await libraryCore.hasReserved(bookId, window.walletState.address);
            } catch (error) {
                console.warn('hasReserved check failed:', error);
            }
        }

        renderReservationPanel(bookId, {
            reservations: Array.isArray(reservations) ? reservations : [],
            hasReserved,
            isBorrowed
        });
    } catch (error) {
        console.error('Failed to load reservation info:', error);
    }
}

function renderReservationPanel(bookId, { reservations = [], hasReserved = false, isBorrowed = false }) {
    const panel = document.getElementById('reservationPanel');
    const listEl = document.getElementById('reservationList');
    const statusEl = document.getElementById('reservationStatusText');
    const actionBtn = document.getElementById('reserveActionButton');
    if (!panel || !listEl || !statusEl || !actionBtn) return;

    const currentUser = window.walletState?.address?.toLowerCase() || null;
    const maxPreview = 6;
    const visible = reservations.slice(0, maxPreview);

    panel.style.display = 'block';

    if (visible.length === 0) {
        listEl.innerHTML = '<li style="color:#94a3b8;">Chưa có ai đặt chỗ.</li>';
    } else {
        listEl.innerHTML = visible.map((addr, idx) => {
            const shortAddr = formatAddressShort(addr);
            const youBadge = currentUser && addr?.toLowerCase() === currentUser ? ' <span style="color:#0ea5e9;">(Bạn)</span>' : '';
            return `<li style="padding:4px 0; border-bottom:1px dashed #e2e8f0; font-family:monospace; font-size:12px;">
                ${idx + 1}. ${shortAddr}${youBadge}
            </li>`;
        }).join('');
        if (reservations.length > maxPreview) {
            listEl.innerHTML += `<li style="color:#94a3b8; font-size:12px;">... và ${reservations.length - maxPreview} người khác</li>`;
        }
    }

    if (!isBorrowed) {
        statusEl.textContent = '📗 Sách đang sẵn có, bạn có thể mượn ngay không cần xếp hàng.';
        actionBtn.style.display = 'none';
        return;
    }

    statusEl.textContent = reservations.length
        ? `📚 Hiện có ${reservations.length} người trong hàng chờ.`
        : '📚 Bạn sẽ là người đầu tiên trong hàng chờ.';

    actionBtn.style.display = 'block';
    if (hasReserved) {
        actionBtn.textContent = '✅ Bạn đã đăng ký chờ';
        actionBtn.disabled = true;
        actionBtn.style.opacity = '0.7';
        actionBtn.onclick = null;
    } else {
        actionBtn.textContent = '📌 Đặt chỗ cuốn sách này';
        actionBtn.disabled = false;
        actionBtn.style.opacity = '1';
        actionBtn.onclick = () => attemptReserve(bookId);
    }
}

async function attemptReserve(bookId) {
    try {
        if (!window.walletState || !window.walletState.isConnected) {
            await connectMetaMask();
            if (!window.walletState?.isConnected) return;
        }

        if (typeof ensureProfileCompletion === 'function') {
            const ok = await ensureProfileCompletion({
                actionLabel: 'đặt chỗ sách',
                redirectUrl: '/account?active_tab=profile'
            });
            if (!ok) return;
        }

        const bookName = currentBookDetail?.name || `Book #${bookId}`;
        await reserveBook(bookId, bookName);
        await loadReservationInfo(bookId, true);
    } catch (error) {
        console.error('Reserve action failed:', error);
    }
}

function formatAddressShort(address) {
    if (!address || address.length < 10) return address || '-';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Auto-load book detail when page loads
document.addEventListener('DOMContentLoaded', async () => {
    // Check if we're on book detail page
    if (window.location.pathname.includes('/book')) {
        console.log('📖 Book detail page detected, loading from blockchain...');
        await loadBookDetail();
    }
});

