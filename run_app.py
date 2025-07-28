#!/usr/bin/env python3
"""
ChroniCompanion Application Runner

This script starts the FastAPI backend server.
The frontend can be opened by navigating to frontend/index.html in your browser.
"""

import uvicorn
import os
import sys

def main():
    print("🌿 Starting ChroniCompanion Backend Server...")
    print("💚 Built with care for the chronic illness community")
    print("")
    
    # Check if we're in the right directory
    if not os.path.exists("backend/main.py"):
        print("❌ Error: backend/main.py not found. Please run this script from the project root.")
        sys.exit(1)
    
    print("📋 Server Configuration:")
    print("   • Host: localhost (127.0.0.1)")
    print("   • Port: 8000")
    print("   • API Documentation: http://localhost:8000/docs")
    print("   • Health Check: http://localhost:8000/health")
    print("")
    
    print("🌐 Frontend:")
    print("   • Open frontend/index.html in your browser")
    print("   • Or serve it with: python -m http.server 3000")
    print("")
    
    print("⚙️  Optional Configuration:")
    print("   • Copy .env.example to .env and add your OpenAI API key for AI features")
    print("   • The app works without OpenAI - entries will be saved locally")
    print("")
    
    print("🚀 Starting server...")
    print("   Press Ctrl+C to stop the server")
    print("=" * 60)
    
    try:
        uvicorn.run(
            "backend.main:app",
            host="127.0.0.1",
            port=8000,
            reload=True,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n\n💚 Thanks for using ChroniCompanion. Take care of yourself!")
    except Exception as e:
        print(f"\n❌ Error starting server: {e}")
        print("💡 Make sure you've installed the requirements: pip install -r requirements.txt")

if __name__ == "__main__":
    main() 