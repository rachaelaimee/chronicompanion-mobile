/**
 * Ultra Minimal Railway Test - No Dependencies
 * This uses only built-in Node.js modules
 */

const http = require('http');
const url = require('url');

const port = process.env.PORT || 3001;

console.log('🚀 Starting ultra minimal server...');
console.log('📍 Port:', port);
console.log('🔍 Environment variables:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET');
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET');

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');
    
    const parsedUrl = url.parse(req.url, true);
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    if (parsedUrl.pathname === '/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            service: 'Ultra Minimal Railway Test',
            port: port,
            environment: {
                NODE_ENV: process.env.NODE_ENV || 'not set',
                OPENAI_API_KEY: !!process.env.OPENAI_API_KEY,
                SUPABASE_URL: !!process.env.SUPABASE_URL,
                SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
            }
        }));
        return;
    }
    
    if (parsedUrl.pathname === '/' || parsedUrl.pathname === '') {
        res.writeHead(200);
        res.end(JSON.stringify({
            message: 'Ultra Minimal Railway Test Server is running!',
            timestamp: new Date().toISOString(),
            endpoints: ['/health', '/env-debug']
        }));
        return;
    }
    
    if (parsedUrl.pathname === '/env-debug') {
        res.writeHead(200);
        res.end(JSON.stringify({
            status: 'OK',
            allEnvVars: Object.keys(process.env).reduce((acc, key) => {
                acc[key] = process.env[key] ? 'SET' : 'NOT SET';
                return acc;
            }, {}),
            criticalVars: {
                PORT: process.env.PORT,
                NODE_ENV: process.env.NODE_ENV,
                OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET (length: ' + process.env.OPENAI_API_KEY.length + ')' : 'NOT SET',
                SUPABASE_URL: process.env.SUPABASE_URL ? 'SET (length: ' + process.env.SUPABASE_URL.length + ')' : 'NOT SET',
                SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY ? 'SET (length: ' + process.env.SUPABASE_SERVICE_KEY.length + ')' : 'NOT SET'
            }
        }));
        return;
    }
    
    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, '0.0.0.0', () => {
    console.log(`✅ Ultra minimal server running on 0.0.0.0:${port}`);
    console.log(`🌐 Test URL: http://0.0.0.0:${port}/health`);
});

server.on('error', (error) => {
    console.error('❌ Server error:', error);
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});