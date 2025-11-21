// Authentication Module for Library Blockchain
console.log('Auth module loaded');

// Google OAuth Configuration
let googleUser = null;

// Initialize Google Sign-In
function initGoogleAuth() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.initialize({
            client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
            callback: handleGoogleSignIn
        });
        
        // Render Google Sign-In button if element exists
        const googleButton = document.getElementById('google-signin-button');
        if (googleButton) {
            google.accounts.id.renderButton(
                googleButton,
                { theme: 'outline', size: 'large' }
            );
        }
    }
}

// Handle Google Sign-In
function handleGoogleSignIn(response) {
    console.log('Google Sign-In response:', response);
    
    // Decode JWT token
    const payload = parseJwt(response.credential);
    googleUser = {
        email: payload.email,
        name: payload.name,
        picture: payload.picture
    };
    
    console.log('User signed in:', googleUser);
    
    // Update UI
    updateAuthUI(true);
    
    // Store session
    localStorage.setItem('user', JSON.stringify(googleUser));
}

// Parse JWT token
function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error parsing JWT:', e);
        return {};
    }
}

// Update Authentication UI
function updateAuthUI(isSignedIn) {
    const signInSection = document.getElementById('auth-section');
    const userSection = document.getElementById('user-section');
    const userInfo = document.getElementById('user-info');
    
    if (isSignedIn && googleUser) {
        if (signInSection) signInSection.style.display = 'none';
        if (userSection) userSection.style.display = 'block';
        if (userInfo) {
            userInfo.innerHTML = `
                <img src="${googleUser.picture}" alt="Profile" style="width: 32px; height: 32px; border-radius: 50%; margin-right: 10px;">
                <span>${googleUser.name}</span>
            `;
        }
    } else {
        if (signInSection) signInSection.style.display = 'block';
        if (userSection) userSection.style.display = 'none';
    }
}

// Sign Out
function signOut() {
    if (typeof google !== 'undefined' && google.accounts) {
        google.accounts.id.disableAutoSelect();
    }
    googleUser = null;
    localStorage.removeItem('user');
    updateAuthUI(false);
    console.log('User signed out');
}

// Check if user is already signed in
function checkAuthStatus() {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
        try {
            googleUser = JSON.parse(storedUser);
            updateAuthUI(true);
        } catch (e) {
            console.error('Error loading stored user:', e);
            localStorage.removeItem('user');
        }
    }
}

// MetaMask Authentication (Alternative)
async function connectMetaMask() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ 
                method: 'eth_requestAccounts' 
            });
            
            const account = accounts[0];
            console.log('MetaMask connected:', account);
            
            // Store MetaMask user
            const metamaskUser = {
                address: account,
                type: 'metamask'
            };
            
            localStorage.setItem('user', JSON.stringify(metamaskUser));
            updateAuthUI(true);
            
            return account;
        } catch (error) {
            console.error('MetaMask connection error:', error);
            alert('Failed to connect MetaMask: ' + error.message);
        }
    } else {
        alert('MetaMask is not installed. Please install MetaMask extension.');
    }
}

// Get current user
function getCurrentUser() {
    return googleUser || JSON.parse(localStorage.getItem('user') || 'null');
}

// Check if user is authenticated
function isAuthenticated() {
    return getCurrentUser() !== null;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing authentication...');
    checkAuthStatus();
    
    // Initialize Google Auth after a short delay
    setTimeout(initGoogleAuth, 500);
    
    // Setup sign out button
    const signOutBtn = document.getElementById('sign-out-btn');
    if (signOutBtn) {
        signOutBtn.addEventListener('click', signOut);
    }
    
    // Setup MetaMask button
    const metamaskBtn = document.getElementById('metamask-signin-button');
    if (metamaskBtn) {
        metamaskBtn.addEventListener('click', connectMetaMask);
    }
});

// Export functions for use in other scripts
window.auth = {
    getCurrentUser,
    isAuthenticated,
    signOut,
    connectMetaMask,
    initGoogleAuth
};
