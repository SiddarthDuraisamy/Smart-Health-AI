#!/usr/bin/env python3
"""
Simple server restart script for Smart Health Backend
"""

import os
import sys
import subprocess
import time

def restart_server():
    """Restart the backend server"""
    print("🔄 Restarting Smart Health Backend...")
    
    # Set environment to skip database if needed
    os.environ["SKIP_DATABASE"] = "true"
    
    try:
        # Try to start with uvicorn directly
        cmd = [
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--reload", 
            "--host", "0.0.0.0", 
            "--port", "8000"
        ]
        
        print("🚀 Starting server with command:")
        print(" ".join(cmd))
        print()
        
        subprocess.run(cmd, cwd=os.path.dirname(__file__))
        
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Error: {e}")
        print("\n💡 Alternative commands to try:")
        print("1. python -m uvicorn main:app --reload")
        print("2. python start_without_db.py")
        print("3. uvicorn main:app --reload --host 0.0.0.0 --port 8000")

if __name__ == "__main__":
    restart_server()
