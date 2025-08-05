// 🎯 CLEAN CHRONICOMPANION - NO CONFLICTS, FOLLOWING SUPABASE DOCS EXACTLY
// Version: CLEAN-AUTH-v3000
// Removed ALL old conflicting code, Google Auth, complex fallbacks
// Simple email authentication only - exactly as Supabase recommends

class ChroniCompanionApp {
    constructor() {
        this.auth = null;
        this.currentUser = null;
        
        console.log('🚀 ChroniCompanion Clean Authentication - v3000');
        console.log('🧹 All old conflicting code removed');
        console.log('📋 Following Supabase docs exactly');
    }
    
    // ✅ INITIALIZE - Simple and clean
    async initialize() {
        try {
            console.log('🔧 Initializing Supabase...');
            
            // Wait for Supabase to be available
            if (!window.supabase) {
                throw new Error('Supabase client not available');
            }
            
            // Initialize clean authentication
            this.auth = new CleanAuth(window.supabase);
            
            // Setup event listeners
            this.setupEventListeners();
            
            console.log('✅ ChroniCompanion initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            this.showMessage('App initialization failed. Please refresh the page.', 'error');
        }
    }
    
    // ✅ SETUP EVENT LISTENERS - Clear and simple
    setupEventListeners() {
        // Sign In Button
        const signInBtn = document.getElementById('sign-in-btn');
        if (signInBtn) {
            signInBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignIn();
            });
        }
        
        // Sign Up Button  
        const signUpBtn = document.getElementById('sign-up-btn');
        if (signUpBtn) {
            signUpBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignUp();
            });
        }
        
        // Sign Out Button
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleSignOut();
            });
        }
        
        console.log('✅ Event listeners setup complete');
    }
    
    // ✅ HANDLE SIGN IN - Only signs in, never creates accounts
    async handleSignIn() {
        try {
            const email = document.getElementById('email-input')?.value?.trim();
            const password = document.getElementById('password-input')?.value;
            
            if (!email || !password) {
                this.showMessage('Please enter both email and password', 'error');
                return;
            }
            
            if (password.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            console.log('🔐 Sign In button clicked - SIGNING IN ONLY');
            await this.auth.signIn(email, password);
            
        } catch (error) {
            console.error('❌ Sign in handler error:', error);
            this.showMessage('Sign in failed. Please try again.', 'error');
        }
    }
    
    // ✅ HANDLE SIGN UP - Only creates accounts, never signs in existing users
    async handleSignUp() {
        try {
            const email = document.getElementById('email-input')?.value?.trim();
            const password = document.getElementById('password-input')?.value;
            
            if (!email || !password) {
                this.showMessage('Please enter both email and password', 'error');
                return;
            }
            
            if (password.length < 6) {
                this.showMessage('Password must be at least 6 characters', 'error');
                return;
            }
            
            console.log('🔐 Sign Up button clicked - CREATING NEW ACCOUNT ONLY');
            await this.auth.signUp(email, password);
            
        } catch (error) {
            console.error('❌ Sign up handler error:', error);
            this.showMessage('Sign up failed. Please try again.', 'error');
        }
    }
    
    // ✅ HANDLE SIGN OUT
    async handleSignOut() {
        try {
            console.log('🔐 Sign Out button clicked');
            await this.auth.signOut();
            
        } catch (error) {
            console.error('❌ Sign out handler error:', error);
            this.showMessage('Sign out failed. Please try again.', 'error');
        }
    }
    
    // ✅ SHOW MESSAGES - Simple utility
    showMessage(message, type) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
            messageEl.style.display = 'block';
            
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }
}

// ✅ INITIALIZE WHEN DOM IS READY
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 DOM loaded - Starting clean app...');
    
    window.app = new ChroniCompanionApp();
    await window.app.initialize();
});

// ✅ GLOBAL FUNCTIONS FOR HTML BUTTONS (if needed)
window.signIn = () => window.app?.handleSignIn();
window.signUp = () => window.app?.handleSignUp(); 
window.signOut = () => window.app?.handleSignOut();