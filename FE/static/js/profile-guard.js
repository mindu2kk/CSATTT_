// ========================================
// PROFILE COMPLETION GUARD
// Reusable helper to ensure users finished onboarding
// ========================================

(function () {
    const STORAGE_PREFIX = 'profileCompleted:';

    function markComplete(address, isComplete) {
        if (!address) return;
        const key = STORAGE_PREFIX + address.toLowerCase();
        if (isComplete) {
            try {
                localStorage.setItem(key, 'true');
            } catch (error) {
                console.warn('Unable to persist profile completion flag:', error);
            }
        } else {
            localStorage.removeItem(key);
        }
    }

    async function ensureProfileCompletion(options = {}) {
        const {
            actionLabel = 'thao tác này',
            redirectUrl = '/account?active_tab=profile'
        } = options;

        if (!window.walletState || !window.walletState.address) {
            if (typeof connectMetaMask === 'function') {
                await connectMetaMask();
            }
            if (!window.walletState || !window.walletState.address) {
                alert('Vui lòng kết nối ví trước khi tiếp tục.');
                return false;
            }
        }

        const address = window.walletState.address.toLowerCase();

        // ✅ PRIORITY 1: Check blockchain directly
        try {
            if (window.walletState && window.walletState.signer) {
                const userProfileAddress = "0x4C2F7092C2aE51D986bEFEe378e50BD4dB99C901";
                const userProfileAbi = [
                    "function hasActiveProfile(address user) view returns (bool)"
                ];
                
                const userProfileContract = new ethers.Contract(
                    userProfileAddress,
                    userProfileAbi,
                    window.walletState.signer
                );
                
                const hasActiveProfile = await userProfileContract.hasActiveProfile(window.walletState.address);
                console.log('🔍 Blockchain profile check:', hasActiveProfile);
                
                if (hasActiveProfile) {
                    markComplete(address, true);
                    return true;
                }
            }
        } catch (error) {
            console.warn('Failed to check blockchain profile:', error);
        }

        // PRIORITY 2: Check profileManager
        if (window.profileManager && window.profileManager.hasProfile()) {
            markComplete(address, true);
            return true;
        }

        // PRIORITY 3: Check localStorage flag
        const completionFlag = localStorage.getItem(STORAGE_PREFIX + address);
        if (completionFlag === 'true') {
            return true;
        }

        // PRIORITY 4: Fallback - check localStorage profiles
        try {
            const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
            if (profiles[address]) {
                markComplete(address, true);
                return true;
            }
        } catch (error) {
            console.warn('Cannot read local profile cache:', error);
        }

        const shouldRedirect = confirm(
            `Bạn cần hoàn thiện hồ sơ trước khi ${actionLabel}.\n` +
            `Mở trang hồ sơ ngay bây giờ?`
        );
        if (shouldRedirect) {
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                document.querySelector('[data-tab="profile"]')?.click();
            }
        }
        return false;
    }

    window.profileGuard = { markComplete };
    window.ensureProfileCompletion = ensureProfileCompletion;
})();

