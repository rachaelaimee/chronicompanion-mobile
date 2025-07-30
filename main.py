#!/usr/bin/env python3
"""
Railway deployment entry point for ChroniCompanion API
"""
import os
import sys

# Add current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.main import app

if __name__ == "__main__":
    import uvicorn
    
    # Get port from environment (Railway sets this)
    port = int(os.getenv("PORT", 8000))
    
    print(f"Starting ChroniCompanion API on port {port}")
    
    # Run the FastAPI app
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=port,
        log_level="info"
    )