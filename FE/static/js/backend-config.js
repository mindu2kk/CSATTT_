// ========================================
// BACKEND CONFIGURATION
// ========================================
// Switch between direct blockchain calls and Java backend API

window.backendConfig = {
    // Set to 'java' to use Java Spring Boot backend
    // Set to 'direct' to use direct blockchain calls (current default)
    mode: 'direct', // 'direct' | 'java'
    
    javaApiUrl: 'http://localhost:8081/api/blockchain',
    
    /**
     * Check which backend is available and auto-switch if needed
     */
    async detectBackend() {
        // Try Java backend first
        try {
            const response = await fetch(`${this.javaApiUrl}/status`, {
                method: 'GET',
                signal: AbortSignal.timeout(2000) // 2 second timeout
            });
            if (response.ok) {
                console.log('✅ Java backend detected and available');
                return 'java';
            }
        } catch (error) {
            console.log('⚠️ Java backend not available, using direct blockchain');
        }
        
        // Fallback to direct blockchain
        return 'direct';
    },
    
    /**
     * Get the active backend mode
     */
    async getMode() {
        if (this.mode === 'auto') {
            return await this.detectBackend();
        }
        return this.mode;
    },
    
    /**
     * Set backend mode
     */
    setMode(mode) {
        if (['direct', 'java', 'auto'].includes(mode)) {
            this.mode = mode;
            console.log(`🔧 Backend mode set to: ${mode}`);
        } else {
            console.warn(`Invalid backend mode: ${mode}. Use 'direct', 'java', or 'auto'`);
        }
    }
};

// Auto-detect on load if mode is 'auto'
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', async () => {
        if (window.backendConfig.mode === 'auto') {
            const detected = await window.backendConfig.detectBackend();
            window.backendConfig.setMode(detected);
        }
    });
}

