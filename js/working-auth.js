// WORKING EMAIL AUTHENTICATION - Based on commit b91f34e
// This version was confirmed working by the user!
console.log('🔥 WORKING-AUTH-v1007 LOADING! 🔥');
console.log('✅ Based on the last confirmed working version');

class WorkingAuth {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        this.authInitialized = false;
        console.log('✅ WorkingAuth initialized');
    }

    async init() {
        try {
            console.log('🚀 Initializing working authentication...');
            await this.setupAuthStateListener();
            await this.checkCurrentUser();
            this.authInitialized = true;
            console.log('✅ Working authentication ready!');
        } catch (error) {
            console.error('❌ Working auth initialization failed:', error);
            this.authInitialized = false;
        }
    }

    async setupAuthStateListener() {
        console.log('🎯 Setting up Supabase auth state listener...');
        
        if (!this.supabase) {
            console.error('❌ Supabase not available for auth listener');
            return;
        }
        
        // Listen for auth state changes
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔄 Auth state changed:', event, session?.user?.email);
            
            if (event === 'SIGNED_IN' && session?.user) {
                console.log('✅ User signed in:', session.user.email);
                this.currentUser = session.user;
                this.updateAuthUI(true, session.user);
                this.showMessage(`Welcome back, ${session.user.email}!`, 'success');
            } else if (event === 'SIGNED_OUT') {
                console.log('👋 User signed out');
                this.currentUser = null;
                this.updateAuthUI(false, null);
                this.showMessage('Signed out successfully', 'info');
            }
        });
    }

    async checkCurrentUser() {
        try {
            console.log('🔍 Checking current user session...');
            const { data: { session }, error } = await this.supabase.auth.getSession();
            
            if (error) {
                console.error('❌ Error checking session:', error);
                return;
            }
            
            if (session?.user) {
                console.log('✅ Found existing session:', session.user.email);
                this.currentUser = session.user;
                this.updateAuthUI(true, session.user);
            } else {
                console.log('ℹ️ No existing session found');
                this.updateAuthUI(false, null);
            }
        } catch (error) {
            console.error('❌ Error in checkCurrentUser:', error);
            this.updateAuthUI(false, null);
        }
    }

    // THE WORKING EMAIL AUTHENTICATION FUNCTION!
    async signInWithEmail() {
        try {
            console.log('📧 EMAIL AUTH: Starting email authentication...');

            if (!this.supabase) {
                console.error('❌ Supabase not available');
                this.showMessage('Supabase not available', 'error');
                return;
            }

            // Get email and password from form
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

            console.log('📧 EMAIL AUTH: Attempting sign in with:', email);
            this.showMessage('Signing in...', 'info');

            // Try to sign in with existing account FIRST
            console.log('📧 EMAIL AUTH: Attempting sign-in for existing account...');
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.log('📧 EMAIL AUTH: Sign-in failed:', error.message);
                
                // Enhanced error logging for mobile debugging
                console.error('❌ Sign-in error details:', {
                    message: error.message,
                    status: error.status,
                    statusCode: error.status,
                    name: error.name,
                    cause: error.cause,
                    details: error
                });
                
                // Check for mobile-specific issues
                const isMobile = window.Capacitor && window.Capacitor.getPlatform() !== 'web';
                if (isMobile) {
                    console.log('📱 MOBILE AUTH ERROR - Additional context:', {
                        platform: window.Capacitor.getPlatform(),
                        storageAvailable: !!window.mobileStorage,
                        supabaseConfigured: !!window.supabase,
                        storageType: window.mobileStorage ? 'mobile-aware' : 'default'
                    });
                    
                    // Test storage if available
                    if (window.mobileStorage) {
                        try {
                            const storageTest = await window.mobileStorage.checkStorageHealth();
                            console.log('📱 Mobile storage health during auth error:', storageTest);
                        } catch (storageError) {
                            console.error('📱 Mobile storage test failed:', storageError);
                        }
                    }
                }
                
                // Don't auto-create accounts - just show the error
                // This prevents "account created" messages for existing users
                this.showMessage(`Sign-in failed: ${error.message}. Please check your email and password.`, 'error');
                return;
            }

            if (data?.user) {
                console.log('✅ EMAIL AUTH: Sign-in successful');
                this.currentUser = data.user;
                this.updateAuthUI(true, data.user);
                this.showMessage(`Welcome back, ${data.user.email}!`, 'success');
            } else {
                console.warn('⚠️ EMAIL AUTH: No user data returned');
                this.showMessage('Sign-in failed - please try again', 'error');
            }

        } catch (error) {
            console.error('❌ Email authentication error:', error);
            this.showMessage(`Authentication failed: ${error.message}`, 'error');
        }
    }

    async signOut() {
        try {
            console.log('👋 Signing out...');
            this.showMessage('Signing out...', 'info');
            
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('❌ Sign-out error:', error);
                this.showMessage(`Sign-out failed: ${error.message}`, 'error');
                return;
            }
            
            console.log('✅ Sign-out successful');
            this.currentUser = null;
            this.updateAuthUI(false, null);
            this.showMessage('Signed out successfully', 'success');
            
        } catch (error) {
            console.error('❌ Sign-out error:', error);
            this.showMessage(`Sign-out failed: ${error.message}`, 'error');
        }
    }

    updateAuthUI(isSignedIn, user) {
        console.log('🎨 Updating auth UI:', isSignedIn ? 'SIGNED IN' : 'SIGNED OUT', user?.email);
        
        const authForm = document.getElementById('auth-form');
        const signedInControls = document.getElementById('signed-in-controls');
        const userEmailDisplay = document.getElementById('user-email');
        const signOutBtn = document.getElementById('sign-out-btn');
        const appContent = document.getElementById('app-content');

        if (isSignedIn && user) {
            // Show signed-in state
            if (authForm) authForm.style.display = 'none';
            if (signedInControls) signedInControls.style.display = 'block';
            if (appContent) appContent.style.display = 'block';
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            
            // 🔧 ROBUST SIGN-OUT BUTTON TEXT FIX
            if (signOutBtn) {
                signOutBtn.textContent = 'Sign Out';
                signOutBtn.innerHTML = 'Sign Out'; // Extra insurance
                console.log('🔧 Sign-out button text set to:', signOutBtn.textContent);
                
                // Extra insurance: Force correct text after a delay
                setTimeout(() => {
                    if (signOutBtn && signOutBtn.textContent !== 'Sign Out') {
                        console.log('🔧 FIXING: Button text was wrong, correcting...');
                        signOutBtn.textContent = 'Sign Out';
                        signOutBtn.innerHTML = 'Sign Out';
                    }
                }, 100);
            }
            
            // Load entries and dashboard when user signs in
            setTimeout(() => {
                if (typeof loadEntries === 'function') {
                    loadEntries();
                }
                if (typeof updateDashboard === 'function') {
                    updateDashboard();
                }
            }, 100);
            
            console.log('✅ UI updated for signed-in state');
        } else {
            // Show signed-out state
            if (authForm) authForm.style.display = 'block';
            if (signedInControls) signedInControls.style.display = 'none';
            if (appContent) appContent.style.display = 'none';
            if (userEmailDisplay) userEmailDisplay.textContent = '';
            
            console.log('✅ UI updated for signed-out state');
        }
    }

    showMessage(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Create or update message element
        let messageEl = document.getElementById('auth-message');
        if (!messageEl) {
            messageEl = document.createElement('div');
            messageEl.id = 'auth-message';
            messageEl.className = 'fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50';
            document.body.appendChild(messageEl);
        }
        
        // Set message and styling
        messageEl.textContent = message;
        messageEl.className = `fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
            type === 'success' ? 'bg-green-500' : 
            type === 'error' ? 'bg-red-500' : 
            'bg-blue-500'
        }`;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (messageEl) messageEl.remove();
        }, 3000);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.supabase) {
        window.workingAuth = new WorkingAuth(window.supabase);
        window.workingAuth.init();
        console.log('✅ Working authentication initialized and ready!');
    } else {
        console.error('❌ Supabase not available for working auth');
    }
});