#!/usr/bin/env python3
"""
ChroniCompanion Complete Startup Script
Starts both backend and frontend servers and opens the app in your browser
"""

import subprocess
import http.server
import socketserver
import webbrowser
import os
import sys
import time
import signal
import threading
from pathlib import Path

class ChroniCompanionLauncher:
    def __init__(self):
        self.backend_process = None
        self.frontend_port = 3000
        self.backend_port = 8000
        self.frontend_dir = "frontend"
        
    def check_dependencies(self):
        """Check if all required files exist"""
        print("🔍 Checking project structure...")
        
        if not os.path.exists("run_app.py"):
            print("❌ Error: run_app.py not found!")
            print("Please make sure you're in the ChroniCompanion root directory.")
            return False
            
        if not os.path.exists(self.frontend_dir):
            print(f"❌ Error: {self.frontend_dir} directory not found!")
            return False
            
        if not os.path.exists(f"{self.frontend_dir}/index.html"):
            print("❌ Error: index.html not found in frontend directory!")
            return False
            
        print("✅ Project structure looks good!")
        return True
    
    def kill_existing_processes(self):
        """Kill any existing backend processes"""
        print("🧹 Cleaning up any existing processes...")
        try:
            # Kill existing backend processes
            subprocess.run(["pkill", "-f", "python3 run_app.py"], 
                         capture_output=True, text=True)
            # Kill existing frontend processes
            subprocess.run(["pkill", "-f", "python.*http.server"], 
                         capture_output=True, text=True)
            time.sleep(1)  # Give processes time to die
            print("✅ Cleanup complete!")
        except Exception as e:
            print(f"⚠️  Cleanup warning: {e}")
    
    def start_backend(self):
        """Start the backend server"""
        print("🚀 Starting backend server...")
        try:
            # Start backend in background
            self.backend_process = subprocess.Popen(
                ["python3", "run_app.py"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            
            # Wait a moment for backend to start
            time.sleep(3)
            
            # Check if backend is responding
            import urllib.request
            try:
                response = urllib.request.urlopen(f"http://localhost:{self.backend_port}/health")
                if response.getcode() == 200:
                    print("✅ Backend server is running!")
                    return True
            except Exception:
                print("⚠️  Backend might still be starting...")
                return True  # Continue anyway
                
        except Exception as e:
            print(f"❌ Error starting backend: {e}")
            return False
            
        return True
    
    def start_frontend(self):
        """Start the frontend server and open browser"""
        print("🌐 Starting frontend server...")
        
        # Change to frontend directory
        original_dir = os.getcwd()
        os.chdir(self.frontend_dir)
        
        try:
            with socketserver.TCPServer(("", self.frontend_port), 
                                      http.server.SimpleHTTPRequestHandler) as httpd:
                
                print(f"✅ Frontend server running on http://localhost:{self.frontend_port}")
                print()
                print("🎉 ChroniCompanion is ready!")
                print("📊 Your beautiful dashboard awaits!")
                print()
                print("💡 Quick Navigation:")
                print("   • Click 'New Entry' to add journal entries")
                print("   • Click 'Dashboard' to see your health trends")
                print("   • Click 'View Entries' to review past entries")
                print("   • Click 'Export' to download your data")
                print()
                print("🔧 Servers running:")
                print(f"   • Backend API: http://localhost:{self.backend_port}")
                print(f"   • Frontend: http://localhost:{self.frontend_port}")
                print()
                print("Press Ctrl+C to stop both servers")
                print("=" * 60)
                
                # Open browser automatically
                url = f"http://localhost:{self.frontend_port}"
                print(f"🌐 Opening {url} in your browser...")
                webbrowser.open(url)
                print()
                
                # Start serving
                httpd.serve_forever()
                
        except OSError as e:
            if e.errno == 48:  # Address already in use
                print(f"❌ Error: Port {self.frontend_port} is already in use!")
                print("Try killing existing processes: pkill -f 'python.*http.server'")
            else:
                print(f"❌ Error starting frontend server: {e}")
            return False
        finally:
            os.chdir(original_dir)
            
        return True
    
    def cleanup(self):
        """Clean up processes on exit"""
        print("\n\n🛑 Shutting down ChroniCompanion...")
        
        if self.backend_process:
            print("🔸 Stopping backend server...")
            self.backend_process.terminate()
            try:
                self.backend_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.backend_process.kill()
                
        print("🔸 Cleaning up any remaining processes...")
        try:
            subprocess.run(["pkill", "-f", "python3 run_app.py"], 
                         capture_output=True)
        except Exception:
            pass
            
        print("✅ Shutdown complete!")
        print("Thanks for using ChroniCompanion! 🌿✨")
    
    def run(self):
        """Main run method"""
        print("🌿 ChroniCompanion Complete Launcher")
        print("💚 Built with care for the chronic illness community")
        print()
        
        # Set up signal handler for graceful shutdown
        def signal_handler(sig, frame):
            self.cleanup()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        
        try:
            # Check project structure
            if not self.check_dependencies():
                sys.exit(1)
            
            # Clean up existing processes
            self.kill_existing_processes()
            
            # Start backend
            if not self.start_backend():
                sys.exit(1)
            
            # Start frontend (this will block until Ctrl+C)
            self.start_frontend()
            
        except KeyboardInterrupt:
            pass
        finally:
            self.cleanup()

def main():
    launcher = ChroniCompanionLauncher()
    launcher.run()

if __name__ == "__main__":
    main() 