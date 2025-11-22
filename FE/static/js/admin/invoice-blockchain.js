// ========================================
// ADMIN INVOICE - BLOCKCHAIN TRANSACTIONS
// ========================================

/**
 * Load all transactions from blockchain
 */
async function loadBlockchainInvoices() {
    try {
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract || !window.blockchainBooks.bookNFTContract) {
            displayInvoiceError('Contracts not loaded');
            return;
        }
        
        const allBooks = await loadBooksFromBlockchain();
        const invoices = [];
        
        // Get all borrowed/returned books with loan info
        for (const book of allBooks) {
            if (book.status === 1 || book.status === 4) { // Borrowed or Returned
                try {
                    const loanInfo = await window.blockchainBooks.libraryCoreContract.loanInfos(book.id);
                    const borrower = loanInfo.borrower || loanInfo[0];
                    const borrowedAt = new Date(Number(loanInfo.borrowedAt || loanInfo[1]) * 1000);
                    const dueDate = new Date(Number(loanInfo.dueDate || loanInfo[2]) * 1000);
                    const deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3] || 0);
                    const isReturned = loanInfo.isReturned || loanInfo[4] || false;
                    
                    const now = new Date();
                    let status;
                    if (isReturned) {
                        status = 'returned';
                    } else if (now > dueDate) {
                        status = 'overdue';
                    } else {
                        status = 'active';
                    }
                    
                    invoices.push({
                        bookId: book.id,
                        bookName: book.name,
                        borrower: borrower,
                        borrowedAt: borrowedAt,
                        dueDate: dueDate,
                        deposit: deposit,
                        isReturned: isReturned,
                        status: status,
                        priceEth: book.priceEth
                    });
                } catch (error) {
                    console.warn(`Failed to get loan info for book ${book.id}:`, error);
                }
            }
        }
        
        renderInvoicesTable(invoices);
        
    } catch (error) {
        console.error('Failed to load invoices:', error);
        displayInvoiceError('Error loading transactions from blockchain');
    }
}

/**
 * Render invoices table
 */
function getInvoiceRoot() {
    return document.getElementById('invoiceRoot') || document.querySelector('.main-content');
}

function renderInvoicesTable(invoices) {
    const mainContent = getInvoiceRoot();
    if (!mainContent) return;
    
    // Calculate stats
    const totalInvoices = invoices.length;
    const activeInvoices = invoices.filter(i => i.status === 'active').length;
    const overdueInvoices = invoices.filter(i => i.status === 'overdue').length;
    const returnedInvoices = invoices.filter(i => i.status === 'returned').length;
    
    mainContent.innerHTML = `
        <div class="invoice-management" style="padding: 30px;">
            <h2 style="margin-bottom: 24px; color: #333;">🧾 Invoice Management (Blockchain Transactions)</h2>
            
            <!-- Stats Cards -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${totalInvoices}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">📋 Total Transactions</p>
                </div>
                <div style="background: linear-gradient(135deg, #FF9800 0%, #f57c00 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${activeInvoices}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">✅ Active</p>
                </div>
                <div style="background: linear-gradient(135deg, #F44336 0%, #d32f2f 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${overdueInvoices}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">⚠️ Overdue</p>
                </div>
                <div style="background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${returnedInvoices}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">📚 Returned</p>
                </div>
            </div>
            
            <!-- Filter Buttons -->
            <div style="margin-bottom: 24px; display: flex; gap: 12px; flex-wrap: wrap;">
                <button onclick="filterInvoices('all')" class="invoice-filter-btn active" data-filter="all" style="padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    All (${totalInvoices})
                </button>
                <button onclick="filterInvoices('active')" class="invoice-filter-btn" data-filter="active" style="padding: 8px 16px; background: white; color: #FF9800; border: 2px solid #FF9800; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Active (${activeInvoices})
                </button>
                <button onclick="filterInvoices('overdue')" class="invoice-filter-btn" data-filter="overdue" style="padding: 8px 16px; background: white; color: #F44336; border: 2px solid #F44336; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Overdue (${overdueInvoices})
                </button>
                <button onclick="filterInvoices('returned')" class="invoice-filter-btn" data-filter="returned" style="padding: 8px 16px; background: white; color: #4CAF50; border: 2px solid #4CAF50; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Returned (${returnedInvoices})
                </button>
            </div>
            
            <!-- Invoices Table -->
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #333;">🧾 Transaction List</h3>
                    <button onclick="loadBlockchainInvoices()" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Refresh
                    </button>
                </div>
                <div id="invoicesTableContainer">
                    ${renderInvoicesTableHTML(invoices)}
                </div>
            </div>
        </div>
    `;
    
    // Store invoices globally for filtering
    window.allInvoices = invoices;
}

/**
 * Render invoices table HTML
 */
function renderInvoicesTableHTML(invoices) {
    if (invoices.length === 0) {
        return '<p style="color: #666; text-align: center; padding: 40px;">No transactions found</p>';
    }
    
    let tableHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">#</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Book ID</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Book Name</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Borrower</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Borrowed Date</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Due Date</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Deposit</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    invoices.forEach((invoice, index) => {
        const statusColor = {
            'active': '#FF9800',
            'overdue': '#F44336',
            'returned': '#4CAF50'
        }[invoice.status] || '#666';
        
        const statusIcon = {
            'active': '✅',
            'overdue': '⚠️',
            'returned': '📚'
        }[invoice.status] || '📄';
        
        const statusText = {
            'active': 'Active',
            'overdue': 'Overdue',
            'returned': 'Returned'
        }[invoice.status] || 'Unknown';
        
        tableHTML += `
            <tr class="invoice-row" data-status="${invoice.status}" style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px;"><strong>${index + 1}</strong></td>
                <td style="padding: 12px;"><strong>#${invoice.bookId}</strong></td>
                <td style="padding: 12px;">${invoice.bookName}</td>
                <td style="padding: 12px;"><code style="font-size: 11px; color: #666;">${invoice.borrower.slice(0, 8)}...${invoice.borrower.slice(-4)}</code></td>
                <td style="padding: 12px;">${invoice.borrowedAt.toLocaleDateString()}</td>
                <td style="padding: 12px;">${invoice.dueDate.toLocaleDateString()}</td>
                <td style="padding: 12px;"><strong>${invoice.deposit} ETH</strong></td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${statusColor}20; color: ${statusColor};">
                        ${statusIcon} ${statusText}
                    </span>
                </td>
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
 * Filter invoices by status
 */
function filterInvoices(filter) {
    if (!window.allInvoices) return;
    
    let filteredInvoices;
    if (filter === 'all') {
        filteredInvoices = window.allInvoices;
    } else {
        filteredInvoices = window.allInvoices.filter(i => i.status === filter);
    }
    
    // Update table
    const tableContainer = document.getElementById('invoicesTableContainer');
    if (tableContainer) {
        tableContainer.innerHTML = renderInvoicesTableHTML(filteredInvoices);
    }
    
    // Update active button
    document.querySelectorAll('.invoice-filter-btn').forEach(btn => {
        if (btn.dataset.filter === filter) {
            btn.style.background = '#667eea';
            btn.style.color = 'white';
            btn.style.border = '2px solid #667eea';
            btn.classList.add('active');
        } else {
            const color = {
                'active': '#FF9800',
                'overdue': '#F44336',
                'returned': '#4CAF50'
            }[btn.dataset.filter] || '#667eea';
            btn.style.background = 'white';
            btn.style.color = color;
            btn.style.border = `2px solid ${color}`;
            btn.classList.remove('active');
        }
    });
}

/**
 * Display invoice error
 */
function displayInvoiceError(message) {
    const mainContent = getInvoiceRoot();
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <i class='bx bx-error-circle' style="font-size: 64px; color: #f44336;"></i>
                <h3 style="margin-top: 16px; font-weight: 400;">${message}</h3>
                <p style="margin-top: 8px; font-size: 14px;">Please ensure blockchain is running and contracts are deployed</p>
                <button onclick="loadBlockchainInvoices()" style="margin-top: 20px; padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Retry
                </button>
            </div>
        `;
    }
}

function initAdminInvoicePage() {
    loadBlockchainInvoices();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/admin/invoice') {
        initAdminInvoicePage();
    }
});

