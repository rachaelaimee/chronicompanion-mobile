/**
 * ChroniCompanion AI Health Coach - Secure Frontend
 * 
 * Frontend client for secure AI Coach API
 * Handles authentication and premium features
 */

class AIHealthCoachSecure {
    constructor() {
        this.backendUrl = 'https://chronicompanion-mobile-production.up.railway.app'; // Railway backend URL
        this.dailyLimit = 5; // Free tier limit
        this.cooldownPeriod = 10000; // 10 seconds
        this.lastRequestTime = 0;
        this.isInitialized = false;
        this.memoryStorage = new Map(); // Fallback for in-memory storage
    }

    /**
     * Initialize the secure AI Coach with proper auth handling
     * @param {Object} config - Configuration object
     */
    async initialize(config = {}) {
        try {
            // Apply config settings
            if (config.backendUrl) {
                this.backendUrl = config.backendUrl;
            }
            if (config.dailyLimit) {
                this.dailyLimit = config.dailyLimit;
            }
            
            // Wait for Supabase to be fully ready with retries
            let attempts = 0;
            const maxAttempts = 10; // 5 seconds with 500ms intervals
            
            while (attempts < maxAttempts) {
                try {
                    if (window.supabase && window.supabase.auth) {
                        const { data: { session }, error } = await window.supabase.auth.getSession();
                        
                        if (error) {
                            console.warn(`⚠️ AI Coach: Auth error (attempt ${attempts + 1}):`, error.message);
                        } else if (session?.access_token) {
                            this.authToken = session.access_token;
                            this.isInitialized = true;
                            console.log('✅ Secure AI Health Coach initialized successfully');
                            return true;
                        }
                    }
                } catch (sessionError) {
                    console.warn(`⚠️ AI Coach: Session retrieval error (attempt ${attempts + 1}):`, sessionError.message);
                }
                
                attempts++;
                if (attempts < maxAttempts) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    console.log(`🔄 AI Coach: Retrying initialization (${attempts}/${maxAttempts})...`);
                }
            }
            
            console.error('❌ AI Coach: Authentication token not available after retries');
            return false;
        } catch (error) {
            console.error('❌ Secure AI Coach initialization failed:', error);
            return false;
        }
    }

    /**
     * Get fresh auth token before making API calls
     * @returns {string|null} Fresh auth token
     */
    async getFreshAuthToken() {
        try {
            if (window.supabase && window.supabase.auth) {
                const { data: { session }, error } = await window.supabase.auth.getSession();
                if (error) {
                    console.error('❌ Token refresh error:', error);
                    return null;
                }
                if (session?.access_token) {
                    this.authToken = session.access_token;
                    return session.access_token;
                }
            }
            return null;
        } catch (error) {
            console.error('❌ Token refresh failed:', error);
            return null;
        }
    }

    /**
     * Check if current user has premium subscription
     * @returns {Promise<boolean>} True if user has active premium subscription
     */
    async checkPremiumStatus() {
        try {
            if (!window.supabase || !window.supabase.auth) {
                console.warn('🔒 AI Coach: Supabase not available for premium check');
                return false;
            }

            const user = await window.supabase.auth.getUser();
            if (!user.data.user) {
                console.warn('🔒 AI Coach: No authenticated user for premium check');
                return false;
            }

            const { data: subscription, error } = await window.supabase
                .from('user_subscriptions')
                .select('*')
                .eq('user_id', user.data.user.id)
                .eq('status', 'active')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('❌ AI Coach: Error checking premium status:', error);
                return false;
            }

            const isPremium = !!subscription;
            console.log('🔒 AI Coach Premium Check:', isPremium ? 'ACTIVE' : 'FREE');
            return isPremium;
        } catch (error) {
            console.error('❌ AI Coach: Exception checking premium status:', error);
            return false;
        }
    }

    /**
     * Get AI health insight from secure backend with token refresh
     * @param {string} userQuestion - User's health question
     * @param {Object} healthContext - Health data context
     * @returns {Object} Result object with success status and insight/error
     */
    async getHealthInsight(userQuestion, healthContext = {}) {
        if (!this.isInitialized) {
            throw new Error('AI Coach not initialized. Please sign in first.');
        }

        // 🔒 PREMIUM CHECK: Verify user has active subscription
        console.log('🔍 AI Coach: Checking premium status...');
        const isPremium = await this.checkPremiumStatus();
        if (!isPremium) {
            console.log('🔒 AI Coach: Premium subscription required');
            throw new Error('PREMIUM_REQUIRED');
        }
        console.log('✅ AI Coach: Premium user verified');

        try {
            // Get fresh auth token
            const freshToken = await this.getFreshAuthToken();
            if (!freshToken) {
                throw new Error('Unable to get authentication token. Please sign in again.');
            }

            console.log('🚀 Making AI Coach request to:', `${this.backendUrl}/api/ai-coach`);
            
            const response = await fetch(`${this.backendUrl}/api/ai-coach`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${freshToken}`,
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache'
                },
                body: JSON.stringify({
                    question: userQuestion,
                    healthContext: healthContext
                })
            });

            console.log('📡 Response status:', response.status);
            console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ API Error Response:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('✅ AI Coach response received:', data);

            if (data.success) {
                // Track usage locally for UI updates
                await this.incrementUsage();
                
                return {
                    success: true,
                    insight: data.insight,
                    isPremium: data.isPremium,
                    usage: await this.getTodayUsage(),
                    limit: data.isPremium ? 'unlimited' : this.dailyLimit,
                    remainingQuestions: data.remainingQuestions
                };
            } else {
                return {
                    success: false,
                    error: data.error,
                    usage: await this.getTodayUsage(),
                    limit: this.dailyLimit
                };
            }

        } catch (error) {
            console.error('❌ Secure AI Insight Error:', error);
            
            // Check if it's a network/CORS error
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                return {
                    success: false,
                    error: 'Network connection failed. Please check your connection and try again.',
                    usage: await this.getTodayUsage(),
                    limit: this.dailyLimit
                };
            }
            
            // Handle specific error cases
            if (error.message.includes('Daily AI limit reached')) {
                return {
                    success: false,
                    error: "You've reached your daily limit of 5 AI insights. Upgrade to Premium for unlimited access! 🌟",
                    usage: this.dailyLimit,
                    limit: this.dailyLimit,
                    showPremiumPrompt: true
                };
            }
            
            return {
                success: false,
                error: error.message || 'An unexpected error occurred. Please try again.',
                usage: await this.getTodayUsage(),
                limit: this.dailyLimit
            };
        }
    }

    /**
     * Get storage interface with 3-tier fallback
     * @returns {Object} Storage interface (localStorage, sessionStorage, or memory)
     */
    getStorage() {
        try {
            // Test if localStorage is available and working
            const testKey = '__test_storage__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return localStorage;
        } catch (error) {
            // Fallback to sessionStorage if localStorage fails
            try {
                const testKey = '__test_session_storage__';
                sessionStorage.setItem(testKey, 'test');
                sessionStorage.removeItem(testKey);
                return sessionStorage;
            } catch (sessionError) {
                // Ultimate fallback: in-memory storage for incognito mode
                if (!this.memoryStorage) {
                    this.memoryStorage = new Map();
                }
                return {
                    getItem: (key) => this.memoryStorage.get(key) || null,
                    setItem: (key, value) => this.memoryStorage.set(key, value),
                    removeItem: (key) => this.memoryStorage.delete(key),
                    clear: () => this.memoryStorage.clear()
                };
            }
        }
    }

    /**
     * Get today's usage count (local tracking for UI)
     * @returns {number} Number of questions asked today
     */
    async getTodayUsage() {
        const storage = this.getStorage();
        const today = new Date().toDateString();
        const usageKey = `secure_ai_usage_${today}`;
        
        try {
            const usage = storage.getItem(usageKey);
            return usage ? parseInt(usage, 10) : 0;
        } catch (error) {
            console.warn('Could not retrieve usage count:', error);
            return 0;
        }
    }

    /**
     * Increment today's usage count (local tracking for UI)
     */
    async incrementUsage() {
        const storage = this.getStorage();
        const today = new Date().toDateString();
        const usageKey = `secure_ai_usage_${today}`;
        
        try {
            const currentUsage = await this.getTodayUsage();
            storage.setItem(usageKey, (currentUsage + 1).toString());
        } catch (error) {
            console.warn('Could not update usage count:', error);
        }
    }

    /**
     * Check if user has premium access
     * @returns {boolean} Premium status
     */
    async isPremiumUser() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/premium/status`, {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.isPremium || false;
            }
        } catch (error) {
            console.error('Failed to check premium status:', error);
        }
        
        return false;
    }

    /**
     * Upgrade to premium
     * @returns {Object} Upgrade information
     */
    async upgradeToPremium() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/premium/upgrade`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Premium upgrade error:', error);
            return { error: 'Upgrade service temporarily unavailable' };
        }
    }

    /**
     * Health check for the API service
     * @returns {boolean} Service health status
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/health`);
            return response.ok;
        } catch (error) {
            console.error('AI service health check failed:', error);
            return false;
        }
    }
}

// Make the class available globally
if (typeof window !== 'undefined') {
    window.AIHealthCoachSecure = AIHealthCoachSecure;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIHealthCoachSecure;
}