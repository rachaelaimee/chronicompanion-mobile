#!/usr/bin/env python3
"""
ChroniCompanion Frontend Server
Starts a local HTTP server and opens the app in your browser
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

def main():
    # Configuration
    PORT = 3000
    FRONTEND_DIR = "frontend"
    
    print("🌿 Starting ChroniCompanion Frontend...")
    print("💚 Built with care for the chronic illness community")
    print()
    
    # Check if frontend directory exists
    if not os.path.exists(FRONTEND_DIR):
        print(f"❌ Error: {FRONTEND_DIR} directory not found!")
        print("Please make sure you're running this from the ChroniCompanion root directory.")
        sys.exit(1)
    
    # Change to frontend directory
    os.chdir(FRONTEND_DIR)
    
    # Check if index.html exists
    if not os.path.exists("index.html"):
        print("❌ Error: index.html not found in frontend directory!")
        sys.exit(1)
    
    print(f"📋 Frontend Configuration:")
    print(f"   • Port: {PORT}")
    print(f"   • Directory: {FRONTEND_DIR}")
    print(f"   • URL: http://localhost:{PORT}")
    print()
    
    # Create HTTP server
    try:
        with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
            print(f"🚀 Frontend server starting on http://localhost:{PORT}")
            print("📊 Your beautiful dashboard awaits!")
            print()
            print("💡 Quick Navigation:")
            print("   • Click 'New Entry' to add journal entries")
            print("   • Click 'Dashboard' to see your health trends")
            print("   • Click 'View Entries' to review past entries")
            print("   • Click 'Export' to download your data")
            print()
            print("🔧 Make sure your backend is running:")
            print("   • Run: python3 run_app.py (in another terminal)")
            print()
            print("Press Ctrl+C to stop the server")
            print("=" * 60)
            
            # Open browser automatically
            url = f"http://localhost:{PORT}"
            print(f"🌐 Opening {url} in your browser...")
            webbrowser.open(url)
            
            # Start serving
            httpd.serve_forever()
            
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Error: Port {PORT} is already in use!")
            print("Try one of these solutions:")
            print("1. Kill existing servers: pkill -f 'python.*http.server'")
            print("2. Use a different port by editing this script")
            print("3. Wait a moment and try again")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\n🛑 Frontend server stopped.")
        print("Thanks for using ChroniCompanion! 🌿✨")

if __name__ == "__main__":
    main() 