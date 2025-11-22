// ========================================
// ADMIN CATEGORY - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Load books by category from blockchain
 */
async function loadBooksByCategory() {
    try {
        // Require wallet connection for admin actions
        if (!window.walletState || !window.walletState.isConnected) {
            console.warn('⚠️ Wallet not connected for admin category view');
            showCategoryConnectPrompt();
            return;
        }
        
        await initBlockchainContracts();
        
        const allBooks = await loadBooksFromBlockchain();
        
        // Group books by status (we can use status as "category" for now)
        const categories = {
            available: allBooks.filter(b => b.status === 0),
            borrowed: allBooks.filter(b => b.status === 1),
            damaged: allBooks.filter(b => b.status === 2),  // ✅ FIXED: Contract uses "Damaged", not "pending"
            lost: allBooks.filter(b => b.status === 3)
        };
        
        renderCategoryTable(categories, allBooks);
        
    } catch (error) {
        console.error('Failed to load books by category:', error);
        displayCategoryError();
    }
}

function getCategoryRoot() {
    return document.getElementById('categoryRoot') || document.querySelector('.main-content');
}

/**
 * Render category table
 */
function renderCategoryTable(categories, allBooks) {
    const mainContent = getCategoryRoot();
    if (!mainContent) return;
    mainContent.dataset.currentView = 'category';
    
    mainContent.innerHTML = `
        <div class="category-management" style="padding: 30px;">
            <h2 style="margin-bottom: 24px; color: #333;">📁 Book Categories (by Status)</h2>
            
            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${categories.available.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">✅ Available</p>
                </div>
                <div style="background: linear-gradient(135deg, #FF9800 0%, #f57c00 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${categories.borrowed.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">📚 Borrowed</p>
                </div>
                <div style="background: linear-gradient(135deg, #2196F3 0%, #1976d2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${categories.damaged.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">⚠️ Damaged</p>
                </div>
                <div style="background: linear-gradient(135deg, #F44336 0%, #d32f2f 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${categories.lost.length}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">❌ Lost</p>
                </div>
            </div>
            
            <!-- Filter Buttons -->
            <div style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
                <button onclick="filterCategory('all')" class="filter-btn active" data-filter="all" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    All (${allBooks.length})
                </button>
                <button onclick="filterCategory('available')" class="filter-btn" data-filter="available" style="padding: 8px 16px; background: white; color: #4CAF50; border: 2px solid #4CAF50; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Available (${categories.available.length})
                </button>
                <button onclick="filterCategory('borrowed')" class="filter-btn" data-filter="borrowed" style="padding: 8px 16px; background: white; color: #FF9800; border: 2px solid #FF9800; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Borrowed (${categories.borrowed.length})
                </button>
                <button onclick="filterCategory('damaged')" class="filter-btn" data-filter="damaged" style="padding: 8px 16px; background: white; color: #FF5722; border: 2px solid #FF5722; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Damaged (${categories.damaged.length})
                </button>
                <button onclick="filterCategory('lost')" class="filter-btn" data-filter="lost" style="padding: 8px 16px; background: white; color: #F44336; border: 2px solid #F44336; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Lost (${categories.lost.length})
                </button>
            </div>
            
            <!-- Books Table -->
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <h3 style="margin: 0 0 20px 0; color: #333;">📚 Books List</h3>
                <button onclick="loadBooksByCategory()" style="margin-bottom: 16px; padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    🔄 Refresh
                </button>
                <div id="categoryBooksTable">
                    ${renderBooksTable(allBooks)}
                </div>
            </div>
        </div>
    `;
    
    // Store books data globally for filtering
    window.allCategoryBooks = allBooks;
}

/**
 * Render books table
 */
function renderBooksTable(books) {
    if (books.length === 0) {
        return '<p style="color: #666; text-align: center; padding: 40px;">No books in this category</p>';
    }
    
    let tableHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">ID</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Name</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Condition</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Price</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Owner</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    books.forEach(book => {
        const statusColor = {
            0: '#4CAF50',
            1: '#FF9800',
            2: '#2196F3',
            3: '#F44336'
        }[book.status] || '#666';
        
        tableHTML += `
            <tr class="book-row" data-status="${book.status}" style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px;"><strong>#${book.id}</strong></td>
                <td style="padding: 12px;">${book.name}</td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
                        ${getStatusName(book.status)}
                    </span>
                </td>
                <td style="padding: 12px;">${getConditionName(book.condition)}</td>
                <td style="padding: 12px;"><strong>${(Number(book.priceEth) || 0).toFixed(2)} ETH</strong></td>
                <td style="padding: 12px;"><code style="font-size: 11px; color: #666;">${book.owner.slice(0, 8)}...${book.owner.slice(-4)}</code></td>
            </tr>
        `;
    });
    
    tableHTML += `
                </tbody>
            </table>
        </div>
    `;
    
    return tableHTML;
}

/**
 * Filter books by category
 */
function filterCategory(filter) {
    if (!window.allCategoryBooks) return;
    
    let filteredBooks;
    if (filter === 'all') {
        filteredBooks = window.allCategoryBooks;
    } else {
        const statusMap = {
            'available': 0,
            'borrowed': 1,
            'damaged': 2,  // ✅ FIXED: Contract uses "Damaged"
            'lost': 3
        };
        filteredBooks = window.allCategoryBooks.filter(b => b.status === statusMap[filter]);
    }
    
    // Update table
    const tableContainer = document.getElementById('categoryBooksTable');
    if (tableContainer) {
        tableContainer.innerHTML = renderBooksTable(filteredBooks);
    }
    
    // Update active button
    document.querySelectorAll('.filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.style.background = '#667eea';
            btn.style.color = 'white';
            btn.style.border = '2px solid #667eea';
            btn.classList.add('active');
        } else {
            const color = {
                'available': '#4CAF50',
                'borrowed': '#FF9800',
                'damaged': '#FF5722',  // ✅ FIXED: Deep Orange for Damaged
                'lost': '#F44336'
            }[btn.dataset.filter] || '#667eea';
            btn.style.background = 'white';
            btn.style.color = color;
            btn.style.border = `2px solid ${color}`;
            btn.classList.remove('active');
        }
    });
}

/**
 * Display category error
 */
function displayCategoryError() {
    const mainContent = getCategoryRoot();
    if (mainContent) {
        mainContent.dataset.currentView = 'category';
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <i class='bx bx-error-circle' style="font-size: 64px; color: #f44336;"></i>
                <h3 style="margin-top: 16px; font-weight: 400;">Failed to load categories</h3>
                <p style="margin-top: 8px; font-size: 14px;">Please ensure blockchain is running and contracts are deployed</p>
                <button onclick="loadBooksByCategory()" style="margin-top: 20px; padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Retry
                </button>
            </div>
        `;
    }
}

function initAdminCategoryPage() {
    loadBooksByCategory();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/admin/category') {
        initAdminCategoryPage();
    }
});

/**
 * Show prompt asking admin to connect wallet
 */
function showCategoryConnectPrompt() {
    const mainContent = getCategoryRoot();
    if (!mainContent) return;
    mainContent.dataset.currentView = 'category';
    mainContent.innerHTML = `
        <div style="padding: 60px; text-align: center; color: #444;">
            <i class='bx bx-wallet' style="font-size: 72px; color: #667eea;"></i>
            <h3 style="margin-top: 16px;">Connect wallet to manage books</h3>
            <p style="margin-top: 8px; font-size: 14px;">
                Admin actions require the contract owner wallet. Click the button below to connect MetaMask,
                then Edge may prompt to allow storage for cdn.jsdelivr.net (Tracking Prevention).
            </p>
            <button onclick="connectMetaMask()" style="margin-top: 20px; padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                🔐 Connect MetaMask
            </button>
        </div>
    `;
}

// Auto reload category view when wallet connects
window.addEventListener('walletConnected', () => {
    const mainContent = getCategoryRoot();
    if (mainContent && mainContent.dataset.currentView === 'category') {
        loadBooksByCategory();
    }
});

