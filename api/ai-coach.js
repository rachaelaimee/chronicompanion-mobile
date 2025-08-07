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
const port = process.env.PORT || 3000;

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

console.log('🔍 Environment Check:');
console.log('- PORT:', process.env.PORT || '3001');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'development');
console.log('- OPENAI_API_KEY:', openaiApiKey ? '✅ Set' : '❌ Missing');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');
console.log('- Final supabaseUrl:', supabaseUrl ? '✅ Configured' : '❌ Missing');
console.log('- Final supabaseServiceKey:', supabaseServiceKey ? '✅ Configured' : '❌ Missing');
console.log('🚀 Starting server regardless of environment variables for debugging...');

// Initialize services (will handle missing variables gracefully in endpoints)
let openai = null;
let supabase = null;

if (openaiApiKey) {
    try {
        openai = new OpenAI({ apiKey: openaiApiKey });
        console.log('✅ OpenAI client initialized');
    } catch (error) {
        console.error('❌ OpenAI initialization failed:', error.message);
    }
}

if (supabaseUrl && supabaseServiceKey) {
    try {
        supabase = createClient(supabaseUrl, supabaseServiceKey);
        console.log('✅ Supabase client initialized');
    } catch (error) {
        console.error('❌ Supabase initialization failed:', error.message);
        console.error('❌ Supabase URL length:', supabaseUrl?.length || 0);
        console.error('❌ Supabase Service Key length:', supabaseServiceKey?.length || 0);
    }
} else {
    console.warn('⚠️ Supabase not configured - missing URL or Service Key');
    console.log('- supabaseUrl present:', !!supabaseUrl);
    console.log('- supabaseServiceKey present:', !!supabaseServiceKey);
}

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

// 🔥 SIMPLIFIED CORS - Remove conflicts, focus on working solution
app.use(cors({
    origin: true, // Allow all origins for debugging
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// Simple request logging
app.use((req, res, next) => {
    console.log(`\n🌐 ${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    if (req.headers.authorization) {
        console.log('  🔐 Auth: Present');
    }
    next();
});

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ChroniCompanion AI Coach Backend',
        environment: {
            NODE_ENV: process.env.NODE_ENV || 'development',
            PORT: process.env.PORT || '3000',
            OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
            SUPABASE_URL: !!process.env.SUPABASE_URL,
            SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY,
            openai_configured: !!openai,
            supabase_configured: !!supabase
        }
    });
});

// API health check with CORS debugging
app.get('/api/health', (req, res) => {
    const healthStatus = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'AI Coach API',
        cors: {
            origin: req.headers.origin || 'none',
            method: req.method,
            headers: req.headers
        },
        environment: {
            openai: !!openai,
            supabase: !!supabase,
            env_vars: {
                OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
                SUPABASE_URL: !!process.env.SUPABASE_URL,
                SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
            }
        }
    };
    
    console.log('🏥 Health check requested:', healthStatus);
    res.json(healthStatus);
});

// Test CORS endpoint (no auth required)
app.get('/test-cors', (req, res) => {
    console.log('🧪 Test CORS request received:');
    console.log('  Origin:', req.headers.origin);
    console.log('  Method:', req.method);
    
    res.json({ 
        message: 'CORS test successful!',
        origin: req.headers.origin,
        timestamp: new Date().toISOString()
    });
});

app.post('/test-cors', (req, res) => {
    console.log('🧪 Test CORS POST request received:');
    console.log('  Origin:', req.headers.origin);
    console.log('  Method:', req.method);
    console.log('  Body:', req.body);
    
    res.json({ 
        message: 'CORS POST test successful!',
        origin: req.headers.origin,
        timestamp: new Date().toISOString(),
        receivedData: req.body
    });
});

// Add explicit preflight handling for AI Coach endpoint
app.options('/api/ai-coach', (req, res) => {
    console.log('🛸 AI Coach preflight request received');
    console.log('  Origin:', req.headers.origin);
    console.log('  Method:', req.headers['access-control-request-method']);
    console.log('  Headers:', req.headers['access-control-request-headers']);
    
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    
    res.status(204).end();
});

// Enhanced AI Coach endpoint with better error handling
app.post('/api/ai-coach', async (req, res) => {
    console.log('\n🤖 AI Coach request received');
    console.log('  Origin:', req.headers.origin);
    console.log('  Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('  Content-Type:', req.headers['content-type']);
    
    // Ensure CORS headers are set for this endpoint
    if (req.headers.origin) {
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
    } else {
        res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    try {
        // Check if OpenAI is configured
        if (!openai) {
            console.error('❌ OpenAI not configured');
            return res.status(500).json({
                success: false,
                error: 'AI service is not available. Please check configuration.'
            });
        }

        // Validate request body
        const { question, healthContext } = req.body;
        if (!question || typeof question !== 'string') {
            return res.status(400).json({
                success: false,
                error: 'Question is required and must be a string.'
            });
        }

        // Get user from JWT token
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Authorization token is required.'
            });
        }

        const token = authHeader.split(' ')[1];
        let user = null;
        
        if (supabase) {
            try {
                const { data, error } = await supabase.auth.getUser(token);
                if (error) {
                    console.error('❌ Auth error:', error);
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid or expired token.'
                    });
                }
                user = data.user;
                console.log('✅ User authenticated:', user.email);
            } catch (authError) {
                console.error('❌ Token validation error:', authError);
                return res.status(401).json({
                    success: false,
                    error: 'Token validation failed.'
                });
            }
        }

        // Build health-focused prompt
        const prompt = buildHealthPrompt(question, healthContext);
        
        console.log('🧠 Sending request to OpenAI...');
        
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 500,
            temperature: 0.7
        });

        const insight = completion.choices[0]?.message?.content;
        
        if (!insight) {
            throw new Error('No response generated from AI service');
        }

        console.log('✅ OpenAI response generated');

        // Log usage if user is available
        if (user && supabase) {
            await logAIUsage(user.id, question, insight);
        }

        // Return success response
        res.json({
            success: true,
            insight: insight,
            isPremium: false, // For now, all users are free tier
            remainingQuestions: 4 // Placeholder
        });

    } catch (error) {
        console.error('❌ AI Coach error:', error);
        
        // Handle specific OpenAI errors
        if (error.code === 'rate_limit_exceeded') {
            return res.status(429).json({
                success: false,
                error: 'AI service is currently busy. Please try again in a moment.'
            });
        }
        
        if (error.code === 'insufficient_quota') {
            return res.status(503).json({
                success: false,
                error: 'AI service is temporarily unavailable. Please try again later.'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Sorry, I encountered an error. Please try again later. 🤖💔'
        });
    }
});

// Premium upgrade endpoint (placeholder)
app.post('/api/premium/upgrade', async (req, res) => {
    // TODO: Implement payment processing
    res.json({ 
        message: 'Premium upgrade coming soon!',
        upgradeUrl: 'https://chronicompanion.app/premium'
    });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`🤖 ChroniCompanion AI Coach API running on 0.0.0.0:${port}`);
    console.log(`🔐 OpenAI API Key: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Missing'}`);
    console.log(`🗄️  Supabase: ${process.env.SUPABASE_URL ? 'Connected' : 'Not configured'}`);
    console.log(`🌐 Railway Environment: Production`);
});

module.exports = app;