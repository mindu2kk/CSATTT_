/**
 * Blockchain Profile Management
 * Handles on-chain user profiles with privacy features
 */

class BlockchainProfileManager {
    constructor() {
        this.userProfileContract = null;
        this.libraryCoreContract = null;
        this.currentWallet = null;
        this.currentProfile = null;
        this.init();
    }

    async init() {
        console.log('Initializing Blockchain Profile Manager...');
        await this.loadContracts();
    }

    async loadContracts() {
        try {
            // Load contract addresses
            const response = await fetch('./contracts.json');
            const contracts = await response.json();
            
            if (!contracts.userProfile) {
                console.log('UserProfile contract not deployed yet');
                return;
            }

            // UserProfile ABI
            const USER_PROFILE_ABI = [
                "function createProfile(string memory _name, string memory _emailHash, string memory _studentId) external",
                "function updateProfile(string memory _name, string memory _emailHash, string memory _studentId) external",
                "function getProfile(address _user) external view returns (tuple(string name, string email, string studentId, uint256 createdAt, uint256 updatedAt, bool isActive, uint256 reputation))",
                "function hasActiveProfile(address _user) external view returns (bool)",
                "function getUserStats() external view returns (uint256, uint256)",
                "function deactivateProfile() external",
                "event ProfileCreated(address indexed user, string name, string studentId, uint256 timestamp)",
                "event ProfileUpdated(address indexed user, string name, string studentId, uint256 timestamp)"
            ];

            // Initialize contracts when provider is available
            if (window.ethereum && window.provider) {
                this.userProfileContract = new ethers.Contract(
                    contracts.userProfile,
                    USER_PROFILE_ABI,
                    window.signer
                );
                console.log('UserProfile contract loaded:', contracts.userProfile);
            }

        } catch (error) {
            console.error('Error loading contracts:', error);
        }
    }

    // Hash email for privacy
    hashEmail(email) {
        return ethers.keccak256(ethers.toUtf8Bytes(email.toLowerCase().trim()));
    }

    // Check if user has on-chain profile
    async hasOnChainProfile(walletAddress) {
        try {
            if (!this.userProfileContract) {
                await this.loadContracts();
            }
            
            if (!this.userProfileContract) {
                return false;
            }

            return await this.userProfileContract.hasActiveProfile(walletAddress);
        } catch (error) {
            console.error('Error checking profile:', error);
            return false;
        }
    }

    // Get on-chain profile
    async getOnChainProfile(walletAddress) {
        try {
            if (!this.userProfileContract) {
                return null;
            }

            const hasProfile = await this.hasOnChainProfile(walletAddress);
            if (!hasProfile) {
                return null;
            }

            const profile = await this.userProfileContract.getProfile(walletAddress);
            
            return {
                name: profile.name,
                emailHash: profile.email,
                studentId: profile.studentId,
                createdAt: new Date(Number(profile.createdAt) * 1000),
                updatedAt: new Date(Number(profile.updatedAt) * 1000),
                isActive: profile.isActive,
                reputation: Number(profile.reputation),
                walletAddress: walletAddress
            };
        } catch (error) {
            console.error('Error getting profile:', error);
            return null;
        }
    }

    // Create on-chain profile
    async createOnChainProfile(profileData) {
        try {
            if (!this.userProfileContract) {
                throw new Error('UserProfile contract not available');
            }

            // Validate required fields
            if (!profileData.name || !profileData.email) {
                throw new Error('Name and email are required');
            }

            // Hash email for privacy
            const emailHash = this.hashEmail(profileData.email);
            
            console.log('Creating on-chain profile...');
            console.log('Name:', profileData.name);
            console.log('Email Hash:', emailHash);
            console.log('Student ID:', profileData.studentId || '');

            // Estimate gas
            const gasEstimate = await this.userProfileContract.createProfile.estimateGas(
                profileData.name,
                emailHash,
                profileData.studentId || ''
            );

            console.log('Estimated gas:', gasEstimate.toString());

            // Create profile transaction
            const tx = await this.userProfileContract.createProfile(
                profileData.name,
                emailHash,
                profileData.studentId || '',
                {
                    gasLimit: gasEstimate * 120n / 100n // Add 20% buffer
                }
            );

            console.log('Transaction sent:', tx.hash);
            
            // Wait for confirmation
            const receipt = await tx.wait();
            console.log('Profile created successfully!');
            console.log('Gas used:', receipt.gasUsed.toString());
            console.log('Block number:', receipt.blockNumber);

            return {
                success: true,
                txHash: tx.hash,
                gasUsed: receipt.gasUsed.toString(),
                blockNumber: receipt.blockNumber
            };

        } catch (error) {
            console.error('Error creating profile:', error);
            
            // Parse error message
            let errorMessage = error.message;
            if (error.reason) {
                errorMessage = error.reason;
            } else if (error.data && error.data.message) {
                errorMessage = error.data.message;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    }

    // Update on-chain profile
    async updateOnChainProfile(profileData) {
        try {
            if (!this.userProfileContract) {
                throw new Error('UserProfile contract not available');
            }

            const emailHash = this.hashEmail(profileData.email);
            
            console.log('Updating on-chain profile...');

            const tx = await this.userProfileContract.updateProfile(
                profileData.name,
                emailHash,
                profileData.studentId || ''
            );

            console.log('Update transaction sent:', tx.hash);
            const receipt = await tx.wait();
            console.log('Profile updated successfully!');

            return {
                success: true,
                txHash: tx.hash,
                gasUsed: receipt.gasUsed.toString()
            };

        } catch (error) {
            console.error('Error updating profile:', error);
            return {
                success: false,
                error: error.reason || error.message
            };
        }
    }

    // Get user statistics
    async getUserStats() {
        try {
            if (!this.userProfileContract) {
                return { totalUsers: 0, activeUsers: 0 };
            }

            const [totalUsers, activeUsers] = await this.userProfileContract.getUserStats();
            return {
                totalUsers: Number(totalUsers),
                activeUsers: Number(activeUsers)
            };
        } catch (error) {
            console.error('Error getting user stats:', error);
            return { totalUsers: 0, activeUsers: 0 };
        }
    }

    // Hybrid profile management: combine on-chain + off-chain
    async getHybridProfile(walletAddress) {
        // Get on-chain profile (basic info)
        const onChainProfile = await this.getOnChainProfile(walletAddress);
        
        // Get off-chain profile (detailed info) from localStorage
        const offChainProfile = this.getOffChainProfile(walletAddress);
        
        if (!onChainProfile && !offChainProfile) {
            return null;
        }

        // Merge profiles
        return {
            // On-chain data (authoritative)
            name: onChainProfile?.name || offChainProfile?.fullName || '',
            studentId: onChainProfile?.studentId || offChainProfile?.studentId || '',
            reputation: onChainProfile?.reputation || 0,
            createdAt: onChainProfile?.createdAt || offChainProfile?.createdAt,
            isOnChain: !!onChainProfile,
            
            // Off-chain data (detailed)
            email: offChainProfile?.email || '',
            phone: offChainProfile?.phone || '',
            address: offChainProfile?.address || '',
            
            // Metadata
            walletAddress: walletAddress,
            lastSync: new Date().toISOString()
        };
    }

    // Get off-chain profile from localStorage
    getOffChainProfile(walletAddress) {
        try {
            const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
            return profiles[walletAddress.toLowerCase()] || null;
        } catch (error) {
            console.error('Error getting off-chain profile:', error);
            return null;
        }
    }

    // Save off-chain profile to localStorage
    saveOffChainProfile(walletAddress, profileData) {
        try {
            const profiles = JSON.parse(localStorage.getItem('userProfiles') || '{}');
            profiles[walletAddress.toLowerCase()] = {
                ...profileData,
                walletAddress: walletAddress,
                updatedAt: new Date().toISOString()
            };
            localStorage.setItem('userProfiles', JSON.stringify(profiles));
            return true;
        } catch (error) {
            console.error('Error saving off-chain profile:', error);
            return false;
        }
    }

    // Create hybrid profile (on-chain + off-chain)
    async createHybridProfile(profileData) {
        const results = {
            onChain: { success: false },
            offChain: { success: false }
        };

        try {
            // 1. Save detailed info off-chain first
            results.offChain.success = this.saveOffChainProfile(
                profileData.walletAddress,
                profileData
            );

            // 2. Create basic profile on-chain
            if (this.userProfileContract) {
                results.onChain = await this.createOnChainProfile(profileData);
            } else {
                results.onChain = {
                    success: false,
                    error: 'Blockchain not available - saved locally only'
                };
            }

            return results;

        } catch (error) {
            console.error('Error creating hybrid profile:', error);
            return results;
        }
    }

    // Sync profiles: update on-chain if off-chain exists
    async syncProfiles(walletAddress) {
        try {
            const offChainProfile = this.getOffChainProfile(walletAddress);
            const hasOnChain = await this.hasOnChainProfile(walletAddress);

            if (offChainProfile && !hasOnChain && this.userProfileContract) {
                console.log('Syncing off-chain profile to blockchain...');
                return await this.createOnChainProfile(offChainProfile);
            }

            return { success: true, message: 'Profiles already synced' };
        } catch (error) {
            console.error('Error syncing profiles:', error);
            return { success: false, error: error.message };
        }
    }
}

// Initialize blockchain profile manager
window.blockchainProfileManager = new BlockchainProfileManager();

console.log('Blockchain Profile Manager loaded');