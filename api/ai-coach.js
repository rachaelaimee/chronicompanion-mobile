/**
 * ChroniCompanion AI Coach Backend API
 * 
 * Secure backend endpoint for AI health coaching
 * Handles OpenAI API calls with environment variables
 * Includes premium user authentication and rate limiting
 */

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to build health-focused prompts
function buildHealthPrompt(question, healthContext) {
    let contextString = '';
    if (healthContext && healthContext.recentEntries && healthContext.recentEntries.length > 0) {
        const formattedEntries = healthContext.recentEntries.map(entry => {
            return `Date: ${entry.entry_date}, Mood: ${entry.mood}, Energy: ${entry.energy}, Pain: ${entry.pain}, Sleep: ${entry.sleep}, Symptoms: ${entry.symptoms?.join(', ') || 'none'}, Notes: ${entry.notes || 'none'}`;
        }).join('\n');
        contextString = `Here are your recent health entries:\n${formattedEntries}\n\n`;
    }

    return `You are Chroni, a helpful and empathetic AI health companion for ChroniCompanion. Your goal is to provide insights and suggestions based on the user's health data and chronic illness management.

${contextString}

User's question: "${question}"

Please provide a concise, helpful, and empathetic response focused on chronic illness management and health tracking insights.`;
}

// Helper function to log AI usage
async function logAIUsage(userId, question, response) {
    try {
        await supabase.from('ai_usage_logs').insert({
            user_id: userId,
            question: question,
            response: response,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error logging AI usage:', error);
        // Don't throw - logging is optional
    }
}

// Simple CORS - allow all origins temporarily to debug
app.use(cors({
    origin: true, // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.sendStatus(200);
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'ChroniCompanion AI Coach Backend' 
    });
});

// Rate limiting
const aiRateLimit = rateLimit({
    windowMs: 24 * 60 * 60 * 1000, // 24 hours
    max: (req) => {
        // Premium users get unlimited, free users get 5
        return req.user?.isPremium ? 1000 : 5;
    },
    message: {
        error: "Daily AI limit reached. Upgrade to Premium for unlimited access!"
    },
    standardHeaders: true,
    legacyHeaders: false,
});



// Middleware to verify user authentication
async function verifyUser(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No valid authorization token' });
        }

        const token = authHeader.substring(7);
        const { data: { user }, error } = await supabase.auth.getUser(token);
        
        if (error || !user) {
            return res.status(401).json({ error: 'Invalid authentication token' });
        }

        // Check if user has premium access (you'll implement this logic)
        req.user = {
            id: user.id,
            email: user.email,
            isPremium: await checkPremiumStatus(user.id)
        };

        next();
    } catch (error) {
        console.error('Auth verification error:', error);
        res.status(401).json({ error: 'Authentication failed' });
    }
}

// Check premium status (implement your payment logic here)
async function checkPremiumStatus(userId) {
    // TODO: Implement premium user check
    // For now, return false (all users are free tier)
    // Later: check payment status, subscription, etc.
    return false;
}

// AI Coach endpoint
app.post('/api/ai-coach', verifyUser, aiRateLimit, async (req, res) => {
    try {
        const { question, healthContext } = req.body;
        
        if (!question || question.trim().length === 0) {
            return res.status(400).json({ error: 'Question is required' });
        }

        if (!process.env.OPENAI_API_KEY) {
            return res.status(500).json({ error: 'AI service not configured' });
        }

        // Build health-focused prompt
        const prompt = buildHealthPrompt(question, healthContext || {});
        
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                    {
                        role: 'system',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            });

        const aiResponse = completion.choices[0]?.message?.content || 'No response generated';

        // Log usage for analytics (optional)
        await logAIUsage(req.user.id, question, aiResponse);

        res.json({
            success: true,
            insight: aiResponse,
            isPremium: req.user.isPremium,
            remainingQuestions: req.user.isPremium ? 'unlimited' : (5 - (req.rateLimit?.current || 0))
        });

    } catch (error) {
        console.error('AI Coach error:', error);
        res.status(500).json({
            success: false,
            error: error.message || 'AI service temporarily unavailable'
        });
    }
});

// Build health-focused prompt
function buildHealthPrompt(userQuestion, healthContext) {
    const { recentEntries = [] } = healthContext;
    
    let healthData = "No recent health entries available.";
    if (recentEntries.length > 0) {
        healthData = `Recent entries (last ${recentEntries.length} days):\n` + 
            recentEntries.slice(0, 7).map(entry => {
                return `Date: ${entry.date || entry.entry_date}
- Mood: ${entry.mood}/10
- Energy: ${entry.energy}/10  
- Pain: ${entry.pain || 0}/10
- Sleep: ${entry.sleep}/10
${entry.symptoms && entry.symptoms.length > 0 ? `- Symptoms: ${entry.symptoms.join(', ')}` : ''}
${entry.notes ? `- Notes: ${entry.notes}` : ''}`;
            }).join('\n\n');
    }

    return `You are Chroni, an AI health companion for ChroniCompanion app users. You provide personalized, empathetic health insights based on user data.

IMPORTANT GUIDELINES:
- Be supportive, empathetic, and encouraging
- Focus on patterns, trends, and actionable insights
- Never provide medical diagnoses or replace professional medical advice
- Always recommend consulting healthcare providers for serious concerns
- Use emojis sparingly and appropriately
- Keep responses concise but informative (under 300 words)
- Reference specific data points when available

USER'S RECENT HEALTH DATA:
${healthData}

USER QUESTION: "${userQuestion}"

Provide a helpful, personalized response based on their health patterns and question.`;
}

// Log AI usage for analytics
async function logAIUsage(userId, question, response) {
    try {
        await supabase
            .from('ai_usage_logs')
            .insert([
                {
                    user_id: userId,
                    question: question.substring(0, 500), // Limit length
                    response_length: response.length,
                    created_at: new Date().toISOString()
                }
            ]);
    } catch (error) {
        console.error('Failed to log AI usage:', error);
        // Don't fail the request if logging fails
    }
}

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'ChroniCompanion AI Coach API',
        timestamp: new Date().toISOString()
    });
});

// Premium upgrade endpoint (placeholder)
app.post('/api/premium/upgrade', verifyUser, async (req, res) => {
    // TODO: Implement payment processing
    res.json({ 
        message: 'Premium upgrade coming soon!',
        upgradeUrl: 'https://chronicompanion.app/premium'
    });
});

app.listen(port, () => {
    console.log(`🤖 ChroniCompanion AI Coach API running on port ${port}`);
    console.log(`🔐 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
    console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
});

module.exports = app;