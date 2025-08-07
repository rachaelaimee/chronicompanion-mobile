/**
 * MINIMAL Railway Test Server
 * 
 * This is a bare-bones Express server to test Railway deployment
 * without any complex dependencies that might cause crashes
 */

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

console.log('🚀 Starting simple test server...');
console.log('Environment check:');
console.log('  PORT:', process.env.PORT || 'not set');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('  NODE_OPTIONS:', process.env.NODE_OPTIONS || 'not set');

// Basic CORS
app.use(cors({
    origin: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());

// Test endpoints
app.get('/', (req, res) => {
    console.log('📨 GET / request received');
    res.json({ 
        message: 'ChroniCompanion Test Server is running!',
        timestamp: new Date().toISOString(),
        port: port,
        environment: process.env.NODE_ENV || 'development'
    });
});

app.get('/health', (req, res) => {
    console.log('📨 GET /health request received');
    res.json({ 
        status: 'OK',
        service: 'ChroniCompanion Test API',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

app.get('/test-cors', (req, res) => {
    console.log('📨 GET /test-cors request received from origin:', req.headers.origin);
    res.json({
        message: 'CORS test successful!',
        origin: req.headers.origin,
        headers: req.headers,
        timestamp: new Date().toISOString()
    });
});

app.options('*', (req, res) => {
    console.log('📨 OPTIONS preflight request received');
    console.log('  Origin:', req.headers.origin);
    console.log('  Method:', req.headers['access-control-request-method']);
    res.status(200).end();
});

// Minimal AI test endpoint (no OpenAI dependency)
app.post('/api/ai-coach', (req, res) => {
    console.log('📨 POST /api/ai-coach request received');
    console.log('  Origin:', req.headers.origin);
    console.log('  Authorization:', req.headers.authorization ? 'Present' : 'Missing');
    console.log('  Body:', req.body);
    
    // Mock response for testing
    res.json({
        success: true,
        insight: "This is a test response from the simplified AI Coach API. The backend is working correctly!",
        timestamp: new Date().toISOString(),
        isPremium: false,
        remainingQuestions: 5
    });
});

// Error handling
app.use((error, req, res, next) => {
    console.error('❌ Server error:', error);
    res.status(500).json({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use('*', (req, res) => {
    console.log('📨 404 request to:', req.originalUrl);
    res.status(404).json({ 
        error: 'Not found',
        path: req.originalUrl,
        timestamp: new Date().toISOString()
    });
});

// Start server - MUST listen on 0.0.0.0 for Railway
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Simple test server running on 0.0.0.0:${port}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔧 Node Options: ${process.env.NODE_OPTIONS || 'none'}`);
    console.log(`📍 Health check: http://0.0.0.0:${port}/health`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('📴 Received SIGTERM, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('📴 Received SIGINT, shutting down gracefully');
    process.exit(0);
});

module.exports = app;