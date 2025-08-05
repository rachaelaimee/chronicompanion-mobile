// 🎯 PRODUCTION-READY SUPABASE AUTH IMPLEMENTATION
// Based on industry best practices and successful production apps

class AuthManager {
    constructor(supabaseClient) {
        this.supabase = supabaseClient;
        this.currentUser = null;
        this.loading = false;
        this.error = null;
        
        // Initialize auth state listener
        this.setupAuthListener();
        this.checkInitialSession();
    }

    // ✅ CLEAN AUTH STATE LISTENER - Single responsibility
    setupAuthListener() {
        this.supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state change:', event);
            
            switch (event) {
                case 'SIGNED_IN':
                    this.currentUser = session?.user || null;
                    this.updateUI(true, this.currentUser);
                    break;
                case 'SIGNED_OUT':
                    this.currentUser = null;
                    this.updateUI(false, null);
                    break;
                case 'TOKEN_REFRESHED':
                    this.currentUser = session?.user || null;
                    // Don't update UI on token refresh
                    break;
            }
        });
    }

    // ✅ PROPER LOADING STATES
    setLoading(isLoading) {
        this.loading = isLoading;
        this.updateLoadingUI(isLoading);
    }

    setError(error) {
        this.error = error;
        this.updateErrorUI(error);
    }

    // ✅ CLEAN SIGN-IN WITH PROPER ERROR HANDLING
    async signIn(email, password) {
        try {
            this.setLoading(true);
            this.setError(null);

            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email.trim(),
                password: password
            });

            if (error) {
                // Handle specific error types
                if (error.message.includes('Invalid login credentials')) {
                    throw new Error('Invalid email or password. Please check your credentials.');
                } else if (error.message.includes('Email not confirmed')) {
                    throw new Error('Please check your email and click the confirmation link.');
                } else {
                    throw new Error(`Sign in failed: ${error.message}`);
                }
            }

            if (!data.user) {
                throw new Error('Sign in failed. Please try again.');
            }

            // Success handled by auth listener
            console.log('✅ Sign in successful');
            
        } catch (error) {
            console.error('❌ Sign in error:', error);
            this.setError(error.message);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    // ✅ CLEAN SIGN-UP WITH PROPER ERROR HANDLING
    async signUp(email, password) {
        try {
            this.setLoading(true);
            this.setError(null);

            const { data, error } = await this.supabase.auth.signUp({
                email: email.trim(),
                password: password
            });

            if (error) {
                if (error.message.includes('User already registered')) {
                    throw new Error('An account with this email already exists. Try signing in instead.');
                } else {
                    throw new Error(`Account creation failed: ${error.message}`);
                }
            }

            if (!data.user) {
                throw new Error('Account creation failed. Please try again.');
            }

            // Check if email confirmation is required
            if (!data.session) {
                return { 
                    success: true, 
                    message: 'Account created! Please check your email to confirm your account.' 
                };
            }

            console.log('✅ Sign up successful');
            return { success: true, message: 'Account created successfully!' };

        } catch (error) {
            console.error('❌ Sign up error:', error);
            this.setError(error.message);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    // ✅ ROBUST SIGN-OUT WITH PROPER CLEANUP
    async signOut() {
        try {
            this.setLoading(true);
            this.setError(null);

            const { error } = await this.supabase.auth.signOut();

            if (error) {
                console.error('❌ Sign out error:', error);
                throw new Error(`Sign out failed: ${error.message}`);
            }

            // Clear local state immediately
            this.currentUser = null;
            this.updateUI(false, null);

            console.log('✅ Sign out successful');
            return { success: true, message: 'Signed out successfully' };

        } catch (error) {
            console.error('❌ Sign out failed:', error);
            this.setError(error.message);
            throw error;
        } finally {
            this.setLoading(false);
        }
    }

    // ✅ CLEAN SESSION CHECK - Single responsibility
    async checkInitialSession() {
        try {
            const { data: { session }, error } = await this.supabase.auth.getSession();

            if (error) {
                console.error('❌ Session check error:', error);
                return;
            }

            if (session?.user) {
                this.currentUser = session.user;
                this.updateUI(true, session.user);
                console.log('✅ Existing session found:', session.user.email);
            } else {
                this.currentUser = null;
                this.updateUI(false, null);
                console.log('ℹ️ No existing session');
            }
        } catch (error) {
            console.error('❌ Session check failed:', error);
        }
    }

    // ✅ SINGLE UI UPDATE FUNCTION - Clean and simple
    updateUI(isSignedIn, user) {
        const authForm = document.getElementById('auth-form');
        const signedInControls = document.getElementById('signed-in-controls');
        const userInfo = document.getElementById('user-info');

        if (isSignedIn && user) {
            // Show signed-in state
            if (authForm) {
                authForm.style.display = 'none';
            }
            if (signedInControls) {
                signedInControls.style.display = 'flex';
            }
            if (userInfo) {
                userInfo.style.display = 'block';
                userInfo.innerHTML = `
                    <div class="user-welcome">
                        <p>✅ Signed in as: <strong>${user.email}</strong></p>
                    </div>
                `;
            }
        } else {
            // Show signed-out state
            if (authForm) {
                authForm.style.display = 'block';
            }
            if (signedInControls) {
                signedInControls.style.display = 'none';
            }
            if (userInfo) {
                userInfo.style.display = 'none';
            }
        }
    }

    // ✅ PROPER LOADING UI - Fixed button text restoration
    updateLoadingUI(isLoading) {
        const signInBtn = document.getElementById('sign-in-btn');
        const signUpBtn = document.getElementById('sign-up-btn');
        const signOutBtn = document.getElementById('sign-out-btn');

        // Handle each button individually to avoid text confusion
        if (signInBtn) {
            if (isLoading) {
                signInBtn.disabled = true;
                signInBtn.textContent = 'Signing in...';
            } else {
                signInBtn.disabled = false;
                signInBtn.textContent = 'Sign In';
            }
        }

        if (signUpBtn) {
            if (isLoading) {
                signUpBtn.disabled = true;
                signUpBtn.textContent = 'Creating account...';
            } else {
                signUpBtn.disabled = false;
                signUpBtn.textContent = 'Sign Up';
            }
        }

        if (signOutBtn) {
            if (isLoading) {
                signOutBtn.disabled = true;
                signOutBtn.textContent = 'Signing out...';
            } else {
                signOutBtn.disabled = false;
                signOutBtn.textContent = 'Sign Out';  // ✅ Always "Sign Out" for sign-out button
            }
        }
    }

    // ✅ PROPER ERROR UI
    updateErrorUI(error) {
        let errorDiv = document.getElementById('auth-error');
        
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.id = 'auth-error';
            errorDiv.className = 'auth-error';
            const authForm = document.getElementById('auth-form');
            if (authForm) {
                authForm.insertBefore(errorDiv, authForm.firstChild);
            }
        }

        if (error) {
            errorDiv.innerHTML = `
                <div class="error-message" style="
                    background: #fee2e2; 
                    border: 1px solid #fecaca; 
                    color: #dc2626; 
                    padding: 12px; 
                    border-radius: 6px; 
                    margin-bottom: 16px;
                ">
                    <strong>❌ Error:</strong> ${error}
                </div>
            `;
            errorDiv.style.display = 'block';
        } else {
            errorDiv.style.display = 'none';
        }
    }

    // ✅ UTILITY METHODS
    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoading() {
        return this.loading;
    }

    getError() {
        return this.error;
    }
}

// ✅ EXPORT FOR USE IN MAIN APPLICATION
export { AuthManager };