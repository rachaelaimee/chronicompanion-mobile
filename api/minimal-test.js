/**
 * Minimal Railway Test Server
 * This should definitely start regardless of environment variables
 */

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Basic middleware
app.use(cors({
    origin: true,
    credentials: true
}));

app.use(express.json());

// Simple logging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
});

// Environment debug endpoint
app.get('/env-debug', (req, res) => {
    console.log('🔍 Environment Variables Debug:');
    const envVars = {
        PORT: process.env.PORT,
        NODE_ENV: process.env.NODE_ENV,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'MISSING',
        SUPABASE_URL: process.env.SUPABASE_URL ? 'SET' : 'MISSING',
        SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING',
        DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING'
    };
    
    console.log('Environment Variables:', envVars);
    
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Minimal Railway Test',
        environment: envVars
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'Minimal Railway Test'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Railway Test Server is running!',
        timestamp: new Date().toISOString()
    });
});

// Start server
app.listen(port, '0.0.0.0', () => {
    console.log(`✅ Minimal test server running on 0.0.0.0:${port}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`📍 Health check: http://0.0.0.0:${port}/health`);
    console.log(`🔍 Environment debug: http://0.0.0.0:${port}/env-debug`);
});

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

module.exports = app;