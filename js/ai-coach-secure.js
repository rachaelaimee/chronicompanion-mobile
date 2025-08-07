/**
 * ChroniCompanion AI Health Coach - Secure Frontend
 * 
 * Frontend client for secure AI Coach API
 * Handles authentication and premium features
 */

class AIHealthCoachSecure {
    constructor() {
        this.apiBaseUrl = process.env.NODE_ENV === 'production' 
            ? 'https://your-railway-app.railway.app'  // Replace with your Railway URL
            : 'http://localhost:3001';
        this.dailyLimit = 5;
        this.isInitialized = false;
        this.authToken = null;
        this.memoryStorage = null; // For incognito mode fallback
    }

    /**
     * Initialize the secure AI Coach
     * @param {Object} config - Configuration object
     */
    async initialize(config = {}) {
        try {
            // Get auth token from Supabase
            if (window.supabase) {
                const { data: { session } } = await window.supabase.auth.getSession();
                if (session?.access_token) {
                    this.authToken = session.access_token;
                    this.isInitialized = true;
                    console.log('✅ Secure AI Health Coach initialized');
                    return true;
                }
            }
            
            console.warn('⚠️ AI Coach: No authentication token available');
            return false;
        } catch (error) {
            console.error('❌ Secure AI Coach initialization failed:', error);
            return false;
        }
    }

    /**
     * Get AI health insight from secure backend
     * @param {string} userQuestion - User's health question
     * @param {Object} healthContext - Health data context
     * @returns {Object} Result object with success status and insight/error
     */
    async getHealthInsight(userQuestion, healthContext = {}) {
        if (!this.isInitialized || !this.authToken) {
            throw new Error('AI Coach not initialized. Please sign in first.');
        }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ai-coach/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    question: userQuestion,
                    healthContext: healthContext
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Server error: ${response.status}`);
            }

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
                error: error.message || 'AI service temporarily unavailable',
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