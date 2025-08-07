// Ultra-minimal test server for Railway
const http = require('http');

const port = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);
    
    res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    });
    
    if (req.url === '/health') {
        res.end(JSON.stringify({
            status: 'OK',
            timestamp: new Date().toISOString(),
            message: 'Ultra-minimal server working!'
        }));
    } else {
        res.end(JSON.stringify({
            message: 'Test server is running',
            url: req.url,
            method: req.method
        }));
    }
});

server.listen(port, '0.0.0.0', () => {
    console.log(`🟢 Test server running on 0.0.0.0:${port}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('🔴 SIGTERM received, shutting down gracefully');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🔴 SIGINT received, shutting down gracefully');
    server.close(() => {
        process.exit(0);
    });
});