/**
 * Railway Diagnostic Script
 * Simple diagnostic to identify deployment issues
 */

const express = require('express');
const app = express();
const port = process.env.PORT || 3001;

console.log('🔍 RAILWAY DIAGNOSTIC STARTING...');
console.log('📍 Node Version:', process.version);
console.log('📍 Environment:', process.env.NODE_ENV || 'development');
console.log('📍 Port:', port);

// Check environment variables
console.log('\n🔐 ENVIRONMENT VARIABLES:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing');
console.log('- NODE_OPTIONS:', process.env.NODE_OPTIONS || 'Not set');

// Test dependencies
console.log('\n📦 TESTING DEPENDENCIES:');
try {
    require('express');
    console.log('- express: ✅ Available');
} catch (e) {
    console.log('- express: ❌ Error:', e.message);
}

try {
    require('cors');
    console.log('- cors: ✅ Available');
} catch (e) {
    console.log('- cors: ❌ Error:', e.message);
}

try {
    require('@supabase/supabase-js');
    console.log('- @supabase/supabase-js: ✅ Available');
} catch (e) {
    console.log('- @supabase/supabase-js: ❌ Error:', e.message);
}

try {
    require('openai');
    console.log('- openai: ✅ Available');
} catch (e) {
    console.log('- openai: ❌ Error:', e.message);
}

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
    console.log('✅ Health check requested');
    res.json({
        status: 'OK',
        service: 'Railway Diagnostic',
        timestamp: new Date().toISOString(),
        environment: {
            nodeVersion: process.version,
            port: port,
            openaiKey: process.env.OPENAI_API_KEY ? 'configured' : 'missing',
            supabaseUrl: process.env.SUPABASE_URL ? 'configured' : 'missing'
        }
    });
});

// Test OpenAI connection
app.get('/test-openai', async (req, res) => {
    try {
        const { OpenAI } = require('openai');
        const openai = new OpenAI({
            apiKey: process.env.OPENAI_API_KEY,
        });
        
        // Simple test - just initialize, don't make API call
        res.json({
            status: 'OpenAI client initialized successfully',
            hasApiKey: !!process.env.OPENAI_API_KEY
        });
    } catch (error) {
        res.status(500).json({
            status: 'OpenAI initialization failed',
            error: error.message
        });
    }
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`\n🚀 Railway Diagnostic Server running on 0.0.0.0:${port}`);
    console.log('📍 Test endpoints:');
    console.log(`   - Health: https://chronicompanion-mobile-production.up.railway.app/health`);
    console.log(`   - OpenAI Test: https://chronicompanion-mobile-production.up.railway.app/test-openai`);
    console.log('\n✅ Diagnostic server ready!');
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ UNCAUGHT EXCEPTION:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ UNHANDLED REJECTION at:', promise, 'reason:', reason);
    process.exit(1);
});