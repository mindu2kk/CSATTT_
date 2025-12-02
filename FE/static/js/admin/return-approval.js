// ========================================
// ADMIN RETURN APPROVAL - BLOCKCHAIN
// ========================================

/**
 * Load pending return requests from blockchain
 */
async function loadPendingReturnRequests() {
    try {
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            displayReturnApprovalError('Contracts not loaded');
            return;
        }
        
        console.log('📋 Loading pending return requests...');
        
        // Get pending request IDs from contract
        const pendingRequestIds = await window.blockchainBooks.libraryCoreContract.getPendingReturnRequests();
        console.log(`Found ${pendingRequestIds.length} pending requests:`, pendingRequestIds);
        
        if (pendingRequestIds.length === 0) {
            renderReturnApprovalTable([]);
            return;
        }
        
        // Fetch details for each request
        const requests = [];
        for (const requestId of pendingRequestIds) {
            try {
                const requestIdNum = Number(requestId);
                
                // Get return request details
                const returnRequest = await window.blockchainBooks.libraryCoreContract.returnRequests(requestIdNum);
                
                // Extract fields (handle both named and indexed returns)
                const borrower = returnRequest.borrower || returnRequest[0];
                const bookId = Number(returnRequest.bookId || returnRequest[1]);
                const requestedAt = Number(returnRequest.requestedAt || returnRequest[2]);
                const proposedCondition = Number(returnRequest.proposedCondition || returnRequest[3]);
                const isPending = returnRequest.isPending !== undefined ? returnRequest.isPending : returnRequest[4];
                
                // Skip if not actually pending
                if (!isPending) {
                    console.warn(`Request ${requestIdNum} is not pending, skipping`);
                    continue;
                }
                
                // Get book info
                let bookName = 'Unknown Book';
                let bookStatus = 0;
                try {
                    const bookInfo = await window.blockchainBooks.bookNFTContract.getBookInfo(bookId);
                    bookName = bookInfo.name || bookInfo[0] || 'Unknown Book';
                    bookStatus = Number(bookInfo.status || bookInfo[2]);
                } catch (bookError) {
                    console.warn(`Failed to get book info for book ${bookId}:`, bookError);
                }
                
                // Get loan info for deposit amount
                let deposit = '0';
                let dueDate = null;
                let borrowedAt = null;
                try {
                    const loanInfo = await window.blockchainBooks.libraryCoreContract.loanInfos(bookId);
                    deposit = ethers.utils.formatEther(loanInfo.deposit || loanInfo[3] || 0);
                    dueDate = new Date(Number(loanInfo.dueDate || loanInfo[2]) * 1000);
                    borrowedAt = new Date(Number(loanInfo.borrowedAt || loanInfo[1]) * 1000);
                } catch (loanError) {
                    console.warn(`Failed to get loan info for book ${bookId}:`, loanError);
                }
                
                requests.push({
                    requestId: requestIdNum,
                    borrower: borrower,
                    bookId: bookId,
                    bookName: bookName,
                    bookStatus: bookStatus,
                    requestedAt: new Date(requestedAt * 1000),
                    proposedCondition: proposedCondition,
                    deposit: deposit,
                    dueDate: dueDate,
                    borrowedAt: borrowedAt
                });
                
                console.log(`✅ Loaded request ${requestIdNum}: Book #${bookId} "${bookName}" from ${borrower.slice(0, 8)}...`);
                
            } catch (error) {
                console.error(`Failed to load request ${requestId}:`, error);
            }
        }
        
        renderReturnApprovalTable(requests);
        
    } catch (error) {
        console.error('Failed to load pending return requests:', error);
        displayReturnApprovalError('Error loading pending return requests from blockchain');
    }
}

/**
 * Render return approval table
 */
function getReturnApprovalRoot() {
    return document.getElementById('returnApprovalRoot') || document.querySelector('.main-content');
}

function renderReturnApprovalTable(requests) {
    const mainContent = getReturnApprovalRoot();
    if (!mainContent) return;
    
    const totalRequests = requests.length;
    
    mainContent.innerHTML = `
        <div class="return-approval-management" style="padding: 30px;">
            <h2 style="margin-bottom: 24px; color: #333;">📋 Return Approval Management</h2>
            
            <!-- Stats Card -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 30px;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px; color: white; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);">
                    <h3 style="margin: 0; font-size: 36px;">${totalRequests}</h3>
                    <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">⏳ Pending Return Requests</p>
                </div>
            </div>
            
            <!-- Requests Table -->
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #333;">📋 Pending Return Requests</h3>
                    <button onclick="loadPendingReturnRequests()" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Refresh
                    </button>
                </div>
                <div id="returnRequestsTableContainer">
                    ${renderReturnRequestsTableHTML(requests)}
                </div>
            </div>
        </div>
    `;
}

/**
 * Render return requests table HTML
 */
function renderReturnRequestsTableHTML(requests) {
    if (requests.length === 0) {
        return `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class='bx bx-check-circle' style="font-size: 64px; color: #4CAF50;"></i>
                <h3 style="margin-top: 16px; font-weight: 400;">No Pending Return Requests</h3>
                <p style="margin-top: 8px; font-size: 14px;">All return requests have been processed</p>
            </div>
        `;
    }
    
    let tableHTML = `
        <div style="overflow-x: auto;">
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f5f5f5;">
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Request ID</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Book</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Borrower</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Borrowed Date</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Due Date</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Requested</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Proposed Condition</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Deposit</th>
                        <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Actions</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    requests.forEach((request) => {
        const proposedConditionName = getConditionName(request.proposedCondition);
        const proposedConditionColor = getConditionColor(request.proposedCondition);
        
        // Check if overdue
        const now = new Date();
        const isOverdue = request.dueDate && now > request.dueDate;
        
        tableHTML += `
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px;"><strong>#${request.requestId}</strong></td>
                <td style="padding: 12px;">
                    <strong>${request.bookName}</strong><br>
                    <small style="color: #666;">ID: ${request.bookId}</small>
                </td>
                <td style="padding: 12px;">
                    <code style="font-size: 11px; color: #666;">${request.borrower.slice(0, 8)}...${request.borrower.slice(-4)}</code>
                </td>
                <td style="padding: 12px;">
                    ${request.borrowedAt ? request.borrowedAt.toLocaleDateString() : 'N/A'}
                </td>
                <td style="padding: 12px;">
                    ${request.dueDate ? request.dueDate.toLocaleDateString() : 'N/A'}
                    ${isOverdue ? '<br><span style="color: #F44336; font-size: 11px; font-weight: 600;">⚠️ OVERDUE</span>' : ''}
                </td>
                <td style="padding: 12px;">
                    ${request.requestedAt.toLocaleDateString()}<br>
                    <small style="color: #666;">${request.requestedAt.toLocaleTimeString()}</small>
                </td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${proposedConditionColor}20; color: ${proposedConditionColor};">
                        ${proposedConditionName}
                    </span>
                </td>
                <td style="padding: 12px;"><strong>${request.deposit} ETH</strong></td>
                <td style="padding: 12px;">
                    <button 
                        onclick="showApproveReturnModal(${request.requestId}, ${request.bookId}, '${request.bookName.replace(/'/g, "\\'")}', ${request.proposedCondition}, '${request.deposit}')"
                        style="padding: 6px 12px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 600;">
                        ✅ Approve
                    </button>
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
 * Show approve return modal
 */
async function showApproveReturnModal(requestId, bookId, bookName, proposedCondition, deposit) {
    const proposedConditionName = getConditionName(proposedCondition);
    
    // Get loan info for penalty calculation
    let dueDate = null;
    let borrowedAt = null;
    try {
        await initBlockchainContracts();
        const loanInfo = await window.blockchainBooks.libraryCoreContract.loanInfos(bookId);
        dueDate = new Date(Number(loanInfo.dueDate || loanInfo[2]) * 1000);
        borrowedAt = new Date(Number(loanInfo.borrowedAt || loanInfo[1]) * 1000);
    } catch (error) {
        console.warn('Failed to get loan info for penalty preview:', error);
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'approveReturnModal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 12px; max-width: 600px; width: 90%; box-shadow: 0 4px 20px rgba(0,0,0,0.3);">
            <h3 style="margin: 0 0 20px 0; color: #333;">✅ Approve Return Request</h3>
            
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin: 0 0 8px 0;"><strong>Request ID:</strong> #${requestId}</p>
                <p style="margin: 0 0 8px 0;"><strong>Book:</strong> ${bookName} (ID: ${bookId})</p>
                <p style="margin: 0 0 8px 0;"><strong>Deposit:</strong> ${deposit} ETH</p>
                <p style="margin: 0;"><strong>User Proposed:</strong> <span style="color: #667eea;">${proposedConditionName}</span></p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                    Select Final Condition (After Inspection):
                </label>
                <select id="finalConditionSelect" onchange="updatePenaltyPreview(${requestId}, ${bookId}, '${deposit}', ${dueDate ? dueDate.getTime() : 'null'})" style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 6px; font-size: 14px;">
                    <option value="0" ${proposedCondition === 0 ? 'selected' : ''}>✅ Available (Good Condition)</option>
                    <option value="4" ${proposedCondition === 4 ? 'selected' : ''}>📚 Old (Fair/Poor Condition)</option>
                    <option value="2">💔 Damaged</option>
                    <option value="3">🔍 Lost</option>
                </select>
                <small style="display: block; margin-top: 8px; color: #666;">
                    ⚠️ The final condition you select will determine the penalty charged to the user.
                </small>
            </div>
            
            <!-- Penalty Preview Section -->
            <div id="penaltyPreview" style="background: #fff3cd; border: 2px solid #ffc107; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 12px 0; color: #856404; font-size: 14px;">💰 Penalty Calculation Preview</h4>
                <div id="penaltyDetails" style="font-size: 13px; color: #856404;">
                    <p style="margin: 4px 0;">Loading...</p>
                </div>
            </div>
            
            <div id="approveReturnResult" style="margin-bottom: 16px;"></div>
            
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button 
                    onclick="closeApproveReturnModal()"
                    style="padding: 10px 20px; background: #e0e0e0; color: #333; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    Cancel
                </button>
                <button 
                    id="confirmApproveBtn"
                    onclick="confirmApproveReturn(${requestId}, ${bookId}, '${bookName.replace(/'/g, "\\'")}')"
                    style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                    ✅ Confirm Approval
                </button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Initial penalty preview calculation
    updatePenaltyPreview(requestId, bookId, deposit, dueDate ? dueDate.getTime() : null);
}

/**
 * Update penalty preview based on selected final condition
 */
function updatePenaltyPreview(requestId, bookId, depositETH, dueDateTimestamp) {
    const penaltyDetails = document.getElementById('penaltyDetails');
    if (!penaltyDetails) return;
    
    try {
        const finalCondition = parseInt(document.getElementById('finalConditionSelect').value);
        
        // Constants from smart contract
        const PENALTY_LATE_PER_DAY = 0.001; // ETH
        const PENALTY_DAMAGE = 0.005; // ETH
        
        const deposit = parseFloat(depositETH);
        let latePenalty = 0;
        let damagePenalty = 0;
        
        // Calculate late penalty
        if (dueDateTimestamp) {
            const now = Date.now();
            const dueDate = dueDateTimestamp;
            
            if (now > dueDate) {
                const msLate = now - dueDate;
                const daysLate = Math.floor(msLate / (1000 * 60 * 60 * 24)) + 1;
                latePenalty = daysLate * PENALTY_LATE_PER_DAY;
            }
        }
        
        // Calculate damage penalty based on FINAL condition
        // BookStatus enum: Available=0, Borrowed=1, Damaged=2, Lost=3, Old=4, New=5
        if (finalCondition === 2 || finalCondition === 3) { // Damaged or Lost
            damagePenalty = PENALTY_DAMAGE;
        }
        
        // Calculate total penalty and refund
        let totalPenalty = latePenalty + damagePenalty;
        
        // Cap penalty at deposit
        if (totalPenalty > deposit) {
            totalPenalty = deposit;
        }
        
        const refund = deposit - totalPenalty;
        
        // Determine if overdue
        const isOverdue = dueDateTimestamp && Date.now() > dueDateTimestamp;
        const daysLate = isOverdue ? Math.floor((Date.now() - dueDateTimestamp) / (1000 * 60 * 60 * 24)) + 1 : 0;
        
        // Build penalty details HTML
        let detailsHTML = '';
        
        if (isOverdue) {
            detailsHTML += `
                <p style="margin: 4px 0;">
                    <strong>⏰ Late Penalty:</strong> ${daysLate} day(s) × ${PENALTY_LATE_PER_DAY} ETH = <strong>${latePenalty.toFixed(4)} ETH</strong>
                </p>
            `;
        } else {
            detailsHTML += `
                <p style="margin: 4px 0;">
                    <strong>⏰ Late Penalty:</strong> <span style="color: #28a745;">0 ETH (On Time)</span>
                </p>
            `;
        }
        
        if (damagePenalty > 0) {
            detailsHTML += `
                <p style="margin: 4px 0;">
                    <strong>💔 Damage Penalty:</strong> <strong style="color: #dc3545;">${damagePenalty.toFixed(4)} ETH</strong>
                </p>
            `;
        } else {
            detailsHTML += `
                <p style="margin: 4px 0;">
                    <strong>💔 Damage Penalty:</strong> <span style="color: #28a745;">0 ETH (Good Condition)</span>
                </p>
            `;
        }
        
        detailsHTML += `
            <hr style="margin: 12px 0; border: none; border-top: 1px solid #ffc107;">
            <p style="margin: 4px 0;">
                <strong>📊 Total Penalty:</strong> <strong style="color: ${totalPenalty > 0 ? '#dc3545' : '#28a745'};">${totalPenalty.toFixed(4)} ETH</strong>
            </p>
            <p style="margin: 4px 0;">
                <strong>💰 Deposit:</strong> ${deposit.toFixed(4)} ETH
            </p>
            <p style="margin: 4px 0; font-size: 15px;">
                <strong>💵 Refund to User:</strong> <strong style="color: #28a745; font-size: 16px;">${refund.toFixed(4)} ETH</strong>
            </p>
        `;
        
        if (totalPenalty >= deposit) {
            detailsHTML += `
                <p style="margin: 8px 0 0 0; padding: 8px; background: #f8d7da; border-radius: 4px; color: #721c24; font-size: 12px;">
                    ⚠️ <strong>Warning:</strong> Total penalty exceeds deposit. User will receive no refund.
                </p>
            `;
        }
        
        penaltyDetails.innerHTML = detailsHTML;
        
    } catch (error) {
        console.error('Error calculating penalty preview:', error);
        penaltyDetails.innerHTML = `
            <p style="margin: 4px 0; color: #dc3545;">
                ❌ Error calculating penalty preview
            </p>
        `;
    }
}

/**
 * Close approve return modal
 */
function closeApproveReturnModal() {
    const modal = document.getElementById('approveReturnModal');
    if (modal) {
        modal.remove();
    }
}

/**
 * Confirm approve return
 */
async function confirmApproveReturn(requestId, bookId, bookName) {
    const resultDiv = document.getElementById('approveReturnResult');
    const confirmBtn = document.getElementById('confirmApproveBtn');
    const originalText = confirmBtn.textContent;
    
    try {
        confirmBtn.textContent = '⏳ Processing...';
        confirmBtn.disabled = true;
        resultDiv.innerHTML = '';
        
        // Get final condition from select
        const finalCondition = parseInt(document.getElementById('finalConditionSelect').value);
        
        console.log(`📝 Approving return request ${requestId} with final condition ${finalCondition}...`);
        
        // Check wallet connection
        if (!window.walletState || !window.walletState.isConnected) {
            alert('Please connect MetaMask first!');
            await connectMetaMask();
            if (!window.walletState || !window.walletState.isConnected) {
                throw new Error('Wallet not connected');
            }
        }
        
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            throw new Error('Contracts not loaded');
        }
        
        // Call approveReturn on contract
        const libraryCoreWithSigner = window.blockchainBooks.libraryCoreContract.connect(window.walletState.signer);
        
        const tx = await libraryCoreWithSigner.approveReturn(requestId, finalCondition);
        
        console.log('⏳ Transaction sent:', tx.hash);
        resultDiv.innerHTML = `
            <div style="padding: 12px; background: #e3f2fd; border-left: 4px solid #2196F3; border-radius: 4px;">
                <strong style="color: #1976d2;">⏳ Transaction sent!</strong><br>
                <small style="color: #666;">Waiting for confirmation...</small>
            </div>
        `;
        
        // Wait for confirmation
        const receipt = await tx.wait();
        console.log('✅ Transaction confirmed:', receipt);
        
        resultDiv.innerHTML = `
            <div style="padding: 12px; background: #e8f5e9; border-left: 4px solid #4CAF50; border-radius: 4px;">
                <strong style="color: #2e7d32;">✅ Return approved successfully!</strong><br>
                <small style="color: #666;">Transaction: <code style="font-size: 10px;">${receipt.transactionHash}</code></small>
            </div>
        `;
        
        // Close modal after 2 seconds and refresh
        setTimeout(() => {
            closeApproveReturnModal();
            loadPendingReturnRequests();
        }, 2000);
        
    } catch (error) {
        console.error('❌ Approve failed:', error);
        
        let errorMsg = 'Failed to approve return';
        if (error.code === 4001) {
            errorMsg = 'Transaction rejected by user';
        } else if (error.reason) {
            errorMsg = error.reason;
        } else if (error.message) {
            errorMsg = error.message;
        }
        
        resultDiv.innerHTML = `
            <div style="padding: 12px; background: #ffebee; border-left: 4px solid #F44336; border-radius: 4px;">
                <strong style="color: #c62828;">❌ Failed to approve</strong><br>
                <small style="color: #666;">${errorMsg}</small>
            </div>
        `;
        
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}

/**
 * Get condition name
 */
function getConditionName(condition) {
    // BookStatus enum: Available=0, Borrowed=1, Damaged=2, Lost=3, Old=4, New=5
    const names = {
        0: '✅ Available',
        1: '📖 Borrowed',
        2: '💔 Damaged',
        3: '🔍 Lost',
        4: '📚 Old',
        5: '🆕 New'
    };
    return names[condition] || 'Unknown';
}

/**
 * Get condition color
 */
function getConditionColor(condition) {
    // BookStatus enum: Available=0, Borrowed=1, Damaged=2, Lost=3, Old=4, New=5
    const colors = {
        0: '#4CAF50', // Available - Green
        1: '#2196F3', // Borrowed - Blue
        2: '#F44336', // Damaged - Red
        3: '#9C27B0', // Lost - Purple
        4: '#FF9800', // Old - Orange
        5: '#00BCD4'  // New - Cyan
    };
    return colors[condition] || '#666';
}

/**
 * Display return approval error
 */
function displayReturnApprovalError(message) {
    const mainContent = getReturnApprovalRoot();
    if (mainContent) {
        mainContent.innerHTML = `
            <div style="text-align: center; padding: 60px; color: #666;">
                <i class='bx bx-error-circle' style="font-size: 64px; color: #f44336;"></i>
                <h3 style="margin-top: 16px; font-weight: 400;">${message}</h3>
                <p style="margin-top: 8px; font-size: 14px;">Please ensure blockchain is running and contracts are deployed</p>
                <button onclick="loadPendingReturnRequests()" style="margin-top: 20px; padding: 10px 24px; background: #667eea; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Initialize return approval page
 */
function initReturnApprovalPage() {
    loadPendingReturnRequests();
}

// Auto-initialize when on return approval page
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on the return approval page
    if (window.location.pathname === '/admin/return-approval' || 
        window.location.pathname.includes('return-approval')) {
        initReturnApprovalPage();
    }
});

// Listen for wallet connection
window.addEventListener('walletConnected', () => {
    if (window.location.pathname === '/admin/return-approval' || 
        window.location.pathname.includes('return-approval')) {
        initReturnApprovalPage();
    }
});
