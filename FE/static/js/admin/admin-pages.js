// ========================================
// ADMIN PAGES - BLOCKCHAIN INTEGRATION
// ========================================
// This file handles Category and Invoice pages - 100% blockchain

/**
 * Load Category page from blockchain
 * Replaces hardcoded FE content with blockchain data
 */
async function loadCategoryFromBlockchain() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    // Show loading
    mainContent.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <i class='bx bx-loader-alt bx-spin' style="font-size: 48px; color: #667eea;"></i>
            <p style="margin-top: 16px; color: #666;">Loading books from blockchain...</p>
        </div>
    `;
    
    try {
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.bookNFTContract) {
            mainContent.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #f44336;">
                    <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                    <p style="margin-top: 16px;">Blockchain not connected. Please refresh page.</p>
                </div>
            `;
            return;
        }
        
        // Load books from blockchain
        const allBooks = await loadBooksFromBlockchain();
        
        // Group by status
        const categories = {
            available: allBooks.filter(b => b.status === 0 || b.status === 5), // Available or New
            borrowed: allBooks.filter(b => b.status === 1),
            damaged: allBooks.filter(b => b.status === 2),
            lost: allBooks.filter(b => b.status === 3),
            old: allBooks.filter(b => b.status === 4)
        };
        
        // Render category page
        renderCategoryPage(allBooks, categories);
        
    } catch (error) {
        console.error('Failed to load category from blockchain:', error);
        mainContent.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #f44336;">
                <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                <p style="margin-top: 16px;">Failed to load books: ${error.message}</p>
                <button onclick="loadCategoryFromBlockchain()" style="margin-top: 16px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Render category page with blockchain data
 */
function renderCategoryPage(allBooks, categories) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="category-container" style="padding: 30px;">
            <div class="category-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 class="category-title" style="margin: 0;">BOOK CATEGORY</h2>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button onclick="loadCategoryFromBlockchain()" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Refresh
                    </button>
                    <div class="search-bar" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px;">
                        <input type="text" id="category-search" placeholder="Search books..." style="border: none; outline: none; flex: 1;">
                        <i class='bx bx-search' style="color: #666;"></i>
                    </div>
                </div>
            </div>
            
            <!-- Statistics Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 24px;">
                <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);">
                    <h3 style="margin: 0; font-size: 32px;">${categories.available.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">✅ Available</p>
                </div>
                <div style="background: linear-gradient(135deg, #FF9800 0%, #f57c00 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);">
                    <h3 style="margin: 0; font-size: 32px;">${categories.borrowed.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">📚 Borrowed</p>
                </div>
                <div style="background: linear-gradient(135deg, #F44336 0%, #d32f2f 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);">
                    <h3 style="margin: 0; font-size: 32px;">${categories.lost.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">❌ Lost</p>
                </div>
                <div style="background: linear-gradient(135deg, #2196F3 0%, #1976d2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);">
                    <h3 style="margin: 0; font-size: 32px;">${allBooks.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">📖 Total</p>
                </div>
            </div>
            
            <!-- Filter Buttons -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
                <button onclick="filterCategoryBooks('all')" class="cat-filter-btn active" data-filter="all" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    All (${allBooks.length})
                </button>
                <button onclick="filterCategoryBooks('available')" class="cat-filter-btn" data-filter="available" style="padding: 8px 16px; background: white; color: #4CAF50; border: 2px solid #4CAF50; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Available (${categories.available.length})
                </button>
                <button onclick="filterCategoryBooks('borrowed')" class="cat-filter-btn" data-filter="borrowed" style="padding: 8px 16px; background: white; color: #FF9800; border: 2px solid #FF9800; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Borrowed (${categories.borrowed.length})
                </button>
                <button onclick="filterCategoryBooks('damaged')" class="cat-filter-btn" data-filter="damaged" style="padding: 8px 16px; background: white; color: #F44336; border: 2px solid #F44336; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Damaged (${categories.damaged.length})
                </button>
                <button onclick="filterCategoryBooks('lost')" class="cat-filter-btn" data-filter="lost" style="padding: 8px 16px; background: white; color: #F44336; border: 2px solid #F44336; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Lost (${categories.lost.length})
                </button>
            </div>
            
            <!-- Books Table -->
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
                <table class="category-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">STT</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">ID sách</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Tên sách</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Hình ảnh</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Thành tiền (ETH)</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Condition</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Actions</th>
                        </tr>
                    </thead>
                    <tbody id="category-books-tbody">
                        ${renderCategoryBooksTable(allBooks)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Store books globally for filtering
    window.categoryBooksData = {
        all: allBooks,
        categories: categories
    };
    
    // Add search functionality
    const searchInput = document.getElementById('category-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = allBooks.filter(book => 
                book.name.toLowerCase().includes(query) ||
                book.description.toLowerCase().includes(query)
            );
            document.getElementById('category-books-tbody').innerHTML = renderCategoryBooksTable(filtered);
        });
    }
}

/**
 * Render category books table rows
 */
function renderCategoryBooksTable(books) {
    if (books.length === 0) {
        return '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #666;">No books found</td></tr>';
    }
    
    return books.map((book, index) => {
        const statusColor = {
            0: '#4CAF50',  // Available
            1: '#FF9800',  // Borrowed
            2: '#F44336',  // Damaged
            3: '#F44336',  // Lost
            4: '#9E9E9E',  // Old
            5: '#2196F3'   // New
        }[book.status] || '#666';
        
        return `
            <tr class="category-book-row" data-book-id="${book.id}" data-status="${book.status}" style="border-bottom: 1px solid #e0e0e0; cursor: pointer;" onclick="editBookFromCategory(${book.id})">
                <td style="padding: 12px;">${index + 1}</td>
                <td style="padding: 12px;"><strong>#${book.id}</strong></td>
                <td style="padding: 12px;">${book.name}</td>
                <td style="padding: 12px;">
                    <img src="/model_images/muado.jpg" alt="${book.name}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px;">
                </td>
                <td style="padding: 12px;"><strong>${(Number(book.priceEth) || 0).toFixed(2)} ETH</strong></td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
                        ${getStatusName(book.status)}
                    </span>
                </td>
                <td style="padding: 12px;">${getConditionName(book.condition)}</td>
                <td style="padding: 12px;">
                    <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                        <button type="button"
                            style="padding: 6px 12px; border: none; border-radius: 6px; background: #667eea; color: white; font-size: 12px; cursor: pointer; font-weight: 600;"
                            onclick="event.stopPropagation(); editBookFromCategory(${book.id});">
                            ✏️ Edit Info
                        </button>
                        <button type="button"
                            style="padding: 6px 12px; border: none; border-radius: 6px; background: #4CAF50; color: white; font-size: 12px; cursor: pointer; font-weight: 600;"
                            onclick="event.stopPropagation(); adminUpdateBookStatus(${book.id}, '${book.name.replace(/'/g, "\\'")}');">
                            ♻️ Status
                        </button>
                        <button type="button"
                            style="padding: 6px 12px; border: none; border-radius: 6px; background: #2196F3; color: white; font-size: 12px; cursor: pointer; font-weight: 600;"
                            onclick="event.stopPropagation(); adminUpdateBookCondition(${book.id}, '${book.name.replace(/'/g, "\\'")}');">
                            📘 Condition
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filter category books
 */
function filterCategoryBooks(filter) {
    if (!window.categoryBooksData) return;
    
    let filteredBooks;
    if (filter === 'all') {
        filteredBooks = window.categoryBooksData.all;
    } else {
        filteredBooks = window.categoryBooksData.categories[filter] || [];
    }
    
    document.getElementById('category-books-tbody').innerHTML = renderCategoryBooksTable(filteredBooks);
    
    // Update active button
    document.querySelectorAll('.cat-filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.style.background = '#667eea';
            btn.style.color = 'white';
            btn.classList.add('active');
        } else {
            btn.style.background = 'white';
            const color = btn.style.borderColor || '#667eea';
            btn.style.color = color;
            btn.classList.remove('active');
        }
    });
}

/**
 * Edit book from category table
 */
async function editBookFromCategory(bookId) {
    // Load and show edit modal
    if (typeof loadBookForEdit === 'function') {
        await loadBookForEdit(bookId);
    } else {
        // Fallback: redirect to admin with params
        window.location.href = `/admin?book_id=${bookId}`;
    }
}

/**
 * Load Invoice page from blockchain
 */
async function loadInvoiceFromBlockchain() {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    // Show loading
    mainContent.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <i class='bx bx-loader-alt bx-spin' style="font-size: 48px; color: #667eea;"></i>
            <p style="margin-top: 16px; color: #666;">Loading transactions from blockchain...</p>
        </div>
    `;
    
    try {
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            mainContent.innerHTML = `
                <div style="padding: 40px; text-align: center; color: #f44336;">
                    <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                    <p style="margin-top: 16px;">Blockchain contracts not loaded. Please refresh page.</p>
                </div>
            `;
            return;
        }
        
        // Load transactions from blockchain
        // Use existing function if available
        if (typeof loadBlockchainInvoices === 'function') {
            await loadBlockchainInvoices();
        } else {
            // Fallback: render invoice table manually
            const allBooks = await loadBooksFromBlockchain();
            const invoices = [];
            
            for (const book of allBooks) {
                if (book.status === 1) { // Borrowed
                    try {
                        const loanInfo = await window.blockchainBooks.libraryCoreContract.loanInfos(book.id);
                        invoices.push({
                            bookId: book.id,
                            bookName: book.name,
                            borrower: loanInfo.borrower || loanInfo[0],
                            borrowedAt: new Date(Number(loanInfo.borrowedAt || loanInfo[1]) * 1000),
                            dueDate: new Date(Number(loanInfo.dueDate || loanInfo[2]) * 1000),
                            deposit: ethers.utils.formatEther(loanInfo.deposit || loanInfo[3] || 0),
                            isReturned: loanInfo.isReturned || loanInfo[4] || false
                        });
                    } catch (error) {
                        console.warn(`Failed to get loan info for book ${book.id}:`, error);
                    }
                }
            }
            
            renderInvoicePage(invoices);
        }
        
    } catch (error) {
        console.error('Failed to load invoice from blockchain:', error);
        mainContent.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #f44336;">
                <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                <p style="margin-top: 16px;">Failed to load transactions: ${error.message}</p>
                <button onclick="loadInvoiceFromBlockchain()" style="margin-top: 16px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Render invoice page with blockchain data
 */
function renderInvoicePage(invoices) {
    const mainContent = document.querySelector('.main-content');
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="invoice-container" style="padding: 30px;">
            <div class="invoice-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 class="invoice-title" style="margin: 0;">INVOICE MANAGEMENT</h2>
                <button onclick="loadInvoiceFromBlockchain()" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Refresh
                </button>
            </div>
            
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
                <table class="invoice-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">STT</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Tên khách hàng</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Tên sách</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Hình ảnh</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Thành tiền (ETH)</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Borrowed Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Due Date</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${renderInvoiceTableRows(invoices)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * Render invoice table rows
 */
function renderInvoiceTableRows(invoices) {
    if (invoices.length === 0) {
        return '<tr><td colspan="8" style="padding: 40px; text-align: center; color: #666;">No transactions found</td></tr>';
    }
    
    return invoices.map((invoice, index) => {
        const isOverdue = new Date() > invoice.dueDate && !invoice.isReturned;
        const statusClass = invoice.isReturned ? 'dung-han' : (isOverdue ? 'tra-muon' : 'chua-tra');
        const statusText = invoice.isReturned ? 'Returned' : (isOverdue ? 'Overdue' : 'Active');
        const statusColor = invoice.isReturned ? '#4CAF50' : (isOverdue ? '#F44336' : '#FF9800');
        
        return `
            <tr data-status="${statusClass}" style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px;">${index + 1}</td>
                <td style="padding: 12px;"><code style="font-size: 11px; color: #666;">${invoice.borrower.slice(0, 8)}...${invoice.borrower.slice(-4)}</code></td>
                <td style="padding: 12px;"><strong>${invoice.bookName}</strong></td>
                <td style="padding: 12px;">
                    <img src="/model_images/muado.jpg" alt="${invoice.bookName}" style="width: 60px; height: 80px; object-fit: cover; border-radius: 4px;">
                </td>
                <td style="padding: 12px;"><strong>${(Number(invoice.deposit) || 0).toFixed(4)} ETH</strong></td>
                <td style="padding: 12px;">${invoice.borrowedAt.toLocaleDateString()}</td>
                <td style="padding: 12px;">${invoice.dueDate.toLocaleDateString()}</td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
                        ${statusText}
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

