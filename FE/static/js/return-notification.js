// ========================================
// RETURN APPROVAL NOTIFICATION SYSTEM
// ========================================

/**
 * Initialize return approval notification listener
 * Listens for ReturnApproved events and notifies the user
 */
async function initReturnNotificationListener() {
    try {
        if (!window.blockchainBooks || !window.blockchainBooks.libraryCoreContract) {
            console.warn('⚠️ Contracts not initialized, cannot start notification listener');
            return;
        }

        if (!window.walletState || !window.walletState.address) {
            console.warn('⚠️ Wallet not connected, cannot start notification listener');
            return;
        }

        const libraryCoreContract = window.blockchainBooks.libraryCoreContract;
        const userAddress = window.walletState.address;

        console.log('🔔 Starting return approval notification listener for:', userAddress);

        // Listen for ReturnApproved events
        const returnApprovedFilter = libraryCoreContract.filters.ReturnApproved();
        
        libraryCoreContract.on(returnApprovedFilter, async (requestId, approver, finalCondition, penalty, timestamp, event) => {
            try {
                console.log('📢 ReturnApproved event detected:', {
                    requestId: Number(requestId),
                    approver,
                    finalCondition: Number(finalCondition),
                    penalty: ethers.utils ? ethers.utils.formatEther(penalty) : ethers.formatEther(penalty),
                    timestamp: Number(timestamp)
                });

                // Get the return request details to check if it belongs to this user
                const request = await libraryCoreContract.returnRequests(requestId);
                const requestBorrower = request.borrower.toLowerCase();
                const currentUser = userAddress.toLowerCase();

                if (requestBorrower === currentUser) {
                    // This return approval is for the current user!
                    const bookId = Number(request.bookId);
                    const penaltyEth = ethers.utils ? ethers.utils.formatEther(penalty) : ethers.formatEther(penalty);
                    
                    // Get book info for better notification
                    let bookName = `Book #${bookId}`;
                    try {
                        const bookNFTContract = window.blockchainBooks.bookNFTContract;
                        if (bookNFTContract) {
                            const bookInfo = await bookNFTContract.getBookInfo(bookId);
                            bookName = bookInfo.name || bookName;
                        }
                    } catch (bookError) {
                        console.warn('Could not fetch book name:', bookError);
                    }

                    const conditionNames = ['Good', 'Fair', 'Poor', 'Damaged', 'Lost'];
                    const finalConditionName = conditionNames[Number(finalCondition)] || 'Unknown';

                    // Show notification
                    showReturnApprovedNotification({
                        bookId,
                        bookName,
                        finalCondition: finalConditionName,
                        penalty: penaltyEth,
                        approver,
                        timestamp: Number(timestamp)
                    });

                    // Auto-refresh borrowed books list if on account page
                    if (typeof loadBorrowedBooksFromBlockchain === 'function') {
                        console.log('🔄 Auto-refreshing borrowed books list...');
                        setTimeout(async () => {
                            await loadBorrowedBooksFromBlockchain(userAddress);
                        }, 2000);
                    }
                }
            } catch (error) {
                console.error('Error processing ReturnApproved event:', error);
            }
        });

        console.log('✅ Return approval notification listener started');

    } catch (error) {
        console.error('Failed to initialize return notification listener:', error);
    }
}

/**
 * Show return approved notification to user
 */
function showReturnApprovedNotification(data) {
    const { bookId, bookName, finalCondition, penalty, approver, timestamp } = data;
    
    const date = new Date(timestamp * 1000);
    const timeStr = date.toLocaleTimeString();
    const dateStr = date.toLocaleDateString();

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'return-approved-notification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 24px;
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4);
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.5s ease-out;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
            <div style="font-size: 32px; line-height: 1;">✅</div>
            <div style="flex: 1;">
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600;">
                    Return Approved!
                </h3>
                <p style="margin: 0 0 4px 0; font-size: 14px; opacity: 0.95;">
                    <strong>${bookName}</strong> (ID: ${bookId})
                </p>
                <p style="margin: 0 0 4px 0; font-size: 13px; opacity: 0.9;">
                    Final Condition: <strong>${finalCondition}</strong>
                </p>
                <p style="margin: 0 0 4px 0; font-size: 13px; opacity: 0.9;">
                    Penalty: <strong>${penalty} ETH</strong>
                </p>
                <p style="margin: 0 0 8px 0; font-size: 12px; opacity: 0.8;">
                    Approved at ${timeStr} on ${dateStr}
                </p>
                <p style="margin: 0; font-size: 11px; opacity: 0.7; font-style: italic;">
                    Your refund has been processed
                </p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: rgba(255,255,255,0.2); border: none; color: white; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; font-size: 16px; line-height: 1; padding: 0;">
                ×
            </button>
        </div>
    `;

    // Add animation styles if not already present
    if (!document.getElementById('notification-animations')) {
        const style = document.createElement('style');
        style.id = 'notification-animations';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(400px);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(400px);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);

    // Play notification sound (optional)
    playNotificationSound();

    // Auto-remove after 10 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.5s ease-in';
        setTimeout(() => {
            notification.remove();
        }, 500);
    }, 10000);

    console.log('🔔 Notification shown:', data);
}

/**
 * Play notification sound (optional)
 */
function playNotificationSound() {
    try {
        // Create a simple notification beep using Web Audio API
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 800;
        oscillator.type = 'sine';

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
    } catch (error) {
        // Silently fail if audio not supported
        console.debug('Audio notification not available:', error);
    }
}

/**
 * Stop listening for return approval events
 */
function stopReturnNotificationListener() {
    try {
        if (window.blockchainBooks && window.blockchainBooks.libraryCoreContract) {
            window.blockchainBooks.libraryCoreContract.removeAllListeners('ReturnApproved');
            console.log('🔕 Return approval notification listener stopped');
        }
    } catch (error) {
        console.error('Error stopping notification listener:', error);
    }
}

// Make functions globally available
window.initReturnNotificationListener = initReturnNotificationListener;
window.stopReturnNotificationListener = stopReturnNotificationListener;
window.showReturnApprovedNotification = showReturnApprovedNotification;

// Auto-initialize when wallet connects
window.addEventListener('walletConnected', function(event) {
    console.log('📢 Wallet connected, initializing return notification listener...');
    setTimeout(() => {
        initReturnNotificationListener();
    }, 1000);
});

// Initialize on page load if wallet already connected
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.walletState && window.walletState.address) {
            initReturnNotificationListener();
        }
    }, 2000);
});

console.log('✅ Return notification system loaded');
