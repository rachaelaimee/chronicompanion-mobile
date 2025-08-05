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
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                // If sign-in fails, try to sign up (create new account)
                if (error.message.includes('Invalid login credentials') || error.message.includes('Email not confirmed')) {
                    console.log('📧 EMAIL AUTH: Sign-in failed, trying sign-up...');
                    this.showMessage('Creating new account...', 'info');
                    
                    const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
                        email: email,
                        password: password
                    });

                    if (signUpError) {
                        console.error('❌ Sign-up error:', signUpError);
                        this.showMessage(`Account creation failed: ${signUpError.message}`, 'error');
                        return;
                    }

                    if (signUpData?.user) {
                        console.log('✅ EMAIL AUTH: Account created successfully');
                        this.showMessage('Account created! Please check your email to verify your account.', 'success');
                        // Don't update UI yet - user needs to verify email first
                        return;
                    }
                } else {
                    console.error('❌ Sign-in error:', error);
                    this.showMessage(`Sign-in failed: ${error.message}`, 'error');
                    return;
                }
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

        if (isSignedIn && user) {
            // Show signed-in state
            if (authForm) authForm.style.display = 'none';
            if (signedInControls) signedInControls.style.display = 'block';
            if (userEmailDisplay) userEmailDisplay.textContent = user.email;
            if (signOutBtn) signOutBtn.textContent = 'Sign Out';
            
            console.log('✅ UI updated for signed-in state');
        } else {
            // Show signed-out state
            if (authForm) authForm.style.display = 'block';
            if (signedInControls) signedInControls.style.display = 'none';
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