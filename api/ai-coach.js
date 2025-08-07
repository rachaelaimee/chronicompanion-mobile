/**
 * ChroniCompanion AI Coach Backend API - WORKING VERSION
 * 
 * This is the minimal working version that fixes CORS issues
 */

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const openaiApiKey = process.env.OPENAI_API_KEY;

console.log('🚀 ChroniCompanion AI Coach API Starting...');
console.log('- PORT:', port);
console.log('- OPENAI_API_KEY:', openaiApiKey ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

// Initialize services
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
    }
}

// CORS Configuration - Allow all origins for debugging
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With', 'Cache-Control'],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());

// Simple request logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - Origin: ${req.headers.origin || 'none'}`);
    next();
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ChroniCompanion AI Coach Backend',
        environment: {
            openai_configured: !!openai,
            supabase_configured: !!supabase
        }
    });
});

// Explicit preflight handling for AI Coach endpoint
app.options('/api/ai-coach', (req, res) => {
    console.log('🛸 AI Coach preflight request from:', req.headers.origin);
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, Origin, X-Requested-With, Cache-Control');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Max-Age', '86400');
    
    res.status(204).end();
});

// AI Coach endpoint
app.post('/api/ai-coach', async (req, res) => {
    console.log('🤖 AI Coach request from:', req.headers.origin);
    
    // Set CORS headers explicitly
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');

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

        // Build simple prompt
        let prompt = `You are Chroni, a helpful AI health companion for ChroniCompanion app users.

User's question: "${question}"

Please provide a concise, helpful, and empathetic response focused on chronic illness management and health tracking insights. Keep it under 200 words.`;

        if (healthContext && healthContext.recentEntries && healthContext.recentEntries.length > 0) {
            const entriesText = healthContext.recentEntries.slice(0, 3).map(entry => 
                `Date: ${entry.entry_date}, Mood: ${entry.mood}/10, Energy: ${entry.energy}/10, Pain: ${entry.pain}/10, Sleep: ${entry.sleep}/10`
            ).join('\n');
            prompt = `You are Chroni, a helpful AI health companion for ChroniCompanion app users.

Recent health entries:
${entriesText}

User's question: "${question}"

Please provide a concise, helpful, and empathetic response based on their health data. Keep it under 200 words.`;
        }
        
        console.log('🧠 Sending request to OpenAI...');
        
        // Call OpenAI API
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 300,
            temperature: 0.7
        });

        const insight = completion.choices[0]?.message?.content;
        
        if (!insight) {
            throw new Error('No response generated from AI service');
        }

        console.log('✅ OpenAI response generated');

        // Return success response
        res.json({
            success: true,
            insight: insight,
            isPremium: false,
            remainingQuestions: 4
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

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`🤖 ChroniCompanion AI Coach API running on 0.0.0.0:${port}`);
    console.log(`🔐 OpenAI: ${openai ? 'Ready' : 'Not configured'}`);
    console.log(`🗄️  Supabase: ${supabase ? 'Ready' : 'Not configured'}`);
});

module.exports = app;