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
            
            // 🔍 DEBUG: Log exact request details (without password for security)
            console.log('🔍 DEBUG REQUEST:');
            console.log('  - email:', email);
            console.log('  - emailLength:', email.length);
            console.log('  - emailTrimmed:', email.trim());
            console.log('  - passwordLength:', password.length);
            console.log('  - passwordType:', typeof password);
            console.log('  - emailLowerCase:', email.toLowerCase());
            console.log('  - hasSpecialChars:', /[^a-zA-Z0-9@._-]/.test(email));
            console.log('  - platform:', window.Capacitor?.getPlatform() || 'web');
            console.log('  - supabaseClient:', !!this.supabase);
            console.log('  - authMethod:', !!this.supabase?.auth?.signInWithPassword);
            
            // 🚨 CRITICAL: Do NOT modify email case - use exactly as provided
            console.log('📧 EMAIL AUTH: Using email EXACTLY as provided:', email);
            
            // 📱 MOBILE: Extra debugging for mobile platform
            if (window.Capacitor?.getPlatform() !== 'web') {
                console.log('📱 MOBILE AUTH DEBUG: About to call signInWithPassword');
                console.log('📱 MOBILE AUTH DEBUG: Supabase URL:', this.supabase?.supabaseUrl);
                console.log('📱 MOBILE AUTH DEBUG: Auth client exists:', !!this.supabase?.auth);
            }
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email, // Use email EXACTLY as provided
                password: password
            });
            
            // 📱 MOBILE: Log response details
            if (window.Capacitor?.getPlatform() !== 'web') {
                console.log('📱 MOBILE AUTH RESPONSE:');
                console.log('  - hasData:', !!data);
                console.log('  - hasError:', !!error);
                console.log('  - errorMessage:', error?.message);
                console.log('  - errorStatus:', error?.status);
                console.log('  - errorCode:', error?.code);
                console.log('  - dataUser:', data?.user?.email);
                console.log('  - Full error object:', JSON.stringify(error, null, 2));
            }

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
                
                // If sign-in failed, try to create a new account
                console.log('📧 EMAIL AUTH: Sign-in failed, attempting to create new account...');
                
                if (error.message?.includes('Invalid login credentials') || 
                    error.message?.includes('Email not confirmed') ||
                    error.message?.includes('User not found')) {
                    
                    // Try to create new account
                    console.log('📧 EMAIL AUTH: Creating new account for:', email);
                    this.showMessage('Creating new account...', 'info');
                    
                    const { data: signUpData, error: signUpError } = await this.supabase.auth.signUp({
                        email: email,
                        password: password,
                        options: {
                            emailRedirectTo: window.location.origin
                        }
                    });
                    
                    if (signUpError) {
                        console.error('❌ Sign-up failed:', signUpError);
                        this.showMessage(`Account creation failed: ${signUpError.message}`, 'error');
                        return;
                    }
                    
                    if (signUpData?.user) {
                        console.log('✅ EMAIL AUTH: Account created successfully');
                        this.currentUser = signUpData.user;
                        this.updateAuthUI(true, signUpData.user);
                        this.showMessage(`Welcome to ChroniCompanion, ${signUpData.user.email}! Account created successfully.`, 'success');
                        return;
                    }
                }
                
                // For other errors, show the original error message
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
            
            // Check if we have a current session before attempting sign-out
            const { data: { session }, error: sessionError } = await this.supabase.auth.getSession();
            
            if (sessionError) {
                console.warn('⚠️ Session check error during sign-out:', sessionError);
            }
            
            console.log('🔍 Current session status:', {
                hasSession: !!session,
                hasUser: !!session?.user,
                userEmail: session?.user?.email
            });
            
            // Attempt sign-out regardless of session status
            const { error } = await this.supabase.auth.signOut();
            
            if (error) {
                console.error('❌ Sign-out error:', error);
                // If the error is just about missing session, still proceed with UI cleanup
                if (error.message.includes('session') || error.message.includes('Session')) {
                    console.log('⚠️ Session already cleared, proceeding with UI cleanup...');
                    this.currentUser = null;
                    this.updateAuthUI(false, null);
                    this.showMessage('Signed out successfully', 'success');
                    return;
                }
                this.showMessage(`Sign-out failed: ${error.message}`, 'error');
                return;
            }
            
            console.log('✅ Sign-out successful');
            this.currentUser = null;
            this.updateAuthUI(false, null);
            this.showMessage('Signed out successfully', 'success');
            
        } catch (error) {
            console.error('❌ Sign-out error:', error);
            // Even if sign-out fails, clean up the UI state
            console.log('🧹 Cleaning up UI state despite sign-out error...');
            this.currentUser = null;
            this.updateAuthUI(false, null);
            this.showMessage('Signed out (with cleanup)', 'info');
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

// Initialize when DOM is ready AND Supabase is properly initialized
async function initializeWorkingAuth() {
    console.log('🔄 Waiting for Supabase to be properly initialized...');
    
    // Wait for Supabase to be available (up to 10 seconds)
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds with 100ms intervals
    
    while ((!window.supabase || !window.supabase.auth) && attempts < maxAttempts) {
        console.log(`⏳ Attempt ${attempts + 1}/${maxAttempts}: Waiting for Supabase...`);
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (!window.supabase || !window.supabase.auth) {
        console.error('❌ CRITICAL: Supabase failed to initialize after 10 seconds');
        console.error('❌ Available globals:', Object.keys(window).filter(key => key.includes('supabase') || key.includes('mobile')));
        return;
    }
    
    console.log('✅ Supabase is ready! Initializing WorkingAuth...');
    window.workingAuth = new WorkingAuth(window.supabase);
    await window.workingAuth.init();
    console.log('✅ Working authentication fully initialized and ready!');
}

document.addEventListener('DOMContentLoaded', () => {
    // Give a small delay to ensure all scripts are loaded
    setTimeout(initializeWorkingAuth, 100);
});