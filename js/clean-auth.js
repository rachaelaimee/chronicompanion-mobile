// 🎯 CLEAN SUPABASE AUTHENTICATION - Following Official Docs Exactly
// Based on: https://supabase.com/docs/reference/javascript/auth-signinwithpassword
// Simple, clean, no conflicts - exactly what Supabase recommends

class CleanAuth {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        
        // Listen to auth changes (Supabase best practice)
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state change:', event);
            
            if (event === 'SIGNED_IN' && session) {
                this.currentUser = session.user;
                this.showSignedInUI(session.user);
                console.log('✅ User signed in:', session.user.email);
            } else if (event === 'SIGNED_OUT') {
                this.currentUser = null;
                this.showSignedOutUI();
                console.log('✅ User signed out');
            }
        });
        
        // Check initial session
        this.checkSession();
    }
    
    // ✅ Check current session (Supabase best practice)
    async checkSession() {
        try {
            const { data: { session } } = await this.supabase.auth.getSession();
            
            if (session) {
                this.currentUser = session.user;
                this.showSignedInUI(session.user);
                console.log('✅ Existing session found:', session.user.email);
            } else {
                this.currentUser = null;
                this.showSignedOutUI();
                console.log('ℹ️ No existing session');
            }
        } catch (error) {
            console.error('❌ Session check error:', error);
            this.showSignedOutUI();
        }
    }
    
    // ✅ SIGN IN - Exactly as per Supabase docs
    async signIn(email, password) {
        try {
            console.log('🔐 Attempting sign in for:', email);
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });
            
            if (error) {
                console.error('❌ Sign in error:', error.message);
                this.showMessage(`Sign in failed: ${error.message}`, 'error');
                return false;
            }
            
            if (data.user) {
                console.log('✅ Sign in successful:', data.user.email);
                this.showMessage(`Welcome back, ${data.user.email}!`, 'success');
                return true;
            }
            
        } catch (error) {
            console.error('❌ Sign in exception:', error);
            this.showMessage('Sign in failed. Please try again.', 'error');
            return false;
        }
    }
    
    // ✅ SIGN UP - Exactly as per Supabase docs  
    async signUp(email, password) {
        try {
            console.log('🔐 Attempting sign up for:', email);
            
            const { data, error } = await this.supabase.auth.signUp({
                email: email,
                password: password
            });
            
            if (error) {
                if (error.message.includes('User already registered')) {
                    this.showMessage('This email is already registered. Please sign in instead.', 'error');
                } else {
                    this.showMessage(`Sign up failed: ${error.message}`, 'error');
                }
                return false;
            }
            
            if (data.user) {
                if (data.session) {
                    // User is immediately signed in (email confirmation disabled)
                    this.showMessage('Account created successfully!', 'success');
                } else {
                    // Email confirmation required
                    this.showMessage('Account created! Please check your email to confirm.', 'success');
                }
                return true;
            }
            
        } catch (error) {
            console.error('❌ Sign up exception:', error);
            this.showMessage('Sign up failed. Please try again.', 'error');
            return false;
        }
    }
    
    // ✅ SIGN OUT - Exactly as per Supabase docs
    async signOut() {
        try {
            console.log('🔐 Signing out...');
            
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('❌ Sign out error:', error.message);
                this.showMessage('Sign out failed. Please try again.', 'error');
                return false;
            }
            
            console.log('✅ Sign out successful');
            this.showMessage('Signed out successfully', 'success');
            return true;
            
        } catch (error) {
            console.error('❌ Sign out exception:', error);
            this.showMessage('Sign out failed. Please try again.', 'error');
            return false;
        }
    }
    
    // ✅ UI UPDATE - SIGNED IN STATE
    showSignedInUI(user) {
        // Hide auth form
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.style.display = 'none';
        }
        
        // Show signed-in controls
        const signedInControls = document.getElementById('signed-in-controls');
        if (signedInControls) {
            signedInControls.style.display = 'block';
        }
        
        // Show user info
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.style.display = 'block';
            
            const userEmail = document.getElementById('user-email');
            if (userEmail) {
                userEmail.textContent = user.email;
            }
        }
        
        console.log('✅ UI updated for signed-in state');
    }
    
    // ✅ UI UPDATE - SIGNED OUT STATE  
    showSignedOutUI() {
        // Show auth form
        const authForm = document.getElementById('auth-form');
        if (authForm) {
            authForm.style.display = 'block';
        }
        
        // Hide signed-in controls
        const signedInControls = document.getElementById('signed-in-controls');
        if (signedInControls) {
            signedInControls.style.display = 'none';
        }
        
        // Hide user info
        const userInfo = document.getElementById('user-info');
        if (userInfo) {
            userInfo.style.display = 'none';
        }
        
        console.log('✅ UI updated for signed-out state');
    }
    
    // ✅ SHOW MESSAGES
    showMessage(message, type) {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Try to show in UI message element
        const messageEl = document.getElementById('message');
        if (messageEl) {
            messageEl.textContent = message;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                messageEl.style.display = 'none';
            }, 5000);
        }
    }
}

// Export for use
window.CleanAuth = CleanAuth;