// ========================================
// ADMIN AND STAFF ACCOUNTS - BLOCKCHAIN INTEGRATION
// ========================================
// Load admin/staff accounts from UserProfile contract

/**
 * Load admin and staff accounts from blockchain
 */
function getAdminStaffRoot() {
    return document.getElementById('adminStaffRoot') || document.querySelector('.main-content');
}

async function loadAdminStaffAccounts() {
    const mainContent = getAdminStaffRoot();
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div style="padding: 40px; text-align: center;">
            <i class='bx bx-loader-alt bx-spin' style="font-size: 48px; color: #667eea;"></i>
            <p style="margin-top: 16px; color: #666;">Loading admin and staff accounts from blockchain...</p>
        </div>
    `;
    
    try {
        await initBlockchainContracts();
        
        // Check if UserProfile contract is available
        // For now, we'll use BookNFT owner and LibraryCore owner as admins
        // In production, you'd deploy UserProfile contract and use it
        
        const accounts = [];
        
        // Get contract owners (these are admins)
        if (window.blockchainBooks.bookNFTContract) {
            try {
                const bookNFTOwner = await window.blockchainBooks.bookNFTContract.owner();
                accounts.push({
                    address: bookNFTOwner,
                    name: 'BookNFT Owner',
                    role: 'Admin',
                    email: 'admin@blockchain.local',
                    phone: 'N/A',
                    isOwner: true
                });
            } catch (e) {
                console.warn('Could not get BookNFT owner:', e);
            }
        }
        
        if (window.blockchainBooks.libraryCoreContract) {
            try {
                const libraryCoreOwner = await window.blockchainBooks.libraryCoreContract.owner();
                // Check if different from BookNFT owner
                const existing = accounts.find(a => a.address.toLowerCase() === libraryCoreOwner.toLowerCase());
                if (!existing) {
                    accounts.push({
                        address: libraryCoreOwner,
                        name: 'LibraryCore Owner',
                        role: 'Admin',
                        email: 'admin@blockchain.local',
                        phone: 'N/A',
                        isOwner: true
                    });
                }
            } catch (e) {
                console.warn('Could not get LibraryCore owner:', e);
            }
        }
        
        // Get authorized updaters from BookNFT (these are staff)
        // Note: This requires iterating through authorized addresses
        // For simplicity, we'll show contract owners as admins
        
        renderAdminStaffTable(accounts);
        
    } catch (error) {
        console.error('Failed to load admin/staff accounts:', error);
        mainContent.innerHTML = `
            <div style="padding: 40px; text-align: center; color: #f44336;">
                <i class='bx bx-error-circle' style="font-size: 48px;"></i>
                <p style="margin-top: 16px;">Failed to load accounts: ${error.message}</p>
                <button onclick="loadAdminStaffAccounts()" style="margin-top: 16px; padding: 10px 20px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer;">
                    Retry
                </button>
            </div>
        `;
    }
}

/**
 * Render admin/staff accounts table
 */
function renderAdminStaffTable(accounts) {
    const mainContent = getAdminStaffRoot();
    if (!mainContent) return;
    
    mainContent.innerHTML = `
        <div class="admin-staff-container" style="padding: 30px;">
            <div class="admin-staff-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h2 class="admin-staff-title" style="margin: 0;">ADMINS AND STAFFS (Blockchain)</h2>
                <div style="display: flex; gap: 12px; align-items: center;">
                    <button onclick="loadAdminStaffAccounts()" style="padding: 8px 16px; background: #2196F3; color: white; border: none; border-radius: 6px; cursor: pointer;">
                        🔄 Refresh
                    </button>
                    <div class="search-bar" style="display: flex; align-items: center; gap: 8px; padding: 8px 12px; border: 2px solid #e0e0e0; border-radius: 6px;">
                        <input type="text" id="staff-search" placeholder="Search accounts..." style="border: none; outline: none; flex: 1;">
                        <i class='bx bx-search' style="color: #666;"></i>
                    </div>
                </div>
            </div>
            
            <!-- Info Box -->
            <div style="background: #e3f2fd; padding: 16px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #2196F3;">
                <p style="margin: 0; font-size: 13px; color: #1976d2;">
                    <strong>ℹ️ Blockchain Accounts:</strong> These are contract owners and authorized addresses from the blockchain. 
                    To add more staff, authorize addresses in BookNFT contract.
                </p>
            </div>
            
            <!-- Accounts Table -->
            <div style="background: white; padding: 24px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow-x: auto;">
                <table class="admin-staff-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background: #f5f5f5;">
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">STT</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Wallet Address</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Name</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Role</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Email</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Phone</th>
                            <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e0e0e0;">Status</th>
                        </tr>
                    </thead>
                    <tbody id="admin-staff-tbody">
                        ${renderAdminStaffTableRows(accounts)}
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Store accounts globally for search
    window.adminStaffAccounts = accounts;
    
    // Add search functionality
    const searchInput = document.getElementById('staff-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            const filtered = accounts.filter(acc => 
                acc.address.toLowerCase().includes(query) ||
                acc.name.toLowerCase().includes(query) ||
                acc.role.toLowerCase().includes(query)
            );
            document.getElementById('admin-staff-tbody').innerHTML = renderAdminStaffTableRows(filtered);
        });
    }
}

/**
 * Render admin/staff table rows
 */
function renderAdminStaffTableRows(accounts) {
    if (accounts.length === 0) {
        return '<tr><td colspan="7" style="padding: 40px; text-align: center; color: #666;">No admin/staff accounts found</td></tr>';
    }
    
    return accounts.map((account, index) => {
        const shortAddress = `${account.address.slice(0, 8)}...${account.address.slice(-4)}`;
        const roleColor = account.role === 'Admin' ? '#f44336' : '#2196F3';
        
        return `
            <tr style="border-bottom: 1px solid #e0e0e0;">
                <td style="padding: 12px;">${index + 1}</td>
                <td style="padding: 12px;">
                    <code style="font-size: 11px; color: #666;" title="${account.address}">${shortAddress}</code>
                </td>
                <td style="padding: 12px;"><strong>${account.name}</strong></td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: ${roleColor}20; color: ${roleColor};">
                        ${account.role}
                    </span>
                </td>
                <td style="padding: 12px;">${account.email}</td>
                <td style="padding: 12px;">${account.phone}</td>
                <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; background: #4CAF5020; color: #4CAF50;">
                        ✅ Active
                    </span>
                </td>
            </tr>
        `;
    }).join('');
}

function initAdminStaffPage() {
    loadAdminStaffAccounts();
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname === '/admin/staff') {
        initAdminStaffPage();
    }
});

