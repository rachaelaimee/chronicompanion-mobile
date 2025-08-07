/**
 * ChroniCompanion AI Health Coach - DIRECT OpenAI Implementation
 * 
 * This is a fallback implementation that calls OpenAI directly from the frontend
 * ONLY for debugging - should not be used in production due to API key exposure
 */

class AIHealthCoachDirect {
    constructor() {
        this.apiKey = null; // Will be set during initialization
        this.model = 'gpt-4o-mini';
        this.maxTokens = 500;
        this.temperature = 0.7;
        this.dailyLimit = 5;
        this.cooldownPeriod = 10000; // 10 seconds
        this.lastRequestTime = 0;
        this.isInitialized = false;
        this.memoryStorage = new Map(); // Fallback storage
    }

    /**
     * Initialize the direct AI Coach (for debugging only)
     */
    async initialize(config = {}) {
        try {
            this.dailyLimit = config.dailyLimit || 5;
            
            // For emergency use - you'll need to manually set this in browser console:
            // aiCoach.apiKey = 'your-openai-api-key'
            this.apiKey = localStorage.getItem('openai_api_key') || null;
            
            if (!this.apiKey || this.apiKey === 'YOUR_OPENAI_API_KEY_HERE') {
                console.warn('⚠️ Direct AI Coach: API key not configured');
                return false;
            }
            
            this.isInitialized = true;
            console.log('✅ Direct AI Health Coach initialized (EMERGENCY MODE - Railway backend down)');
            console.log('⚠️ Using direct OpenAI calls - API key exposed in frontend!');
            return true;
        } catch (error) {
            console.error('❌ Direct AI Coach initialization failed:', error);
            return false;
        }
    }

    /**
     * Get AI health insight by calling OpenAI directly
     * WARNING: This exposes API key - only for debugging!
     */
    async getHealthInsight(userQuestion, healthContext = {}) {
        if (!this.isInitialized) {
            throw new Error('AI Coach not initialized. Call initialize() first.');
        }

        // Check cooldown
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.cooldownPeriod) {
            const waitTime = Math.ceil((this.cooldownPeriod - timeSinceLastRequest) / 1000);
            throw new Error(`Please wait ${waitTime} seconds before asking another question. 🤖✨`);
        }

        // Check daily limit
        const todayUsage = await this.getTodayUsage();
        if (todayUsage >= this.dailyLimit) {
            throw new Error(`You've reached your daily limit of ${this.dailyLimit} AI insights. Check back tomorrow! 🌟`);
        }

        try {
            const prompt = this.buildHealthPrompt(userQuestion, healthContext);
            
            console.log('🔄 Making direct OpenAI API call...');
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
            const aiResponse = data.choices[0]?.message?.content || 'No response generated';

            // Track usage and update last request time
            await this.incrementUsage();
            this.lastRequestTime = now;

            console.log('✅ Direct OpenAI call successful');
            
            return {
                success: true,
                insight: aiResponse,
                usage: todayUsage + 1,
                limit: this.dailyLimit
            };
        } catch (error) {
            console.error('❌ Direct AI Insight Error:', error);
            
            return {
                success: false,
                error: error.message,
                usage: todayUsage,
                limit: this.dailyLimit
            };
        }
    }

    /**
     * Build health-focused prompt
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

Provide a helpful, empathetic response with actionable insights based on their health data.`;

        return systemPrompt;
    }

    /**
     * Format health context for the prompt
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
     * Get today's usage count
     */
    async getTodayUsage() {
        try {
            const today = new Date().toDateString();
            const storageKey = `ai_usage_${today}`;
            
            // Try localStorage first
            if (typeof localStorage !== 'undefined') {
                return parseInt(localStorage.getItem(storageKey) || '0', 10);
            }
            
            // Fallback to memory storage
            return this.memoryStorage.get(storageKey) || 0;
        } catch (error) {
            console.warn('Storage access failed, using memory fallback');
            const today = new Date().toDateString();
            return this.memoryStorage.get(`ai_usage_${today}`) || 0;
        }
    }

    /**
     * Increment today's usage count
     */
    async incrementUsage() {
        try {
            const today = new Date().toDateString();
            const storageKey = `ai_usage_${today}`;
            const currentUsage = await this.getTodayUsage();
            const newUsage = currentUsage + 1;
            
            // Try localStorage first
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(storageKey, newUsage.toString());
            }
            
            // Always update memory storage as backup
            this.memoryStorage.set(storageKey, newUsage);
        } catch (error) {
            console.warn('Storage update failed, using memory fallback');
            const today = new Date().toDateString();
            const currentUsage = this.memoryStorage.get(`ai_usage_${today}`) || 0;
            this.memoryStorage.set(`ai_usage_${today}`, currentUsage + 1);
        }
    }
}

// Make it available globally
window.AIHealthCoachDirect = AIHealthCoachDirect;