// ========================================
// REPUTATION SYSTEM - BLOCKCHAIN INTEGRATION
// ========================================

/**
 * Get reputation badge based on score
 */
function getReputationBadge(reputation) {
    if (reputation >= 100) {
        return { emoji: '👑', name: 'Diamond', color: '#00bcd4' };
    } else if (reputation >= 50) {
        return { emoji: '⭐', name: 'Gold', color: '#ffc107' };
    } else if (reputation >= 20) {
        return { emoji: '🥈', name: 'Silver', color: '#9e9e9e' };
    } else if (reputation >= 0) {
        return { emoji: '🥉', name: 'Bronze', color: '#cd7f32' };
    } else {
        return { emoji: '⚠️', name: 'Warning', color: '#f44336' };
    }
}

/**
 * Load and display user reputation
 */
async function loadUserReputation(userAddress) {
    try {
        // Initialize contracts
        await initBlockchainContracts();
        
        if (!window.blockchainBooks.libraryCoreContract) {
            console.warn('LibraryCore contract not loaded');
            return null;
        }
        
        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        
        // Get reputation from contract
        const reputation = await libraryCoreContract.userReputation(userAddress);
        const reputationScore = Number(reputation);
        
        console.log(`📊 User reputation: ${reputationScore}`);
        
        return reputationScore;
        
    } catch (error) {
        console.error('Failed to load reputation:', error);
        return null;
    }
}

/**
 * Display reputation in profile
 */
async function displayReputationInProfile() {
    try {
        if (!window.walletState || !window.walletState.isConnected) {
            return;
        }
        
        const userAddress = window.walletState.address;
        const reputation = await loadUserReputation(userAddress);
        
        if (reputation === null) return;
        
        const badge = getReputationBadge(reputation);
        
        // Find or create reputation display element
        const profileContent = document.getElementById('profileContent');
        if (!profileContent) return;
        
        // Add reputation display
        const reputationHTML = `
            <div class="in4" style="grid-column: 1 / -1; background: linear-gradient(135deg, ${badge.color}20 0%, ${badge.color}40 100%); padding: 20px; border-radius: 12px; border: 2px solid ${badge.color};">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                    <div>
                        <p class="label" style="font-size: 14px; color: #666; margin-bottom: 8px;">Your Reputation</p>
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 32px;">${badge.emoji}</span>
                            <div>
                                <p style="font-size: 24px; font-weight: 700; color: ${badge.color}; margin: 0;">${reputation}</p>
                                <p style="font-size: 14px; color: ${badge.color}; margin: 4px 0 0 0; font-weight: 600;">${badge.name} Member</p>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; font-size: 12px; color: #666;">
                        <p style="margin: 0 0 4px 0;"><strong>How it works:</strong></p>
                        <p style="margin: 0;">+10 for on-time returns</p>
                        <p style="margin: 0;">-5 for late returns</p>
                        <p style="margin: 0;">-20 for lost books</p>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after wallet info
        const existingRepDisplay = profileContent.querySelector('.reputation-display');
        if (existingRepDisplay) {
            existingRepDisplay.remove();
        }
        
        // Add new reputation display
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = reputationHTML;
        tempDiv.firstElementChild.classList.add('reputation-display');
        profileContent.appendChild(tempDiv.firstElementChild);
        
        console.log('✅ Reputation displayed');
        
    } catch (error) {
        console.error('Failed to display reputation:', error);
    }
}

/**
 * Make functions globally available
 */
window.loadUserReputation = loadUserReputation;
window.displayReputationInProfile = displayReputationInProfile;
window.getReputationBadge = getReputationBadge;

console.log('✅ Reputation Display module loaded');

