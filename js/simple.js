// 🎯 ULTRA SIMPLE AUTHENTICATION - NO CONFLICTS, NO COMPLEXITY
// Version: SIMPLE-v5000 - Starting completely fresh

console.log('🚀 SIMPLE AUTH v5000 - Ultra clean start');

class SimpleApp {
    constructor() {
        this.currentUser = null;
        console.log('✅ SimpleApp initialized');
    }
    
    async initialize() {
        console.log('🔧 Setting up simple authentication...');
        
        // Setup button listeners
        this.setupButtons();
        
        // Check if user is already signed in
        await this.checkSession();
        
        console.log('✅ Simple authentication ready');
    }
    
    setupButtons() {
        // Sign In Button
        const signInBtn = document.getElementById('sign-in-btn');
        if (signInBtn) {
            signInBtn.onclick = () => this.signIn();
        }
        
        // Sign Up Button
        const signUpBtn = document.getElementById('sign-up-btn');
        if (signUpBtn) {
            signUpBtn.onclick = () => this.signUp();
        }
        
        // Sign Out Button
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) {
            signOutBtn.onclick = () => this.signOut();
        }
        
        console.log('✅ Button listeners setup');
    }
    
    async signIn() {
        try {
            console.log('🔐 SIGN IN - Starting...');
            
            const email = document.getElementById('email-input')?.value?.trim();
            const password = document.getElementById('password-input')?.value;
            
            if (!email || !password) {
                this.showMessage('Please enter email and password', 'error');
                return;
            }
            
            console.log('🔐 Calling Supabase signInWithPassword...');
            
            const { data, error } = await window.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('❌ Sign in error:', error.message);
                this.showMessage(`Sign in failed: ${error.message}`, 'error');
                return;
            }
            
            if (data.user) {
                console.log('✅ Sign in successful!');
                this.currentUser = data.user;
                this.showSignedIn(data.user);
                this.showMessage(`Welcome back, ${email}!`, 'success');
            }
            
        } catch (error) {
            console.error('❌ Sign in exception:', error);
            this.showMessage('Sign in failed. Please try again.', 'error');
        }
    }
    
    async signUp() {
        try {
            console.log('🔐 SIGN UP - Starting...');
            
            const email = document.getElementById('email-input')?.value?.trim();
            const password = document.getElementById('password-input')?.value;
            
            if (!email || !password) {
                this.showMessage('Please enter email and password', 'error');
                return;
            }
            
            console.log('🔐 Calling Supabase signUp...');
            
            const { data, error } = await window.supabase.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('❌ Sign up error:', error.message);
                this.showMessage(`Sign up failed: ${error.message}`, 'error');
                return;
            }
            
            if (data.user) {
                console.log('✅ Sign up successful!');
                this.showMessage('Account created successfully!', 'success');
            }
            
        } catch (error) {
            console.error('❌ Sign up exception:', error);
            this.showMessage('Sign up failed. Please try again.', 'error');
        }
    }
    
    async signOut() {
        try {
            console.log('🔐 SIGN OUT - Starting...');
            
            const { error } = await window.supabase.auth.signOut();
            
            if (error) {
                console.error('❌ Sign out error:', error.message);
                this.showMessage('Sign out failed', 'error');
                return;
            }
            
            console.log('✅ Sign out successful!');
            this.currentUser = null;
            this.showSignedOut();
            this.showMessage('Signed out successfully', 'success');
            
        } catch (error) {
            console.error('❌ Sign out exception:', error);
            this.showMessage('Sign out failed', 'error');
        }
    }
    
    async checkSession() {
        try {
            console.log('🔍 Checking existing session...');
            
            const { data: { session } } = await window.supabase.auth.getSession();
            
            if (session && session.user) {
                console.log('✅ Found existing session:', session.user.email);
                this.currentUser = session.user;
                this.showSignedIn(session.user);
            } else {
                console.log('ℹ️ No existing session');
                this.showSignedOut();
            }
            
        } catch (error) {
            console.error('❌ Session check error:', error);
            this.showSignedOut();
        }
    }
    
    showSignedIn(user) {
        console.log('📱 Showing signed-in UI');
        
        // Hide auth form
        const authForm = document.getElementById('auth-form');
        if (authForm) authForm.style.display = 'none';
        
        // Show signed-in controls
        const signedInControls = document.getElementById('signed-in-controls');
        if (signedInControls) signedInControls.style.display = 'block';
        
        // Show user email
        const userEmail = document.getElementById('user-email');
        if (userEmail) userEmail.textContent = user.email;
        
        // Make sure sign out button says "Sign Out"
        const signOutBtn = document.getElementById('sign-out-btn');
        if (signOutBtn) signOutBtn.textContent = 'Sign Out';
    }
    
    showSignedOut() {
        console.log('📱 Showing signed-out UI');
        
        // Show auth form
        const authForm = document.getElementById('auth-form');
        if (authForm) authForm.style.display = 'block';
        
        // Hide signed-in controls
        const signedInControls = document.getElementById('signed-in-controls');
        if (signedInControls) signedInControls.style.display = 'none';
    }
    
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

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🌟 DOM loaded - Starting SIMPLE app...');
    
    window.simpleApp = new SimpleApp();
    await window.simpleApp.initialize();
});

console.log('📜 SIMPLE AUTH v5000 script loaded');