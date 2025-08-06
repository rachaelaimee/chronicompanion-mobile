/**
 * ChroniCompanion AI Health Coach
 * 
 * Provides personalized health insights using OpenAI's GPT-4o-mini model.
 * Features include usage tracking, daily limits, and 3-tier storage fallback
 * for compatibility with all browser modes including incognito.
 */

class AIHealthCoach {
    constructor() {
        this.apiKey = null;
        this.model = 'gpt-4o-mini';
        this.maxTokens = 500;
        this.temperature = 0.7;
        this.dailyLimit = 5;
        this.cooldownPeriod = 10000; // 10 seconds between requests
        this.lastRequestTime = 0;
        this.isInitialized = false;
        this.memoryStorage = null; // For incognito mode fallback
    }

    /**
     * Initialize the AI Coach with configuration
     * @param {Object} config - Configuration object
     * @param {string} config.apiKey - OpenAI API key
     * @param {number} config.dailyLimit - Daily question limit
     */
    async initialize(config = {}) {
        try {
            this.apiKey = config.apiKey;
            this.dailyLimit = config.dailyLimit || 5;
            
            if (!this.apiKey || this.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
                console.warn('⚠️ AI Coach: API key not configured');
                return false;
            }
            
            this.isInitialized = true;
            console.log('✅ AI Health Coach initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ AI Coach initialization failed:', error);
            return false;
        }
    }

    /**
     * Get AI health insight based on user question and health context
     * @param {string} userQuestion - User's health question
     * @param {Object} healthContext - Health data context
     * @returns {Object} Result object with success status and insight/error
     */
    async getHealthInsight(userQuestion, healthContext = {}) {
        if (!this.isInitialized) {
            throw new Error('AI Coach not initialized. Call initialize() first.');
        }

        // Check cooldown period
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.cooldownPeriod) {
            const waitTime = Math.ceil((this.cooldownPeriod - timeSinceLastRequest) / 1000);
            throw new Error(`Please wait ${waitTime} seconds before asking another question. This helps me provide better, more thoughtful responses! 🤖✨`);
        }

        // Check daily usage limit
        const todayUsage = await this.getTodayUsage();
        if (todayUsage >= this.dailyLimit) {
            throw new Error(`You've reached your daily limit of ${this.dailyLimit} AI insights. Check back tomorrow for more personalized health coaching, or upgrade to Premium for unlimited access! 🌟`);
        }

        try {
            const prompt = this.buildHealthPrompt(userQuestion, healthContext);
            const response = await this.callOpenAI(prompt);
            
            // Track usage and update last request time
            await this.incrementUsage();
            this.lastRequestTime = now;
            
            return {
                success: true,
                insight: response,
                usage: todayUsage + 1,
                limit: this.dailyLimit
            };
        } catch (error) {
            console.error('❌ AI Insight Error:', error);
            
            // Don't update lastRequestTime on error (allow retry sooner)
            return {
                success: false,
                error: error.message,
                usage: todayUsage,
                limit: this.dailyLimit
            };
        }
    }

    /**
     * Build health-focused prompt for OpenAI
     * @param {string} userQuestion - User's question
     * @param {Object} healthContext - Health data context
     * @returns {string} Formatted prompt
     */
    buildHealthPrompt(userQuestion, healthContext) {
        const systemPrompt = `You are Chroni, an AI health companion for ChroniCompanion app users. You provide personalized, empathetic health insights based on user data.

IMPORTANT GUIDELINES:
- Be supportive, empathetic, and encouraging
- Focus on patterns, trends, and actionable insights
- Never provide medical diagnoses or replace professional medical advice
- Always recommend consulting healthcare providers for serious concerns
- Use emojis sparingly and appropriately
- Keep responses concise but informative (under 300 words)
- Reference specific data points when available

USER'S RECENT HEALTH DATA:
${this.formatHealthContext(healthContext)}

USER QUESTION: "${userQuestion}"

Provide a helpful, personalized response based on their health patterns and question.`;

        return systemPrompt;
    }

    /**
     * Format health context for AI prompt
     * @param {Object} healthContext - Health data context
     * @returns {string} Formatted health context
     */
    formatHealthContext(healthContext) {
        const { recentEntries = [] } = healthContext;
        
        if (recentEntries.length === 0) {
            return "No recent health entries available.";
        }

        const entriesText = recentEntries.slice(0, 7).map(entry => {
            return `Date: ${entry.date || entry.entry_date}
- Mood: ${entry.mood}/10
- Energy: ${entry.energy}/10  
- Pain: ${entry.pain || 0}/10
- Sleep: ${entry.sleep}/10
${entry.symptoms && entry.symptoms.length > 0 ? `- Symptoms: ${entry.symptoms.join(', ')}` : ''}
${entry.notes ? `- Notes: ${entry.notes}` : ''}`;
        }).join('\n\n');

        return `Recent entries (last ${recentEntries.length} days):\n${entriesText}`;
    }

    /**
     * Make API call to OpenAI
     * @param {string} prompt - The prompt to send
     * @returns {string} AI response
     */
    async callOpenAI(prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: prompt
                    }
                ],
                max_tokens: this.maxTokens,
                temperature: this.temperature
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || 'No response generated';
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
     * Get today's usage count
     * @returns {number} Number of questions asked today
     */
    async getTodayUsage() {
        const storage = this.getStorage();
        const today = new Date().toDateString();
        const usageKey = `ai_coach_usage_${today}`;
        
        try {
            const usage = storage.getItem(usageKey);
            return usage ? parseInt(usage, 10) : 0;
        } catch (error) {
            console.warn('Could not retrieve usage count:', error);
            return 0;
        }
    }

    /**
     * Increment today's usage count
     */
    async incrementUsage() {
        const storage = this.getStorage();
        const today = new Date().toDateString();
        const usageKey = `ai_coach_usage_${today}`;
        
        try {
            const currentUsage = await this.getTodayUsage();
            storage.setItem(usageKey, (currentUsage + 1).toString());
        } catch (error) {
            console.warn('Could not update usage count:', error);
        }
    }

    /**
     * Analyze health patterns (placeholder for future enhancement)
     * @param {Array} entries - Health entries to analyze
     * @returns {Object} Pattern analysis results
     */
    analyzeHealthPatterns(entries) {
        // Future enhancement: Implement pattern recognition
        return {
            trends: {},
            correlations: {},
            recommendations: []
        };
    }

    /**
     * Format health entry for AI context
     * @param {Object} entry - Health entry object
     * @returns {string} Formatted entry string
     */
    formatEntryForAI(entry) {
        return `${entry.date}: Mood ${entry.mood}/10, Energy ${entry.energy}/10, Pain ${entry.pain || 0}/10, Sleep ${entry.sleep}/10`;
    }
}

// Make the class available globally
if (typeof window !== 'undefined') {
    window.AIHealthCoach = AIHealthCoach;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIHealthCoach;
}