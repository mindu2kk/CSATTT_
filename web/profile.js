/**
 * User Profile Management System
 * Handles user profile creation, editing, and display
 */

class ProfileManager {
    constructor() {
        this.currentProfile = null;
        this.walletAddress = null;
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.bindEvents();
                this.loadProfile();
            });
        } else {
            this.bindEvents();
            this.loadProfile();
        }
    }

    bindEvents() {
        console.log('Binding profile events...');
        
        // Use setTimeout to ensure elements exist
        setTimeout(() => {
            // Profile form submission
            const profileForm = document.getElementById('profileForm');
            if (profileForm) {
                profileForm.addEventListener('submit', (e) => this.handleProfileSubmit(e));
                console.log('Profile form event bound');
            } else {
                console.log('Profile form not found');
            }

            // Edit profile button
            const editProfileBtn = document.getElementById('editProfile');
            if (editProfileBtn) {
                editProfileBtn.addEventListener('click', () => this.showEditProfile());
                console.log('Edit profile button event bound');
            }

            // Cancel profile button
            const cancelProfileBtn = document.getElementById('cancelProfile');
            if (cancelProfileBtn) {
                cancelProfileBtn.addEventListener('click', () => this.hideProfileSetup());
                console.log('Cancel profile button event bound');
            }

            // Refresh profile button
            const refreshProfileBtn = document.getElementById('refreshProfile');
            if (refreshProfileBtn) {
                refreshProfileBtn.addEventListener('click', () => this.refreshProfile());
                console.log('Refresh profile button event bound');
            }

            // Export profile button
            const exportProfileBtn = document.getElementById('exportProfile');
            if (exportProfileBtn) {
                exportProfileBtn.addEventListener('click', () => this.exportProfile());
                console.log('Export profile button event bound');
            }
        }, 100);
    }

    // Check if user has a profile when wallet connects
    async checkProfileOnConnect(walletAddress) {
        console.log('Checking profile for wallet:', walletAddress);
        this.walletAddress = walletAddress;
        
        // Check both on-chain and off-chain profiles
        let profile = null;
        
        if (window.blockchainProfileManager) {
            // Try to get hybrid profile (on-chain + off-chain)
            profile = await window.blockchainProfileManager.getHybridProfile(walletAddress);
            console.log('Hybrid profile:', profile);
        }
        
        // Fallback to localStorage profile
        if (!profile) {
            profile = this.getStoredProfile(walletAddress);
            console.log('LocalStorage profile:', profile);
        }
        
        if (profile) {
            this.currentProfile = profile;
            this.displayProfile();
            this.updateHeaderStatus(true, profile.name || profile.fullName);
        } else {
            console.log('No profile found, showing setup');
            this.showProfileSetup();
            this.updateHeaderStatus(false);
        }
    }

    // Show profile setup form
    showProfileSetup() {
        console.log('Showing profile setup form');
        const setupEl = document.getElementById('profileSetup');
        const displayEl = document.getElementById('profileDisplay');
        
        if (setupEl) {
            setupEl.style.display = 'block';
            console.log('Profile setup form shown');
        } else {
            console.error('Profile setup element not found');
        }
        
        if (displayEl) {
            displayEl.style.display = 'none';
        }
    }

    // Hide profile setup form
    hideProfileSetup() {
        console.log('Hiding profile setup form');
        const setupEl = document.getElementById('profileSetup');
        const displayEl = document.getElementById('profileDisplay');
        
        if (setupEl) {
            setupEl.style.display = 'none';
        }
        
        if (displayEl) {
            displayEl.style.display = 'block';
            console.log('Profile display shown');
        } else {
            console.error('Profile display element not found');
        }
    }

    // Show edit profile (populate form with existing data)
    showEditProfile() {
        if (!this.currentProfile) return;

        // Populate form with current data
        document.getElementById('fullName').value = this.currentProfile.fullName || '';
        document.getElementById('email').value = this.currentProfile.email || '';
        document.getElementById('phone').value = this.currentProfile.phone || '';
        document.getElementById('address').value = this.currentProfile.address || '';
        document.getElementById('studentId').value = this.currentProfile.studentId || '';

        this.showProfileSetup();
    }

    // Handle profile form submission
    async handleProfileSubmit(e) {
        e.preventDefault();
        console.log('Profile form submitted');
        
        // For testing, use a dummy wallet address if none exists
        if (!this.walletAddress) {
            this.walletAddress = '0x1234567890123456789012345678901234567890';
            console.log('Using test wallet address');
        }

        const formData = new FormData(e.target);
        const profileData = {
            fullName: formData.get('fullName'),
            name: formData.get('fullName'), // For blockchain compatibility
            email: formData.get('email'),
            phone: formData.get('phone'),
            address: formData.get('address'),
            studentId: formData.get('studentId'),
            walletAddress: this.walletAddress,
            createdAt: this.currentProfile?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        console.log('Profile data:', profileData);

        // Validate required fields
        if (!profileData.fullName || !profileData.email) {
            this.showMessage('Please fill in all required fields!', 'error');
            return;
        }

        // Show loading message
        this.showMessage('Saving profile...', 'info');

        try {
            // Save using hybrid approach (blockchain + localStorage)
            if (window.blockchainProfileManager) {
                console.log('Saving hybrid profile...');
                const results = await window.blockchainProfileManager.createHybridProfile(profileData);
                
                if (results.onChain.success) {
                    this.showMessage('✅ Profile saved on blockchain!', 'success');
                } else if (results.offChain.success) {
                    this.showMessage('📱 Profile saved locally (blockchain unavailable)', 'warning');
                } else {
                    throw new Error('Failed to save profile');
                }
                
                console.log('Hybrid save results:', results);
            } else {
                // Fallback to localStorage only
                this.saveProfile(profileData);
                this.showMessage('Profile saved locally!', 'success');
            }

            this.currentProfile = profileData;
            
            // Update header status
            this.updateHeaderStatus(true, profileData.fullName);
            
            // Hide form and show profile
            setTimeout(() => {
                this.hideProfileSetup();
                this.displayProfile();
            }, 2000);

        } catch (error) {
            console.error('Error saving profile:', error);
            this.showMessage('❌ Error saving profile: ' + error.message, 'error');
        }
    }

    // Save profile to localStorage (in production, this would be saved to backend/IPFS)
    saveProfile(profileData) {
        const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
        profiles[this.walletAddress.toLowerCase()] = profileData;
        localStorage.setItem('userProfiles', JSON.stringify(profiles));
    }

    // Get stored profile
    getStoredProfile(walletAddress) {
        const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
        return profiles[walletAddress.toLowerCase()] || null;
    }

    // Display profile information
    displayProfile() {
        if (!this.currentProfile) return;

        // Update profile display
        document.getElementById('profileName').textContent = this.currentProfile.name || this.currentProfile.fullName || '-';
        document.getElementById('profileEmail').textContent = this.currentProfile.email || '-';
        document.getElementById('profilePhone').textContent = this.currentProfile.phone || '-';
        document.getElementById('profileAddress').textContent = this.currentProfile.address || '-';
        document.getElementById('profileStudentId').textContent = this.currentProfile.studentId || '-';
        document.getElementById('profileWallet').textContent = this.formatAddress(this.walletAddress);
        
        // Format member since date
        if (this.currentProfile.createdAt) {
            const date = new Date(this.currentProfile.createdAt);
            document.getElementById('profileMemberSince').textContent = date.toLocaleDateString();
        }

        // Update blockchain status
        this.updateBlockchainStatus();

        // Load library statistics
        this.loadLibraryStats();
    }

    // Update blockchain profile status
    async updateBlockchainStatus() {
        const statusEl = document.getElementById('blockchainStatus');
        if (!statusEl) return;

        try {
            if (window.blockchainProfileManager && this.walletAddress) {
                const hasOnChain = await window.blockchainProfileManager.hasOnChainProfile(this.walletAddress);
                
                if (hasOnChain) {
                    statusEl.innerHTML = '✅ On blockchain';
                    statusEl.style.color = '#27ae60';
                } else {
                    statusEl.innerHTML = '📱 Local only';
                    statusEl.style.color = '#f39c12';
                }
            } else {
                statusEl.innerHTML = '❌ Not available';
                statusEl.style.color = '#e74c3c';
            }
        } catch (error) {
            console.error('Error updating blockchain status:', error);
            statusEl.innerHTML = '❌ Error checking';
            statusEl.style.color = '#e74c3c';
        }
    }

    // Load library statistics from blockchain
    async loadLibraryStats() {
        try {
            if (!window.libraryCore || !this.walletAddress) return;

            // Get reputation
            const reputation = await window.libraryCore.getReputation(this.walletAddress);
            document.getElementById('profileReputation').textContent = reputation.toString();

            // Get user's loan history (this would need to be implemented in the contract)
            // For now, we'll use mock data
            this.updateMockStats();

        } catch (error) {
            console.error('Error loading library stats:', error);
            this.updateMockStats();
        }
    }

    // Update with mock statistics (replace with real data when available)
    updateMockStats() {
        // These would come from blockchain events or backend API
        const mockStats = {
            totalBorrows: Math.floor(Math.random() * 20) + 1,
            currentBorrows: Math.floor(Math.random() * 3),
            onTimeReturns: Math.floor(Math.random() * 18) + 1
        };

        document.getElementById('totalBorrows').textContent = mockStats.totalBorrows;
        document.getElementById('currentBorrows').textContent = mockStats.currentBorrows;
        document.getElementById('onTimeReturns').textContent = mockStats.onTimeReturns;
    }

    // Load profile on page load
    loadProfile() {
        // This will be called when the page loads
        // Profile will be loaded when wallet connects
    }

    // Refresh profile data
    async refreshProfile() {
        if (!this.walletAddress) return;

        this.showMessage('Refreshing profile...', 'info');
        
        // Reload profile data
        this.currentProfile = this.getStoredProfile(this.walletAddress);
        if (this.currentProfile) {
            this.displayProfile();
            this.showMessage('Profile refreshed!', 'success');
        } else {
            this.showMessage('No profile found. Please create one.', 'warning');
            this.showProfileSetup();
        }
    }

    // Export profile data
    exportProfile() {
        if (!this.currentProfile) {
            this.showMessage('No profile to export!', 'error');
            return;
        }

        const exportData = {
            ...this.currentProfile,
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `profile_${this.walletAddress.slice(0, 8)}.json`;
        link.click();

        this.showMessage('Profile exported successfully!', 'success');
    }

    // Utility function to format wallet address
    formatAddress(address) {
        if (!address) return '-';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }

    // Show message to user
    showMessage(message, type = 'info') {
        // Create or update message element
        let messageEl = document.getElementById('profileMessage');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'profileMessage';
            messageEl.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                border-radius: 8px;
                color: white;
                font-weight: 500;
                z-index: 1000;
                max-width: 300px;
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            `;
            document.body.appendChild(messageEl);
        }

        // Set message and style based on type
        messageEl.textContent = message;
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };
        messageEl.style.backgroundColor = colors[type] || colors.info;
        messageEl.style.display = 'block';

        // Auto hide after 3 seconds
        setTimeout(() => {
            if (messageEl) {
                messageEl.style.display = 'none';
            }
        }, 3000);
    }

    // Get current profile
    getCurrentProfile() {
        return this.currentProfile;
    }

    // Check if user has profile
    hasProfile() {
        return !!this.currentProfile;
    }

    // Update profile status in header
    updateHeaderStatus(hasProfile, userName = null) {
        const profileStatus = document.getElementById('profileStatus');
        const userNameEl = document.getElementById('userName');
        
        if (profileStatus) {
            if (hasProfile) {
                profileStatus.innerHTML = '<span class="profile-badge complete">✅ Profile Complete</span>';
                if (userName && userNameEl) {
                    userNameEl.textContent = userName;
                }
            } else {
                profileStatus.innerHTML = '<span class="profile-badge incomplete" onclick="document.querySelector(\'[data-tab=&quot;profile&quot;]\').click()">📝 Complete Profile</span>';
                if (userNameEl) {
                    userNameEl.textContent = '';
                }
            }
            profileStatus.style.display = 'block';
        }
    }

    // Test function to manually trigger profile setup
    testProfileSetup() {
        console.log('Testing profile setup...');
        this.walletAddress = '0x1234567890123456789012345678901234567890'; // Test address
        this.showProfileSetup();
    }

    // Debug function to check elements
    debugElements() {
        console.log('=== Profile System Debug ===');
        console.log('profileSetup element:', document.getElementById('profileSetup'));
        console.log('profileDisplay element:', document.getElementById('profileDisplay'));
        console.log('profileForm element:', document.getElementById('profileForm'));
        console.log('editProfile button:', document.getElementById('editProfile'));
        console.log('Current profile:', this.currentProfile);
        console.log('Wallet address:', this.walletAddress);
    }
}

// Initialize profile manager
window.profileManager = new ProfileManager();

console.log('Profile management system loaded');