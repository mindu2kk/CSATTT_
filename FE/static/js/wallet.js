// ========================================
// METAMASK WALLET INTEGRATION (MINIMAL)
// ========================================

// Global state
window.walletState = {
    provider: null,
    signer: null,
    address: null,
    balance: null,
    isConnected: false
};

/**
 * Connect MetaMask
 */
async function connectMetaMask() {
    try {
        if (!window.ethereum) {
            alert('Please install MetaMask first!');
            window.open('https://metamask.io/download/', '_blank');
            return;
        }
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        
        // Create provider and signer
        window.walletState.provider = new ethers.providers.Web3Provider(window.ethereum);
        window.walletState.signer = window.walletState.provider.getSigner();
        window.walletState.address = await window.walletState.signer.getAddress();
        
        // Get balance
        const balance = await window.walletState.provider.getBalance(window.walletState.address);
        window.walletState.balance = ethers.utils.formatEther(balance);
        window.walletState.isConnected = true;
        
        // Update UI
        updateWalletUI();
        
        // Save to localStorage (with error handling for Tracking Prevention)
        try {
            localStorage.setItem('walletConnected', 'true');
        } catch (e) {
            console.warn('localStorage not available (Tracking Prevention):', e);
            // Continue without localStorage
        }
        
        console.log('✅ Wallet connected:', window.walletState.address);
        
        // ========================================
        // CRITICAL FIX: Dispatch wallet connected event
        // ========================================
        // Notify other scripts that wallet is connected
        const event = new CustomEvent('walletConnected', {
            detail: {
                address: window.walletState.address,
                balance: window.walletState.balance
            }
        });
        window.dispatchEvent(event);
        console.log('📢 Dispatched walletConnected event');
        
        // Listen for account changes
        window.ethereum.on('accountsChanged', function (accounts) {
            if (accounts.length === 0) {
                disconnectWallet();
            } else {
                window.location.reload();
            }
        });
        
        window.ethereum.on('chainChanged', function (chainId) {
            window.location.reload();
        });
        
    } catch (error) {
        console.error('Failed to connect wallet:', error);
        alert('Failed to connect wallet: ' + error.message);
    }
}

/**
 * Disconnect wallet
 */
function disconnectWallet() {
    window.walletState = {
        provider: null,
        signer: null,
        address: null,
        balance: null,
        isConnected: false
    };
    
    try {
        localStorage.removeItem('walletConnected');
    } catch (e) {
        console.warn('localStorage not available:', e);
    }
    updateWalletUI();
}

/**
 * Update wallet UI
 */
function updateWalletUI() {
    const connectBtn = document.getElementById('connectWalletBtn');
    const walletInfo = document.getElementById('walletInfo');
    const walletAddress = document.getElementById('walletAddress');
    const walletBalance = document.getElementById('walletBalance');
    
    if (!connectBtn || !walletInfo) return;
    
    if (window.walletState.isConnected && window.walletState.address) {
        // Hide connect button
        connectBtn.style.display = 'none';
        
        // Show wallet info
        walletInfo.style.display = 'flex';
        
        // Update address (shortened)
        const addr = window.walletState.address;
        walletAddress.textContent = `${addr.slice(0, 6)}...${addr.slice(-4)}`;
        walletAddress.title = addr;
        
        // Update balance
        const bal = parseFloat(window.walletState.balance).toFixed(4);
        walletBalance.textContent = `${bal} ETH`;
    } else {
        // Show connect button
        connectBtn.style.display = 'flex';
        
        // Hide wallet info
        walletInfo.style.display = 'none';
    }
}

/**
 * Copy wallet address
 */
function copyWalletAddress() {
    if (window.walletState.address) {
        navigator.clipboard.writeText(window.walletState.address).then(() => {
            alert('Address copied: ' + window.walletState.address);
        });
    }
}

/**
 * Format ETH amount
 */
function formatEth(wei) {
    if (!wei) return '0.0000';
    return parseFloat(ethers.utils.formatEther(wei)).toFixed(4);
}

/**
 * Parse ETH to Wei
 */
function parseEth(ether) {
    return ethers.utils.parseEther(ether.toString());
}

// Auto-connect on page load if previously connected
document.addEventListener('DOMContentLoaded', async function() {
    try {
        if (localStorage.getItem('walletConnected') === 'true') {
            await connectMetaMask();
        }
    } catch (e) {
        console.warn('localStorage not available (Tracking Prevention):', e);
        // Continue without auto-connect
    }
});

