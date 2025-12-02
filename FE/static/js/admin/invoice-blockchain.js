// ========================================
// ADMIN INVOICE - BLOCKCHAIN TRANSACTIONS + RETURN APPROVALS
// ========================================

/**
 * Load pending return requests from blockchain
 */
async function loadPendingReturnRequests() {
    try {
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            return [];
        }
        
        const pendingRequests = [];
        const requestCounter = await window.blockchainBooks.libraryCoreContract.returnRequestCounter();
        
        for (let i = 1; i <= Number(requestCounter); i++) {
            try {
                const request = await window.blockchainBooks.libraryCoreContract.returnRequests(i);
                
                if (request.isPending) {
                    const bookInfo = await window.blockchainBooks.bookNFTContract.getBookInfo(request.bookId);
                    
                    pendingRequests.push({
                        requestId: i,
                        borrower: request.borrower,
                        bookId: Number(request.bookId),
                        bookName: bookInfo.name,
                        requestedAt: new Date(Number(request.requestedAt) * 1000),
                        proposedCondition: Number(request.proposedCondition),
                        conditionText: ['New', 'Good', 'Fair', 'Poor'][Number(request.proposedCondition)] || 'Unknown'
                    });
                }
            } catch (error) {
                console.warn(`Failed to load return request ${i}:`, error);
            }
        }
        
        return pendingRequests;
    } catch (error) {
        console.error('Failed to load pending return requests:', error);
        return [];
    }
}

/**
 * Approve return request
 */
async function approveReturnRequest(requestId, finalCondition) {
    try {
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect MetaMask first!');
            return false;
        }
        
        await initBlockchainContracts();
        
        const signer = window.walletState.signer;
        const libraryCoreWithSigner = window.blockchainBooks.libraryCoreContract.connect(signer);
        
        console.log(`📝 Approving return request #${requestId} with condition ${finalCondition}...`);
        
        const tx = await libraryCoreWithSigner.approveReturn(requestId, finalCondition);
        console.log('⏳ Transaction sent:', tx.hash);
        
        await tx.wait();
        console.log('✅ Return approved!');
        
        return true;
    } catch (error) {
        console.error('Failed to approve return:', error);
        alert('Failed to approve return: ' + (error.reason || error.message));
        return false;
    }
}

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
            <h2 style="margin-bottom: 24px; color: #333;">🧾 Invoice Management & Return Approvals</h2>
            
            <!-- Tab Navigation -->
            <div style="display: flex; gap: 12px; margin-bottom: 24px; border-bottom: 2px solid #e0e0e0;">
                <button onclick="switchTab('invoices')" id="tab-invoices" class="tab-btn active" style="padding: 12px 24px; background: none; border: none; border-bottom: 3px solid #667eea; color: #667eea; font-weight: 600; cursor: pointer;">
                    📋 Transactions
                </button>
                <button onclick="switchTab('returns')" id="tab-returns" class="tab-btn" style="padding: 12px 24px; background: none; border: none; border-bottom: 3px solid transparent; color: #666; font-weight: 600; cursor: pointer;">
                    🔄 Pending Returns <span id="pending-count-badge" style="background: #f44336; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 4px;">0</span>
                </button>
            </div>
            
            <!-- Invoices Tab -->
            <div id="invoices-tab" class="tab-content">
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
            
            <!-- Returns Tab -->
            <div id="returns-tab" class="tab-content" style="display: none;">
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class='bx bx-loader-alt bx-spin' style="font-size: 48px;"></i>
                    <p style="margin-top: 12px;">Loading pending returns...</p>
                </div>
            </div>
        </div>
    `;
    
    // Store invoices globally for filtering
    window.allInvoices = invoices;
    
    // Load pending returns
    loadPendingReturnsTab();
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.style.borderBottom = '3px solid transparent';
        btn.style.color = '#666';
        btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById(`tab-${tabName}`);
    if (activeBtn) {
        activeBtn.style.borderBottom = '3px solid #667eea';
        activeBtn.style.color = '#667eea';
        activeBtn.classList.add('active');
    }
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.style.display = 'block';
    }
    
    // Load data if needed
    if (tabName === 'returns') {
        loadPendingReturnsTab();
    }
}

/**
 * Load pending returns tab
 */
async function loadPendingReturnsTab() {
    const returnsTab = document.getElementById('returns-tab');
    if (!returnsTab) return;
    
    try {
        const pendingRequests = await loadPendingReturnRequests();
        
        // Update badge count
        const badge = document.getElementById('pending-count-badge');
        if (badge) {
            badge.textContent = pendingRequests.length;
            badge.style.background = pendingRequests.length > 0 ? '#f44336' : '#4CAF50';
        }
        
        if (pendingRequests.length === 0) {
            returnsTab.innerHTML = `
                <div style="text-align: center; padding: 60px; color: #666;">
                    <i class='bx bx-check-circle' style="font-size: 64px; color: #4CAF50;"></i>
                    <h3 style="margin-top: 16px; font-weight: 400;">No Pending Return Requests</h3>
                    <p style="margin-top: 8px; font-size: 14px;">All return requests have been processed</p>
                </div>
            `;
            return;
        }
        
        let html = `
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #333;">🔄 Pending Return Requests (${pendingRequests.length})</h3>
                    <button onclick="loadPendingReturnsTab()" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Refresh
                    </button>
                </div>
                <div style="display: grid; gap: 16px;">
        `;
        
        pendingRequests.forEach(request => {
            const conditionColor = {
                0: '#4CAF50', // New
                1: '#2196F3', // Good
                2: '#FF9800', // Fair
                3: '#F44336'  // Poor
            }[request.proposedCondition] || '#666';
            
            html += `
                <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid ${conditionColor};">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 16px; align-items: center;">
                        <div>
                            <p style="margin: 0; font-size: 12px; color: #666;">Request ID</p>
                            <p style="margin: 4px 0 0 0; font-size: 18px; font-weight: 600; color: #333;">#${request.requestId}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: 12px; color: #666;">Book</p>
                            <p style="margin: 4px 0 0 0; font-size: 14px; font-weight: 600; color: #333;">#${request.bookId} - ${request.bookName}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: 12px; color: #666;">Borrower</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; font-family: monospace; color: #666;">${request.borrower.slice(0, 10)}...${request.borrower.slice(-8)}</p>
                        </div>
                        <div>
                            <p style="margin: 0; font-size: 12px; color: #666;">Requested</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #666;">${request.requestedAt.toLocaleDateString()}</p>
                        </div>
                    </div>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e0e0e0;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <p style="margin: 0; font-size: 12px; color: #666;">Proposed Condition:</p>
                                <span style="display: inline-block; margin-top: 4px; padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600; background: ${conditionColor}20; color: ${conditionColor};">
                                    ${request.conditionText}
                                </span>
                            </div>
                            <div style="display: flex; gap: 8px;">
                                <button onclick="showApproveModal(${request.requestId}, ${request.bookId}, '${request.bookName}', ${request.proposedCondition})" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                    ✅ Approve
                                </button>
                                <button onclick="showApproveModal(${request.requestId}, ${request.bookId}, '${request.bookName}', ${request.proposedCondition}, true)" style="padding: 10px 20px; background: #FF9800; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                    ⚠️ Adjust & Approve
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
        
        returnsTab.innerHTML = html;
        
    } catch (error) {
        console.error('Failed to load pending returns:', error);
        returnsTab.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <i class='bx bx-error-circle' style="font-size: 64px; color: #f44336;"></i>
                <h3 style="margin-top: 16px; font-weight: 400;">Failed to load pending returns</h3>
                <p style="margin-top: 8px; font-size: 14px;">${error.message}</p>
                <button onclick="loadPendingReturnsTab()" style="margin-top: 20px; padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Show approve modal
 */
function showApproveModal(requestId, bookId, bookName, proposedCondition, allowAdjust = false) {
    // Valid return conditions: NEW(5), AVAILABLE(0), OLD(4), DAMAGED(2), LOST(3)
    const conditionOptions = [
        { value: 5, label: 'Like New ✨', color: '#00BCD4' },
        { value: 0, label: 'Good Condition', color: '#4CAF50' },
        { value: 4, label: 'Fair/Worn', color: '#2196F3' },
        { value: 2, label: 'Damaged', color: '#F44336' },
        { value: 3, label: 'Lost', color: '#9E9E9E' }
    ];
    
    const proposedConditionLabel = conditionOptions.find(c => c.value === proposedCondition)?.label || 'Unknown';
    
    const modal = document.createElement('div');
    modal.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;';
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 500px; width: 90%;">
            <h3 style="margin: 0 0 20px 0; color: #333;">Approve Return Request #${requestId}</h3>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 14px; color: #666;">Book: <strong>#${bookId} - ${bookName}</strong></p>
                <p style="margin: 8px 0 0 0; font-size: 14px; color: #666;">Proposed Condition: <strong>${proposedConditionLabel}</strong></p>
            </div>
            ${allowAdjust ? `
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">Final Condition:</label>
                    <select id="final-condition-select" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                        ${conditionOptions.map(cond => `
                            <option value="${cond.value}" ${cond.value === proposedCondition ? 'selected' : ''}>${cond.label}</option>
                        `).join('')}
                    </select>
                    <p style="margin: 8px 0 0 0; font-size: 12px; color: #666;">⚠️ Adjusting condition may affect penalty calculation</p>
                </div>
            ` : ''}
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="this.closest('div[style*=fixed]').remove()" style="padding: 10px 20px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button onclick="confirmApproveReturn(${requestId}, ${allowAdjust})" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    ✅ Confirm Approval
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

/**
 * Confirm approve return
 */
async function confirmApproveReturn(requestId, allowAdjust) {
    let finalCondition;
    
    if (allowAdjust) {
        const select = document.getElementById('final-condition-select');
        finalCondition = parseInt(select.value);
    } else {
        // Use proposed condition
        const request = await window.blockchainBooks.libraryCoreContract.returnRequests(requestId);
        finalCondition = Number(request.proposedCondition);
    }
    
    // Close modal
    document.querySelectorAll('div[style*="position: fixed"]').forEach(el => {
        if (el.style.zIndex === '10000') el.remove();
    });
    
    // Show loading
    const returnsTab = document.getElementById('returns-tab');
    if (returnsTab) {
        returnsTab.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <i class='bx bx-loader-alt bx-spin' style="font-size: 48px;"></i>
                <p style="margin-top: 12px;">Approving return request...</p>
                <p style="margin-top: 8px; font-size: 12px;">Please confirm transaction in MetaMask</p>
            </div>
        `;
    }
    
    // Approve return
    const success = await approveReturnRequest(requestId, finalCondition);
    
    if (success) {
        // Reload tab
        setTimeout(() => {
            loadPendingReturnsTab();
            // Also reload invoices to update status
            loadBlockchainInvoices();
        }, 1000);
    } else {
        // Reload tab to show error
        loadPendingReturnsTab();
    }
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

